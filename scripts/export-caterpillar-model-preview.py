#!/usr/bin/env python3
"""Export the Caterpillar workbook's story sheets to the JSON read by WorkbookPreview.

Offline tool, run by hand whenever the workbook changes:

    npm run export:model-preview

Requires Python 3 with openpyxl, and LibreOffice (`soffice`) on PATH.

- openpyxl supplies structure, formulas, cached (raw) values and styles.
- LibreOffice's CSV export "as shown" supplies the displayed text, so number
  formats render exactly as the spreadsheet shows them (no formatter of our own).

The output is a read-only snapshot: nothing is recalculated in the browser. The
workbook's SHA-256 is recorded so `npm run check:model-preview` can detect a
workbook that changed without the JSON being regenerated.

Fails loudly (non-zero exit) if a requested sheet is missing, a formula has no
cached value (other than the known empty-string text formulas below), or the
sheets use something this preview cannot show faithfully (theme or indexed
colours, conditional formatting).
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.utils.cell import coordinate_from_string, column_index_from_string

ROOT = Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / "caterpillar-demand-quality/model/CAT_8Q_Operating_Dataset.xlsx"
OUTPUT = ROOT / "public/caterpillar/model-preview.json"

# Story sheets, in tab order.
SHEETS = ["Analysis", "Construction Industries", "Dealer Inventory", "Retail Statistics"]

# Generous caps; every included sheet is well inside them. A sheet that grows past
# them is truncated and flagged in the JSON rather than silently cut.
MAX_ROWS = 120
MAX_COLS = 16

# Text formulas of the form IF(x="","",x) whose result is an empty string. The file
# stores no cached value for them, which is correct, so they are shown as empty cells
# (the formula is kept so the formula bar can still show it).
KNOWN_EMPTY_TEXT_FORMULAS = {
    ("Analysis", a) for a in ["B15", "C15", "D15", "E15", "F15", "G15", "B16", "E16", "F16", "I16"]
}

# Excel's defaults when a sheet does not set its own.
DEFAULT_COL_WIDTH = 8.43
DEFAULT_ROW_HEIGHT = 12.75  # points, for 10pt Arial

FORMAT_VERSION = 1

# Excel's theme colour index -> the colour's name in xl/theme/theme1.xml.
THEME_SLOTS = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3",
               "accent4", "accent5", "accent6", "hlink", "folHlink"]
THEME: dict[int, str] = {}  # filled from the workbook by load_theme()


def load_theme(workbook: Path) -> None:
    """The workbook's theme palette, so plain theme colours resolve to RGB."""
    xml = zipfile.ZipFile(workbook).read("xl/theme/theme1.xml").decode("utf-8")
    for i, slot in enumerate(THEME_SLOTS):
        m = re.search(rf"<a:{slot}>.*?(?:srgbClr val|sysClr [^>]*lastClr)=\"([0-9A-Fa-f]{{6}})\"", xml, re.S)
        if m:
            THEME[i] = f"#{m.group(1).upper()}"


def fail(message: str) -> None:
    print(f"export-caterpillar-model-preview: ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shown_text(workbook: Path) -> dict[str, list[list[str]]]:
    """Every sheet's cells as LibreOffice displays them, via its CSV export."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        fail("LibreOffice (soffice) is required for displayed values and was not found on PATH")
    with tempfile.TemporaryDirectory() as tmp:
        profile = Path(tmp, "profile").as_uri()
        # Filter tokens: comma, double quote, UTF-8, from line 1, -, -, quoted text off,
        # detect numbers on, save cell contents AS SHOWN on, formulas off, -, all sheets.
        csv_filter = "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,true,false,false,-1"
        subprocess.run(
            [soffice, "--headless", "--norestore", f"-env:UserInstallation={profile}",
             "--convert-to", csv_filter, "--outdir", tmp, str(workbook)],
            check=True, capture_output=True, timeout=300,
        )
        out = {}
        for path in Path(tmp).glob(f"{workbook.stem}-*.csv"):
            sheet = path.stem[len(workbook.stem) + 1:]
            with path.open(encoding="utf-8", newline="") as f:
                out[sheet] = list(csv.reader(f))
        return out


def color(c, where: str) -> str | None:
    """An ARGB colour as #RRGGBB, or None for the default. Theme and indexed colours
    are not resolved by this exporter, so they stop the export instead of being guessed."""
    if c is None:
        return None
    if c.type == "rgb":
        rgb = str(c.rgb)
        return None if rgb in ("00000000",) else f"#{rgb[-6:].upper()}"
    if c.type == "indexed" and c.indexed in (64, 65):  # system foreground / background
        return None
    if c.type == "theme" and not c.tint and c.theme in THEME:
        return THEME[c.theme]
    detail = f"theme {c.theme}, tint {c.tint}" if c.type == "theme" else f"{c.type} {getattr(c, c.type, '')}"
    fail(f"{where}: colour ({detail}) is not supported; use an RGB or untinted theme colour")


def style_of(cell, where: str) -> dict:
    """The cell's style, keeping only values that differ from the defaults."""
    s: dict = {}
    if cell.number_format and cell.number_format != "General":
        s["nf"] = cell.number_format
    f = cell.font
    font = {k: v for k, v in {
        "b": bool(f.b) or None, "i": bool(f.i) or None, "u": bool(f.u) or None,
        "sz": float(f.sz) if f.sz and float(f.sz) != 10.0 else None,
        "color": color(f.color, f"{where} font"),
    }.items() if v}
    if font:
        s["font"] = font
    if has_fill(cell):
        if cell.fill.fill_type != "solid":
            fail(f"{where}: {cell.fill.fill_type} fill pattern is not supported")
        s["fill"] = color(cell.fill.fgColor, f"{where} fill")
    a = cell.alignment
    align = {k: v for k, v in {
        "h": a.horizontal if a.horizontal not in (None, "general") else None,
        "v": a.vertical if a.vertical not in (None, "bottom") else None,
        "wrap": True if a.wrap_text else None,
        "indent": int(a.indent) if a.indent else None,
    }.items() if v}
    if align:
        s["align"] = align
    border = {}
    for side, key in (("top", "t"), ("right", "r"), ("bottom", "b"), ("left", "l")):
        b = getattr(cell.border, side)
        if b and b.style:
            border[key] = f"{b.style} {color(b.color, f'{where} border') or '#000000'}"
    if border:
        s["border"] = border
    return s


def has_fill(cell) -> bool:
    return bool(cell.fill and cell.fill.fill_type not in (None, "none"))


def is_styled(cell) -> bool:
    return bool(has_fill(cell) or any(
        getattr(cell.border, s).style for s in ("top", "right", "bottom", "left")))


def raw_text(v) -> str:
    """How the raw value reads as plain text, to decide whether displayed text differs."""
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def export_sheet(name, ws_f, ws_v, shown, styles, style_index) -> dict:
    if ws_f.conditional_formatting:
        fail(f"{name}: conditional formatting cannot be reproduced by the preview")
    if getattr(ws_f, "_charts", None) or getattr(ws_f, "_images", None):
        print(f"export-caterpillar-model-preview: note: {name} has charts or images; they are not part of the grid")

    # Extent: last row/column holding a value or a visible style.
    last_r = last_c = 0
    for row in ws_f.iter_rows():
        for c in row:
            if c.value is not None or is_styled(c):
                last_r, last_c = max(last_r, c.row), max(last_c, c.column)
    rows, cols = min(last_r, MAX_ROWS), min(last_c, MAX_COLS)

    hidden_cols = set()
    default_w = ws_f.sheet_format.defaultColWidth or DEFAULT_COL_WIDTH
    widths = [default_w] * cols
    for dim in ws_f.column_dimensions.values():
        lo, hi = dim.min or column_index_from_string(dim.index), dim.max or column_index_from_string(dim.index)
        for c in range(lo, min(hi, cols) + 1):
            if dim.width:
                widths[c - 1] = round(float(dim.width), 2)
            if dim.hidden:
                hidden_cols.add(c - 1)

    default_h = ws_f.sheet_format.defaultRowHeight or DEFAULT_ROW_HEIGHT
    heights = []
    hidden_rows = []
    for r in range(1, rows + 1):
        dim = ws_f.row_dimensions.get(r)
        heights.append(round(float(dim.height), 2) if dim is not None and dim.height else default_h)
        if dim is not None and dim.hidden:
            hidden_rows.append(r - 1)

    freeze = {"rows": 0, "cols": 0}
    if ws_f.freeze_panes:
        letter, row = coordinate_from_string(ws_f.freeze_panes)
        freeze = {"rows": row - 1, "cols": column_index_from_string(letter) - 1}

    merges = []
    for m in ws_f.merged_cells.ranges:
        if m.min_row <= rows and m.min_col <= cols:
            merges.append([m.min_row - 1, m.min_col - 1, min(m.max_row, rows) - 1, min(m.max_col, cols) - 1])

    cells = []
    for r in range(1, rows + 1):
        shown_row = shown[r - 1] if r - 1 < len(shown) else []
        for c in range(1, cols + 1):
            cell = ws_f.cell(r, c)
            where = f"{name}!{cell.coordinate}"
            formula = None
            if cell.data_type == "f":
                formula = cell.value if isinstance(cell.value, str) else getattr(cell.value, "text", None)
                if not isinstance(formula, str):
                    fail(f"{where}: unsupported formula type {type(cell.value).__name__}")
                if not formula.startswith("="):
                    formula = "=" + formula
            raw = ws_v.cell(r, c).value if formula else cell.value
            if formula and raw is None:
                if (name, cell.coordinate) not in KNOWN_EMPTY_TEXT_FORMULAS:
                    fail(f"{where}: formula {formula} has no cached value; open and recalculate the workbook, then save it")
                raw = ""  # known empty-string text formula: shown as an empty cell
            if raw is None and not formula and not is_styled(cell):
                continue

            st = style_of(cell, where)
            key = json.dumps(st, sort_keys=True)
            if key not in style_index:
                style_index[key] = len(styles)
                styles.append(st)

            out = {"r": r - 1, "c": c - 1}
            if style_index[key]:
                out["s"] = style_index[key]
            if formula:
                out["f"] = formula
            if raw is not None:
                if hasattr(raw, "isoformat"):
                    raw = raw.isoformat()
                out["v"] = raw
            displayed = shown_row[c - 1] if c - 1 < len(shown_row) else ""
            if raw == "":
                displayed = ""
            if raw is not None and displayed != raw_text(raw):
                out["d"] = displayed
            cells.append(out)

    return {
        "name": name,
        "rows": rows,
        "cols": cols,
        "truncated": last_r > MAX_ROWS or last_c > MAX_COLS,
        "freeze": freeze,
        "colWidths": widths,
        "rowHeights": heights,
        "hiddenRows": hidden_rows,
        "hiddenCols": sorted(hidden_cols),
        "merges": merges,
        "cells": cells,
    }


def main() -> None:
    if not WORKBOOK.exists():
        fail(f"workbook not found: {WORKBOOK}")
    load_theme(WORKBOOK)
    wb_f = openpyxl.load_workbook(WORKBOOK)
    wb_v = openpyxl.load_workbook(WORKBOOK, data_only=True)
    missing = [s for s in SHEETS if s not in wb_f.sheetnames]
    if missing:
        fail(f"requested sheet(s) missing from the workbook: {', '.join(missing)}")
    hidden = [s for s in SHEETS if wb_f[s].sheet_state != "visible"]
    if hidden:
        fail(f"requested sheet(s) are hidden in the workbook: {', '.join(hidden)}")

    shown = shown_text(WORKBOOK)
    no_csv = [s for s in SHEETS if s not in shown]
    if no_csv:
        fail(f"LibreOffice produced no displayed values for: {', '.join(no_csv)}")

    styles: list[dict] = [{}]  # style 0 is the default; cells using it omit "s"
    style_index = {json.dumps({}, sort_keys=True): 0}
    sheets = [export_sheet(s, wb_f[s], wb_v[s], shown[s], styles, style_index) for s in SHEETS]

    doc = {
        "version": FORMAT_VERSION,
        "workbook": {
            "file": WORKBOOK.relative_to(ROOT).as_posix(),
            "sha256": sha256(WORKBOOK),
        },
        "note": "Read-only snapshot. Displayed text is exported from LibreOffice; nothing recalculates.",
        "styles": styles,
        "sheets": sheets,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    cells = sum(len(s["cells"]) for s in sheets)
    formulas = sum(1 for s in sheets for c in s["cells"] if "f" in c)
    print(f"wrote {OUTPUT.relative_to(ROOT)}: {len(sheets)} sheets, {cells} cells, {formulas} formulas, "
          f"{len(styles)} styles, {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()

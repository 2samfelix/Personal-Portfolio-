#!/usr/bin/env python3
"""Checks the home-card thumbnails against the data they are drawn from.

  npm run test:thumbnails

The thumbnails are SVGs drawn by scripts/render-project-thumbnails.mjs and
scripts/render-monday-thumbnail.mjs (kept in scripts/thumbnails/) and rendered to
public/project-visuals/. For each one in scripts/thumbnails/manifest.json:
1. The SVG and the image have the SHA-256s the manifest records, so the image on the
   site is the render of the SVG checked here.
2. Every tagged value (data-src, data-ref, data-v) is the value in its source: a
   Model Preview / plan-data cell ("Sheet!B48", as the workbook addresses it), or a
   count recomputed here from public/engine/validation-lab.json.
3. Every printed value (data-d) is that value printed by its format (data-fmt), and is
   what the element shows; text copied from a cell (data-text) appears in that cell.
4. On each value axis (data-axis), drawn positions are linear in the values.
5. No digit is printed outside a tagged value or a named label (data-label).
6. Every figure in the card's alt text (src/lib/projectVisualAlts.generated.json) is
   one the thumbnail prints.
Exits non-zero on any failure.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "scripts/thumbnails/manifest.json"
ALTS = json.loads((ROOT / "src/lib/projectVisualAlts.generated.json").read_text())


def col_letter(c0: int) -> str:
    s, n = "", c0 + 1
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


_cells: dict[str, dict[str, dict]] = {}


def cells(src: str) -> dict[str, dict]:
    """All cells of a Model Preview style JSON, keyed "Sheet!A1"."""
    if src not in _cells:
        out = {}
        for t in json.loads((ROOT / src).read_text())["sheets"]:
            sheet = t.get("sheet", t["name"])
            for c in t["cells"]:
                r = (t["rowIndex"][c["r"]] if "rowIndex" in t else c["r"]) + 1
                c0 = t["colIndex"][c["c"]] if "colIndex" in t else c["c"]
                shown = (c.get("d") if c.get("d") is not None else ("" if c.get("v") is None else str(c["v"]))).strip()
                out[f"{sheet}!{col_letter(c0)}{r}"] = {"v": c.get("v"), "d": shown}
        _cells[src] = out
    return _cells[src]


def lab_value(src: str, ref: str) -> float:
    lab = json.loads((ROOT / src).read_text())

    def detection(c):
        if c["group"] == "control":
            return None
        if c["faulty"] and c["actual"]["outcome"] == "ACCEPT":
            return "missed"
        if c["group"] == "conditional":
            return "conditional"
        return "caught" if c["actual"]["outcome"] == "REJECT" else "missed"

    if ref == "cases:mapped":
        return sum(1 for c in lab["cases"] if detection(c))
    parts = dict(p.split("=") for p in ref.split(":")[1:])
    return sum(1 for c in lab["cases"] if detection(c) == parts["detection"] and ("topic" not in parts or c["topic"] == parts["topic"]))


def fmt(name: str, v: float, shown: str | None) -> str:
    if name == "shown":
        return shown or ""
    if name == "int":
        return f"{round(v):,}"
    if name == "signedInt":
        return ("+" if v >= 0 else "−") + f"{abs(round(v)):,}"
    if name == "usdB2":
        return f"${v / 1000:.2f}B"
    if name == "usdM":
        return f"${round(v):,}M"
    if name == "usd2":
        return f"${v:.2f}"
    if name == "pct1":
        return f"{v * 100:.1f}%"
    raise KeyError(name)


class Svg(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.nodes: list[dict] = []
        self.loose: list[str] = []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "text": ""}
        self.nodes.append(node)
        if tag == "title":
            self.in_title = True
        self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.nodes.append({"tag": tag, "attrs": dict(attrs), "text": ""})

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        while self.stack:
            if self.stack.pop()["tag"] == tag:
                break

    def handle_data(self, data):
        if self.in_title:
            return
        for n in self.stack:
            n["text"] += data
        if re.search(r"\d", data) and not any(k in n["attrs"] for n in self.stack for k in ("data-v", "data-text", "data-label")):
            self.loose.append(data.strip())


def main() -> int:
    failures: list[str] = []
    manifest = json.loads(MANIFEST.read_text())
    tagged_total = marks_total = 0
    worst = 0.0
    for name, m in manifest.items():
        svg_bytes = (ROOT / m["svg"]).read_bytes()
        img_bytes = (ROOT / m["image"]).read_bytes()
        if hashlib.sha256(svg_bytes).hexdigest() != m["svg_sha256"]:
            failures.append(f"{name}: {m['svg']} does not match the manifest; re-run the render script")
        if hashlib.sha256(img_bytes).hexdigest() != m["image_sha256"]:
            failures.append(f"{name}: {m['image']} is not the render recorded in the manifest; re-run the render script")
        p = Svg()
        p.feed(svg_bytes.decode("utf-8"))
        axes: dict[str, list[tuple[float, float]]] = defaultdict(list)
        printed: set[str] = set()
        for n in p.nodes:
            a = n["attrs"]
            if "data-src" not in a:
                continue
            src, ref = a["data-src"], a["data-ref"]
            if "data-text" in a:
                cell = cells(src).get(ref)
                if not cell or a["data-text"] not in cell["d"] or n["text"] != a["data-text"]:
                    failures.append(f"{name}: text {n['text']!r} is not from {ref}")
                printed.add(a["data-text"])
                continue
            v = float(a["data-v"])
            tagged_total += 1
            if src.endswith("validation-lab.json"):
                want, shown = lab_value(src, ref), None
            else:
                cell = cells(src).get(ref)
                if cell is None or not isinstance(cell["v"], (int, float)):
                    failures.append(f"{name}: {src} {ref} is not a number")
                    continue
                want, shown = cell["v"], cell["d"]
            if abs(v - want) > 1e-9 * max(1.0, abs(want)):
                failures.append(f"{name}: {ref} tagged {v}, source has {want}")
            if "data-d" in a:
                expect = fmt(a.get("data-fmt", "shown"), want, shown)
                if a["data-d"] != expect:
                    failures.append(f"{name}: {ref} prints {a['data-d']!r}, its value prints as {expect!r}")
                if n["text"] != a["data-d"]:
                    failures.append(f"{name}: {ref} element shows {n['text']!r}, tagged {a['data-d']!r}")
                printed.add(a["data-d"])
            if "data-axis" in a:
                marks_total += 1
                axes[a["data-axis"]].append((v, float(a["data-pos"])))
        for axis, pts in axes.items():
            xs = [q[0] for q in pts]
            if len(set(xs)) < 2:
                continue
            k = len(pts)
            mx, my = sum(xs) / k, sum(q[1] for q in pts) / k
            b = sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x in xs)
            resid = max(abs(y - (my + b * (x - mx))) for x, y in pts)
            worst = max(worst, resid)
            if resid > 0.02:
                failures.append(f"{name}: axis {axis} is not linear in the values (residual {resid:.3f})")
        for s in p.loose:
            failures.append(f"{name}: prints {s!r}, a number tied to no source")
        alt = ALTS.get(name)
        if alt is None:
            failures.append(f"{name}: no alt text")
        else:
            for tok in re.findall(r"[+−-]?\$?\d(?:[\d,]*\d)?(?:\.\d+)?[%BM]?", alt):
                if re.search(r"[,.%$]", tok) and tok not in printed and tok.lstrip("+") not in printed:
                    failures.append(f"{name}: alt text states {tok!r}, which the thumbnail does not print")
    for f in failures:
        print(f"FAIL: {f}")
    print(f"test-thumbnails: {len(manifest)} thumbnails, {tagged_total} tagged values, {marks_total} drawn marks; max geometry residual {worst:.4f}px; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

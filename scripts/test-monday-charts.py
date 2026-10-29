#!/usr/bin/env python3
"""Checks the monday.com page's charts against the hash-pinned workbooks.

Run after `npm run build`:  npm run test:monday-charts

For the prerendered page (.next/server/app/projects/monday-operating-plan.html):
1. Every element tagged with a workbook cell (data-ref, data-wb, data-v) holds that
   cell's value, read here with openpyxl from the pinned workbook.
2. Every printed number (data-d) shows the text the workbook shows for that cell
   (the exported Model Preview JSON) and is what the element displays.
3. For each chart axis (data-axis), the drawn coordinates (data-pos) are a linear
   function of the values: the geometry is drawn from the workbook values.
4. No chart prints a number that is not tied to a workbook cell (quarter names,
   fiscal-year labels, the "Nov. 9" results date and row labels marked data-label
   excepted).
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

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / ".next/server/app/projects/monday-operating-plan.html"
WORKBOOKS = {
    "plan": (ROOT / "monday-operating-plan/model/monday_plan.xlsx", "125af68742c9d3501cd2f23944899cc4625cf5285e79ba9ea2bee34f24315419"),
    "q3": (ROOT / "monday-operating-plan/model/monday_q3_call.xlsx", "49463d1fbb678fd26b59c3c81e70cb52613a4a73906b846bcaaf034be76bb722"),
}
EXPORTS = {
    "plan": ["public/monday-operating-plan/model-preview.json", "public/monday-operating-plan/plan-data.json"],
    "q3": ["public/monday-operating-plan/q3-call.json"],
}
ALLOWED = re.compile(r"Q\d \d{4}|FY\d{2,4}|Nov\. 9|USD m")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "circle", "rect", "line", "path", "stop", "use"}


def col_index(letters: str) -> int:
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n


class Page(HTMLParser):
    """Collects tagged elements with their text, and the text of every SVG."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.tagged: list[dict] = []
        self.svg_depth = 0
        self.loose_svg_numbers: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        node = {"tag": tag, "attrs": a, "text": ""}
        if tag == "svg":
            self.svg_depth += 1
        if "data-ref" in a:
            self.tagged.append(node)
        if tag in VOID:
            return
        self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        if "data-ref" in a:
            self.tagged.append({"tag": tag, "attrs": a, "text": ""})

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            node = self.stack.pop()
            if node["tag"] == tag:
                break
        if tag == "svg":
            self.svg_depth -= 1

    def handle_data(self, data):
        for node in self.stack:
            node["text"] += data
        if self.svg_depth and data.strip() and re.search(r"\d", data):
            # Digits printed in a chart must sit inside a tagged element.
            # Row labels (data-label) are names, such as "Lever 1: ... 5% below plan", not values.
            if not any("data-ref" in n["attrs"] or "data-label" in n["attrs"] for n in self.stack) and not ALLOWED.fullmatch(data.strip()):
                rest = ALLOWED.sub("", data)
                if re.search(r"\d", rest):
                    self.loose_svg_numbers.append(data.strip())


def main() -> int:
    failures: list[str] = []
    if not PAGE.exists():
        print(f"test-monday-charts: {PAGE} not found; run `npm run build` first", file=sys.stderr)
        return 1
    books = {}
    for key, (path, pin) in WORKBOOKS.items():
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != pin:
            failures.append(f"{path.name}: SHA-256 {digest} does not match the pin {pin}")
        books[key] = openpyxl.load_workbook(path, data_only=True)
    shown: dict[tuple[str, str], str] = {}
    for key, files in EXPORTS.items():
        for f in files:
            doc = json.loads((ROOT / f).read_text())
            for t in doc["sheets"]:
                sheet = t.get("sheet", t["name"])
                for c in t["cells"]:
                    r = (t["rowIndex"][c["r"]] if "rowIndex" in t else c["r"]) + 1
                    col = (t["colIndex"][c["c"]] if "colIndex" in t else c["c"]) + 1
                    letters = ""
                    n = col
                    while n:
                        n, rem = divmod(n - 1, 26)
                        letters = chr(65 + rem) + letters
                    text = c.get("d", "" if c.get("v") is None else str(c["v"]))
                    shown[(key, f"{sheet}!{letters}{r}")] = text

    page = Page()
    page.feed(PAGE.read_text(encoding="utf-8"))
    axes: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for node in page.tagged:
        a = node["attrs"]
        wb, ref, v = a["data-wb"], a["data-ref"], float(a["data-v"])
        sheet, addr = ref.split("!")
        m = re.fullmatch(r"([A-Z]+)(\d+)", addr)
        cell = books[wb][sheet].cell(int(m.group(2)), col_index(m.group(1))).value
        if not isinstance(cell, (int, float)) or abs(cell - v) > 1e-9 * max(1, abs(cell)):
            failures.append(f"{wb} {ref}: drawn {v}, workbook {cell}")
        if "data-d" in a:
            want = shown.get((wb, ref))
            if a["data-d"] != want:
                failures.append(f"{wb} {ref}: label {a['data-d']!r}, workbook shows {want!r}")
            if want and want not in node["text"] and node["tag"] not in ("rect", "circle"):
                failures.append(f"{wb} {ref}: element text {node['text']!r} does not show {want!r}")
        if "data-axis" in a:
            axes[a["data-axis"]].append((v, float(a["data-pos"])))

    worst = 0.0
    for axis, pts in axes.items():
        xs = [p[0] for p in pts]
        if len(set(xs)) < 2:
            continue
        n = len(pts)
        mx = sum(xs) / n
        my = sum(p[1] for p in pts) / n
        b = sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x in xs)
        resid = max(abs(y - (my + b * (x - mx))) for x, y in pts)
        worst = max(worst, resid)
        if resid > 0.02:
            failures.append(f"axis {axis}: drawn positions are not linear in the values (max residual {resid:.3f})")

    for s in page.loose_svg_numbers:
        failures.append(f"chart prints a number not tied to a workbook cell: {s!r}")

    marks = sum(1 for n in page.tagged if "data-axis" in n["attrs"])
    labels = sum(1 for n in page.tagged if "data-d" in n["attrs"])
    if marks < 50 or labels < 50:
        failures.append(f"too few tagged elements ({marks} marks, {labels} labels): is the page rendering its charts?")
    for f in failures:
        print(f"FAIL: {f}")
    print(f"test-monday-charts: {len(page.tagged)} tagged elements ({marks} drawn marks on {len(axes)} axes, {labels} printed numbers); "
          f"max geometry residual {worst:.4f}px; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

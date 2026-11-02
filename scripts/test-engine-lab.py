#!/usr/bin/env python3
"""Checks the engine page's validation lab against public/engine/validation-lab.json.

Run after `npm run build`:  npm run test:engine-lab

For the prerendered page (.next/server/app/projects/fpa-intelligence-engine.html):
1. The JSON is the file pinned in src/lib/validationLab.ts.
2. Each hero stat tile (data-lab-stat) shows the value recomputed here from the cases.
3. The detection map has one mark (data-lab-cell) per non-control case, each in its case's row
   and with the detection recomputed here; marks sit at evenly spaced positions in each row.
4. Each printed count (data-lab-count, data-lab-total) equals the number of marks it describes.
5. The results table has one row per case (data-lab-row), each showing the case's actual outcome,
   with no case missing or repeated: misses included.
Exits non-zero on any failure.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / ".next/server/app/projects/fpa-intelligence-engine.html"
LAB = ROOT / "public/engine/validation-lab.json"
PIN_FILE = ROOT / "src/lib/validationLab.ts"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
        "circle", "rect", "line", "path", "stop", "use"}


def detection(case: dict) -> str | None:
    if case["group"] == "control":
        return None
    if case["faulty"] and case["actual"]["outcome"] == "ACCEPT":
        return "missed"
    if case["group"] == "conditional":
        return "conditional"
    return "caught" if case["actual"]["outcome"] == "REJECT" else "missed"


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.tagged: list[dict] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        node = {"tag": tag, "attrs": a, "text": ""}
        if any(k.startswith("data-lab-") for k in a):
            self.tagged.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        if any(k.startswith("data-lab-") for k in a):
            self.tagged.append({"tag": tag, "attrs": a, "text": ""})

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            if self.stack.pop()["tag"] == tag:
                break

    def handle_data(self, data):
        for node in self.stack:
            node["text"] += data


def main() -> int:
    failures: list[str] = []
    if not PAGE.exists():
        print(f"test-engine-lab: {PAGE} not found; run `npm run build` first", file=sys.stderr)
        return 1
    raw = LAB.read_bytes()
    pin = re.search(r'VALIDATION_LAB_SHA256 = "([0-9a-f]{64})"', PIN_FILE.read_text()).group(1)
    if hashlib.sha256(raw).hexdigest() != pin:
        failures.append("validation-lab.json is not the pinned file")
    lab = json.loads(raw)
    cases = lab["cases"]
    det = {c["id"]: detection(c) for c in cases}
    faulty = [c for c in cases if c["faulty"]]
    stats = {
        "cases": len(cases),
        "caught": sum(c["expected"]["outcome"] == "REJECT" and c["actual"]["outcome"] == "REJECT" for c in faulty),
        "limitations": sum(c["actual"]["outcome"] == "ACCEPT" for c in faulty),
    }

    page = Page()
    page.feed(PAGE.read_text(encoding="utf-8"))
    by = lambda attr: [n for n in page.tagged if attr in n["attrs"]]  # noqa: E731

    # 2. Stat tiles.
    tiles = {n["attrs"]["data-lab-stat"]: n for n in by("data-lab-stat")}
    for key, value in stats.items():
        tile = tiles.get(key)
        if tile is None:
            failures.append(f"stat tile {key} missing")
        elif int(tile["attrs"]["data-v"]) != value or tile["text"].strip() != str(value):
            failures.append(f"stat tile {key}: shows {tile['text'].strip()!r} (data-v {tile['attrs']['data-v']}), JSON gives {value}")

    # 3. Map marks.
    cells = by("data-lab-cell")
    seen = Counter(n["attrs"]["data-case"] for n in cells)
    expected_ids = {c["id"] for c in cases if det[c["id"]]}
    if set(seen) != expected_ids:
        failures.append(f"map marks for {sorted(set(seen) ^ expected_ids)} missing or extra")
    for cid, n in seen.items():
        if n != 1:
            failures.append(f"case {cid} drawn {n} times")
    topic_of = {c["id"]: c["topic"] for c in cases}
    rows: dict[str, list[float]] = {}
    for n in cells:
        a = n["attrs"]
        cid = a["data-case"]
        if a["data-topic"] != topic_of.get(cid):
            failures.append(f"case {cid} drawn in row {a['data-topic']}, JSON topic {topic_of.get(cid)}")
        if a["data-detection"] != det.get(cid):
            failures.append(f"case {cid} drawn as {a['data-detection']}, JSON gives {det.get(cid)}")
        rows.setdefault(a["data-topic"], []).append(float(a["data-x"]))
    for topic, xs in rows.items():
        steps = {round(b - a, 6) for a, b in zip(xs, xs[1:])}
        if xs and (xs[0] != 0 or len(steps) > 1):
            failures.append(f"row {topic}: marks not evenly spaced from 0 ({xs})")

    # 4. Printed counts.
    drawn = Counter((n["attrs"]["data-topic"], n["attrs"]["data-detection"]) for n in cells)
    counts = by("data-lab-count")
    for n in counts:
        a = n["attrs"]
        key = (a["data-topic"], a["data-detection"])
        if int(a["data-v"]) != drawn[key] or n["text"].strip() != a["data-v"]:
            failures.append(f"count {key}: prints {n['text'].strip()!r} (data-v {a['data-v']}), {drawn[key]} marks drawn")
    printed = {(n["attrs"]["data-topic"], n["attrs"]["data-detection"]) for n in counts}
    for key, value in drawn.items():
        if key not in printed:
            failures.append(f"no printed count for {key} ({value} marks)")
    totals = Counter(n["attrs"]["data-detection"] for n in cells)
    for n in by("data-lab-total"):
        d = n["attrs"]["data-lab-total"]
        if int(n["attrs"]["data-v"]) != totals[d] or n["text"].strip() != str(totals[d]):
            failures.append(f"legend total {d}: prints {n['text'].strip()!r}, {totals[d]} marks drawn")

    # 5. Results table.
    table_rows = by("data-lab-row")
    row_ids = Counter(n["attrs"]["data-lab-row"] for n in table_rows)
    if set(row_ids) != {c["id"] for c in cases} or any(v != 1 for v in row_ids.values()):
        failures.append(f"results table rows do not match the cases: {sorted(set(row_ids) ^ {c['id'] for c in cases})}")
    actual = {c["id"]: c["actual"]["outcome"] for c in cases}
    for n in table_rows:
        cid = n["attrs"]["data-lab-row"]
        if n["attrs"]["data-actual"] != actual.get(cid):
            failures.append(f"table row {cid} shows {n['attrs']['data-actual']}, JSON gives {actual.get(cid)}")
        for code in [c for c in cases if c["id"] == cid][0]["actual"]["codes"]:
            if code not in n["text"]:
                failures.append(f"table row {cid} does not print its code {code}")

    for f in failures:
        print(f"FAIL: {f}")
    print(f"test-engine-lab: {len(cases)} cases, {len(cells)} map marks, {len(counts)} printed counts, {len(table_rows)} table rows; "
          f"tiles {stats}; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

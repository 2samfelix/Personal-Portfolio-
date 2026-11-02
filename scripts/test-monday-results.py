#!/usr/bin/env python3
"""Checks the monday.com page's Q3 results section against its data.

Run after a build:
  npm run test:monday-results            # the production build (.next)
  npm run test:monday-results-fixture    # the scored test fixture (.next-fixture)

Reads the prerendered page (<dist>/server/app/projects/monday-operating-plan.html).

Pending state (no results file):
1. The section sits after the locked test and before the model preview, shows the lock
   facts of the q3-2026-call-locked Release, an Actual of "Reported Nov 9, 2026" for each
   of the five locked metrics, the two no-call items, and no actual anywhere on the page.

Scored state (a validated results file, or the fixture):
2. The file the page names has the SHA-256 the page names, and status "scored".
3. Every actual drawn or printed (data-actual) holds the JSON value, and every printed
   one shows exactly that value; every JSON value is shown.
4. Each row's result (inside / above / below) and its guidance comparison match a fresh
   comparison of the JSON value with the locked cells, read here with openpyxl from the
   hash-pinned workbooks; the derived margin is marked not scored.
5. The T2 and T3 readings count towards their triggers exactly when the locked rules say.
6. On each chart axis, the drawn positions of locked marks and actuals are one linear
   function of their values, and the chart prints no number that is not tied to a
   workbook cell or a JSON value.
Exits non-zero on any failure.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
Q3_BOOK = (ROOT / "monday-operating-plan/model/monday_q3_call.xlsx", "49463d1fbb678fd26b59c3c81e70cb52613a4a73906b846bcaaf034be76bb722")
PLAN_BOOK = (ROOT / "monday-operating-plan/model/monday_plan.xlsx", "125af68742c9d3501cd2f23944899cc4625cf5285e79ba9ea2bee34f24315419")
RELEASE = {"tag": "q3-2026-call-locked", "commit": "60e2932", "published": "2026-10-28 21:43:23 UTC", "sha256": Q3_BOOK[1]}
PENDING = "Reported Nov 9, 2026"
METRICS = [
    # key, Scorecard label, guidance sheet (or None)
    ("revenue_usd_m", "Revenue (USD m)", ("Revenue", "Q3 2026 revenue guidance - low (USD m)", "Q3 2026 revenue guidance - high (USD m)")),
    (
        "non_gaap_operating_income_usd_m",
        "Non-GAAP operating income (USD m)",
        ("OpIncome_Margin", "Q3 2026 non-GAAP op. income guidance - low (USD m)", "Q3 2026 non-GAAP op. income guidance - high (USD m)"),
    ),
    ("non_gaap_operating_margin", "Non-GAAP operating margin (derived from calls)", None),
    ("net_dollar_retention", "All-customer net dollar retention", None),
    ("customers_over_50k_arr", "Paid customers >$50k ARR", None),
]
TRIGGERS = ["t2_revenue_beat_vs_guidance_mid", "t3_net_adds_customers_over_50k"]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "circle", "rect", "line", "path", "stop", "use"}


def fmt(key: str, v: float) -> str:
    if key in ("revenue_usd_m", "non_gaap_operating_income_usd_m"):
        return f"${v:.1f}M"
    if key == "non_gaap_operating_margin":
        return f"{v * 100:.1f}%"
    if key == "net_dollar_retention":
        return f"{v * 100:.0f}%"
    if key in ("customers_over_50k_arr", "t3_net_adds_customers_over_50k"):
        return f"{int(round(v)):,}"
    if key == "t2_revenue_beat_vs_guidance_mid":
        return ("+" if v >= 0 else "−") + f"{abs(v * 100):.2f}%"
    raise KeyError(key)


class Page(HTMLParser):
    """Collects elements by attribute, with their text, inside the results section."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.nodes: list[dict] = []
        self.section_depth = 0
        self.ids: list[str] = []
        self.section: dict | None = None
        self.svg_depth = 0
        self.loose: list[str] = []
        self.all_text = ""
        self.page_actuals = 0

    def _open(self, tag, attrs, void):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if "data-actual" in a:
            self.page_actuals += 1
        # The table row (data-metric) the element sits in, if any.
        metric = a.get("data-metric") or next((n["metric"] for n in reversed(self.stack) if n.get("metric")), None)
        node = {"tag": tag, "attrs": a, "text": "", "metric": metric}
        if a.get("id") == "results":
            self.section = node
            self.section_depth = 1
        elif self.section_depth and not void:
            self.section_depth += 1
        if self.section_depth:
            self.nodes.append(node)
            if tag == "svg":
                self.svg_depth += 1
        if not void:
            self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self._open(tag, attrs, tag in VOID)

    def handle_startendtag(self, tag, attrs):
        self._open(tag, attrs, True)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            node = self.stack.pop()
            if node["tag"] == tag:
                break
        if self.section_depth:
            if tag == "svg":
                self.svg_depth -= 1
            self.section_depth -= 1

    def handle_data(self, data):
        if not self.section_depth:
            return
        self.all_text += data
        for node in self.stack:
            node["text"] += data
        if self.svg_depth and data.strip() and re.search(r"\d", data):
            if not any(k in n["attrs"] for n in self.stack for k in ("data-ref", "data-actual", "data-label")):
                self.loose.append(data.strip())


def sheet_row(ws, label: str) -> int:
    hits = [r for r in range(1, ws.max_row + 1) if str(ws.cell(r, 1).value or "").strip() == label]
    if len(hits) != 1:
        raise SystemExit(f"test-monday-results: {ws.title}: expected one row labelled {label!r}, found {len(hits)}")
    return hits[0]


def sheet_row_prefix(ws, prefix: str) -> int:
    hits = [r for r in range(1, ws.max_row + 1) if str(ws.cell(r, 1).value or "").startswith(prefix)]
    if len(hits) != 1:
        raise SystemExit(f"test-monday-results: {ws.title}: expected one row starting {prefix!r}, found {len(hits)}")
    return hits[0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", default=".next")
    args = ap.parse_args()
    page_file = ROOT / args.dist / "server/app/projects/monday-operating-plan.html"
    if not page_file.exists():
        print(f"test-monday-results: {page_file} not found; build first", file=sys.stderr)
        return 1
    failures: list[str] = []
    for path, pin in (Q3_BOOK, PLAN_BOOK):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != pin:
            failures.append(f"{path.name}: SHA-256 {digest} does not match the pin {pin}")

    page = Page()
    page.feed(page_file.read_text(encoding="utf-8"))
    sec = page.section
    if sec is None:
        print("FAIL: no #results section on the page")
        return 1
    state = sec["attrs"].get("data-results-state")
    text = re.sub(r"\s+", " ", page.all_text)

    # Placement: after the locked test, before the model preview.
    try:
        if not page.ids.index("q3-test") < page.ids.index("results") < page.ids.index("inside-the-model"):
            failures.append("the results section is not between #q3-test and #inside-the-model")
    except ValueError as e:
        failures.append(f"section missing: {e}")

    # Lock facts and the no-call items, in both states.
    for what, needle in (("release", RELEASE["tag"]), ("commit", RELEASE["commit"]), ("published", RELEASE["published"]), ("SHA-256", RELEASE["sha256"])):
        if needle not in text:
            failures.append(f"lock facts: {what} {needle!r} not shown")
    if text.count("No call made.") != 2:
        failures.append(f"expected the two no-call items, found {text.count('No call made.')}")
    if "locked before the results" not in text or "company's own" not in text.replace("’", "'"):
        failures.append("the section does not say the call was locked before the results and the actuals come from the company's own filing")

    rows = [n for n in page.nodes if "data-metric" in n["attrs"]]
    if [r["attrs"]["data-metric"] for r in rows] != [m[0] for m in METRICS]:
        failures.append(f"table rows {[r['attrs']['data-metric'] for r in rows]} are not the five locked metrics in order")
    actual_nodes = [n for n in page.nodes if "data-actual" in n["attrs"]]

    if state == "pending":
        pend = [n for n in page.nodes if "data-pending-actual" in n["attrs"]]
        if len(pend) != len(METRICS) or any(n["text"].strip() != PENDING for n in pend):
            failures.append(f"pending: expected {len(METRICS)} Actual cells reading {PENDING!r}, found {[n['text'].strip() for n in pend]}")
        if page.page_actuals:
            failures.append(f"pending: the page shows {page.page_actuals} actual values")
        if any("data-result" in n["attrs"] for n in page.nodes) or any(n["tag"] == "svg" for n in page.nodes):
            failures.append("pending: the section shows results or a results chart")
        real = ROOT / "public/monday-operating-plan/monday_q3_actuals.json"
        if real.exists() and json.loads(real.read_text()).get("status") != "pending":
            failures.append("pending page, but public/monday-operating-plan/monday_q3_actuals.json is scored: rebuild")
        summary = f"pending; {len(rows)} locked rows, lock facts shown, no actuals"
    elif state == "scored":
        rel = sec["attrs"].get("data-results-file", "")
        path = ROOT / rel
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if digest != sec["attrs"].get("data-results-sha256"):
            failures.append(f"{rel}: SHA-256 {digest}, the page names {sec['attrs'].get('data-results-sha256')}")
        doc = json.loads(raw)
        if doc.get("status") != "scored":
            failures.append(f"{rel}: status is {doc.get('status')!r}, the page is scored")
        values = {**doc["actuals"], **doc["triggers"]}
        if "fixture" in rel and "Test fixture" not in text:
            failures.append("the fixture build does not say it is a test fixture")

        # 3. Every actual shown is the JSON value; every JSON value is shown.
        shown = defaultdict(int)
        for n in actual_nodes:
            a = n["attrs"]
            key = a["data-actual"]
            if key not in values:
                failures.append(f"actual {key!r} is not in {rel}")
                continue
            if abs(float(a["data-v"]) - values[key]) > 1e-12:
                failures.append(f"{key}: drawn {a['data-v']}, JSON {values[key]}")
            if "data-d" in a:
                shown[key] += 1
                if a["data-d"] != fmt(key, values[key]):
                    failures.append(f"{key}: printed {a['data-d']!r}, JSON value prints as {fmt(key, values[key])!r}")
                if a["data-d"] not in n["text"]:
                    failures.append(f"{key}: element text {n['text']!r} does not show {a['data-d']!r}")
        for key in values:
            if not shown[key]:
                failures.append(f"{key}: the JSON value is never printed")
        for note in doc.get("notes", []):
            if note not in text:
                failures.append(f"note not shown: {note!r}")
        if doc["source"]["document"] not in text:
            failures.append("the source document is not named")

        # 4. Results, recomputed from the workbook's stored values.
        q3 = openpyxl.load_workbook(Q3_BOOK[0], data_only=True)
        sc = q3["Scorecard"]
        for (key, label, gsheet), row in zip(METRICS, rows):
            r = sheet_row(sc, label)
            low, high = sc.cell(r, 3).value, sc.cell(r, 5).value
            a = values[key]
            want = "below" if a < low else "above" if a > high else "inside"
            res = [n for n in page.nodes if n["metric"] == key and "data-result" in n["attrs"]]
            got = res[0]["attrs"]["data-result"] if res else None
            if got != want:
                failures.append(f"{key}: result {got!r}, locked {low}..{high} and actual {a} give {want!r}")
            if res and (res[0]["attrs"]["data-scored"] == "true") != (key != "non_gaap_operating_margin"):
                failures.append(f"{key}: scored flag {res[0]['attrs']['data-scored']} is wrong")
            guide = [n for n in page.nodes if n["metric"] == key and "data-guide" in n["attrs"]]
            if gsheet:
                ws = q3[gsheet[0]]
                glo = ws.cell(sheet_row(ws, gsheet[1]), 3).value
                ghi = ws.cell(sheet_row(ws, gsheet[2]), 3).value
                gwant = "below" if a < glo else "above" if a > ghi else "within"
            elif key == "non_gaap_operating_margin":
                ws = q3["OpIncome_Margin"]
                g = ws.cell(sheet_row_prefix(ws, "TAIL derived margin"), 4).value
                gwant = "above" if a > g else "below" if a < g else "equal"
            else:
                gwant = "none"
            ggot = guide[0]["attrs"]["data-guide"] if guide else None
            if ggot != gwant:
                failures.append(f"{key}: versus guidance {ggot!r}, expected {gwant!r}")

        # 5. Trigger readings.
        plan = openpyxl.load_workbook(PLAN_BOOK[0], data_only=True)
        rec = plan["Recommendation"]
        t2 = rec.cell(sheet_row_prefix(rec, "T2 threshold"), 3).value
        t3 = rec.cell(sheet_row_prefix(rec, "T3 threshold"), 3).value
        counts = {n["attrs"]["data-trigger"]: n["attrs"]["data-counts"] for n in page.nodes if "data-trigger" in n["attrs"]}
        want_counts = {"t2_revenue_beat_vs_guidance_mid": values["t2_revenue_beat_vs_guidance_mid"] < t2, "t3_net_adds_customers_over_50k": values["t3_net_adds_customers_over_50k"] <= t3}
        for k, w in want_counts.items():
            if counts.get(k) != ("true" if w else "false"):
                failures.append(f"{k}: counts={counts.get(k)!r}, the locked rule gives {w}")

        # 6. Geometry and loose numbers.
        axes: dict[str, list[tuple[float, float]]] = defaultdict(list)
        drawn = defaultdict(set)
        for n in page.nodes:
            a = n["attrs"]
            if "data-axis" in a:
                axes[a["data-axis"]].append((float(a["data-v"]), float(a["data-pos"])))
                if "data-actual" in a:
                    drawn[a["data-actual"]].add(a["data-axis"])
        for key, _, _ in METRICS:
            if len(drawn[key]) != 2:
                failures.append(f"{key}: drawn on {len(drawn[key])} chart axes, expected 2 (phone and desktop)")
        worst = 0.0
        for axis, pts in axes.items():
            xs = [p[0] for p in pts]
            if len(set(xs)) < 2:
                failures.append(f"axis {axis}: fewer than two distinct values")
                continue
            n = len(pts)
            mx = sum(xs) / n
            my = sum(p[1] for p in pts) / n
            b = sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x in xs)
            resid = max(abs(y - (my + b * (x - mx))) for x, y in pts)
            worst = max(worst, resid)
            if resid > 0.02:
                failures.append(f"axis {axis}: positions are not linear in the values (max residual {resid:.3f})")
        for s in page.loose:
            failures.append(f"results chart prints a number tied to no cell or JSON value: {s!r}")
        summary = f"scored from {rel}; {len(actual_nodes)} tagged actuals, {sum(len(p) for p in axes.values())} marks on {len(axes)} axes, max residual {worst:.4f}px"
    else:
        failures.append(f"unknown section state {state!r}")
        summary = "?"

    for f in failures:
        print(f"FAIL: {f}")
    print(f"test-monday-results: {summary}; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Renders the one-page monday.com management memo (PDF).

  python3 scripts/render-monday-memo.py

writes public/downloads/monday-operating-plan-memo.pdf. The site pins the file's SHA-256
(MEMO_SHA256 in src/lib/mondayPlan.ts), so after a change, update the pin and the hash
the Downloads card shows (the build fails until they match).

The memo is derived from the locked plan workbook (Release plan-2026-locked): every plan
figure below is copied from its Executive_Summary, Scenarios and Recommendation sheets, and
the plan text is unchanged from the version published on October 30, 2026. The Q3 2026
result block and the open items were updated after scoring; their figures come from the
monday-operating-plan repository's scoring/q3-2026-scorecard.md.

Layout: the original ReportLab layout (letter, 0.55 in side margins, Helvetica), rebuilt
from that PDF's drawing commands. The output is byte-for-byte reproducible: ReportLab's
invariant mode fixes the document ID, and SOURCE_DATE_EPOCH (set below) the date.
"""
from __future__ import annotations

import calendar
import hashlib
import os
from pathlib import Path

# Reproducible output: a fixed creation date (the day this version was written, Q3 2026
# scored) and ReportLab's invariant mode, which fixes the document ID.
os.environ["SOURCE_DATE_EPOCH"] = str(calendar.timegm((2026, 11, 11, 0, 0, 0)))

from reportlab import rl_config  # noqa: E402

rl_config.invariant = 1

from reportlab.lib.colors import Color  # noqa: E402
from reportlab.lib.enums import TA_RIGHT  # noqa: E402
from reportlab.lib.pagesizes import letter  # noqa: E402
from reportlab.lib.styles import ParagraphStyle  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    Flowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/downloads/monday-operating-plan-memo.pdf"


def rgb(r: int, g: int, b: int) -> Color:
    return Color(r / 255, g / 255, b / 255)


FOREST = rgb(31, 59, 46)
BRASS = rgb(130, 97, 54)
INK = rgb(27, 27, 24)
MUTED = rgb(90, 90, 82)
CREAM_BAND = rgb(244, 239, 227)
RULE = rgb(217, 211, 195)
KICKER = rgb(216, 192, 143)
SUBTITLE = rgb(231, 226, 210)
WHITE = rgb(255, 255, 255)

PAGE_W, PAGE_H = letter
MARGIN = 39.6
WIDTH = PAGE_W - 2 * MARGIN  # 532.8
INDENT = 6  # body text sits 6 pt inside the coloured blocks

S = {
    "kicker": ParagraphStyle("kicker", fontName="Helvetica-Bold", fontSize=7.4, leading=9, textColor=KICKER),
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=WHITE),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=7.8, leading=10, textColor=SUBTITLE),
    "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=BRASS, leftIndent=INDENT),
    "label0": ParagraphStyle("label0", fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=BRASS),
    "question": ParagraphStyle("question", fontName="Helvetica-Bold", fontSize=10.2, leading=13.2, textColor=INK, leftIndent=INDENT),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.2, leading=12.2, textColor=INK, leftIndent=INDENT),
    "body0": ParagraphStyle("body0", fontName="Helvetica", fontSize=9.2, leading=12.2, textColor=INK, spaceBefore=3),
    "note": ParagraphStyle("note", fontName="Helvetica", fontSize=7.8, leading=10, textColor=MUTED, leftIndent=INDENT),
    "th": ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=7.4, leading=9, textColor=WHITE),
    "thr": ParagraphStyle("thr", fontName="Helvetica-Bold", fontSize=7.4, leading=9, textColor=WHITE, alignment=TA_RIGHT),
    "tdh": ParagraphStyle("tdh", fontName="Helvetica-Bold", fontSize=8.8, leading=11, textColor=INK),
    "td": ParagraphStyle("td", fontName="Helvetica", fontSize=8.8, leading=11, textColor=INK),
    "tdr": ParagraphStyle("tdr", fontName="Helvetica", fontSize=8.8, leading=11, textColor=INK, alignment=TA_RIGHT),
    "bullet": ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=8.6, leading=11.2, textColor=INK, leftIndent=INDENT + 9, bulletIndent=INDENT
    ),
}


def p(text: str, style: str) -> Paragraph:
    return Paragraph(text, S[style])


def label(text: str) -> list[Flowable]:
    return [Spacer(1, 9), p(text, "label"), Spacer(1, 2)]


# --- Content --------------------------------------------------------------------------

HEADER = [
    p("MANAGEMENT MEMO · STRATEGIC FP&amp;A", "kicker"),
    Spacer(1, 4),
    p("monday.com operating plan, Q3 2026 to Q4 2027", "title"),
    Spacer(1, 2),
    p(
        "Forecast locked before Q3 results. Release plan-2026-locked, Oct 29, 2026 17:31 UTC. SHA-256 125af687…24315419. "
        "Q3 2026 results reported Nov 9, 2026 and scored against the locked call.",
        "subtitle",
    ),
]

QUESTION = (
    "If growth decelerates faster than guided after the July 2026 restructuring, how should management adjust "
    "hiring and operating spend to protect margin and cash generation without damaging long-term growth?"
)

BOTTOM_LINE = (
    "<b>Hold the Base plan and act on triggers, not on the forecast.</b> Base FY2027 revenue is $1,706.2M at a 19.3% non-GAAP "
    "margin. If growth slows faster and spending stays at the Base level, FY2027 revenue is $1,626.5M and margin 15.3%, falling to "
    "12.9% by Q4 2027. The two cases are only 4.67% of revenue apart, about 1.13× a normal four-quarter forecast miss, so they "
    "cannot be told apart in advance."
)

# Q3 2026 result: figures from scoring/q3-2026-scorecard.md (sections 1, 3 and 4).
Q3_RESULT = (
    "<b>3 of 4 scored calls landed inside their locked ranges.</b> Non-GAAP operating income was $89.4M, above the call’s "
    "$62.9M to $72.8M range: a miss, published as a miss. No trigger fired; each needs two consecutive quarters, so Q3 alone "
    "could not fire one. Detail: scoring/q3-2026-scorecard.md in the repository."
)

CASES = [
    ["Revenue", "1,489.2", "1,706.2", "1,484.3", "1,626.5"],
    ["Non-GAAP operating income", "252.1", "328.5", "247.1", "249.4"],
    ["Non-GAAP operating margin", "16.9%", "19.3%", "16.6%", "15.3%"],
    ["Adjusted FCF (guide basis)", "285.0", "371.4", "281.1", "249.4"],
]

CASES_NOTE = (
    "Base is a beat-adjusted central estimate, not guidance. FY2027 Base FCF assumes 1.13× conversion ($371.4M); range $328.5M at "
    "1.0× to $403.5M at the FY2026 guide ratio. Downside is shown before any management response."
)

KEY_RISK = [
    "Growth keeps slowing faster than guided while operating expense dollars stay at plan. Margin falls from 16.6% for FY2026 "
    "to 12.9% in Q4 2027, because the revenue shortfall flows through at gross margin while costs do not flex.",
    "Forecast confidence is low beyond two quarters: average backtest error is about 1% one quarter out and 2.4% to 4.1% at "
    "three to four quarters; Q3 and Q4 2027 are untested.",
]

RESPONSE = [
    "<b>Lever 1</b>: hold R&amp;D and G&amp;A 5% below plan. Saves $19.3M in FY2027; worth doing only if it costs less than "
    "$21.9M of revenue (1.35%).",
    "<b>Lever 2</b> (conditional, not automatic): cut S&amp;M 10%. Saves $51.2M; breakeven $58.2M (3.58%). A one-year view "
    "ignores the multi-year cost of acquiring fewer customers.",
    "Earliest start: Q2 2027, after two consecutive quarters of a trigger.",
]

TRIGGERS = [
    ["Watch", "Revenue more than 1.04% below the Base path (Q4 2026: below $390.8M). Fires on 3 of 8 backtest quarters.",
     "Review only. No spending action."],
    ["Action", "Revenue at or below the Downside path (Q4 2026: $390.0M), or revenue beat vs guidance midpoint below 1.48%. "
     "Chosen after the Watch test; not out-of-sample.", "Lever 1."],
    ["Action + T3", "As above, and net adds of customers above $50K ARR at or below 194 per quarter.", "Add Lever 2 (conditional)."],
]

TRIGGERS_NOTE = "Net dollar retention is a narrative indicator, not a trigger: the backtest showed it does not reliably translate into revenue."

# Still open after the Q3 2026 results. Answered by them and dropped (scorecard section 2): whether the
# FY2026 FCF guide excludes restructuring, the Q3 actuals and severance paid, and a new buyback.
UNKNOWN = [
    "The growth cost of cutting spend cannot be measured from public data; decisions rest on breakeven revenue loss.",
    "Restructuring savings and the headcount path are not disclosed, including in the Q3 2026 filing.",
    "Q4 2026 is the first quarter with revenue-trigger thresholds (Watch below $390.8M, Action at or below $390.0M).",
]

FOOTER = (
    "Public-data case study built from SEC filings; information cutoff October 28, 2026 (Q3 2026 result and open items "
    "updated after scoring, from the Q3 2026 Form 6-K filed November 9, 2026; plan content unchanged). This is not "
    "monday.com’s internal budget and is not guidance. Sourced / Derived / Assumed labels, checks and sources are in "
    "monday_plan.xlsx (349 checks, 0 failing). Repository: github.com/2samfelix/monday-operating-plan. Prepared by Sam Felix."
)


# --- Layout ---------------------------------------------------------------------------

def header_block() -> Table:
    t = Table([[HEADER]], colWidths=[WIDTH])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), FOREST),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def cases_table() -> Table:
    head = [p("USD millions", "th")] + [p(h, "thr") for h in ("Base FY26", "Base FY27", "Downside FY26", "Downside FY27")]
    rows = [[p(r[0], "tdh")] + [p(v, "tdr") for v in r[1:]] for r in CASES]
    w = (WIDTH - 170.496) / 4
    t = Table([head] + rows, colWidths=[170.496] + [w] * 4, rowHeights=[15] + [17] * len(rows))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("BACKGROUND", (3, 1), (-1, -1), CREAM_BAND),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def two_columns() -> Table:
    left = [p("KEY RISK", "label0"), Spacer(1, 2)] + [p(t, "body0") for t in KEY_RISK]
    right = [p("RECOMMENDED RESPONSE", "label0"), Spacer(1, 2)] + [p(t, "body0") for t in RESPONSE]
    half = 258.408
    t = Table([[left, right]], colWidths=[half, WIDTH - half])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBEFORE", (1, 0), (1, 0), 0.6, RULE),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 12),
        ("LEFTPADDING", (1, 0), (1, 0), 12),
        ("RIGHTPADDING", (1, 0), (1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def triggers_table() -> Table:
    head = [p(h, "th") for h in ("Tier", "Trigger", "Response")]
    rows = [[p(a, "tdh"), p(b, "td"), p(c, "td")] for a, b, c in TRIGGERS]
    t = Table([head] + rows, colWidths=[69.264, 340.992, WIDTH - 69.264 - 340.992])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def story() -> list[Flowable]:
    out: list[Flowable] = [header_block()]
    out += label("Q3 2026 RESULT") + [p(Q3_RESULT, "body")]
    out += label("THE QUESTION") + [p(QUESTION, "question")]
    out += label("BOTTOM LINE") + [p(BOTTOM_LINE, "body"), Spacer(1, 7), cases_table(), Spacer(1, 3), p(CASES_NOTE, "note")]
    out += [Spacer(1, 11), two_columns()]
    out += label("TRIGGER LOGIC (EACH MUST HOLD FOR TWO CONSECUTIVE QUARTERS; FIXED AT THE LOCK DATE)")
    out += [triggers_table(), Spacer(1, 1), p(TRIGGERS_NOTE, "note")]
    out += label("WHAT IS STILL UNKNOWN") + [KeepTogether([Paragraph(u, S["bullet"], bulletText="•") for u in UNKNOWN])]
    out += [Spacer(1, 8), p(FOOTER, "note")]
    return out


def on_page(canvas, _doc) -> None:
    canvas.setTitle("monday.com operating plan: management memo")
    canvas.setAuthor("Sam Felix")


def main() -> None:
    doc = SimpleDocTemplate(
        str(OUT), pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=42, bottomMargin=28,
        title="monday.com operating plan: management memo", author="Sam Felix",
    )
    doc.build(story(), onFirstPage=on_page, onLaterPages=on_page)
    pages = OUT.read_bytes().count(b"/Type /Page\n")
    if pages != 1:
        raise SystemExit(f"{OUT.relative_to(ROOT)}: {pages} pages; the memo must fit on one page")
    print(f"wrote {OUT.relative_to(ROOT)}: 1 page, SHA-256 {hashlib.sha256(OUT.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()

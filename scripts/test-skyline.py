#!/usr/bin/env python3
"""Checks the drawn Chicago skyline against its building table.

Run after `npm run build`:  npm run test:skyline

The table is src/lib/skyline-buildings.json (sourced heights and coordinates). This test
recomputes the projection from the coordinates on its own (view from Lake Michigan
looking due west: horizontal = north-south offset, depth = east-west offset) and, for
every skyline drawn on the prerendered pages (home, a project page, the 404):
1. Every building in the table is drawn once, and nothing else is.
2. Each building's drawn architectural height (top of its body parts above the waterline)
   relative to the tallest is within 2% of the table's; likewise its tip (masts), where
   the table gives one.
3. Left-to-right order matches the computed order (south to north).
4. Horizontal positions are a linear function of the computed north-south offsets.
5. The drawing is decorative: aria-hidden, hidden in print, with no text.
Exits non-zero on any failure.
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "src/lib/skyline-buildings.json").read_text())
PAGES = [
    ".next/server/app/index.html",
    ".next/server/app/projects/nike.html",
    ".next/server/app/_not-found.html",
]
M_PER_DEG_LAT = 111_320
TOL = 0.02


def computed():
    ref = DATA["reference"]
    out = {}
    for b in DATA["buildings"]:
        x = (b["lat"] - ref["lat"]) * M_PER_DEG_LAT
        depth = (b["lon"] - ref["lon"]) * M_PER_DEG_LAT * math.cos(math.radians(ref["lat"]))
        out[b["id"]] = {"x": x, "depth": depth, "arch": b["height"]["architectural_m"], "tip": b["height"].get("tip_m")}
    return out


def numbers(d: str) -> list[tuple[float, float]]:
    vals = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", d)]
    return list(zip(vals[0::2], vals[1::2]))


def svgs(html: str) -> list[str]:
    return re.findall(r"<svg[^>]*data-skyline=\"\"[^>]*>.*?</svg>", html, flags=re.S)


def measure(svg: str):
    ground = float(re.search(r'data-ground="([\d.]+)"', svg).group(1))
    drawn = {}
    for m in re.finditer(r'<g data-building="([^"]+)">(.*?)</g>(?=<g data-building|<line[^>]*data-part="waterline")', svg, flags=re.S):
        bid, inner = m.group(1), m.group(2)
        body = [numbers(d) for d in re.findall(r'<path d="([^"]+)" data-part="body"', inner)]
        masts = [float(v) for v in re.findall(r'<line data-part="mast"[^>]*?y2="([\d.]+)"', inner)]
        if not body:
            continue
        pts = [p for path in body for p in path]
        base = body[0]
        xs = [p[0] for p in base]
        drawn[bid] = {
            "arch": ground - min(p[1] for p in pts),
            "tip": ground - min(masts) if masts else None,
            "cx": (min(xs) + max(xs)) / 2,
        }
    return drawn


def main() -> int:
    want = computed()
    failures: list[str] = []
    checked = 0
    tallest_arch = max(v["arch"] for v in want.values())
    tallest_tip = max((v["tip"] or v["arch"]) for v in want.values())
    for page in PAGES:
        f = ROOT / page
        if not f.exists():
            failures.append(f"{page} not found; run `npm run build` first")
            continue
        html = f.read_text(encoding="utf-8")
        found = svgs(html)
        if not found:
            failures.append(f"{page}: no skyline")
        for i, svg in enumerate(found):
            where = f"{page} skyline {i + 1}"
            checked += 1
            head = svg[: svg.index(">")]
            if 'aria-hidden="true"' not in head or "print:hidden" not in head:
                failures.append(f"{where}: not aria-hidden and print-hidden")
            if re.search(r"<text\b", svg):
                failures.append(f"{where}: contains text")
            drawn = measure(svg)
            if set(drawn) != set(want):
                failures.append(f"{where}: draws {sorted(drawn)}, the table has {sorted(want)}")
                continue
            d_arch = max(v["arch"] for v in drawn.values())
            d_tip = max((v["tip"] or v["arch"]) for v in drawn.values())
            for bid, w in want.items():
                got = drawn[bid]["arch"] / d_arch
                exp = w["arch"] / tallest_arch
                if abs(got - exp) > TOL * exp:
                    failures.append(f"{where}: {bid} relative height {got:.4f}, table {exp:.4f}")
                if w["tip"]:
                    if drawn[bid]["tip"] is None:
                        failures.append(f"{where}: {bid} has no mast drawn, table tip {w['tip']} m")
                    else:
                        got_t, exp_t = drawn[bid]["tip"] / d_tip, w["tip"] / tallest_tip
                        if abs(got_t - exp_t) > TOL * exp_t:
                            failures.append(f"{where}: {bid} relative tip height {got_t:.4f}, table {exp_t:.4f}")
            order_drawn = sorted(drawn, key=lambda k: drawn[k]["cx"])
            order_want = sorted(want, key=lambda k: want[k]["x"])
            if order_drawn != order_want:
                failures.append(f"{where}: left-to-right {order_drawn}, computed {order_want}")
            # Linear: drawn centre = a + b * computed offset.
            xs = [want[k]["x"] for k in want]
            ys = [drawn[k]["cx"] for k in want]
            n = len(xs)
            mx, my = sum(xs) / n, sum(ys) / n
            b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
            resid = max(abs(y - (my + b * (x - mx))) for x, y in zip(xs, ys))
            if resid > 0.5:
                failures.append(f"{where}: positions are not linear in the projected offsets (residual {resid:.2f} m)")
    for f in failures:
        print(f"FAIL: {f}")
    order = sorted(want, key=lambda k: want[k]["x"])
    print(f"test-skyline: {len(want)} buildings, {checked} skylines checked; left to right: {', '.join(order)}; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

# Deferred work — Caterpillar Demand Quality

This file tracks known, intentionally-deferred corrections for this case study.
Future passes should read and update this file rather than relying on chat
history. Each item below should be removed (or checked off and dated) once it
is actually applied — do not let this file silently go stale.

**Status: every item tracked in this file has been resolved.** There is no
open/deferred work outstanding as of this note. The entries below are kept
as the audit trail of what was wrong and how it was corrected, not as a
to-do list — if a future pass finds new issues, add a new open section
above this one rather than editing these closed entries.

## Resolved

- **Exhibit 1 artwork text (was: stale "4 classification levels").** Resolved.
  `assets/exhibit-1-verification-strip.svg` now reads "0 assumed figures" (stat
  and `aria-label` both), matching the site and README. The light and dark
  PNG derivatives were regenerated from the corrected SVG via the committed
  build pipeline (`caterpillar-demand-quality/build/`).

- **604 bps (Q4 2025) and 509 bps (Q1 2026) provenance — RESOLVED.** These are
  kept unchanged; the question was their basis, not their correctness.

  They are **not** `tariff drag ÷ segment sales`. The original question that
  flagged this arithmetic, preserved here so it isn't re-derived incorrectly:
  - `$420M ÷ $6,926M ≈ 606 bps` (Q4 2025)
  - `$362M ÷ $7,161M ≈ 506 bps` (Q1 2026)

  Those direct ratios are close to, but not equal to, 604 and 509 — a ~2–3 bps
  gap. The actual basis, traced to the workbook's `Analysis` tab (rows 55–58,
  "Distortion (bps)"):

  ```
  Distortion (bps) = (ex-tariff margin, computed from raw $) − (Caterpillar's
                       own rounded disclosed reported margin %) × 10,000
  ```

  Worked for Q4 2025 (`Analysis!G55`, `G57`, `G58`):
  - Ex-tariff margin from raw dollars: `(segment profit $1,030M − (−$420M drag)) ÷ sales $6,926M = 20.9355%`
  - Caterpillar's disclosed reported margin (rounded to 1 decimal): `14.9%`
  - `20.9355% − 14.9% = 6.0355% = 603.6 bps → 604 bps`

  Same mechanism for Q1 2026 (`Analysis!H55`, `H57`, `H58`):
  - Ex-tariff margin from raw dollars: `(segment profit $1,535M − (−$362M drag)) ÷ sales $7,161M = 26.4907%`
  - Caterpillar's disclosed reported margin (rounded to 1 decimal): `21.4%`
  - `26.4907% − 21.4% = 5.0907% = 509.1 bps → 509 bps`

  The entire ~2–3 bps gap from the naive `drag ÷ sales` calc is explained by
  that one substitution: the workbook subtracts Caterpillar's **rounded**
  disclosed margin (e.g. 14.9%) rather than the **precise** margin recomputed
  from raw dollars (1,030/6,926 = 14.872%). Using the precise figure instead
  reconciles exactly to the naive ratio: `20.9355% − 14.872% = 6.064% ≈ 606
  bps`.

  This basis is also why the margin table is internally consistent: `14.9% +
  6.04% = 20.94% → 20.9%` (the displayed "ex-tariff margin" row), and
  similarly `21.4% + 5.09% = 26.49% → 26.5%`.

  **Q2 2026's 340 bps is different in kind, not just in value**: it is
  Caterpillar's own disclosed figure from the Q2 2026 earnings call (CFO Kyle
  Epley), not derived via the distortion formula above. Do not describe 604
  or 509 as company-disclosed — they are workbook-derived on the basis
  documented here.

  A short version of this explanation (same wording) appears in the live
  site's Margin Context caveat, `assets/exhibit-5-margin-context.md`, and the
  rebuilt PDF's Margin, Limitations, Auditability section.

- **PDF Q2 2026 tariff drag bps (was: stale 343 bps).** Resolved. The
  rebuilt `analysis/Caterpillar_Demand_Quality_Case_Study.pdf` now states 340
  bps for the Q2 2026 tariff drag, matching the figure SOURCED verbatim from
  the Q2 2026 earnings call (CFO Kyle Epley); the old "343 bps" was a
  rounding artifact produced by recomputing bps from the rounded $284M dollar
  drag, not the disclosed number.

- **Softened margin conclusion wording now in the PDF.** Resolved. The
  rebuilt PDF's Margin, Limitations, Auditability section carries the same
  softened sentence as the site ("...driven largely by tariff costs rather
  than an underlying efficiency or cost-control deterioration...").

- **Corrected Exhibit 4 two-line subtitle preserved through PDF rebuild.**
  Resolved. The rebuilt PDF embeds `assets/exhibit-4-operating-bridge.svg`
  directly (not a redrawn or re-captioned copy), so its subtitle is
  byte-identical to the approved site version by construction.

- **604/509 bps basis disclosure now in the PDF.** Resolved. The rebuilt
  PDF's Margin section carries the same basis-disclosure sentence as the site
  and `assets/exhibit-5-margin-context.md` (see the full explanation above).

- **"Quarters analysed" → "Quarters analyzed" (was: stale British spelling).**
  Resolved. Corrected everywhere it appeared: `assets/exhibit-1-verification-strip.svg`
  (visible stat text and `aria-label`), its regenerated light/dark PNGs,
  `README.md`, the site's verification-strip stat card
  (`src/components/CaterpillarProjectPage.tsx`), and the rebuilt PDF's
  opening stat strip. The original flagged string was "Quarters analysed,
  Q3 2024 – Q2 2026"; no other spelling or wording in that stat changed.

- **Other British spellings corrected project-wide.** `behaviour` →
  `behavior` in `assets/exhibit-6-forward-test.svg` (and its regenerated
  PNGs), `README.md`, the site's Forward Judgment "Alternative: demand
  pull-forward" paragraph, and the rebuilt PDF's corresponding sentence — no
  other word in that sentence changed. `reorganisation` → `reorganization`
  in `docs/methodology.md`'s Comparability item 1 (ordinary prose, not a
  quoted source term).

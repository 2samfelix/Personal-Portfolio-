# Deferred work — Caterpillar Demand Quality

This file tracks known, intentionally-deferred corrections for this case study.
Future passes should read and update this file rather than relying on chat
history. Each item below should be removed (or checked off and dated) once it
is actually applied — do not let this file silently go stale.

**Status:** Gate C3B (reconciliation with the FP&A Intelligence Engine audit)
is applied in full, uncommitted at time of writing: A (workbook), B
(methodology/docs), C (exhibits and site), D (case-study HTML/PDF, now 8
pages) and E (presentation rebuilt from source, 9 slides), followed by a
final consistency audit. The only open items are the evidence gaps below. The
"Resolved" entries are kept as the audit trail of what was wrong and how it
was corrected, not as a to-do list.

## Open

Evidence gaps. Each is marked INSUFFICIENT EVIDENCE wherever it is mentioned
and is not used as evidence until a verbatim quote is captured from the
primary source:

- ~~**Q4 2026 dealer-inventory drawdown commentary** (Q2 2026 call).~~
  **Resolved 2026-10-16:** quoted and attributed (CFO Kyle Epley, CEO Joseph
  Creed) in the public text and the workbook; see the first Resolved entry.
- ~~**FY2026 tariff-cost guidance** (about $2.2B, roughly half of Q3 in CI; Q2
  2026 call).~~ **Resolved 2026-10-16:** quoted and attributed (CFO Kyle
  Epley), with the IEEPA-recoveries exclusion; see the first Resolved entry.
- **Exact release wording of the Q4 2025 / Q1 2026 manufacturing-cost
  attribution** ("…higher tariffs" in Comparability Log D18 vs "…higher tariff
  costs" in Construction Industries A28).
- **CI share of the $392M Q2 2026 IEEPA recoveries.** Not disclosed; "CI margin
  unlikely to be materially affected" stays labeled as inference.

## Resolved

- **Q4 drawdown and FY2026 tariff guidance now quoted (2026-10-16; text only).** The
  Q2 2026 call (Motley Fool transcript) was reviewed manually. The public wording that
  said no verbatim quote was captured (INSUFFICIENT EVIDENCE) is replaced by attributed
  wording built only from these quotes:
  - CFO Kyle Epley: "We also expect a more typical reduction in Construction Industries
    dealer inventory of over $1 billion in the fourth quarter."
  - CEO Joseph Creed: "We'll have a drawdown in the fourth quarter on CI dealer inventory."
  - Epley: "Excluding the expected IEEPA tariff recoveries of approximately $400 million
    reported in the second quarter, we now expect full year 2026 tariff costs of around
    $2.2 billion or at the low end of the range we previously provided."
  - Epley: "We anticipate tariff costs of around $600 million, which is similar to what we
    incurred in the third quarter of 2025. We expect about 50% of the tariffs to be
    incurred in Construction Industries and 25% in both Power & Energy and Resource
    Industries."

  Changed: README.md (forward-judgment note and Limitations), docs/methodology.md
  (Evidence gaps), docs/sources.md (Q2 2026 call rows), the site's Limitations list
  (`src/components/CaterpillarProjectPage.tsx`), case-study.html (Limitations) and
  presentation.html (slide 9, shortened; the IEEPA exclusion is kept). The H2 forward
  test stays stated as a condition. "Sales" was added before "bridges" in the
  verification-strip labels (site, projects.ts, Exhibit 1 SVG label and aria-label,
  README, case study, slide 9); the 28 / 32 count is unchanged.

  Workbook (same date, second commit): six text cells changed and nothing else.
  Dealer Inventory!D11 now quotes the Q2 call sentence exactly (the old quote said
  "about $400 million"; the transcript has no "about"). Source Index!D16 and D24,
  Comparability Log!F18 and Analysis!A60 and A63 now carry the attributed wording
  instead of INSUFFICIENT EVIDENCE. The edit replaced only those six entries in
  xl/sharedStrings.xml; every other file in the .xlsx package is byte-identical, every
  other cell matches before and after (formulas and cached values), and the 32
  reconciliation rows still hold cached zeros. The two matching Open items above are
  marked resolved.

- **Gate C3B, Phase C — exhibits and site (applied, uncommitted at time of writing).** The workbook and docs now
  use the corrected language; these public artifacts still carry the old claims
  and must be brought into line together (the exhibit-text verification script
  couples site titles to SVG text):
  - Verification strip (site `CaterpillarProjectPage.tsx` and Exhibit 1 SVG/PNGs):
    replace "32 / 32 reconcile to zero" and "0 assumed figures" with
    8 · 28 / 32 bridges reconcile independently · 5-level evidence
    classification · 16 comparability issues logged.
  - Exhibit 2 (SVG, PNGs, `public/` copy, homepage `public/project-visuals/caterpillar.png`):
    "~24 pts" / "~8 pts"; Q1 2025 annotation "Destocking" → "Slower stocking",
    labeled company-wide. README §4 image alt text and caption mirror this
    exhibit and change with it.
  - Exhibit 4 footnote: CI reconciles independently in seven of eight
    quarters; Q2 2025 closes by construction.
  - Exhibit 5 and the site margin table: "Disclosed tariff drag" → split into
    disclosed manufacturing costs (420 / 362, largely tariffs) and the Q2 2026
    tariff impact derived from the disclosed 340 bps (~284).
  - Site copy: pressure-test verdicts (sign only), driver order (interpretive),
    Q4 drawdown (conditional), IEEPA (inference), margin trough (interpretive).
  - `src/lib/projects.ts` Caterpillar fields.
- **Gate C3B, Phase D — case-study PDF (applied, uncommitted at time of writing; 8 pages).** Update
  `build/src/case-study.html` from the corrected language, rebuild the PDF and
  refresh `build/src/baseline-pdf-text.txt`.
- **Gate C3B, Phase E — presentation (applied, uncommitted at time of writing; rebuilt from source, 9 slides).** Do not edit until the
  workbook, site and PDF language is final. Affected pages: 2 (identity
  framing; "discloses both figures every quarter"), 3 (driver order), 4
  (seasonality), 5 (~24 / ~8 pts; "closed"; company-wide scope), 6 ("Caterpillar
  disclosed −$1,300M" is derived; magnitude verdicts), 7 (reconciliation
  footnote), 8 (Q4 drawdown; pull-forward as hypothesis), 9 (verification strip).

- **Presentation PDF had no source in the reproducible build pipeline.**
  Resolved in Gate C3B Phase E. The old PDF was raster slide images with an
  OCR text layer (its only font was "Glyphless"), so it could not be patched.
  It is now generated from `build/src/presentation.html` + `build/src/deck.css`
  by `build/render-deck.mjs` (`npm run caterpillar:deck`, also part of
  `caterpillar:build`), with Exhibit 3 spliced in from `assets/`.

- **Exhibit 1 artwork text (was: stale "4 classification levels").** Resolved.
  `assets/exhibit-1-verification-strip.svg` now reads "0 assumed figures" (stat
  and `aria-label` both), matching the site and README. The light and dark
  PNG derivatives were regenerated from the corrected SVG via the committed
  build pipeline (`caterpillar-demand-quality/build/`).
  **Superseded by Gate C3B:** "0 assumed figures" is itself being replaced.
  The workbook carries four BACK-SOLVED values that had been typed in source
  styling under rows classed SOURCED; the public stat becomes "5-level evidence
  classification" (Phase C).

- **Gate C3B, Phase A — workbook (applied, uncommitted at time of writing).**
  Five-level classification on the README tab; the four back-solved cells
  (Consolidated I8, Construction Industries E6, Resource Industries E6,
  Power and Energy E7) restyled orange and their row classes and notes
  corrected; reconciliation text now "28 independent, 4 with caveats";
  the 570 bps plug and the one-third / two-thirds verdict withdrawn
  (Analysis A61, A66); stale 343 (A64) and 505 (A60) bps corrected;
  Analysis I58 now returns the disclosed 340 bps instead of the rejected
  342.85 (the only formula change); tariff labels, driver order,
  pressure-test identity language and IEEPA wording corrected; unquoted
  guidance marked INSUFFICIENT EVIDENCE in the Analysis tab, Comparability
  Log and Source Index.

  **Withdrawn figures (audit trail; removed from the workbook in the Phase C
  pre-cleanup so it shows only the current interpretation):**
  - Analysis A46: an implied Q2 2025 CI build of about −$85M, backed out by
    treating the reported-vs-retail relation as an accounting identity.
  - Analysis A48: an assumed ~$50M "slight decrease" in the Q1 2025 CI build,
    used to claim the gap "understates by roughly $290M".
  - Analysis A50/A52: an "unexplained residual" of roughly $100–150M (about two
    points of growth). Judgment, not a calculation.
  - Analysis A45: "CI is 83% of the company-wide swing … FITS". The scopes
    differ, so only the sign is testable.
  - Analysis A61/A66: 840 bps recovery = ~270 bps tariff narrowing (606 → 340)
    + ~570 bps volume/price, "one-third / two-thirds". The 570 was a residual
    plug mixing the 606 bps simple ratio with the 340 bps call figure.
  Cell-level before/after text is kept in the Gate C3B change log.

- **Gate C3B, Phase B — methodology/docs (applied, uncommitted at time of
  writing).** README.md, docs/methodology.md, docs/definitions.md and
  docs/sources.md updated to the same language; methodology.md gains
  "How analytical claims are labeled" and "Evidence gaps" sections.

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

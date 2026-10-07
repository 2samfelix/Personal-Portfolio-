# Deferred work — Caterpillar Demand Quality

This file tracks known, intentionally-deferred corrections for this case study.
Future passes should read and update this file rather than relying on chat
history. Each item below should be removed (or checked off and dated) once it
is actually applied — do not let this file silently go stale.

## Content / provenance corrections

- **Exhibit 1 artwork text is stale.** The artwork currently reads "4
  classification levels on every figure in the dataset." This no longer
  matches the corrected verification-strip claim of "0 assumed figures" and
  needs to be updated to reflect that. Scope: the Exhibit 1 SVG/PNG source
  artwork itself (not just the site copy, which was already corrected in an
  earlier pass).
  - Update the Exhibit 1 SVG/PNG derivatives (light and dark, if applicable)
    to match.
  - Update the downloadable exhibit bundle (`assets/`, `assets/dark/`)
    accordingly so the shipped files match the on-site artwork.

- **PDF Q2 2026 tariff drag bps.** `analysis/Caterpillar_Demand_Quality_Case_Study.pdf`
  still states 343 bps for the Q2 2026 tariff drag. This should become 340
  bps — 340 is the figure SOURCED verbatim from the Q2 2026 earnings call
  (CFO Kyle Epley); 343 is a rounding artifact produced by recomputing bps
  from the rounded $284M dollar drag, not the disclosed number. (The site and
  workbook were already corrected to 340 in an earlier pass; only the PDF is
  outstanding.)

- **Softened margin conclusion wording must carry into the regenerated PDF.**
  The site's margin-section conclusion sentence was softened in an earlier
  pass (ex-tariff margin framed as an upper bound, not an efficiency/
  cost-control result). When the PDF is regenerated, carry this same softened
  wording into it rather than reverting to the PDF's older phrasing.

- **Preserve the corrected Exhibit 4 two-line subtitle during regeneration.**
  Exhibit 4's subtitle was corrected to a two-line form in an earlier pass.
  Any PDF/exhibit-package regeneration must preserve that corrected subtitle
  exactly — do not let a regeneration pipeline silently revert it to an older
  single-line version.

- **604 bps (Q4 2025) and 509 bps (Q1 2026) provenance is unresolved.**
  Unlike the Q2 2026 340 bps figure (confirmed SOURCED from the earnings
  call), the basis for 604 bps and 509 bps has not yet been verified against
  a disclosed source. Record the arithmetic explicitly so it isn't re-derived
  incorrectly later:
  - `$420M ÷ $6,926M = ~606 bps` (Q4 2025)
  - `$362M ÷ $7,161M = ~506 bps` (Q1 2026)
  Note that this arithmetic produces ~606 and ~506, not the 604 and 509
  currently shown on the site/workbook — a discrepancy that itself needs
  explanation before these are touched.
  **Do not change the 604 bps or 509 bps figures on the live page or in the
  workbook until the original basis/source for each is established.** This
  applies before any regeneration of the PDF or exhibit package as well —
  regeneration must not silently "fix" these numbers based on the arithmetic
  above without that provenance work being done first.

## Presentation cleanup (not content-affecting)

- Change "Quarters analysed" → "Quarters analyzed" (US spelling consistency).
  Not to be done now — layout/presentation pass only.

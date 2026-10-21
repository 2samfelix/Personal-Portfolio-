# Definitions

Derived from the case study and the workbook. For public-facing analytical wording and conclusions, the case-study source (`build/src/case-study.html`, rendered to the PDF by the committed build pipeline) governs; the project page, exhibits and presentation follow it. For figures, formulas, classifications, source links, and reconciliation logic, the workbook governs.

## Classification

Every figure in the workbook carries one of five evidence levels. No figure is an estimate.

- **SOURCED** — read directly from a primary document.
- **DERIVED** — calculated from sourced figures; the calculation is shown.
- **BACK-SOLVED** — backed out as the residual of other disclosed figures because the filing gives it only rounded or not at all. Typed as a value, shown in orange, and explained in a note. A bridge that uses one closes by construction and is not counted as an independent reconciliation. There are four: Consolidated Q2 2026 sales volume (3,113; the release says "$3.1 billion"), and the Q2 2024 prior-year sales for Construction Industries (6,683), Resource Industries (3,206) and Power & Energy (7,337).
- **NOT COLLECTED** — left blank because it was not captured in this pass; it may exist in a filing (for example the Q2 2026 CI profit-bridge volume and price lines). Never treated as zero.
- **NOT DISCLOSED** — the company did not publish it. Left blank. Never estimated.

Two further labels are not evidence levels: **CALC** marks a live formula row (its inputs carry their own level), and **INFERRED** is used in notes, not as a cell value, where a scope or period qualifier could not be recovered from the filing.

## Reconciliation

Each bridge tab (three segments and the consolidated total, eight quarters each) carries a reconciliation row: the disclosed volume, price realization, currency, and inter-segment components, less the reported sales change. All 32 rows return zero, but only **28 reconcile independently**. Four checks require caveats:

- **3 use back-solved prior-year values** — Construction Industries, Resource Industries and Power & Energy, Q2 2025. The Q2 2024 comparative was backed out of the Q2 2025 bridge itself, so these close by construction.
- **1 depends on a component disclosed only as "$3.1B"** — Consolidated Q2 2026 sales volume. It holds only within the rounding of that disclosure and is not described as independent.

A non-zero value anywhere means the tab has been edited. Reconciliation demonstrates internal consistency with the disclosed components, not that the right line items were chosen. The Construction Industries **profit** bridges are a different matter: Caterpillar itemizes only the drivers it considers primary, so the Q4 2025, Q1 2026 and Q2 2026 profit bridges remain unresolved: Q4 2025 and Q1 2026 leave $14M and $12M unitemized, and Q2 2026 itemizes no driver at all, so its entire $703M change is unitemized.

## Workbook tabs

| Tab | Contents |
|---|---|
| README | Classification scheme, reconciliation rule, and the three comparability issues that will break the dataset if ignored |
| Analysis | The worked question — did growth come from end-user demand or dealer restocking? Formula-linked to every other tab, with three typed inputs flagged in its header note |
| Consolidated | Company-wide sales & revenues, with the volume / price realization / currency / inter-segment bridge |
| Construction Industries | Segment sales, the same bridge, and segment profit margin — the one segment unaffected by the 2026 restatement |
| Resource Industries | Segment sales and bridge — restated in the 2026 releases; kept as two separate vintages, not charted as one continuous line |
| Power and Energy | Segment sales and bridge — renamed from "Energy & Transportation" and restated; also kept as two vintages |
| Dealer Inventory | Disclosed dealer-inventory dollar changes by quarter, with the verbatim disclosed language, scope (company-wide vs. Construction Industries), and verification notes |
| Retail Statistics | Rolling 3-Month Retail Sales Statistics by region and sector, kept on a separate basis from reported sales |
| Cash Flow | Operating cash flow and capital expenditure, as disclosed (year-to-date) and derived (standalone quarters, where both year-to-date endpoints share a stated basis) |
| Comparability Log | All 16 logged definitional breaks found while building the dataset, with the evidence and the treatment applied |
| Source Index | Every source document used, with a direct link and what it was used for |

## Terms used in the dataset

- **Reported-vs-retail gap** — the difference between Caterpillar's price-adjusted Construction Industries sales growth and its retail sales growth to end users. A directional and relative indicator of dealer stocking, not a precise dollar measurement of inventory. Displayed as ~24 and ~8 points (Q1 and Q2 2026) because retail growth is disclosed in whole percentages.
- **Implied stocking swing** — the reported-vs-retail gap expressed in dollars: an estimate of the year-over-year change in the size of the dealer build. Directional only; it is not an accounting identity, and only its sign is tested against Caterpillar's disclosures.
- **Back-solved value** — a figure backed out as the residual of other disclosures because the filing gives it only rounded or not at all. Flagged in orange in the workbook; a bridge that uses one is not an independent check.
- **Volume driver named first** — the driver Caterpillar mentions first in its volume explanation. The order is sourced; reading it as relative size is an interpretation.
- **Tariff-related cost** — for Q4 2025 and Q1 2026, the disclosed unfavorable manufacturing costs that Caterpillar said largely reflected tariffs; for Q2 2026, the 340 bps disclosed on the earnings call, converted to about $284M (derived).
- **Segment bridge** — Caterpillar's own disclosed decomposition of a reported sales change into volume, price realization, currency, and inter-segment components.
- **Dealer-inventory build** — the disclosed change in dealer inventory for a given period; disclosed inconsistently across quarters at either a company-wide or Construction Industries scope, never both for every quarter.

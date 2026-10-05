# Definitions

Derived from the case-study PDF and the workbook. For public-facing analytical wording and conclusions, the PDF governs. For figures, formulas, classifications, source links, and reconciliation logic, the workbook governs.

## Classification

Every figure in the workbook is classified SOURCED, DERIVED, CALC or NOT DISCLOSED, with INFERRED used in notes where a filing's scope or period qualifier could not be recovered. ASSUMPTION is part of the project's classification scheme but appears nowhere in this dataset — no figure here is assumed.

- **SOURCED** — read directly from a primary document.
- **DERIVED** — calculated from sourced figures; the calculation is shown.
- **CALC** — a live formula in the workbook; its inputs carry their own classification.
- **NOT DISCLOSED** — the company did not publish it. Left blank. Never estimated.
- **INFERRED** — used in notes, not as a cell value, where a scope or period qualifier could not be recovered from the filing.

## Reconciliation

Each segment tab carries a reconciliation row: the disclosed volume, price realization, currency, and inter-segment components, less the reported sales change. All 32 quarter-segment checks return zero. A non-zero value anywhere means the tab has been edited.

## Workbook tabs

| Tab | Contents |
|---|---|
| README | Classification scheme, reconciliation rule, and the three comparability issues that will break the dataset if ignored |
| Analysis | The worked question — did growth come from end-user demand or dealer restocking? Formula-linked to every other tab |
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

- **Reported-vs-retail gap** — the difference between Caterpillar's price-adjusted Construction Industries sales growth and its retail sales growth to end users. A directional and relative indicator of dealer stocking, not a precise dollar measurement of inventory.
- **Segment bridge** — Caterpillar's own disclosed decomposition of a reported sales change into volume, price realization, currency, and inter-segment components.
- **Dealer-inventory build** — the disclosed change in dealer inventory for a given period; disclosed inconsistently across quarters at either a company-wide or Construction Industries scope, never both for every quarter.

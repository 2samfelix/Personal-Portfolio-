# Methodology

Derived from the case-study PDF and the workbook. For public-facing analytical wording and conclusions, the PDF governs. For figures, formulas, classifications, source links, and reconciliation logic, the workbook governs.

## Sourcing rule

Financial figures are sourced to Caterpillar and SEC filings wherever available: quarterly earnings releases Q3 2024 – Q2 2026, Ex 99.2 Rolling 3-Month Retail Sales Statistics, and the Q1 and Q2 2026 Forms 10-Q (accessions 0000018230-26-000021 and -000046). Management commentary not reproduced in a filing is identified as earnings-call commentary and supported by transcript sources. No third-party estimates or analyst summaries are used as financial inputs.

## Classification scheme

Every figure in the workbook is classified SOURCED, DERIVED, CALC or NOT DISCLOSED, with INFERRED used in notes where a filing's scope or period qualifier could not be recovered. ASSUMPTION is part of the project's classification scheme but appears nowhere in this dataset — no figure here is assumed.

- **SOURCED** — read directly from a primary document.
- **DERIVED** — calculated from sourced figures; the calculation is shown.
- **CALC** — a live formula in the workbook; its inputs carry their own classification.
- **NOT DISCLOSED** — the company did not publish it. Left blank. Never estimated.
- **INFERRED** — used in notes, not as a cell value, where a scope or period qualifier could not be recovered from the filing.

## Reconciliation

Each segment tab carries a reconciliation row: the disclosed volume, price realization, currency, and inter-segment components, less the reported sales change. All 32 quarter-segment checks return zero. A non-zero value anywhere means the tab has been edited.

## Verification method

Where the 10-Q primary documents would not serve Item 2 on retrieval (the filed documents are approximately 4.6MB and truncate before Item 2 on every retrieval attempt), figures were instead confirmed by exact-phrase match against the EDGAR full-text search index (efts.sec.gov). This confirms the phrase is present in the filed accession; it does not confirm that the surrounding sentence — comparatives, period qualifiers, or offsetting commentary — was read. Where the scope or period qualifier could not be recovered this way, the figure is marked INFERRED in the workbook's notes.

## Known breaks in comparability

Three issues affect how the underlying series can be read, and are logged in full on the workbook's Comparability Log tab:

1. **Segment reorganization.** "Energy & Transportation" became "Power & Energy," and roughly $800M per quarter moved from that segment into Resource Industries. Prior-year comparatives in the 2026 releases do not match the same quarters as originally reported. These two series are kept as two separate vintages and are not charted as one continuous line.
2. **Construction Industries is unaffected.** CI figures agree across every release vintage, which is why the analysis is built on CI rather than Resource Industries or Power & Energy.
3. **Retail basis wording changed for 2026, but CI values did not.** The only CI period appearing in both filing vintages is Q2 2025, and it reads up 2% in each. The same cross-vintage test does detect a change in the Power & Energy total (9% to 10%), confirming the test is sensitive enough to catch a recast — CI simply did not move.

Full detail on all 16 logged issues: see `docs/sources.md` for the underlying documents, or the Comparability Log tab in the workbook itself.

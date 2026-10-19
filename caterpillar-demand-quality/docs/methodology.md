# Methodology

Derived from the case study and the workbook. For public-facing analytical wording and conclusions, the case-study source (`build/src/case-study.html`, rendered to the PDF by the committed build pipeline) governs; the project page, exhibits and presentation follow it. For figures, formulas, classifications, source links, and reconciliation logic, the workbook governs.

## Sourcing rule

Financial figures are sourced to Caterpillar and SEC filings wherever available: quarterly earnings releases Q3 2024 – Q2 2026, Ex 99.2 Rolling 3-Month Retail Sales Statistics, and the Q1 and Q2 2026 Forms 10-Q (accessions 0000018230-26-000021 and -000046). Management commentary not reproduced in a filing is identified as earnings-call commentary and supported by transcript sources. No third-party estimates or analyst summaries are used as financial inputs.

## Classification scheme

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

## How analytical claims are labeled

The case study separates four kinds of statement, and the wording is chosen to keep them apart:

- **Sourced fact** — a figure or quote read from a filing or call (for example the $1.5B and $400M CI dealer builds, or the 340 bps Q2 2026 tariff impact).
- **Deterministic derivation** — arithmetic on sourced figures, shown in the workbook (for example the ~$284M Q2 2026 tariff dollars, derived from 340 bps × CI sales).
- **Directional evidence** — a signal whose sign is meaningful but whose size is not, because the inputs are on different bases. The reported-vs-retail gap and the implied stocking swing are directional: reported CI sales and dealer retail sales differ in price basis, scope, parts and services, and possibly currency, so dealer inventory and retail growth are never added or subtracted as accounting quantities. Retail growth is disclosed in whole percentages, so the gap is displayed as ~24 and ~8 points, not to a decimal.
- **Interpretive inference** — a reading of the evidence. Two are central: that the change in management's order of mention (dealer inventories first in Q1 2026, end users first in Q2) reflects a change in the drivers' relative importance — the quotes are sourced, the "order = magnitude" premise is not; and that the Q4 2025 margin trough was mainly a tariff cost shock — the manufacturing-cost lines "largely" reflected tariffs, not entirely.

Tariff figures follow the same split: the Q4 2025 ($420M) and Q1 2026 ($362M) figures are disclosed unfavorable manufacturing costs that Caterpillar said largely reflected tariffs; the Q2 2026 figure is the 340 bps disclosed on the earnings call, converted to about $284M here. The Q4 2025 and Q1 2026 bps (~600, ~510; reported margins are rounded to 0.1%) come from a workbook method and are not comparable with the disclosed 340 bps. No split of the Q4 2025 → Q2 2026 margin recovery into tariff and non-tariff parts is published, because the disclosures do not support one on a consistent basis.

## Evidence gaps

Items marked **INSUFFICIENT EVIDENCE** are referenced in the sources but are not used as evidence until a verbatim quote is captured:

- The exact release wording of the Q4 2025 / Q1 2026 manufacturing-cost attribution ("…higher tariffs" vs "…higher tariff costs" appear in different workbook notes).
- The Construction Industries share of the $392M Q2 2026 IEEPA recoveries. The CFO said the majority sits in corporate items, so CI segment margin is unlikely to be materially affected — an inference, not a confirmed exclusion.

Management's Q2 2026 call commentary on the dealer-inventory drawdown and tariff costs is quoted and attributed rather than treated as an evidence gap. Guidance from the Q2 2026 call, not an observed outcome: Management expects a Q4 2026 Construction Industries dealer-inventory drawdown: CFO Kyle Epley said Caterpillar expects "a more typical reduction in Construction Industries dealer inventory of over $1 billion in the fourth quarter," and CEO Joseph Creed said "We'll have a drawdown in the fourth quarter on CI dealer inventory." Management also expects full-year 2026 tariff costs of around $2.2 billion, excluding approximately $400 million of expected IEEPA tariff recoveries, at the low end of its prior range; for Q3 it expects tariff costs of around $600 million with about 50% incurred in Construction Industries (Q2 2026 call).

## Verification method

Where the 10-Q primary documents would not serve Item 2 on retrieval (the filed documents are approximately 4.6MB and truncate before Item 2 on every retrieval attempt), figures were instead confirmed by exact-phrase match against the EDGAR full-text search index (efts.sec.gov). This confirms the phrase is present in the filed accession; it does not confirm that the surrounding sentence — comparatives, period qualifiers, or offsetting commentary — was read. Where the scope or period qualifier could not be recovered this way, the figure is marked INFERRED in the workbook's notes.

## Known breaks in comparability

Three issues affect how the underlying series can be read, and are logged in full on the workbook's Comparability Log tab:

1. **Segment reorganization.** "Energy & Transportation" became "Power & Energy," and roughly $800M per quarter moved from that segment into Resource Industries. Prior-year comparatives in the 2026 releases do not match the same quarters as originally reported. These two series are kept as two separate vintages and are not charted as one continuous line.
2. **Construction Industries is unaffected.** CI figures agree across every release vintage, which is why the analysis is built on CI rather than Resource Industries or Power & Energy.
3. **Retail basis wording changed for 2026, but CI values did not.** The only CI period appearing in both filing vintages is Q2 2025, and it reads up 2% in each. The same cross-vintage test does detect a change in the Power & Energy total (9% to 10%), confirming the test is sensitive enough to catch a recast — CI simply did not move.

Full detail on all 16 logged issues: see `docs/sources.md` for the underlying documents, or the Comparability Log tab in the workbook itself.

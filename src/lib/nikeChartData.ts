// Every figure below is transcribed from
// Sam_Felix_Nike_Three_Statement_Model (4).xlsx (the workbook linked as this
// project's "Financial Model" deliverable), with the source sheet and cell
// cited next to each value. Historicals are FY2024A-FY2026A as reported;
// FY2027E-FY2029E figures are the workbook's own formulas, read after
// recalculation. Bull/Bear columns were captured by setting the workbook's
// Assumptions!C3 scenario toggle to "Bull" / "Bear" and re-reading the same
// cells that the Base read used with the toggle on "Base" — the toggle is
// exactly what a reader downloading the model would flip themselves.

export type FiscalPeriod =
  | "FY2024A"
  | "FY2025A"
  | "FY2026A"
  | "FY2027E"
  | "FY2028E"
  | "FY2029E";

export const HISTORY_AND_FORECAST: FiscalPeriod[] = [
  "FY2024A",
  "FY2025A",
  "FY2026A",
  "FY2027E",
  "FY2028E",
  "FY2029E",
];

export type ForecastPeriod = "FY2026A" | "FY2027E" | "FY2028E" | "FY2029E";

export const FORECAST_ONLY: ForecastPeriod[] = [
  "FY2026A",
  "FY2027E",
  "FY2028E",
  "FY2029E",
];

// --- (a) Segment trajectory — North America vs. Greater China, $mm ---
// Historicals!B5:D5 (North America, FY24A-FY26A); Segment Revenue
// Build!C5:E5 (North America, FY27E-FY29E, Base scenario).
export const NORTH_AMERICA_REVENUE: Record<FiscalPeriod, number> = {
  FY2024A: 21400, // Historicals!B5
  FY2025A: 19570, // Historicals!C5
  FY2026A: 20510, // Historicals!D5 / Segment Revenue Build!B5
  FY2027E: 21432.95, // Segment Revenue Build!C5
  FY2028E: 22290.268, // Segment Revenue Build!D5
  FY2029E: 23070.42738, // Segment Revenue Build!E5
};

// Historicals!B7:D7 (Greater China, FY24A-FY26A); Segment Revenue
// Build!C7:E7 (Greater China, FY27E-FY29E, Base scenario).
export const GREATER_CHINA_REVENUE: Record<FiscalPeriod, number> = {
  FY2024A: 7550, // Historicals!B7
  FY2025A: 6590, // Historicals!C7
  FY2026A: 5850, // Historicals!D7 / Segment Revenue Build!B7
  FY2027E: 4797, // Segment Revenue Build!C7
  FY2028E: 4509.18, // Segment Revenue Build!D7
  FY2029E: 4599.3636, // Segment Revenue Build!E7
};

// Scenario Dashboard!B34:B42 — Breakeven Analysis (Base Case)
export const BREAKEVEN = {
  greaterChinaFY26A: 5850, // Scenario Dashboard!B34
  greaterChinaFY28E: 4509.18, // Scenario Dashboard!B35
  greaterChinaDollarDecline: 1340.82, // Scenario Dashboard!B36
  northAmericaFY26A: 20510, // Scenario Dashboard!B37
  northAmericaRequiredFY28E: 21850.82, // Scenario Dashboard!B38
  requiredAnnualizedGrowth: 0.032169542236177, // Scenario Dashboard!B39
  northAmericaActualFY28E: 22290.268, // Scenario Dashboard!B40
  actualAnnualizedGrowth: 0.0424970023937719, // Scenario Dashboard!B41
  cushion: 439.447999999997, // Scenario Dashboard!B42
};

// --- (b) Scenario fan — Total Consolidated Revenue, $mm ---
// Segment Revenue Build!B13:E13, read once per scenario with
// Assumptions!C3 set to Bull / Base / Bear. FY2029E cross-checked against
// Scenario Dashboard!B11:D11 (exact match).
export const CONSOLIDATED_REVENUE_BY_SCENARIO: Record<
  "bull" | "base" | "bear",
  Record<ForecastPeriod, number>
> = {
  bull: {
    FY2026A: 46395, // Segment Revenue Build!B13
    FY2027E: 48016.58, // Segment Revenue Build!C13 (Bull)
    FY2028E: 50089.6787, // Segment Revenue Build!D13 (Bull)
    FY2029E: 52219.4777195, // Segment Revenue Build!E13 (Bull) = Scenario Dashboard!B11
  },
  base: {
    FY2026A: 46395, // Segment Revenue Build!B13
    FY2027E: 46386.18, // Segment Revenue Build!C13 (Base)
    FY2028E: 47197.2907, // Segment Revenue Build!D13 (Base)
    FY2029E: 48431.8020795, // Segment Revenue Build!E13 (Base) = Scenario Dashboard!C11
  },
  bear: {
    FY2026A: 46395, // Segment Revenue Build!B13
    FY2027E: 44752.83, // Segment Revenue Build!C13 (Bear)
    FY2028E: 43947.9667, // Segment Revenue Build!D13 (Bear)
    FY2029E: 43679.081687, // Segment Revenue Build!E13 (Bear) = Scenario Dashboard!D11
  },
};

// --- (c) Margin bridge — gross margin, FY2026A -> FY2029E (Base case) ---
// Margin Bridge!B29:B35, transcribed verbatim (these cells hold
// pre-formatted text in the workbook, not live formulas). `pct` is every
// step expressed in percentage-point units (100 bps = 1.0) so anchor and
// delta rows can be summed directly; `bpsLabel` is the exact text the
// workbook cell displays.
export const MARGIN_BRIDGE_STEPS: {
  label: string;
  pct: number;
  bpsLabel: string;
  kind: "anchor" | "add" | "subtract";
  note: string;
}[] = [
  {
    label: "Starting Gross Margin, FY2026A",
    pct: 42.9,
    bpsLabel: "42.9%",
    kind: "anchor",
    note: "Actual, from Historicals — Margin Bridge!B29",
  },
  {
    label: "Tariff and sourcing cost pressure",
    pct: -0.4,
    bpsLabel: "(40 bps)",
    kind: "subtract",
    note: "Margin Bridge!B30",
  },
  {
    label: "Tariff mitigation and pricing actions",
    pct: 0.5,
    bpsLabel: "+50 bps",
    kind: "add",
    note: "Margin Bridge!B31",
  },
  {
    label: "Inventory normalization, lower markdowns",
    pct: 0.35,
    bpsLabel: "+35 bps",
    kind: "add",
    note: "Margin Bridge!B32",
  },
  {
    label: "Geographic and product mix",
    pct: 0.3,
    bpsLabel: "+30 bps",
    kind: "add",
    note: "Margin Bridge!B33",
  },
  {
    label: "Other pressures",
    pct: -0.05,
    bpsLabel: "(5 bps)",
    kind: "subtract",
    note: "Margin Bridge!B34",
  },
  {
    label: "Ending Gross Margin, FY2029E (Base)",
    pct: 43.6,
    bpsLabel: "43.6%",
    kind: "anchor",
    note: "Margin Bridge!B35 — net change +70 bps, reconciles exactly",
  },
];

// --- (e) Bear-case cash — Cash & Equivalents, $mm ---
// Balance Sheet!B5:E5, read once per scenario with Assumptions!C3 set to
// Bull / Base / Bear (B5, the FY2026A actual, is scenario-invariant).
export const CASH_BY_SCENARIO: Record<
  "bull" | "base" | "bear",
  Record<ForecastPeriod, number>
> = {
  bull: {
    FY2026A: 7563, // Balance Sheet!B5
    FY2027E: 9050.98969968493, // Balance Sheet!C5 (Bull)
    FY2028E: 10951.7013640986, // Balance Sheet!D5 (Bull)
    FY2029E: 13639.4102334302, // Balance Sheet!E5 (Bull)
  },
  base: {
    FY2026A: 7563, // Balance Sheet!B5
    FY2027E: 7896.36060065754, // Balance Sheet!C5 (Base)
    FY2028E: 8490.82943772753, // Balance Sheet!D5 (Base)
    FY2029E: 9265.76716765275, // Balance Sheet!E5 (Base)
  },
  bear: {
    FY2026A: 7563, // Balance Sheet!B5
    FY2027E: 6487.54412796986, // Balance Sheet!C5 (Bear)
    FY2028E: 4984.58099386043, // Balance Sheet!D5 (Bear)
    FY2029E: 2903.62294126864, // Balance Sheet!E5 (Bear)
  },
};

// --- (f) Consensus comparison — Diluted EPS, $ ---
// Scenario Dashboard!B24:D26.
export const EPS_CONSENSUS: {
  key: "model" | "zacks" | "jpmorgan";
  label: string;
  values: { FY2027E: number; FY2028E: number; FY2029E: number | null };
  note: string;
}[] = [
  {
    key: "model",
    label: "This Model (Base case)",
    values: { FY2027E: 1.75609228108108, FY2028E: 2.04266038430405, FY2029E: 2.38634019454277 },
    note: "Scenario Dashboard!B24:D24",
  },
  {
    key: "zacks",
    label: "Zacks Research Consensus",
    values: { FY2027E: 1.69, FY2028E: 2.11, FY2029E: 2.63 },
    note: "Scenario Dashboard!B25:D25 — published July 21, 2026",
  },
  {
    key: "jpmorgan",
    label: "JPMorgan (bearish case)",
    values: { FY2027E: 1.55, FY2028E: 1.72, FY2029E: null },
    note: "Scenario Dashboard!B26:D26 — no FY2029E estimate published",
  },
];

// Verbatim from Nike_Three_Statement_Model_Report.docx, Section 9
// ("Key Simplifying Assumptions & Limitations").
export const MODEL_LIMITATIONS: string[] = [
  "Debt is held flat, assuming scheduled maturities are refinanced and no material net borrowing or repayment occurs.",
  "Diluted shares are held constant — no share repurchase assumption is modeled, despite Nike's historical buyback activity.",
  "Depreciation is approximated as 12% of prior-period PP&E (an ~8-year useful life) rather than a disclosed schedule.",
  "Other current/long-term assets and liabilities, and accrued liabilities, are held flat at FY2026A levels. Cash is calculated from the projected cash flow statement, not entered as a plug — it captures the residual of the operating, investing, and financing flows explicitly modeled.",
  "No DCF or comparable-company valuation is included in this version — the model focuses on operating forecast and scenario analysis.",
];

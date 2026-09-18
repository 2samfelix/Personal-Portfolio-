// Every figure below is transcribed from Sam_Felix_MSFT_ATVI_MA_Model.xlsx
// (the workbook linked as this project's "M&A Model" deliverable), with the
// source sheet and cell cited next to each value. Like the Arm workbook,
// this one ships with all 363 formulas cached — data_only=True reads every
// value directly, zero error cells, and the balance check (Pro Forma
// Balance Sheet!B99) returns exactly 0.

// --- (a) EPS bridge — headline chart ---
// Accretion Dilution!B13:B22 (Year-1, zero-synergy base case).
export const EPS_BRIDGE = {
  msftStandaloneNetIncome: 72361, // Accretion Dilution!B13
  atviNetIncomeContribution: 1513, // Accretion Dilution!B14
  foregoneAfterTaxInterest: -2002.84838373773, // Accretion Dilution!B15 (stored as a deduction)
  afterTaxPpaAmortization: -2488.67280206246, // Accretion Dilution!B16
  proFormaNetIncome: 69382.4788141998, // Accretion Dilution!B18
  dilutedShares: 7472, // Accretion Dilution!B19
  msftStandaloneEps: 9.68, // Accretion Dilution!B21 (Microsoft's reported FY2023A EPS)
  proFormaEps: 9.285663652864, // Accretion Dilution!B20
  epsDilution: -0.0407372259438016, // Accretion Dilution!B22
};

// --- Reconciliation bridge (its own block, not a chart) ---
// Accretion Dilution!B18, B15, B26, B27, B28.
export const RECONCILIATION = {
  modelProFormaNetIncome: 69382.4788141998, // Accretion Dilution!B18
  addBackForegoneInterest: 2002.84838373773, // Accretion Dilution!B15, sign flipped (added back)
  reconciledNetIncome: 69382.4788141998 + 2002.84838373773, // = 71385.327... computed, not a stored cell
  msftReportedProFormaNetIncome: 71383, // Accretion Dilution!B26
  msftReportedProFormaEps: 9.55, // Accretion Dilution!B27
  reconciledEpsPerShare: (69382.4788141998 + 2002.84838373773) / 7472, // computed — matches $9.5537
};

// --- (b) Synergy breakeven sensitivity ---
// Synergy Breakeven!A19:F26 (EPS sensitivity grid); B10 (base-case breakeven
// synergy requirement); B14:F15 (breakeven synergy by yield, used for the
// crossing line).
export const SYNERGY_ROWS = [0, 1000, 2000, 3000, 4000, 5000, 6000]; // Synergy Breakeven!A20:A26
export const YIELD_COLS = [0.02, 0.03, 0.04, 0.05, 0.06]; // Synergy Breakeven!B19:F19
export const SYNERGY_GRID: number[][] = [
  [-0.0268918147576201, -0.0338145203507109, -0.0407372259438016, -0.0476599315368922, -0.0545826371299829],
  [-0.0156900257720366, -0.0226127313651273, -0.029535436958218, -0.0364581425513086, -0.0433808481443994],
  [-0.00448823678645294, -0.0114109423795435, -0.0183336479726343, -0.025256353565725, -0.0321790591588156],
  [0.00671355219913061, -0.000209153393959993, -0.00713185898705071, -0.0140545645801414, -0.020977270173232],
  [0.0179153411847142, 0.0109926355916234, 0.00406992999853295, -0.00285277559455788, -0.00977548118764848],
  [0.0291171301702977, 0.022194424577207, 0.0152717189841165, 0.00834901339102578, 0.00142630779793507],
  [0.0403189191558815, 0.0333962135627908, 0.0264735079697001, 0.0195508023766096, 0.0126280967835188],
];
export const BASE_CASE_SYNERGY_ROW = 0; // $0 synergies
export const BASE_CASE_YIELD_COL = 2; // 4.0% yield
// Breakeven synergy required ($mm) at each yield column — Synergy Breakeven!B15:F15
export const BREAKEVEN_SYNERGY_BY_YIELD = [2400.67142777186, 3018.67142777186, 3636.67142777186, 4254.67142777186, 4872.67142777186];

// --- (c) Five-year EPS accretion path ---
// Pro Forma Income Statement!B77:F77 ("EPS Accretion/(Dilution) vs.
// Standalone Counterfactual") — the breakeven-synergy-ramp scenario,
// compared against Microsoft's own growing standalone counterfactual
// (Pro Forma Income Statement!B75:F75), not the flat $9.68 reported figure.
// See the Limitations block for why this basis differs from (a).
export const FIVE_YEAR_EPS_PATH = [-0.0309821711882111, -0.0142223532555845, -0.0038703337459558, 0.00243944629730208, 0.0233499058156088];
export const FIVE_YEAR_LABELS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

// --- (d) Amortization step-down ---
// Pro Forma Income Statement!B47:F47 ("Total Amortization", stored
// negative in the sheet — shown here as positive expense magnitudes).
export const AMORTIZATION_BY_YEAR = [3071.625, 3071.625, 3071.625, 3071.625, 484.125];

// (e) Purchase price allocation is not charted: goodwill ($51,001M),
// identifiable intangibles ($21,969M), and cash acquired ($12,976M) —
// Purchase Price Allocation!B6, B7, B5 — do not sum to the $75,408M total
// (!B4), since the workbook doesn't separately break out the assets/
// liabilities that reconcile the difference. A bar chart against a total
// marker reads as "these are components of the whole," which they aren't.
// The one clean, sourced insight (goodwill is ~68% of the purchase price)
// is stated as a Key Finding in projects.ts instead.

// --- Limitations (verbatim in spirit from the report's tagging discipline) ---
export const LIMITATIONS: string[] = [
  "The 4.0% foregone cash yield is an illustrative assumption, not a Microsoft disclosure; the sensitivity grid is there because the result moves with it.",
  "The $3.64B synergy breakeven is model-derived. Microsoft has never guided to a synergy figure.",
  "Five-year revenue growth (10% Microsoft, 8% Activision), the synergy ramp (25/60/85/100/100%), and the Activision tax-rate transition are the author's own assumptions.",
  "Working capital and the balance sheet forecast are simplified; this is a transaction model, not a full operating forecast.",
  "The model prices no revenue synergies or ecosystem value — which is precisely why the EPS lens alone doesn't settle whether the deal made strategic sense.",
];

// --- Disclosed inconsistency (stated, not silently fixed) ---
// Accretion Dilution!B21 uses Microsoft's reported FY2023A diluted EPS
// ($9.68); Pro Forma Income Statement!B75 computes a standalone EPS
// directly from net income / shares ($72,361M / 7,472M = $9.6843) for the
// five-year build. Same Year-1 pro forma net income, two different
// denominators, two different (both correct) dilution readings.
export const BASIS_INCONSISTENCY = {
  reportedStandaloneEps: 9.68, // Accretion Dilution!B21
  computedStandaloneEps: 9.684288008565, // Pro Forma Income Statement!B75 (Year 1)
  dilutionVsReported: -0.0407372259438016, // Accretion Dilution!B22
  // Isolating just the denominator effect: same 0%-synergy pro forma EPS
  // (Accretion Dilution!B20 = $9.285663652864) divided by the computed
  // standalone EPS instead of the reported one.
  dilutionVsComputed: 9.285663652864 / 9.684288008565 - 1, // ≈ -4.12%, computed here, not a stored cell
};

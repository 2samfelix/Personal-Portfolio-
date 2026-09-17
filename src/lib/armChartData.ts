// Every figure below is transcribed from
// Sam_Felix_Arm_IPO_Valuation_Strategy_Analysis.xlsx (the workbook linked as
// this project's "Valuation Model" deliverable), with the source sheet and
// cell cited next to each value. Unlike the Nike workbook, this one ships
// with all 307 formulas cached — data_only=True reads every value directly,
// no recalculation was needed.

// --- (a) Valuation football field — headline chart ---
// IPO Valuation!B16:E19 (comp-based methods + actual IPO); DCF Valuation!B48
// (DCF implied); DCF Valuation!B49 / Post-IPO Performance!C46 (current
// market price).
//
// Data-quality note: CCA!L27/M27/N27 (the 75th-percentile EV/Revenue,
// EV/EBITDA, and P/E formulas) return #NAME? in the live workbook — a real
// formula bug, not a gap I introduced or am patching around. It propagates
// to IPO Valuation!B18:G18 ("Peer 75th Percentile"), which also reads
// #NAME? for its multiple, implied EV, and implied equity value. The
// implied SHARE PRICE for that row, $45.22, survives independently as a
// manually-preserved reference value in IPO Valuation!K8 and matches the
// already-published Arm_IPO_Valuation_Strategy_Report.pdf (Section 5 table:
// "Peer 75th percentile, 16.5x, $45.22, (11.3%)"). The 16.5x multiple shown
// below is not read from a live cell — it's back-solved from the intact
// $45.22 share price using the same EV/Revenue methodology as the other
// three rows (equity value = $45.22 x 1,026.055mm shares; less net cash of
// $2,215mm = implied EV; divided by FY2023A revenue of $2,679mm = 16.49x),
// which reproduces 16.5x exactly and matches the report. Flagging this to
// the user rather than silently fixing the workbook.
export const FOOTBALL_FIELD: {
  label: string;
  multiple: string;
  price: number;
  note: string;
}[] = [
  { label: "Full Peer Median", multiple: "12.6x", price: 35.0, note: "IPO Valuation!B16, E16" },
  { label: "Core IP/EDA Average", multiple: "15.8x", price: 43.41, note: "IPO Valuation!B17, E17" },
  {
    label: "Peer 75th Percentile",
    multiple: "16.5x",
    price: 45.22,
    note: "IPO Valuation!K8 (price only — see data-quality note; multiple back-solved, matches published report)",
  },
  { label: "Actual IPO", multiple: "18.7x", price: 51.0, note: "IPO Valuation!B19, E19 / IPO Snapshot!B7" },
  { label: "DCF Implied (2026)", multiple: "—", price: 51.54, note: "DCF Valuation!B48" },
];

export const CURRENT_MARKET_PRICE = 272.21; // DCF Valuation!B49 / Post-IPO Performance!C46

// --- (b) Return decomposition ---
// Post-IPO Performance!B60:B63 (identity check), D55 (EV/Revenue
// corroboration).
export const RETURN_DECOMPOSITION = {
  totalReturn: 5.33745098039216, // Post-IPO Performance!B60
  epsGrowth: 1.66666666666667, // Post-IPO Performance!B61
  peExpansion: 3.20247058823529, // Post-IPO Performance!B62
  checkProduct: 5.33745098039216, // Post-IPO Performance!B63 (epsGrowth x peExpansion)
  evRevenueExpansion: 3.10803131242766, // Post-IPO Performance!D55 — independent corroboration
};

// --- (c) Revenue mix since IPO ---
// Post-IPO Performance!K7:N7 (License & Other), K8:N8 (Royalty).
export const REVENUE_MIX_PERIODS = ["FY2023A", "FY2024A", "FY2025A", "FY2026A"];
export const LICENSE_REVENUE = [1004, 1431, 1839, 2307]; // Post-IPO Performance!K7:N7
export const ROYALTY_REVENUE = [1675, 1802, 2168, 2613]; // Post-IPO Performance!K8:N8
export const LICENSE_CAGR = 0.319586793863467; // Post-IPO Performance!F8
export const ROYALTY_CAGR = 0.159777999529799; // Post-IPO Performance!F9

// --- (d) Post-IPO price path ---
// Post-IPO Performance!B46 (IPO price), C19 (first-day close), C20
// (lock-up expiry close), C46 (current price).
export const PRICE_PATH: { label: string; price: number; note: string }[] = [
  { label: "IPO", price: 51.0, note: "Post-IPO Performance!B46" },
  { label: "Day 1 Close", price: 63.59, note: "Post-IPO Performance!C19 — Sep 14, 2023" },
  { label: "Lock-up Expiry", price: 129.5, note: "Post-IPO Performance!C20 — Mar 12, 2024" },
  { label: "Aug 10 '26", price: 272.21, note: "Post-IPO Performance!C46" },
];

// --- (e) DCF sensitivity grid ---
// DCF Valuation!A54:F58 (grid), B53:F53 (terminal growth columns), A54:A58
// (WACC rows). Live-computed WACC is DCF Valuation!B11 = 9.816%, row A56;
// highlighted terminal growth column is D53 = 3.5%. Their intersection,
// D56 = $51.54, matches DCF Valuation!B48 exactly.
export const DCF_WACC_ROWS = [0.078, 0.088, 0.09816, 0.108, 0.118];
export const DCF_GROWTH_COLS = [0.025, 0.03, 0.035, 0.04, 0.045];
export const DCF_GRID: number[][] = [
  [63.2788108354886, 68.6260189126459, 75.2167637519327, 83.541915127874, 94.3898396480399],
  [53.3606544230737, 56.9485112987969, 61.2133223020149, 66.36663559757, 72.7183938455799],
  [46.0731485364188, 48.6062551765863, 51.540423666052, 54.9790915519182, 59.0646119370069],
  [40.7260402185926, 42.6087678565105, 44.7494033900336, 47.2048382667218, 50.0500247111384],
  [36.4599732030647, 37.8967403858294, 39.5066120484453, 41.3228775139606, 43.3879464679026],
];
export const DCF_LIVE_WACC_ROW = 2; // index into DCF_WACC_ROWS / DCF_GRID (9.816%)
export const DCF_LIVE_GROWTH_COL = 2; // index into DCF_GROWTH_COLS (3.5%)

// --- Terminal value question ---
// DCF Valuation!B36 (perpetuity TV, undiscounted), G17 (FY2031E revenue).
export const DCF_TERMINAL_VALUE = 64063.6440428448; // DCF Valuation!B36
export const DCF_FY2031_REVENUE = 10554.615868329; // DCF Valuation!G17
export const DCF_TERMINAL_EV_REVENUE = DCF_TERMINAL_VALUE / DCF_FY2031_REVENUE; // ~6.07x
export const CURRENT_EV_REVENUE = 58.1393252331138; // Post-IPO Performance!C55

// Data-quality note (flagged, not charted or cited as a confirming
// cross-check, per instruction): DCF Valuation!B38's "exit-multiple"
// cross-check is labeled as 20x x FY2031E revenue but its formula actually
// references F17 (FY2030E revenue, $9,506.14mm), not G17 (FY2031E revenue,
// $10,554.62mm) — 20 x 9,506.14 = 190,122.87, matching the cell's cached
// value exactly. That produces a terminal value roughly 3x the perpetuity
// figure purely because it's pointed at the wrong column, not because it's
// a genuine independent confirmation. Left out of the page entirely.

// Verbatim from DCF Valuation!A63:A66 ("Limitations — Read Before Using
// This Section").
export const DCF_LIMITATIONS: string[] = [
  "Beta is an assumed peer-based estimate (1.20), not Arm's own regression beta. Arm's public float is only ~9-14% of shares outstanding (SoftBank owns the rest), so Arm's observed stock volatility reflects a thin, potentially distorted trading base rather than the full company's true systematic risk. A directly-measured Arm beta would likely be unreliable for this reason.",
  "The 5-year explicit revenue growth path (license decelerating 25%→10%, royalty 20%→12%) is this model's own assumption, not a disclosed Arm forecast — treat it as one reasonable growth path, not a consensus figure.",
  "Operating margin, D&A, capex, and NWC are simplified as percentages of revenue rather than fully built schedules; adequate for a directional cross-check, not a substitute for the detailed forecast an equity research desk would build.",
  "Terminal value construction is the single largest driver of the implied price at this multiple range — the sensitivity table above should be read as a range of plausible outcomes, not a point estimate. Small changes in WACC or terminal growth move the implied price substantially, exactly as they would in any real DCF for a high-growth company.",
];

// Verbatim (lightly trimmed) from CCA!A29 / Report Section 4 — the
// comparable-set caveat.
export const COMPARABLE_SET_NOTE =
  "There is no perfect public comparable for Arm. Synopsys and Cadence are the closest business-model analogues because of their high-margin, asset-light semiconductor IP and design economics. NVIDIA is a useful premium-growth benchmark, while AMD, Qualcomm, and Broadcom provide broader semiconductor reference points. The peer median should be read as a lower anchor rather than a mechanical fair value.";

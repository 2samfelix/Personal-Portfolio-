// Pure Real Estate financial-planning engine. This is NOT the SaaS or
// Consulting engine with relabeled fields — a property's economics run on
// occupancy, rent, operating expenses, and debt service against a
// capitalized asset value, with no concept of customers, billable hours, or
// a sales pipeline. Every function here takes an assumptions object and
// returns a results object; no React, no formatting, no UI concerns.

import {
  classifyCashRatio,
  classifyMargin,
  classifyRunway,
  classifyTrend,
  type CashStatus,
  type Decision,
  type DriverConfig,
  type MarginStatus,
  type RunwayStatus,
  type TrendStatus,
} from "./shared";

export type RealEstateCompanyBaseline = {
  name: string;
  startingCash: number;
};

// Deliberately modest, same reasoning as the other two industries: Base is
// FCF-positive and never touches this cushion, but a small cushion is what
// makes Downside's Critical-runway/Depleted-cash branches reachable at all.
export const STARTING_CASH = 400_000;

export const harborViewBaseline: RealEstateCompanyBaseline = {
  name: "Harborview Multifamily Portfolio",
  startingCash: STARTING_CASH,
};

export type RealEstateAssumptions = {
  totalUnits: number; // portfolio size — a starting fact, not a forward assumption
  averageMonthlyRent: number; // $ per occupied unit per month
  occupancyPct: number; // e.g. 0.92 = 92% of units occupied
  operatingExpensePct: number; // % of effective gross income (occupancy-adjusted rental revenue)
  annualDebtService: number; // $/year principal + interest on the portfolio's debt
  capRatePct: number; // used only to value the asset, not to compute cash flow
};

export type RealEstateDriverKey = keyof RealEstateAssumptions;

// The 6 Real Estate drivers — sliders are rendered by mapping over this
// array; there is no separate hardcoded slider list.
export const REAL_ESTATE_DRIVERS: DriverConfig<RealEstateDriverKey>[] = [
  { key: "totalUnits", label: "Number of Units", unit: "count", min: 20, max: 1000, step: 10 },
  { key: "averageMonthlyRent", label: "Avg Monthly Rent per Unit", unit: "currency", min: 500, max: 5_000, step: 25 },
  { key: "occupancyPct", label: "Occupancy %", unit: "percent", min: 0.4, max: 1.0, step: 0.01 },
  { key: "operatingExpensePct", label: "Operating Expense Ratio %", unit: "percent", min: 0.2, max: 0.7, step: 0.01 },
  { key: "annualDebtService", label: "Annual Debt Service", unit: "currency", min: 0, max: 10_000_000, step: 50_000 },
  { key: "capRatePct", label: "Cap Rate %", unit: "percent", min: 0.03, max: 0.12, step: 0.001 },
];

const DRIVER_BOUNDS = new Map(REAL_ESTATE_DRIVERS.map((d) => [d.key, d]));

function clampToDriverBounds(key: RealEstateDriverKey, value: number): number {
  const driver = DRIVER_BOUNDS.get(key)!;
  return Math.min(driver.max, Math.max(driver.min, value));
}

export type RealEstateScenarioKey = "base" | "upside" | "downside";

// Base is whatever the sliders currently say — these are only the
// starting/default values shown on first load.
export const REAL_ESTATE_BASE_DEFAULTS: RealEstateAssumptions = {
  totalUnits: 220,
  averageMonthlyRent: 1_850,
  occupancyPct: 0.92,
  operatingExpensePct: 0.42,
  annualDebtService: 1_950_000,
  capRatePct: 0.055,
};

// Signed, directionally-aware deltas: rent/occupancy are "higher is
// better" (up in Upside, down in Downside); operating expense ratio and
// cap rate are "higher is worse" (down in Upside, up in Downside — a
// higher cap rate reflects a less favorable market and lowers the implied
// valuation for the same NOI). totalUnits and annualDebtService are held
// flat (delta 0 both directions): portfolio size and existing debt service
// are contractual/structural facts, not forward-looking assumptions a
// scenario should stress.
export const REAL_ESTATE_SCENARIO_DELTAS: Record<
  Exclude<RealEstateScenarioKey, "base">,
  Partial<Record<RealEstateDriverKey, number>>
> = {
  upside: {
    averageMonthlyRent: 150,
    occupancyPct: 0.03,
    operatingExpensePct: -0.03,
    capRatePct: -0.005,
  },
  downside: {
    averageMonthlyRent: -200,
    occupancyPct: -0.17,
    operatingExpensePct: 0.13,
    capRatePct: 0.01,
  },
};

/**
 * Base + this scenario's signed delta table, each driver clamped to its own
 * slider bounds. A zero-delta table returns Base unchanged for every
 * scenario.
 */
export function applyRealEstateScenario(
  base: RealEstateAssumptions,
  scenario: RealEstateScenarioKey
): RealEstateAssumptions {
  if (scenario === "base") return base;
  const delta = REAL_ESTATE_SCENARIO_DELTAS[scenario];
  const out: RealEstateAssumptions = { ...base };
  (Object.keys(delta) as RealEstateDriverKey[]).forEach((key) => {
    out[key] = clampToDriverBounds(key, base[key] + (delta[key] ?? 0));
  });
  return out;
}

export type RealEstateMonthResult = {
  month: number;
  occupiedUnits: number;
  rentalRevenue: number;
  operatingExpenses: number;
  noi: number; // Net Operating Income = rental revenue - operating expenses
  noiMargin: number;
  debtService: number; // this month's share of annual debt service
  freeCashFlow: number; // NOI - debt service
  cash: number;
};

export type RealEstateForecastResult = {
  months: RealEstateMonthResult[];
  endingRentalRevenueAnnualized: number;
  endingNOIAnnualized: number;
  endingNOIMargin: number;
  endingFreeCashFlowAnnualized: number;
  // Free cash flow (after debt service) as a % of rental revenue — the
  // portfolio's analog to an EBITDA margin.
  endingFreeCashFlowMargin: number;
  endingCash: number;
  runwayMonths: number | null;
  impliedValuation: number; // annualized NOI / cap rate
};

/**
 * A property's cash flow isn't a growth curve off a starting customer base
 * or a pipeline of billable work — it's occupancy x rent producing rental
 * revenue (effective gross income), minus operating expenses (NOI), minus
 * debt service (free cash flow). Cap rate never enters the cash-flow math;
 * it only capitalizes NOI into an implied asset valuation, a separate
 * output. With occupancy and rent held flat across the window, monthly
 * cash flow is flat — only cash itself moves, accumulating (or draining)
 * monthly free cash flow.
 */
export function runRealEstateForecast(
  assumptions: RealEstateAssumptions,
  baseline: RealEstateCompanyBaseline = harborViewBaseline
): RealEstateForecastResult {
  const occupiedUnits = assumptions.totalUnits * assumptions.occupancyPct;
  const rentalRevenue = occupiedUnits * assumptions.averageMonthlyRent;
  const operatingExpenses = rentalRevenue * assumptions.operatingExpensePct;
  const noi = rentalRevenue - operatingExpenses;
  const noiMargin = rentalRevenue === 0 ? 0 : noi / rentalRevenue;
  const monthlyDebtService = assumptions.annualDebtService / 12;
  const freeCashFlow = noi - monthlyDebtService;

  const months: RealEstateMonthResult[] = [];
  let cash = baseline.startingCash;
  for (let month = 1; month <= 12; month++) {
    cash += freeCashFlow;
    months.push({
      month,
      occupiedUnits,
      rentalRevenue,
      operatingExpenses,
      noi,
      noiMargin,
      debtService: monthlyDebtService,
      freeCashFlow,
      cash,
    });
  }

  const last = months[months.length - 1];
  const runwayMonths = freeCashFlow >= 0 ? null : Math.max(0, baseline.startingCash / -freeCashFlow);
  const annualizedNOI = noi * 12;

  return {
    months,
    endingRentalRevenueAnnualized: rentalRevenue * 12,
    endingNOIAnnualized: annualizedNOI,
    endingNOIMargin: noiMargin,
    endingFreeCashFlowAnnualized: freeCashFlow * 12,
    endingFreeCashFlowMargin: rentalRevenue === 0 ? 0 : freeCashFlow / rentalRevenue,
    endingCash: last.cash,
    runwayMonths,
    impliedValuation: assumptions.capRatePct === 0 ? 0 : annualizedNOI / assumptions.capRatePct,
  };
}

export type RealEstateTrend = TrendStatus;

// NOI is flat month-to-month under fixed drivers (see runRealEstateForecast)
// — kept for interface symmetry with the other industries and a future
// month-over-month driver (e.g. seasonal occupancy or rent escalations).
export function classifyRealEstateTrend(result: RealEstateForecastResult): RealEstateTrend {
  const first = result.months[0].noi;
  const last = result.months[result.months.length - 1].noi;
  return classifyTrend(first, last);
}

export type OccupancyStatus = "Healthy" | "Watch" | "Weak";

// Thresholds: >=90% = Healthy, 80-90% = Watch, <80% = Weak — standard
// multifamily-industry occupancy bands.
export function classifyOccupancy(occupancyPct: number): OccupancyStatus {
  if (occupancyPct >= 0.9) return "Healthy";
  if (occupancyPct >= 0.8) return "Watch";
  return "Weak";
}

export type DebtCoverageStatus = "Strong" | "Healthy" | "Watch" | "Weak";

// Debt Service Coverage Ratio = annualized NOI / annual debt service.
// Thresholds (standard commercial-lending bands): >=1.50x = Strong,
// 1.25-1.50x = Healthy, 1.10-1.25x = Watch, <1.10x = Weak — thin coverage
// carrying real refinancing/covenant risk even when cash flow is
// technically positive (a DSCR of ~1.0x means NOI barely clears debt
// service with almost no cushion for a vacancy tick-up or rate reset).
export function debtServiceCoverageRatio(
  result: RealEstateForecastResult,
  assumptions: RealEstateAssumptions
): number {
  return assumptions.annualDebtService === 0
    ? 0
    : result.endingNOIAnnualized / assumptions.annualDebtService;
}

export function classifyDebtCoverage(dscr: number): DebtCoverageStatus {
  if (dscr >= 1.5) return "Strong";
  if (dscr >= 1.25) return "Healthy";
  if (dscr >= 1.1) return "Watch";
  return "Weak";
}

export { classifyMargin, classifyRunway };
export type { CashStatus, Decision, MarginStatus, RunwayStatus };

/**
 * Real Estate's own decision framework — deliberately NOT a reuse of the
 * shared runway+margin-only decideStance(), because a property's real
 * constraint is debt-service risk: a portfolio can show "technically
 * positive" free cash flow and a self-funded runway while NOI barely
 * clears its debt service, which is a real lender-covenant / refinancing
 * risk that has nothing to do with cash burn. DSCR gates the top tier the
 * way utilization gates Consulting's — a thin DSCR can never be waved
 * through to "invest for growth" purely because cash flow is positive.
 */
export function decideRealEstateStance(
  result: RealEstateForecastResult,
  assumptions: RealEstateAssumptions
): Decision {
  const dscr = debtServiceCoverageRatio(result, assumptions);
  const dscrStatus = classifyDebtCoverage(dscr);
  const runway = result.runwayMonths;
  const runwayOk = runway === null || runway > 18;
  const margin = result.endingFreeCashFlowMargin;
  const occupancyStatus = classifyOccupancy(assumptions.occupancyPct);

  // Weak DSCR (<1.10x) is a real risk regardless of runway/margin — NOI
  // barely (or doesn't) cover debt service, leaving almost no cushion for
  // a vacancy uptick or rate reset.
  if (dscrStatus === "Weak") return "Preserve cash";
  // Watch-band DSCR (1.10-1.25x) rules out the aggressive top tier, but
  // still allows "Run cautiously" if the rest of the picture is fine.
  if (dscrStatus === "Watch") {
    return runwayOk ? "Run cautiously" : "Preserve cash";
  }

  // DSCR is Healthy or Strong (>=1.25x) — fall back to the standard
  // runway/margin framework, with occupancy as an additional gate on the
  // top tier: a comfortably-financed but poorly-occupied property
  // shouldn't be called "invest for growth" on debt structure alone.
  if (runwayOk && margin > 0 && occupancyStatus !== "Weak") return "Invest for growth";
  if (runway === null || runway >= 12) return "Run cautiously";
  return "Preserve cash";
}

/**
 * Generates 2-3 short, deterministic reasons behind a decision — built from
 * the same runway/margin/DSCR signals decideRealEstateStance uses, so the
 * reasons and the recommendation can never disagree.
 */
export function explainRealEstateDecision(
  result: RealEstateForecastResult,
  assumptions: RealEstateAssumptions,
  decision: Decision
): string[] {
  const runway = result.runwayMonths;
  const marginStatus = classifyMargin(result.endingFreeCashFlowMargin);
  const dscr = debtServiceCoverageRatio(result, assumptions);
  const reasons: string[] = [];

  if (runway === null) {
    reasons.push(
      "The portfolio is cash-flow positive after debt service — no runway ceiling applies"
    );
  } else if (runway > 18) {
    reasons.push(`Runway remains above 18 months (${runway.toFixed(1)} months)`);
  } else if (runway >= 12) {
    reasons.push(`Runway is in the 12–18 month caution band (${runway.toFixed(1)} months)`);
  } else {
    reasons.push(`Runway has fallen below 12 months (${runway.toFixed(1)} months)`);
  }

  const marginPct = (result.endingFreeCashFlowMargin * 100).toFixed(1);
  const marginReasonText: Record<MarginStatus, string> = {
    Strong: `Free cash flow margin is strong (${marginPct}%)`,
    Profitable: `Free cash flow margin is solidly positive (${marginPct}%)`,
    NearBreakeven: `Free cash flow margin is only modestly positive, near breakeven (${marginPct}%)`,
    ApproachingBreakeven: `Free cash flow margin is still negative, approaching breakeven (${marginPct}%)`,
    MateriallyUnprofitable: `Free cash flow margin is materially negative (${marginPct}%)`,
  };
  reasons.push(marginReasonText[marginStatus]);

  const dscrStatus = classifyDebtCoverage(dscr);
  if (dscrStatus === "Strong") {
    reasons.push(`Debt service coverage is strong (${dscr.toFixed(2)}x)`);
  } else if (dscrStatus === "Healthy") {
    reasons.push(`Debt service coverage is healthy (${dscr.toFixed(2)}x)`);
  } else if (dscrStatus === "Watch") {
    const suffix =
      decision === "Invest for growth"
        ? ", short of the healthy band this recommendation would ideally want"
        : "";
    reasons.push(`Debt service coverage is thin (${dscr.toFixed(2)}x)${suffix}`);
  } else {
    const suffix =
      decision !== "Invest for growth" ? "" : ", a risk despite the runway and margin picture";
    reasons.push(`NOI doesn't fully cover debt service (${dscr.toFixed(2)}x)${suffix}`);
  }

  return reasons;
}

export function classifyRealEstateCash(
  endingCash: number,
  baseline: RealEstateCompanyBaseline = harborViewBaseline
): CashStatus {
  return classifyCashRatio(endingCash, baseline.startingCash);
}

/**
 * Key Risk / Next Action for the CFO Commentary panel. Two tiers, same
 * structure as the SaaS and Consulting engines' equivalents: Tier 1 covers
 * metrics materially outside a healthy range, Tier 2 covers a metric
 * merely in a cautionary Watch/ApproachingBreakeven band. The "no material
 * risk" fallback is only reachable when neither tier finds anything.
 * Uses decideRealEstateStance (not the shared runway+margin-only
 * decideStance) so Next Action always agrees with the Recommendation
 * banner, including its DSCR gate.
 */
export function buildRealEstateRiskAndAction(
  result: RealEstateForecastResult,
  assumptions: RealEstateAssumptions
): { keyRiskPhrase: string; nextActionPhrase: string } {
  const runwayStatus = classifyRunway(result.runwayMonths);
  const marginStatus = classifyMargin(result.endingFreeCashFlowMargin);
  const cashStatus = classifyRealEstateCash(result.endingCash);
  const dscr = debtServiceCoverageRatio(result, assumptions);
  const dscrStatus = classifyDebtCoverage(dscr);
  const trendStatus = classifyRealEstateTrend(result);
  const marginPct = (result.endingFreeCashFlowMargin * 100).toFixed(1);

  let keyRiskPhrase: string;
  if (cashStatus === "Depleted") {
    keyRiskPhrase =
      "Cash has gone negative at these assumptions — the portfolio has run out of money within the window.";
  } else if (runwayStatus === "Critical") {
    keyRiskPhrase =
      "Runway has fallen below 12 months — cash exhaustion is the dominant risk if free cash flow doesn't improve.";
  } else if (cashStatus === "Low") {
    keyRiskPhrase =
      "Ending cash is tight relative to the starting balance, leaving little cushion for a downside surprise.";
  } else if (marginStatus === "MateriallyUnprofitable") {
    keyRiskPhrase = `Free cash flow margin is materially negative (${marginPct}%) — operating expenses and debt service aren't supported by rental revenue at this occupancy and rent.`;
  } else if (dscrStatus === "Weak") {
    keyRiskPhrase = `NOI doesn't fully cover debt service (${dscr.toFixed(2)}x) — a lender covenant or refinancing risk even with adequate cash on hand.`;
  } else if (trendStatus === "Contracting") {
    keyRiskPhrase = "NOI is contracting over the window.";
  } else if (marginStatus === "ApproachingBreakeven") {
    keyRiskPhrase = `Free cash flow margin is still negative (${marginPct}%), approaching breakeven — not yet a material risk, but worth watching.`;
  } else if (dscrStatus === "Watch") {
    keyRiskPhrase = `Debt service coverage is thin (${dscr.toFixed(2)}x) — worth watching, though not yet a covenant-level concern.`;
  } else if (runwayStatus === "Watch") {
    keyRiskPhrase = `Runway is in the 12-18 month caution band (${(result.runwayMonths ?? 0).toFixed(1)} months) — worth watching, though not yet critical.`;
  } else {
    keyRiskPhrase =
      "No metric is outside a healthy band at these assumptions — the main risk is an unmodeled external shock (rate reset, major vacancy).";
  }

  const decision = decideRealEstateStance(result, assumptions);
  const nextActionPhrase: Record<Decision, string> = {
    "Invest for growth":
      "Continue pursuing occupancy and rent growth while keeping an eye on the risk above so it doesn't become the binding constraint.",
    "Run cautiously":
      "Hold the portfolio steady and revisit in a quarter — there's room to operate, but not enough margin of safety to add debt or acquire.",
    "Preserve cash":
      "Prioritize occupancy and expense control now, and avoid additional debt service until coverage and free cash flow recover.",
  };

  return { keyRiskPhrase, nextActionPhrase: nextActionPhrase[decision] };
}

export type RealEstateSensitivityMetric = "noi" | "freeCashFlow" | "cash" | "valuation";

function realEstateMetricValue(
  result: RealEstateForecastResult,
  metric: RealEstateSensitivityMetric
): number {
  switch (metric) {
    case "noi":
      return result.endingNOIAnnualized;
    case "freeCashFlow":
      return result.endingFreeCashFlowAnnualized;
    case "cash":
      return result.endingCash;
    case "valuation":
      return result.impliedValuation;
  }
}

export type RealEstateSensitivityRow = {
  key: RealEstateDriverKey;
  label: string;
  impact: number;
};

const SENSITIVITY_KEYS: RealEstateDriverKey[] = REAL_ESTATE_DRIVERS.map((d) => d.key);

/**
 * Same "+10% on each driver, one at a time" sensitivity approach as the
 * other two industries, generalized to whichever metric is requested.
 */
export function runRealEstateSensitivityByMetric(
  assumptions: RealEstateAssumptions,
  baseline: RealEstateCompanyBaseline,
  metric: RealEstateSensitivityMetric
): RealEstateSensitivityRow[] {
  const baseResult = runRealEstateForecast(assumptions, baseline);
  const baseValue = realEstateMetricValue(baseResult, metric);

  const rows = SENSITIVITY_KEYS.map((key) => {
    const bumped: RealEstateAssumptions = { ...assumptions, [key]: assumptions[key] * 1.1 };
    const bumpedResult = runRealEstateForecast(bumped, baseline);
    const impact = realEstateMetricValue(bumpedResult, metric) - baseValue;
    return { key, label: REAL_ESTATE_DRIVERS.find((d) => d.key === key)!.label, impact };
  });

  return rows.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

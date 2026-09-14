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
  decideStance,
  type CashStatus,
  type Decision,
  type MarginStatus,
  type RunwayStatus,
  type TrendStatus,
} from "./shared";

export type RealEstateCompanyBaseline = {
  name: string;
  totalUnits: number;
  startingCash: number;
};

// Fictional property portfolio used to seed the demo.
export const harborViewBaseline: RealEstateCompanyBaseline = {
  name: "Harborview Multifamily Portfolio",
  totalUnits: 220,
  startingCash: 900_000,
};

export type RealEstateAssumptions = {
  occupancyPct: number; // e.g. 0.93 = 93% of units occupied
  averageMonthlyRent: number; // $ per occupied unit per month
  operatingExpensePct: number; // % of rental revenue spent on operating expenses
  annualDebtService: number; // $/year principal + interest on the portfolio's debt
  capRatePct: number; // used only to value the asset, not to compute cash flow
};

export type RealEstateScenarioKey = "base" | "upside" | "downside";

export const realEstateScenarioPresets: Record<
  RealEstateScenarioKey,
  { label: string; assumptions: RealEstateAssumptions }
> = {
  base: {
    label: "Base",
    assumptions: {
      occupancyPct: 0.92,
      averageMonthlyRent: 1_850,
      operatingExpensePct: 0.42,
      annualDebtService: 2_400_000,
      capRatePct: 0.055,
    },
  },
  upside: {
    label: "Upside",
    assumptions: {
      occupancyPct: 0.97,
      averageMonthlyRent: 2_000,
      operatingExpensePct: 0.37,
      annualDebtService: 2_400_000,
      capRatePct: 0.05,
    },
  },
  downside: {
    label: "Downside",
    assumptions: {
      occupancyPct: 0.82,
      averageMonthlyRent: 1_700,
      operatingExpensePct: 0.49,
      annualDebtService: 2_400_000,
      capRatePct: 0.065,
    },
  },
};

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
  // portfolio's analog to an EBITDA margin, and what feeds decideStance()
  // below alongside runway.
  endingFreeCashFlowMargin: number;
  endingCash: number;
  runwayMonths: number | null;
  impliedValuation: number; // annualized NOI / cap rate
};

/**
 * A property's cash flow isn't a growth curve off a starting customer base
 * or a pipeline of billable work — it's occupancy x rent producing rental
 * revenue, minus operating expenses (NOI), minus debt service (free cash
 * flow). Cap rate never enters the cash-flow math; it only capitalizes NOI
 * into an implied asset valuation, a separate output. With occupancy and
 * rent held flat across the window, monthly cash flow is flat — only cash
 * itself moves, accumulating (or draining) monthly free cash flow.
 */
export function runRealEstateForecast(
  assumptions: RealEstateAssumptions,
  baseline: RealEstateCompanyBaseline = harborViewBaseline
): RealEstateForecastResult {
  const occupiedUnits = baseline.totalUnits * assumptions.occupancyPct;
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
  const runwayMonths = freeCashFlow >= 0 ? null : baseline.startingCash / -freeCashFlow;
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

export type DebtCoverageStatus = "Healthy" | "Watch" | "Weak";

// Debt Service Coverage Ratio = annualized NOI / annual debt service.
// Thresholds: >=1.25x = Healthy, 1.0-1.25x = Watch, <1.0x = Weak (NOI
// doesn't fully cover debt service) — standard commercial-lending bands.
export function debtServiceCoverageRatio(
  result: RealEstateForecastResult,
  assumptions: RealEstateAssumptions
): number {
  return assumptions.annualDebtService === 0
    ? 0
    : result.endingNOIAnnualized / assumptions.annualDebtService;
}

export function classifyDebtCoverage(dscr: number): DebtCoverageStatus {
  if (dscr >= 1.25) return "Healthy";
  if (dscr >= 1.0) return "Watch";
  return "Weak";
}

export { classifyMargin, classifyRunway, decideStance };
export type { CashStatus, Decision, MarginStatus, RunwayStatus };

/**
 * Generates 2-3 short, deterministic reasons behind a decision — built from
 * the same runway/margin thresholds decideStance uses, plus the debt
 * service coverage ratio, which is this industry's own operating-health
 * signal (the SaaS engine uses ARR trend, Consulting uses utilization, for
 * the equivalent role).
 */
export function explainRealEstateDecision(
  result: RealEstateForecastResult,
  assumptions: RealEstateAssumptions,
  decision: Decision
): string[] {
  const runway = result.runwayMonths;
  const margin = result.endingFreeCashFlowMargin;
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

  if (margin > 0) {
    reasons.push(`Free cash flow margin is positive (${(margin * 100).toFixed(1)}%)`);
  } else {
    reasons.push(`Free cash flow margin is still negative (${(margin * 100).toFixed(1)}%)`);
  }

  const dscrStatus = classifyDebtCoverage(dscr);
  if (dscrStatus === "Healthy") {
    reasons.push(`Debt service coverage is healthy (${dscr.toFixed(2)}x)`);
  } else if (dscrStatus === "Watch") {
    reasons.push(`Debt service coverage is thin (${dscr.toFixed(2)}x)`);
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

export type RealEstateDriverKey = keyof RealEstateAssumptions;

export const realEstateDriverLabels: Record<RealEstateDriverKey, string> = {
  occupancyPct: "Occupancy",
  averageMonthlyRent: "Average Rent",
  operatingExpensePct: "Operating Expense %",
  annualDebtService: "Annual Debt Service",
  capRatePct: "Cap Rate",
};

export const REAL_ESTATE_DRIVER_KEYS: RealEstateDriverKey[] = [
  "occupancyPct",
  "averageMonthlyRent",
  "operatingExpensePct",
  "annualDebtService",
  "capRatePct",
];

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

/**
 * Same "+10% on each driver, one at a time" sensitivity approach as the
 * other two industries, generalized to whichever metric is requested — a
 * higher debt service or cap rate is a headwind, so those two drivers are
 * bumped in the direction that actually stresses the portfolio (debt
 * service up increases cost; cap rate up lowers the implied valuation for
 * the same NOI) rather than uniformly "+10%" on every driver regardless of
 * which direction is adverse.
 */
export function runRealEstateSensitivityByMetric(
  assumptions: RealEstateAssumptions,
  baseline: RealEstateCompanyBaseline,
  metric: RealEstateSensitivityMetric
): RealEstateSensitivityRow[] {
  const baseResult = runRealEstateForecast(assumptions, baseline);
  const baseValue = realEstateMetricValue(baseResult, metric);

  const rows = REAL_ESTATE_DRIVER_KEYS.map((key) => {
    const bumped: RealEstateAssumptions = { ...assumptions, [key]: assumptions[key] * 1.1 };
    const bumpedResult = runRealEstateForecast(bumped, baseline);
    const impact = realEstateMetricValue(bumpedResult, metric) - baseValue;
    return { key, label: realEstateDriverLabels[key], impact };
  });

  return rows.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

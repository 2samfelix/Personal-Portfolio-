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
  formatPct,
  formatUsdCompact,
  MARGIN_STATUS_LABEL,
  type BadgeTone,
  type CashStatus,
  type ChartConfig,
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
  averageMonthlyRent: number; // $ per occupied unit per month, today's in-place average
  occupancyPct: number; // e.g. 0.92 = 92% — the STABILIZED target the portfolio leases up toward, not today's occupancy
  operatingExpensePct: number; // % of month-1 effective gross income (occupancy-adjusted rental revenue), before monthly inflation compounds on it
  annualDebtService: number; // $/year principal + interest on the portfolio's debt — contractual, held flat
  capRatePct: number; // used only to value the asset, not to compute cash flow
};

export type RealEstateDriverKey = keyof RealEstateAssumptions;

// The 6 Real Estate drivers — sliders are rendered by mapping over this
// array; there is no separate hardcoded slider list.
export const REAL_ESTATE_DRIVERS: DriverConfig<RealEstateDriverKey>[] = [
  { key: "totalUnits", label: "Number of Units", unit: "count", min: 20, max: 1000, step: 10 },
  { key: "averageMonthlyRent", label: "Avg Monthly Rent per Unit", unit: "currency", min: 500, max: 5_000, step: 25 },
  { key: "occupancyPct", label: "Occupancy % (Stabilized Target)", unit: "percent", min: 0.4, max: 1.0, step: 0.01 },
  { key: "operatingExpensePct", label: "Operating Expense Ratio %", unit: "percent", min: 0.2, max: 0.7, step: 0.01 },
  { key: "annualDebtService", label: "Annual Debt Service", unit: "currency", min: 0, max: 10_000_000, step: 50_000 },
  { key: "capRatePct", label: "Cap Rate %", unit: "percent", min: 0.03, max: 0.12, step: 0.001 },
];

const DRIVER_BOUNDS = new Map(REAL_ESTATE_DRIVERS.map((d) => [d.key, d]));

function clampToDriverBounds(key: RealEstateDriverKey, value: number): number {
  const driver = DRIVER_BOUNDS.get(key)!;
  return Math.min(driver.max, Math.max(driver.min, value));
}

function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

// --- Time dynamics (Prompt 3) ---
// Three mechanisms give the portfolio genuine month-over-month behavior
// instead of the same figure repeated 12 times. All three are documented
// model constants, not sliders — the industry stays at exactly 6 drivers.
//
// 1. Occupancy lease-up: the Occupancy % driver is the STABILIZED target,
//    not today's occupancy. The portfolio starts at CURRENT_OCCUPANCY and
//    closes the gap to that target asymptotically — a fixed fraction of
//    the REMAINING gap every month, never arriving in a straight line.
//    When the target sits below today's occupancy (a stressed Downside
//    scenario), this same formula produces occupancy DECLINING toward the
//    lower target instead of rising — the "reverse" case falls out of the
//    formula for free, it isn't a separate branch.
// 2. Lease rollover with rent escalation: roughly 1/12 of the book renews
//    each month at the current escalated market rent, so the portfolio's
//    average in-place rent drifts toward (not jumps to) the escalated
//    level as more of the book turns over across the window.
// 3. Operating expense inflation: opex is fixed in dollars at month 1
//    (rental revenue x the Operating Expense Ratio % driver), then grows
//    on its own monthly inflation path afterward, independent of whatever
//    revenue does — this is what lets NOI margin compress even when
//    revenue is flat or growing slowly.
//
// Annual debt service is NOT part of any ramp — it's contractual and stays
// fixed, exactly as before.
export const CURRENT_OCCUPANCY = 0.88; // occupancy today, before lease-up toward the stabilized target
export const BASE_LEASE_UP_SPEED = 0.25; // fraction of the remaining gap to target closed each month
export const BASE_ANNUAL_RENT_ESCALATION = 0.03; // renewing leases reset to this much more than today's rent, annualized
export const BASE_OPEX_MONTHLY_INFLATION = 0.002; // monthly opex growth, independent of revenue

const MIN_LEASE_UP_SPEED = 0.02;
const MAX_LEASE_UP_SPEED = 0.6;
const MIN_ANNUAL_RENT_ESCALATION = -0.06;
const MAX_ANNUAL_RENT_ESCALATION = 0.08;
const MIN_OPEX_MONTHLY_INFLATION = -0.002;
const MAX_OPEX_MONTHLY_INFLATION = 0.01;

export type RealEstateRampConstants = {
  leaseUpSpeed: number;
  annualRentEscalation: number;
  opexMonthlyInflation: number;
};

// Signed, directionally-aware, same architecture as the driver deltas
// above: Upside leases up faster and escalates rent faster with better
// expense control; Downside stalls the lease-up (and, whenever the
// Occupancy % target itself sits below CURRENT_OCCUPANCY, that stall
// becomes a slide toward the lower target rather than a rise), escalates
// rent less — even slightly negative, i.e. concessions — and lets opex
// inflate faster. Never a single ramp shape shared by all three scenarios.
export const REAL_ESTATE_RAMP_DELTAS: Record<Exclude<RealEstateScenarioKey, "base">, RealEstateRampConstants> = {
  upside: { leaseUpSpeed: 0.15, annualRentEscalation: 0.015, opexMonthlyInflation: -0.0005 },
  downside: { leaseUpSpeed: -0.15, annualRentEscalation: -0.04, opexMonthlyInflation: 0.0015 },
};

/**
 * Base ramp constants + this scenario's signed delta, each clamped to its
 * own range — the same "Base + delta, clamped" architecture as
 * applyRealEstateScenario, just for the 3 new non-slider time-dynamics
 * constants instead of the 6 drivers. A zero-delta table (both this one and
 * REAL_ESTATE_SCENARIO_DELTAS) collapses all three scenarios back to
 * identical output.
 */
export function realEstateRampConstantsForScenario(scenario: RealEstateScenarioKey): RealEstateRampConstants {
  const base: RealEstateRampConstants = {
    leaseUpSpeed: BASE_LEASE_UP_SPEED,
    annualRentEscalation: BASE_ANNUAL_RENT_ESCALATION,
    opexMonthlyInflation: BASE_OPEX_MONTHLY_INFLATION,
  };
  if (scenario === "base") return base;
  const delta = REAL_ESTATE_RAMP_DELTAS[scenario];
  return {
    leaseUpSpeed: clampRange(base.leaseUpSpeed + delta.leaseUpSpeed, MIN_LEASE_UP_SPEED, MAX_LEASE_UP_SPEED),
    annualRentEscalation: clampRange(
      base.annualRentEscalation + delta.annualRentEscalation,
      MIN_ANNUAL_RENT_ESCALATION,
      MAX_ANNUAL_RENT_ESCALATION
    ),
    opexMonthlyInflation: clampRange(
      base.opexMonthlyInflation + delta.opexMonthlyInflation,
      MIN_OPEX_MONTHLY_INFLATION,
      MAX_OPEX_MONTHLY_INFLATION
    ),
  };
}

export type RealEstateMonthResult = {
  month: number;
  occupancyPct: number; // this month's realized occupancy, mid-lease-up
  occupiedUnits: number;
  rentalRevenue: number;
  operatingExpenses: number;
  noi: number; // Net Operating Income = rental revenue - operating expenses
  noiMargin: number;
  debtService: number; // this month's share of annual debt service
  freeCashFlow: number; // NOI - debt service
  dscr: number; // this month's annualized-NOI / annual-debt-service, moves month to month
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
  impliedValuation: number; // annualized NOI / cap rate, off month-12 NOI
};

/**
 * A property's cash flow is occupancy x rent producing rental revenue
 * (effective gross income), minus operating expenses (NOI), minus debt
 * service (free cash flow) — but none of occupancy, rent, or opex is flat
 * across the window any more (see the time-dynamics doc comment above).
 * Occupancy leases up (or slides, if the target is below today's level)
 * toward the Occupancy % driver's stabilized target; average in-place rent
 * drifts toward an escalating market rent as ~1/12 of the book rolls each
 * month; opex inflates on its own path independent of revenue. Cap rate
 * still never enters the cash-flow math — it only capitalizes month-12 NOI
 * into an implied asset valuation. Annual debt service stays fixed, exactly
 * as before, since it's contractual.
 */
export function runRealEstateForecast(
  assumptions: RealEstateAssumptions,
  baseline: RealEstateCompanyBaseline = harborViewBaseline,
  scenario: RealEstateScenarioKey = "base"
): RealEstateForecastResult {
  const ramp = realEstateRampConstantsForScenario(scenario);
  const targetOccupancy = assumptions.occupancyPct;
  const occupancyGap0 = CURRENT_OCCUPANCY - targetOccupancy;
  const monthlyDebtService = assumptions.annualDebtService / 12;

  let cash = baseline.startingCash;
  let avgInPlaceRent = assumptions.averageMonthlyRent;
  let baseOpex = 0;
  const months: RealEstateMonthResult[] = [];

  for (let month = 1; month <= 12; month++) {
    const occupancyPct = targetOccupancy + occupancyGap0 * Math.pow(1 - ramp.leaseUpSpeed, month);
    const occupiedUnits = assumptions.totalUnits * occupancyPct;

    const marketRent = assumptions.averageMonthlyRent * Math.pow(1 + ramp.annualRentEscalation, month / 12);
    avgInPlaceRent = avgInPlaceRent * (11 / 12) + marketRent * (1 / 12);

    const rentalRevenue = occupiedUnits * avgInPlaceRent;
    if (month === 1) baseOpex = rentalRevenue * assumptions.operatingExpensePct;
    const operatingExpenses = baseOpex * Math.pow(1 + ramp.opexMonthlyInflation, month - 1);

    const noi = rentalRevenue - operatingExpenses;
    const noiMargin = rentalRevenue === 0 ? 0 : noi / rentalRevenue;
    const freeCashFlow = noi - monthlyDebtService;
    const dscr = assumptions.annualDebtService === 0 ? 0 : (noi * 12) / assumptions.annualDebtService;

    cash += freeCashFlow;
    months.push({
      month,
      occupancyPct,
      occupiedUnits,
      rentalRevenue,
      operatingExpenses,
      noi,
      noiMargin,
      debtService: monthlyDebtService,
      freeCashFlow,
      dscr,
      cash,
    });
  }

  const last = months[months.length - 1];
  const runwayMonths =
    last.freeCashFlow >= 0 ? null : Math.max(0, baseline.startingCash / -last.freeCashFlow);

  return {
    months,
    endingRentalRevenueAnnualized: last.rentalRevenue * 12,
    endingNOIAnnualized: last.noi * 12,
    endingNOIMargin: last.noiMargin,
    endingFreeCashFlowAnnualized: last.freeCashFlow * 12,
    endingFreeCashFlowMargin: last.rentalRevenue === 0 ? 0 : last.freeCashFlow / last.rentalRevenue,
    endingCash: last.cash,
    runwayMonths,
    impliedValuation: assumptions.capRatePct === 0 ? 0 : (last.noi * 12) / assumptions.capRatePct,
  };
}

export type RealEstateTrend = TrendStatus;

// NOI trend across the window — used by the Key Risk chain, not a chart
// badge (the NOI chart badges on NOI margin, since margin is the metric it
// actually shares a name with).
export function classifyRealEstateTrend(result: RealEstateForecastResult): RealEstateTrend {
  const first = result.months[0].noi;
  const last = result.months[result.months.length - 1].noi;
  return classifyTrend(first, last);
}

// Rental revenue trend across the window — now genuinely meaningful once
// occupancy lease-up and rent escalation are real month-over-month
// dynamics (Prompt 3), not the flat repeat it was before. This is the
// badge source for the Rental Revenue chart.
export function classifyRentalRevenueTrend(result: RealEstateForecastResult): RealEstateTrend {
  const first = result.months[0].rentalRevenue;
  const last = result.months[result.months.length - 1].rentalRevenue;
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

const TREND_TONE: Record<RealEstateTrend, BadgeTone> = {
  Growing: "good",
  Flat: "neutral",
  Contracting: "bad",
};

const MARGIN_STATUS_TONE: Record<MarginStatus, BadgeTone> = {
  Strong: "good",
  Profitable: "good",
  NearBreakeven: "neutral",
  ApproachingBreakeven: "neutral",
  MateriallyUnprofitable: "bad",
};

const DSCR_STATUS_TONE: Record<DebtCoverageStatus, BadgeTone> = {
  Strong: "good",
  Healthy: "good",
  Watch: "neutral",
  Weak: "bad",
};

/**
 * The three Real Estate charts (exactly these, in this order). Now that
 * occupancy lease-up, rent escalation, and opex inflation give every one of
 * these a genuine month-over-month slope (Prompt 3), each chart badges on
 * the classifier that matches its OWN name rather than borrowing a
 * different metric's band: Rental Revenue badges on its own trend, NOI on
 * NOI margin, and Free Cash Flow on DSCR (the metric this whole industry
 * model exists to protect).
 */
export const REAL_ESTATE_CHARTS: ChartConfig<RealEstateForecastResult, RealEstateAssumptions>[] = [
  {
    key: "rentalRevenue",
    chartLabel: "Rental Revenue",
    statLabel: "Rental Revenue",
    valueFormat: { kind: "currency" },
    ariaLabel: "12-month rental revenue (effective gross income) under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.rentalRevenue),
    getCaption: (result, assumptions) => {
      const trend = classifyRentalRevenueTrend(result);
      const tone = TREND_TONE[trend];
      const first = result.months[0].rentalRevenue;
      const last = result.months[result.months.length - 1].rentalRevenue;
      const pctChange = first === 0 ? 0 : ((last - first) / first) * 100;
      const firstOcc = formatPct(result.months[0].occupancyPct, 0);
      const lastOcc = formatPct(result.months[result.months.length - 1].occupancyPct, 0);
      const targetOcc = formatPct(assumptions.occupancyPct, 0);

      let alertLead: string;
      let alertExplanation: string;
      if (trend === "Growing") {
        alertLead = "Rental revenue is growing.";
        alertExplanation = `Effective gross income rose to ${formatUsdCompact(last)}/mo by Month 12, up ${pctChange.toFixed(1)}% from ${formatUsdCompact(first)}, as occupancy leases up from ${firstOcc} to ${lastOcc}, toward the ${targetOcc} stabilized target.`;
      } else if (trend === "Flat") {
        alertLead = "Rental revenue is roughly flat.";
        alertExplanation = `Effective gross income is little changed at ${formatUsdCompact(last)}/mo versus ${formatUsdCompact(first)}/mo at the start — occupancy is already close to its ${targetOcc} stabilized target.`;
      } else {
        alertLead = "Rental revenue is declining.";
        alertExplanation = `Effective gross income fell to ${formatUsdCompact(last)}/mo by Month 12, down ${Math.abs(pctChange).toFixed(1)}% from ${formatUsdCompact(first)}, as occupancy slides from ${firstOcc} to ${lastOcc}, toward a lower ${targetOcc} stabilized target.`;
      }
      return { badge: { label: trend, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Rental revenue (effective gross income) is occupied units times average in-place rent. It moves month to month as occupancy leases up (or down) toward its stabilized target and as roughly 1/12 of leases roll each month and renew at an escalated market rent.",
  },
  {
    key: "noi",
    chartLabel: "Net Operating Income",
    statLabel: "NOI",
    valueFormat: { kind: "currency" },
    ariaLabel: "12-month net operating income under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.noi),
    getCaption: (result) => {
      const status = classifyMargin(result.endingNOIMargin);
      const tone = MARGIN_STATUS_TONE[status];
      const monthlyNOI = result.months[result.months.length - 1].noi;
      const noiMarginPct = formatPct(result.endingNOIMargin, 1);

      let alertLead: string;
      let alertExplanation: string;
      if (status === "Strong" || status === "Profitable") {
        alertLead = `NOI margin is ${status === "Strong" ? "strong" : "solidly positive"}.`;
        alertExplanation = `Net operating income ends the window at ${formatUsdCompact(monthlyNOI)}/mo, a ${noiMarginPct} margin on rental revenue — operating expense inflation hasn't caught up with revenue.`;
      } else if (status === "NearBreakeven") {
        alertLead = "NOI margin is only modestly positive.";
        alertExplanation = `Net operating income ends the window at ${formatUsdCompact(monthlyNOI)}/mo, a ${noiMarginPct} margin on rental revenue — just above breakeven before debt service.`;
      } else if (status === "ApproachingBreakeven") {
        alertLead = "NOI margin is still negative.";
        alertExplanation = `Net operating income ends the window at ${formatUsdCompact(monthlyNOI)}/mo, a ${noiMarginPct} margin on rental revenue — operating expenses aren't yet covered, before debt service is even considered.`;
      } else {
        alertLead = "NOI margin is materially negative.";
        alertExplanation = `Net operating income ends the window at ${formatUsdCompact(monthlyNOI)}/mo, a ${noiMarginPct} margin on rental revenue — operating expenses alone exceed what the property collects, before debt service.`;
      }
      return { badge: { label: MARGIN_STATUS_LABEL[status], tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Net operating income (NOI) is rental revenue minus operating expenses — profitability from running the property, before debt service or cap-rate valuation enter the picture. It moves month to month because opex inflates on its own path while revenue follows the lease-up and rent-escalation dynamics above; margin compresses whenever opex outpaces revenue growth.",
  },
  {
    key: "freeCashFlow",
    chartLabel: "Free Cash Flow",
    statLabel: "Free Cash Flow",
    valueFormat: { kind: "currency" },
    ariaLabel: "12-month free cash flow after debt service under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.freeCashFlow),
    getCaption: (result, assumptions) => {
      const dscr = debtServiceCoverageRatio(result, assumptions);
      const status = classifyDebtCoverage(dscr);
      const tone = DSCR_STATUS_TONE[status];
      const monthlyFCF = result.months[result.months.length - 1].freeCashFlow;
      const dscrText = `${dscr.toFixed(2)}x`;

      let alertLead: string;
      let alertExplanation: string;
      if (status === "Strong") {
        alertLead = "Debt service coverage is strong.";
        alertExplanation = `Free cash flow after debt service ends the window at ${formatUsdCompact(monthlyFCF)}/mo, at ${dscrText} DSCR — a strong cushion well above typical lender covenants.`;
      } else if (status === "Healthy") {
        alertLead = "Debt service coverage is healthy.";
        alertExplanation = `Free cash flow after debt service ends the window at ${formatUsdCompact(monthlyFCF)}/mo, at ${dscrText} DSCR — a comfortable cushion above typical lender covenants.`;
      } else if (status === "Watch") {
        alertLead = "Debt service coverage is thin.";
        alertExplanation = `Free cash flow after debt service ends the window at ${formatUsdCompact(monthlyFCF)}/mo, at ${dscrText} DSCR — a thin cushion above break-even coverage, worth watching.`;
      } else {
        alertLead = "Debt service coverage is weak.";
        alertExplanation = `Free cash flow after debt service ends the window at ${formatUsdCompact(monthlyFCF)}/mo, at just ${dscrText} DSCR — NOI barely covers (or doesn't cover) debt service, a real lender-covenant and refinancing risk.`;
      }
      return { badge: { label: status, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Free cash flow is NOI minus debt service — what's left after the mortgage is paid, each month, as NOI moves along the lease-up/escalation/inflation dynamics above. Debt service coverage ratio (DSCR, annualized NOI divided by annual debt service) is the standard lender metric for how much cushion that leaves, and it moves month to month right along with NOI: below ~1.10x is thin enough to risk a covenant breach or refinancing trouble from even a small vacancy uptick or rate reset.",
  },
];

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
  const occupancyStatus = classifyOccupancy(result.months[result.months.length - 1].occupancyPct);

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
 * other two industries, generalized to whichever metric is requested. Runs
 * at the Base scenario's ramp pace (occupancy lease-up speed, rent
 * escalation, opex inflation) regardless of which scenario is active —
 * sensitivity isolates each SLIDER's impact, not the ramp constants.
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

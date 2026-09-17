// Pure Consulting & Services financial-planning engine. This is NOT the
// SaaS engine with relabeled fields — a services firm has no customers,
// MRR, churn, or expansion/contraction revenue. Its economics run on
// billable capacity, utilization, bill rates, and how much of its sales
// pipeline actually converts into signed, billable work. Every function
// here takes an assumptions object and returns a results object; no React,
// no formatting, no UI concerns.

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

export type ConsultingCompanyBaseline = {
  name: string;
  startingCash: number;
};

// Kept modest for the same reason as SaaS's STARTING_CASH: Base is
// EBITDA-positive and never touches this cushion, so it costs Base nothing
// to keep it small — but a small cushion is what makes Downside's
// Critical-runway/Depleted-cash decision branches actually reachable
// instead of permanently out of range no matter how bad the drivers get.
export const STARTING_CASH = 900_000;

export const meridianBaseline: ConsultingCompanyBaseline = {
  name: "Meridian Consulting Group",
  startingCash: STARTING_CASH,
};

// Modeling constants the engine needs but that aren't drivers, disclosed
// here (not hidden in a component).
export const STANDARD_BILLABLE_HOURS_PER_MONTH = 160; // ~40 hrs/week x 4 weeks

// --- Achieved-utilization formula ---
// Naively multiplying target utilization by pipeline conversion (e.g. 75%
// target x 40% conversion = 30% achieved) is wrong: it treats conversion as
// a probability applied to the whole book, when it's actually a measure of
// how well the sales pipeline is keeping pace with target utilization.
// Instead, pipeline conversion applies a bounded ADJUSTMENT around target:
//   - At REFERENCE_CONVERSION, achieved = target exactly (a firm converting
//     pipeline at the reference rate hits its target utilization).
//   - Above reference, stronger conversion lifts achieved utilization
//     toward or modestly above target — capped at +CONVERSION_MAX_LIFT so
//     no amount of conversion can push a firm absurdly over 100% capacity.
//   - Below reference, weaker conversion pulls achieved utilization below
//     target, creating real bench time — capped at -CONVERSION_MAX_DRAG so
//     the relationship stays plausible even at very low conversion.
// Example: 75% target, 40% conversion -> (0.40-0.30) x 0.5 = +0.05 (under
// the +0.10 cap) -> 80% achieved: modestly ABOVE target, not 30%.
//
// As of Prompt 3, this formula computes the RAMP DESTINATION, not a single
// flat value: achieved utilization starts at CURRENT_UTILIZATION and
// converges toward this destination over the window (see
// runConsultingForecast) — the formula itself is unchanged.
export const REFERENCE_CONVERSION = 0.3; // conversion rate at which achieved = target
export const CONVERSION_SENSITIVITY = 0.5; // achieved-utilization shift per point of conversion deviation
export const CONVERSION_MAX_LIFT = 0.1; // cap on how far strong conversion can lift achieved above target
export const CONVERSION_MAX_DRAG = 0.25; // cap on how far weak conversion can pull achieved below target

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeAchievedUtilization(
  targetUtilizationPct: number,
  pipelineConversionPct: number
): number {
  const adjustment = clamp(
    (pipelineConversionPct - REFERENCE_CONVERSION) * CONVERSION_SENSITIVITY,
    -CONVERSION_MAX_DRAG,
    CONVERSION_MAX_LIFT
  );
  return clamp(targetUtilizationPct + adjustment, 0, 1);
}

export type ConsultingAssumptions = {
  billableHeadcount: number; // consultants TODAY — a starting fact; headcount then ramps from here, see time dynamics below
  averageBillRate: number; // $ per billable hour
  utilizationPct: number; // TARGET utilization, e.g. 0.75 = 75% — feeds the ramp destination, see above
  avgFullyLoadedCostPerConsultant: number; // $ / consultant / year — delivery cost = headcount x this, independent of revenue
  pipelineConversionPct: number; // % of generated pipeline that converts to signed, billable work
  sgaPct: number; // % of net revenue spent on sales, marketing, and G&A overhead
};

export type ConsultingDriverKey = keyof ConsultingAssumptions;

// The 6 Consulting drivers — sliders are rendered by mapping over this
// array; there is no separate hardcoded slider list.
export const CONSULTING_DRIVERS: DriverConfig<ConsultingDriverKey>[] = [
  { key: "billableHeadcount", label: "Billable Headcount (Starting)", unit: "count", min: 10, max: 100, step: 1 },
  { key: "averageBillRate", label: "Avg Bill Rate", unit: "currency", min: 80, max: 400, step: 5 },
  { key: "utilizationPct", label: "Target Utilization %", unit: "percent", min: 0.3, max: 0.95, step: 0.01 },
  { key: "avgFullyLoadedCostPerConsultant", label: "Avg Fully-Loaded Cost per Consultant", unit: "currency", min: 60_000, max: 300_000, step: 5_000 },
  { key: "pipelineConversionPct", label: "Pipeline Conversion %", unit: "percent", min: 0.05, max: 0.7, step: 0.01 },
  { key: "sgaPct", label: "SG&A % of Net Revenue", unit: "percent", min: 0.05, max: 0.45, step: 0.01 },
];

const DRIVER_BOUNDS = new Map(CONSULTING_DRIVERS.map((d) => [d.key, d]));

function clampToDriverBounds(key: ConsultingDriverKey, value: number): number {
  const driver = DRIVER_BOUNDS.get(key)!;
  return Math.min(driver.max, Math.max(driver.min, value));
}

function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ConsultingScenarioKey = "base" | "upside" | "downside";

// Base is whatever the sliders currently say — these are only the
// starting/default values shown on first load.
export const CONSULTING_BASE_DEFAULTS: ConsultingAssumptions = {
  billableHeadcount: 40,
  averageBillRate: 185,
  utilizationPct: 0.75,
  avgFullyLoadedCostPerConsultant: 150_000,
  pipelineConversionPct: 0.335,
  sgaPct: 0.25,
};

// Signed, directionally-aware deltas: bill rate/target utilization/pipeline
// conversion are "higher is better" (up in Upside, down in Downside);
// fully-loaded cost per consultant and SG&A % are "higher is worse" (down
// in Upside, up in Downside). billableHeadcount is a starting fact (delta
// 0 both directions), not a scenario lever — its forward *growth* is
// governed by the separate ramp constants below instead.
export const CONSULTING_SCENARIO_DELTAS: Record<
  Exclude<ConsultingScenarioKey, "base">,
  Partial<Record<ConsultingDriverKey, number>>
> = {
  upside: {
    averageBillRate: 15,
    utilizationPct: 0.05,
    avgFullyLoadedCostPerConsultant: -10_000,
    pipelineConversionPct: 0.1,
    sgaPct: -0.03,
  },
  downside: {
    averageBillRate: -15,
    utilizationPct: -0.08,
    avgFullyLoadedCostPerConsultant: 20_000,
    pipelineConversionPct: -0.22,
    sgaPct: 0.08,
  },
};

/**
 * Base + this scenario's signed delta table, each driver clamped to its own
 * slider bounds. A zero-delta table returns Base unchanged for every
 * scenario.
 */
export function applyConsultingScenario(
  base: ConsultingAssumptions,
  scenario: ConsultingScenarioKey
): ConsultingAssumptions {
  if (scenario === "base") return base;
  const delta = CONSULTING_SCENARIO_DELTAS[scenario];
  const out: ConsultingAssumptions = { ...base };
  (Object.keys(delta) as ConsultingDriverKey[]).forEach((key) => {
    out[key] = clampToDriverBounds(key, base[key] + (delta[key] ?? 0));
  });
  return out;
}

// --- Time dynamics (Prompt 3) ---
// Two mechanisms plus a lag give the firm genuine month-over-month
// behavior instead of the same month repeated 12 times. All are documented
// model constants, not sliders — the industry stays at exactly 6 drivers.
//
// 1. Utilization ramp: computeAchievedUtilization() above still computes
//    where achieved utilization is HEADED (the target, adjusted by
//    pipeline conversion) — it's now a destination, not the value itself.
//    Achieved utilization starts at CURRENT_UTILIZATION and closes the
//    remaining gap to that destination asymptotically, the same
//    "fixed fraction of the remaining gap every month" shape as Real
//    Estate's occupancy lease-up. When the destination sits BELOW today's
//    utilization (a stressed Downside), the same formula produces
//    utilization declining toward it instead of rising.
// 2. Headcount ramp: billable headcount grows (or, in a stalled Downside,
//    shrinks) at a modest compounding monthly rate from the driver's
//    starting value, independent of utilization — a second, additive
//    source of net-revenue movement.
// 3. Bookings-to-revenue lag: a signed engagement doesn't become billed
//    revenue the instant pipeline conversion happens — staffing and
//    onboarding take time. BOOKING_LAG_MONTHS documents that delay: net
//    revenue in month m bills at month (m - lag)'s utilization level, not
//    the current month's. The Utilization Trend chart still shows the true,
//    unlagged ramp; only revenue (and everything downstream of it) lags.
export const CURRENT_UTILIZATION = 0.65; // achieved utilization today, before ramping toward the pipeline-adjusted destination
export const BASE_UTIL_RAMP_SPEED = 0.3; // fraction of the remaining gap to destination closed each month
export const BASE_HEADCOUNT_MONTHLY_GROWTH = 0.006; // modest monthly headcount growth, independent of utilization
export const BOOKING_LAG_MONTHS = 1; // months between pipeline conversion and recognized billable revenue

const MIN_UTIL_RAMP_SPEED = 0.05;
const MAX_UTIL_RAMP_SPEED = 0.6;
const MIN_HEADCOUNT_MONTHLY_GROWTH = -0.02;
const MAX_HEADCOUNT_MONTHLY_GROWTH = 0.02;

export type ConsultingRampConstants = {
  utilRampSpeed: number;
  headcountMonthlyGrowth: number;
};

// Signed, directionally-aware, same "Base + delta, clamped" architecture as
// the driver deltas above: Upside ramps utilization toward its (higher)
// destination faster and grows headcount faster; Downside stalls the
// utilization ramp (which, combined with a destination already pulled down
// by the utilizationPct/pipelineConversionPct deltas, becomes a slide
// rather than a rise) and shrinks headcount via attrition without backfill.
export const CONSULTING_RAMP_DELTAS: Record<Exclude<ConsultingScenarioKey, "base">, ConsultingRampConstants> = {
  upside: { utilRampSpeed: 0.15, headcountMonthlyGrowth: 0.006 },
  downside: { utilRampSpeed: -0.2, headcountMonthlyGrowth: -0.01 },
};

/**
 * Base ramp constants + this scenario's signed delta, each clamped to its
 * own range — mirrors applyConsultingScenario's "Base + delta, clamped"
 * shape for the 2 new non-slider time-dynamics constants. A zero-delta
 * table (both this one and CONSULTING_SCENARIO_DELTAS) collapses all three
 * scenarios back to identical output.
 */
export function consultingRampConstantsForScenario(scenario: ConsultingScenarioKey): ConsultingRampConstants {
  const base: ConsultingRampConstants = {
    utilRampSpeed: BASE_UTIL_RAMP_SPEED,
    headcountMonthlyGrowth: BASE_HEADCOUNT_MONTHLY_GROWTH,
  };
  if (scenario === "base") return base;
  const delta = CONSULTING_RAMP_DELTAS[scenario];
  return {
    utilRampSpeed: clampRange(base.utilRampSpeed + delta.utilRampSpeed, MIN_UTIL_RAMP_SPEED, MAX_UTIL_RAMP_SPEED),
    headcountMonthlyGrowth: clampRange(
      base.headcountMonthlyGrowth + delta.headcountMonthlyGrowth,
      MIN_HEADCOUNT_MONTHLY_GROWTH,
      MAX_HEADCOUNT_MONTHLY_GROWTH
    ),
  };
}

export type ConsultingMonthResult = {
  month: number;
  headcount: number; // this month's ramped billable headcount
  capacityHours: number;
  achievedUtilization: number; // this month's TRUE ramped utilization (unlagged) — what the Utilization Trend chart shows
  billedHours: number; // capacity x the LAGGED utilization that actually converts to billed hours this month
  netRevenue: number;
  deliveryCost: number;
  projectMargin: number;
  projectMarginPct: number;
  sga: number;
  ebitda: number;
  ebitdaMargin: number;
  cash: number;
};

export type ConsultingForecastResult = {
  months: ConsultingMonthResult[];
  endingNetRevenueAnnualized: number;
  endingUtilization: number;
  endingProjectMarginPct: number;
  endingEBITDAMargin: number;
  endingCash: number;
  runwayMonths: number | null;
};

/**
 * A services firm's revenue isn't a growth curve off a starting customer
 * base like SaaS — it's driven each month by how much billable capacity
 * actually gets utilized. Achieved utilization now RAMPS from
 * CURRENT_UTILIZATION toward the pipeline-adjusted destination
 * computeAchievedUtilization() returns (asymptotic convergence, same shape
 * as Real Estate's occupancy lease-up); billable headcount ramps
 * separately and additively from the driver's starting value; and net
 * revenue bills off utilization from BOOKING_LAG_MONTHS ago, not the
 * current month's, reflecting real staffing/onboarding lag between a
 * signed engagement and recognized revenue. Delivery cost is this month's
 * headcount x avg fully-loaded cost per consultant — an absolute cost that
 * moves EBITDA and project margin but never touches net revenue or
 * utilization, since it's a cost line, not a capacity or pricing input.
 */
export function runConsultingForecast(
  assumptions: ConsultingAssumptions,
  baseline: ConsultingCompanyBaseline = meridianBaseline,
  scenario: ConsultingScenarioKey = "base"
): ConsultingForecastResult {
  const ramp = consultingRampConstantsForScenario(scenario);
  const destinationUtilization = computeAchievedUtilization(
    assumptions.utilizationPct,
    assumptions.pipelineConversionPct
  );
  const utilizationGap0 = CURRENT_UTILIZATION - destinationUtilization;

  // m<=0 is "before the forecast window" — pretend utilization was already
  // at today's starting level, so the lag has something to reference in
  // month 1 rather than needing a special case.
  const utilAt = (m: number): number =>
    m <= 0 ? CURRENT_UTILIZATION : destinationUtilization + utilizationGap0 * Math.pow(1 - ramp.utilRampSpeed, m);

  let cash = baseline.startingCash;
  const months: ConsultingMonthResult[] = [];

  for (let month = 1; month <= 12; month++) {
    const headcount = assumptions.billableHeadcount * Math.pow(1 + ramp.headcountMonthlyGrowth, month);
    const capacityHours = headcount * STANDARD_BILLABLE_HOURS_PER_MONTH;
    const achievedUtilization = utilAt(month);
    const billedUtilization = utilAt(month - BOOKING_LAG_MONTHS);
    const billedHours = capacityHours * billedUtilization;
    const netRevenue = billedHours * assumptions.averageBillRate;
    const deliveryCost = (headcount * assumptions.avgFullyLoadedCostPerConsultant) / 12;
    const projectMargin = netRevenue - deliveryCost;
    const projectMarginPct = netRevenue === 0 ? 0 : projectMargin / netRevenue;
    const sga = netRevenue * assumptions.sgaPct;
    const ebitda = projectMargin - sga;
    const ebitdaMargin = netRevenue === 0 ? 0 : ebitda / netRevenue;

    cash += ebitda;
    months.push({
      month,
      headcount,
      capacityHours,
      achievedUtilization,
      billedHours,
      netRevenue,
      deliveryCost,
      projectMargin,
      projectMarginPct,
      sga,
      ebitda,
      ebitdaMargin,
      cash,
    });
  }

  const last = months[months.length - 1];
  const runwayMonths = last.ebitda >= 0 ? null : Math.max(0, baseline.startingCash / -last.ebitda);

  return {
    months,
    endingNetRevenueAnnualized: last.netRevenue * 12,
    endingUtilization: last.achievedUtilization,
    endingProjectMarginPct: last.projectMarginPct,
    endingEBITDAMargin: last.ebitdaMargin,
    endingCash: last.cash,
    runwayMonths,
  };
}

export type ConsultingTrend = TrendStatus;

// Net revenue trend across the window — now genuinely meaningful once the
// utilization ramp, headcount ramp, and bookings lag are real
// month-over-month dynamics (Prompt 3), not the flat repeat it was before.
// This is the badge source for the Net Revenue chart.
export function classifyConsultingTrend(result: ConsultingForecastResult): ConsultingTrend {
  const first = result.months[0].netRevenue;
  const last = result.months[result.months.length - 1].netRevenue;
  return classifyTrend(first, last);
}

export type UtilizationStatus = "Healthy" | "Watch" | "Weak";

// Thresholds: >=75% = Healthy, 60-75% = Watch, <60% = Weak — standard
// services-industry bands for a firm's achieved utilization.
export function classifyUtilization(achievedUtilization: number): UtilizationStatus {
  if (achievedUtilization >= 0.75) return "Healthy";
  if (achievedUtilization >= 0.6) return "Watch";
  return "Weak";
}

export { classifyMargin, classifyRunway };
export type { CashStatus, Decision, MarginStatus, RunwayStatus };

const UTILIZATION_STATUS_TONE: Record<UtilizationStatus, BadgeTone> = {
  Healthy: "good",
  Watch: "neutral",
  Weak: "bad",
};

const MARGIN_STATUS_TONE: Record<MarginStatus, BadgeTone> = {
  Strong: "good",
  Profitable: "good",
  NearBreakeven: "neutral",
  ApproachingBreakeven: "neutral",
  MateriallyUnprofitable: "bad",
};

const TREND_TONE: Record<ConsultingTrend, BadgeTone> = {
  Growing: "good",
  Flat: "neutral",
  Contracting: "bad",
};

/**
 * The three Consulting charts (exactly these, in this order). Now that the
 * utilization ramp, headcount ramp, and bookings lag give every one of
 * these a genuine month-over-month slope (Prompt 3), Net Revenue badges on
 * its own trend rather than borrowing utilization's band — utilization and
 * EBITDA margin already badged on their own metric and are unchanged.
 */
export const CONSULTING_CHARTS: ChartConfig<ConsultingForecastResult, ConsultingAssumptions>[] = [
  {
    key: "netRevenue",
    chartLabel: "Net Revenue",
    statLabel: "Net Revenue",
    valueFormat: { kind: "currency" },
    ariaLabel: "12-month net revenue under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.netRevenue),
    getCaption: (result) => {
      const trend = classifyConsultingTrend(result);
      const tone = TREND_TONE[trend];
      const first = result.months[0].netRevenue;
      const last = result.months[result.months.length - 1].netRevenue;
      const pctChange = first === 0 ? 0 : ((last - first) / first) * 100;

      let alertLead: string;
      let alertExplanation: string;
      if (trend === "Growing") {
        alertLead = "Net revenue is growing.";
        alertExplanation = `Monthly net revenue rose to ${formatUsdCompact(last)} by Month 12, up ${pctChange.toFixed(1)}% from ${formatUsdCompact(first)}, as achieved utilization ramps toward its pipeline-adjusted destination and headcount grows.`;
      } else if (trend === "Flat") {
        alertLead = "Net revenue is roughly flat.";
        alertExplanation = `Monthly net revenue is little changed at ${formatUsdCompact(last)}, versus ${formatUsdCompact(first)} at the start of the window — utilization is already close to its ramp destination.`;
      } else {
        alertLead = "Net revenue is declining.";
        alertExplanation = `Monthly net revenue fell to ${formatUsdCompact(last)} by Month 12, down ${Math.abs(pctChange).toFixed(1)}% from ${formatUsdCompact(first)}, as achieved utilization ramps down toward a weaker pipeline-adjusted destination.`;
      }
      return { badge: { label: trend, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Net revenue is billed hours (capacity x achieved utilization, lagged by the bookings-to-revenue delay) times the average bill rate. It moves month to month as utilization ramps toward its pipeline-adjusted destination and as headcount grows or shrinks.",
  },
  {
    key: "utilizationTrend",
    chartLabel: "Utilization Trend",
    statLabel: "Achieved Utilization",
    valueFormat: { kind: "percent", digits: 0 },
    ariaLabel: "12-month achieved utilization under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.achievedUtilization),
    getCaption: (result, assumptions) => {
      const status = classifyUtilization(result.endingUtilization);
      const tone = UTILIZATION_STATUS_TONE[status];
      const utilPct = formatPct(result.endingUtilization, 0);
      const targetPct = formatPct(assumptions.utilizationPct, 0);
      const conversionPct = formatPct(assumptions.pipelineConversionPct, 0);

      let alertLead: string;
      let alertExplanation: string;
      if (status === "Healthy") {
        alertLead = "Utilization is healthy.";
        alertExplanation = `Achieved utilization ramps to ${utilPct} by Month 12 against a ${targetPct} target, at ${conversionPct} pipeline conversion — comfortably keeping the bench booked.`;
      } else if (status === "Watch") {
        alertLead = "Utilization is below target.";
        alertExplanation = `Achieved utilization ramps to ${utilPct} by Month 12 against a ${targetPct} target — ${conversionPct} pipeline conversion is only partially keeping the bench booked.`;
      } else {
        alertLead = "Utilization is weak.";
        alertExplanation = `Achieved utilization ramps to just ${utilPct} by Month 12 against a ${targetPct} target — ${conversionPct} pipeline conversion is insufficient to keep the bench booked, leaving significant bench time.`;
      }
      return { badge: { label: status, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Achieved utilization ramps from today's level toward a destination set by target utilization, adjusted by pipeline conversion (see the Model Assumptions panel for the formula) — a stronger or weaker pipeline changes where it's headed, not just where it started. Above ~75% is healthy; below ~60% means significant bench time the firm is already paying delivery cost for.",
  },
  {
    key: "ebitdaMarginTrend",
    chartLabel: "EBITDA Margin Trend",
    statLabel: "EBITDA Margin",
    valueFormat: { kind: "percent", digits: 1 },
    ariaLabel: "12-month EBITDA margin under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.ebitdaMargin),
    getCaption: (result) => {
      const status = classifyMargin(result.endingEBITDAMargin);
      const tone = MARGIN_STATUS_TONE[status];
      const marginPct = formatPct(result.endingEBITDAMargin, 1);

      let alertLead: string;
      let alertExplanation: string;
      if (status === "Strong" || status === "Profitable") {
        alertLead = `EBITDA margin is ${status === "Strong" ? "strong" : "solidly positive"}.`;
        alertExplanation = `EBITDA margin ends the window at ${marginPct} — delivery cost and SG&A leave a comfortable profit after billed revenue, as utilization and headcount ramp up.`;
      } else if (status === "NearBreakeven") {
        alertLead = "EBITDA margin is only modestly positive.";
        alertExplanation = `EBITDA margin ends the window at ${marginPct}, just above breakeven — delivery cost and SG&A leave little cushion.`;
      } else if (status === "ApproachingBreakeven") {
        alertLead = "EBITDA margin is still negative.";
        alertExplanation = `EBITDA margin ends the window at ${marginPct}, approaching breakeven — delivery cost and SG&A aren't yet covered by billed revenue, though the gap is closing.`;
      } else {
        alertLead = "EBITDA margin is materially negative.";
        alertExplanation = `EBITDA margin ends the window at ${marginPct} — delivery cost and SG&A aren't supported by billed revenue at this scale, as utilization ramps down.`;
      }
      return { badge: { label: MARGIN_STATUS_LABEL[status], tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "EBITDA margin here is project margin (net revenue minus delivery cost) minus SG&A, as a share of net revenue. It moves month to month as net revenue ramps against delivery cost, which grows with headcount independent of utilization — margin expands (or compresses) as those two forces converge or diverge.",
  },
];

/**
 * Consulting's own decision framework — deliberately NOT a reuse of the
 * shared runway+margin-only decideStance(), because a services firm's real
 * constraint is billable capacity: a firm can have a comfortable runway and
 * even a strong margin while badly under-utilized (bench time it's already
 * paying delivery staff for), and that structural problem shouldn't be
 * waved through to "invest for growth" — hiring more heads onto a bench
 * that's already under-booked only compounds it. Utilization gates the top
 * tier the way DSCR gates Real Estate's; margin still matters, but on its
 * own it isn't sufficient.
 */
export function decideConsultingStance(result: ConsultingForecastResult): Decision {
  const marginStatus = classifyMargin(result.endingEBITDAMargin);
  const utilizationStatus = classifyUtilization(result.endingUtilization);
  const runway = result.runwayMonths;
  const runwayOk = runway === null || runway > 18;

  // Weak utilization (insufficient pipeline conversion to keep the bench
  // booked) is a structural revenue-generation problem that caps the
  // recommendation regardless of how the margin currently looks — margin
  // earned at under-booked utilization is fragile, not a base to grow from.
  if (utilizationStatus === "Weak") {
    return runwayOk ? "Run cautiously" : "Preserve cash";
  }
  if (marginStatus === "MateriallyUnprofitable" || marginStatus === "ApproachingBreakeven") {
    return runwayOk ? "Run cautiously" : "Preserve cash";
  }
  if (
    runwayOk &&
    (marginStatus === "Strong" || marginStatus === "Profitable") &&
    utilizationStatus === "Healthy"
  ) {
    return "Invest for growth";
  }
  if (runway === null || runway >= 12) return "Run cautiously";
  return "Preserve cash";
}

/**
 * Generates 2-3 short, deterministic reasons behind a decision — built from
 * the same runway/margin/utilization signals decideConsultingStance uses,
 * so the reasons and the recommendation can never disagree.
 */
export function explainConsultingDecision(
  result: ConsultingForecastResult,
  decision: Decision
): string[] {
  const runway = result.runwayMonths;
  const marginStatus = classifyMargin(result.endingEBITDAMargin);
  const utilization = result.endingUtilization;
  const reasons: string[] = [];

  if (runway === null) {
    reasons.push(
      "The firm is cash-flow positive at the current run-rate — no runway ceiling applies"
    );
  } else if (runway > 18) {
    reasons.push(`Runway remains above 18 months (${runway.toFixed(1)} months)`);
  } else if (runway >= 12) {
    reasons.push(`Runway is in the 12–18 month caution band (${runway.toFixed(1)} months)`);
  } else {
    reasons.push(`Runway has fallen below 12 months (${runway.toFixed(1)} months)`);
  }

  const marginPct = (result.endingEBITDAMargin * 100).toFixed(1);
  const marginReasonText: Record<MarginStatus, string> = {
    Strong: `EBITDA margin is strong (${marginPct}%)`,
    Profitable: `EBITDA margin is solidly positive (${marginPct}%)`,
    NearBreakeven: `EBITDA margin is only modestly positive, near breakeven (${marginPct}%)`,
    ApproachingBreakeven: `EBITDA margin is still negative, approaching breakeven (${marginPct}%)`,
    MateriallyUnprofitable: `EBITDA margin is materially negative (${marginPct}%)`,
  };
  reasons.push(marginReasonText[marginStatus]);

  const utilizationStatus = classifyUtilization(utilization);
  if (utilizationStatus === "Healthy") {
    reasons.push(`Achieved utilization is healthy (${(utilization * 100).toFixed(1)}%)`);
  } else if (utilizationStatus === "Watch") {
    const suffix =
      decision === "Invest for growth"
        ? ", short of the healthy band this recommendation would ideally want"
        : " — pipeline conversion isn't fully keeping the bench booked";
    reasons.push(`Achieved utilization is below target (${(utilization * 100).toFixed(1)}%)${suffix}`);
  } else {
    const suffix =
      decision !== "Invest for growth" ? "" : ", a risk despite the runway and margin picture";
    reasons.push(
      `Achieved utilization is weak (${(utilization * 100).toFixed(1)}%)${suffix}`
    );
  }

  return reasons;
}

export function classifyConsultingCash(
  endingCash: number,
  baseline: ConsultingCompanyBaseline = meridianBaseline
): CashStatus {
  return classifyCashRatio(endingCash, baseline.startingCash);
}

/**
 * Key Risk / Next Action for the CFO Commentary panel. Two tiers, same
 * structure as the SaaS engine's equivalent: Tier 1 covers metrics
 * materially outside a healthy range, Tier 2 covers a metric merely in a
 * cautionary Watch/ApproachingBreakeven band. The "no material risk"
 * fallback is only reachable when neither tier finds anything, so it can
 * never fire while a badge on screen reads Watch or worse. Uses
 * decideConsultingStance (not the shared runway+margin-only decideStance)
 * so Next Action always agrees with the Recommendation banner.
 */
export function buildConsultingRiskAndAction(
  result: ConsultingForecastResult
): { keyRiskPhrase: string; nextActionPhrase: string } {
  const runwayStatus = classifyRunway(result.runwayMonths);
  const marginStatus = classifyMargin(result.endingEBITDAMargin);
  const cashStatus = classifyConsultingCash(result.endingCash);
  const utilizationStatus = classifyUtilization(result.endingUtilization);
  const trendStatus = classifyConsultingTrend(result);
  const marginPct = (result.endingEBITDAMargin * 100).toFixed(1);

  let keyRiskPhrase: string;
  if (cashStatus === "Depleted") {
    keyRiskPhrase =
      "Cash has gone negative at these assumptions — the firm has run out of money within the window.";
  } else if (runwayStatus === "Critical") {
    keyRiskPhrase =
      "Runway has fallen below 12 months — cash exhaustion is the dominant risk if burn doesn't change.";
  } else if (cashStatus === "Low") {
    keyRiskPhrase =
      "Ending cash is tight relative to the starting balance, leaving little cushion for a downside surprise.";
  } else if (marginStatus === "MateriallyUnprofitable") {
    keyRiskPhrase = `EBITDA margin is materially negative (${marginPct}%) — delivery cost and SG&A aren't supported by billed revenue at this scale.`;
  } else if (utilizationStatus === "Weak") {
    keyRiskPhrase =
      "Achieved utilization is weak — insufficient pipeline conversion is leaving significant bench time, the firm's main lever on profitability.";
  } else if (trendStatus === "Contracting") {
    keyRiskPhrase = "Net revenue is contracting over the window.";
  } else if (marginStatus === "ApproachingBreakeven") {
    keyRiskPhrase = `EBITDA margin is still negative (${marginPct}%), approaching breakeven — not yet a material risk, but worth watching.`;
  } else if (utilizationStatus === "Watch") {
    keyRiskPhrase =
      `Achieved utilization is below target (${(result.endingUtilization * 100).toFixed(1)}%) — pipeline conversion isn't fully keeping the bench booked, though not yet a material shortfall.`;
  } else if (runwayStatus === "Watch") {
    keyRiskPhrase = `Runway is in the 12-18 month caution band (${(result.runwayMonths ?? 0).toFixed(1)} months) — worth watching, though not yet critical.`;
  } else {
    keyRiskPhrase =
      "No metric is outside a healthy band at these assumptions — the main risk is an unmodeled external shock.";
  }

  const decision = decideConsultingStance(result);
  const nextActionPhrase: Record<Decision, string> = {
    "Invest for growth":
      "Continue investing in growth (headcount, bid rate) while keeping an eye on the risk above so it doesn't become the binding constraint.",
    "Run cautiously":
      "Hold headcount and spend roughly flat and revisit in a quarter — there's room to operate, but not enough margin of safety to accelerate.",
    "Preserve cash":
      "Tighten delivery cost and SG&A now, and prioritize pipeline conversion to rebuild utilization before adding headcount.",
  };

  return { keyRiskPhrase, nextActionPhrase: nextActionPhrase[decision] };
}

export type ConsultingSensitivityMetric = "ebitda" | "netRevenue" | "cash";

function consultingMetricValue(
  result: ConsultingForecastResult,
  metric: ConsultingSensitivityMetric
): number {
  switch (metric) {
    case "ebitda":
      return result.months[result.months.length - 1].ebitda * 12;
    case "netRevenue":
      return result.endingNetRevenueAnnualized;
    case "cash":
      return result.endingCash;
  }
}

export type ConsultingSensitivityRow = {
  key: ConsultingDriverKey;
  label: string;
  impact: number;
};

const SENSITIVITY_KEYS: ConsultingDriverKey[] = CONSULTING_DRIVERS.map((d) => d.key);

/**
 * Same "+10% on each driver, one at a time" sensitivity approach as the
 * SaaS engine, generalized to whichever metric is requested — mirrors
 * runSaaSSensitivityByMetric's shape so the UI's sensitivity panel can stay
 * one generic component across industries. Runs at the Base scenario's ramp
 * pace regardless of which scenario is active — sensitivity isolates each
 * SLIDER's impact, not the ramp constants.
 */
export function runConsultingSensitivityByMetric(
  assumptions: ConsultingAssumptions,
  baseline: ConsultingCompanyBaseline,
  metric: ConsultingSensitivityMetric
): ConsultingSensitivityRow[] {
  const baseResult = runConsultingForecast(assumptions, baseline);
  const baseValue = consultingMetricValue(baseResult, metric);

  const rows = SENSITIVITY_KEYS.map((key) => {
    const bumped: ConsultingAssumptions = { ...assumptions, [key]: assumptions[key] * 1.1 };
    const bumpedResult = runConsultingForecast(bumped, baseline);
    const impact = consultingMetricValue(bumpedResult, metric) - baseValue;
    return { key, label: CONSULTING_DRIVERS.find((d) => d.key === key)!.label, impact };
  });

  return rows.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

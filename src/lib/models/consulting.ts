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
  type CashStatus,
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
  billableHeadcount: number; // consultants, held constant across the 12-month window
  averageBillRate: number; // $ per billable hour
  utilizationPct: number; // TARGET utilization, e.g. 0.75 = 75% — achieved utilization is derived, see above
  avgFullyLoadedCostPerConsultant: number; // $ / consultant / year — delivery cost = headcount x this, independent of revenue
  pipelineConversionPct: number; // % of generated pipeline that converts to signed, billable work
  sgaPct: number; // % of net revenue spent on sales, marketing, and G&A overhead
};

export type ConsultingDriverKey = keyof ConsultingAssumptions;

// The 6 Consulting drivers — sliders are rendered by mapping over this
// array; there is no separate hardcoded slider list.
export const CONSULTING_DRIVERS: DriverConfig<ConsultingDriverKey>[] = [
  { key: "billableHeadcount", label: "Billable Headcount", unit: "count", min: 10, max: 100, step: 1 },
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

export type ConsultingScenarioKey = "base" | "upside" | "downside";

// Base is whatever the sliders currently say — these are only the
// starting/default values shown on first load.
export const CONSULTING_BASE_DEFAULTS: ConsultingAssumptions = {
  billableHeadcount: 40,
  averageBillRate: 185,
  utilizationPct: 0.75,
  avgFullyLoadedCostPerConsultant: 150_000,
  pipelineConversionPct: 0.32,
  sgaPct: 0.25,
};

// Signed, directionally-aware deltas: bill rate/target utilization/pipeline
// conversion are "higher is better" (up in Upside, down in Downside);
// fully-loaded cost per consultant and SG&A % are "higher is worse" (down
// in Upside, up in Downside). billableHeadcount is a starting fact (delta
// 0 both directions), not a scenario lever.
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

export type ConsultingMonthResult = {
  month: number;
  capacityHours: number;
  achievedUtilization: number; // fraction actually realized this month, pipeline-adjusted
  billedHours: number;
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
 * actually gets utilized, where achieved utilization is target utilization
 * adjusted (not multiplied) by how pipeline conversion compares to a
 * reference rate — see computeAchievedUtilization above. Delivery cost is
 * headcount x avg fully-loaded cost per consultant — an absolute cost that
 * moves EBITDA and project margin but never touches net revenue or
 * utilization, since it's a cost line, not a capacity or pricing input.
 * With every driver held flat across the window, revenue and margins are
 * flat month to month — only cash moves, accumulating (or draining)
 * monthly EBITDA.
 */
export function runConsultingForecast(
  assumptions: ConsultingAssumptions,
  baseline: ConsultingCompanyBaseline = meridianBaseline
): ConsultingForecastResult {
  const capacityHours = assumptions.billableHeadcount * STANDARD_BILLABLE_HOURS_PER_MONTH;
  const achievedUtilization = computeAchievedUtilization(
    assumptions.utilizationPct,
    assumptions.pipelineConversionPct
  );
  const billedHours = capacityHours * achievedUtilization;
  const netRevenue = billedHours * assumptions.averageBillRate;
  const deliveryCost = (assumptions.billableHeadcount * assumptions.avgFullyLoadedCostPerConsultant) / 12;
  const projectMargin = netRevenue - deliveryCost;
  const projectMarginPct = netRevenue === 0 ? 0 : projectMargin / netRevenue;
  const sga = netRevenue * assumptions.sgaPct;
  const ebitda = projectMargin - sga;
  const ebitdaMargin = netRevenue === 0 ? 0 : ebitda / netRevenue;

  const months: ConsultingMonthResult[] = [];
  let cash = baseline.startingCash;
  for (let month = 1; month <= 12; month++) {
    cash += ebitda;
    months.push({
      month,
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
  const runwayMonths = ebitda >= 0 ? null : Math.max(0, baseline.startingCash / -ebitda);

  return {
    months,
    endingNetRevenueAnnualized: netRevenue * 12,
    endingUtilization: achievedUtilization,
    endingProjectMarginPct: projectMarginPct,
    endingEBITDAMargin: ebitdaMargin,
    endingCash: last.cash,
    runwayMonths,
  };
}

export type ConsultingTrend = TrendStatus;

// Net revenue is flat month-to-month under fixed drivers (see
// runConsultingForecast), so this will almost always read "Flat" for a
// single scenario — it becomes meaningful when comparing two different
// driver settings; kept for interface symmetry with the other industries
// and for a future month-over-month growth driver.
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
 * one generic component across industries.
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

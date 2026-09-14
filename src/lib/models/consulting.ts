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
  decideStance,
  type CashStatus,
  type Decision,
  type MarginStatus,
  type RunwayStatus,
  type TrendStatus,
} from "./shared";

export type ConsultingCompanyBaseline = {
  name: string;
  startingCash: number;
};

// Fictional services firm used to seed the demo.
export const meridianBaseline: ConsultingCompanyBaseline = {
  name: "Meridian Consulting Group",
  startingCash: 1_800_000,
};

// Modeling constants the engine needs but the brief didn't specify, kept
// here (not hidden in a component) and disclosed in the UI.
export const STANDARD_BILLABLE_HOURS_PER_MONTH = 160; // ~40 hrs/week x 4 weeks
// Conversion rate needed to keep the bench fully booked at the target
// utilization — below this, insufficient new signed work leaves billable
// staff on the bench even though headcount and target utilization are
// unchanged. Disclosed as a modeling assumption, not a real benchmark.
export const PIPELINE_CONVERSION_BENCHMARK = 0.3;

export type ConsultingAssumptions = {
  billableHeadcount: number; // consultants, held constant across the 12-month window
  utilizationPct: number; // target utilization, e.g. 0.75 = 75%
  averageBillRate: number; // $ per billable hour
  pipelineConversionPct: number; // % of generated pipeline that converts to signed, billable work
  deliveryCostPct: number; // % of net revenue spent delivering the work (staff cost, subs, travel)
  sgaPct: number; // % of net revenue spent on sales, marketing, and G&A overhead
};

export type ConsultingScenarioKey = "base" | "upside" | "downside";

export const consultingScenarioPresets: Record<
  ConsultingScenarioKey,
  { label: string; assumptions: ConsultingAssumptions }
> = {
  base: {
    label: "Base",
    assumptions: {
      billableHeadcount: 40,
      utilizationPct: 0.72,
      averageBillRate: 185,
      pipelineConversionPct: 0.28,
      deliveryCostPct: 0.55,
      sgaPct: 0.22,
    },
  },
  upside: {
    label: "Upside",
    assumptions: {
      billableHeadcount: 44,
      utilizationPct: 0.8,
      averageBillRate: 205,
      pipelineConversionPct: 0.38,
      deliveryCostPct: 0.5,
      sgaPct: 0.19,
    },
  },
  downside: {
    label: "Downside",
    assumptions: {
      billableHeadcount: 36,
      utilizationPct: 0.6,
      averageBillRate: 170,
      pipelineConversionPct: 0.16,
      deliveryCostPct: 0.6,
      sgaPct: 0.26,
    },
  },
};

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
 * actually gets utilized. Utilization is capped by how much new pipeline
 * converts into signed work: pipelineConversionPct below the benchmark
 * leaves staff on the bench even at the entered target utilization, above
 * it the full target is achievable. With headcount and target utilization
 * held flat across the window, revenue and margins are flat month to
 * month — only cash moves, accumulating (or draining) monthly EBITDA.
 */
export function runConsultingForecast(
  assumptions: ConsultingAssumptions,
  baseline: ConsultingCompanyBaseline = meridianBaseline
): ConsultingForecastResult {
  const capacityHours = assumptions.billableHeadcount * STANDARD_BILLABLE_HOURS_PER_MONTH;
  const achievedUtilization = Math.min(
    assumptions.utilizationPct,
    assumptions.utilizationPct *
      (assumptions.pipelineConversionPct / PIPELINE_CONVERSION_BENCHMARK)
  );
  const billedHours = capacityHours * achievedUtilization;
  const netRevenue = billedHours * assumptions.averageBillRate;
  const deliveryCost = netRevenue * assumptions.deliveryCostPct;
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
  const runwayMonths = ebitda >= 0 ? null : baseline.startingCash / -ebitda;

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
// driver settings' month-1 vs month-12 net revenue is otherwise identical
// by construction; kept for interface symmetry with the other industries
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

export { classifyMargin, classifyRunway, decideStance };
export type { CashStatus, Decision, MarginStatus, RunwayStatus };

/**
 * Generates 2-3 short, deterministic reasons behind a decision — built from
 * the same runway/margin thresholds decideStance uses, plus achieved
 * utilization, which is this industry's own operating-health signal (the
 * SaaS engine uses ARR trend for the equivalent role).
 */
export function explainConsultingDecision(
  result: ConsultingForecastResult,
  decision: Decision
): string[] {
  const runway = result.runwayMonths;
  const margin = result.endingEBITDAMargin;
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

  if (margin > 0) {
    reasons.push(`EBITDA margin is positive (${(margin * 100).toFixed(1)}%)`);
  } else {
    reasons.push(`EBITDA margin is still negative (${(margin * 100).toFixed(1)}%)`);
  }

  const utilizationStatus = classifyUtilization(utilization);
  if (utilizationStatus === "Healthy") {
    reasons.push(`Achieved utilization is healthy (${(utilization * 100).toFixed(1)}%)`);
  } else if (utilizationStatus === "Watch") {
    reasons.push(
      `Achieved utilization is below target (${(utilization * 100).toFixed(1)}%) — pipeline conversion isn't fully keeping the bench booked`
    );
  } else {
    const suffix =
      decision !== "Invest for growth" ? "" : ", a risk despite the runway and margin picture";
    reasons.push(
      `Achieved utilization is weak (${(utilization * 100).toFixed(1)}%)${suffix}`
    );
  }

  return reasons;
}

/**
 * Key Risk / Next Action for the CFO Commentary panel — same fixed
 * priority order as the SaaS engine's equivalent (cash first, then
 * profitability, then this industry's own operating-health signal, then
 * top-line direction), tied to the same decideStance thresholds so the
 * commentary and the Recommendation banner can never disagree.
 */
export function buildConsultingRiskAndAction(
  result: ConsultingForecastResult
): { keyRiskPhrase: string; nextActionPhrase: string } {
  const runwayStatus = classifyRunway(result.runwayMonths);
  const marginStatus = classifyMargin(result.endingEBITDAMargin);
  const cashStatus = classifyConsultingCash(result.endingCash);
  const utilizationStatus = classifyUtilization(result.endingUtilization);
  const trendStatus = classifyConsultingTrend(result);

  let keyRiskPhrase: string;
  if (runwayStatus === "Critical") {
    keyRiskPhrase =
      "Runway has fallen below 12 months — cash exhaustion is the dominant risk if burn doesn't change.";
  } else if (cashStatus === "Low") {
    keyRiskPhrase =
      "Ending cash is tight relative to the starting balance, leaving little cushion for a downside surprise.";
  } else if (marginStatus === "Negative") {
    keyRiskPhrase =
      "EBITDA margin remains materially negative — delivery cost and SG&A aren't yet supported by billed revenue at this scale.";
  } else if (utilizationStatus === "Weak") {
    keyRiskPhrase =
      "Achieved utilization is weak — insufficient pipeline conversion is leaving significant bench time, the firm's main lever on profitability.";
  } else if (trendStatus === "Contracting") {
    keyRiskPhrase = "Net revenue is contracting over the window.";
  } else {
    keyRiskPhrase =
      "No metric is outside a healthy band at these assumptions — the main risk is an unmodeled external shock.";
  }

  const decision = decideStance(result.runwayMonths, result.endingEBITDAMargin);
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

export function classifyConsultingCash(
  endingCash: number,
  baseline: ConsultingCompanyBaseline = meridianBaseline
): CashStatus {
  return classifyCashRatio(endingCash, baseline.startingCash);
}

export type ConsultingDriverKey = keyof ConsultingAssumptions;

export const consultingDriverLabels: Record<ConsultingDriverKey, string> = {
  billableHeadcount: "Billable Headcount",
  utilizationPct: "Utilization",
  averageBillRate: "Average Bill Rate",
  pipelineConversionPct: "Pipeline Conversion",
  deliveryCostPct: "Delivery Cost %",
  sgaPct: "SG&A %",
};

export const CONSULTING_DRIVER_KEYS: ConsultingDriverKey[] = [
  "billableHeadcount",
  "utilizationPct",
  "averageBillRate",
  "pipelineConversionPct",
  "deliveryCostPct",
  "sgaPct",
];

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

  const rows = CONSULTING_DRIVER_KEYS.map((key) => {
    const bumped: ConsultingAssumptions = { ...assumptions, [key]: assumptions[key] * 1.1 };
    const bumpedResult = runConsultingForecast(bumped, baseline);
    const impact = consultingMetricValue(bumpedResult, metric) - baseValue;
    return { key, label: consultingDriverLabels[key], impact };
  });

  return rows.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

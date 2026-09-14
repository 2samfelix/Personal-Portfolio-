// Pure SaaS financial-planning engine. No React, no formatting, no UI
// concerns — every function here takes an assumptions object and returns a
// results object, so a chart or card component only ever displays numbers
// this engine already computed. This is what lets a future industry model
// (e.g. a subscription-retail or marketplace engine) drop in beside this one
// without touching any UI component.

export type SaaSCompanyBaseline = {
  name: string;
  startingARR: number;
  startingCustomers: number;
  annualArpu: number;
  startingCash: number;
};

// Fictional company used to seed the demo — disclosed in the UI as
// illustrative, not a real client.
export const northstarBaseline: SaaSCompanyBaseline = {
  name: "Northstar Software",
  startingARR: 2_000_000,
  startingCustomers: 600,
  annualArpu: 3_300,
  startingCash: 3_500_000,
};

// Modeling constants the engine needs but the brief didn't specify. Kept
// here (not hidden in a component) and surfaced in the UI as disclosed
// assumptions, since this whole tool is explicitly illustrative.
export const AVG_FULLY_LOADED_COST_PER_EMPLOYEE = 90_000; // $ / year
export const FIXED_GA_MONTHLY = 15_000; // $ / month

export type SaaSAssumptions = {
  monthlyGrowthRate: number; // e.g. 0.05 = 5% new customers/mo, relative to prior base
  monthlyChurnRate: number; // e.g. 0.015 = 1.5% churned/mo
  pricingChangePct: number; // one-time change applied to ARPU, e.g. 0.02 = +2%
  grossMarginPct: number; // e.g. 0.80 = 80%
  headcount: number; // heads, held constant across the 12-month window
  annualSalesMarketing: number; // $ / year
};

export type ScenarioKey = "base" | "upside" | "downside";

export const scenarioPresets: Record<
  ScenarioKey,
  { label: string; assumptions: SaaSAssumptions }
> = {
  base: {
    label: "Base",
    assumptions: {
      monthlyGrowthRate: 0.05,
      monthlyChurnRate: 0.015,
      pricingChangePct: 0.02,
      grossMarginPct: 0.8,
      headcount: 28, // 25 + 10%
      annualSalesMarketing: 750_000,
    },
  },
  upside: {
    label: "Upside",
    assumptions: {
      monthlyGrowthRate: 0.08,
      monthlyChurnRate: 0.01,
      pricingChangePct: 0.03,
      grossMarginPct: 0.8,
      headcount: 28, // 25 + 12%, rounded
      annualSalesMarketing: 750_000,
    },
  },
  downside: {
    label: "Downside",
    assumptions: {
      monthlyGrowthRate: 0.01,
      monthlyChurnRate: 0.025,
      pricingChangePct: 0,
      grossMarginPct: 0.8,
      headcount: 26, // 25 + 5%, rounded
      annualSalesMarketing: 750_000,
    },
  },
};

export type SaaSMonthResult = {
  month: number; // 1-12
  customers: number;
  mrr: number;
  arr: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  cash: number;
};

export type SaaSForecastResult = {
  months: SaaSMonthResult[];
  endingARR: number;
  endingEBITDAMargin: number; // ending-month EBITDA / ending-month revenue
  endingCash: number;
  runwayMonths: number | null; // null = cash-flow positive at ending run-rate
};

export function runSaaSForecast(
  assumptions: SaaSAssumptions,
  baseline: SaaSCompanyBaseline = northstarBaseline
): SaaSForecastResult {
  const adjustedAnnualArpu =
    baseline.annualArpu * (1 + assumptions.pricingChangePct);
  const monthlyHeadcountCost =
    (assumptions.headcount * AVG_FULLY_LOADED_COST_PER_EMPLOYEE) / 12;
  const monthlySalesMarketing = assumptions.annualSalesMarketing / 12;

  let customers = baseline.startingCustomers;
  let cash = baseline.startingCash;
  const months: SaaSMonthResult[] = [];

  for (let month = 1; month <= 12; month++) {
    const newCustomers = customers * assumptions.monthlyGrowthRate;
    const churnedCustomers = customers * assumptions.monthlyChurnRate;
    customers = customers + newCustomers - churnedCustomers;

    const mrr = customers * (adjustedAnnualArpu / 12);
    const arr = mrr * 12;
    const grossProfit = mrr * assumptions.grossMarginPct;
    const opex = monthlySalesMarketing + monthlyHeadcountCost + FIXED_GA_MONTHLY;
    const ebitda = grossProfit - opex;
    cash = cash + ebitda;

    months.push({ month, customers, mrr, arr, grossProfit, opex, ebitda, cash });
  }

  const last = months[months.length - 1];
  const endingEBITDAMargin = last.mrr === 0 ? 0 : last.ebitda / last.mrr;
  const runwayMonths =
    last.ebitda >= 0 ? null : Math.max(0, last.cash / Math.abs(last.ebitda));

  return {
    months,
    endingARR: last.arr,
    endingEBITDAMargin,
    endingCash: last.cash,
    runwayMonths,
  };
}

export type Decision = "Invest for growth" | "Run cautiously" | "Preserve cash";

export function decideStance(
  runwayMonths: number | null,
  endingEBITDAMargin: number
): Decision {
  const runway = runwayMonths ?? Infinity;
  if (runway > 18 && endingEBITDAMargin > 0) return "Invest for growth";
  if (runway >= 12) return "Run cautiously";
  return "Preserve cash";
}

/**
 * Generates 2-3 short, deterministic reasons behind a decision — built from
 * the same thresholds decideStance uses (runway, margin) plus the ARR trend
 * across the forecast window, never hard-coded per scenario.
 */
export function explainDecision(
  result: SaaSForecastResult,
  decision: Decision
): string[] {
  const runway = result.runwayMonths;
  const margin = result.endingEBITDAMargin;
  const first = result.months[0].arr;
  const last = result.months[result.months.length - 1].arr;
  const arrTrendPct = first === 0 ? 0 : (last - first) / first;

  const reasons: string[] = [];

  if (runway === null) {
    reasons.push(
      "The business is cash-flow positive at the ending run-rate — no runway ceiling applies"
    );
  } else if (runway > 18) {
    reasons.push(`Runway remains above 18 months (${runway.toFixed(1)} months)`);
  } else if (runway >= 12) {
    reasons.push(
      `Runway is in the 12–18 month caution band (${runway.toFixed(1)} months)`
    );
  } else {
    reasons.push(`Runway has fallen below 12 months (${runway.toFixed(1)} months)`);
  }

  if (margin > 0) {
    reasons.push(`EBITDA margin is positive (${(margin * 100).toFixed(1)}%)`);
  } else {
    reasons.push(`EBITDA margin is still negative (${(margin * 100).toFixed(1)}%)`);
  }

  if (arrTrendPct > 0.05) {
    const suffix = decision === "Preserve cash"
      ? ", but not fast enough to offset the burn"
      : margin <= 0
        ? " despite elevated burn"
        : "";
    reasons.push(
      `ARR continues to grow (+${(arrTrendPct * 100).toFixed(1)}% over the window)${suffix}`
    );
  } else if (arrTrendPct < -0.05) {
    reasons.push(
      `ARR is contracting (${(arrTrendPct * 100).toFixed(1)}% over the window) as churn outpaces new growth`
    );
  } else {
    reasons.push("ARR is roughly flat over the window");
  }

  return reasons;
}

export type ArrTrend = "Growing" | "Flat" | "Contracting";

// Thresholds: ARR change from month 1 to month 12 of the forecast window.
// >+5% = Growing, -5%..+5% = Flat, <-5% = Contracting.
export function classifyArrTrend(result: SaaSForecastResult): ArrTrend {
  const first = result.months[0].arr;
  const last = result.months[result.months.length - 1].arr;
  const trend = first === 0 ? 0 : (last - first) / first;
  if (trend > 0.05) return "Growing";
  if (trend < -0.05) return "Contracting";
  return "Flat";
}

export type MarginStatus = "Healthy" | "Watch" | "Negative";

// Thresholds: >0% = Healthy, -40%..0% = Watch, <-40% = Negative.
export function classifyMargin(endingEBITDAMargin: number): MarginStatus {
  if (endingEBITDAMargin > 0) return "Healthy";
  if (endingEBITDAMargin >= -0.4) return "Watch";
  return "Negative";
}

export type CashStatus = "Strong" | "Adequate" | "Low";

// Thresholds, ending cash relative to starting cash: >=90% = Strong,
// 50-90% = Adequate, <50% = Low.
export function classifyCash(
  endingCash: number,
  baseline: SaaSCompanyBaseline = northstarBaseline
): CashStatus {
  const pctOfStart = endingCash / baseline.startingCash;
  if (pctOfStart >= 0.9) return "Strong";
  if (pctOfStart >= 0.5) return "Adequate";
  return "Low";
}

export type RunwayStatus = "Safe" | "Watch" | "Critical" | "Self-funded";

// Thresholds: null (cash-flow positive) = Self-funded, >18mo = Safe,
// 12-18mo = Watch, <12mo = Critical.
export function classifyRunway(runwayMonths: number | null): RunwayStatus {
  if (runwayMonths === null) return "Self-funded";
  if (runwayMonths > 18) return "Safe";
  if (runwayMonths >= 12) return "Watch";
  return "Critical";
}

export type SensitivityDriverKey =
  | "monthlyGrowthRate"
  | "monthlyChurnRate"
  | "pricingChangePct"
  | "grossMarginPct"
  | "headcount"
  | "annualSalesMarketing";

export const sensitivityDriverLabels: Record<SensitivityDriverKey, string> = {
  monthlyGrowthRate: "Customer Growth Rate",
  monthlyChurnRate: "Churn Rate",
  pricingChangePct: "Pricing Change",
  grossMarginPct: "Gross Margin",
  headcount: "Headcount",
  annualSalesMarketing: "Sales & Marketing Spend",
};

export type SensitivityRow = {
  key: SensitivityDriverKey;
  label: string;
  range: number;
};

const SENSITIVITY_KEYS: SensitivityDriverKey[] = [
  "monthlyGrowthRate",
  "monthlyChurnRate",
  "pricingChangePct",
  "grossMarginPct",
  "headcount",
  "annualSalesMarketing",
];

/**
 * Flexes each driver +/-10% (relative) in isolation, holding the rest at the
 * given assumptions, and ranks by the resulting swing in ending-month EBITDA.
 * Returns only the top `limit` drivers — this is a compact ranked list, not a
 * full tornado chart.
 */
export function runSaaSSensitivity(
  assumptions: SaaSAssumptions,
  baseline: SaaSCompanyBaseline = northstarBaseline,
  flexPct = 0.1,
  limit = 3
): SensitivityRow[] {
  const rows: SensitivityRow[] = SENSITIVITY_KEYS.map((key) => {
    const upAssumptions: SaaSAssumptions = {
      ...assumptions,
      [key]: assumptions[key] * (1 + flexPct),
    };
    const downAssumptions: SaaSAssumptions = {
      ...assumptions,
      [key]: assumptions[key] * (1 - flexPct),
    };

    const upEbitda =
      runSaaSForecast(upAssumptions, baseline).months.at(-1)?.ebitda ?? 0;
    const downEbitda =
      runSaaSForecast(downAssumptions, baseline).months.at(-1)?.ebitda ?? 0;

    return {
      key,
      label: sensitivityDriverLabels[key],
      range: Math.abs(upEbitda - downEbitda),
    };
  }).sort((a, b) => b.range - a.range);

  return rows.slice(0, limit);
}

export function cumulativeEBITDA(result: SaaSForecastResult): number {
  return result.months.reduce((sum, m) => sum + m.ebitda, 0);
}

export type SensitivityDetail = {
  key: SensitivityDriverKey;
  label: string;
  baseValue: number;
  downValue: number;
  upValue: number;
  baseCumulativeEBITDA: number;
  downCumulativeEBITDA: number;
  upCumulativeEBITDA: number;
};

/**
 * Detail for a single sensitivity driver, on demand (e.g. an expanded row):
 * the driver's current value and the cumulative 12-month EBITDA impact of
 * flexing it +/-10%. Distinct from runSaaSSensitivity's ranking metric
 * (ending-month EBITDA swing) — this one sums EBITDA across the full year.
 */
export function getSensitivityDetail(
  assumptions: SaaSAssumptions,
  key: SensitivityDriverKey,
  baseline: SaaSCompanyBaseline = northstarBaseline,
  flexPct = 0.1
): SensitivityDetail {
  const upAssumptions: SaaSAssumptions = {
    ...assumptions,
    [key]: assumptions[key] * (1 + flexPct),
  };
  const downAssumptions: SaaSAssumptions = {
    ...assumptions,
    [key]: assumptions[key] * (1 - flexPct),
  };

  return {
    key,
    label: sensitivityDriverLabels[key],
    baseValue: assumptions[key],
    downValue: downAssumptions[key],
    upValue: upAssumptions[key],
    baseCumulativeEBITDA: cumulativeEBITDA(runSaaSForecast(assumptions, baseline)),
    downCumulativeEBITDA: cumulativeEBITDA(
      runSaaSForecast(downAssumptions, baseline)
    ),
    upCumulativeEBITDA: cumulativeEBITDA(runSaaSForecast(upAssumptions, baseline)),
  };
}

export type AssumptionDiff = {
  key: SensitivityDriverKey;
  label: string;
  fromValue: number;
  toValue: number;
  impactOnEndingEBITDA: number;
};

/**
 * The drivers where `current` differs from `base`, each swapped one-at-a-time
 * into Base to isolate its own effect on ending-month EBITDA, ranked by the
 * size of that effect. Returns at most `limit` — used to drive the "What
 * changed vs Base?" panel without the UI re-deriving any of this itself.
 */
export function diffFromBase(
  current: SaaSAssumptions,
  base: SaaSAssumptions = scenarioPresets.base.assumptions,
  baseline: SaaSCompanyBaseline = northstarBaseline,
  limit = 3
): AssumptionDiff[] {
  const baseEbitda =
    runSaaSForecast(base, baseline).months.at(-1)?.ebitda ?? 0;

  const diffs: AssumptionDiff[] = SENSITIVITY_KEYS.filter(
    (key) => current[key] !== base[key]
  ).map((key) => {
    const swapped: SaaSAssumptions = { ...base, [key]: current[key] };
    const swappedEbitda =
      runSaaSForecast(swapped, baseline).months.at(-1)?.ebitda ?? 0;
    return {
      key,
      label: sensitivityDriverLabels[key],
      fromValue: base[key],
      toValue: current[key],
      impactOnEndingEBITDA: swappedEbitda - baseEbitda,
    };
  });

  return diffs
    .sort((a, b) => Math.abs(b.impactOnEndingEBITDA) - Math.abs(a.impactOnEndingEBITDA))
    .slice(0, limit);
}

export type BaseComparison = {
  arrDelta: number;
  marginDeltaPts: number; // percentage points, e.g. -5.2
  cashDelta: number;
};

export function compareToBase(
  current: SaaSForecastResult,
  base: SaaSForecastResult
): BaseComparison {
  return {
    arrDelta: current.endingARR - base.endingARR,
    marginDeltaPts: (current.endingEBITDAMargin - base.endingEBITDAMargin) * 100,
    cashDelta: current.endingCash - base.endingCash,
  };
}

// Pure SaaS financial-planning engine. No React, no formatting, no UI
// concerns — every function here takes an assumptions object and returns a
// results object, so a chart or card component only ever displays numbers
// this engine already computed. This is what lets a future industry model
// (e.g. a subscription-retail or marketplace engine) drop in beside this one
// without touching any UI component.

import {
  classifyCashRatio,
  classifyMargin as sharedClassifyMargin,
  classifyRunway as sharedClassifyRunway,
  classifyTrend,
  decideStance as sharedDecideStance,
  type CashStatus as SharedCashStatus,
  type Decision as SharedDecision,
  type MarginStatus as SharedMarginStatus,
  type RunwayStatus as SharedRunwayStatus,
  type TrendStatus,
} from "./shared";

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
  monthlyChurnRate: number; // logo churn rate, e.g. 0.015 = 1.5% of customers/mo
  pricingChangePct: number; // applied to NEW-customer ARPU only, e.g. 0.02 = +2%
  grossMarginPct: number; // e.g. 0.80 = 80%
  headcount: number; // heads, held constant across the 12-month window
  annualSalesMarketing: number; // $ / year
  monthlyExpansionRate: number; // % of retained MRR that expands (upsell), e.g. 0.01 = 1%
  monthlyContractionRate: number; // % of retained MRR that contracts (downsell), e.g. 0.005 = 0.5%
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
      monthlyExpansionRate: 0.01,
      monthlyContractionRate: 0.005,
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
      monthlyExpansionRate: 0.015,
      monthlyContractionRate: 0.003,
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
      monthlyExpansionRate: 0.005,
      monthlyContractionRate: 0.01,
    },
  },
};

export type SaaSMonthResult = {
  month: number; // 1-12
  customers: number; // ending customers for this month
  mrr: number; // ending MRR for this month
  arr: number; // ending MRR x 12
  grossProfit: number;
  opex: number;
  ebitda: number;
  cash: number;
  // Monthly recurring-revenue bridge (see runSaaSForecast doc comment for the
  // modeling rules). Beginning-of-month figures roll forward from the prior
  // month's ending figures; month 1 begins from the company baseline.
  beginningCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  logoChurnRate: number; // churnedCustomers / beginningCustomers
  beginningMRR: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  // Net revenue retention using only the existing (non-new) customer base:
  // (beginningMRR + expansionMRR - contractionMRR - churnedMRR) / beginningMRR.
  // New MRR is deliberately excluded — see runSaaSSensitivityByMetric-adjacent
  // docs. This is a single month's NRR, not compounded/annualized.
  nrr: number;
};

export type SaaSForecastResult = {
  months: SaaSMonthResult[];
  endingARR: number;
  endingEBITDAMargin: number; // ending-month EBITDA / ending-month revenue
  endingCash: number;
  runwayMonths: number | null; // null = cash-flow positive at ending run-rate
  // Month 12's NRR — the figure shown as the "NRR" KPI in the UI.
  endingNRR: number;
  // Mean of the 12 monthly NRR values. Under this model, NRR is driven
  // entirely by the (constant) expansion/contraction/churn rates, so it is
  // mathematically identical to endingNRR every month — both are exposed so
  // a future version with time-varying retention rates doesn't need a new
  // field.
  averageNRR: number;
  // Blended Customer Acquisition Cost: total annual Sales & Marketing spend
  // divided by total new customers acquired across the 12-month window. Not
  // a new adjustable assumption — derived from existing ones (S&M spend,
  // growth rate) so it moves consistently with the rest of the model instead
  // of introducing an independent, possibly-inconsistent CAC input.
  cac: number;
  // Gross-margin-adjusted customer lifetime value:
  // (new-customer monthly ARPU x gross margin %) / monthly logo churn rate.
  // This is the standard "ARPU / churn" LTV approximation for a monthly
  // subscription model, gross-margin-adjusted so it's comparable to CAC in
  // gross-profit dollars rather than raw revenue dollars.
  ltv: number;
  ltvToCac: number;
};

/**
 * Monthly SaaS retention bridge, in the order the money actually moves:
 *   1. Logo churn removes a share of existing customers (and a proportional
 *      share of their MRR) from the beginning-of-month base.
 *   2. Expansion/contraction are then applied to the *retained* MRR only —
 *      a customer that churns this month cannot also expand or contract in
 *      the same month.
 *   3. New customers arrive at "new customer ARPU" (the pricing-adjusted
 *      ARPU) and add New MRR on top.
 * Ending MRR = Beginning MRR + New MRR + Expansion MRR - Contraction MRR
 *              - Churned MRR, reconciling exactly with the customer-count
 *              roll-forward (Beginning + New - Churned = Ending) because
 *              churnedMRR/beginningMRR == churnedCustomers/beginningCustomers
 *              by construction.
 *
 * Modeling choice, stated explicitly: `pricingChangePct` now reprices only
 * NEW customers (a "grandfathered pricing" model) — existing customers'
 * revenue moves only through expansion/contraction/churn, never through a
 * blanket ARPU change. This is more realistic than uniformly repricing the
 * whole base, but it does mean Pricing Change has less leverage over the
 * forecast than in the pre-retention-bridge model.
 */
export function runSaaSForecast(
  assumptions: SaaSAssumptions,
  baseline: SaaSCompanyBaseline = northstarBaseline
): SaaSForecastResult {
  const newCustomerAnnualArpu =
    baseline.annualArpu * (1 + assumptions.pricingChangePct);
  const monthlyHeadcountCost =
    (assumptions.headcount * AVG_FULLY_LOADED_COST_PER_EMPLOYEE) / 12;
  const monthlySalesMarketing = assumptions.annualSalesMarketing / 12;

  let customers = baseline.startingCustomers;
  let mrr = baseline.startingCustomers * (baseline.annualArpu / 12);
  let cash = baseline.startingCash;
  const months: SaaSMonthResult[] = [];

  for (let month = 1; month <= 12; month++) {
    const beginningCustomers = customers;
    const beginningMRR = mrr;

    const newCustomers = beginningCustomers * assumptions.monthlyGrowthRate;
    const churnedCustomers = beginningCustomers * assumptions.monthlyChurnRate;
    const logoChurnRate =
      beginningCustomers === 0 ? 0 : churnedCustomers / beginningCustomers;

    const newMRR = newCustomers * (newCustomerAnnualArpu / 12);
    const churnedMRR = beginningMRR * assumptions.monthlyChurnRate;
    const retainedMRR = beginningMRR - churnedMRR;
    const expansionMRR = retainedMRR * assumptions.monthlyExpansionRate;
    const contractionMRR = retainedMRR * assumptions.monthlyContractionRate;

    const endingMRR =
      beginningMRR + newMRR + expansionMRR - contractionMRR - churnedMRR;
    const endingCustomers = beginningCustomers + newCustomers - churnedCustomers;
    const nrr =
      beginningMRR === 0
        ? 1
        : (beginningMRR + expansionMRR - contractionMRR - churnedMRR) / beginningMRR;

    const arr = endingMRR * 12;
    const grossProfit = endingMRR * assumptions.grossMarginPct;
    const opex = monthlySalesMarketing + monthlyHeadcountCost + FIXED_GA_MONTHLY;
    const ebitda = grossProfit - opex;
    cash = cash + ebitda;

    months.push({
      month,
      customers: endingCustomers,
      mrr: endingMRR,
      arr,
      grossProfit,
      opex,
      ebitda,
      cash,
      beginningCustomers,
      newCustomers,
      churnedCustomers,
      logoChurnRate,
      beginningMRR,
      newMRR,
      expansionMRR,
      contractionMRR,
      churnedMRR,
      nrr,
    });

    customers = endingCustomers;
    mrr = endingMRR;
  }

  const last = months[months.length - 1];
  const endingEBITDAMargin = last.mrr === 0 ? 0 : last.ebitda / last.mrr;
  const runwayMonths =
    last.ebitda >= 0 ? null : Math.max(0, last.cash / Math.abs(last.ebitda));
  const averageNRR = months.reduce((sum, m) => sum + m.nrr, 0) / months.length;

  const totalNewCustomers = months.reduce((sum, m) => sum + m.newCustomers, 0);
  const cac =
    totalNewCustomers === 0 ? 0 : assumptions.annualSalesMarketing / totalNewCustomers;
  const ltv =
    assumptions.monthlyChurnRate === 0
      ? 0
      : ((newCustomerAnnualArpu / 12) * assumptions.grossMarginPct) /
        assumptions.monthlyChurnRate;
  const ltvToCac = cac === 0 ? 0 : ltv / cac;

  return {
    months,
    endingARR: last.arr,
    endingEBITDAMargin,
    endingCash: last.cash,
    runwayMonths,
    endingNRR: last.nrr,
    averageNRR,
    cac,
    ltv,
    ltvToCac,
  };
}

// Decision framework lives in shared.ts — it depends only on runway and
// EBITDA margin, concepts every industry model produces, not SaaS-specific
// math. Re-exported here so existing imports from "@/lib/models/saas" don't
// need to change.
export type Decision = SharedDecision;
export const decideStance = sharedDecideStance;

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

// ArrTrend is a SaaS-flavored name for the shared TrendStatus concept — kept
// as its own type/function pair (rather than exporting TrendStatus directly)
// so existing imports of "ArrTrend" from this module keep working unchanged.
export type ArrTrend = TrendStatus;

// Thresholds: ARR change from month 1 to month 12 of the forecast window.
// >+5% = Growing, -5%..+5% = Flat, <-5% = Contracting. (See shared.ts.)
export function classifyArrTrend(result: SaaSForecastResult): ArrTrend {
  const first = result.months[0].arr;
  const last = result.months[result.months.length - 1].arr;
  return classifyTrend(first, last);
}

// Margin/runway classification live in shared.ts — both depend only on
// numbers every industry model produces.
export type MarginStatus = SharedMarginStatus;
export const classifyMargin = sharedClassifyMargin;

export type CashStatus = SharedCashStatus;

// Thresholds, ending cash relative to starting cash: >=90% = Strong,
// 50-90% = Adequate, <50% = Low. (See shared.ts.)
export function classifyCash(
  endingCash: number,
  baseline: SaaSCompanyBaseline = northstarBaseline
): CashStatus {
  return classifyCashRatio(endingCash, baseline.startingCash);
}

export type RunwayStatus = SharedRunwayStatus;
export const classifyRunway = sharedClassifyRunway;

export type NRRStatus = "Strong" | "Healthy" | "Watch" | "Weak";

// Thresholds: >=110% = Strong, 100-110% = Healthy, 90-100% = Watch, <90% = Weak.
export function classifyNRR(nrr: number): NRRStatus {
  if (nrr >= 1.1) return "Strong";
  if (nrr >= 1.0) return "Healthy";
  if (nrr >= 0.9) return "Watch";
  return "Weak";
}

export type LtvCacStatus = "Healthy" | "Watch" | "Weak";

// Thresholds: >=3.0x = Healthy, 2.0-3.0x = Watch, <2.0x = Weak.
export function classifyLtvToCac(ltvToCac: number): LtvCacStatus {
  if (ltvToCac >= 3) return "Healthy";
  if (ltvToCac >= 2) return "Watch";
  return "Weak";
}

export type SensitivityDriverKey =
  | "monthlyGrowthRate"
  | "monthlyChurnRate"
  | "pricingChangePct"
  | "grossMarginPct"
  | "headcount"
  | "annualSalesMarketing"
  | "monthlyExpansionRate"
  | "monthlyContractionRate";

export const sensitivityDriverLabels: Record<SensitivityDriverKey, string> = {
  monthlyGrowthRate: "Customer Growth Rate",
  monthlyChurnRate: "Churn Rate",
  pricingChangePct: "Pricing Change",
  grossMarginPct: "Gross Margin",
  headcount: "Headcount",
  annualSalesMarketing: "Sales & Marketing Spend",
  monthlyExpansionRate: "Expansion Rate",
  monthlyContractionRate: "Contraction Rate",
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
  "monthlyExpansionRate",
  "monthlyContractionRate",
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

export type SensitivityMetric = "ebitda" | "revenue" | "cash" | "ltvToCac";

function metricValue(result: SaaSForecastResult, metric: SensitivityMetric): number {
  switch (metric) {
    case "ebitda":
      return result.months[result.months.length - 1].ebitda;
    case "revenue":
      return result.endingARR;
    case "cash":
      return result.endingCash;
    case "ltvToCac":
      return result.ltvToCac;
  }
}

export type SensitivityImpactRow = {
  key: SensitivityDriverKey;
  label: string;
  impact: number; // metric value at +10% minus the metric's base value
  // Only populated for the "cash" metric, and only when both the base and
  // the +10% case have finite runway (neither is cash-flow positive).
  runwayImpactMonths?: number;
};

/**
 * Ranks the six drivers by the dollar (or month) impact of flexing each one
 * +10% in isolation, for a chosen headline metric (EBITDA, Revenue/ARR, or
 * Cash). Every row is a full engine rerun via runSaaSForecast — no shortcut
 * math — so this stays consistent with every other number in the app.
 */
export function runSaaSSensitivityByMetric(
  assumptions: SaaSAssumptions,
  metric: SensitivityMetric,
  baseline: SaaSCompanyBaseline = northstarBaseline,
  flexPct = 0.1,
  limit = 5
): SensitivityImpactRow[] {
  const baseResult = runSaaSForecast(assumptions, baseline);
  const baseValue = metricValue(baseResult, metric);

  const rows: SensitivityImpactRow[] = SENSITIVITY_KEYS.map((key) => {
    const upAssumptions: SaaSAssumptions = {
      ...assumptions,
      [key]: assumptions[key] * (1 + flexPct),
    };
    const upResult = runSaaSForecast(upAssumptions, baseline);
    const row: SensitivityImpactRow = {
      key,
      label: sensitivityDriverLabels[key],
      impact: metricValue(upResult, metric) - baseValue,
    };
    if (
      metric === "cash" &&
      baseResult.runwayMonths !== null &&
      upResult.runwayMonths !== null
    ) {
      row.runwayImpactMonths = upResult.runwayMonths - baseResult.runwayMonths;
    }
    return row;
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return rows.slice(0, limit);
}

export type CfoCommentaryData = {
  endingARR: number;
  startingARR: number;
  arrGrowthPct: number;
  arrTrendPhrase: string;
  endingEBITDAMargin: number;
  marginPhrase: string;
  endingCash: number;
  runwayMonths: number | null;
  cashHealthPhrase: string;
  endingNRR: number;
  nrrPhrase: string;
  growthDriverPhrase: string;
  cac: number;
  ltv: number;
  ltvToCac: number;
  ltvCacPhrase: string;
};

/**
 * Deterministic building blocks for the CFO Commentary panel: real numbers
 * plus a qualitative phrase chosen from the same classify* thresholds used
 * elsewhere, for each of Performance / Profitability / Cash Position /
 * Retention. This is template selection, not currency formatting — the UI
 * still owns turning `endingARR` etc. into "$4.81M", keeping formatting out
 * of the engine.
 */
export function buildCfoCommentaryData(
  result: SaaSForecastResult,
  baseline: SaaSCompanyBaseline = northstarBaseline
): CfoCommentaryData {
  const arrTrend = classifyArrTrend(result);
  const marginStatus = classifyMargin(result.endingEBITDAMargin);
  const cashStatus = classifyCash(result.endingCash, baseline);
  const nrrStatus = classifyNRR(result.endingNRR);

  const arrTrendPhrase: Record<ArrTrend, string> = {
    Growing: "reflecting strong customer growth",
    Flat: "reflecting a roughly flat customer base",
    Contracting: "reflecting customer losses outpacing new growth",
  };

  const marginPhrase: Record<MarginStatus, string> = {
    Healthy: "moving the business into positive operating profitability",
    Watch: "keeping the business close to breakeven but still burning cash",
    Negative: "leaving the business materially unprofitable at the current cost base",
  };

  const cashHealthPhrase: Record<CashStatus, string> = {
    Strong: "healthy",
    Adequate: "adequate",
    Low: "tight",
  };

  const nrrPhrase: Record<NRRStatus, string> = {
    Strong: "with expansion revenue significantly outweighing contraction and churn within the existing customer base",
    Healthy: "with expansion revenue outweighing contraction and churn within the existing customer base",
    Watch: "as contraction and churn outweigh expansion within the existing customer base",
    Weak: "as churn and contraction are eroding the existing customer base faster than expansion can offset",
  };

  const ltvCacStatus = classifyLtvToCac(result.ltvToCac);
  const ltvCacPhrase: Record<LtvCacStatus, string> = {
    Healthy: "acquiring customers efficiently relative to their lifetime value",
    Watch: "acquiring customers at a cost that leaves a thinner-than-ideal margin of safety against lifetime value",
    Weak: "spending more to acquire customers than their lifetime value comfortably supports",
  };

  const totalNewMRR = result.months.reduce((sum, m) => sum + m.newMRR, 0);
  const totalExpansionMRR = result.months.reduce((sum, m) => sum + m.expansionMRR, 0);
  let growthDriverPhrase: string;
  if (totalNewMRR > totalExpansionMRR * 1.5) {
    growthDriverPhrase = "primarily by new customer acquisition rather than expansion";
  } else if (totalExpansionMRR > totalNewMRR * 1.5) {
    growthDriverPhrase = "primarily by expansion within the existing base rather than new logos";
  } else {
    growthDriverPhrase = "by a mix of new customer acquisition and expansion within the existing base";
  }

  return {
    endingARR: result.endingARR,
    startingARR: baseline.startingARR,
    arrGrowthPct:
      baseline.startingARR === 0
        ? 0
        : (result.endingARR - baseline.startingARR) / baseline.startingARR,
    arrTrendPhrase: arrTrendPhrase[arrTrend],
    endingEBITDAMargin: result.endingEBITDAMargin,
    marginPhrase: marginPhrase[marginStatus],
    endingCash: result.endingCash,
    runwayMonths: result.runwayMonths,
    cashHealthPhrase: cashHealthPhrase[cashStatus],
    endingNRR: result.endingNRR,
    nrrPhrase: nrrPhrase[nrrStatus],
    growthDriverPhrase,
    cac: result.cac,
    ltv: result.ltv,
    ltvToCac: result.ltvToCac,
    ltvCacPhrase: ltvCacPhrase[ltvCacStatus],
  };
}

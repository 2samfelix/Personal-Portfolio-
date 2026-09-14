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

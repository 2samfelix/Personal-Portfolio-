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
  formatPct,
  formatUsdCompact,
  type BadgeTone,
  type CashStatus as SharedCashStatus,
  type ChartConfig,
  type Decision as SharedDecision,
  type DriverConfig,
  type MarginStatus as SharedMarginStatus,
  type RunwayStatus as SharedRunwayStatus,
  type TrendStatus,
} from "./shared";

// Baseline now holds only what isn't a driver: the company name (cosmetic)
// and starting cash. Starting customers and ARPU used to be hardcoded here,
// out of the user's reach — they're now real drivers below.
export type SaaSCompanyBaseline = {
  name: string;
  startingCash: number;
};

// Modeling constants the engine needs but that aren't drivers — disclosed
// here, not hidden in a component, since this whole tool is illustrative.
// STARTING_CASH is deliberately modest (not "however much a funded startup
// would have") so that a genuinely bad Downside can actually run the
// business out of cash within the 12-month window — a larger cushion would
// make the Critical-runway/Depleted-cash decision branches undemonstrable
// no matter how bad the operating assumptions get, since Base is
// EBITDA-positive and never touches this cushion at all.
export const STARTING_CASH = 1_800_000;
// Headcount is no longer a slider — Sales & Marketing spend is now derived
// from CAC x new customers acquired (see runSaaSForecast), so the only
// remaining fixed opex is headcount and G&A, both disclosed as constants.
export const FIXED_HEADCOUNT = 10; // heads, held constant across the window
export const AVG_FULLY_LOADED_COST_PER_EMPLOYEE = 90_000; // $ / year
export const FIXED_GA_MONTHLY = 15_000; // $ / month
// Expansion/contraction are no longer user-adjustable drivers (SaaS keeps
// exactly 6: see SAAS_DRIVERS below) but the retention bridge, MRR Bridge
// chart, and NRR trend still need them, so they're fixed constants here.
export const EXPANSION_RATE_CONSTANT = 0.01; // % of retained MRR that expands (upsell)
export const CONTRACTION_RATE_CONSTANT = 0.005; // % of retained MRR that contracts (downsell)

export const northstarBaseline: SaaSCompanyBaseline = {
  name: "Northstar Software",
  startingCash: STARTING_CASH,
};

export type SaaSAssumptions = {
  startingCustomers: number; // customers today — a starting fact, not a forward assumption
  avgMrrPerCustomer: number; // $ / customer / month, applies to the whole book (existing + new)
  monthlyGrowthRate: number; // e.g. 0.035 = 3.5% new customers/mo, relative to prior base
  monthlyChurnRate: number; // logo churn rate, e.g. 0.015 = 1.5% of customers/mo
  cac: number; // $ per new customer acquired (blended); S&M spend = cac x new customers
  grossMarginPct: number; // e.g. 0.78 = 78%
};

export type SaaSDriverKey = keyof SaaSAssumptions;

// The 6 SaaS drivers — exactly these, each moving at least one displayed
// output and none moving an output it shouldn't (see the driver-to-output
// dependency map in the accompanying writeup). Sliders are rendered by
// mapping over this array; there is no separate hardcoded slider list.
export const SAAS_DRIVERS: DriverConfig<SaaSDriverKey>[] = [
  { key: "startingCustomers", label: "Starting Customers", unit: "count", min: 100, max: 3000, step: 10 },
  { key: "avgMrrPerCustomer", label: "Avg MRR per Customer", unit: "currency", min: 50, max: 800, step: 5 },
  { key: "monthlyGrowthRate", label: "Monthly Growth % (new customers)", unit: "percent", min: 0, max: 0.15, step: 0.005 },
  { key: "monthlyChurnRate", label: "Monthly Churn %", unit: "percent", min: 0, max: 0.08, step: 0.001 },
  { key: "cac", label: "Customer CAC", unit: "currency", min: 500, max: 8000, step: 50 },
  { key: "grossMarginPct", label: "Gross Margin %", unit: "percent", min: 0.4, max: 0.95, step: 0.01 },
];

const DRIVER_BOUNDS = new Map(SAAS_DRIVERS.map((d) => [d.key, d]));

function clampToDriverBounds(key: SaaSDriverKey, value: number): number {
  const driver = DRIVER_BOUNDS.get(key)!;
  return Math.min(driver.max, Math.max(driver.min, value));
}

export type SaaSScenarioKey = "base" | "upside" | "downside";

// Base is whatever the sliders currently say — these are only the
// starting/default values shown on first load, not a fixed preset the
// sliders snap back to.
export const SAAS_BASE_DEFAULTS: SaaSAssumptions = {
  startingCustomers: 600,
  avgMrrPerCustomer: 300,
  monthlyGrowthRate: 0.035,
  monthlyChurnRate: 0.015,
  cac: 3_200,
  grossMarginPct: 0.78,
};

// Signed, directionally-aware per-driver deltas applied to Base to produce
// Upside/Downside. A driver where higher is better (ARPU, growth, gross
// margin) moves up in Upside and down in Downside; a driver where higher is
// worse (churn, CAC) moves the opposite way — never a blanket +/-X% on
// every driver. startingCustomers is omitted (delta 0 in both directions):
// it's the company's starting point today, not a forward-looking
// assumption a scenario should stress.
export const SAAS_SCENARIO_DELTAS: Record<
  Exclude<SaaSScenarioKey, "base">,
  Partial<Record<SaaSDriverKey, number>>
> = {
  upside: {
    avgMrrPerCustomer: 30,
    monthlyGrowthRate: 0.015,
    monthlyChurnRate: -0.002,
    cac: -400,
    grossMarginPct: 0.03,
  },
  downside: {
    avgMrrPerCustomer: -20,
    monthlyGrowthRate: -0.015,
    monthlyChurnRate: 0.025,
    cac: 1_800,
    grossMarginPct: -0.08,
  },
};

/**
 * Base + this scenario's signed delta table, each driver clamped to its own
 * slider bounds. If every delta in the table were 0, this returns Base
 * unchanged for every scenario — the required "all three lines collapse
 * onto one" property when deltas are zeroed out.
 */
export function applySaaSScenario(
  base: SaaSAssumptions,
  scenario: SaaSScenarioKey
): SaaSAssumptions {
  if (scenario === "base") return base;
  const delta = SAAS_SCENARIO_DELTAS[scenario];
  const out: SaaSAssumptions = { ...base };
  (Object.keys(delta) as SaaSDriverKey[]).forEach((key) => {
    out[key] = clampToDriverBounds(key, base[key] + (delta[key] ?? 0));
  });
  return out;
}

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
  // New MRR is deliberately excluded. This is a single month's NRR, not
  // compounded/annualized.
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
  // entirely by the (constant) expansion/contraction rates and the churn
  // driver, so it is mathematically identical to endingNRR every month —
  // both are exposed so a future version with time-varying retention rates
  // doesn't need a new field.
  averageNRR: number;
  // Customer Acquisition Cost — a direct driver now (see SaaSAssumptions),
  // not derived from spend / customers. Echoed back here so every place
  // that reads a SaaSForecastResult has it without also needing the
  // assumptions object.
  cac: number;
  // Gross-margin-adjusted customer lifetime value:
  // (avg MRR per customer x gross margin %) / monthly logo churn rate. This
  // is the standard "ARPU / churn" LTV approximation for a monthly
  // subscription model, gross-margin-adjusted so it's comparable to CAC in
  // gross-profit dollars rather than raw revenue dollars. Churn is used
  // directly (monthly), never annualized — 1 / monthlyChurnRate is the
  // expected customer lifetime in months.
  ltv: number;
  ltvToCac: number;
};

/**
 * Monthly SaaS retention bridge, in the order the money actually moves:
 *   1. Logo churn removes a share of existing customers (and a proportional
 *      share of their MRR) from the beginning-of-month base.
 *   2. Expansion/contraction (fixed model constants, not drivers) are then
 *      applied to the *retained* MRR only — a customer that churns this
 *      month cannot also expand or contract in the same month.
 *   3. New customers arrive at the same avg-MRR-per-customer rate as the
 *      existing book and add New MRR on top.
 * Ending MRR = Beginning MRR + New MRR + Expansion MRR - Contraction MRR
 *              - Churned MRR, reconciling exactly with the customer-count
 *              roll-forward (Beginning + New - Churned = Ending) because
 *              churnedMRR/beginningMRR == churnedCustomers/beginningCustomers
 *              by construction.
 *
 * Sales & Marketing spend is derived, not a driver: monthly S&M = CAC x new
 * customers acquired that month. This is the causally correct direction
 * (spend follows from how many customers you're buying, at what cost each)
 * and is what makes CAC an independent, directly-tunable input instead of
 * something that swings unpredictably with the growth rate.
 */
export function runSaaSForecast(
  assumptions: SaaSAssumptions,
  baseline: SaaSCompanyBaseline = northstarBaseline
): SaaSForecastResult {
  let customers = assumptions.startingCustomers;
  let mrr = assumptions.startingCustomers * assumptions.avgMrrPerCustomer;
  let cash = baseline.startingCash;
  const months: SaaSMonthResult[] = [];

  for (let month = 1; month <= 12; month++) {
    const beginningCustomers = customers;
    const beginningMRR = mrr;

    const newCustomers = beginningCustomers * assumptions.monthlyGrowthRate;
    const churnedCustomers = beginningCustomers * assumptions.monthlyChurnRate;
    const logoChurnRate =
      beginningCustomers === 0 ? 0 : churnedCustomers / beginningCustomers;

    const newMRR = newCustomers * assumptions.avgMrrPerCustomer;
    const churnedMRR = beginningMRR * assumptions.monthlyChurnRate;
    const retainedMRR = beginningMRR - churnedMRR;
    const expansionMRR = retainedMRR * EXPANSION_RATE_CONSTANT;
    const contractionMRR = retainedMRR * CONTRACTION_RATE_CONSTANT;

    const endingMRR =
      beginningMRR + newMRR + expansionMRR - contractionMRR - churnedMRR;
    const endingCustomers = beginningCustomers + newCustomers - churnedCustomers;
    const nrr =
      beginningMRR === 0
        ? 1
        : (beginningMRR + expansionMRR - contractionMRR - churnedMRR) / beginningMRR;

    const arr = endingMRR * 12;
    const grossProfit = endingMRR * assumptions.grossMarginPct;
    const monthlySalesMarketing = assumptions.cac * newCustomers;
    const monthlyHeadcountCost = (FIXED_HEADCOUNT * AVG_FULLY_LOADED_COST_PER_EMPLOYEE) / 12;
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

  const cac = assumptions.cac;
  const ltv =
    assumptions.monthlyChurnRate === 0
      ? 0
      : (assumptions.avgMrrPerCustomer * assumptions.grossMarginPct) /
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

// Thresholds, ending cash relative to starting cash — see
// classifyCashRatio in shared.ts for the 4 bands (Strong/Adequate/Low/
// Depleted).
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

const ARR_TREND_TONE: Record<ArrTrend, BadgeTone> = {
  Growing: "good",
  Flat: "neutral",
  Contracting: "bad",
};

const NRR_STATUS_TONE: Record<NRRStatus, BadgeTone> = {
  Strong: "good",
  Healthy: "good",
  Watch: "neutral",
  Weak: "bad",
};

const RUNWAY_STATUS_TONE: Record<RunwayStatus, BadgeTone> = {
  Safe: "good",
  "Self-funded": "good",
  Watch: "neutral",
  Critical: "bad",
};

/**
 * The three SaaS charts (exactly these, in this order — see SAAS_DRIVERS
 * for the equivalent contract on sliders). Each chart's badge reuses an
 * existing classify* threshold (never a new band invented for the
 * presentation layer), and its alert line is derived from that same
 * classification value, so the two can never disagree.
 */
export const SAAS_CHARTS: ChartConfig<SaaSForecastResult, SaaSAssumptions>[] = [
  {
    key: "mrrGrowth",
    chartLabel: "MRR Growth",
    statLabel: "MRR",
    valueFormat: { kind: "currency" },
    ariaLabel: "12-month MRR forecast under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.mrr),
    getCaption: (result) => {
      const first = result.months[0].mrr;
      const last = result.months[result.months.length - 1].mrr;
      const trend = classifyTrend(first, last);
      const tone = ARR_TREND_TONE[trend];
      const pctChange = first === 0 ? 0 : ((last - first) / first) * 100;
      const totalNewMRR = result.months.reduce((sum, m) => sum + m.newMRR, 0);
      const totalExpansionMRR = result.months.reduce((sum, m) => sum + m.expansionMRR, 0);
      const driverPhrase =
        totalNewMRR > totalExpansionMRR * 1.5
          ? "new customer acquisition outpacing churn"
          : totalExpansionMRR > totalNewMRR * 1.5
            ? "expansion within the existing customer base outpacing churn"
            : "a mix of new customer acquisition and expansion outpacing churn";

      let alertLead: string;
      let alertExplanation: string;
      if (trend === "Growing") {
        alertLead = "MRR is growing.";
        alertExplanation = `Monthly recurring revenue rose to ${formatUsdCompact(last)} by Month 12, up ${pctChange.toFixed(1)}% from ${formatUsdCompact(first)}. Growth is driven by ${driverPhrase}.`;
      } else if (trend === "Flat") {
        alertLead = "MRR is roughly flat.";
        alertExplanation = `Monthly recurring revenue is little changed at ${formatUsdCompact(last)}, versus ${formatUsdCompact(first)} at the start of the window — new and expansion revenue are roughly offsetting churn.`;
      } else {
        alertLead = "MRR is declining.";
        alertExplanation = `Monthly recurring revenue fell to ${formatUsdCompact(last)} by Month 12, down ${Math.abs(pctChange).toFixed(1)}% from ${formatUsdCompact(first)}. Churn is outpacing new and expansion revenue.`;
      }
      return { badge: { label: trend, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Monthly recurring revenue (MRR) is the subscription revenue run-rate at a point in time. A healthy SaaS business grows MRR faster than it loses it to churn; a declining line means customer losses are outpacing new sales and expansion within the existing base.",
  },
  {
    key: "nrr",
    chartLabel: "Net Revenue Retention",
    statLabel: "NRR",
    valueFormat: { kind: "percent", digits: 1 },
    ariaLabel: "12-month net revenue retention trend under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.nrr),
    getCaption: (result, assumptions) => {
      const status = classifyNRR(result.endingNRR);
      const tone = NRR_STATUS_TONE[status];
      const churnPct = formatPct(assumptions.monthlyChurnRate, 1);
      const nrrPct = formatPct(result.endingNRR, 1);

      let alertLead: string;
      let alertExplanation: string;
      if (status === "Strong" || status === "Healthy") {
        alertLead = status === "Strong" ? "Net revenue retention is strong." : "Net revenue retention is healthy.";
        alertExplanation = `NRR sits at ${nrrPct} against the existing customer base — the fixed expansion assumption is outweighing a ${churnPct} monthly churn rate and contraction.`;
      } else if (status === "Watch") {
        alertLead = "Net revenue retention is in a watch band.";
        alertExplanation = `NRR sits at ${nrrPct} against the existing customer base — a ${churnPct} monthly churn rate is currently outweighing the fixed expansion assumption, though not by a wide margin.`;
      } else {
        alertLead = "Net revenue retention is weak.";
        alertExplanation = `NRR sits at ${nrrPct} against the existing customer base — a ${churnPct} monthly churn rate is eroding it faster than the fixed expansion assumption can offset.`;
      }
      return { badge: { label: status, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Net revenue retention (NRR) measures revenue kept from the existing customer base alone — expansion and contraction within that base, net of churn, excluding new logos. Above 100% means the existing base is growing on its own; below 100% means churn and contraction are shrinking it even before counting new sales.",
  },
  {
    key: "cashRunway",
    chartLabel: "Cash Runway",
    statLabel: "Cash",
    valueFormat: { kind: "currency" },
    ariaLabel: "12-month cash balance forecast under Base, Upside, and Downside scenarios",
    getSeries: (result) => result.months.map((m) => m.cash),
    getCaption: (result) => {
      const status = classifyRunway(result.runwayMonths);
      const tone = RUNWAY_STATUS_TONE[status];
      const endingCash = result.endingCash;

      let alertLead: string;
      let alertExplanation: string;
      if (endingCash < 0) {
        alertLead = "Cash has run out.";
        alertExplanation = `Ending cash is ${formatUsdCompact(endingCash)} — the business has burned through its full starting cash cushion within the window.`;
      } else if (status === "Self-funded") {
        alertLead = "Cash is self-funding.";
        alertExplanation = `The business is cash-flow positive at the ending run-rate, closing at ${formatUsdCompact(endingCash)} — no runway ceiling applies.`;
      } else if (status === "Safe") {
        alertLead = "Runway is comfortable.";
        alertExplanation = `At ${(result.runwayMonths ?? 0).toFixed(1)} months of runway and ${formatUsdCompact(endingCash)} ending cash, burn is well covered by the starting cushion.`;
      } else if (status === "Watch") {
        alertLead = "Runway is in a caution band.";
        alertExplanation = `At ${(result.runwayMonths ?? 0).toFixed(1)} months of runway and ${formatUsdCompact(endingCash)} ending cash, the cushion is adequate for now but worth watching if burn doesn't improve.`;
      } else {
        alertLead = "Runway is critical.";
        alertExplanation = `At ${(result.runwayMonths ?? 0).toFixed(1)} months of runway and ${formatUsdCompact(endingCash)} ending cash, burn would exhaust the cushion well within a year at the current rate.`;
      }
      return { badge: { label: status, tone }, alertTone: tone, alertLead, alertExplanation };
    },
    explainer:
      "Cash runway is how long the business can keep operating at its current burn rate before running out of money. A business that's cash-flow positive has no runway ceiling; a shrinking runway means the starting cash cushion is being spent down faster than it's being replenished.",
  },
];

export type SensitivityDriverKey = SaaSDriverKey;

export const sensitivityDriverLabels: Record<SensitivityDriverKey, string> = Object.fromEntries(
  SAAS_DRIVERS.map((d) => [d.key, d.label])
) as Record<SensitivityDriverKey, string>;

const SENSITIVITY_KEYS: SensitivityDriverKey[] = SAAS_DRIVERS.map((d) => d.key);

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
 * +10% in isolation, for a chosen headline metric (EBITDA, Revenue/ARR,
 * Cash, or LTV/CAC). Every row is a full engine rerun via runSaaSForecast —
 * no shortcut math — so this stays consistent with every other number in
 * the app.
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
  keyRiskPhrase: string;
  nextActionPhrase: string;
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
    Strong: "reflecting strong, durable operating profitability",
    Profitable: "reflecting solid operating profitability",
    NearBreakeven: "keeping the business only modestly profitable, just above breakeven",
    ApproachingBreakeven: "leaving the business still loss-making, though approaching breakeven",
    MateriallyUnprofitable: "leaving the business materially unprofitable at the current cost base",
  };

  const cashHealthPhrase: Record<CashStatus, string> = {
    Strong: "healthy",
    Adequate: "adequate",
    Low: "tight",
    Depleted: "depleted",
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
  // A very high ratio is a caution, not automatically a win: a ratio this
  // high more plausibly reflects under-investment in acquisition (spending
  // too little to grow as fast as the unit economics would support) or the
  // model's simplified assumptions than a genuinely elite efficiency
  // profile. Never hidden or capped — the number is shown as computed — but
  // the phrase adds the caveat rather than treating a bigger number as
  // unambiguously better.
  const VERY_HIGH_LTV_TO_CAC = 8;
  let ltvCacPhraseFull = ltvCacPhrase[ltvCacStatus];
  if (result.ltvToCac >= VERY_HIGH_LTV_TO_CAC) {
    ltvCacPhraseFull +=
      " — though a ratio this high more likely reflects under-investment in acquisition spend or the model's simplified CAC/LTV assumptions than a genuinely elite efficiency profile, and is worth treating with some skepticism rather than as an unambiguous positive";
  }

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

  // Key Risk: two tiers, each in a fixed priority order (cash exhaustion
  // first, since it's an existential constraint; then profitability,
  // retention, unit economics, and finally top-line direction) — not a
  // severity score, picks the single most pressing issue. Tier 1 is
  // metrics materially outside a healthy range (their own badge would read
  // Depleted/Critical/Weak/MateriallyUnprofitable/Contracting); Tier 2
  // covers a metric merely in a cautionary Watch/ApproachingBreakeven band.
  // The "no material risk" fallback is only reachable when NEITHER tier
  // finds anything — it must never fire while a badge on screen reads
  // Watch or worse.
  const runwayStatus = classifyRunway(result.runwayMonths);
  let keyRiskPhrase: string;
  if (cashStatus === "Depleted") {
    keyRiskPhrase =
      "Cash has gone negative at these assumptions — the business has run out of money within the window.";
  } else if (runwayStatus === "Critical") {
    keyRiskPhrase =
      "Runway has fallen below 12 months — cash exhaustion is the dominant risk if burn and spend don't change.";
  } else if (cashStatus === "Low") {
    keyRiskPhrase = "Ending cash is tight relative to the starting balance, leaving little cushion for a downside surprise.";
  } else if (marginStatus === "MateriallyUnprofitable") {
    keyRiskPhrase = `EBITDA margin is materially negative (${(result.endingEBITDAMargin * 100).toFixed(1)}%) — the cost base isn't supported by revenue at this scale.`;
  } else if (nrrStatus === "Weak") {
    keyRiskPhrase = "Net revenue retention is weak — churn and contraction are eroding the existing base faster than expansion offsets it.";
  } else if (ltvCacStatus === "Weak") {
    keyRiskPhrase = "LTV/CAC is weak — customer acquisition cost isn't comfortably supported by lifetime value at current assumptions.";
  } else if (arrTrend === "Contracting") {
    keyRiskPhrase = "ARR is contracting over the window — customer losses are outpacing new growth.";
  } else if (marginStatus === "ApproachingBreakeven") {
    keyRiskPhrase = `EBITDA margin is still negative (${(result.endingEBITDAMargin * 100).toFixed(1)}%), approaching breakeven — not yet a material risk, but worth watching.`;
  } else if (runwayStatus === "Watch") {
    keyRiskPhrase = `Runway is in the 12-18 month caution band (${(result.runwayMonths ?? 0).toFixed(1)} months) — worth watching, though not yet critical.`;
  } else if (nrrStatus === "Watch") {
    keyRiskPhrase = "Net revenue retention is in a watch band — contraction and churn currently outweigh expansion, though not by a wide margin.";
  } else if (ltvCacStatus === "Watch") {
    keyRiskPhrase = "LTV/CAC is in a watch band — acquisition cost leaves a thinner-than-ideal margin of safety against lifetime value.";
  } else {
    keyRiskPhrase = "No metric is outside a healthy band at these assumptions — the main risk is an unmodeled external shock.";
  }

  // Next Action ties directly to decideStance's own runway/margin
  // thresholds, so the recommendation and this line can never disagree.
  const decision = decideStance(result.runwayMonths, result.endingEBITDAMargin);
  const nextActionPhrase: Record<Decision, string> = {
    "Invest for growth":
      "Continue investing in growth while keeping an eye on the risk above so it doesn't become the binding constraint.",
    "Run cautiously":
      "Hold spend roughly flat and revisit in a quarter — there's room to operate, but not enough margin of safety to accelerate.",
    "Preserve cash":
      "Reduce burn now: cut discretionary spend and revisit growth investment only once runway and margin recover.",
  };

  return {
    endingARR: result.endingARR,
    startingARR: result.months[0].beginningMRR * 12,
    arrGrowthPct:
      result.months[0].beginningMRR === 0
        ? 0
        : (result.endingARR - result.months[0].beginningMRR * 12) /
          (result.months[0].beginningMRR * 12),
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
    ltvCacPhrase: ltvCacPhraseFull,
    keyRiskPhrase,
    nextActionPhrase: nextActionPhrase[decision],
  };
}

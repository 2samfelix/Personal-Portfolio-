// Concepts and thresholds shared across every industry model (SaaS,
// Consulting, Real Estate, and any future one). Every industry model
// produces a runway (or null, meaning self-funded), an EBITDA margin, an
// ending cash relative to a starting cash, and a headline top-line metric
// that trends over the forecast window — none of that math is SaaS-specific,
// so it lives here once instead of being copied into each industry file.

export type Decision = "Invest for growth" | "Run cautiously" | "Preserve cash";

// Thresholds: runway >18mo + positive margin -> Invest for growth;
// runway >=12mo -> Run cautiously; otherwise -> Preserve cash.
export function decideStance(runwayMonths: number | null, endingEBITDAMargin: number): Decision {
  const runway = runwayMonths ?? Infinity;
  if (runway > 18 && endingEBITDAMargin > 0) return "Invest for growth";
  if (runway >= 12) return "Run cautiously";
  return "Preserve cash";
}

export type MarginStatus =
  | "Strong"
  | "Profitable"
  | "NearBreakeven"
  | "ApproachingBreakeven"
  | "MateriallyUnprofitable";

// Profitability-language thresholds, deliberately finer than a simple
// positive/negative split. The old 2-bucket version ("Healthy" for any
// margin >0%, "Watch" for anything from -40% to 0%) let a margin as bad as
// -39% share the same badge and the same "close to breakeven" phrasing as
// a margin of -2% — a real -29.4% case got the same treatment and produced
// commentary claiming the business was "close to breakeven," which isn't
// true. These bands fix that:
//   >15%        = Strong        (comfortably, durably profitable)
//   5% to 15%   = Profitable    (solidly profitable)
//   0% to 5%    = NearBreakeven (barely profitable / modest profitability)
//   -10% to 0%  = ApproachingBreakeven (still loss-making, but closing in)
//   <-10%       = MateriallyUnprofitable (cost base isn't supported by
//                 revenue at this scale — a real risk, not a rounding
//                 error)
// Applies identically to any margin-like ratio — SaaS/Consulting EBITDA
// margin, Real Estate free cash flow margin — since "how profitable is
// this" doesn't depend on which industry produced the number.
export function classifyMargin(margin: number): MarginStatus {
  if (margin > 0.15) return "Strong";
  if (margin > 0.05) return "Profitable";
  if (margin >= 0) return "NearBreakeven";
  if (margin >= -0.1) return "ApproachingBreakeven";
  return "MateriallyUnprofitable";
}

export type CashStatus = "Strong" | "Adequate" | "Low" | "Depleted";

// Thresholds, ending cash relative to starting cash: >=90% = Strong,
// 50-90% = Adequate, 0-50% = Low, <0% (negative cash) = Depleted. The old
// 3-tier version had no floor below "Low," so a thin-but-positive balance
// and a deeply negative one got the same label — a real gap the QA pass
// flagged and deliberately left alone as out of scope at the time.
export function classifyCashRatio(endingCash: number, startingCash: number): CashStatus {
  const pctOfStart = startingCash === 0 ? 0 : endingCash / startingCash;
  if (endingCash < 0) return "Depleted";
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

// Driver-config contract every industry's driver list conforms to. The UI
// renders sliders by mapping over an industry's exported driver array —
// never by hardcoding a slider list in a component — so adding, removing,
// or re-bounding a driver is a model-layer-only edit.
export type DriverUnit = "count" | "currency" | "percent";

export type DriverConfig<K extends string = string> = {
  key: K;
  label: string;
  unit: DriverUnit;
  min: number; // in raw model units (e.g. 0.15 for 15%, or 3000 for $3,000)
  max: number;
  step: number; // in raw model units
};

export type TrendStatus = "Growing" | "Flat" | "Contracting";

// Thresholds: change from window-start to window-end. >+5% = Growing,
// -5%..+5% = Flat, <-5% = Contracting. Used for any industry's headline
// top-line metric (SaaS ARR, Consulting Net Revenue, Real Estate NOI).
export function classifyTrend(first: number, last: number): TrendStatus {
  const trend = first === 0 ? 0 : (last - first) / first;
  if (trend > 0.05) return "Growing";
  if (trend < -0.05) return "Contracting";
  return "Flat";
}

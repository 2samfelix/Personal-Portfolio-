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
export function classifyCashRatio(endingCash: number, startingCash: number): CashStatus {
  const pctOfStart = startingCash === 0 ? 0 : endingCash / startingCash;
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

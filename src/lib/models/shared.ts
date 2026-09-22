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

// Badge coloring vocabulary shared by every KPI card, chart badge, and
// alert line in the app: "good" = healthy, "neutral" = a watch-level
// caution, "bad" = a material problem. One 3-value tone, reused everywhere
// a status needs a color, so a chart's alert line can never end up a
// different color than its own badge — both are derived from the same
// classification value, never computed independently.
export type BadgeTone = "good" | "neutral" | "bad";

// Human-readable labels for MarginStatus's 5 bands, since (unlike
// CashStatus/RunwayStatus/NRRStatus/etc., whose values already read fine
// as badge text) "ApproachingBreakeven" and "MateriallyUnprofitable" need
// word-spacing before they're shown as a badge. Exported once here so both
// the KPI cards and any chart config that badges on margin use the exact
// same wording.
export const MARGIN_STATUS_LABEL: Record<MarginStatus, string> = {
  Strong: "Strong",
  Profitable: "Profitable",
  NearBreakeven: "Near Breakeven",
  ApproachingBreakeven: "Approaching Breakeven",
  MateriallyUnprofitable: "Materially Unprofitable",
};

// A chart's value is either a dollar figure (rendered compact, e.g.
// "$1.7K") or a ratio/percentage (rendered to a chosen number of decimal
// places, e.g. "76.0%"). This is data, not a formatting function — model
// files declare *what kind* of number a chart shows, the same way
// DriverConfig.unit declares a driver's kind; the UI resolves it to actual
// display text (see formatChartValue in the component), keeping the model
// layer free of currency-symbol/formatting concerns.
export type ChartValueFormat = { kind: "currency" } | { kind: "percent"; digits: number };

export type ChartBadge = { label: string; tone: BadgeTone };

// A chart's computed caption: the badge (reused verbatim from an existing
// classify* threshold — never a second, chart-specific band) plus the
// alert line's severity-colored lead phrase and driver explanation. Both
// are produced by one function per chart from the same underlying status
// value, so an alert can never end up describing a metric as healthier (or
// worse) than its own badge says.
export type ChartCaption = {
  badge: ChartBadge;
  alertTone: BadgeTone;
  alertLead: string;
  alertExplanation: string;
};

// Config-driven chart contract every industry's chart list conforms to.
// The UI renders the chart set by mapping over an industry's exported
// array — never by hardcoding a chart list in a component — so adding,
// removing, or reordering a chart is a model-layer-only edit.
export type ChartConfig<TResult, TAssumptions> = {
  key: string;
  chartLabel: string; // heading above the chart, e.g. "MRR Growth"
  statLabel: string; // combined with "at Month 12" in the stat bar, e.g. "MRR"
  valueFormat: ChartValueFormat;
  ariaLabel: string;
  getSeries: (result: TResult) => number[]; // 12 monthly values plotted for this scenario
  getCaption: (result: TResult, assumptions: TAssumptions) => ChartCaption;
  explainer: string; // static, doesn't change with the numbers — written once per metric
};

// The alert line's explanation sentence has to embed real numbers ("fell to
// $1.7K, down 32.4% from $2.5K") — that's what "computed, not decoration"
// means for a sentence, not just a badge color. These two tiny helpers
// exist so that number-to-text step happens once, here, instead of being
// duplicated three times across the industry model files that build alert
// text. This is narrower than the UI's own src/lib/format.ts (which also
// handles driver-unit/precision rules for sliders and tables) — it exists
// only to put a number into a caption sentence, mirroring the same
// compact-dollar/percent conventions so an alert's embedded figure always
// matches what the stat bar above it shows for the same value.
export function formatUsdCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

// ============================================================================
// Seeded Monte Carlo primitives — shared by every industry's simulation
// layer (SaaS's src/lib/monteCarlo.ts and Front Office's
// src/lib/frontOfficeMonteCarlo.ts). None of this is industry-specific: a
// deterministic string-to-seed hash, a small seedable PRNG, a
// uniform-to-normal transform, and a percentile reader over a sorted
// array. Each industry's simulation file supplies its own variance model
// (which inputs get jittered and by how much) and calls these once.
// ============================================================================

// Deterministic string hash (djb2 variant) — turns a JSON-stringified
// assumptions object into a fixed seed so the *same* inputs always
// reproduce the *same* simulation, a property required for verification.
export function hashStringToSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, seedable PRNG. Not cryptographic; not meant to
// be, it just needs to be reproducible given the same seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform: turns two uniform(0,1) draws from the seeded PRNG
// into one standard-normal draw.
export function standardNormal(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const idx = (sortedAscending.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAscending[lo];
  return sortedAscending[lo] + (sortedAscending[hi] - sortedAscending[lo]) * (idx - lo);
}

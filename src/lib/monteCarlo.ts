import {
  runSaaSForecast,
  type SaaSAssumptions,
  type SaaSCompanyBaseline,
} from "@/lib/models/saas";

// Monte Carlo mode reruns the same runSaaSForecast() engine many times with
// randomly perturbed assumptions — it is not a second forecasting model. It
// is an optional, explicitly-labeled complement to the deterministic
// scenarios, never a replacement for them.

type RandomizedDriverKey =
  | "monthlyGrowthRate"
  | "monthlyChurnRate"
  | "monthlyExpansionRate"
  | "monthlyContractionRate"
  | "pricingChangePct"
  | "grossMarginPct";

// Each driver is jittered as a normal distribution centered on the current
// slider value, with the stated standard deviation, then clamped to the same
// bounds as that driver's slider so a sample can never leave the space the
// UI itself can express. Headcount and S&M spend are held fixed — the brief
// scopes randomization to growth, churn, expansion, contraction, pricing,
// and gross margin only.
export const MONTE_CARLO_DISTRIBUTIONS: {
  key: RandomizedDriverKey;
  label: string;
  stdDev: number;
  bounds: readonly [number, number];
}[] = [
  { key: "monthlyGrowthRate", label: "Customer Growth", stdDev: 0.02, bounds: [0, 0.15] },
  { key: "monthlyChurnRate", label: "Churn", stdDev: 0.008, bounds: [0, 0.06] },
  { key: "monthlyExpansionRate", label: "Expansion", stdDev: 0.008, bounds: [0, 0.05] },
  { key: "monthlyContractionRate", label: "Contraction", stdDev: 0.008, bounds: [0, 0.05] },
  { key: "pricingChangePct", label: "Pricing", stdDev: 0.015, bounds: [-0.05, 0.1] },
  { key: "grossMarginPct", label: "Gross Margin", stdDev: 0.03, bounds: [0.5, 0.95] },
];

export type MonteCarloSample = {
  endingARR: number;
  endingCash: number;
  endingEBITDAMargin: number;
  runwayMonths: number | null;
};

export type MonteCarloResult = {
  simulations: number;
  seed: number;
  samples: MonteCarloSample[];
  p10EndingARR: number;
  medianEndingARR: number;
  p90EndingARR: number;
  medianEndingCash: number;
  probabilityPositiveEBITDA: number;
  probabilityRunwayBelow12Months: number;
};

// Deterministic string hash (djb2 variant) — turns the current assumptions
// into a fixed seed so the *same* inputs always reproduce the *same*
// simulation, a property explicitly required for verification.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, seedable PRNG. Not cryptographic; not meant to
// be, it just needs to be reproducible given the same seed.
function mulberry32(seed: number): () => number {
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
function standardNormal(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const idx = (sortedAscending.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAscending[lo];
  return sortedAscending[lo] + (sortedAscending[hi] - sortedAscending[lo]) * (idx - lo);
}

export function seedForAssumptions(assumptions: SaaSAssumptions, simulations: number): number {
  return hashString(JSON.stringify(assumptions)) ^ simulations;
}

function summarize(
  samples: MonteCarloSample[],
  simulations: number,
  seed: number
): MonteCarloResult {
  const arrSorted = samples.map((s) => s.endingARR).sort((a, b) => a - b);
  const cashSorted = samples.map((s) => s.endingCash).sort((a, b) => a - b);
  const positiveEbitdaCount = samples.filter((s) => s.endingEBITDAMargin > 0).length;
  const belowRunwayCount = samples.filter(
    (s) => s.runwayMonths !== null && s.runwayMonths < 12
  ).length;

  return {
    simulations,
    seed,
    samples,
    p10EndingARR: percentile(arrSorted, 0.1),
    medianEndingARR: percentile(arrSorted, 0.5),
    p90EndingARR: percentile(arrSorted, 0.9),
    medianEndingCash: percentile(cashSorted, 0.5),
    probabilityPositiveEBITDA: positiveEbitdaCount / samples.length,
    probabilityRunwayBelow12Months: belowRunwayCount / samples.length,
  };
}

/**
 * Runs `simulations` forecasts (500-1000 typical) with each of the six
 * documented drivers jittered around the current assumptions, in small
 * batches yielded back to the event loop via setTimeout(0) between batches
 * so a run of even 1000 twelve-month forecasts never blocks the UI thread
 * long enough to feel like a freeze. Seeded by the assumptions themselves,
 * so re-running against the same inputs reproduces the same result.
 */
export async function runMonteCarloSimulation(
  assumptions: SaaSAssumptions,
  baseline: SaaSCompanyBaseline,
  simulations: number,
  onProgress?: (completed: number, total: number) => void
): Promise<MonteCarloResult> {
  const seed = seedForAssumptions(assumptions, simulations);
  const rng = mulberry32(seed);
  const samples: MonteCarloSample[] = [];
  const BATCH_SIZE = 50;

  for (let start = 0; start < simulations; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, simulations);
    for (let i = start; i < end; i++) {
      const sampled: SaaSAssumptions = { ...assumptions };
      for (const spec of MONTE_CARLO_DISTRIBUTIONS) {
        const jittered = assumptions[spec.key] + standardNormal(rng) * spec.stdDev;
        sampled[spec.key] = clamp(jittered, spec.bounds);
      }
      const result = runSaaSForecast(sampled, baseline);
      samples.push({
        endingARR: result.endingARR,
        endingCash: result.endingCash,
        endingEBITDAMargin: result.endingEBITDAMargin,
        runwayMonths: result.runwayMonths,
      });
    }
    onProgress?.(end, simulations);
    if (end < simulations) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return summarize(samples, simulations, seed);
}

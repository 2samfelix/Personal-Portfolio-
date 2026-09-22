import {
  SAAS_DRIVERS,
  runSaaSForecast,
  type SaaSAssumptions,
  type SaaSCompanyBaseline,
} from "@/lib/models/saas";
import { hashStringToSeed, mulberry32, percentile, standardNormal } from "@/lib/models/shared";

// Monte Carlo mode reruns the same runSaaSForecast() engine many times with
// randomly perturbed assumptions — it is not a second forecasting model. It
// is an optional, explicitly-labeled complement to the deterministic
// scenarios, never a replacement for them.

type RandomizedDriverKey =
  | "avgMrrPerCustomer"
  | "monthlyGrowthRate"
  | "monthlyChurnRate"
  | "cac"
  | "grossMarginPct";

const driverBounds = new Map(SAAS_DRIVERS.map((d) => [d.key, [d.min, d.max] as const]));

// Each driver is jittered as a normal distribution centered on the current
// slider value, with the stated standard deviation, then clamped to that
// driver's own slider bounds (sourced from SAAS_DRIVERS, not duplicated
// here) so a sample can never leave the space the UI itself can express.
// startingCustomers is held fixed — it's the company's starting point
// today, not a forward-looking uncertainty to sample around, consistent
// with how it's also excluded from the Upside/Downside scenario deltas.
export const MONTE_CARLO_DISTRIBUTIONS: {
  key: RandomizedDriverKey;
  label: string;
  stdDev: number;
  bounds: readonly [number, number];
}[] = [
  { key: "avgMrrPerCustomer", label: "Avg MRR per Customer", stdDev: 20, bounds: driverBounds.get("avgMrrPerCustomer")! },
  { key: "monthlyGrowthRate", label: "Customer Growth", stdDev: 0.02, bounds: driverBounds.get("monthlyGrowthRate")! },
  { key: "monthlyChurnRate", label: "Churn", stdDev: 0.008, bounds: driverBounds.get("monthlyChurnRate")! },
  { key: "cac", label: "Customer CAC", stdDev: 500, bounds: driverBounds.get("cac")! },
  { key: "grossMarginPct", label: "Gross Margin", stdDev: 0.03, bounds: driverBounds.get("grossMarginPct")! },
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

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

export function seedForAssumptions(assumptions: SaaSAssumptions, simulations: number): number {
  return hashStringToSeed(JSON.stringify(assumptions)) ^ simulations;
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

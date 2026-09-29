// Run with: node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/precompute-front-office-strategy-map.mts
//
// Precomputes the Strategy Map's 500-plan Halton-sampled feasible cloud and
// its 10 injected boundary/reference anchors once, here, instead of letting
// FrontOfficeSimulator.tsx — a "use client" component — rebuild both (500
// x 60-round marketing ternary searches, i.e. ~30,000 engine runs, plus 10
// more) at module load in every visitor's browser during hydration.
// Measured cost of running this live: ~240ms of blocking JS per visit.
//
// Pulls the exact same sampling function, Halton bases, and anchor
// assumption list FrontOfficeSimulator.tsx's own (now-removed)
// sampleFeasibleFrontOfficePlans/STRATEGY_MAP_INJECTED_ANCHOR_ASSUMPTIONS
// used — see frontOfficePureAssumptions.ts's header for why they're
// duplicated there rather than imported from the client component. The
// efficient-frontier dominance calculation itself (computeEfficientFrontier)
// is cheap (an O(n log n) sort over the ~510 points this script produces)
// and stays in FrontOfficeSimulator.tsx, unchanged, run against this
// script's precomputed candidates — it isn't part of the ~240ms cost, so
// there's nothing to gain by also duplicating it here.
//
// Regenerate this whenever the sampling logic, Halton bases/sample size, or
// any of the ten anchors' assumptions change in either
// frontOfficePureAssumptions.ts or FrontOfficeSimulator.tsx (keep both
// copies in sync first). Wired into `npm run prebuild` so a normal
// `npm run build` regenerates it automatically — see package.json.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runFrontOfficeSimulation } from "../src/lib/models/frontOffice.ts";
import {
  STRATEGY_MAP_INJECTED_ANCHOR_ASSUMPTIONS,
  sampleFeasibleFrontOfficePlans,
} from "../src/lib/models/frontOfficePureAssumptions.ts";

const feasibleSample = sampleFeasibleFrontOfficePlans();

const injectedAnchors = STRATEGY_MAP_INJECTED_ANCHOR_ASSUMPTIONS.map(({ key, assumptions }) => {
  const r = runFrontOfficeSimulation(assumptions);
  return { key, wins: r.wins, operatingResult: r.operatingResult };
});

function pointsLiteral(points: { wins: number; operatingResult: number }[]): string {
  return points.map((p) => `  { wins: ${p.wins}, operatingResult: ${p.operatingResult} }`).join(",\n");
}

function anchorsLiteral(points: { key: string; wins: number; operatingResult: number }[]): string {
  return points
    .map((p) => `  { key: ${JSON.stringify(p.key)}, wins: ${p.wins}, operatingResult: ${p.operatingResult} }`)
    .join(",\n");
}

const output = `// GENERATED FILE — do not hand-edit.
// Regenerate with: node --experimental-strip-types --import ./scripts/register-loader.mjs scripts/precompute-front-office-strategy-map.mts
//
// Precomputed Strategy Map data: the 500-plan Halton-sampled feasible cloud
// and the 10 injected boundary/reference anchors, so the ~240ms this took
// to compute (500 x 60-round marketing ternary searches, plus 10 more
// engine runs) happens once here rather than in every visitor's browser.
// Every field is real runFrontOfficeSimulation output for the exact
// sampling/anchor logic in frontOfficePureAssumptions.ts — nothing
// hand-typed. See scripts/precompute-front-office-strategy-map.mts.

export const STRATEGY_MAP_FEASIBLE_SAMPLE_DATA: { wins: number; operatingResult: number }[] = [
${pointsLiteral(feasibleSample)}
];

export const STRATEGY_MAP_INJECTED_ANCHORS_DATA: { key: string; wins: number; operatingResult: number }[] = [
${anchorsLiteral(injectedAnchors)}
];
`;

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/models/frontOfficeStrategyMapSample.generated.ts"
);
writeFileSync(outPath, output);

console.log("Wrote", outPath);
console.log(`Feasible sample: ${feasibleSample.length} points`);
console.log(`Injected anchors: ${injectedAnchors.length} points`, injectedAnchors.map((a) => a.key));

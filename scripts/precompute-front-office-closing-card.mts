// Run with: node --experimental-strip-types scripts/precompute-front-office-closing-card.mts
//
// Precomputes the closing "What the Model Shows" card's two Monte Carlo
// results (Build Through Development, Spend to Contend) once, here, instead
// of letting FrontOfficeSimulator.tsx — a "use client" component — run
// 2,000 simulated seasons (2 presets x 1,000 seasons each) at module load
// in every visitor's browser during hydration, on top of the Strategy Map's
// own 500-plan Halton sample that already runs there.
//
// Pulls the exact same assumption objects FrontOfficeSimulator.tsx uses
// (frontOfficePureAssumptions.ts — see that file's own header for why
// they're duplicated there rather than imported from the client component)
// through the same runFrontOfficeMonteCarlo the console's own "Run 1,000
// Seasons" button calls, so the written numbers are real engine output, not
// hand-typed. Writes frontOfficeClosingCardStats.generated.ts, which
// FrontOfficeSimulator.tsx imports as a plain static object.
//
// Regenerate this whenever BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS or
// SPEND_TO_CONTEND_ASSUMPTIONS change in either
// frontOfficePureAssumptions.ts or FrontOfficeSimulator.tsx (keep both
// copies in sync first). Wired into `npm run prebuild` so a normal
// `npm run build` regenerates it automatically — see package.json.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runFrontOfficeMonteCarlo } from "../src/lib/frontOfficeMonteCarlo.ts";
import {
  BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS,
  SPEND_TO_CONTEND_ASSUMPTIONS,
} from "../src/lib/models/frontOfficePureAssumptions.ts";

// Must match MONTE_CARLO_RUNS in FrontOfficeSimulator.tsx (the console's own
// "Run 1,000 Seasons" simulation count) — not imported because that
// constant lives in a "use client" React file this plain script can't load.
const MONTE_CARLO_RUNS = 1000;

const buildThroughDevelopment = runFrontOfficeMonteCarlo(BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS, MONTE_CARLO_RUNS);
const spendToContend = runFrontOfficeMonteCarlo(SPEND_TO_CONTEND_ASSUMPTIONS, MONTE_CARLO_RUNS);

const output = `// GENERATED FILE — do not hand-edit.
// Regenerate with: node --experimental-strip-types scripts/precompute-front-office-closing-card.mts
//
// Precomputed Monte Carlo output for the closing "What the Model Shows"
// card's two named presets, so the ${MONTE_CARLO_RUNS.toLocaleString()}-season runs for each
// (${MONTE_CARLO_RUNS * 2} simulated seasons total) happen once here rather than in
// every visitor's browser. Every field is real runFrontOfficeMonteCarlo
// output for the exact assumptions in frontOfficePureAssumptions.ts —
// nothing hand-typed. See scripts/precompute-front-office-closing-card.mts.

export const BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO_STATS = {
  medianOperatingResult: ${buildThroughDevelopment.medianOperatingResult},
  probabilityOperatingProfit: ${buildThroughDevelopment.probabilityOperatingProfit},
};

export const SPEND_TO_CONTEND_MONTE_CARLO_STATS = {
  medianOperatingResult: ${spendToContend.medianOperatingResult},
  probabilityOperatingProfit: ${spendToContend.probabilityOperatingProfit},
};
`;

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/models/frontOfficeClosingCardStats.generated.ts"
);
writeFileSync(outPath, output);

console.log("Wrote", outPath);
console.log("Build Through Development:", {
  medianOperatingResult: buildThroughDevelopment.medianOperatingResult,
  probabilityOperatingProfit: buildThroughDevelopment.probabilityOperatingProfit,
});
console.log("Spend to Contend:", {
  medianOperatingResult: spendToContend.medianOperatingResult,
  probabilityOperatingProfit: spendToContend.probabilityOperatingProfit,
});

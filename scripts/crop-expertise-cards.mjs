// Crops the Core Expertise reel's workbook cards from the screenshots in public/expertise.
//
//   node scripts/crop-expertise-cards.mjs
//
// Each crop is a region of a real capture (1056 x 792, Playwright, 2x) cut out at its
// own pixels: no resizing, no redrawing. Each region holds the key rows of that workbook
// preview so the numbers stay readable; the reel shows it whole on the card's white.
// None takes in the previews' navy table headers or blue input cells.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "expertise");
const OUT = join(DIR, "cards");

const CROPS = [
  // Arm, DCF Valuation rows 46-50: implied equity value, diluted shares, implied share
  // price $51.54, market price $272.21, DCF value vs. price.
  { src: "arm-dcf", left: 62, top: 643, width: 558, height: 149 },
  // Microsoft x Activision, Accretion Dilution rows 18-22: pro forma net income, diluted
  // shares, pro forma EPS $9.29, standalone EPS $9.68, accretion / (dilution) (4.1%).
  { src: "msft-deal-model", left: 53, top: 438, width: 476, height: 140 },
  // Nike, Scenario Dashboard rows 40-42: base-case FY2028E NA revenue $22,290, base-case
  // growth 4.25%, cushion $439.
  { src: "nike-offset", left: 61, top: 632, width: 570, height: 152 },
  // FP&A Intelligence Engine trace: fact S01, CI segment sales $8,346M, its benchmark
  // cell and source.
  { src: "engine-trace", left: 377, top: 300, width: 462, height: 150 },
];

mkdirSync(OUT, { recursive: true });
for (const c of CROPS) {
  const file = join(OUT, `${c.src}.webp`);
  await sharp(join(DIR, `${c.src}.webp`))
    .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .webp({ quality: 92 })
    .toFile(file);
  console.log(`${c.src}: ${c.width}x${c.height} at (${c.left}, ${c.top})`);
}

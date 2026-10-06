// Guards against silent drift between the Caterpillar case-study page's mobile
// HTML title/subtitle (shown below 720px, see ExhibitFigure in
// src/components/CaterpillarProjectPage.tsx) and the title/subtitle baked into
// each exhibit's approved SVG (shown at 720px and up). The two are never
// visible at the same time, so a mismatch would go unnoticed without this
// check. Run with: node scripts/verify-caterpillar-exhibit-text.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const pageSource = readFileSync(
  join(repoRoot, "src/components/CaterpillarProjectPage.tsx"),
  "utf8"
);

function extractSvgTitleAndSubtitle(svgPath) {
  const svg = readFileSync(svgPath, "utf8");
  const titleMatch = svg.match(/<text class="ttl"[^>]*>([^<]*)<\/text>/);
  const subtitleMatches = [...svg.matchAll(/<text class="sub"[^>]*>([^<]*)<\/text>/g)];
  if (!titleMatch || subtitleMatches.length === 0) {
    throw new Error(`Could not find title/subtitle <text> elements in ${svgPath}`);
  }
  return {
    title: titleMatch[1],
    subtitle: subtitleMatches.map((m) => m[1]).join(" "),
  };
}

// Each <ExhibitFigure ... /> call is self-closing with no nested elements, so
// splitting on the nearest "/>" correctly isolates one call per block — a
// single lazy regex spanning "src=" would otherwise skip straight over an
// earlier complete call to reach a later one's src attribute.
const exhibitFigureBlocks = [...pageSource.matchAll(/<ExhibitFigure\b[^]*?\/>/g)].map(
  (m) => m[0]
);

function extractComponentProps(svgFileName) {
  const block = exhibitFigureBlocks.find((b) => b.includes(`src="/caterpillar/${svgFileName}"`));
  if (!block) {
    throw new Error(`Could not find an <ExhibitFigure> call for ${svgFileName}`);
  }
  const title = block.match(/title="([^"]*)"/);
  const subtitle = block.match(/subtitle="([^"]*)"/);
  if (!title || !subtitle) {
    throw new Error(`<ExhibitFigure> call for ${svgFileName} is missing title or subtitle`);
  }
  return { title: title[1], subtitle: subtitle[1] };
}

const exhibits = [
  "exhibit-2-demand-quality-gap.svg",
  "exhibit-3-dealer-inventory-record.svg",
  "exhibit-4-operating-bridge.svg",
];

let failed = false;

for (const fileName of exhibits) {
  const svgPath = join(repoRoot, "public/caterpillar", fileName);
  const fromSvg = extractSvgTitleAndSubtitle(svgPath);
  const fromComponent = extractComponentProps(fileName);

  if (fromSvg.title !== fromComponent.title) {
    failed = true;
    console.error(`[${fileName}] title mismatch:`);
    console.error(`  SVG:       ${JSON.stringify(fromSvg.title)}`);
    console.error(`  Component: ${JSON.stringify(fromComponent.title)}`);
  }
  if (fromSvg.subtitle !== fromComponent.subtitle) {
    failed = true;
    console.error(`[${fileName}] subtitle mismatch:`);
    console.error(`  SVG:       ${JSON.stringify(fromSvg.subtitle)}`);
    console.error(`  Component: ${JSON.stringify(fromComponent.subtitle)}`);
  }
}

if (failed) {
  console.error(
    "\nThe mobile HTML title/subtitle in CaterpillarProjectPage.tsx no longer matches " +
      "the approved SVG's own <text> content. If the SVG was intentionally revised, " +
      "update the matching title/subtitle prop verbatim."
  );
  process.exit(1);
}

console.log("OK: mobile title/subtitle props match their SVGs for all three exhibits.");

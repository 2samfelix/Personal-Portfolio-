// Renders every Caterpillar exhibit SVG under assets/ to light + dark PNGs,
// at 2x the SVG's own viewBox size (matching the committed PNGs' existing
// resolution). Source of truth is the SVG itself: each SVG carries its own
// `@media (prefers-color-scheme: dark)` color tokens, switched here via
// Playwright's colorScheme emulation rather than two separate SVG sources.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "./lib/chromium.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "assets");
const DARK_DIR = join(ASSETS_DIR, "dark");

const LIGHT_BG = "#ffffff";
const DARK_BG = "#151515";
const SCALE = 2;

function viewBoxSize(svgSource) {
  const match = svgSource.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!match) {
    throw new Error("Could not find a 0,0-origin viewBox in SVG source");
  }
  return { width: Math.ceil(Number(match[1])), height: Math.ceil(Number(match[2])) };
}

function wrapperHtml(svgSource, width, height, background) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;}
body{width:${width}px;height:${height}px;background:${background};}
svg{display:block;width:${width}px;height:${height}px;}
</style></head>
<body>${svgSource}</body></html>`;
}

async function renderOne(browser, svgPath, outLight, outDark) {
  const svgSource = readFileSync(svgPath, "utf8");
  const { width, height } = viewBoxSize(svgSource);

  for (const [colorScheme, background, outPath] of [
    ["light", LIGHT_BG, outLight],
    ["dark", DARK_BG, outDark],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: SCALE,
      colorScheme,
    });
    await page.setContent(wrapperHtml(svgSource, width, height, background), { waitUntil: "load" });
    await page.screenshot({ path: outPath });
    await page.close();
    console.log(`  wrote ${outPath} (${width * SCALE}x${height * SCALE}, ${colorScheme})`);
  }
}

async function main() {
  mkdirSync(DARK_DIR, { recursive: true });
  const svgFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".svg"));
  if (svgFiles.length === 0) {
    console.log("No exhibit SVGs found under", ASSETS_DIR);
    return;
  }

  const browser = await launchChromium(chromium, { headless: true });
  try {
    for (const file of svgFiles) {
      const svgPath = join(ASSETS_DIR, file);
      const stem = basename(file, ".svg");
      const outLight = join(ASSETS_DIR, `${stem}.png`);
      const outDark = join(DARK_DIR, `${stem}-dark.png`);
      console.log(`Rendering ${file} ...`);
      await renderOne(browser, svgPath, outLight, outDark);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

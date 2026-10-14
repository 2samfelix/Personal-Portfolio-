// Renders src/presentation.html (styled by src/deck.css) to the committed
// presentation PDF via Chromium's print-to-PDF: 16:9 slides, 13.333in x
// 7.5in (960 x 540 pt, the same page size as the original uploaded deck).
//
// Like render-pdf.mjs, exhibits are spliced in from assets/ on every run,
// never rasterized. A "_CROPPED" placeholder also crops the exhibit's own
// title/subtitle band by shifting its viewBox, so the slide headline carries
// the message without a duplicated chart title (the same technique the
// project page uses on mobile).
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChromium } from "./lib/chromium.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "src");
const ASSETS_DIR = join(__dirname, "..", "assets");
const SOURCE_HTML = join(SRC_DIR, "presentation.html");
const OUT_PDF = join(__dirname, "..", "presentation", "Caterpillar_Demand_Quality_Presentation.pdf");

// placeholder -> [svg file, top crop, bottom y to keep] in SVG user units.
// Exhibit 3: drop the title band (y < 70) and the footnote band below the
// legend (y > 398); on the slide, the headline, side notes and slide footer
// carry that text at a readable size instead of ~8px.
const EXHIBITS = {
  "<!-- EXHIBIT_3_SVG_CROPPED -->": ["exhibit-3-dealer-inventory-record.svg", 70, 398],
};

function cropViewBox(svg, top, bottom) {
  const m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!m) throw new Error("exhibit SVG has no simple viewBox to crop");
  const [, w, h] = m;
  const keepTo = Math.min(Number(h), bottom ?? Number(h));
  return svg.replace(m[0], `viewBox="0 ${top} ${w} ${keepTo - top}"`);
}

function buildMergedHtml() {
  let html = readFileSync(SOURCE_HTML, "utf8");
  for (const [placeholder, [svgFile, top, bottom]] of Object.entries(EXHIBITS)) {
    if (!html.includes(placeholder)) {
      throw new Error(`Placeholder not found in presentation.html: ${placeholder}`);
    }
    let svg = readFileSync(join(ASSETS_DIR, svgFile), "utf8");
    if (top || bottom) svg = cropViewBox(svg, top ?? 0, bottom);
    html = html.replace(placeholder, svg);
  }
  const baseHref = pathToFileURL(SRC_DIR + "/").href;
  return html.replace("<head>", `<head>\n<base href="${baseHref}" />`);
}

async function main() {
  const tmpDir = mkdtempSync(join(tmpdir(), "caterpillar-deck-"));
  const tmpHtmlPath = join(tmpDir, "presentation.merged.html");
  writeFileSync(tmpHtmlPath, buildMergedHtml());

  const browser = await launchChromium(chromium, { headless: true });
  try {
    const page = await browser.newPage();
    // Light rendering only: the exhibit SVGs carry dark-mode rules for the
    // separate dark PNGs, which must not fire here.
    await page.emulateMedia({ media: "print", colorScheme: "light" });
    await page.goto(pathToFileURL(tmpHtmlPath).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: OUT_PDF,
      width: "13.333in",
      height: "7.5in",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    console.log(`wrote ${OUT_PDF}`);
  } finally {
    await browser.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

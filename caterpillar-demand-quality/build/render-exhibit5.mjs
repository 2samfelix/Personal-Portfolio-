// Renders the Exhibit 5 margin-context table from its markdown source
// (assets/exhibit-5-margin-context.md) to a PNG matching the visual style
// of the other exhibits. Exhibit 5 has no SVG counterpart and no dark
// variant (see README) — this script is deliberately narrow: it parses the
// fixed title / table / caption / source-line structure of that one file,
// not general markdown.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "./lib/chromium.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "assets");
const SOURCE_MD = join(ASSETS_DIR, "exhibit-5-margin-context.md");
const OUT_PNG = join(ASSETS_DIR, "exhibit-5-margin-context.png");

const WIDTH = 760;
const SCALE = 2;

function inlineBold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function parseSource(md) {
  const lines = md.split("\n").map((l) => l.trimEnd());
  const nonBlank = lines.filter((l) => l.trim().length > 0);

  const titleLine = nonBlank[0];
  const title = titleLine.replace(/^\*\*(.+)\*\*$/, "$1");

  const tableLines = nonBlank.filter((l) => l.startsWith("|"));
  const headerCells = tableLines[0]
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  const dataRows = tableLines.slice(2).map((row) =>
    row
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
  );

  // Caption / source: everything after the table, in original line order,
  // split on blank-line paragraph breaks.
  const tableEndIdx = lines.findLastIndex((l) => l.startsWith("|"));
  const rest = lines
    .slice(tableEndIdx + 1)
    .join("\n")
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const [caption, source] = rest;
  return { title, headerCells, dataRows, caption, source };
}

function renderHtml({ title, headerCells, dataRows, caption, source }, titleFontSize) {
  const [rowLabelHeader, ...quarterHeaders] = headerCells;
  const headerCols = quarterHeaders
    .map((h) => `<th class="num">${h}</th>`)
    .join("");
  const bodyRows = dataRows
    .map((row, i) => {
      const [label, ...values] = row;
      const labelClass = i === 0 ? "label label-primary" : "label";
      const valueCells = values.map((v) => `<td class="num">${v}</td>`).join("");
      return `<tr><td class="${labelClass}">${label}</td>${valueCells}</tr>`;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;}
  body{
    width:${WIDTH}px;
    background:#ffffff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color:#1a1a1a;
    padding:16px 0 18px 0;
    box-sizing:border-box;
  }
  h1{
    font-size:${titleFontSize}px; font-weight:800; margin:0 0 10px 0; line-height:1.2; white-space:nowrap;
  }
  table{ width:100%; border-collapse:collapse; }
  th, td{ padding:7px 0; text-align:right; font-size:13px; }
  th{
    font-weight:700; color:#1a1a1a; border-bottom:1px solid #d8d4c8;
    padding-bottom:8px;
  }
  th.rowlabel, td.label{ text-align:left; }
  td.label{ color:#6b6b6b; font-size:13px; }
  td.label-primary{ color:#1a1a1a; }
  td.num{ font-variant-numeric: tabular-nums; }
  .caption-block{ border-top:1px solid #d8d4c8; margin-top:2px; padding-top:8px; }
  .caption, .source{ color:#6b6b6b; font-size:13px; line-height:1.3; margin:0; }
  .source{ margin-top:8px; }
  strong{ font-weight:700; color:#6b6b6b; }
</style></head>
<body>
  <h1>${inlineBold(title)}</h1>
  <table>
    <thead><tr><th class="rowlabel">${rowLabelHeader}</th>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="caption-block">
    <p class="caption">${inlineBold(caption)}</p>
    <p class="source">${inlineBold(source)}</p>
  </div>
</body></html>`;
}

const MEASURE_TITLE_FONT_SIZE = 24; // arbitrary starting point for the fit-to-width pass below
const TITLE_MAX_WIDTH = 740; // leaves a small right margin inside the 760px body

async function fitTitleFontSize(browser, title) {
  const page = await browser.newPage({ viewport: { width: 2000, height: 100 } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <h1 id="t" style="font-size:${MEASURE_TITLE_FONT_SIZE}px;font-weight:800;white-space:nowrap;margin:0;display:inline-block;">${inlineBold(title)}</h1>
    </body></html>`,
    { waitUntil: "load" }
  );
  const naturalWidth = await page.evaluate(() => document.getElementById("t").scrollWidth);
  await page.close();
  const fitted = MEASURE_TITLE_FONT_SIZE * (TITLE_MAX_WIDTH / naturalWidth);
  return Math.min(MEASURE_TITLE_FONT_SIZE, fitted);
}

async function main() {
  const md = readFileSync(SOURCE_MD, "utf8");
  const parsed = parseSource(md);

  const browser = await launchChromium(chromium, { headless: true });
  try {
    const titleFontSize = await fitTitleFontSize(browser, parsed.title);
    const html = renderHtml(parsed, titleFontSize);

    const page = await browser.newPage({
      viewport: { width: WIDTH, height: 10 },
      deviceScaleFactor: SCALE,
    });
    await page.setContent(html, { waitUntil: "load" });
    const height = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width: WIDTH, height });
    await page.screenshot({ path: OUT_PNG });
    await page.close();
    console.log(`wrote ${OUT_PNG} (${WIDTH * SCALE}x${height * SCALE}, title font-size ${titleFontSize.toFixed(2)}px)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

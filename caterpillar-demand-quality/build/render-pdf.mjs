// Renders src/case-study.html (styled by src/print.css) to the committed
// case-study PDF via Chromium's print-to-PDF, matching how the existing
// PDF was itself produced (its embedded /Producer is Skia/PDF, i.e. a
// Chromium print pipeline) so the new PDF is a like-for-like replacement.
//
// Exhibits 2/3/4 are embedded by reading their SVG source files fresh from
// assets/ on every run and splicing them into the HTML in place of
// <!-- EXHIBIT_N_SVG --> placeholders — never a rasterized crop — so the
// PDF always reflects the current committed SVGs byte-for-byte.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChromium } from "./lib/chromium.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "src");
const ASSETS_DIR = join(__dirname, "..", "assets");
const SOURCE_HTML = join(SRC_DIR, "case-study.html");
const OUT_PDF = join(__dirname, "..", "analysis", "Caterpillar_Demand_Quality_Case_Study.pdf");

const EXHIBIT_SVGS = {
  "<!-- EXHIBIT_2_SVG -->": "exhibit-2-demand-quality-gap.svg",
  "<!-- EXHIBIT_3_SVG -->": "exhibit-3-dealer-inventory-record.svg",
  "<!-- EXHIBIT_4_SVG -->": "exhibit-4-operating-bridge.svg",
};

function buildMergedHtml() {
  let html = readFileSync(SOURCE_HTML, "utf8");
  for (const [placeholder, svgFile] of Object.entries(EXHIBIT_SVGS)) {
    if (!html.includes(placeholder)) {
      throw new Error(`Placeholder not found in case-study.html: ${placeholder}`);
    }
    const svg = readFileSync(join(ASSETS_DIR, svgFile), "utf8");
    html = html.replace(placeholder, svg);
  }
  // <base> lets the merged file (written elsewhere, e.g. a tmp dir) still
  // resolve case-study.html's relative href="print.css".
  const baseHref = pathToFileURL(SRC_DIR + "/").href;
  html = html.replace("<head>", `<head>\n<base href="${baseHref}" />`);
  return html;
}

async function main() {
  const tmpDir = mkdtempSync(join(tmpdir(), "caterpillar-pdf-"));
  const tmpHtmlPath = join(tmpDir, "case-study.merged.html");
  writeFileSync(tmpHtmlPath, buildMergedHtml());

  const browser = await launchChromium(chromium, { headless: true });
  try {
    const page = await browser.newPage();
    // Force light rendering regardless of host/Chromium defaults: the
    // exhibit SVGs carry their own `@media (prefers-color-scheme: dark)`
    // rules (for the separate downloadable dark-mode PNGs), which must not
    // fire here. 'print' media also matches how this is actually printed.
    await page.emulateMedia({ media: "print", colorScheme: "light" });
    await page.goto(pathToFileURL(tmpHtmlPath).href, { waitUntil: "load" });
    await page.pdf({
      path: OUT_PDF,
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0.75in", bottom: "0.95in", left: "0.75in", right: "0.75in" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%; font-family:Arial,Helvetica,sans-serif; font-size:8px; color:#6b6b6b; text-align:center; margin:0 0.75in;">Caterpillar Demand Quality &nbsp;&middot;&nbsp; Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
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

// Renders the home-card thumbnail for the monday.com Operating Plan:
//   node scripts/render-monday-thumbnail.mjs
// Figures come from the Model Preview JSON exported from the locked plan workbook
// (looked up by row label, as src/lib/mondayPlan.ts does); the workbook's SHA-256
// must match the locked release. Writes public/project-visuals/monday-operating-plan.webp
// at 680 x 400. The card shows it at about 0.48x (327 x 192 on a 375px phone), so
// the smallest text, 30px here, reads at about 14px.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLAN_SHA256 = "125af68742c9d3501cd2f23944899cc4625cf5285e79ba9ea2bee34f24315419";
const OUT = "public/project-visuals/monday-operating-plan.webp";
const MAX_BYTES = 60 * 1024;

const doc = JSON.parse(readFileSync(join(root, "public/monday-operating-plan/model-preview.json"), "utf8"));
const actual = createHash("sha256").update(readFileSync(join(root, doc.workbook.file))).digest("hex");
if (actual !== PLAN_SHA256 || doc.workbook.sha256 !== PLAN_SHA256) {
  console.error(`Workbook ${doc.workbook.file} does not match the locked release (${actual}).`);
  process.exit(1);
}

const es = doc.sheets.find((s) => s.name === "Executive_Summary");
const shown = (c) => (c?.d ?? (c?.v === undefined ? "" : String(c.v))).trim();
function rowOf(label) {
  const hits = es.cells.filter((c) => c.c === 0 && shown(c) === label);
  if (hits.length !== 1) throw new Error(`Executive_Summary: expected one row "${label}"`);
  return hits[0].r;
}
const at = (r, c) => es.cells.find((x) => x.r === r && x.c === c);
const rev = rowOf("Revenue");
const base = at(rev, 2); // Base FY27
const down = at(rev, 4); // Downside FY27
const gapX = shown(at(rowOf("Gap / average 4-quarter-ahead backtest miss"), 1));
const head = rowOf("Base vs Downside");
if (shown(at(head, 2)) !== "Base FY27" || shown(at(head, 4)) !== "Downside FY27") throw new Error("Executive_Summary columns moved");

// Bars share one scale from zero; values are the workbook's raw numbers.
const max = Math.max(base.v, down.v);
const bar = (v) => `${((v / max) * 100).toFixed(2)}%`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0 }
  body { width: 680px; height: 400px; background: #f5f1e6; font-family: Arial, Helvetica, sans-serif; color: #2a2820;
         padding: 34px 40px; display: flex; flex-direction: column; gap: 18px }
  .k { font-size: 30px; font-weight: 700; color: #5b5847; letter-spacing: .01em }
  .row { display: grid; grid-template-columns: 196px 1fr; align-items: center; gap: 16px }
  .name { font-size: 34px; font-weight: 700 }
  .track { position: relative; height: 62px }
  .fill { height: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 14px;
          font-size: 34px; font-weight: 700; color: #f5f1e6 }
  .base { background: #1e3a2b } .down { background: #a1462f }
  .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: baseline; font-size: 30px; font-weight: 700 }
  .pending { color: #f5f1e6; background: #2a2820; border-radius: 6px; padding: 4px 12px }
</style></head><body>
  <p class="k">FY27 revenue, USD m</p>
  <div class="row"><span class="name">Base</span><div class="track"><div class="fill base" style="width:${bar(base.v)}">${shown(base)}</div></div></div>
  <div class="row"><span class="name">Downside</span><div class="track"><div class="fill down" style="width:${bar(down.v)}">${shown(down)}</div></div></div>
  <div class="foot"><span>Gap ${gapX} avg miss</span><span class="pending">Q3: PENDING</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 680, height: 400 }, deviceScaleFactor: 1 });
await page.setContent(html);
const png = await page.screenshot({ type: "png" });
// Chromium encodes WebP from a canvas; lower the quality until the file fits.
let webp;
for (const q of [0.9, 0.85, 0.8, 0.75, 0.7]) {
  const dataUrl = await page.evaluate(
    async ([b64, quality]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      return canvas.toDataURL("image/webp", quality);
    },
    [png.toString("base64"), q],
  );
  webp = Buffer.from(dataUrl.split(",")[1], "base64");
  if (webp.length <= MAX_BYTES) break;
}
await browser.close();
if (webp.length > MAX_BYTES) throw new Error(`thumbnail is ${webp.length} bytes, over ${MAX_BYTES}`);
writeFileSync(join(root, OUT), webp);
console.log(`wrote ${OUT}: 680 x 400, ${webp.length} bytes (Base ${shown(base)}, Downside ${shown(down)}, gap ${gapX})`);

// Renders the home-card thumbnails for the five workbook-backed projects:
//   node scripts/render-project-thumbnails.mjs
// Same style as scripts/render-monday-thumbnail.mjs: the site's cream, forest,
// rust and brass, Arial, one figure per card. Figures are read from the projects'
// Model Preview JSON (each exported from its hash-checked workbook; run
// `npm run check:model-preview` first) or, for the engine, from the card copy and
// engine page, and each must appear in the card copy (WorkGrid.tsx) exactly as
// drawn, so a thumbnail never states a figure the site does not.
//
// Output: public/project-visuals/<slug>.webp, 16:10 at 2x (laid out at 640 x 400
// CSS px, written at 1280 x 800). The card shows it 192px tall (about 0.24x of the
// file), so the smallest text, 30 CSS px (60 file px), reads at about 14px.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 60 * 1024;
const W = 640;
const H = 400;
const SCALE = 2;
const C = { cream: "#f5f1e6", forest: "#1e3a2b", rust: "#a1462f", brass: "#7a5a30", ink: "#2a2820", soft: "#5b5847", pale: "#ecdfc2" };

const cardCopy = readFileSync(join(root, "src/components/WorkGrid.tsx"), "utf8");
const enginePage = readFileSync(join(root, "src/components/EngineProjectPage.tsx"), "utf8");

/** A cell of a workbook sheet, from a Model Preview JSON (whole sheet or curated view). */
function cell(file, sheet, addr) {
  const doc = JSON.parse(readFileSync(join(root, file), "utf8"));
  const [, col, rowS] = /^([A-Z]+)(\d+)$/.exec(addr);
  const c0 = [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  for (const t of doc.sheets) {
    if ((t.sheet ?? t.name) !== sheet) continue;
    const r = t.rowIndex ? t.rowIndex.indexOf(+rowS - 1) : +rowS - 1;
    const c = t.colIndex ? t.colIndex.indexOf(c0) : c0;
    const hit = r >= 0 && c >= 0 ? t.cells.find((x) => x.r === r && x.c === c) : null;
    if (hit) return hit;
  }
  throw new Error(`${file}: ${sheet}!${addr} not found`);
}
const num = (x) => {
  if (typeof x.v !== "number") throw new Error(`expected a number, got ${JSON.stringify(x.v)}`);
  return x.v;
};
/** $ millions as the card copy writes them: $1.5B, $3.64B, $400M, $439M. */
const usdM = (m, bDigits = 1) => (Math.abs(m) >= 1000 ? `$${(m / 1000).toFixed(bDigits)}B` : `$${Math.round(m)}M`);
function onCard(text) {
  if (!cardCopy.includes(text)) throw new Error(`"${text}" is not in the card copy (WorkGrid.tsx)`);
  return text;
}

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0 }
  body { width: ${W}px; height: ${H}px; background: ${C.cream}; font-family: Arial, Helvetica, sans-serif; color: ${C.ink};
         padding: 34px 40px; display: flex; flex-direction: column; gap: 16px }
  .k { font-size: 30px; font-weight: 700; color: ${C.soft} }
  .big { font-size: 84px; font-weight: 900; letter-spacing: -0.02em; color: ${C.forest}; line-height: 1 }
  .sub { font-size: 32px; font-weight: 700; line-height: 1.25 }
  .row { display: grid; grid-template-columns: 170px 1fr; align-items: center; gap: 16px }
  .name { font-size: 32px; font-weight: 700 }
  .track { height: 64px }
  .fill { height: 64px; flex: none; border-radius: 6px; display: flex; align-items: center; padding: 0 14px; font-size: 34px; font-weight: 700; color: ${C.cream}; white-space: nowrap; overflow: hidden }
  .end { justify-content: flex-end }
  .foot { margin-top: auto; font-size: 30px; font-weight: 700; color: ${C.soft} }
  .ticks { display: flex; gap: 12px; margin-top: 4px }
  .tick { width: 54px; height: 54px; border-radius: 8px; background: ${C.forest}; color: ${C.cream}; font-size: 36px; font-weight: 900; display: flex; align-items: center; justify-content: center }
</style></head><body>${body}</body></html>`;

// --- Figures --------------------------------------------------------------------
// Caterpillar: Analysis!H15:I15, CI dealer-inventory change ($mm), Q1 and Q2 2026.
const catLabel = cell("public/caterpillar/model-preview.json", "Analysis", "A15").v;
if (catLabel !== "CI dealer inventory change $mm") throw new Error(`Caterpillar A15 is "${catLabel}"`);
const catQ1 = num(cell("public/caterpillar/model-preview.json", "Analysis", "H15"));
const catQ2 = num(cell("public/caterpillar/model-preview.json", "Analysis", "I15"));
const catQ1t = onCard(usdM(catQ1));
const catQ2t = onCard(usdM(catQ2));
// Arm: DCF Valuation!B48 (DCF-implied share price) and B49 (market price; its date in A49).
const armDcf = cell("public/arm/model-preview.json", "DCF Valuation", "B48");
const armMkt = cell("public/arm/model-preview.json", "DCF Valuation", "B49");
const armDate = /\(([^)]+)\)/.exec(cell("public/arm/model-preview.json", "DCF Valuation", "A49").v)[1]; // "Aug 10, 2026"
onCard(armDcf.d);
onCard(armMkt.d);
// Microsoft x Activision: Synergy Breakeven!B10, required annual pre-tax synergies ($mm).
const msftLabel = cell("public/microsoft-activision/model-preview.json", "Synergy Breakeven", "A10").v;
if (msftLabel !== "Required annual pre-tax synergies") throw new Error(`MSFT A10 is "${msftLabel}"`);
const msft = onCard(usdM(num(cell("public/microsoft-activision/model-preview.json", "Synergy Breakeven", "B10")), 2));
// Nike: Scenario Dashboard!B42, base-case cushion, FY2028E ($mm).
const nike = onCard(usdM(num(cell("public/nike/model-preview.json", "Scenario Dashboard", "B42"))));
// Engine: no workbook. 735 tests (card copy, from the engine's main) and the engine
// page's "All five briefs were accepted on the first attempt".
const engineTests = onCard("735");
if (!enginePage.includes("All five briefs were accepted on the first attempt")) throw new Error("engine page no longer states all five briefs were accepted");

const max = Math.max(catQ1, catQ2);
/** One bar, drawn to scale (value / max of its chart). A short bar carries its label outside. */
function bar(name, value, maxValue, color, text) {
  const share = value / maxValue;
  const width = `${(share * 100).toFixed(2)}%`;
  const inside = share >= 0.45;
  return `<div class="row"><span class="name">${name}</span><div class="track" style="display:flex;align-items:center;gap:10px">
    <div class="fill${inside ? " end" : ""}" style="width:${width};background:${color}">${inside ? text : ""}</div>
    ${inside ? "" : `<span style="font-size:34px;font-weight:700;color:${color}">${text}</span>`}</div></div>`;
}

export const THUMBS = [
  {
    slug: "caterpillar",
    alt: `Caterpillar: the disclosed Construction Industries dealer-inventory build fell from ${catQ1t} in Q1 2026 to ${catQ2t} in Q2 2026.`,
    html: page(`
      <p class="k">CI dealer-inventory build</p>
      ${bar("Q1 2026", catQ1, max, C.rust, catQ1t)}
      ${bar("Q2 2026", catQ2, max, C.forest, catQ2t)}
      <p class="foot">Disclosed by Caterpillar</p>`),
  },
  {
    slug: "arm",
    alt: `Arm: my DCF implies ${armDcf.d} a share against a ${armMkt.d} market price on ${armDate}.`,
    html: page(`
      <p class="k">Arm share price</p>
      ${bar("DCF value", armDcf.v, Math.max(armDcf.v, armMkt.v), C.forest, armDcf.d)}
      ${bar("Market", armMkt.v, Math.max(armDcf.v, armMkt.v), C.rust, armMkt.d)}
      <p class="foot">Market price on ${armDate}</p>`),
  },
  {
    slug: "msft",
    alt: `Microsoft and Activision: about ${msft} a year of pre-tax synergies needed for EPS-neutral.`,
    html: page(`
      <p class="k">Synergy needed for EPS-neutral</p>
      <p class="big" style="margin-top:18px">${msft}</p>
      <p class="sub">a year, pre-tax</p>
      <p class="foot">Microsoft × Activision Blizzard</p>`),
  },
  {
    slug: "nike",
    alt: `Nike: in the base case North America's growth covers Greater China's decline with a ${nike} cushion by FY2028E.`,
    html: page(`
      <p class="k">North America vs Greater China</p>
      <p class="big" style="margin-top:18px">${nike}</p>
      <p class="sub">base-case cushion by FY2028E</p>
      <p class="foot">Nike three-statement model</p>`),
  },
  {
    slug: "fpa-intelligence-engine",
    alt: `FP&A Intelligence Engine: ${engineTests} tests pass; all five benchmark runs were accepted on the first attempt.`,
    html: page(`
      <p class="big">${engineTests} <span style="font-size:44px">tests</span></p>
      <p class="sub">All five runs accepted on the first attempt</p>
      <div class="ticks">${Array.from({ length: 5 }, () => '<span class="tick">✓</span>').join("")}</div>
      <p class="foot">FP&amp;A Intelligence Engine</p>`),
  },
];

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
const alts = {};
for (const t of THUMBS) {
  await tab.setContent(t.html);
  // Nothing may overflow the 640 x 400 frame.
  const overflow = await tab.evaluate(
    () =>
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight ||
      [...document.querySelectorAll(".fill")].some((f) => f.scrollWidth > f.clientWidth),
  );
  if (overflow) throw new Error(`${t.slug}: content overflows the thumbnail`);
  const png = await tab.screenshot({ type: "png" });
  let webp;
  for (const q of [0.9, 0.85, 0.8, 0.75, 0.7, 0.6]) {
    const dataUrl = await tab.evaluate(
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
  if (webp.length > MAX_BYTES) throw new Error(`${t.slug}: ${webp.length} bytes, over ${MAX_BYTES}`);
  const out = `public/project-visuals/${t.slug}.webp`;
  writeFileSync(join(root, out), webp);
  alts[t.slug] = t.alt;
  console.log(`wrote ${out}: ${W * SCALE} x ${H * SCALE}, ${webp.length} bytes`);
}
await browser.close();
writeFileSync(join(root, "src/lib/projectVisualAlts.generated.json"), JSON.stringify(alts, null, 2) + "\n");
console.log("wrote src/lib/projectVisualAlts.generated.json");

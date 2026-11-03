// Renders the home-card thumbnail for the monday.com Operating Plan, in both states:
//   node scripts/render-monday-thumbnail.mjs
// writes public/project-visuals/monday-operating-plan.webp (Q3: PENDING) and
// monday-operating-plan-scored.webp (Q3: SCORED); the site picks one from the Q3 results
// status (src/lib/mondayResults.ts).
//
// The chart is the page's hero chart in small: year-over-year revenue growth by quarter
// (plan-data.json, the locked plan's Trigger_History sheet) and the plan's Base and
// Downside paths to Q4 2027 (model-preview.json, Revenue_Build). The plan workbook's
// SHA-256 must match the locked release. Every number is tagged (scripts/thumbnail-kit.mjs)
// and checked by scripts/test-thumbnails.py. 680 x 400 at 2x; the card shows it about 0.48x.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { C, label, linear, mark, r2, renderAll, root, sheetCells, svgDoc, tNum } from "./thumbnail-kit.mjs";

const PLAN_SHA256 = "125af68742c9d3501cd2f23944899cc4625cf5285e79ba9ea2bee34f24315419";
const W = 680;
const H = 400;
const PAD = 34;

const PREVIEW = "public/monday-operating-plan/model-preview.json";
const DATA = "public/monday-operating-plan/plan-data.json";
for (const f of [PREVIEW, DATA]) {
  const d = JSON.parse(readFileSync(join(root, f), "utf8"));
  const actual = createHash("sha256").update(readFileSync(join(root, d.workbook.file))).digest("hex");
  if (actual !== PLAN_SHA256 || d.workbook.sha256 !== PLAN_SHA256) throw new Error(`${f}: workbook ${d.workbook.file} does not match the locked release`);
}

// History: Trigger_History rows "Qn YYYY" with a YoY growth value (column D).
const hist = sheetCells(DATA, "Trigger_History");
const history = hist
  .filter((c) => c.addr.startsWith("A") && /^Q\d \d{4}$/.test(c.d))
  .map((q) => ({ quarter: q.d, value: hist.find((c) => c.addr === `D${q.r}`) }))
  .filter((p) => p.value && typeof p.value.v === "number");
if (history.length < 8) throw new Error("growth history too short");

// Plan paths: the "Revenue YoY growth" row after BASE and after DOWNSIDE, Q3 2026 ... Q4 2027 (E:J).
const rb = sheetCells(PREVIEW, "Revenue_Build");
function pathAfter(section) {
  const start = rb.find((c) => c.addr.startsWith("A") && c.d.startsWith(section));
  if (!start) throw new Error(`Revenue_Build: no "${section}"`);
  const row = rb.filter((c) => c.addr === `A${c.r}` && c.r > start.r && c.d === "Revenue YoY growth").sort((a, b) => a.r - b.r)[0];
  const head = rb.filter((c) => c.addr === `A${c.r}` && c.r > start.r && c.d === "Line").sort((a, b) => a.r - b.r)[0];
  return ["E", "F", "G", "H", "I", "J"].map((col) => {
    const v = rb.find((c) => c.addr === `${col}${row.r}`);
    const q = rb.find((c) => c.addr === `${col}${head.r}`);
    if (typeof v?.v !== "number") throw new Error(`Revenue_Build!${col}${row.r} is not a number`);
    return { quarter: q.d, value: v };
  });
}
const base = pathAfter("BASE");
const down = pathAfter("DOWNSIDE");
const lastActual = history[history.length - 1];
if (base[0].quarter !== "Q3 2026") throw new Error(`plan paths start at ${base[0].quarter}, not Q3 2026`);

function thumb(scored) {
  const n = history.length + base.length;
  const plotL = PAD + 6;
  const plotR = W - 150;
  const x = linear(0, n - 1, plotL, plotR);
  const max = Math.max(...history.map((p) => p.value.v));
  const y = linear(0, max, 292, 118);
  const axis = "monday-growth";
  const pts = (arr, from) => arr.map((p, i) => [x(from + i), y(p.value.v)]);
  const poly = (ps, color, dash = "") => `<polyline points="${ps.map(([a, b]) => `${r2(a)},${r2(b)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" ${dash}/>`;
  const h = pts(history, 0);
  const last = h[h.length - 1];
  let body = `<text x="${PAD}" y="${PAD + 22}" font-size="26" font-weight="700" fill="${C.cream}">Revenue growth, year over year</text>`;
  // Actual / plan divider.
  body += `<line x1="${r2(last[0])}" x2="${r2(last[0])}" y1="104" y2="300" stroke="${C.sage}" stroke-width="2" stroke-dasharray="4 5"/>`;
  body += `<line x1="${plotL}" x2="${plotR}" y1="${r2(y(0))}" y2="${r2(y(0))}" stroke="${C.sage}" stroke-width="1.5" opacity="0.6"/>`;
  body += poly(h, C.cream);
  body += poly([last, ...pts(base, history.length)], C.brassLight);
  body += poly([last, ...pts(down, history.length)], C.rustLight, 'stroke-dasharray="10 8"');
  // Each quarter's point, drawn on its line and tagged with its cell.
  const dots = [
    ...history.map((p, i) => [p, h[i], C.cream]),
    ...base.map((p, i) => [p, [x(history.length + i), y(p.value.v)], C.brassLight]),
    ...down.map((p, i) => [p, [x(history.length + i), y(p.value.v)], C.rustLight]),
  ];
  for (const [p, [px, py], color] of dots) body += `<circle cx="${r2(px)}" cy="${r2(py)}" r="4" fill="${color}" ${mark(p.value, axis, py)}/>`;
  const first = history[0];
  body += `<text x="${r2(h[0][0] + 14)}" y="${r2(h[0][1] + 6)}" font-size="24" font-weight="700" fill="${C.cream}">${tNum(first.value).tag} in ${label(first.quarter, "period")}</text>`;
  body += `<text x="${r2(last[0] - 10)}" y="${r2(last[1] + 40)}" font-size="24" font-weight="700" fill="${C.cream}" text-anchor="end">${tNum(lastActual.value).tag}</text>`;
  const bEnd = base[base.length - 1];
  const dEnd = down[down.length - 1];
  body += `<text x="${r2(plotR + 12)}" y="${r2(y(bEnd.value.v) - 6)}" font-size="24" font-weight="700" fill="${C.brassLight}">Base ${tNum(bEnd.value).tag}</text>`;
  body += `<text x="${r2(plotR + 12)}" y="${r2(y(dEnd.value.v) + 20)}" font-size="24" font-weight="700" fill="${C.rustLight}">Down ${tNum(dEnd.value).tag}</text>`;
  // Status pill, bottom right.
  const status = scored ? "Q3: SCORED" : "Q3: PENDING";
  body += `<rect x="${W - PAD - 196}" y="${H - PAD - 38}" width="196" height="44" rx="8" fill="${C.cream}"/>`;
  body += `<text x="${W - PAD - 98}" y="${H - PAD - 7}" font-size="24" font-weight="900" fill="${C.forest}" text-anchor="middle">${label(status, "status")}</text>`;
  body += `<text x="${PAD}" y="${H - PAD - 7}" font-size="24" font-weight="700" fill="${C.sage}">${label(`${first.quarter} to ${bEnd.quarter}`, "period")}</text>`;
  const alt = `monday.com operating plan: revenue growth slowed from ${first.value.d} in ${first.quarter} to ${lastActual.value.d} in ${lastActual.quarter}; the plan's Base case reaches ${bEnd.value.d} and the Downside ${dEnd.value.d} by ${bEnd.quarter}. ${scored ? "Q3 2026 results scored." : "Q3 2026 results pending."}`;
  return { svg: svgDoc(W, H, C.forest, body, alt), alt };
}

const pending = thumb(false);
const scored = thumb(true);
const browser = await chromium.launch();
await renderAll(browser, [
  { name: "monday-operating-plan", svg: pending.svg, out: "public/project-visuals/monday-operating-plan.webp", w: W, h: H, scale: 2, maxBytes: 60 * 1024 },
  { name: "monday-operating-plan-scored", svg: scored.svg, out: "public/project-visuals/monday-operating-plan-scored.webp", w: W, h: H, scale: 2, maxBytes: 60 * 1024 },
]);
await browser.close();
// Alt text for both variants (the card picks one with the image), merged into the shared file.
const ALTS = join(root, "src/lib/projectVisualAlts.generated.json");
const alts = { ...JSON.parse(readFileSync(ALTS, "utf8")), "monday-operating-plan": pending.alt, "monday-operating-plan-scored": scored.alt };
writeFileSync(ALTS, JSON.stringify(Object.fromEntries(Object.entries(alts).sort()), null, 2) + "\n");
console.log("wrote src/lib/projectVisualAlts.generated.json (monday.com keys)");

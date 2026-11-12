// Renders the home-card thumbnails for the five workbook- and data-backed projects:
//   node scripts/render-project-thumbnails.mjs
// Each card is a different small chart, drawn here as SVG from the project's own data:
// - Caterpillar: the Construction Industries sales bridge, Q2 2025 to Q2 2026
//   (Construction Industries!I5:I11, as disclosed; the workbook reconciles it to zero);
// - Arm: the DCF-implied price, its sensitivity range and the market price on one scale
//   (DCF Valuation!B48, B49 and the B54:F58 sensitivity grid);
// - Microsoft x Activision: the EPS bridge, standalone to pro forma, and the synergies
//   that close the gap (Accretion Dilution!B20:B21, Synergy Breakeven!B10);
// - Nike: the North America bull / base / bear fan, with the base-case cushion over the
//   revenue Greater China's decline requires (Scenario Dashboard!B5:D5, B37:B42);
// - FP&A Intelligence Engine: the validation lab's detection map, one stacked bar per kind
//   of fault, with the page's check / tilde / cross marks (public/engine/validation-lab.json).
// Every number is a tagged element (scripts/thumbnail-kit.mjs); scripts/test-thumbnails.py
// checks each against the data. Model Preview JSONs are hash-checked by
// `npm run check:model-preview`; the lab file by `npm run check:validation-lab`.
//
// Output: public/project-visuals/<slug>.webp, 16:10 at 2x (laid out at 640 x 400 CSS px,
// written at 1280 x 800). The card shows it about 0.5x, so the smallest text, 24 CSS px,
// reads at about 12px; most text is 26 to 30px.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { C, esc, label, linear, mark, markQuery, numCell, r2, renderAll, root, svgDoc, tNum, tQuery, tText, cell } from "./thumbnail-kit.mjs";

const W = 640;
const H = 400;
const PAD = 34;

const heading = (text, color = C.soft) => `<text x="${PAD}" y="${PAD + 22}" font-size="26" font-weight="700" fill="${color}">${text}</text>`;
/** The small break mark on a bar whose value axis does not start at zero. */
const breakMark = (x, y, w, bg) => `<path d="M${r2(x - 2)} ${r2(y + 4)} l${r2(w / 3)} -8 l${r2(w / 3)} 8 l${r2(w / 3 + 4)} -8" fill="none" stroke="${bg}" stroke-width="5"/>`;

// --- Caterpillar: CI sales bridge, Q2 2025 -> Q2 2026 ------------------------------------
function caterpillar() {
  const F = "public/caterpillar/model-preview.json";
  const S = "Construction Industries";
  if (cell(F, S, "I4").d !== "Q2 2026") throw new Error("Caterpillar: column I is not Q2 2026");
  const start = numCell(F, S, "I6", "Prior-year segment sales");
  const steps = [
    ["Volume", numCell(F, S, "I8", "Volume")],
    ["Price", numCell(F, S, "I9", "Price realization")],
    ["FX", numCell(F, S, "I10", "Currency")],
    ["Other", numCell(F, S, "I11", "Inter-segment")],
  ];
  const end = numCell(F, S, "I5", "Segment sales");
  const sum = start.v + steps.reduce((a, [, c]) => a + c.v, 0);
  if (Math.abs(sum - end.v) > 1e-6) throw new Error(`Caterpillar bridge does not reconcile (${sum} vs ${end.v})`);
  // The value axis starts below the prior-year bar (marked with a break) so the steps read.
  const lo = start.v * 0.8;
  const top = 96;
  const base = 330;
  const y = linear(lo, end.v * 1.02, base, top);
  const slot = (W - 2 * PAD) / 6;
  const bw = slot * 0.62;
  const x = (i) => PAD + slot * i + (slot - bw) / 2;
  const axis = "cat-bridge";
  let body = heading(`CI sales bridge, ${label("Q2 2026", "period")} ($M)`);
  const labelAt = (i, text) => `<text x="${r2(x(i) + bw / 2)}" y="${base + 34}" font-size="24" font-weight="700" fill="${C.soft}" text-anchor="middle">${text}</text>`;
  // Start bar.
  body += `<rect x="${r2(x(0))}" y="${r2(y(start.v))}" width="${r2(bw)}" height="${r2(base - y(start.v))}" fill="${C.charcoal}" ${mark(start, axis, y(start.v))}/>`;
  body += breakMark(x(0), base - 26, bw, C.brassPale);
  body += `<text x="${r2(x(0) + bw / 2)}" y="${r2(y(start.v) - 10)}" font-size="24" font-weight="700" fill="${C.charcoal}" text-anchor="middle">${tNum(start, "int").tag}</text>`;
  body += labelAt(0, label("Q2 ’25", "period"));
  let level = start.v;
  steps.forEach(([name, c], k) => {
    const i = k + 1;
    const y0 = y(level);
    const y1 = y(level + c.v);
    body += `<rect x="${r2(x(i))}" y="${r2(Math.min(y0, y1))}" width="${r2(bw)}" height="${r2(Math.max(Math.abs(y0 - y1), 3))}" fill="${C.brass}" ${mark(c, `${axis}-step`, y0 - y1)}/>`;
    body += `<line x1="${r2(x(i - 1) + bw)}" x2="${r2(x(i))}" y1="${r2(y0)}" y2="${r2(y0)}" stroke="${C.soft}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    body += `<text x="${r2(x(i) + bw / 2)}" y="${r2(Math.min(y0, y1) - 10)}" font-size="24" font-weight="700" fill="${C.brassInk}" text-anchor="middle">${tNum(c, "signedInt").tag}</text>`;
    body += labelAt(i, label(name));
    level += c.v;
  });
  body += `<line x1="${r2(x(4) + bw)}" x2="${r2(x(5))}" y1="${r2(y(level))}" y2="${r2(y(level))}" stroke="${C.soft}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  body += `<rect x="${r2(x(5))}" y="${r2(y(end.v))}" width="${r2(bw)}" height="${r2(base - y(end.v))}" fill="${C.charcoal}" ${mark(end, axis, y(end.v))}/>`;
  body += breakMark(x(5), base - 26, bw, C.brassPale);
  body += `<text x="${r2(x(5) + bw / 2)}" y="${r2(y(end.v) - 10)}" font-size="24" font-weight="700" fill="${C.charcoal}" text-anchor="middle">${tNum(end, "int").tag}</text>`;
  body += labelAt(5, label("Q2 ’26", "period"));
  const alt = `Caterpillar: Construction Industries sales bridge from ${tNum(start, "int").d} ($M) in Q2 2025 to ${tNum(end, "int").d} in Q2 2026: volume ${tNum(steps[0][1], "signedInt").d}, price ${tNum(steps[1][1], "signedInt").d}, currency ${tNum(steps[2][1], "signedInt").d}, inter-segment ${tNum(steps[3][1], "signedInt").d}.`;
  return { slug: "caterpillar", svg: svgDoc(W, H, C.brassPale, body, alt), alt };
}

// --- Arm: DCF value, its sensitivity range and the market price on one scale ------------
function arm() {
  const F = "public/arm/model-preview.json";
  const S = "DCF Valuation";
  const dcf = numCell(F, S, "B48", "Implied Share Price (DCF)");
  const mkt = numCell(F, S, "B49");
  const mktLabel = cell(F, S, "A49");
  if (!mktLabel.d.startsWith("Current Market Price (")) throw new Error(`Arm A49 reads "${mktLabel.d}"`);
  const date = /\(([^)]+)\)/.exec(mktLabel.d)[1];
  // The WACC x terminal-growth sensitivity grid, B54:F58: its lowest and highest values.
  const grid = [];
  for (const col of "BCDEF") for (let r = 54; r <= 58; r++) grid.push(numCell(F, S, `${col}${r}`));
  const lo = grid.reduce((a, b) => (b.v < a.v ? b : a));
  const hi = grid.reduce((a, b) => (b.v > a.v ? b : a));
  if (!(lo.v <= dcf.v && dcf.v <= hi.v)) throw new Error("Arm: the DCF value is outside its sensitivity grid");
  const axisY = 236;
  const x = linear(0, mkt.v * 1.06, PAD + 6, W - PAD - 6);
  const axis = "arm-price";
  let body = heading("Arm share price, one scale ($)");
  body += `<line x1="${r2(x(0))}" x2="${r2(W - PAD)}" y1="${axisY}" y2="${axisY}" stroke="${C.soft}" stroke-width="2"/>`;
  // Sensitivity range band, DCF point, market point.
  body += `<rect x="${r2(x(lo.v))}" y="${axisY - 22}" width="${r2(x(hi.v) - x(lo.v))}" height="44" rx="6" fill="${C.sage}" ${mark(lo, axis, x(lo.v))}/>`;
  body += `<rect x="${r2(x(hi.v)) - 1}" y="${axisY - 22}" width="1" height="44" fill="${C.sage}" ${mark(hi, axis, x(hi.v))}/>`;
  body += `<circle cx="${r2(x(dcf.v))}" cy="${axisY}" r="13" fill="${C.forest}" ${mark(dcf, axis, x(dcf.v))}/>`;
  body += `<circle cx="${r2(x(mkt.v))}" cy="${axisY}" r="13" fill="${C.rust}" ${mark(mkt, axis, x(mkt.v))}/>`;
  body += `<text x="${r2(x(dcf.v) - 14)}" y="${axisY - 42}" font-size="30" font-weight="700" fill="${C.forest}">DCF ${tNum(dcf).tag}</text>`;
  body += `<text x="${r2(x(mkt.v) + 13)}" y="${axisY - 42}" font-size="30" font-weight="700" fill="${C.rust}" text-anchor="end">Market ${tNum(mkt).tag}</text>`;
  body += `<text x="${r2(x(lo.v))}" y="${axisY + 58}" font-size="24" font-weight="700" fill="${C.soft}">Sensitivity ${tNum(lo).tag}–${tNum(hi).tag}</text>`;
  body += `<text x="${PAD}" y="${H - PAD}" font-size="24" font-weight="700" fill="${C.soft}">Market price on ${tText(mktLabel, date)}</text>`;
  const alt = `Arm: on one price scale, my DCF implies ${dcf.d} a share (sensitivity range ${lo.d} to ${hi.d}) against a ${mkt.d} market price on ${date}.`;
  return { slug: "arm", svg: svgDoc(W, H, C.mist, body, alt), alt };
}

// --- Microsoft x Activision: the EPS gap and the synergies that close it -----------------
function msft() {
  const F = "public/microsoft-activision/model-preview.json";
  const standalone = numCell(F, "Accretion Dilution", "B21", "Microsoft standalone diluted EPS");
  const proForma = numCell(F, "Accretion Dilution", "B20", "Pro forma diluted EPS");
  const synergies = numCell(F, "Synergy Breakeven", "B10", "Required annual pre-tax synergies");
  if (cell(F, "Synergy Breakeven", "D10").d !== "Solves to EPS-neutral") throw new Error("MSFT: B10 no longer solves to EPS-neutral");
  // Three bars: standalone EPS, pro forma with no synergies, and EPS-neutral (standalone EPS
  // again: the synergies are the amount that brings pro forma back to it).
  const lo = proForma.v * 0.94;
  const top = 104;
  const base = 318;
  const y = linear(lo, standalone.v * 1.01, base, top);
  const slot = (W - 2 * PAD) / 3;
  const bw = slot * 0.5;
  const x = (i) => PAD + slot * i + (slot - bw) / 2;
  const axis = "msft-eps";
  let body = heading(`Diluted EPS, ${label("FY2023", "period")} ($)`);
  const bar = (i, c, fill) =>
    `<rect x="${r2(x(i))}" y="${r2(y(c.v))}" width="${r2(bw)}" height="${r2(base - y(c.v))}" fill="${fill}" ${mark(c, axis, y(c.v))}/>` +
    breakMark(x(i), base - 26, bw, C.rustPale) +
    `<text x="${r2(x(i) + bw / 2)}" y="${r2(y(c.v) - 10)}" font-size="28" font-weight="700" fill="${C.charcoal}" text-anchor="middle">${tNum(c).tag}</text>`;
  body += bar(0, standalone, C.charcoal);
  body += bar(1, proForma, C.rust);
  // The synergy step, from pro forma back up to EPS-neutral.
  body += `<rect x="${r2(x(2))}" y="${r2(y(standalone.v))}" width="${r2(bw)}" height="${r2(y(proForma.v) - y(standalone.v))}" fill="${C.forest}" ${mark(standalone, `${axis}-neutral`, y(standalone.v))}/>`;
  body += `<rect x="${r2(x(2))}" y="${r2(y(proForma.v))}" width="${r2(bw)}" height="${r2(base - y(proForma.v))}" fill="${C.rust}" opacity="0.35" ${mark(proForma, `${axis}-neutral`, y(proForma.v))}/>`;
  body += breakMark(x(2), base - 26, bw, C.rustPale);
  body += `<line x1="${r2(x(0) + bw)}" x2="${r2(x(2))}" y1="${r2(y(standalone.v))}" y2="${r2(y(standalone.v))}" stroke="${C.soft}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  body += `<text x="${r2(x(2) + bw / 2)}" y="${r2(y(standalone.v) - 10)}" font-size="24" font-weight="700" fill="${C.forest}" text-anchor="middle">+${tNum(synergies, "usdB2").tag}/yr</text>`;
  const names = ["Standalone", "Deal, no", "EPS-neutral"];
  const names2 = ["", "synergies", "with synergies"];
  names.forEach((n, i) => {
    body += `<text x="${r2(x(i) + bw / 2)}" y="${base + 32}" font-size="24" font-weight="700" fill="${C.soft}" text-anchor="middle">${esc(n)}</text>`;
    if (names2[i]) body += `<text x="${r2(x(i) + bw / 2)}" y="${base + 60}" font-size="24" font-weight="700" fill="${C.soft}" text-anchor="middle">${esc(names2[i])}</text>`;
  });
  const alt = `Microsoft and Activision: diluted EPS falls from ${standalone.d} standalone to ${proForma.d} pro forma with no synergies; about ${tNum(synergies, "usdB2").d} a year of pre-tax synergies brings it back to EPS-neutral.`;
  return { slug: "msft", svg: svgDoc(W, H, C.rustPale, body, alt), alt };
}

// --- Nike: North America bull / base / bear fan and the cushion --------------------------
function nike() {
  const F = "public/nike/model-preview.json";
  const S = "Scenario Dashboard";
  if (cell(F, S, "A11").d !== "Total Consolidated Revenue, FY2029E") throw new Error("Nike: the scenario table is no longer FY2029E");
  const [bull, base, bear] = ["B5", "C5", "D5"].map((a) => numCell(F, S, a, "North America"));
  const fy26 = numCell(F, S, "B37", "North America Revenue, FY2026A");
  const required = numCell(F, S, "B38");
  if (!cell(F, S, "A38").d.startsWith("North America Revenue Required by FY20")) throw new Error("Nike: A38 moved");
  const fy28 = numCell(F, S, "B40");
  if (!cell(F, S, "A40").d.startsWith("North America Revenue, FY2028E (Base")) throw new Error("Nike: A40 moved");
  const cushion = numCell(F, S, "B42");
  if (!cell(F, S, "A42").d.startsWith("Cushion")) throw new Error("Nike: A42 moved");
  // Years on the x axis: FY2026A, FY2028E, FY2029E (only these have values; the fan joins them).
  const xs = { 2026: PAD + 16, 2028: 330, 2029: 456 };
  const x = (yr) => xs[yr];
  const y = linear(fy26.v * 0.98, bull.v * 1.01, 324, 124);
  const axis = "nike-na";
  let body = heading("North America revenue ($M)");
  const line = (a, b, color, dash = "") => `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${color}" stroke-width="5" stroke-linecap="round" ${dash}/>`;
  const p26 = [x(2026), y(fy26.v)];
  body += line(p26, [x(2029), y(bull.v)], C.forest);
  body += line(p26, [x(2029), y(bear.v)], C.rust);
  body += line(p26, [x(2028), y(fy28.v)], C.charcoal) + line([x(2028), y(fy28.v)], [x(2029), y(base.v)], C.charcoal);
  // Required level at FY2028E and the cushion above it.
  body += `<line x1="${x(2028) - 40}" x2="${x(2028) + 40}" y1="${r2(y(required.v))}" y2="${r2(y(required.v))}" stroke="${C.brass}" stroke-width="4" ${mark(required, axis, y(required.v))}/>`;
  // The cushion: a bracket from the required level up to the base case at FY2028E.
  body += `<path d="M${x(2028) + 22} ${r2(y(required.v))} h8 V${r2(y(fy28.v))} h-8" fill="none" stroke="${C.brass}" stroke-width="3"/>`;
  body += `<text x="${PAD}" y="${PAD + 58}" font-size="24" font-weight="700" fill="${C.brassInk}">Base clears the need by ${tNum(cushion, "usdM").tag} (${label("FY28E", "period")})</text>`;
  for (const [c, yr] of [[fy26, 2026], [fy28, 2028], [bull, 2029], [base, 2029], [bear, 2029]]) {
    body += `<circle cx="${x(yr)}" cy="${r2(y(c.v))}" r="7" fill="${C.charcoal}" ${mark(c, axis, y(c.v))}/>`;
  }
  const end = (c, name, color, dy = 0) => `<text x="${x(2029) + 14}" y="${r2(y(c.v) + 9 + dy)}" font-size="24" font-weight="700" fill="${color}">${name} ${tNum(c).tag}</text>`;
  body += end(bull, "Bull", C.forest) + end(base, "Base", C.charcoal) + end(bear, "Bear", C.rust);
  body += `<text x="${x(2026)}" y="${H - PAD}" font-size="24" font-weight="700" fill="${C.soft}">${label("FY26A", "period")}</text>`;
  body += `<text x="${x(2028)}" y="${H - PAD}" font-size="24" font-weight="700" fill="${C.soft}" text-anchor="middle">${label("FY28E", "period")}</text>`;
  body += `<text x="${x(2029)}" y="${H - PAD}" font-size="24" font-weight="700" fill="${C.soft}" text-anchor="middle">${label("FY29E", "period")}</text>`;
  const alt = `Nike: North America revenue ($M) from FY2026 to ${bull.d} (bull), ${base.d} (base) or ${bear.d} (bear) in FY2029E; the base case is ${tNum(cushion, "usdM").d} above what Greater China's decline requires by FY2028E.`;
  return { slug: "nike", svg: svgDoc(W, H, C.cream, body, alt), alt };
}

// --- FP&A Intelligence Engine: the detection map as stacked bars -------------------------
function engine() {
  const SRC = "public/engine/validation-lab.json";
  const lab = JSON.parse(readFileSync(join(root, SRC), "utf8"));
  // The page's classification (src/lib/validationLab.ts, detectionOf).
  const detection = (c) => (c.group === "control" ? null : c.faulty && c.actual.outcome === "ACCEPT" ? "missed" : c.group === "conditional" ? "conditional" : c.actual.outcome === "REJECT" ? "caught" : "missed");
  const KINDS = ["caught", "conditional", "missed"];
  const STYLE = { caught: { fill: C.forest, stroke: C.forest, glyph: C.cream }, conditional: { fill: C.brassPale, stroke: C.brassInk, glyph: C.brassInk }, missed: { fill: C.rust, stroke: C.rust, glyph: C.cream } };
  const rows = lab.topics.map((t) => ({ id: t.id, counts: Object.fromEntries(KINDS.map((k) => [k, lab.cases.filter((c) => c.topic === t.id && detection(c) === k).length])) }));
  const totals = Object.fromEntries(KINDS.map((k) => [k, rows.reduce((a, r) => a + r.counts[k], 0)]));
  const mapped = KINDS.reduce((a, k) => a + totals[k], 0);
  const widest = Math.max(...rows.map((r) => KINDS.reduce((a, k) => a + r.counts[k], 0)));
  const x = linear(0, widest, PAD, W - PAD);
  const top = 82;
  const rowH = 17;
  const gap = 5;
  let body = `<text x="${PAD}" y="${PAD + 22}" font-size="26" font-weight="700" fill="${C.soft}">Detection map: ${tQuery(SRC, "cases:mapped", mapped).tag} cases by kind of fault</text>`;
  rows.forEach((r, i) => {
    let at = 0;
    const yy = top + i * (rowH + gap);
    for (const k of KINDS) {
      const n = r.counts[k];
      if (!n) continue;
      body += `<rect x="${r2(x(at))}" y="${yy}" width="${r2(x(at + n) - x(at)) - 2}" height="${rowH}" rx="3" fill="${STYLE[k].fill}" stroke="${STYLE[k].stroke}" stroke-width="1.5" ${markQuery(SRC, `count:topic=${r.id}:detection=${k}`, n, "engine-count", x(at + n) - x(at))}/>`;
      at += n;
    }
  });
  // Legend: the page's marks with the totals.
  const glyph = (k, gx, gy) => {
    const s = STYLE[k];
    const common = `fill="none" stroke="${s.glyph}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
    const path = { caught: "M6.5 12.5l3.8 3.8 7.2-8.4", conditional: "M6 13.5c2-3.2 4-3.2 6 0s4 3.2 6 0", missed: "M7.5 7.5l9 9M16.5 7.5l-9 9" }[k];
    return `<g transform="translate(${gx} ${gy}) scale(1.4)"><rect x="0.75" y="0.75" width="22.5" height="22.5" rx="4" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.5"/><path d="${path}" ${common}/></g>`;
  };
  const ly = H - PAD - 34;
  const legend = [["caught", "caught"], ["conditional", "conditional"], ["missed", "missed"]];
  const lx = [PAD, PAD + 172, PAD + 404];
  legend.forEach(([k, word], i) => {
    body += glyph(k, lx[i], ly);
    body += `<text x="${lx[i] + 42}" y="${ly + 25}" font-size="24" font-weight="700" fill="${C.charcoal}">${tQuery(SRC, `count:detection=${k}`, totals[k]).tag} ${word}</text>`;
  });
  // Alt text: the whole lab (as the page's stat tile states it), then what the map shows. Not every
  // mapped case is faulty: the conditional group includes correct roundings or conversions.
  const controls = lab.cases.filter((c) => c.group === "control").length;
  const faulty = lab.cases.filter((c) => c.faulty).length;
  const tolerated = lab.cases.filter((c) => !c.faulty && c.group !== "control").length;
  if (faulty + tolerated + controls !== lab.cases.length || faulty + tolerated !== mapped) throw new Error("engine thumbnail: case counts do not add up");
  const alt = `FP&A Intelligence Engine validation lab: ${lab.cases.length} cases (${faulty} faulty statements, ${tolerated} correct roundings or conversions, ${controls} valid controls). The detection map shows the ${mapped} that are not controls, across ${rows.length} kinds of fault: ${totals.caught} caught, ${totals.conditional} conditional, ${totals.missed} missed.`;
  return { slug: "fpa-intelligence-engine", svg: svgDoc(W, H, C.white, body, alt), alt };
}

export const THUMBS = [caterpillar(), arm(), msft(), nike(), engine()];

const browser = await chromium.launch();
await renderAll(
  browser,
  THUMBS.map((t) => ({ name: t.slug, svg: t.svg, out: `public/project-visuals/${t.slug}.webp`, w: W, h: H, scale: 2, maxBytes: 60 * 1024 })),
);
await browser.close();
// Merge: render-monday-thumbnail.mjs writes the monday.com keys.
const ALTS = join(root, "src/lib/projectVisualAlts.generated.json");
const alts = { ...JSON.parse(readFileSync(ALTS, "utf8")), ...Object.fromEntries(THUMBS.map((t) => [t.slug, t.alt])) };
writeFileSync(ALTS, JSON.stringify(Object.fromEntries(Object.entries(alts).sort()), null, 2) + "\n");
console.log("wrote src/lib/projectVisualAlts.generated.json");

// Shared helpers for the card thumbnails (render-project-thumbnails.mjs,
// render-monday-thumbnail.mjs). Each thumbnail is an SVG drawn here from the
// projects' existing data files; every number in it is a tagged element:
//   data-src  the data file (repository path)
//   data-ref  the cell ("Sheet!B48", as the workbook addresses it) or JSON query
//   data-v    the raw value read from it
//   data-d    the text printed (absent on marks); data-fmt names how data-v became it
//   data-axis / data-pos  for drawn marks: the value axis and the coordinate on it
// The SVG is kept in scripts/thumbnails/<name>.svg and its PNG/WebP render goes to
// public/; scripts/thumbnails/manifest.json records both SHA-256s, so
// scripts/test-thumbnails.py can check every tagged value against the data and
// that each image is the render of its SVG.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The site's colour tokens (src/app/globals.css) and the chart palette already used
// on the monday.com page (src/components/monday/MondayCharts.tsx). Nothing new.
export const C = {
  cream: "#f5f1e6",
  charcoal: "#2a2820",
  soft: "#5b5847",
  forest: "#1e3a2b",
  forestDark: "#152a1f",
  brass: "#96703e",
  brassInk: "#76572e",
  brassLight: "#d8b888",
  brassPale: "#ecdfc2",
  mist: "#e6ebea",
  rust: "#a1462f",
  rustPale: "#f1ded8",
  rustLight: "#f4b9a6",
  sage: "#c9d6cf",
  white: "#ffffff",
};
export const FONT = "Arial, Helvetica, sans-serif";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const r2 = (n) => Math.round(n * 100) / 100;
export const linear = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0);

const docs = new Map();
function doc(file) {
  if (!docs.has(file)) docs.set(file, JSON.parse(readFileSync(join(root, file), "utf8")));
  return docs.get(file);
}

const colLetter = (c0) => {
  let s = "";
  for (let n = c0 + 1; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Every cell of a sheet (all exported views), with its workbook address and shown text. */
export function sheetCells(file, sheet) {
  const out = [];
  for (const t of doc(file).sheets) {
    if ((t.sheet ?? t.name) !== sheet) continue;
    for (const x of t.cells) {
      const r = (t.rowIndex ? t.rowIndex[x.r] : x.r) + 1;
      const c0 = t.colIndex ? t.colIndex[x.c] : x.c;
      out.push({ file, sheet, r, c: c0, addr: `${colLetter(c0)}${r}`, v: x.v, d: (x.d ?? (x.v == null ? "" : String(x.v))).trim() });
    }
  }
  if (!out.length) throw new Error(`${file}: no sheet "${sheet}"`);
  return out;
}

/** One cell by workbook address ("B48"). */
export function cell(file, sheet, addr) {
  const hit = sheetCells(file, sheet).find((x) => x.addr === addr);
  if (!hit) throw new Error(`${file}: ${sheet}!${addr} not found`);
  return hit;
}

/** A numeric cell, checked against the label expected in column A of its row. */
export function numCell(file, sheet, addr, label) {
  const c = cell(file, sheet, addr);
  if (typeof c.v !== "number") throw new Error(`${file}: ${sheet}!${addr} is not a number (${JSON.stringify(c.v)})`);
  if (label !== undefined) {
    const a = cell(file, sheet, `A${c.r}`).d;
    if (a !== label) throw new Error(`${file}: ${sheet}!A${c.r} reads "${a}", expected "${label}"`);
  }
  return c;
}

// --- Printed values: how a raw value becomes text (mirrored in test-thumbnails.py) ---
export const FORMATS = {
  shown: (v, c) => c.d, // exactly as the workbook shows it
  int: (v) => Math.round(v).toLocaleString("en-US"),
  signedInt: (v) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v)).toLocaleString("en-US")}`,
  usdB2: (v) => `$${(v / 1000).toFixed(2)}B`, // $ millions -> $x.xxB
  usdM: (v) => `$${Math.round(v).toLocaleString("en-US")}M`,
  usd2: (v) => `$${v.toFixed(2)}`,
  pct1: (v) => `${(v * 100).toFixed(1)}%`,
};

function attrs(src, ref, v) {
  return `data-src="${esc(src)}" data-ref="${esc(ref)}" data-v="${v}"`;
}

/** A printed number tied to a workbook cell. */
export function tNum(c, fmt = "shown") {
  const d = FORMATS[fmt](c.v, c);
  return { d, tag: `<tspan ${attrs(c.file, `${c.sheet}!${c.addr}`, c.v)} data-fmt="${fmt}" data-d="${esc(d)}">${esc(d)}</tspan>` };
}

/** A printed number tied to a JSON query (validation-lab counts). */
export function tQuery(src, ref, v, fmt = "int") {
  const d = FORMATS[fmt](v);
  return { d, tag: `<tspan ${attrs(src, ref, v)} data-fmt="${fmt}" data-d="${esc(d)}">${esc(d)}</tspan>` };
}

/** Text copied from a cell (a date in a label, say): it must appear in the cell's text. */
export function tText(c, text) {
  if (!c.d.includes(text)) throw new Error(`"${text}" is not in ${c.sheet}!${c.addr} ("${c.d}")`);
  return `<tspan data-src="${esc(c.file)}" data-ref="${esc(`${c.sheet}!${c.addr}`)}" data-text="${esc(text)}">${esc(text)}</tspan>`;
}

/** Attributes for a drawn mark at coordinate `pos` on value axis `axis`. */
export function mark(c, axis, pos) {
  return `${attrs(c.file, `${c.sheet}!${c.addr}`, c.v)} data-axis="${axis}" data-pos="${r2(pos)}"`;
}
export function markQuery(src, ref, v, axis, pos) {
  return `${attrs(src, ref, v)} data-axis="${axis}" data-pos="${r2(pos)}"`;
}

/** A non-numeric label that may contain digits (a quarter name, say). */
export const label = (text, kind = "label") => `<tspan data-label="${kind}">${esc(text)}</tspan>`;

export function svgDoc(w, h, bg, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">
<title>${esc(title)}</title>
<rect width="${w}" height="${h}" fill="${bg}"/>
${body}
</svg>
`;
}

// --- Rendering --------------------------------------------------------------------

const MANIFEST = join(root, "scripts/thumbnails/manifest.json");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Renders each { name, svg, out, w, h, scale, maxBytes } to WebP (or PNG when out ends in
 * .png), writes the SVG source to scripts/thumbnails/<name>.svg and records both hashes.
 */
export async function renderAll(browser, items) {
  mkdirSync(join(root, "scripts/thumbnails"), { recursive: true });
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  for (const it of items) {
    const page = await browser.newPage({ viewport: { width: it.w, height: it.h }, deviceScaleFactor: it.scale ?? 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0}body{width:${it.w}px;height:${it.h}px;overflow:hidden}svg{display:block}</style></head><body>${it.svg}</body></html>`);
    // Every text element must sit inside the frame.
    const out = await page.evaluate(([w, h]) => [...document.querySelectorAll("text")].filter((t) => { const b = t.getBBox(); return b.x < -0.5 || b.y < -0.5 || b.x + b.width > w + 0.5 || b.y + b.height > h + 0.5; }).map((t) => t.textContent), [it.w, it.h]);
    if (out.length) throw new Error(`${it.name}: text outside the frame: ${out.join(" | ")}`);
    const png = await page.screenshot({ type: "png" });
    let file = png;
    if (it.out.endsWith(".webp")) {
      for (const q of [0.92, 0.88, 0.85, 0.8, 0.75, 0.7]) {
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
        file = Buffer.from(dataUrl.split(",")[1], "base64");
        if (file.length <= (it.maxBytes ?? 80 * 1024)) break;
      }
    }
    if (file.length > (it.maxBytes ?? 80 * 1024)) throw new Error(`${it.name}: ${file.length} bytes, over ${it.maxBytes}`);
    await page.close();
    writeFileSync(join(root, it.out), file);
    writeFileSync(join(root, `scripts/thumbnails/${it.name}.svg`), it.svg);
    manifest[it.name] = { svg: `scripts/thumbnails/${it.name}.svg`, svg_sha256: sha(Buffer.from(it.svg)), image: it.out, image_sha256: sha(file) };
    console.log(`wrote ${it.out}: ${it.w * (it.scale ?? 1)} x ${it.h * (it.scale ?? 1)}, ${file.length} bytes`);
  }
  writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + "\n");
}

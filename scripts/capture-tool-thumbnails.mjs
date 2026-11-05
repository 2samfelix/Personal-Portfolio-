// Captures the Interactive Tools card thumbnails from the built site.
//
//   npm run build && npx next start -p 3100   (in another shell)
//   node scripts/capture-tool-thumbnails.mjs [base-url]
//
// Each thumbnail is a Playwright screenshot of the tool page in its default state (no
// input changed), cropped to the tool's main chart: the FP&A Decision Lab's MRR Growth
// chart (Base / Upside / Downside, with its legend) and the Driver Sensitivity
// Simulator's tornado bars (with their legend). Nothing is redrawn. The crop is centred
// on a canvas of the chart's own background so both images share one size and aspect
// ratio (1200 x 750, 16:10), then written as WebP to public/tool-visuals/.
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "tool-visuals");
const W = 1200;
const H = 750;
const PAD_X = 16; // CSS px of the chart's own background kept around the crop
const PAD_Y = 4; // less above and below, where the heading and the next block sit close

const JOBS = [
  {
    file: "fpa-decision-lab.webp",
    path: "/tools/fpa-decision-lab",
    heading: "MRR Growth",
    children: [1], // the chart and its legend
    viewport: 1280,
  },
  {
    file: "driver-sensitivity-simulator.webp",
    path: "/tools/driver-sensitivity-simulator",
    heading: "Tornado Sensitivity",
    children: [2, 3], // the bars and their legend
    viewport: 560, // a narrower page, so the wide bars come closer to 16:10
  },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });

for (const job of JOBS) {
  await page.setViewportSize({ width: job.viewport, height: 900 });
  await page.goto(BASE + job.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator("section", { has: page.locator("h2", { hasText: job.heading }) }).last();
  await section.scrollIntoViewIfNeeded();
  const { box, bg } = await section.evaluate((s, idx) => {
    const rects = idx.map((i) => s.children[i].getBoundingClientRect());
    const x0 = Math.min(...rects.map((r) => r.left));
    const y0 = Math.min(...rects.map((r) => r.top));
    const x1 = Math.max(...rects.map((r) => r.right));
    const y1 = Math.max(...rects.map((r) => r.bottom));
    // The first opaque background at or above the section is the one the chart sits on.
    let el = s;
    let bg = "rgb(255, 255, 255)";
    while (el) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
        bg = c;
        break;
      }
      el = el.parentElement;
    }
    return { box: { x: x0 + scrollX, y: y0 + scrollY, width: x1 - x0, height: y1 - y0 }, bg };
  }, job.children);
  const clip = { x: box.x - PAD_X, y: box.y - PAD_Y, width: box.width + 2 * PAD_X, height: box.height + 2 * PAD_Y };
  const png = await page.screenshot({ clip, fullPage: true });

  const [r, g, b] = bg.match(/\d+/g).map(Number);
  const scale = Math.min(W / (clip.width * 2), H / (clip.height * 2));
  const w = Math.round(clip.width * 2 * scale);
  const h = Math.round(clip.height * 2 * scale);
  const fitted = await sharp(png).resize(w, h).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: { r, g, b } } })
    .composite([{ input: fitted, left: Math.round((W - w) / 2), top: Math.round((H - h) / 2) }])
    .webp({ quality: 88 })
    .toFile(join(OUT, job.file));
  console.log(`${job.file}: crop ${Math.round(clip.width)}x${Math.round(clip.height)} css px on ${bg} -> ${W}x${H}`);
}

await browser.close();

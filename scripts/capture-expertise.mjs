// Captures a Core Expertise snapshot: a 4:3 crop of a project-page section, from the top of
// the section, at a 600px-wide viewport, taken at 2x and scaled to 1056 x 792 WebP (the same
// size as the other images in public/expertise).
//   npm run build && npx next start -p 3100   (in another shell)
//   node scripts/capture-expertise.mjs http://localhost:3100 /projects/monday-operating-plan "#scenarios" public/expertise/monday-scenarios.webp
// The third argument is a CSS selector; the crop starts at the top of the first match.
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const [base, path, selector, out] = process.argv.slice(2);
if (!out) throw new Error("usage: capture-expertise.mjs <base url> <page path> <css selector> <out.webp>");
const VW = 600;
const W = VW - 48;
const H = Math.round(W * 0.75);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: 1200 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await page.goto(base + path, { waitUntil: "networkidle" });
// Load anything fetched on scroll, then hide the sticky site header and in-page menu.
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 800) await page.evaluate((yy) => scrollTo(0, yy), y);
await page.addStyleTag({ content: "header, nav[aria-label], .sticky { visibility: hidden !important }" });
const box = await page.locator(selector).first().evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX, y: r.top + scrollY };
});
const png = await page.screenshot({ type: "png", fullPage: true, clip: { x: 24, y: box.y, width: W, height: H } });
const webp = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 1056;
  c.height = 792;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, 1056, 792);
  return c.toDataURL("image/webp", 0.9);
}, png.toString("base64"));
await browser.close();
writeFileSync(out, Buffer.from(webp.split(",")[1], "base64"));
console.log(`wrote ${out}: 1056 x 792 from ${path} ${selector}`);

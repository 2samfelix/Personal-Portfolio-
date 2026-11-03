// Captures the large Front Office screenshot shown in the home page's Interactive Tools
// section: the simulator's strategy map, as the built site draws it, at 2x.
//   npm run build && npx next start -p 3100   (in another shell)
//   node scripts/capture-front-office-demo.mjs http://localhost:3100
// Writes public/project-visuals/front-office-demo.webp. The smaller
// public/project-visuals/front-office.webp (project list, link preview) is unchanged.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] ?? "http://localhost:3100";
const OUT = "public/project-visuals/front-office-demo.webp";
const MAX_BYTES = 160 * 1024;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await page.goto(`${base}/tools/front-office-simulator`, { waitUntil: "networkidle" });
// The strategy map: the chart that marks the current plan "YOU ARE HERE".
const svg = page.locator("svg", { has: page.locator("text", { hasText: /^YOU ARE HERE$/ }) }).first();
await svg.scrollIntoViewIfNeeded();
const png = await svg.screenshot({ type: "png" });
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
      return [canvas.toDataURL("image/webp", quality), img.width, img.height];
    },
    [png.toString("base64"), q],
  );
  webp = { buf: Buffer.from(dataUrl[0].split(",")[1], "base64"), w: dataUrl[1], h: dataUrl[2] };
  if (webp.buf.length <= MAX_BYTES) break;
}
await browser.close();
if (webp.buf.length > MAX_BYTES) throw new Error(`${OUT}: ${webp.buf.length} bytes, over ${MAX_BYTES}`);
writeFileSync(join(root, OUT), webp.buf);
console.log(`wrote ${OUT}: ${webp.w} x ${webp.h}, ${webp.buf.length} bytes`);

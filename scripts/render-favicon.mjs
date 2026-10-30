// Renders the "SF" monogram icons into the App Router's icon file conventions:
//   node scripts/render-favicon.mjs
// Same approach as scripts/render-project-thumbnails.mjs: the site's colors (forest #1e3a2b,
// brass-light #d8b888), Arial, drawn by the bundled Chromium. Writes:
//   src/app/icon.png        512 x 512, rounded square on a transparent background
//   src/app/apple-icon.png  180 x 180, full-bleed square (iOS rounds the corners itself)
//   src/app/favicon.ico     16, 32 and 48 px PNG images in one ICO file
// Next.js adds the matching <link> tags from these files; no head tags are written by hand.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FOREST = "#1e3a2b";
const BRASS = "#d8b888";

/** The monogram at `size` px. `rounded` leaves transparent corners; `fullBleed` fills the square. */
const html = (size, rounded) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0 } html, body { width: ${size}px; height: ${size}px; background: transparent }
  div { width: ${size}px; height: ${size}px; background: ${FOREST}; border-radius: ${rounded ? Math.round(size * 0.2) : 0}px;
        display: flex; align-items: center; justify-content: center;
        font: 900 ${Math.round(size * 0.5)}px/1 Arial, Helvetica, sans-serif; letter-spacing: -0.04em; color: ${BRASS} }
</style></head><body><div>SF</div></body></html>`;

const browser = await chromium.launch();
async function png(size, rounded) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html(size, rounded));
  const buf = await page.screenshot({ type: "png", omitBackground: true });
  await page.close();
  return buf;
}

const icon = await png(512, true);
const apple = await png(180, false);
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const s of icoSizes) icoImages.push(await png(s, true));
await browser.close();

/** An ICO file whose entries are PNG images (supported by every current browser). */
function ico(images, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  images.forEach((img, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i] % 256, 0); // width (0 means 256)
    e.writeUInt8(sizes[i] % 256, 1); // height
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(img.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.length;
    entries.push(e);
  });
  return Buffer.concat([header, ...entries, ...images]);
}

writeFileSync(join(root, "src/app/icon.png"), icon);
writeFileSync(join(root, "src/app/apple-icon.png"), apple);
writeFileSync(join(root, "src/app/favicon.ico"), ico(icoImages, icoSizes));
console.log(`wrote src/app/icon.png (${icon.length} B), src/app/apple-icon.png (${apple.length} B), src/app/favicon.ico (${icoSizes.join("/")} px)`);

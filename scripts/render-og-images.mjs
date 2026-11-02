// Renders the link-preview (Open Graph / Twitter) images:
//   node scripts/render-og-images.mjs
// Same approach as scripts/render-project-thumbnails.mjs: the site's cream, forest and brass-ink,
// Arial, drawn by the bundled Chromium. Every card is built from existing visuals and copy only:
// - one per project page and per tool that has a visual: its title and category from
//   src/lib/projects.ts beside its existing thumbnail (public/project-visuals);
// - one shared card (home, the other tools, the 404): the headshot, the site name and the
//   site description (SITE_DESCRIPTION in src/lib/seo.ts, also the home page's description).
// - the monday.com card's scored variant (og/monday-operating-plan-scored.png), from the
//   "Q3: SCORED" thumbnail; the project page uses it once the Q3 results are scored.
// Output: public/og/<slug>.png and public/og/site.png, 1200 x 630.
// Pass output names to render only those, e.g. `node scripts/render-og-images.mjs monday-operating-plan-scored`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const MAX_BYTES = 400 * 1024;
const C = { cream: "#f5f1e6", forest: "#1e3a2b", ink: "#2a2820", soft: "#5b5847", brassInk: "#76572e" };

// Projects: slug, title, category and visual, read from the project list.
const projectsSrc = readFileSync(join(root, "src/lib/projects.ts"), "utf8");
const projects = [...projectsSrc.matchAll(/slug: "([^"]+)",\s*title: "([^"]+)",\s*category: "([^"]+)",[\s\S]*?(?=\n  \{|\n\];)/g)].map((m) => {
  const visual = /visual: "([^"]+)"/.exec(m[0])?.[1] ?? null;
  return { slug: m[1], title: m[2], category: m[3], visual };
});
if (projects.length < 9) throw new Error(`expected the 9 projects and tools in projects.ts, found ${projects.length}`);
const seoSrc = readFileSync(join(root, "src/lib/seo.ts"), "utf8");
const siteDescription = /SITE_DESCRIPTION =\s*"([^"]+)"/.exec(seoSrc)?.[1];
if (!siteDescription) throw new Error("no SITE_DESCRIPTION in src/lib/seo.ts");

const dataUrl = (file) => {
  const ext = file.split(".").pop();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${readFileSync(join(root, "public", file)).toString("base64")}`;
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0 }
  body { width: ${W}px; height: ${H}px; background: ${C.cream}; font-family: Arial, Helvetica, sans-serif; color: ${C.ink};
         display: flex; overflow: hidden }
  .band { width: 14px; background: ${C.forest} }
  .text { flex: 1; padding: 64px 48px 56px 56px; display: flex; flex-direction: column }
  .label { font-size: 22px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.brassInk} }
  .title { margin-top: 18px; font-size: 54px; font-weight: 900; line-height: 1.05; letter-spacing: -0.02em; color: ${C.forest} }
  .sub { margin-top: 20px; font-size: 26px; line-height: 1.35; color: ${C.soft} }
  .foot { margin-top: auto; font-size: 24px; font-weight: 700; color: ${C.ink} }
  .foot span { color: ${C.brassInk} }
  .art { width: 600px; display: flex; align-items: center; justify-content: center; padding: 40px 48px 40px 0 }
  .art img { width: 100%; height: auto; border-radius: 16px; border: 2px solid rgba(30,58,43,0.15); background: #fff }
  .art img.head { width: 300px; height: 300px; border-radius: 50%; object-fit: cover; border: 6px solid ${C.forest} }
</style></head><body>${body}</body></html>`;

const cards = projects
  .filter((p) => p.visual)
  .map((p) => ({
    out: `og/${p.slug}.png`,
    html: page(`<div class="band"></div>
      <div class="text"><p class="label">${esc(p.category)}</p><p class="title">${esc(p.title)}</p>
        <p class="foot">SAM <span>FELIX</span> · Finance &amp; Analytics Portfolio</p></div>
      <div class="art"><img src="${dataUrl(p.visual)}" alt=""></div>`),
  }));
const monday = projects.find((p) => p.slug === "monday-operating-plan");
if (monday) {
  cards.push({
    out: "og/monday-operating-plan-scored.png",
    html: page(`<div class="band"></div>
      <div class="text"><p class="label">${esc(monday.category)}</p><p class="title">${esc(monday.title)}</p>
        <p class="foot">SAM <span>FELIX</span> · Finance &amp; Analytics Portfolio</p></div>
      <div class="art"><img src="${dataUrl("project-visuals/monday-operating-plan-scored.webp")}" alt=""></div>`),
  });
}
cards.push({
  out: "og/site.png",
  html: page(`<div class="band"></div>
    <div class="text"><p class="label">Finance &amp; Analytics Portfolio</p><p class="title">Sam Felix</p>
      <p class="sub">${esc(siteDescription)}</p>
      <p class="foot">SAM <span>FELIX</span></p></div>
    <div class="art" style="width:440px"><img class="head" src="${dataUrl("headshot.webp")}" alt=""></div>`),
});

mkdirSync(join(root, "public/og"), { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H } });
const only = process.argv.slice(2);
for (const c of cards.filter((c) => !only.length || only.includes(c.out.replace(/^og\/|\.png$/g, "")))) {
  await tab.setContent(c.html, { waitUntil: "load" });
  const overflow = await tab.evaluate(() => [...document.querySelectorAll(".text > *")].some((e) => e.getBoundingClientRect().bottom > innerHeight - 20) || document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error(`${c.out}: text overflows the card`);
  const png = await tab.screenshot({ type: "png" });
  if (png.length > MAX_BYTES) throw new Error(`${c.out}: ${png.length} bytes, over ${MAX_BYTES}`);
  writeFileSync(join(root, "public", c.out), png);
  console.log(`wrote public/${c.out}: ${W} x ${H}, ${png.length} bytes`);
}
await browser.close();

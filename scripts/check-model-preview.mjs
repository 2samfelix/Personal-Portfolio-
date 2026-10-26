// Fails if a workbook changed without its Model Preview JSON being regenerated:
// compares each workbook's SHA-256 with the one recorded in its JSON and, for a
// workbook copied from another repository, with the recorded source hash too.
// It also checks that each curated view's rows and columns match its ranges.
// Regenerate with `npm run export:model-preview` (needs Python + LibreOffice).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEWS = [
  "public/caterpillar/model-preview.json",
  "public/arm/model-preview.json",
  "public/microsoft-activision/model-preview.json",
  "public/nike/model-preview.json",
];

let failed = false;
for (const rel of PREVIEWS) {
  const preview = JSON.parse(readFileSync(join(root, rel), "utf8"));
  const { file, sha256, source } = preview.workbook;
  const actual = createHash("sha256").update(readFileSync(join(root, file))).digest("hex");
  if (actual !== sha256) {
    failed = true;
    console.error(
      `Model Preview is stale: ${rel}\n  ${file}\n  workbook sha256: ${actual}\n  JSON records:    ${sha256}\n` +
        "Run `npm run export:model-preview` and commit the regenerated JSON.",
    );
    continue;
  }
  if (source && source.sha256 !== actual) {
    failed = true;
    console.error(
      `Workbook copy differs from its source: ${file}\n  copy sha256:   ${actual}\n  source sha256: ${source.sha256}\n` +
        `  source: ${source.repo}@${source.commit.slice(0, 12)}:${source.path}`,
    );
    continue;
  }
  // A view's rows and columns must be exactly its ranges (rows stacked with one
  // spacer between ranges; columns the span the ranges cover).
  let viewsOk = true;
  for (const view of preview.sheets.filter((s) => s.ranges)) {
    const boxes = view.ranges.map((range) => {
      const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
      const col = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      return { r1: +m[2] - 1, r2: +m[4] - 1, c1: col(m[1]), c2: col(m[3]) };
    });
    const rows = boxes.flatMap((b, i) => [...(i ? [null] : []), ...Array.from({ length: b.r2 - b.r1 + 1 }, (_, k) => b.r1 + k)]);
    const c1 = Math.min(...boxes.map((b) => b.c1)), c2 = Math.max(...boxes.map((b) => b.c2));
    const cols = Array.from({ length: c2 - c1 + 1 }, (_, k) => c1 + k);
    if (JSON.stringify(rows) !== JSON.stringify(view.rowIndex) || JSON.stringify(cols) !== JSON.stringify(view.colIndex) || view.cols !== cols.length) {
      failed = true;
      viewsOk = false;
      console.error(`View "${view.name}" in ${rel} does not match its ranges ${view.ranges.join(", ")}. Re-run the export.`);
    }
  }
  if (!viewsOk) continue;
  console.log(`OK: ${rel} matches ${file} (sha256 ${actual.slice(0, 12)}…)${source ? `, source ${source.repo}@${source.commit.slice(0, 7)}` : ""}`);
}
process.exit(failed ? 1 : 0);

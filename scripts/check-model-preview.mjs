// Fails if a workbook changed without its Model Preview JSON being regenerated:
// compares each workbook's SHA-256 with the one recorded in its JSON and, for a
// workbook copied from another repository, with the recorded source hash too.
// Regenerate with `npm run export:model-preview` (needs Python + LibreOffice).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEWS = ["public/caterpillar/model-preview.json", "public/arm/model-preview.json"];

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
  console.log(`OK: ${rel} matches ${file} (sha256 ${actual.slice(0, 12)}…)${source ? `, source ${source.repo}@${source.commit.slice(0, 7)}` : ""}`);
}
process.exit(failed ? 1 : 0);

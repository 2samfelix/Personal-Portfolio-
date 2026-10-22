// Fails if the Caterpillar workbook changed without the Model Preview JSON being
// regenerated: compares the workbook's SHA-256 with the one recorded in the JSON.
// Regenerate with `npm run export:model-preview` (needs Python + LibreOffice).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = join(root, "public/caterpillar/model-preview.json");
const preview = JSON.parse(readFileSync(jsonPath, "utf8"));
const workbookPath = join(root, preview.workbook.file);
const actual = createHash("sha256").update(readFileSync(workbookPath)).digest("hex");

if (actual !== preview.workbook.sha256) {
  console.error(
    `Model Preview is stale: ${preview.workbook.file}\n` +
      `  workbook sha256: ${actual}\n  JSON records:    ${preview.workbook.sha256}\n` +
      "Run `npm run export:model-preview` and commit the regenerated JSON.",
  );
  process.exit(1);
}
console.log(`OK: model-preview.json matches ${preview.workbook.file} (sha256 ${actual.slice(0, 12)}…)`);

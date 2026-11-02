// Fails if the validation lab data no longer matches what it was exported from:
// - public/engine/validation-lab.json differs from the SHA-256 pinned in src/lib/validationLab.ts
//   (the build fails on that too);
// - the engine commit or packet hash in the JSON is not the one pinned in
//   scripts/export-validation-lab.py;
// - the base brief file (fpa-intelligence-engine/accepted-run/c4-run-1.json) changed;
// - any engine file the export read differs at that commit from the SHA-256 recorded.
// The engine files are read from a local clone (--engine <path>, which must be at the
// commit) or, by default, fetched at exactly that commit from GitHub with git.
// Regenerate with scripts/export-validation-lab.py (see its docstring).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const labRaw = readFileSync(join(root, "public/engine/validation-lab.json"));
const lab = JSON.parse(labRaw.toString("utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const errors = [];

const pin = /VALIDATION_LAB_SHA256 = "([0-9a-f]{64})"/.exec(readFileSync(join(root, "src/lib/validationLab.ts"), "utf8"))?.[1];
if (sha256(labRaw) !== pin) errors.push(`validation-lab.json has sha256 ${sha256(labRaw)}, src/lib/validationLab.ts pins ${pin}`);

const exporter = readFileSync(join(root, "scripts/export-validation-lab.py"), "utf8");
const pinnedCommit = /^ENGINE_COMMIT = "([0-9a-f]{40})"/m.exec(exporter)?.[1];
const pinnedPacket = /^PACKET_HASH = "([0-9a-f]{64})"/m.exec(exporter)?.[1];
if (lab.engine.commit !== pinnedCommit) errors.push(`engine commit ${lab.engine.commit} in the JSON, ${pinnedCommit} pinned in the exporter`);
if (lab.validator.packet_hash !== pinnedPacket) errors.push(`packet ${lab.validator.packet_hash} in the JSON, ${pinnedPacket} pinned in the exporter`);
for (const [file, recorded] of Object.entries(lab.validator.files)) {
  if (lab.engine.files[file] !== recorded) errors.push(`${file}: validator hash ${recorded} differs from the engine file record`);
}

const baseHash = sha256(readFileSync(join(root, lab.base.file)));
if (baseHash !== lab.base.sha256) errors.push(`${lab.base.file} changed: sha256 ${baseHash}, JSON records ${lab.base.sha256}`);

const arg = process.argv.indexOf("--engine");
let engine = arg > 0 ? process.argv[arg + 1] : null;
let temp = null;
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  if (!engine) {
    temp = mkdtempSync(join(tmpdir(), "validation-lab-"));
    engine = temp;
    git("-C", engine, "init", "-q");
    git("-C", engine, "fetch", "-q", "--depth", "1", `https://github.com/${lab.engine.repo}`, lab.engine.commit);
    git("-C", engine, "checkout", "-q", "FETCH_HEAD");
  }
  const head = git("-C", engine, "rev-parse", "HEAD");
  if (head !== lab.engine.commit) errors.push(`engine checkout is at ${head}, JSON records ${lab.engine.commit}`);
  for (const [file, recorded] of Object.entries(lab.engine.files)) {
    let actual;
    try {
      actual = sha256(readFileSync(join(engine, file)));
    } catch {
      actual = "missing";
    }
    if (actual !== recorded) errors.push(`${file}: sha256 ${actual}, JSON records ${recorded}`);
  }
} catch (e) {
  errors.push(`could not read the engine at ${lab.engine.commit}: ${e.message.split("\n")[0]}`);
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Validation lab is stale:\n  " + errors.join("\n  ") + "\nRe-run scripts/export-validation-lab.py.");
  process.exit(1);
}
console.log(
  `OK: public/engine/validation-lab.json (${lab.cases.length} cases, sha256 ${pin.slice(0, 12)}…) matches ` +
    `${lab.engine.repo}@${lab.engine.commit.slice(0, 12)} (${Object.keys(lab.engine.files).length} files), ` +
    `packet ${lab.validator.packet_hash.slice(0, 12)}… and ${lab.base.file}`,
);

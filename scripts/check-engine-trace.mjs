// Fails if the "Trace a statement" data no longer matches what it was exported from:
// - the engine commit recorded in public/engine/trace.json is not the one pinned in
//   scripts/export-engine-trace.py;
// - the accepted run file (fpa-intelligence-engine/accepted-run/c4-run-1.json) changed;
// - any engine file the export read differs at that commit from the SHA-256 recorded.
// The engine files are read from a local clone (--engine <path>, which must be at the
// commit) or, by default, fetched at exactly that commit from GitHub with git.
// Regenerate with scripts/export-engine-trace.py (see its docstring).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const trace = JSON.parse(readFileSync(join(root, "public/engine/trace.json"), "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const errors = [];

const exporter = readFileSync(join(root, "scripts/export-engine-trace.py"), "utf8");
const pinned = /^ENGINE_COMMIT = "([0-9a-f]{40})"/m.exec(exporter)?.[1];
if (trace.engine.commit !== pinned) errors.push(`engine commit ${trace.engine.commit} in the JSON, ${pinned} pinned in the exporter`);

const runHash = sha256(readFileSync(join(root, trace.run.file)));
if (runHash !== trace.run.sha256) errors.push(`${trace.run.file} changed: sha256 ${runHash}, JSON records ${trace.run.sha256}`);

const arg = process.argv.indexOf("--engine");
let engine = arg > 0 ? process.argv[arg + 1] : null;
let temp = null;
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  if (!engine) {
    temp = mkdtempSync(join(tmpdir(), "engine-trace-"));
    engine = temp;
    git("-C", engine, "init", "-q");
    git("-C", engine, "fetch", "-q", "--depth", "1", `https://github.com/${trace.engine.repo}`, trace.engine.commit);
    git("-C", engine, "checkout", "-q", "FETCH_HEAD");
  }
  const head = git("-C", engine, "rev-parse", "HEAD");
  if (head !== trace.engine.commit) errors.push(`engine checkout is at ${head}, JSON records ${trace.engine.commit}`);
  for (const [file, recorded] of Object.entries(trace.engine.files)) {
    let actual;
    try {
      actual = sha256(readFileSync(join(engine, file)));
    } catch {
      actual = "missing";
    }
    if (actual !== recorded) errors.push(`${file}: sha256 ${actual}, JSON records ${recorded}`);
  }
} catch (e) {
  errors.push(`could not read the engine at ${trace.engine.commit}: ${e.message.split("\n")[0]}`);
} finally {
  if (temp) rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Engine trace is stale:\n  " + errors.join("\n  ") + "\nRe-run scripts/export-engine-trace.py.");
  process.exit(1);
}
console.log(
  `OK: public/engine/trace.json matches ${trace.engine.repo}@${trace.engine.commit.slice(0, 12)} ` +
    `(${Object.keys(trace.engine.files).length} files) and ${trace.run.file}`,
);

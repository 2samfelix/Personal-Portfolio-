// The validation lab for the FP&A Intelligence Engine page: fault-injected statements run through
// the engine's real acceptance path at a pinned commit by scripts/export-validation-lab.py, which
// writes public/engine/validation-lab.json. That file is pinned here: a different file fails the
// build. Every number the page shows about the lab (stat tiles, chart, table) is computed below
// from the file, never typed. `npm run check:validation-lab` re-checks the engine files.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const VALIDATION_LAB_SHA256 = "5db5e9c01d84628b2e187381a58c5afa38d58ab6f12884c7c8fa473719a812d6";
export const VALIDATION_LAB_PATH = "/engine/validation-lab.json";
// Literal path (scoped to its folder), so the build traces only this file.
const LAB_FILE = join(process.cwd(), "public", "engine", "validation-lab.json");

type Outcome = "ACCEPT" | "REJECT";
export type LabGroup = "control" | "reliable" | "conditional" | "not_established";

export type LabCase = {
  id: string;
  topic: string;
  group: LabGroup;
  faulty: boolean;
  description: string;
  statement: null | {
    id: string;
    kind: string;
    severity: string | null;
    text: string;
    refs: Record<string, string[]>;
    changed: string[];
  };
  expected: { outcome: Outcome; codes: string[] };
  actual: { outcome: Outcome; codes: string[]; status: string };
  matches_expectation: boolean;
  missed: boolean;
  stages: string[];
};

type LabDoc = {
  version: number;
  engine: { repo: string; commit: string; files: Record<string, string> };
  validator: {
    prompt_version: string;
    packet_hash: string;
    packet_version: number;
    files: Record<string, string>;
    python: string;
    pydantic: string;
    entry_point: string;
  };
  base: { file: string; sha256: string; note: string };
  topics: { id: string; label: string }[];
  groups: { id: LabGroup; label: string }[];
  cases: LabCase[];
};

/**
 * How a case shows on the detection map. Controls are not on the map.
 * - caught: a faulty statement in the reliably-caught group, rejected;
 * - conditional: a case in the caught-only-under-conditions group that behaved as the condition says
 *   (a faulty statement rejected, or a correct rounding or conversion accepted);
 * - missed: any faulty statement the validator accepted.
 */
export type Detection = "caught" | "conditional" | "missed";
export const DETECTIONS: Detection[] = ["caught", "conditional", "missed"];

export function detectionOf(c: LabCase): Detection | null {
  if (c.group === "control") return null;
  if (c.faulty && c.actual.outcome === "ACCEPT") return "missed";
  if (c.group === "conditional") return "conditional";
  return c.actual.outcome === "REJECT" ? "caught" : "missed";
}

export type ValidationLab = {
  doc: LabDoc;
  sha256: string;
  cases: (LabCase & { detection: Detection | null })[];
  stats: {
    cases: number;
    controls: number;
    controlsAccepted: number;
    faulty: number;
    caughtAsExpected: number;
    knownLimitations: number;
    asPredicted: number;
  };
  map: { id: string; label: string; counts: Record<Detection, number>; cases: string[][] }[];
};

function fail(message: string): never {
  throw new Error(`Validation lab: ${message}. Re-run scripts/export-validation-lab.py and update the pin.`);
}

let cached: ValidationLab | null = null;

export function loadValidationLab(): ValidationLab {
  if (cached) return cached;
  const raw = readFileSync(LAB_FILE);
  const sha256 = createHash("sha256").update(raw).digest("hex");
  if (sha256 !== VALIDATION_LAB_SHA256) fail(`public${VALIDATION_LAB_PATH} has SHA-256 ${sha256}, but the build pins ${VALIDATION_LAB_SHA256}`);
  const doc = JSON.parse(raw.toString("utf8")) as LabDoc;
  if (doc.version !== 1) fail(`unknown format version ${doc.version}`);

  const cases = doc.cases.map((c) => ({ ...c, detection: detectionOf(c) }));
  const topicIds = new Set(doc.topics.map((t) => t.id));
  for (const c of cases) if (!topicIds.has(c.topic)) fail(`case ${c.id} has unknown topic ${c.topic}`);

  const faulty = cases.filter((c) => c.faulty);
  const stats = {
    cases: cases.length,
    controls: cases.filter((c) => c.group === "control").length,
    controlsAccepted: cases.filter((c) => c.group === "control" && c.actual.outcome === "ACCEPT").length,
    faulty: faulty.length,
    caughtAsExpected: faulty.filter((c) => c.expected.outcome === "REJECT" && c.actual.outcome === "REJECT").length,
    knownLimitations: faulty.filter((c) => c.actual.outcome === "ACCEPT").length,
    asPredicted: cases.filter((c) => c.matches_expectation).length,
  };
  const map = doc.topics.map((t) => {
    const inTopic = cases.filter((c) => c.topic === t.id && c.detection);
    const counts = { caught: 0, conditional: 0, missed: 0 } as Record<Detection, number>;
    for (const c of inTopic) counts[c.detection as Detection] += 1;
    return { ...t, counts, cases: DETECTIONS.map((d) => inTopic.filter((c) => c.detection === d).map((c) => c.id)) };
  });
  cached = { doc, sha256, cases, stats, map };
  return cached;
}

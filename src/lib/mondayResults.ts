// Q3 2026 results for the monday.com page, scored against the locked Q3 call.
//
// The results come from one file, public/monday-operating-plan/monday_q3_actuals.json,
// which does not exist until the results are out (November 9, 2026). Without it the
// page shows the pending state and the build passes. With it, the file must match
// the schema below and the SHA-256 pinned in ACTUALS_SHA256, or the build fails.
//
// The locked ranges, guidance and trigger thresholds are never typed here: they are
// read from the hash-pinned workbooks (src/lib/mondayPlan.ts). Each result is a
// comparison of a validated actual with those locked cells, nothing else.
//
// Test fixture: with MONDAY_RESULTS_FIXTURE=1 (npm run build:monday-results-fixture)
// the loader reads monday-operating-plan/fixtures/q3-actuals.scored.fixture.json
// instead, which is not real data, lives outside public/, and is labelled as a
// fixture on the page. Production builds never read it.
//
// Publishing the results (November 9, 2026), as in the README: add the actuals file, set the
// pin (npm run build prints it), run the checks, commit. Every status line on the page and
// its home-page card follows loadMondayResults(), so nothing else needs editing.
//
// Server-only: it reads files at build time.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RELEASES, RESULTS_AT_UTC, loadMondayCharts, loadResultsInputs, type CellValue } from "@/lib/mondayPlan";

/** Site path of the results file (public/). */
export const ACTUALS_PATH = "/monday-operating-plan/monday_q3_actuals.json";
/**
 * SHA-256 of public/monday-operating-plan/monday_q3_actuals.json. Null until the
 * results are published; once the file exists the build requires this pin.
 */
export const ACTUALS_SHA256: string | null = "f187899893978ada73bca681d9be98baab439c2902e61678d2560de07f559991";

/** The scored-layout test fixture: invented numbers, never shipped. */
export const FIXTURE_FILE = "monday-operating-plan/fixtures/q3-actuals.scored.fixture.json";
export const FIXTURE_SHA256 = "4bf485712e997af426e4ad5831765dfb0ac8391c64cfbd182025c96b3e2a63ff";

// Literal paths (scoped to their folders), so the build traces only these files.
const ACTUALS_ABS = join(process.cwd(), "public", "monday-operating-plan", "monday_q3_actuals.json");
const FIXTURE_ABS = join(process.cwd(), "monday-operating-plan", "fixtures", "q3-actuals.scored.fixture.json");

function fail(message: string): never {
  throw new Error(`monday.com Q3 results: ${message}`);
}

// --- Schema ------------------------------------------------------------------------

/** The five locked metrics, in the Scorecard's order (the same order as the range chart). */
export const METRIC_KEYS = [
  "revenue_usd_m",
  "non_gaap_operating_income_usd_m",
  "non_gaap_operating_margin",
  "net_dollar_retention",
  "customers_over_50k_arr",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export const TRIGGER_KEYS = ["t2_revenue_beat_vs_guidance_mid", "t3_net_adds_customers_over_50k"] as const;
export type TriggerKey = (typeof TRIGGER_KEYS)[number];

export type ActualsDoc = {
  version: 1;
  status: "pending" | "scored";
  source: { document: string; url: string; retrieved_at: string };
  /** Null while pending; every metric when scored. */
  actuals: Record<MetricKey, number> | null;
  /** First readings of triggers T2 and T3. Null while pending. */
  triggers: Record<TriggerKey, number> | null;
  /** Optional: what the call got wrong, in plain words. */
  notes?: string[];
};

/** Most decimals each value may carry, so the page prints the JSON value exactly. */
const DECIMALS: Record<MetricKey | TriggerKey, number> = {
  revenue_usd_m: 1,
  non_gaap_operating_income_usd_m: 1,
  non_gaap_operating_margin: 3,
  net_dollar_retention: 2,
  customers_over_50k_arr: 0,
  t2_revenue_beat_vs_guidance_mid: 4,
  t3_net_adds_customers_over_50k: 0,
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

function keysExactly(where: string, o: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
  for (const k of required) if (!(k in o)) fail(`${where}: missing "${k}"`);
  for (const k of Object.keys(o)) if (!required.includes(k) && !optional.includes(k)) fail(`${where}: unknown key "${k}"`);
}

function decimalsOk(v: number, places: number): boolean {
  const scaled = v * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

function numbers<K extends string>(where: string, x: unknown, keys: readonly K[]): Record<K, number> {
  if (!isObj(x)) fail(`${where} must be an object`);
  keysExactly(where, x, keys);
  const out = {} as Record<K, number>;
  for (const k of keys) {
    const v = x[k];
    if (typeof v !== "number" || !Number.isFinite(v)) fail(`${where}.${k} must be a number`);
    if (!decimalsOk(v, DECIMALS[k as MetricKey | TriggerKey])) fail(`${where}.${k} = ${v} has more than ${DECIMALS[k as MetricKey | TriggerKey]} decimals`);
    out[k] = v;
  }
  return out;
}

/** Checks a parsed results file against the schema and against the locked call. Throws on any problem. */
export function validateActuals(x: unknown, label: string): ActualsDoc {
  const where = label;
  if (!isObj(x)) fail(`${where} is not a JSON object`);
  keysExactly(where, x, ["version", "status", "source", "actuals", "triggers"], ["notes"]);
  if (x.version !== 1) fail(`${where}: unknown version ${String(x.version)}`);
  if (x.status !== "pending" && x.status !== "scored") fail(`${where}: status must be "pending" or "scored"`);

  const src = x.source;
  if (!isObj(src)) fail(`${where}.source must be an object`);
  keysExactly(`${where}.source`, src, ["document", "url", "retrieved_at"]);
  if (typeof src.document !== "string" || !src.document.trim()) fail(`${where}.source.document must name the document`);
  if (typeof src.url !== "string" || !/^https:\/\/\S+$/.test(src.url)) fail(`${where}.source.url must be an https URL`);
  if (typeof src.retrieved_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(src.retrieved_at)) {
    fail(`${where}.source.retrieved_at must be an ISO 8601 UTC time, such as 2026-11-09T14:05:00Z`);
  }
  // The results cannot have been retrieved before they were released.
  if (Date.parse(src.retrieved_at) < Date.parse(RESULTS_AT_UTC)) fail(`${where}.source.retrieved_at ${src.retrieved_at} is before the results release (${RESULTS_AT_UTC})`);

  let notes: string[] | undefined;
  if ("notes" in x) {
    if (!Array.isArray(x.notes) || x.notes.some((n) => typeof n !== "string" || !n.trim())) fail(`${where}.notes must be a list of non-empty strings`);
    notes = x.notes as string[];
  }

  if (x.status === "pending") {
    if (x.actuals !== null || x.triggers !== null) fail(`${where}: a pending file must have "actuals": null and "triggers": null`);
    if (notes?.length) fail(`${where}: a pending file has no notes`);
    return { version: 1, status: "pending", source: src as ActualsDoc["source"], actuals: null, triggers: null };
  }

  const actuals = numbers(`${where}.actuals`, x.actuals, METRIC_KEYS);
  const triggers = numbers(`${where}.triggers`, x.triggers, TRIGGER_KEYS);
  const { guidanceMid } = loadResultsInputs();

  if (actuals.revenue_usd_m <= 0) fail(`${where}: revenue must be positive`);
  // Derived margin: operating income / revenue, to 0.1 percentage point.
  const derived = actuals.non_gaap_operating_income_usd_m / actuals.revenue_usd_m;
  if (Math.abs(actuals.non_gaap_operating_margin - derived) > 0.0005 + 1e-9) {
    fail(`${where}: non_gaap_operating_margin ${actuals.non_gaap_operating_margin} is not operating income / revenue (${derived.toFixed(4)})`);
  }
  // Net dollar retention is scored as the reported whole percentage.
  if (!decimalsOk(actuals.net_dollar_retention, 2) || actuals.net_dollar_retention < 0.5 || actuals.net_dollar_retention > 2) {
    fail(`${where}: net_dollar_retention must be the reported whole percentage as a fraction, such as 1.09`);
  }
  if (actuals.customers_over_50k_arr <= 0) fail(`${where}: customers_over_50k_arr must be a positive whole number`);
  // T2 reading: the revenue beat against the locked guidance midpoint, to 0.01 percentage point.
  const beat = actuals.revenue_usd_m / guidanceMid.revenue.v - 1;
  if (Math.abs(triggers.t2_revenue_beat_vs_guidance_mid - beat) > 0.00005 + 1e-9) {
    fail(`${where}: t2_revenue_beat_vs_guidance_mid ${triggers.t2_revenue_beat_vs_guidance_mid} is not revenue / guidance midpoint - 1 (${beat.toFixed(5)})`);
  }
  if (triggers.t3_net_adds_customers_over_50k < 0) fail(`${where}: t3_net_adds_customers_over_50k cannot be negative`);

  return { version: 1, status: "scored", source: src as ActualsDoc["source"], actuals, triggers, ...(notes ? { notes } : {}) };
}

// --- Formatting: the page prints the JSON value exactly ---------------------------

export function formatValue(key: MetricKey | TriggerKey, v: number): string {
  switch (key) {
    case "revenue_usd_m":
    case "non_gaap_operating_income_usd_m":
      return `$${v.toFixed(1)}M`;
    case "non_gaap_operating_margin":
      return `${(v * 100).toFixed(1)}%`;
    case "net_dollar_retention":
      return `${(v * 100).toFixed(0)}%`;
    case "customers_over_50k_arr":
    case "t3_net_adds_customers_over_50k":
      return v.toLocaleString("en-US");
    case "t2_revenue_beat_vs_guidance_mid":
      return `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(2)}%`;
  }
}

// --- Scoring --------------------------------------------------------------------------

export type Position = "inside" | "above" | "below";
const WORDS: Record<Position, string> = { inside: "Inside the range", above: "Above the range", below: "Below the range" };

/** Inclusive comparison with the locked cells' stored (unrounded) values, as the Scorecard rule reads. */
function position(a: number, low: CellValue, high: CellValue): Position {
  if (a < low.v) return "below";
  if (a > high.v) return "above";
  return "inside";
}

export type ScoredRow = {
  key: MetricKey;
  metric: string;
  actual: number;
  actualText: string;
  position: Position;
  /** False for the derived margin: recorded for information, per the Scorecard rule. */
  scored: boolean;
  result: string;
  /** Set when the printed actual equals a printed range end but falls outside the stored value. */
  boundaryNote: string | null;
  versusGuide: { position: "above" | "within" | "below" | "equal"; text: string } | null;
};

export type TriggerReading = {
  key: TriggerKey;
  label: string;
  value: number;
  valueText: string;
  threshold: CellValue;
  rule: string;
  /** Whether this quarter counts towards the trigger (one of the two consecutive quarters it needs). */
  counts: boolean;
  text: string;
};

export type MondayResults =
  | { state: "pending"; file: null }
  | {
      state: "scored";
      fixture: boolean;
      file: string;
      sha256: string;
      source: ActualsDoc["source"];
      rows: ScoredRow[];
      triggers: TriggerReading[];
      notes: string[];
      actuals: Record<MetricKey, number>;
    };

function unrounded(key: MetricKey, c: CellValue): string {
  if (key === "revenue_usd_m" || key === "non_gaap_operating_income_usd_m") return `$${c.v.toFixed(3)}M`;
  if (key === "customers_over_50k_arr") return c.v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return `${(c.v * 100).toFixed(2)}%`;
}

function score(doc: ActualsDoc & { status: "scored" }, meta: { fixture: boolean; file: string; sha256: string }): MondayResults {
  const { ranges } = loadMondayCharts();
  const inputs = loadResultsInputs();
  if (ranges.length !== METRIC_KEYS.length) fail("the locked call no longer has five metrics");
  const actuals = doc.actuals!;
  const rows: ScoredRow[] = ranges.map((m, i) => {
    const key = METRIC_KEYS[i];
    const a = actuals[key];
    const pos = position(a, m.low, m.high);
    const actualText = formatValue(key, a);
    const end = pos === "above" ? m.high : pos === "below" ? m.low : null;
    // The printed actual can equal a printed range end and still fall outside it: say so.
    const endText = end && (m.unit === "USD millions" ? `$${end.d}M` : end.d);
    const boundaryNote = end && endText === actualText ? `the stored ${pos === "above" ? "high" : "low"} is ${unrounded(key, end)}` : null;
    const scored = key !== "non_gaap_operating_margin";
    let versusGuide: ScoredRow["versusGuide"] = null;
    if (m.guidance) {
      const g = a < m.guidance.low.v ? "below" : a > m.guidance.high.v ? "above" : "within";
      versusGuide = { position: g, text: g === "within" ? "Within guidance" : g === "above" ? "Above guidance" : "Below guidance" };
    } else if (key === "non_gaap_operating_margin") {
      const g = inputs.guidanceMid.margin;
      const p = a > g.v ? "above" : a < g.v ? "below" : "equal";
      versusGuide = { position: p, text: p === "equal" ? `Equal to the derived guide (${g.d})` : `${p === "above" ? "Above" : "Below"} the derived guide (${g.d})` };
    }
    const result = scored ? WORDS[pos] : `Not scored (derived); ${WORDS[pos].toLowerCase()}, for information`;
    return { key, metric: m.metric, actual: a, actualText, position: pos, scored, result, boundaryNote, versusGuide };
  });

  const t = doc.triggers!;
  const t2Counts = t.t2_revenue_beat_vs_guidance_mid < inputs.t2.threshold.v;
  const t3Counts = t.t3_net_adds_customers_over_50k <= inputs.t3.threshold.v;
  const triggers: TriggerReading[] = [
    {
      key: "t2_revenue_beat_vs_guidance_mid",
      label: inputs.t2.label,
      value: t.t2_revenue_beat_vs_guidance_mid,
      valueText: formatValue("t2_revenue_beat_vs_guidance_mid", t.t2_revenue_beat_vs_guidance_mid),
      threshold: inputs.t2.threshold,
      rule: inputs.t2.rule,
      counts: t2Counts,
      text: t2Counts ? "Below the threshold: the first of the two consecutive quarters the trigger needs." : "Not below the threshold: this quarter does not count towards the trigger.",
    },
    {
      key: "t3_net_adds_customers_over_50k",
      label: inputs.t3.label,
      value: t.t3_net_adds_customers_over_50k,
      valueText: formatValue("t3_net_adds_customers_over_50k", t.t3_net_adds_customers_over_50k),
      threshold: inputs.t3.threshold,
      rule: inputs.t3.rule,
      counts: t3Counts,
      text: t3Counts ? "At or below the threshold: the first of the two consecutive quarters the trigger needs." : "Above the threshold: this quarter does not count towards the trigger.",
    },
  ];
  return { state: "scored", ...meta, source: doc.source, rows, triggers, notes: doc.notes ?? [], actuals };
}

// --- Loading -----------------------------------------------------------------------------

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

let cached: MondayResults | null = null;

/** Reads, validates and scores the results file, or returns the pending state when there is none. */
export function loadMondayResults(): MondayResults {
  if (cached) return cached;
  const useFixture = process.env.MONDAY_RESULTS_FIXTURE === "1";
  if (useFixture) {
    if (process.env.VERCEL_ENV === "production") fail("MONDAY_RESULTS_FIXTURE is set in a production deployment");
    if (existsSync(ACTUALS_ABS)) fail(`MONDAY_RESULTS_FIXTURE is set, but the real results file public${ACTUALS_PATH} exists`);
    const raw = readFileSync(FIXTURE_ABS);
    const digest = sha256(raw);
    if (digest !== FIXTURE_SHA256) fail(`${FIXTURE_FILE} has SHA-256 ${digest}, but the build pins ${FIXTURE_SHA256}`);
    const doc = validateActuals(JSON.parse(raw.toString("utf8")), FIXTURE_FILE);
    if (doc.status !== "scored") fail(`${FIXTURE_FILE} must be a scored file`);
    cached = score(doc as ActualsDoc & { status: "scored" }, { fixture: true, file: FIXTURE_FILE, sha256: digest });
    return cached;
  }
  if (!existsSync(ACTUALS_ABS)) {
    if (ACTUALS_SHA256) fail(`ACTUALS_SHA256 is set, but public${ACTUALS_PATH} is missing`);
    cached = { state: "pending", file: null };
    return cached;
  }
  const raw = readFileSync(ACTUALS_ABS);
  const digest = sha256(raw);
  if (!ACTUALS_SHA256) fail(`public${ACTUALS_PATH} exists but is not pinned: set ACTUALS_SHA256 in src/lib/mondayResults.ts to ${digest}`);
  if (digest !== ACTUALS_SHA256) fail(`public${ACTUALS_PATH} has SHA-256 ${digest}, but the build pins ${ACTUALS_SHA256}`);
  const doc = validateActuals(JSON.parse(raw.toString("utf8")), `public${ACTUALS_PATH}`);
  cached = doc.status === "pending" ? { state: "pending", file: null } : score(doc as ActualsDoc & { status: "scored" }, { fixture: false, file: `public${ACTUALS_PATH}`, sha256: digest });
  return cached;
}

/** The home-card thumbnail and link-preview card once scored ("Q3: SCORED"); the pending ones
 * are the project's own (src/lib/projects.ts, public/og/<slug>.png). */
export const SCORED_VISUAL = "/project-visuals/monday-operating-plan-scored.webp";
export const SCORED_OG_IMAGE = "/og/monday-operating-plan-scored.png";

/** The locked Q3 call release (tag, commit, published time, SHA-256), for the lock facts. */
export const Q3_RELEASE = RELEASES.find((r) => r.tag === "q3-2026-call-locked")!;

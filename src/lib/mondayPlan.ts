// Build-time data for the monday.com Operating Plan project page and its home
// card. Every figure is read from the Model Preview JSON exported from the two
// locked workbooks (scripts/export-model-preview.py): displayed text as the
// spreadsheet shows it, nothing recalculated here. Cells are found by their
// workbook labels, so a moved or renamed row stops the build instead of
// showing the wrong figure.
//
// Server-only: it reads the workbook files to check their SHA-256 against the
// locked releases. A mismatch throws, which fails `next build`.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { colLetter, displayText, indexCells, sheetCol, sheetRow, type ModelPreviewDoc, type PreviewSheet, type SheetCell } from "@/lib/modelPreview";
import planJson from "../../public/monday-operating-plan/model-preview.json";
import q3Json from "../../public/monday-operating-plan/q3-call.json";
import planDataJson from "../../public/monday-operating-plan/plan-data.json";

export const PLAN_DOC = planJson as unknown as ModelPreviewDoc;
const Q3_DOC = q3Json as unknown as ModelPreviewDoc;
/** Chart-only views of the same locked plan workbook. */
const PLAN_DATA_DOC = planDataJson as unknown as ModelPreviewDoc;

const REPO = "2samfelix/monday-operating-plan";

// The locked files. A wrong pin, or a workbook or download copy that differs
// from its pin, fails the build.
export const PLAN_SHA256 = "125af68742c9d3501cd2f23944899cc4625cf5285e79ba9ea2bee34f24315419";
export const Q3_CALL_SHA256 = "49463d1fbb678fd26b59c3c81e70cb52613a4a73906b846bcaaf034be76bb722";

/** Site path of the hosted copy of the locked plan workbook (public/). */
export const PLAN_DOWNLOAD_PATH = "/monday-operating-plan/monday_plan.xlsx";

export type LockRelease = {
  tag: string;
  title: string;
  commit: string;
  /** GitHub Release published_at, UTC. */
  publishedAt: string;
  file: string;
  sha256: string;
  url: string;
};

// From the GitHub Releases API for 2samfelix/monday-operating-plan.
export const RELEASES: LockRelease[] = [
  {
    tag: "q3-2026-call-locked",
    title: "Q3 2026 forecast",
    commit: "60e293208ae461a1dd09ace5e80b500c9e334b12",
    publishedAt: "2026-10-28T21:43:23Z",
    file: "monday_q3_call.xlsx",
    sha256: Q3_CALL_SHA256,
    url: `https://github.com/${REPO}/releases/tag/q3-2026-call-locked`,
  },
  {
    tag: "plan-2026-locked",
    title: "Operating plan",
    commit: "07a7363a73848a491c870ef22a602378181373d2",
    publishedAt: "2026-10-29T17:31:14Z",
    file: "monday_plan.xlsx",
    sha256: PLAN_SHA256,
    url: `https://github.com/${REPO}/releases/tag/plan-2026-locked`,
  },
];

export const REPO_URL = `https://github.com/${REPO}`;
export const README_URL = `https://github.com/${REPO}/blob/main/README.md`;
/** As stated in the plan-2026-locked Release. */
export const RESULTS_DATE = "November 9, 2026, 8:30 a.m. ET";
export const RESULTS_DATE_SHORT = "Nov 9, 8:30 a.m. ET";

// Limits, from the repository README ("Limits").
export const LIMITS = [
  "This is not monday.com's internal budget, and it does not reconstruct one. It is an outside-in forecast built from public filings.",
  "It is not guidance. The Base case is a beat-adjusted central estimate and sits above the top of the FY2026 guided ranges for revenue and operating income.",
  "Forecast accuracy drops beyond two quarters ahead. Q3 and Q4 2027 lie beyond the tested horizon.",
  "The cost in lost growth of cutting spend cannot be measured from public data. The plan shows breakeven revenue losses instead of predicting that cost.",
];

function fail(message: string): never {
  throw new Error(`monday.com Operating Plan: ${message}`);
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Literal paths (scoped to their folders), so the build traces only these files.
const PLAN_FILE = join(process.cwd(), "monday-operating-plan", "model", "monday_plan.xlsx");
const Q3_CALL_FILE = join(process.cwd(), "monday-operating-plan", "model", "monday_q3_call.xlsx");
const DOWNLOAD_FILE = join(process.cwd(), "public", "monday-operating-plan", "monday_plan.xlsx");

/** Checks every locked file against its pin; throws (failing the build) on any mismatch. */
export function verifyPins(): void {
  const checks: [string, string, ModelPreviewDoc | null, string][] = [
    ["monday-operating-plan/model/monday_plan.xlsx", PLAN_FILE, PLAN_DOC, PLAN_SHA256],
    ["monday-operating-plan/model/monday_q3_call.xlsx", Q3_CALL_FILE, Q3_DOC, Q3_CALL_SHA256],
    ["monday-operating-plan/model/monday_plan.xlsx", PLAN_FILE, PLAN_DATA_DOC, PLAN_SHA256],
    [`public${PLAN_DOWNLOAD_PATH}`, DOWNLOAD_FILE, null, PLAN_SHA256],
  ];
  for (const [file, path, doc, pin] of checks) {
    const actual = sha256(path);
    if (actual !== pin) fail(`${file} has SHA-256 ${actual}, but the locked release pins ${pin}`);
    if (doc && doc.workbook.file !== file) fail(`the preview JSON was exported from ${doc.workbook.file}, not ${file}`);
    if (doc && doc.workbook.sha256 !== pin) fail(`${file}: the preview JSON records ${doc.workbook.sha256}, not the pinned ${pin}`);
    if (doc && doc.workbook.source?.sha256 !== pin) fail(`${file}: the preview JSON's source hash does not match the pinned ${pin}`);
  }
  for (const r of RELEASES) {
    for (const doc of r.file === "monday_plan.xlsx" ? [PLAN_DOC, PLAN_DATA_DOC] : [Q3_DOC]) {
      if (doc.workbook.source?.commit !== r.commit) fail(`${r.file}: exported from ${doc.workbook.source?.commit}, not the ${r.tag} commit ${r.commit}`);
    }
  }
}

// --- Cell lookup ---------------------------------------------------------------

type Tab = { sheet: PreviewSheet; rows: Map<number, Map<number, SheetCell>> };

function tab(doc: ModelPreviewDoc, name: string): Tab {
  const sheet = doc.sheets.find((s) => s.name === name);
  if (!sheet) fail(`tab "${name}" is missing from ${doc.workbook.file}`);
  return { sheet, rows: indexCells(sheet) };
}

function cell(t: Tab, r: number, c: number): SheetCell | undefined {
  return t.rows.get(r)?.get(c);
}

/** Displayed text of a cell; throws if it is empty. */
function text(t: Tab, r: number, c: number): string {
  const s = displayText(cell(t, r, c)).trim();
  if (!s) fail(`${t.sheet.name}: expected a value at row position ${r}, column ${c}`);
  return s;
}

/** The single row whose first column reads exactly `label` (or starts with it). */
function row(t: Tab, label: string, prefix = false): number {
  const hits = t.sheet.cells.filter((c) => {
    if (c.c !== 0 || typeof c.v !== "string") return false;
    const s = displayText(c).trim();
    return prefix ? s.startsWith(label) : s === label;
  });
  if (hits.length !== 1) fail(`${t.sheet.name}: expected one row labelled "${label}", found ${hits.length}`);
  return hits[0].r;
}

/** A Sourced/Derived/Assumed tag from a workbook label cell ("Derived (links)" -> "Derived"). */
function tagOf(label: string): "Sourced" | "Derived" | "Assumed" | "Text" {
  for (const t of ["Sourced", "Derived", "Assumed"] as const) if (label.startsWith(t)) return t;
  return "Text";
}

// --- Data ------------------------------------------------------------------------

export type Labelled = { label: string; values: string[]; tag: string };

export type MondayPlan = ReturnType<typeof readPlan>;

function readPlan() {
  const es = tab(PLAN_DOC, "Executive_Summary");
  const rec = tab(PLAN_DOC, "Recommendation");

  const sheetTitle = text(es, 0, 0);
  if (!sheetTitle.includes("DRAFT, not locked")) fail("Executive_Summary title no longer reads \"DRAFT, not locked\"; update the note beside the preview");
  const qRaw = text(es, row(es, "Management question:", true), 0).replace(/^Management question:\s*/, "");
  const question = qRaw.charAt(0).toUpperCase() + qRaw.slice(1);

  const header = (r: number, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => text(es, r, from + i));
  const line = (label: string, from: number, to: number, labelCol = 7): Labelled => {
    const r = row(es, label);
    const lab = displayText(cell(es, r, labelCol)).trim();
    return { label, values: Array.from({ length: to - from + 1 }, (_, i) => text(es, r, from + i)), tag: tagOf(lab) };
  };

  // Base vs Downside (FY26 / FY27).
  const caseHead = header(row(es, "Base vs Downside"), 1, 4);
  const cases = {
    revenue: line("Revenue", 1, 4),
    oi: line("Non-GAAP operating income", 1, 4),
    margin: line("Non-GAAP operating margin", 1, 4),
    fcfGuide: line("Adjusted FCF, guide basis (excl. severance)", 1, 4),
    fcfReported: line("Adjusted FCF, reported basis (incl. severance)", 1, 4),
  };
  const rangeHead = header(row(es, "FY2027 Base adjusted FCF range"), 1, 2);
  const fcfRange = [
    line("Upside: FY2026 guide ratio (P7U)", 1, 2),
    line("Base: FY2026 Base ratio (P7)", 1, 2),
    line("Low: 1.0x (P7 Downside)", 1, 2),
  ];
  const gapPct = line("Base-Downside FY27 revenue gap, % of Base", 1, 1);
  const gapX = line("Gap / average 4-quarter-ahead backtest miss", 1, 1);

  // Management response: breakeven.
  const beHeadRow = row(es, "Management response (from start quarter)");
  const breakeven = {
    title: text(es, beHeadRow, 0),
    head: header(beHeadRow, 1, 5),
    rows: [
      line("Lever 1: R&D+G&A 5% below plan", 1, 5),
      line("Lever 2: S&M 10% below plan (conditional on T3)", 1, 5),
      line("Both levers", 1, 5),
    ],
  };

  // Triggers, from the Recommendation sheet: tier label (A), thresholds (C:G), rule (H), history label (I).
  const recHead = Array.from({ length: 5 }, (_, i) => text(rec, row(rec, "Trigger metric"), 2 + i));
  const trigger = (prefix: string) => {
    const r = row(rec, prefix, true);
    const values = Array.from({ length: 5 }, (_, i) => displayText(cell(rec, r, 2 + i)).trim()).filter(Boolean);
    return {
      label: text(rec, r, 0),
      tag: tagOf(text(rec, r, 1)),
      values,
      rule: text(rec, r, 7),
      history: text(rec, r, 8),
    };
  };
  const triggers = [trigger("T1 WATCH tier"), trigger("T1 ACTION tier"), trigger("T2 threshold"), trigger("T3 threshold")];
  const mapping = ["WATCH: T1 Watch tier", "ACTION: T1 Action tier or T2", "ACTION plus T3"].map((label) => {
    const r = row(rec, label);
    return { tier: label, action: text(rec, r, 2), timing: text(rec, r, 7), note: text(rec, r, 8) };
  });
  const fixedNote = text(rec, row(rec, "Thresholds are fixed at the lock date.", true), 0);
  const tierNote = text(rec, row(rec, "For Q3 and Q4 2026, the Watch tier", true), 0);

  return { sheetTitle, question, caseHead, cases, rangeHead, fcfRange, gapPct, gapX, breakeven, recHead, triggers, mapping, fixedNote, tierNote };
}

function readScorecard() {
  const sc = tab(Q3_DOC, "Scorecard");
  const rev = tab(Q3_DOC, "Revenue guidance");
  const oi = tab(Q3_DOC, "Operating income guidance");
  const crpo = tab(Q3_DOC, "cRPO call");
  const fcf = tab(Q3_DOC, "Adjusted FCF call");

  const head = ["Low", "Mid", "High"];
  head.forEach((h, i) => {
    if (text(sc, row(sc, "Metric"), 2 + i) !== h) fail(`Scorecard column ${2 + i} is not "${h}"`);
  });
  const locked = (metric: string) => {
    const r = row(sc, metric);
    const unit = text(sc, r, 1);
    const vals = [2, 3, 4].map((c) => text(sc, r, c));
    const label = text(sc, r, 8);
    return { unit, values: unit === "USD millions" ? vals.map((v) => `$${v}M`) : vals, label, tag: tagOf(label) };
  };
  const range = (t: Tab, low: string, high: string) => {
    const lo = row(t, low);
    const hi = row(t, high);
    return { text: `$${text(t, lo, 2)}M–$${text(t, hi, 2)}M`, label: `${text(t, lo, 1)} (${text(t, lo, 5)})` };
  };
  const marginRow = row(oi, "TAIL derived margin: op. income guidance midpoint / revenue guidance midpoint");
  const marginCell = cell(oi, marginRow, 3);
  if (typeof marginCell?.v !== "number") fail("derived margin guidance is not a number");
  const noCall = (t: Tab, label: string, scLabel: string) => {
    const r = row(t, label);
    const call = text(t, r, 3);
    if (!call.startsWith("NO CALL")) fail(`${label} is no longer a no-call`);
    if (text(sc, row(sc, scLabel), 2) !== "NO CALL") fail(`Scorecard ${scLabel} is no longer NO CALL`);
    return text(t, r, 7);
  };

  return {
    rows: [
      { metric: "Revenue", guidance: range(rev, "Q3 2026 revenue guidance - low (USD m)", "Q3 2026 revenue guidance - high (USD m)"), ...locked("Revenue (USD m)") },
      {
        metric: "Non-GAAP operating income",
        guidance: range(oi, "Q3 2026 non-GAAP op. income guidance - low (USD m)", "Q3 2026 non-GAAP op. income guidance - high (USD m)"),
        ...locked("Non-GAAP operating income (USD m)"),
      },
      {
        metric: "Derived operating margin",
        guidance: {
          text: `Derived: about ${Math.round(marginCell.v * 100)}%`,
          label: `Derived, not company guidance: operating income guidance midpoint ÷ revenue guidance midpoint = ${displayText(marginCell)}`,
        },
        ...locked("Non-GAAP operating margin (derived from calls)"),
      },
      { metric: "Net dollar retention", guidance: { text: "Not guided", label: "" }, ...locked("All-customer net dollar retention") },
      { metric: "Customers above $50K ARR", guidance: { text: "Not guided", label: "" }, ...locked("Paid customers >$50k ARR") },
    ],
    noCalls: [
      { metric: "Current RPO", guidance: "Not guided", reason: noCall(crpo, "Q3 2026 cRPO CALL", "Current RPO (cRPO)") },
      { metric: "Adjusted free cash flow", guidance: "No Q3 guidance", reason: noCall(fcf, "Q3 2026 adjusted FCF CALL", "Adjusted free cash flow") },
    ],
  };
}

let cached: { plan: MondayPlan; scorecard: ReturnType<typeof readScorecard> } | null = null;

/** Verifies the pins, then reads the page's figures. Called at build time. */
export function loadMondayPlan() {
  if (!cached) {
    verifyPins();
    cached = { plan: readPlan(), scorecard: readScorecard() };
  }
  return cached;
}

// --- Chart data ------------------------------------------------------------------
// Each value keeps its raw number (for geometry), the text the workbook shows (for
// labels) and its cell reference, so every drawn mark can be checked against the
// workbook (scripts/test-monday-charts.py).

export type Workbook = "plan" | "q3";
export type CellValue = { v: number; d: string; ref: string; wb: Workbook };

function refOf(t: Tab, r: number, c: number): string {
  const sheet = t.sheet.sheet ?? t.sheet.name;
  return `${sheet}!${colLetter(sheetCol(t.sheet, c))}${(sheetRow(t.sheet, r) ?? 0) + 1}`;
}

function num(t: Tab, r: number, c: number, wb: Workbook = "plan"): CellValue {
  const x = cell(t, r, c);
  if (typeof x?.v !== "number") fail(`${refOf(t, r, c)} is not a number`);
  return { v: x.v, d: displayText(x).trim(), ref: refOf(t, r, c), wb };
}

/** The first row labelled `label` after the row whose first column starts with `section`. */
function rowAfter(t: Tab, section: string, label: string): number {
  const start = row(t, section, true);
  const hit = t.sheet.cells
    .filter((c) => c.c === 0 && c.r > start && displayText(c).trim() === label)
    .sort((a, b) => a.r - b.r)[0];
  if (!hit) fail(`${t.sheet.name}: no "${label}" row after "${section}"`);
  return hit.r;
}

const QUARTER_COLS = [4, 5, 6, 7, 8, 9]; // Q3 2026 ... Q4 2027 (columns E:J)

function readCharts() {
  const es = tab(PLAN_DOC, "Executive_Summary");
  const rb = tab(PLAN_DOC, "Revenue_Build");
  const sc = tab(PLAN_DOC, "Scenarios");
  const hist = tab(PLAN_DATA_DOC, "Revenue growth history");
  const om = tab(PLAN_DATA_DOC, "Operating margin by quarter");
  const q3 = tab(Q3_DOC, "Scorecard");
  const qRev = tab(Q3_DOC, "Revenue guidance");
  const qOi = tab(Q3_DOC, "Operating income guidance");

  // Column headers of the quarterly blocks (Q1 2026A ... Q4 2027).
  const BASE = "BASE";
  const DOWN = "DOWNSIDE (before management response)";
  const headRow = rowAfter(rb, BASE, "Line");
  const quarters = QUARTER_COLS.map((c) => text(rb, headRow, c));

  // 1. Growth history (YoY revenue growth, quarters with a value) and the two plan paths.
  const history = hist.sheet.cells
    .filter((c) => c.c === 0 && typeof c.v === "string" && /^Q\d \d{4}$/.test(c.v))
    .flatMap((c) => (typeof cell(hist, c.r, 3)?.v === "number" ? [{ quarter: displayText(c), value: num(hist, c.r, 3) }] : []));
  if (history.length < 8) fail("revenue growth history is too short");
  const path = (section: string) => {
    const r = rowAfter(rb, section, "Revenue YoY growth");
    return QUARTER_COLS.map((c, i) => ({ quarter: quarters[i], value: num(rb, r, c) }));
  };
  const lastActual = history[history.length - 1];
  const growth = { history, base: path(BASE), downside: path(DOWN), lastActual };

  // 2. Base vs Downside by quarter: revenue and operating margin.
  const revenue = (section: string) => {
    const r = rowAfter(rb, section, "Revenue");
    return QUARTER_COLS.map((c, i) => ({ quarter: quarters[i], value: num(rb, r, c) }));
  };
  const omHead = rowAfter(om, BASE, "Line");
  QUARTER_COLS.forEach((c, i) => {
    if (text(om, omHead, c) !== quarters[i]) fail("Opex quarter columns differ from Revenue_Build");
  });
  const margin = (section: string) => {
    const r = rowAfter(om, section, "Operating margin (non-GAAP)");
    return QUARTER_COLS.map((c, i) => ({ quarter: quarters[i], value: num(om, r, c) }));
  };
  const downMargin = margin(DOWN);
  const lowest = downMargin.reduce((a, b) => (b.value.v < a.value.v ? b : a));
  const gapPct = num(es, row(es, "Base-Downside FY27 revenue gap, % of Base"), 1);
  const gapX = num(es, row(es, "Gap / average 4-quarter-ahead backtest miss"), 1);
  const quarterly = {
    quarters,
    revenue: { base: revenue(BASE), downside: revenue(DOWN) },
    margin: { base: margin(BASE), downside: downMargin },
    lowest,
    gapPct,
    gapX,
  };

  // 3. Bridge: FY27 Base operating income to Downside.
  const bridgeRow = (label: string) => {
    const r = row(sc, label);
    return { label, value: num(sc, r, 1) };
  };
  const bridge = {
    title: text(sc, row(sc, "Bridge: Base -> Downside FY2027 non-GAAP operating income"), 0),
    start: bridgeRow("Base FY2027 operating income"),
    steps: [
      bridgeRow("Revenue volume effect (lower revenue x Base gross margin)"),
      bridgeRow("Gross margin rate effect"),
      bridgeRow("Operating expense effect (dollars held at Base)"),
    ],
    end: bridgeRow("Downside FY2027 operating income"),
  };

  // 4. Scorecard ranges (locked low / mid / high) and guidance bands.
  const locked = (label: string) => {
    const r = row(q3, label);
    return { unit: text(q3, r, 1), low: num(q3, r, 2, "q3"), mid: num(q3, r, 3, "q3"), high: num(q3, r, 4, "q3") };
  };
  const band = (t: Tab, low: string, high: string) => ({ low: num(t, row(t, low), 2, "q3"), high: num(t, row(t, high), 2, "q3") });
  const ranges = [
    { metric: "Revenue", ...locked("Revenue (USD m)"), guidance: band(qRev, "Q3 2026 revenue guidance - low (USD m)", "Q3 2026 revenue guidance - high (USD m)") },
    {
      metric: "Non-GAAP operating income",
      ...locked("Non-GAAP operating income (USD m)"),
      guidance: band(qOi, "Q3 2026 non-GAAP op. income guidance - low (USD m)", "Q3 2026 non-GAAP op. income guidance - high (USD m)"),
    },
    { metric: "Derived operating margin", ...locked("Non-GAAP operating margin (derived from calls)"), guidance: null },
    { metric: "Net dollar retention", ...locked("All-customer net dollar retention"), guidance: null },
    { metric: "Customers above $50K ARR", ...locked("Paid customers >$50k ARR"), guidance: null },
  ];

  // 5. Breakeven bars.
  const beHead = row(es, "Management response (from start quarter)");
  if (text(es, beHead, 2) !== "FY27 saving" || text(es, beHead, 3) !== "Breakeven loss") fail("breakeven columns moved");
  const breakeven = ["Lever 1: R&D+G&A 5% below plan", "Lever 2: S&M 10% below plan (conditional on T3)", "Both levers"].map((label) => {
    const r = row(es, label);
    return { label, saving: num(es, r, 2), loss: num(es, r, 3) };
  });

  // Number strip.
  const marginRow = row(es, "Non-GAAP operating margin");
  const revRow = row(es, "Revenue");
  const strip = { baseMargin: num(es, marginRow, 2), downMargin: num(es, marginRow, 4), baseRevenue: num(es, revRow, 2), downRevenue: num(es, revRow, 4), gapPct, gapX };

  return { growth, quarterly, bridge, ranges, breakeven, strip };
}

export type MondayCharts = ReturnType<typeof readCharts>;
let chartsCached: MondayCharts | null = null;

/** Verifies the pins, then reads the chart data. Called at build time. */
export function loadMondayCharts(): MondayCharts {
  if (!chartsCached) {
    verifyPins();
    chartsCached = readCharts();
  }
  return chartsCached;
}

/** Results release time: November 9, 2026, 8:30 a.m. ET (EST, UTC-5), as stated in the plan-2026-locked Release. */
export const RESULTS_AT_UTC = "2026-11-09T13:30:00Z";

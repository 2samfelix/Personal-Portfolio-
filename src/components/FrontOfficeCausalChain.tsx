"use client";

// The causal-chain diagram: the onboarding layer for the Front Office
// console. A visitor should see the SHAPE of the model — which six levers
// exist, what each one actually touches, and where National Revenue sits
// outside all of it — in about fifteen seconds, without first driving the
// full console blind (see the brief: "I drove it myself for twenty minutes
// and never found that ticket price was the largest untapped lever").
//
// STRICT VIEW OVER THE ENGINE: every value rendered here is read off
// `FrontOfficeResult` (from runFrontOfficeSimulation) or the raw
// `FrontOfficeAssumptions` the console already holds. Nothing here
// recomputes financial or football math — see rosterQuality/
// coachingQuality/availability on FrontOfficeResult, added to the model
// layer specifically so this diagram would have something real to read
// instead of re-deriving them from the lever values itself. This visual
// pass changes ONLY layout, color, and edge routing below — no node's
// getValue/getSub reads anything but committed engine output, and no
// edge was added, removed, or reclassified for a reason other than how it
// reads on screen.
//
// The edge list below is deliberately NOT identical to the brief's
// shorthand ("Marketing + Gameday Ops + Ticket Price -> Attendance"): the
// real engine only routes Marketing and Ticket Price into attendanceRate();
// Gameday Ops instead feeds perCapSpend() (Concessions), and Sponsorship
// depends on Marketing and team strength directly, never on Attendance.
// Drawing the brief's literal shorthand would put a false edge on a page
// whose entire premise is "every number here is real" — so the edges below
// follow frontOffice.ts's actual formulas (attendanceRate,
// concessionsMerchandiseRevenue, sponsorshipRevenue, playoffRevenue), and
// the two extra structural facts that shorthand omits — Ticket Price also
// directly multiplies Ticketing and Playoff Revenue, and all six spend
// levers also roll up into Total Cost — are included as thin secondary
// edges rather than dropped.
//
// Ticket Price -> Ticketing is a THIRD relation, "threshold": attendance
// falls once price clears FREE_ZONE_MULTIPLIER's boundary (see
// attendanceRate in frontOffice.ts), so ticketing revenue rises with price
// up to that point and can fall past it — neither "positive" nor "inverse"
// describes that alone.
//
// LAYOUT: nodes are placed by hand at analytical (col, row) coordinates
// (not measured from the DOM), converted to pixels by nodeCenter() below.
// Column pitch is NOT uniform — see COL_GAPS — so the three single-node
// on-field stages (Wins/Seed/Playoff Revenue) can sit closer together than
// the denser lever column, which is what keeps the whole diagram inside a
// 1280px viewport without shrinking any node or font. This keeps the
// diagram a pure function of its data — the same node/edge list a future
// mobile pass could re-flow into a vertical stack just by swapping which
// axis `col`/`row` map to, without touching the model layer or the
// node/edge data shape (see the brief's mobile note).

import { useEffect, useRef, useState } from "react";
import type { FrontOfficeAssumptions, FrontOfficeDriverKey, FrontOfficeResult } from "@/lib/models/frontOffice";
import { formatCurrencyCompact } from "@/lib/format";

type NodeKind = "lever" | "derived" | "fixed";
type EdgeRelation = "positive" | "inverse" | "threshold";
type EdgeWeight = "primary" | "secondary";

type ChainNodeId =
  | "payroll"
  | "scouting"
  | "coaching"
  | "facilities"
  | "marketing"
  | "gameday"
  | "ticketPrice"
  | "nationalRevenue"
  | "rosterQuality"
  | "coachingQuality"
  | "availability"
  | "teamStrength"
  | "wins"
  | "seed"
  | "playoffRevenue"
  | "attendance"
  | "ticketing"
  | "concessions"
  | "sponsorship"
  | "totalRevenue"
  | "totalCost"
  | "operatingResult"
  | "franchiseHealth";

type ChainNode = {
  id: ChainNodeId;
  label: string;
  kind: NodeKind;
  col: number;
  row: number;
  small?: boolean;
  annotation?: string; // rendered above the node — used once, for National Revenue
  leverKey?: FrontOfficeDriverKey; // present only for the 7 lever nodes
  getValue: (a: FrontOfficeAssumptions, r: FrontOfficeResult) => string;
  getSub?: (a: FrontOfficeAssumptions, r: FrontOfficeResult) => string;
};

type ChainEdge = {
  from: ChainNodeId;
  to: ChainNodeId;
  relation: EdgeRelation;
  weight: EdgeWeight;
  label?: string; // shown near the edge for the flagged inverse/threshold cases
  routing?: "bundle"; // routes via the bottom bus instead of a direct curve
};

// ============================================================================
// Node data — every getValue/getSub reads FrontOfficeResult or
// FrontOfficeAssumptions fields that already exist on the committed engine.
// ============================================================================

const NODES: ChainNode[] = [
  // Decision levers — column 0, two lanes (on-field, business) plus the
  // isolated National Revenue node below both.
  { id: "payroll", label: "Player Payroll", kind: "lever", col: 0, row: 0, leverKey: "payroll",
    getValue: (a) => formatCurrencyCompact(a.payroll) },
  { id: "scouting", label: "Scouting & Development", kind: "lever", col: 0, row: 1, leverKey: "developmentSpend",
    getValue: (a) => formatCurrencyCompact(a.developmentSpend) },
  { id: "coaching", label: "Coaching & Staff", kind: "lever", col: 0, row: 2, leverKey: "coachingSpend",
    getValue: (a) => formatCurrencyCompact(a.coachingSpend) },
  { id: "facilities", label: "Facilities & Sports Science", kind: "lever", col: 0, row: 3, leverKey: "facilitiesSpend",
    getValue: (a) => formatCurrencyCompact(a.facilitiesSpend) },
  { id: "marketing", label: "Marketing & Fan Engagement", kind: "lever", col: 0, row: 5, leverKey: "marketingSpend",
    getValue: (a) => formatCurrencyCompact(a.marketingSpend) },
  { id: "gameday", label: "Stadium & Gameday Ops", kind: "lever", col: 0, row: 6, leverKey: "gamedaySpend",
    getValue: (a) => formatCurrencyCompact(a.gamedaySpend) },
  { id: "ticketPrice", label: "Ticket Price", kind: "lever", col: 0, row: 7, leverKey: "ticketPrice",
    getValue: (a) => formatCurrencyCompact(a.ticketPrice) },
  { id: "nationalRevenue", label: "National Revenue", kind: "fixed", col: 0, row: 9.6,
    annotation: "FIXED / NON-CONTROLLABLE",
    getValue: (_a, r) => formatCurrencyCompact(r.revenue.national) },

  // On-field sub-calculations
  { id: "rosterQuality", label: "Roster Quality", kind: "derived", col: 1, row: 0.5, small: true,
    getValue: (_a, r) => r.rosterQuality.toFixed(1), getSub: () => "of 100" },
  { id: "coachingQuality", label: "Coaching Quality", kind: "derived", col: 1, row: 2, small: true,
    getValue: (_a, r) => r.coachingQuality.toFixed(1), getSub: () => "of 100" },
  { id: "availability", label: "Availability", kind: "derived", col: 1, row: 3, small: true,
    getValue: (_a, r) => `${(r.availability * 100).toFixed(1)}%` },

  { id: "teamStrength", label: "Team Strength", kind: "derived", col: 2, row: 1.8,
    getValue: (_a, r) => r.teamStrength.toFixed(1), getSub: (_a, r) => `${r.strengthRatio.toFixed(2)}x league avg` },
  { id: "wins", label: "Expected Wins", kind: "derived", col: 3, row: 1.8,
    getValue: (_a, r) => r.wins.toFixed(2), getSub: () => "of 17 games" },
  { id: "seed", label: "NFC Seed", kind: "derived", col: 4, row: 1.8,
    getValue: (_a, r) => (r.playoff.seed !== null ? `${r.playoff.seed}` : "Missed") },
  { id: "playoffRevenue", label: "Playoff Revenue", kind: "derived", col: 5, row: 1.8,
    getValue: (_a, r) => formatCurrencyCompact(r.revenue.playoff) },

  // Business / attendance chain
  { id: "attendance", label: "Attendance", kind: "derived", col: 1, row: 6, small: true,
    getValue: (_a, r) => Math.round(r.attendance).toLocaleString() },
  { id: "ticketing", label: "Ticketing", kind: "derived", col: 2, row: 5.5,
    getValue: (_a, r) => formatCurrencyCompact(r.revenue.ticketing) },
  { id: "concessions", label: "Concessions & Merch", kind: "derived", col: 2, row: 6.5,
    getValue: (_a, r) => formatCurrencyCompact(r.revenue.concessionsMerchandise) },
  { id: "sponsorship", label: "Local Sponsorship", kind: "derived", col: 2, row: 7.5,
    getValue: (_a, r) => formatCurrencyCompact(r.revenue.sponsorship) },

  // Totals and final outputs. Total Revenue sits close to its three
  // biggest, most numerous inputs (Ticketing/Concessions/Sponsorship) so
  // those merges are short and roughly horizontal; Playoff Revenue and
  // National Revenue are the only two that still have real distance to
  // cover, and get bezier control points shaped for that in edgePath().
  { id: "totalRevenue", label: "Total Revenue", kind: "derived", col: 6, row: 6.5,
    getValue: (_a, r) => formatCurrencyCompact(r.revenue.total) },
  { id: "totalCost", label: "Total Cost", kind: "derived", col: 6, row: 11,
    getValue: (_a, r) => formatCurrencyCompact(r.cost.total) },
  { id: "operatingResult", label: "Operating Result", kind: "derived", col: 7, row: 8,
    getValue: (_a, r) => formatCurrencyCompact(r.operatingResult) },
  { id: "franchiseHealth", label: "Franchise Health", kind: "derived", col: 8, row: 5,
    getValue: (_a, r) => r.franchiseHealth.toFixed(1), getSub: () => "of 100" },
];

// ============================================================================
// Edge data — every edge below corresponds to an actual read/dependency in
// frontOffice.ts's own functions (rosterQuality, coachingQuality,
// availability, teamStrength, expectedWins, buildNfcField/resolvePlayoffs,
// attendanceRate, concessionsMerchandiseRevenue, sponsorshipRevenue,
// playoffRevenue). Three relations: "positive" (solid cream), "inverse"
// (dashed rust — attendanceRate's priceFactor pushing attendance down, and
// the cost/operating-result subtraction), and "threshold" (dotted
// brass-light — attendanceRate's priceFactor again, but read through to
// Ticketing: revenue per attendee rises with price up to the free-zone
// boundary and falls past it, so neither positive nor inverse alone is
// honest about that one edge).
// ============================================================================

const EDGES: ChainEdge[] = [
  // On-field spine
  { from: "payroll", to: "rosterQuality", relation: "positive", weight: "primary" },
  { from: "scouting", to: "rosterQuality", relation: "positive", weight: "primary" },
  { from: "coaching", to: "coachingQuality", relation: "positive", weight: "primary" },
  { from: "facilities", to: "availability", relation: "positive", weight: "primary" },
  { from: "rosterQuality", to: "teamStrength", relation: "positive", weight: "primary" },
  { from: "coachingQuality", to: "teamStrength", relation: "positive", weight: "primary" },
  { from: "availability", to: "teamStrength", relation: "positive", weight: "primary" },
  { from: "teamStrength", to: "wins", relation: "positive", weight: "primary" },
  { from: "wins", to: "seed", relation: "positive", weight: "primary" },
  { from: "seed", to: "playoffRevenue", relation: "positive", weight: "primary" },
  { from: "ticketPrice", to: "playoffRevenue", relation: "positive", weight: "secondary" },

  // Business / attendance spine
  { from: "marketing", to: "attendance", relation: "positive", weight: "primary" },
  {
    from: "ticketPrice",
    to: "attendance",
    relation: "inverse",
    weight: "primary",
    label: "higher price, lower attendance",
  },
  { from: "attendance", to: "ticketing", relation: "positive", weight: "primary" },
  {
    from: "ticketPrice",
    to: "ticketing",
    relation: "threshold",
    weight: "secondary",
    label: "peaks near the $262 free-zone ceiling",
  },
  { from: "attendance", to: "concessions", relation: "positive", weight: "primary" },
  { from: "gameday", to: "concessions", relation: "positive", weight: "primary" },
  { from: "marketing", to: "sponsorship", relation: "positive", weight: "primary" },

  // Every spend lever also rolls into Total Cost — real edges, routed as a
  // bundled "bus" along the bottom of the canvas (see edgePath) so six
  // long lines don't cut across the primary chain above them.
  { from: "payroll", to: "totalCost", relation: "positive", weight: "secondary", routing: "bundle" },
  { from: "coaching", to: "totalCost", relation: "positive", weight: "secondary", routing: "bundle" },
  { from: "facilities", to: "totalCost", relation: "positive", weight: "secondary", routing: "bundle" },
  { from: "scouting", to: "totalCost", relation: "positive", weight: "secondary", routing: "bundle" },
  { from: "marketing", to: "totalCost", relation: "positive", weight: "secondary", routing: "bundle" },
  { from: "gameday", to: "totalCost", relation: "positive", weight: "secondary", routing: "bundle" },

  // Merges
  { from: "nationalRevenue", to: "totalRevenue", relation: "positive", weight: "primary" },
  { from: "ticketing", to: "totalRevenue", relation: "positive", weight: "primary" },
  { from: "concessions", to: "totalRevenue", relation: "positive", weight: "primary" },
  { from: "sponsorship", to: "totalRevenue", relation: "positive", weight: "primary" },
  { from: "playoffRevenue", to: "totalRevenue", relation: "positive", weight: "primary" },
  { from: "totalRevenue", to: "operatingResult", relation: "positive", weight: "primary" },
  {
    from: "totalCost",
    to: "operatingResult",
    relation: "inverse",
    weight: "primary",
    label: "higher cost, lower result",
  },
  { from: "wins", to: "franchiseHealth", relation: "positive", weight: "primary" },
  { from: "operatingResult", to: "franchiseHealth", relation: "positive", weight: "primary" },
];

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
const LEVER_NODE_BY_KEY = new Map(
  NODES.filter((n) => n.leverKey).map((n) => [n.leverKey as FrontOfficeDriverKey, n.id])
);
const COST_BUNDLE_EDGES = EDGES.filter((e) => e.routing === "bundle");

// Forward adjacency, built once, reused by the highlight BFS below.
const FORWARD_EDGES = new Map<ChainNodeId, ChainEdge[]>();
EDGES.forEach((e) => {
  const list = FORWARD_EDGES.get(e.from) ?? [];
  list.push(e);
  FORWARD_EDGES.set(e.from, list);
});

function downstreamOf(startIds: ChainNodeId[]): { nodes: Set<ChainNodeId>; edgeKeys: Set<string> } {
  const nodes = new Set<ChainNodeId>(startIds);
  const edgeKeys = new Set<string>();
  const queue = [...startIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of FORWARD_EDGES.get(current) ?? []) {
      edgeKeys.add(`${edge.from}->${edge.to}`);
      if (!nodes.has(edge.to)) {
        nodes.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return { nodes, edgeKeys };
}

// ============================================================================
// Layout — analytical (col, row) -> pixel conversion. No DOM measurement:
// the SVG edges and the node divs are positioned from the exact same
// function, so they can never drift out of sync.
//
// Column pitch is NOT uniform. The three single-node on-field stages
// (Team Strength -> Wins -> Seed -> Playoff Revenue) only need enough gap
// to clear each other's own width, while column 0 (eight stacked lever
// nodes) needs more room against column 1's quality nodes. Tightening the
// narrow middle columns — not shrinking any node — is what fits the whole
// diagram inside 1280px.
// ============================================================================

const COL_GAPS = [132, 130, 128, 126, 126, 100, 96, 96]; // gap from column i to i+1
const COL_X: number[] = [0];
COL_GAPS.forEach((gap, i) => COL_X.push(COL_X[i] + gap));

const ROW_PITCH = 62;
const PAD_X = 66;
const PAD_Y = 34;
const NODE_W = 112;
const NODE_H = 58;
const NODE_W_SMALL = 96;
const NODE_H_SMALL = 48;
// Lever labels ("Marketing & Fan Engagement", "Facilities & Sports Science")
// run longer than any derived-metric label, so the 7 lever cards (column 0
// only) get a few extra pixels of width. Column 0's own gap to column 1
// (COL_GAPS[0]) was sized with this width in mind, so widening only the
// lever kind can't reintroduce the same-row collisions the gap array
// avoids elsewhere.
const NODE_W_LEVER = 128;

function nodeCenter(node: ChainNode): { x: number; y: number } {
  return { x: PAD_X + COL_X[node.col], y: PAD_Y + node.row * ROW_PITCH };
}

function nodeSize(node: ChainNode): { w: number; h: number } {
  if (node.small) return { w: NODE_W_SMALL, h: NODE_H_SMALL };
  if (node.kind === "lever") return { w: NODE_W_LEVER, h: NODE_H };
  return { w: NODE_W, h: NODE_H };
}

const MAX_ROW = Math.max(...NODES.map((n) => n.row));
const CANVAS_W = PAD_X * 2 + COL_X[COL_X.length - 1] + NODE_W;
const CANVAS_H = PAD_Y * 2 + MAX_ROW * ROW_PITCH + NODE_H;
const BUS_Y = nodeCenter(NODE_BY_ID.get("totalCost")!).y;

function edgePath(from: ChainNode, to: ChainNode): string {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const aSize = nodeSize(from);
  const bSize = nodeSize(to);
  const x1 = a.x + aSize.w / 2;
  const y1 = a.y;
  const x2 = b.x - bSize.w / 2;
  const y2 = b.y;
  const dx = Math.max(28, (x2 - x1) * 0.45);
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// Every spend lever's cost edge shares the SAME target row (Total Cost's
// own row, BUS_Y) — pulling both bezier control points to that row makes
// the curve drop from the lever, flatten out along the bottom of the
// canvas, and run into Total Cost, instead of cutting a straight diagonal
// through the primary chain above it. `laneIndex`/`laneCount` fan the six
// curves a few pixels apart purely so they read as six lines, not one.
function bundledCostEdgePath(from: ChainNode, to: ChainNode, laneIndex: number, laneCount: number): string {
  const a = nodeCenter(from);
  const aSize = nodeSize(from);
  const b = nodeCenter(to);
  const bSize = nodeSize(to);
  const x1 = a.x;
  const y1 = a.y + aSize.h / 2;
  const x2 = b.x - bSize.w / 2;
  const y2 = b.y;
  const jitter = (laneIndex - (laneCount - 1) / 2) * 5;
  const c1x = x1 + jitter;
  const c2x = x2 - 70;
  return `M ${x1},${y1} C ${c1x},${BUS_Y} ${c2x},${BUS_Y} ${x2},${y2}`;
}

function cubicBezierPoint(
  x1: number, y1: number, c1x: number, c1y: number, c2x: number, c2y: number, x2: number, y2: number, t: number
): { x: number; y: number } {
  const mt = 1 - t;
  const x = mt ** 3 * x1 + 3 * mt ** 2 * t * c1x + 3 * mt * t ** 2 * c2x + t ** 3 * x2;
  const y = mt ** 3 * y1 + 3 * mt ** 2 * t * c1y + 3 * mt * t ** 2 * c2y + t ** 3 * y2;
  return { x, y };
}

// A point ON the actual visible curve (same control points as edgePath),
// not a straight-line average of the two endpoints — two edges from the
// same source (e.g. Ticket Price's two flagged edges below) fan out along
// genuinely different curves, so evaluating the real bezier is what keeps
// their labels from landing on the same spot. `t` defaults to the
// midpoint but is overridable per edge so two labels sharing a
// neighborhood can be pulled toward opposite ends of their own curves.
function edgeLabelPoint(from: ChainNode, to: ChainNode, t = 0.5): { x: number; y: number } {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const aSize = nodeSize(from);
  const bSize = nodeSize(to);
  const x1 = a.x + aSize.w / 2;
  const y1 = a.y;
  const x2 = b.x - bSize.w / 2;
  const y2 = b.y;
  const dx = Math.max(28, (x2 - x1) * 0.45);
  return cubicBezierPoint(x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2, t);
}

// Per-edge label placement along its own curve, only for the handful of
// edges that carry a label — everything else uses the 0.5 default.
const LABEL_T: Partial<Record<string, number>> = {
  "totalCost->operatingResult": 0.5,
};

// Ticket Price's two flagged edges (-> Attendance, -> Ticketing) are both
// SHORT — the nodes sit in adjacent columns/rows — so no point along
// either curve clears both endpoints' own cards; any t just trades an
// overlap with one card for an overlap with the other. Both labels are
// placed instead in the open gap below the input column (between Ticket
// Price's row and National Revenue's), stacked so they don't collide with
// each other either.
const LABEL_POSITION_OVERRIDE: Partial<Record<string, { x: number; y: number }>> = {
  "ticketPrice->attendance": { x: PAD_X + 96, y: PAD_Y + 7.8 * ROW_PITCH },
  "ticketPrice->ticketing": { x: PAD_X + 96, y: PAD_Y + 8.35 * ROW_PITCH },
};

// ============================================================================
// Kind styling — the point of the diagram: a lever, a derived metric, and
// the one fixed-external node must never be visually ambiguous. Levers get
// a filled brass-pale card (the site's own "control" tone) so they read as
// physically different material from the plain-white derived cards, not
// just a thinner border.
// ============================================================================

const KIND_STYLE: Record<NodeKind, string> = {
  lever: "border-2 border-brass bg-brass-pale",
  derived: "border border-forest/25 bg-cream/95",
  fixed: "border-2 border-dashed border-charcoal-soft bg-cream",
};

// A small corner dot instead of a text badge — same color coding as the
// legend swatches — so the label gets the horizontal room it needs instead
// of competing with a "LEVER"/"DERIVED" pill for space. Levers get a
// solid, filled dot (a knob you'd actually turn); derived and fixed stay
// hollow outlines.
const KIND_DOT_STYLE: Record<NodeKind, string> = {
  lever: "border-2 border-brass bg-brass",
  derived: "border border-forest/40 bg-transparent",
  fixed: "border-2 border-dashed border-charcoal-soft bg-transparent",
};

const RELATION_STROKE: Record<EdgeRelation, string> = {
  positive: "#f5f1e6",
  inverse: "#c07a63",
  threshold: "#d8b888",
};

const RELATION_DASH: Record<EdgeRelation, string | undefined> = {
  positive: undefined,
  inverse: "7 4",
  threshold: "1.5 3.5",
};

// ============================================================================
// Number-tween on preset load — the one motion this diagram earns: when a
// strategy preset loads, every numeric node value counts from its old
// reading to its new one instead of snapping, so the chain visibly
// "re-settles" the way real causality would. Gated on `trigger` (the
// parent's presetLoadTick, bumped only by loadPreset — never by a slider
// nudge or reset) so ordinary dragging stays instant, exactly as before.
//
// Generic string tweening, not per-node math: every getValue() here already
// returns a fully formatted string ("$290.10M", "60.6", "95.8%", "1.06x
// league avg", "70,382", "7", "Missed"). Parsing out the leading sign,
// symbol prefix, numeric body, and trailing unit/suffix lets one hook
// animate all of them without touching what each node actually computes —
// a value with no numeric body (e.g. "Missed") simply fails the parse and
// falls back to an instant swap, which is the correct behavior for a
// categorical result.
// ============================================================================

function parseNumericDisplay(
  text: string
): { prefix: string; value: number; decimals: number; suffix: string } | null {
  const match = text.match(/^(-?)([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, sign, prefix, numberPart, suffix] = match;
  const decimalMatch = numberPart.match(/\.(\d+)$/);
  const decimals = decimalMatch ? decimalMatch[1].length : 0;
  const magnitude = parseFloat(numberPart.replace(/,/g, ""));
  if (Number.isNaN(magnitude)) return null;
  return { prefix, value: sign === "-" ? -magnitude : magnitude, decimals, suffix };
}

function formatNumericDisplay(value: number, parsed: { prefix: string; decimals: number; suffix: string }): string {
  const sign = value < 0 ? "-" : "";
  const fixed = Math.abs(value).toFixed(parsed.decimals);
  const [intPart, decPart] = fixed.split(".");
  const withCommas = Number(intPart).toLocaleString("en-US");
  return `${sign}${parsed.prefix}${decPart ? `${withCommas}.${decPart}` : withCommas}${parsed.suffix}`;
}

const NUMBER_TWEEN_DURATION_MS = 500;

function useSettlingDisplay(target: string, trigger: number): string {
  const [display, setDisplay] = useState(target);
  const prevTargetRef = useRef(target);
  const prevTriggerRef = useRef(trigger);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const triggerChanged = trigger !== prevTriggerRef.current;
    const from = prevTargetRef.current;
    prevTriggerRef.current = trigger;
    prevTargetRef.current = target;

    if (!triggerChanged || from === target) {
      setDisplay(target);
      return;
    }
    const parsedFrom = parseNumericDisplay(from);
    const parsedTo = parseNumericDisplay(target);
    if (!parsedFrom || !parsedTo) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / NUMBER_TWEEN_DURATION_MS);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic — settles, doesn't bounce
      setDisplay(formatNumericDisplay(parsedFrom.value + (parsedTo.value - parsedFrom.value) * eased, parsedTo));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, trigger]);

  return display;
}

function AnimatedValue({ target, trigger }: { target: string; trigger: number }) {
  return useSettlingDisplay(target, trigger);
}

export default function FrontOfficeCausalChain({
  assumptions,
  result,
  presetLoadTick,
}: {
  assumptions: FrontOfficeAssumptions;
  result: FrontOfficeResult;
  presetLoadTick: number;
}) {
  const [highlight, setHighlight] = useState<{ nodes: Set<ChainNodeId>; edgeKeys: Set<string> }>({
    nodes: new Set(),
    edgeKeys: new Set(),
  });
  const prevAssumptionsRef = useRef<FrontOfficeAssumptions | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevAssumptionsRef.current;
    prevAssumptionsRef.current = assumptions;
    if (!prev) return; // no highlight on first mount

    const changedLeverIds: ChainNodeId[] = [];
    (Object.keys(assumptions) as FrontOfficeDriverKey[]).forEach((key) => {
      if (prev[key] !== assumptions[key]) {
        const nodeId = LEVER_NODE_BY_KEY.get(key);
        if (nodeId) changedLeverIds.push(nodeId);
      }
    });
    if (changedLeverIds.length === 0) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHighlight(downstreamOf(changedLeverIds));
    timeoutRef.current = setTimeout(() => {
      setHighlight({ nodes: new Set(), edgeKeys: new Set() });
    }, 1100);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [assumptions]);

  return (
    <div className="rounded-2xl bg-forest p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brass-light">
          How This Model Thinks
        </h3>
        <p className="text-xs leading-5 text-cream/70">
          Every value below is read live from this plan&apos;s engine output — move a lever or
          load a strategy and watch the chain re-settle.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H, minWidth: CANVAS_W }}>
          <svg
            width={CANVAS_W}
            height={CANVAS_H}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="absolute inset-0"
            aria-hidden
          >
            {EDGES.map((edge) => {
              const from = NODE_BY_ID.get(edge.from)!;
              const to = NODE_BY_ID.get(edge.to)!;
              const key = `${edge.from}->${edge.to}`;
              const isHighlighted = highlight.edgeKeys.has(key);
              const isBundled = edge.routing === "bundle";
              const d = isBundled
                ? bundledCostEdgePath(
                    from,
                    to,
                    COST_BUNDLE_EDGES.indexOf(edge),
                    COST_BUNDLE_EDGES.length
                  )
                : edgePath(from, to);
              const baseOpacity = isBundled ? 0.22 : edge.weight === "primary" ? 0.55 : 0.22;
              return (
                <path
                  key={key}
                  d={d}
                  fill="none"
                  stroke={isHighlighted ? "#d8b888" : RELATION_STROKE[edge.relation]}
                  strokeOpacity={isHighlighted ? 0.95 : baseOpacity}
                  strokeWidth={isHighlighted ? 2.75 : edge.weight === "primary" ? 1.6 : 1}
                  strokeDasharray={isHighlighted ? undefined : RELATION_DASH[edge.relation]}
                  style={{ transition: "stroke-opacity 300ms ease, stroke-width 300ms ease" }}
                />
              );
            })}
          </svg>

          {NODES.map((node) => {
            const { x, y } = nodeCenter(node);
            const { w, h } = nodeSize(node);
            const value = node.getValue(assumptions, result);
            const sub = node.getSub?.(assumptions, result);
            const isHighlighted = highlight.nodes.has(node.id);
            return (
              <div
                key={node.id}
                className="absolute"
                style={{ left: x, top: y, width: w, height: h, transform: "translate(-50%, -50%)" }}
              >
                {node.annotation && (
                  <span
                    className="absolute left-1/2 whitespace-nowrap rounded bg-brass px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wide text-cream"
                    style={{ bottom: h + 6, transform: "translateX(-50%)" }}
                  >
                    {node.annotation}
                  </span>
                )}
                <div
                  className={`flex h-full w-full flex-col justify-center gap-0.5 rounded-lg px-2 py-1 shadow-sm ${KIND_STYLE[node.kind]}`}
                  style={{
                    boxShadow: isHighlighted ? "0 0 0 3px rgba(216,184,136,0.9)" : undefined,
                    transition: "box-shadow 300ms ease",
                  }}
                >
                  <span className="flex items-start gap-1">
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT_STYLE[node.kind]}`}
                      aria-hidden
                    />
                    <span className="line-clamp-2 text-[8.5px] font-semibold uppercase leading-[1.15] tracking-wide text-charcoal-soft">
                      {node.label}
                    </span>
                  </span>
                  <span className={`font-black leading-none text-charcoal ${node.small ? "text-xs" : "text-sm"}`}>
                    <AnimatedValue target={value} trigger={presetLoadTick} />
                  </span>
                  {sub && <span className="text-[8px] leading-tight text-charcoal-soft">{sub}</span>}
                </div>
              </div>
            );
          })}

          {/* Labels for the flagged inverse/threshold edges only — kept off
              every other edge so the canvas doesn't fill up with text.
              Rendered last (on top of the node cards) and positioned on
              the real curve at a per-edge t, not a raw endpoint average,
              so a label can never end up hidden behind a node. */}
          {EDGES.filter((e) => e.label).map((edge) => {
            const from = NODE_BY_ID.get(edge.from)!;
            const to = NODE_BY_ID.get(edge.to)!;
            const key = `${edge.from}->${edge.to}`;
            const point = LABEL_POSITION_OVERRIDE[key] ?? edgeLabelPoint(from, to, LABEL_T[key] ?? 0.5);
            const color = edge.relation === "inverse" ? "text-[#c07a63]" : "text-brass-light";
            return (
              <div
                key={`${key}-label`}
                className={`pointer-events-none absolute max-w-[110px] rounded bg-forest-dark/95 px-1 py-0.5 text-center text-[7.5px] font-semibold leading-tight ${color}`}
                style={{ left: point.x, top: point.y, transform: "translate(-50%, -50%)" }}
              >
                {edge.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend + the one disclosed simplification */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cream/10 pt-3">
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold uppercase tracking-wide text-cream/80">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-brass bg-brass" /> Decision Lever
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-forest/40 bg-cream/95" /> Derived Metric
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-charcoal-soft bg-cream" />{" "}
            Fixed External Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke="#c07a63" strokeWidth="1.5" strokeDasharray="5 3" />
            </svg>
            Inverse Effect
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke="#d8b888" strokeWidth="1.5" strokeDasharray="1.5 3" />
            </svg>
            Peaks, Then Reverses
          </span>
        </div>
        <p className="max-w-md text-[10px] leading-4 text-cream/60">
          National Revenue has no incoming lever edges by design — it&apos;s set league-wide and
          identical for every team, the largest P&amp;L line the six decisions never touch.
        </p>
      </div>
    </div>
  );
}

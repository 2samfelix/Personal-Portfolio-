// SVG charts for the monday.com Operating Plan page, drawn on the server at build
// time from the hash-pinned workbooks (src/lib/mondayPlan.ts). No number is typed
// here: every plotted value and every number in a label is a workbook cell.
//
// Each mark and number carries data-ref / data-wb / data-v (the cell, the workbook,
// the raw value), and each mark data-axis / data-pos (its coordinate on the value
// axis), so scripts/test-monday-charts.py can check them against the workbook and
// check that the geometry is linear in the values. Charts scale with their
// viewBox (no layout shift), have no animation, and each has a data table.
import type { ReactNode } from "react";
import type { CellValue, MondayCharts } from "@/lib/mondayPlan";

// Palette (site tokens). Text colours pass WCAG AA on cream/white; on the forest
// hero, cream, brass-light and a light rust pass on forest.
export const C = {
  forest: "#1e3a2b",
  rust: "#a1462f",
  soft: "#5b5847",
  ink: "#2a2820",
  brassDark: "#7a5a30",
  brassPale: "#ecdfc2",
  mist: "#e6ebea",
  grid: "#d9dcd6",
  cream: "#f5f1e6",
  brassLight: "#d8b888",
  rustLight: "#f4b9a6",
  sage: "#c9d6cf",
} as const;

const FONT = "Arial, Helvetica, sans-serif";

type Scale = (v: number) => number;
const linear = (d0: number, d1: number, r0: number, r1: number): Scale => (v) => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Baselines for two direct labels at the end of two lines, the upper one first:
 * each starts near its line's end and they are pushed apart, about their
 * midpoint, until the upper block (upperLines tall) clears the lower one.
 */
function separate(yUpper: number, yLower: number, fs: number, upperLines: number): [number, number] {
  const gap = upperLines * (fs + 2) + fs + 2;
  let a = yUpper - 2;
  let b = yLower + fs - 2;
  if (b - a < gap) {
    const mid = (a + b) / 2;
    a = mid - gap / 2;
    b = mid + gap / 2;
  }
  return [a, b];
}

/** Attributes tying a drawn mark to its workbook cell and its value-axis coordinate. */
function mark(c: CellValue, axis: string, pos: number) {
  return { "data-ref": c.ref, "data-wb": c.wb, "data-v": c.v, "data-axis": axis, "data-pos": r2(pos) };
}
/** Attributes tying a printed number to its workbook cell. */
function num(c: CellValue) {
  return { "data-ref": c.ref, "data-wb": c.wb, "data-v": c.v, "data-d": c.d };
}

/** A chart figure: a title that states the point, the chart, a caption and a data table. */
export function ChartFigure({
  id,
  title,
  children,
  caption,
  table,
  dark = false,
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
  caption?: ReactNode;
  table: ReactNode;
  dark?: boolean;
}) {
  return (
    <figure aria-labelledby={`${id}-title`} className="min-w-0">
      <h3 id={`${id}-title`} className={`text-lg font-bold leading-7 ${dark ? "text-cream" : "text-charcoal"}`}>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
      {caption && <figcaption className={`mt-3 text-base leading-7 ${dark ? "text-cream/90" : "text-charcoal-soft"}`}>{caption}</figcaption>}
      <details className={`mt-3 text-base ${dark ? "text-cream" : "text-charcoal"} print:hidden`}>
        <summary className={`cursor-pointer rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 ${dark ? "focus-visible:ring-brass-light" : "focus-visible:ring-brass"}`}>
          Data table
        </summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </figure>
  );
}

function DataTable({ head, rows, dark = false }: { head: string[]; rows: ReactNode[][]; dark?: boolean }) {
  const line = dark ? "border-cream/20" : "border-forest/10";
  return (
    <table className="w-full border-collapse text-left tabular-nums">
      <thead>
        <tr className={`border-b ${line}`}>
          {head.map((h, i) => (
            <th key={i} scope="col" className={`py-1.5 pr-4 font-semibold ${i ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={`border-b ${line} last:border-b-0`}>
            {r.map((c, j) =>
              j === 0 ? (
                <th key={j} scope="row" className="py-1.5 pr-4 font-normal">
                  {c}
                </th>
              ) : (
                <td key={j} className="py-1.5 pr-4 text-right">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const V = ({ c }: { c: CellValue }) => <span {...num(c)}>{c.d}</span>;

// --- 1. Growth: history and the plan's Base and Downside paths ---------------------

function GrowthSvg({ g, w, h, compact, titleId }: { g: MondayCharts["growth"]; w: number; h: number; compact: boolean; titleId: string }) {
  const n = g.history.length + g.base.length;
  const pad = { l: compact ? 10 : 14, r: compact ? 78 : 92, t: 34, b: 34 };
  const values = [...g.history.map((p) => p.value.v), ...g.base.map((p) => p.value.v), ...g.downside.map((p) => p.value.v)];
  const y = linear(0, Math.max(...values), h - pad.b, pad.t);
  const x = linear(0, n - 1, pad.l, w - pad.r);
  const axis = `growth-${compact ? "c" : "w"}`;
  const last = g.history.length - 1;
  const pts = (arr: { value: CellValue }[], offset: number) => arr.map((p, i) => [x(offset + i), y(p.value.v)] as const);
  const histPts = pts(g.history, 0);
  const basePts = [histPts[last], ...pts(g.base, g.history.length)];
  const downPts = [histPts[last], ...pts(g.downside, g.history.length)];
  const d = (p: readonly (readonly [number, number])[]) => p.map(([a, b], i) => `${i ? "L" : "M"}${r2(a)},${r2(b)}`).join(" ");
  const fs = compact ? 13 : 13;
  const baseEnd = g.base[g.base.length - 1];
  const downEnd = g.downside[g.downside.length - 1];
  const first = g.history[0];
  const labelY = separate(y(baseEnd.value.v), y(downEnd.value.v), fs, 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby={titleId} style={{ fontFamily: FONT }}>
      {/* Baseline at zero growth and a divider between actuals and plan. */}
      <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} stroke={C.sage} strokeOpacity={0.5} />
      <line x1={x(last)} x2={x(last)} y1={pad.t - 14} y2={h - pad.b} stroke={C.sage} strokeOpacity={0.6} strokeDasharray="3 4" />
      <text x={x(last) - 6} y={pad.t - 18} textAnchor="end" fontSize={fs} fill={C.cream}>Actual</text>
      <text x={x(last) + 6} y={pad.t - 18} fontSize={fs} fill={C.cream}>Plan</text>
      <path d={d(histPts)} fill="none" stroke={C.cream} strokeWidth={2.5} />
      <path d={d(basePts)} fill="none" stroke={C.brassLight} strokeWidth={3} />
      <path d={d(downPts)} fill="none" stroke={C.rustLight} strokeWidth={3} strokeDasharray="7 5" />
      {g.history.map((p, i) => (
        <circle key={p.quarter} cx={r2(histPts[i][0])} cy={r2(histPts[i][1])} r={compact ? 0 : 2} fill={C.cream} {...mark(p.value, axis, histPts[i][1])} />
      ))}
      {g.base.map((p, i) => (
        <circle key={`b${p.quarter}`} cx={r2(basePts[i + 1][0])} cy={r2(basePts[i + 1][1])} r={2.5} fill={C.brassLight} {...mark(p.value, axis, basePts[i + 1][1])} />
      ))}
      {g.downside.map((p, i) => (
        <circle key={`d${p.quarter}`} cx={r2(downPts[i + 1][0])} cy={r2(downPts[i + 1][1])} r={2.5} fill={C.rustLight} {...mark(p.value, axis, downPts[i + 1][1])} />
      ))}
      {/* Direct labels. */}
      {!compact && (
        <text x={x(0) + 4} y={y(first.value.v) - 8} fontSize={fs} fill={C.cream}>
          <tspan {...num(first.value)}>{first.value.d}</tspan>
          <tspan> in {first.quarter}</tspan>
        </text>
      )}
      <text x={x(last) - 6} y={y(g.lastActual.value.v) + fs + 10} textAnchor="end" fontSize={fs} fontWeight={700} fill={C.cream}>
        <tspan {...num(g.lastActual.value)}>{g.lastActual.value.d}</tspan>
        <tspan fontWeight={400}> {g.lastActual.quarter}</tspan>
      </text>
      <text x={w - pad.r + 6} y={labelY[0]} fontSize={fs} fontWeight={700} fill={C.brassLight}>
        Base
        <tspan x={w - pad.r + 6} dy={fs + 2} fontWeight={400} {...num(baseEnd.value)}>{baseEnd.value.d}</tspan>
      </text>
      <text x={w - pad.r + 6} y={labelY[1]} fontSize={fs} fontWeight={700} fill={C.rustLight}>
        Downside
        <tspan x={w - pad.r + 6} dy={fs + 2} fontWeight={400} {...num(downEnd.value)}>{downEnd.value.d}</tspan>
      </text>
      <text x={pad.l} y={h - 10} fontSize={fs} fill={C.cream}>{first.quarter}</text>
      <text x={w - pad.r} y={h - 10} textAnchor="end" fontSize={fs} fill={C.cream}>{baseEnd.quarter}</text>
    </svg>
  );
}

export function GrowthChart({ g }: { g: MondayCharts["growth"] }) {
  return (
    <ChartFigure
      id="growth"
      dark
      title={
        <>
          Year-over-year revenue growth has slowed from <V c={g.history[0].value} /> to <V c={g.lastActual.value} />; the plan extends the slowdown, faster in the Downside.
        </>
      }
      table={
        <DataTable
          dark
          head={["Quarter", "Actual", "Base", "Downside"]}
          rows={[
            ...g.history.map((p) => [p.quarter, <V key="a" c={p.value} />, "", ""]),
            ...g.base.map((p, i) => [p.quarter, "", <V key="b" c={p.value} />, <V key="d" c={g.downside[i].value} />]),
          ]}
        />
      }
    >
      {/* Wide chart beside the title from lg; a simplified, larger-type version below. */}
      <div className="hidden lg:block">
        <GrowthSvg g={g} w={520} h={300} compact={false} titleId="growth-title" />
      </div>
      <div className="mx-auto max-w-[30rem] lg:hidden">
        <GrowthSvg g={g} w={340} h={250} compact titleId="growth-title" />
      </div>
    </ChartFigure>
  );
}

// --- 2. Base vs Downside by quarter: two small panels ----------------------------

function PanelSvg({
  id,
  quarters,
  base,
  down,
  lowest,
  fitZero = false,
  w,
}: {
  w: number;
  id: string;
  quarters: string[];
  base: { value: CellValue }[];
  down: { value: CellValue }[];
  lowest?: { quarter: string; value: CellValue };
  fitZero?: boolean;
}) {
  const h = Math.round(w * 0.62);
  const pad = { l: 12, r: 84, t: 24, b: 40 };
  const vals = [...base, ...down].map((p) => p.value.v);
  const lo = fitZero ? 0 : Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo;
  const y = linear(lo - span * 0.08, hi + span * 0.08, h - pad.b, pad.t);
  const x = linear(0, quarters.length - 1, pad.l, w - pad.r);
  const axis = `panel-${id}-${w}`;
  const path = (arr: { value: CellValue }[]) => arr.map((p, i) => `${i ? "L" : "M"}${r2(x(i))},${r2(y(p.value.v))}`).join(" ");
  const bEnd = base[base.length - 1].value;
  const dEnd = down[down.length - 1].value;
  const li = lowest ? quarters.indexOf(lowest.quarter) : -1;
  const endY = separate(y(bEnd.v), y(dEnd.v), 13, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby={`${id}-title`} style={{ fontFamily: FONT }}>
      {quarters.map((q, i) => (
        <line key={q} x1={x(i)} x2={x(i)} y1={pad.t} y2={h - pad.b} stroke={C.grid} strokeWidth={1} />
      ))}
      <path d={path(base)} fill="none" stroke={C.forest} strokeWidth={3} />
      <path d={path(down)} fill="none" stroke={C.rust} strokeWidth={3} strokeDasharray="7 5" />
      {base.map((p, i) => (
        <circle key={`b${i}`} cx={r2(x(i))} cy={r2(y(p.value.v))} r={3} fill={C.forest} {...mark(p.value, axis, y(p.value.v))} />
      ))}
      {down.map((p, i) => (
        <circle key={`d${i}`} cx={r2(x(i))} cy={r2(y(p.value.v))} r={3} fill={C.rust} {...mark(p.value, axis, y(p.value.v))} />
      ))}
      {lowest && li >= 0 && (
        <g>
          <circle cx={r2(x(li))} cy={r2(y(lowest.value.v))} r={8} fill="none" stroke={C.rust} strokeWidth={2} />
          <text x={x(li) - 12} y={y(lowest.value.v) + 4} textAnchor="end" fontSize={13} fontWeight={700} fill={C.rust}>
            Lowest: <tspan {...num(lowest.value)}>{lowest.value.d}</tspan>
          </text>
        </g>
      )}
      <text x={w - pad.r + 8} y={endY[0]} fontSize={13} fontWeight={700} fill={C.forest}>
        Base <tspan fontWeight={400} {...num(bEnd)}>{bEnd.d}</tspan>
      </text>
      <text x={w - pad.r + 8} y={endY[1]} fontSize={13} fontWeight={700} fill={C.rust}>
        Downside
        <tspan x={w - pad.r + 8} dy={15} fontWeight={400} {...num(dEnd)}>{dEnd.d}</tspan>
      </text>
      <text x={x(0)} y={h - 14} fontSize={13} fill={C.soft}>{quarters[0]}</text>
      <text x={x(quarters.length - 1)} y={h - 14} textAnchor="end" fontSize={13} fill={C.soft}>{quarters[quarters.length - 1]}</text>
    </svg>
  );
}

export function QuarterlyCharts({ q }: { q: MondayCharts["quarterly"] }) {
  const rows = q.quarters.map((quarter, i) => [
    quarter,
    <V key="rb" c={q.revenue.base[i].value} />,
    <V key="rd" c={q.revenue.downside[i].value} />,
    <V key="mb" c={q.margin.base[i].value} />,
    <V key="md" c={q.margin.downside[i].value} />,
  ]);
  return (
    <ChartFigure
      id="quarterly"
      title={
        <>
          The cases split from {q.quarters[1]}: the Downside&apos;s margin falls to <V c={q.lowest.value} /> by {q.lowest.quarter}.
        </>
      }
      caption={
        <>
          The FY27 revenue gap between the cases is <V c={q.gapPct} /> of Base, <V c={q.gapX} /> the average 4-quarter-ahead backtest miss, so the two cases cannot be told apart in advance.
        </>
      }
      table={<DataTable head={["Quarter", "Revenue, Base (USD m)", "Revenue, Downside (USD m)", "Margin, Base", "Margin, Downside"]} rows={rows} />}
    >
      <div className="mx-auto grid max-w-[34rem] grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-2">
        <div>
          <p id="rev-panel-title" className="text-base font-semibold text-charcoal">Revenue by quarter, USD m</p>
          <div className="sm:hidden">
            <PanelSvg w={300} id="rev-panel" quarters={q.quarters} base={q.revenue.base} down={q.revenue.downside} />
          </div>
          <div className="hidden sm:block">
            <PanelSvg w={420} id="rev-panel" quarters={q.quarters} base={q.revenue.base} down={q.revenue.downside} />
          </div>
        </div>
        <div>
          <p id="margin-panel-title" className="text-base font-semibold text-charcoal">Non-GAAP operating margin by quarter</p>
          <div className="sm:hidden">
            <PanelSvg w={300} id="margin-panel" quarters={q.quarters} base={q.margin.base} down={q.margin.downside} lowest={q.lowest} />
          </div>
          <div className="hidden sm:block">
            <PanelSvg w={420} id="margin-panel" quarters={q.quarters} base={q.margin.base} down={q.margin.downside} lowest={q.lowest} />
          </div>
        </div>
      </div>
    </ChartFigure>
  );
}

// --- 3. Bridge: FY27 Base operating income to Downside -----------------------------

const BRIDGE_NAMES = ["Revenue shortfall", "Gross-margin decline", "Operating expense effect"];

function BridgeSvg({ b, w }: { b: MondayCharts["bridge"]; w: number }) {
  const rowH = 52;
  const rows = [b.start, ...b.steps, b.end];
  const h = rows.length * rowH + 8;
  const pad = { l: 8, r: 74 };
  const x = linear(0, b.start.value.v, pad.l, w - pad.r);
  const axis = `bridge-${w}`;
  let level = b.start.value.v;
  const names = ["Base FY27 operating income", ...BRIDGE_NAMES, "Downside FY27 operating income"];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby="bridge-title" style={{ fontFamily: FONT }}>
      {rows.map((r, i) => {
        const top = i * rowH + 22;
        const isTotal = i === 0 || i === rows.length - 1;
        let x0: number, x1: number;
        if (isTotal) {
          x0 = x(0);
          x1 = x(r.value.v);
        } else {
          const next = level + r.value.v;
          x0 = x(Math.min(level, next));
          x1 = x(Math.max(level, next));
          level = next;
        }
        const color = isTotal ? (i === 0 ? C.forest : C.rust) : C.brassDark;
        return (
          <g key={r.label}>
            <text x={pad.l} y={top - 6} fontSize={13} fill={C.ink}>{names[i]}</text>
            <rect
              x={r2(x0)}
              y={top}
              width={r2(Math.max(x1 - x0, 1.5))}
              height={20}
              rx={3}
              fill={color}
              {...mark(r.value, isTotal ? axis : `${axis}-step`, isTotal ? x1 : x1 - x0)}
              data-kind={isTotal ? "total" : "step"}
            />
            <text x={r2(x1 + 6)} y={top + 15} fontSize={13} fontWeight={700} fill={color} {...num(r.value)}>
              {r.value.d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BridgeChart({ b }: { b: MondayCharts["bridge"] }) {
  return (
    <ChartFigure
      id="bridge"
      title={
        <>
          Most of the FY27 operating income gap is the revenue shortfall: <V c={b.steps[0].value} /> of the drop from <V c={b.start.value} /> to <V c={b.end.value} /> (USD m).
        </>
      }
      caption="Operating expense dollars are held at Base in the Downside before any management response, so the opex effect is zero."
      table={<DataTable head={["Step (workbook label)", "USD m"]} rows={[b.start, ...b.steps, b.end].map((r) => [r.label, <V key="v" c={r.value} />])} />}
    >
      <div className="mx-auto max-w-[30rem] md:hidden">
        <BridgeSvg b={b} w={300} />
      </div>
      <div className="hidden max-w-3xl md:block">
        <BridgeSvg b={b} w={680} />
      </div>
    </ChartFigure>
  );
}

// --- 4. Scorecard as range bars -------------------------------------------------------

function money(unit: string, c: CellValue) {
  return unit === "USD millions" ? `$${c.d}M` : c.d;
}

function RangeSvg({ ranges, w }: { ranges: MondayCharts["ranges"]; w: number }) {
  const rowH = 104;
  const h = ranges.length * rowH;
  const actualX = w - 30;
  const pad = { l: 8, r: 74 };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby="ranges-title" style={{ fontFamily: FONT }}>
      {ranges.map((m, i) => {
        const top = i * rowH;
        const lo = Math.min(m.low.v, m.guidance?.low.v ?? Infinity);
        const hi = Math.max(m.high.v, m.guidance?.high.v ?? -Infinity);
        const span = hi - lo;
        const x = linear(lo - span * 0.12, hi + span * 0.12, pad.l, w - pad.r);
        const axis = `range-${w}-${i}`;
        const barY = top + 40;
        return (
          <g key={m.metric}>
            <text x={pad.l} y={top + 18} fontSize={15} fontWeight={700} fill={C.ink} data-label="row label">{m.metric}</text>
            {m.guidance && (
              <g>
                <rect
                  x={r2(x(m.guidance.low.v))}
                  y={barY - 8}
                  width={r2(Math.max(x(m.guidance.high.v) - x(m.guidance.low.v), 2))}
                  height={30}
                  fill={C.brassPale}
                  {...mark(m.guidance.low, axis, x(m.guidance.low.v))}
                />
                <rect x={r2(x(m.guidance.high.v)) - 1} y={barY - 8} width={1} height={30} fill={C.brassPale} {...mark(m.guidance.high, axis, x(m.guidance.high.v))} />
                <text x={pad.l} y={barY + 44} fontSize={13} fill={C.brassDark}>
                  Guidance <tspan {...num(m.guidance.low)}>{money(m.unit, m.guidance.low)}</tspan>–<tspan {...num(m.guidance.high)}>{money(m.unit, m.guidance.high)}</tspan>
                </text>
              </g>
            )}
            <rect x={r2(x(m.low.v))} y={barY} width={r2(x(m.high.v) - x(m.low.v))} height={14} rx={7} fill={C.forest} {...mark(m.low, axis, x(m.low.v))} />
            <rect x={r2(x(m.high.v)) - 1} y={barY} width={1} height={14} fill={C.forest} {...mark(m.high, axis, x(m.high.v))} />
            <rect x={r2(x(m.mid.v)) - 1.5} y={barY - 6} width={3} height={26} fill={C.ink} {...mark(m.mid, axis, x(m.mid.v))} />
            <text x={r2(x(m.low.v))} y={barY + 28} fontSize={13} fill={C.ink} {...num(m.low)}>{money(m.unit, m.low)}</text>
            <text x={r2(x(m.mid.v))} y={barY - 11} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink} {...num(m.mid)}>{money(m.unit, m.mid)}</text>
            <text x={r2(x(m.high.v))} y={barY + 28} textAnchor="end" fontSize={13} fill={C.ink} {...num(m.high)}>{money(m.unit, m.high)}</text>
            {/* Empty marker: the actual is not known until November 9. */}
            <circle cx={actualX} cy={barY + 7} r={9} fill="none" stroke={C.soft} strokeWidth={2} strokeDasharray="3 3" />
            <text x={actualX} y={barY + 34} textAnchor="middle" fontSize={13} fill={C.soft}>Actual:</text>
            <text x={actualX} y={barY + 50} textAnchor="middle" fontSize={13} fill={C.soft}>Nov. 9</text>
          </g>
        );
      })}
    </svg>
  );
}

export function RangeChart({ ranges }: { ranges: MondayCharts["ranges"] }) {
  return (
    <ChartFigure
      id="ranges"
      title="The locked Q3 call is a range for each metric; the actuals are not known yet."
      caption="Dark bar: locked low to high, with the mid as a tick. Tan band: the company's August 10 guidance, where it gave one. Each metric has its own scale. The empty circle is where the actual will go after November 9."
      table={
        <DataTable
          head={["Metric", "Guidance", "Locked low", "Locked mid", "Locked high", "Actual"]}
          rows={ranges.map((m) => [
            m.metric,
            m.guidance ? (
              <span key="g">
                <span {...num(m.guidance.low)}>{money(m.unit, m.guidance.low)}</span>–<span {...num(m.guidance.high)}>{money(m.unit, m.guidance.high)}</span>
              </span>
            ) : (
              "None"
            ),
            <span key="l" {...num(m.low)}>{money(m.unit, m.low)}</span>,
            <span key="m" {...num(m.mid)}>{money(m.unit, m.mid)}</span>,
            <span key="h" {...num(m.high)}>{money(m.unit, m.high)}</span>,
            "Pending: Nov. 9",
          ])}
        />
      }
    >
      <div className="mx-auto max-w-[30rem] md:hidden">
        <RangeSvg ranges={ranges} w={300} />
      </div>
      <div className="hidden max-w-4xl md:block">
        <RangeSvg ranges={ranges} w={680} />
      </div>
    </ChartFigure>
  );
}

// --- 7. Breakeven bars ----------------------------------------------------------------

function BreakevenSvg({ rows, w }: { rows: MondayCharts["breakeven"]; w: number }) {
  // Long labels wrap at their parenthesis on the narrow chart.
  const lines = rows.map((r) => (w < 400 && r.label.includes(" (") ? [r.label.slice(0, r.label.indexOf(" (")), r.label.slice(r.label.indexOf(" (") + 1)] : [r.label]));
  const tops: number[] = [];
  let y0 = 0;
  for (const l of lines) {
    tops.push(y0);
    y0 += 70 + l.length * 16;
  }
  const h = y0;
  const pad = { l: 8, r: 70 };
  const max = Math.max(...rows.map((r) => r.loss.v));
  const x = linear(0, max, pad.l, w - pad.r);
  const axis = `breakeven-${w}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby="breakeven-title" style={{ fontFamily: FONT }}>
      {rows.map((r, i) => {
        const top = tops[i] + (lines[i].length - 1) * 16;
        return (
          <g key={r.label}>
            <text x={pad.l} y={tops[i] + 16} fontSize={13} fontWeight={700} fill={C.ink} data-label="workbook row label">
              {lines[i].map((t, k) => (
                <tspan key={k} x={pad.l} dy={k ? 16 : 0}>
                  {t}
                </tspan>
              ))}
            </text>
            <rect x={pad.l} y={top + 24} width={r2(x(r.saving.v) - pad.l)} height={18} rx={3} fill={C.forest} {...mark(r.saving, axis, x(r.saving.v))} />
            <text x={r2(x(r.saving.v) + 6)} y={top + 38} fontSize={13} fill={C.forest}>
              <tspan fontWeight={700} {...num(r.saving)}>{r.saving.d}</tspan> saved
            </text>
            <rect x={pad.l} y={top + 48} width={r2(x(r.loss.v) - pad.l)} height={18} rx={3} fill={C.brassDark} {...mark(r.loss, axis, x(r.loss.v))} />
            <text x={r2(x(r.loss.v) + 6)} y={top + 62} fontSize={13} fill={C.brassDark}>
              <tspan fontWeight={700} {...num(r.loss)}>{r.loss.d}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BreakevenChart({ rows }: { rows: MondayCharts["breakeven"] }) {
  const [l1, l2, both] = rows;
  return (
    <ChartFigure
      id="breakeven"
      title={
        <>
          A lever pays in FY27 only if it costs less revenue than its breakeven: <V c={l1.loss} /> for Lever 1, <V c={l2.loss} /> for Lever 2, <V c={both.loss} /> for both (USD m).
        </>
      }
      caption="Green: FY27 operating income saved from the start quarter. Brass: the FY27 revenue loss that would cancel that saving. One-year view only; the growth cost itself cannot be measured from public data."
      table={<DataTable head={["Lever", "FY27 saving (USD m)", "Breakeven loss (USD m)"]} rows={rows.map((r) => [r.label, <V key="s" c={r.saving} />, <V key="l" c={r.loss} />])} />}
    >
      <div className="mx-auto max-w-[30rem] md:hidden">
        <BreakevenSvg rows={rows} w={300} />
      </div>
      <div className="hidden max-w-3xl md:block">
        <BreakevenSvg rows={rows} w={680} />
      </div>
    </ChartFigure>
  );
}

export { V as WorkbookNumber };

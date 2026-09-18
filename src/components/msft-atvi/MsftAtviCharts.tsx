// Chart primitives for the Microsoft x Activision project page, matching
// the visual language established for Nike and Arm — same palette, tight
// non-zero-based axes on line charts (except where zero itself is the
// point), point markers, real period labels. Written locally rather than
// imported from the Nike/Arm chart files, for the same reason those give
// for not importing from each other: private components for a different
// page, and an accretion/dilution analysis needs chart types (a genuinely
// additive EPS waterfall, a synergy heatmap with a crossing line) neither
// of the other two pages used.

const CHART_WIDTH = 640;
const CHART_HEIGHT = 280;
const PAD_LEFT = 64;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 32;

function periodX(index: number, count: number) {
  const innerWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  return count <= 1 ? PAD_LEFT : PAD_LEFT + (index / (count - 1)) * innerWidth;
}

function valueY(value: number, minValue: number, maxValue: number) {
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const range = maxValue - minValue;
  const ratio = range === 0 ? 0 : (value - minValue) / range;
  return PAD_TOP + innerHeight * (1 - ratio);
}

export function formatUsdM(valueInMillions: number): string {
  const abs = Math.abs(valueInMillions);
  const sign = valueInMillions < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
  return `${sign}$${abs.toFixed(0)}M`;
}

export function formatPercent(fraction: number, digits = 2): string {
  return `${fraction >= 0 ? "+" : ""}${(fraction * 100).toFixed(digits)}%`;
}

const BRIDGE_WIDTH = 640;
const BRIDGE_HEIGHT = 260;
const BRIDGE_PAD_LEFT = 60;
const BRIDGE_PAD_RIGHT = 16;
const BRIDGE_PAD_TOP = 24;
const BRIDGE_PAD_BOTTOM = 56;

type BridgeStep = {
  label: string;
  sublabel: string;
  value: number; // dollar delta in $mm; anchors carry the running total
  kind: "anchor" | "add" | "subtract";
};

/**
 * EPS bridge waterfall — Microsoft standalone net income to pro forma net
 * income, in $mm (the unit every driver is actually denominated in), with
 * each anchor bar also labeled with its per-share equivalent. Genuinely
 * additive (unlike Arm's return decomposition), so the classic
 * anchor/add/subtract waterfall pattern from Nike's margin bridge applies
 * directly.
 */
export function EpsBridgeWaterfall({ steps }: { steps: BridgeStep[] }) {
  const levels = steps.reduce<number[]>((acc, step) => {
    const prev = acc.length === 0 ? 0 : acc[acc.length - 1];
    const level = step.kind === "anchor" ? step.value : prev + step.value;
    return [...acc, level];
  }, []);

  // Tight, non-zero-based axis: the two anchors sit around $70B while the
  // drivers are worth $1.5-2.5B each — a real zero baseline would flatten
  // every driver bar to an invisible sliver, the same problem the Nike
  // margin bridge had with percentage-point deltas against a ~43% anchor.
  const rawMax = Math.max(...levels);
  const rawMin = Math.min(...levels);
  const pad = (rawMax - rawMin) * 0.25 || Math.abs(rawMax) * 0.05 || 1;
  const maxValue = rawMax + pad;
  const minValue = rawMin - pad;

  const positioned = steps.map((step, i) => {
    const level = levels[i];
    if (step.kind === "anchor") return { ...step, from: minValue, to: level };
    const prevLevel = i === 0 ? 0 : levels[i - 1];
    return { ...step, from: Math.min(prevLevel, level), to: Math.max(prevLevel, level) };
  });

  const innerWidth = BRIDGE_WIDTH - BRIDGE_PAD_LEFT - BRIDGE_PAD_RIGHT;
  const innerHeight = BRIDGE_HEIGHT - BRIDGE_PAD_TOP - BRIDGE_PAD_BOTTOM;
  const colWidth = innerWidth / steps.length;
  const barWidth = colWidth * 0.62;
  const y = (v: number) => BRIDGE_PAD_TOP + innerHeight * (1 - (v - minValue) / (maxValue - minValue || 1));
  const fillFor = (kind: BridgeStep["kind"]) => (kind === "anchor" ? "#2a2820" : kind === "add" ? "#1e3a2b" : "#a1462f");

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${BRIDGE_WIDTH} ${BRIDGE_HEIGHT}`} className="w-full" role="img" aria-label="EPS bridge: Microsoft standalone net income $72,361M, plus Activision net income $1,513M, minus foregone after-tax interest $2,002.85M, minus after-tax PPA amortization $2,488.67M, equals pro forma net income $69,382.48M">
        {positioned.map((step, i) => {
          const x = BRIDGE_PAD_LEFT + colWidth * i + (colWidth - barWidth) / 2;
          const yTop = y(step.to);
          const yBottom = y(step.from);
          const height = Math.max(1.5, yBottom - yTop);
          const valueLabel = step.kind === "anchor" ? formatUsdM(step.value) : `${step.value > 0 ? "+" : ""}${formatUsdM(step.value)}`;
          return (
            <g key={step.label}>
              <rect x={x} y={yTop} width={barWidth} height={height} fill={fillFor(step.kind)} rx={2} />
              <text x={x + barWidth / 2} y={yTop - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#2a2820">
                {valueLabel}
              </text>
              <text x={x + barWidth / 2} y={BRIDGE_HEIGHT - BRIDGE_PAD_BOTTOM + 16} textAnchor="middle" className="fill-charcoal-soft text-[9px]">
                {step.label}
              </text>
              <text x={x + barWidth / 2} y={BRIDGE_HEIGHT - BRIDGE_PAD_BOTTOM + 28} textAnchor="middle" className="fill-charcoal-soft text-[9px]">
                {step.sublabel}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-charcoal" /> Starting / Ending
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-forest" /> Adds income
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-rust" /> Reduces income
        </span>
      </div>
    </div>
  );
}

function gridAndAxes(values: number[], includeZero: boolean) {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const rawMin = includeZero ? Math.min(0, dataMin) : dataMin;
  const rawMax = includeZero ? Math.max(0, dataMax) : dataMax;
  const pad = (rawMax - rawMin) * 0.15 || Math.abs(rawMax) * 0.15 || 1;
  const minValue = rawMin - pad;
  const maxValue = rawMax + pad;
  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  return { minValue, maxValue, gridValues: gridFracs.map((f) => minValue + (maxValue - minValue) * f), showZeroLine: minValue < 0 && maxValue > 0 };
}

/**
 * Five-year EPS accretion path — a single line forced to include zero in
 * its axis range (the Year 3 -> Year 4 sign flip is the whole point), with
 * a visible dashed zero line.
 */
export function EpsPathChart({ labels, values }: { labels: string[]; values: number[] }) {
  const { minValue, maxValue, gridValues, showZeroLine } = gridAndAxes(values, true);
  const count = labels.length;

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label="Five-year EPS accretion/dilution path: -3.10%, -1.42%, -0.39%, +0.24%, +2.33%">
        {gridValues.map((v, i) => (
          <line key={i} x1={PAD_LEFT} x2={CHART_WIDTH - PAD_RIGHT} y1={valueY(v, minValue, maxValue)} y2={valueY(v, minValue, maxValue)} stroke="#1e3a2b" strokeOpacity={0.08} />
        ))}
        {showZeroLine && (
          <line x1={PAD_LEFT} x2={CHART_WIDTH - PAD_RIGHT} y1={valueY(0, minValue, maxValue)} y2={valueY(0, minValue, maxValue)} stroke="#2a2820" strokeOpacity={0.4} strokeDasharray="3 3" />
        )}
        {[gridValues[0], gridValues[2], gridValues[4]].map((v, i) => (
          <text key={i} x={PAD_LEFT - 8} y={valueY(v, minValue, maxValue) + 4} textAnchor="end" className="fill-charcoal-soft text-[10px]">
            {formatPercent(v, 1)}
          </text>
        ))}
        {labels.map((label, i) => (
          <text key={label} x={periodX(i, count)} y={CHART_HEIGHT - PAD_BOTTOM + 18} textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"} className="fill-charcoal-soft text-[10px]">
            {label}
          </text>
        ))}
        <polyline
          points={values.map((v, i) => `${periodX(i, count)},${valueY(v, minValue, maxValue)}`).join(" ")}
          fill="none"
          stroke="#1e3a2b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => {
          const y = valueY(v, minValue, maxValue);
          const color = v >= 0 ? "#1e3a2b" : "#a1462f";
          return (
            <g key={i}>
              <circle cx={periodX(i, count)} cy={y} r={3.5} fill={color} />
              <text x={periodX(i, count)} y={y - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill={color} stroke="#f5f1e6" strokeWidth={4} paintOrder="stroke">
                {formatPercent(v, 2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const BAR_WIDTH = 640;
const BAR_HEIGHT = 240;
const BAR_PAD_LEFT = 56;
const BAR_PAD_RIGHT = 16;
const BAR_PAD_TOP = 24;
const BAR_PAD_BOTTOM = 36;

/**
 * Amortization step-down — a simple zero-based year-by-year bar chart
 * (an expense magnitude, not a ratio or trend, so a zero baseline is the
 * correct and honest choice here, same reasoning as Arm's return bars).
 */
export function AmortizationBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const maxValue = Math.max(...values) * 1.15;
  const innerWidth = BAR_WIDTH - BAR_PAD_LEFT - BAR_PAD_RIGHT;
  const innerHeight = BAR_HEIGHT - BAR_PAD_TOP - BAR_PAD_BOTTOM;
  const colWidth = innerWidth / values.length;
  const barWidth = colWidth * 0.55;
  const y = (v: number) => BAR_PAD_TOP + innerHeight * (1 - v / maxValue);

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`} className="w-full" role="img" aria-label="Total purchase-accounting amortization by year: $3,071.6M in years 1-4, then $484.1M in year 5">
        <line x1={BAR_PAD_LEFT} x2={BAR_WIDTH - BAR_PAD_RIGHT} y1={y(0)} y2={y(0)} stroke="#2a2820" strokeOpacity={0.2} />
        {values.map((v, i) => {
          const x = BAR_PAD_LEFT + colWidth * i + (colWidth - barWidth) / 2;
          const yTop = y(v);
          const height = y(0) - yTop;
          const isStepDown = i === values.length - 1;
          return (
            <g key={labels[i]}>
              <rect x={x} y={yTop} width={barWidth} height={height} fill={isStepDown ? "#96703e" : "#1e3a2b"} rx={3} />
              <text x={x + barWidth / 2} y={yTop - 8} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-charcoal">
                {formatUsdM(v)}
              </text>
              <text x={x + barWidth / 2} y={BAR_HEIGHT - BAR_PAD_BOTTOM + 18} textAnchor="middle" className="fill-charcoal-soft text-[10px]">
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Synergy breakeven heatmap with an overlaid crossing line showing exactly
 * where the grid flips from dilutive to accretive at each foregone-cash
 * yield — the point of this chart, per the brief.
 */
export function SynergyHeatmap({
  synergyRows,
  yieldCols,
  grid,
  baseRow,
  baseCol,
  breakevenByYield,
}: {
  synergyRows: number[];
  yieldCols: number[];
  grid: number[][];
  baseRow: number;
  baseCol: number;
  breakevenByYield: number[];
}) {
  const flat = grid.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const colorFor = (v: number) => (v < 0 ? "#a1462f" : "#1e3a2b");
  const opacityFor = (v: number) => 0.1 + 0.45 * (Math.abs(v) / Math.max(Math.abs(min), Math.abs(max)));

  // Crossing-line x/y positions, in "grid units" (row index fractional,
  // column index) — one point per yield column, linearly interpolated
  // between the two synergy rows that bracket that column's breakeven
  // value from Synergy Breakeven!B15:F15.
  const crossingRowFrac = breakevenByYield.map((be) => {
    const rowSpan = synergyRows[1] - synergyRows[0];
    const idx = (be - synergyRows[0]) / rowSpan;
    return idx;
  });

  const cellW = 100;
  const cellH = 34;
  const labelColW = 70;
  const headerH = 24;
  const svgW = labelColW + yieldCols.length * cellW;
  const svgH = headerH + synergyRows.length * cellH + 20;

  const cellCenterX = (c: number) => labelColW + c * cellW + cellW / 2;
  const cellCenterY = (rowFrac: number) => headerH + rowFrac * cellH + cellH / 2;

  return (
    <div className="mt-2 overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" role="img" aria-label="Synergy breakeven sensitivity grid: EPS accretion/dilution by annual synergies and foregone cash yield, with base case at $0 synergies and 4.0% yield">
        {yieldCols.map((g, c) => (
          <text key={c} x={cellCenterX(c)} y={16} textAnchor="middle" fontSize={10} fontWeight={700} className={c === baseCol ? "fill-brass" : "fill-charcoal-soft"}>
            {(g * 100).toFixed(0)}%
          </text>
        ))}
        {synergyRows.map((s, r) => (
          <text key={r} x={labelColW - 8} y={headerH + r * cellH + cellH / 2 + 4} textAnchor="end" fontSize={10} fontWeight={700} className={r === baseRow ? "fill-brass" : "fill-charcoal-soft"}>
            ${(s / 1000).toFixed(0)}B
          </text>
        ))}
        {synergyRows.map((s, r) =>
          yieldCols.map((g, c) => {
            const v = grid[r][c];
            const isBase = r === baseRow && c === baseCol;
            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={labelColW + c * cellW + 2}
                  y={headerH + r * cellH + 2}
                  width={cellW - 4}
                  height={cellH - 4}
                  fill={colorFor(v)}
                  fillOpacity={opacityFor(v)}
                  stroke={isBase ? "#96703e" : "none"}
                  strokeWidth={isBase ? 2 : 0}
                  rx={3}
                />
                <text x={cellCenterX(c)} y={headerH + r * cellH + cellH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} className="fill-charcoal">
                  {formatPercent(v, 1)}
                </text>
              </g>
            );
          })
        )}
        <polyline
          points={crossingRowFrac.map((rf, c) => `${cellCenterX(c)},${cellCenterY(rf)}`).join(" ")}
          fill="none"
          stroke="#2a2820"
          strokeWidth={2}
          strokeDasharray="5 3"
        />
      </svg>
      <p className="mt-2 text-[10px] text-charcoal-soft">
        Rows: annual pre-tax synergies. Columns: foregone cash yield. Brass outline: base case ($0 synergies, 4.0% yield). Dashed line: where the grid crosses from dilutive (rust) to accretive (forest).
      </p>
    </div>
  );
}

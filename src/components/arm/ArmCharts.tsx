// Chart primitives for the Arm project page, matching the visual language
// established for Nike (src/components/nike/NikeCharts.tsx) — same
// palette, tight non-zero-based axes on line charts, point markers, real
// period labels. Written locally rather than imported from the Nike chart
// file, for the same reason that file gives for not importing from
// FpaDecisionLab: these are a different page's private components, and a
// valuation project needs chart types (a football field, a heatmap) a
// forecast page never did.

const LINE_CHART_WIDTH = 640;
const LINE_CHART_HEIGHT = 280;
const PAD_LEFT = 64;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 32;

function periodX(index: number, count: number) {
  const innerWidth = LINE_CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  return count <= 1 ? PAD_LEFT : PAD_LEFT + (index / (count - 1)) * innerWidth;
}

function valueY(value: number, minValue: number, maxValue: number) {
  const innerHeight = LINE_CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const range = maxValue - minValue;
  const ratio = range === 0 ? 0 : (value - minValue) / range;
  return PAD_TOP + innerHeight * (1 - ratio);
}

function gridAndAxes(values: number[]) {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const pad = (dataMax - dataMin) * 0.15 || Math.abs(dataMax) * 0.15 || 1;
  const minValue = dataMin - pad;
  const maxValue = dataMax + pad;
  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  return { minValue, maxValue, gridValues: gridFracs.map((f) => minValue + (maxValue - minValue) * f) };
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatUsdCompact(value: number): string {
  return `$${(value / 1000).toFixed(1)}B`;
}

type Series = { key: string; label: string; stroke: string; dash?: string; swatchClass: string; values: number[] };

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className={`h-2.5 w-2.5 rounded-full ${s.swatchClass}`} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Two-series line chart (revenue mix). Same tight non-zero-based axis,
 * point-marker, real-period-label convention as the Nike page's charts.
 */
export function TwoLineChart({
  periods,
  series,
  ariaLabel,
  valueFormatter,
}: {
  periods: string[];
  series: Series[];
  ariaLabel: string;
  valueFormatter: (value: number) => string;
}) {
  const all = series.flatMap((s) => s.values);
  const { minValue, maxValue, gridValues } = gridAndAxes(all);
  const count = periods.length;

  const endLabelY = (() => {
    const raw = series
      .map((s) => ({ key: s.key, y: valueY(s.values[s.values.length - 1], minValue, maxValue) }))
      .sort((a, b) => a.y - b.y);
    const minGap = 12;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y - raw[i - 1].y < minGap) raw[i].y = raw[i - 1].y + minGap;
    }
    return Object.fromEntries(raw.map((r) => [r.key, r.y])) as Record<string, number>;
  })();

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
        {gridValues.map((v, i) => (
          <line key={i} x1={PAD_LEFT} x2={LINE_CHART_WIDTH - PAD_RIGHT} y1={valueY(v, minValue, maxValue)} y2={valueY(v, minValue, maxValue)} stroke="#1e3a2b" strokeOpacity={0.08} />
        ))}
        {[gridValues[0], gridValues[2], gridValues[4]].map((v, i) => (
          <text key={i} x={PAD_LEFT - 8} y={valueY(v, minValue, maxValue) + 4} textAnchor="end" className="fill-charcoal-soft text-[10px]">
            {valueFormatter(v)}
          </text>
        ))}
        {periods.map((label, i) => (
          <text key={label} x={periodX(i, count)} y={LINE_CHART_HEIGHT - PAD_BOTTOM + 18} textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"} className="fill-charcoal-soft text-[10px]">
            {label}
          </text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.key}
            points={s.values.map((v, i) => `${periodX(i, count)},${valueY(v, minValue, maxValue)}`).join(" ")}
            fill="none"
            stroke={s.stroke}
            strokeWidth={2}
            strokeDasharray={s.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => <circle key={`${s.key}-${i}`} cx={periodX(i, count)} cy={valueY(v, minValue, maxValue)} r={2.5} fill={s.stroke} />)
        )}
        {series.map((s) => (
          <text key={s.key} x={LINE_CHART_WIDTH - PAD_RIGHT - 4} y={endLabelY[s.key] - 6} textAnchor="end" fontSize={10} fontWeight={700} fill={s.stroke} stroke="#f5f1e6" strokeWidth={4} paintOrder="stroke">
            {s.label}
          </text>
        ))}
      </svg>
      <Legend series={series} />
    </div>
  );
}

/**
 * Single-series categorical line chart for the post-IPO price path — four
 * named milestones rather than evenly-spaced fiscal periods, each point
 * labeled with its own dollar value since there are only four.
 */
export function MilestoneChart({
  points,
  ariaLabel,
}: {
  points: { label: string; price: number }[];
  ariaLabel: string;
}) {
  const values = points.map((p) => p.price);
  const { minValue, maxValue, gridValues } = gridAndAxes(values);
  const count = points.length;

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
        {gridValues.map((v, i) => (
          <line key={i} x1={PAD_LEFT} x2={LINE_CHART_WIDTH - PAD_RIGHT} y1={valueY(v, minValue, maxValue)} y2={valueY(v, minValue, maxValue)} stroke="#1e3a2b" strokeOpacity={0.08} />
        ))}
        {[gridValues[0], gridValues[2], gridValues[4]].map((v, i) => (
          <text key={i} x={PAD_LEFT - 8} y={valueY(v, minValue, maxValue) + 4} textAnchor="end" className="fill-charcoal-soft text-[10px]">
            {formatUsd(v)}
          </text>
        ))}
        {points.map((p, i) => (
          <text key={p.label} x={periodX(i, count)} y={LINE_CHART_HEIGHT - PAD_BOTTOM + 18} textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"} className="fill-charcoal-soft text-[10px]">
            {p.label}
          </text>
        ))}
        <polyline
          points={points.map((p, i) => `${periodX(i, count)},${valueY(p.price, minValue, maxValue)}`).join(" ")}
          fill="none"
          stroke="#1e3a2b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const y = valueY(p.price, minValue, maxValue);
          return (
            <g key={p.label}>
              <circle cx={periodX(i, count)} cy={y} r={3.5} fill="#96703e" />
              <text x={periodX(i, count)} y={y - 10} textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"} fontSize={11} fontWeight={700} fill="#2a2820" stroke="#f5f1e6" strokeWidth={4} paintOrder="stroke">
                {formatUsd(p.price)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const FIELD_WIDTH = 640;
const FIELD_LABEL_WIDTH = 168;
const FIELD_ROW_HEIGHT = 32;
const FIELD_ROW_GAP = 12;
const FIELD_PAD_RIGHT = 90;

/**
 * The headline "valuation football field": horizontal bars for every
 * fundamentals-based method, all sharing one tight axis so the cluster
 * between ~$35 and ~$52 stays readable, plus a final row for the current
 * market price. That row is deliberately NOT drawn to the same linear
 * scale (a bar 5x as long as the others would blow out the chart and a log
 * axis would flatten the cluster this chart exists to show) — it's drawn
 * as a broken/truncated bar spanning the full plot width with a visible
 * break mark, so the reader sees both the tightness of the fundamentals
 * cluster and an explicit, honestly-labeled signal that the market sits
 * far outside it, without silently understating the gap.
 */
export function FootballFieldChart({
  items,
  marketPrice,
  ariaLabel,
}: {
  items: { label: string; multiple: string; price: number }[];
  marketPrice: number;
  ariaLabel: string;
}) {
  const axisMax = Math.ceil((Math.max(...items.map((i) => i.price)) * 1.15) / 5) * 5;
  const plotWidth = FIELD_WIDTH - FIELD_LABEL_WIDTH - FIELD_PAD_RIGHT;
  const barX = FIELD_LABEL_WIDTH;
  const rows = items.length + 1;
  const height = rows * (FIELD_ROW_HEIGHT + FIELD_ROW_GAP) + 30;
  const rowY = (i: number) => 20 + i * (FIELD_ROW_HEIGHT + FIELD_ROW_GAP);

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${height}`} className="w-full" role="img" aria-label={ariaLabel}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const x = barX + f * plotWidth;
          return <line key={f} x1={x} x2={x} y1={12} y2={height - 24} stroke="#1e3a2b" strokeOpacity={0.08} />;
        })}
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={barX + f * plotWidth} y={height - 8} textAnchor="middle" className="fill-charcoal-soft text-[10px]">
            {formatUsd(f * axisMax)}
          </text>
        ))}
        {items.map((item, i) => {
          const w = (item.price / axisMax) * plotWidth;
          const y = rowY(i);
          return (
            <g key={item.label}>
              <text x={barX - 10} y={y + FIELD_ROW_HEIGHT / 2 + 4} textAnchor="end" fontSize={11} fontWeight={600} className="fill-charcoal">
                {item.label}
              </text>
              <rect x={barX} y={y} width={Math.max(w, 2)} height={FIELD_ROW_HEIGHT} fill="#1e3a2b" fillOpacity={item.label === "Actual IPO" || item.label === "DCF Implied (2026)" ? 1 : 0.55} rx={3} />
              <text x={barX + w + 8} y={y + FIELD_ROW_HEIGHT / 2 + 4} fontSize={11} fontWeight={700} className="fill-charcoal">
                {formatUsd(item.price)}
              </text>
            </g>
          );
        })}
        {(() => {
          const i = items.length;
          const y = rowY(i);
          const breakX = plotWidth * 0.86;
          return (
            <g>
              <text x={barX - 10} y={y + FIELD_ROW_HEIGHT / 2 + 4} textAnchor="end" fontSize={11} fontWeight={600} className="fill-charcoal">
                Current Market Price
              </text>
              <rect x={barX} y={y} width={plotWidth} height={FIELD_ROW_HEIGHT} fill="#a1462f" rx={3} />
              {[breakX - 6, breakX + 6].map((bx, k) => (
                <polygon key={k} points={`${barX + bx - 5},${y} ${barX + bx + 5},${y} ${barX + bx - 5},${y + FIELD_ROW_HEIGHT} ${barX + bx + 5 - 10},${y + FIELD_ROW_HEIGHT}`} fill="#f5f1e6" />
              ))}
              <text x={barX + plotWidth + 8} y={y + FIELD_ROW_HEIGHT / 2 + 4} fontSize={11} fontWeight={700} className="fill-rust">
                {formatUsd(marketPrice)}
              </text>
            </g>
          );
        })()}
      </svg>
      <p className="mt-1 text-center text-[10px] text-charcoal-soft">
        The break marks the point where the market-price bar leaves this chart&apos;s scale — it is not drawn proportionally.
      </p>
    </div>
  );
}

const DECOMP_WIDTH = 640;
const DECOMP_HEIGHT = 260;
const DECOMP_PAD_LEFT = 56;
const DECOMP_PAD_RIGHT = 110;
const DECOMP_PAD_TOP = 30;
const DECOMP_PAD_BOTTOM = 40;

/**
 * Return decomposition as three plain, zero-based bars — deliberately NOT
 * a waterfall, since 5.34x = 1.67x x 3.20x is multiplicative, not additive,
 * and summing the two factor bars would land on 4.87, not the total. A bar
 * chart of multiples needs a zero baseline (unlike the tight-axis line
 * charts elsewhere on this page) because bar height standing for a ratio
 * only reads correctly against zero.
 */
export function ReturnDecompositionChart({
  totalReturn,
  epsGrowth,
  peExpansion,
  evRevenueCheck,
}: {
  totalReturn: number;
  epsGrowth: number;
  peExpansion: number;
  evRevenueCheck: number;
}) {
  const bars = [
    { label: "Total Return", value: totalReturn, fill: "#2a2820" },
    { label: "From EPS Growth", value: epsGrowth, fill: "#1e3a2b" },
    { label: "From P/E Expansion", value: peExpansion, fill: "#96703e" },
  ];
  const maxValue = Math.max(...bars.map((b) => b.value)) * 1.15;
  const innerWidth = DECOMP_WIDTH - DECOMP_PAD_LEFT - DECOMP_PAD_RIGHT;
  const innerHeight = DECOMP_HEIGHT - DECOMP_PAD_TOP - DECOMP_PAD_BOTTOM;
  const colWidth = innerWidth / bars.length;
  const barWidth = colWidth * 0.5;
  const y = (v: number) => DECOMP_PAD_TOP + innerHeight * (1 - v / maxValue);
  const checkY = y(evRevenueCheck);

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${DECOMP_WIDTH} ${DECOMP_HEIGHT}`} className="w-full" role="img" aria-label={`Return decomposition: total return ${totalReturn.toFixed(2)}x equals ${epsGrowth.toFixed(2)}x from EPS growth times ${peExpansion.toFixed(2)}x from P/E expansion; independently, EV/Revenue expanded ${evRevenueCheck.toFixed(2)}x`}>
        <line x1={DECOMP_PAD_LEFT} x2={DECOMP_WIDTH - DECOMP_PAD_RIGHT} y1={y(0)} y2={y(0)} stroke="#2a2820" strokeOpacity={0.2} />
        {bars.map((b, i) => {
          const x = DECOMP_PAD_LEFT + colWidth * i + (colWidth - barWidth) / 2;
          const yTop = y(b.value);
          const height = y(0) - yTop;
          return (
            <g key={b.label}>
              <rect x={x} y={yTop} width={barWidth} height={height} fill={b.fill} rx={3} />
              <text x={x + barWidth / 2} y={yTop - 8} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-charcoal">
                {b.value.toFixed(2)}x
              </text>
              <text x={x + barWidth / 2} y={DECOMP_HEIGHT - DECOMP_PAD_BOTTOM + 20} textAnchor="middle" className="fill-charcoal-soft text-[10px]">
                {b.label}
              </text>
            </g>
          );
        })}
        {/* EV/Revenue corroboration marker on the P/E Expansion bar */}
        <line x1={DECOMP_PAD_LEFT + colWidth * 2 + (colWidth - barWidth) / 2 - 6} x2={DECOMP_PAD_LEFT + colWidth * 2 + (colWidth - barWidth) / 2 + barWidth + 6} y1={checkY} y2={checkY} stroke="#a1462f" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={DECOMP_PAD_LEFT + colWidth * 2 + (colWidth - barWidth) / 2 + barWidth + 10} y={checkY + 4} fontSize={9} fontWeight={700} className="fill-rust">
          EV/Rev check: {evRevenueCheck.toFixed(2)}x
        </text>
      </svg>
    </div>
  );
}

/**
 * DCF sensitivity grid rendered as a shaded table rather than SVG — a
 * heatmap reads more naturally as cells than paths, and this keeps the
 * live-WACC row and highlighted terminal-growth column trivial to mark.
 * Shading stays within the site's own forest token (no new hues); the
 * highlighted cell gets a brass ring instead of a color change.
 */
export function DCFHeatmap({
  waccRows,
  growthCols,
  grid,
  liveRow,
  liveCol,
}: {
  waccRows: number[];
  growthCols: number[];
  grid: number[][];
  liveRow: number;
  liveCol: number;
}) {
  const flat = grid.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const opacityFor = (v: number) => 0.08 + 0.42 * ((v - min) / (max - min || 1));

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[480px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-[10px] font-semibold uppercase tracking-wide text-charcoal-soft">WACC \ g</th>
            {growthCols.map((g, i) => (
              <th key={g} className={`p-1 text-[10px] font-semibold uppercase tracking-wide ${i === liveCol ? "text-brass" : "text-charcoal-soft"}`}>
                {(g * 100).toFixed(1)}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {waccRows.map((w, r) => (
            <tr key={w}>
              <td className={`p-1 text-[10px] font-semibold ${r === liveRow ? "text-brass" : "text-charcoal-soft"}`}>{(w * 100).toFixed(2)}%</td>
              {grid[r].map((v, c) => {
                const isLive = r === liveRow && c === liveCol;
                return (
                  <td
                    key={c}
                    className={`rounded-md p-2 font-semibold text-charcoal ${isLive ? "ring-2 ring-brass" : ""}`}
                    style={{ backgroundColor: `rgba(30,58,43,${opacityFor(v)})` }}
                  >
                    {formatUsd(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-charcoal-soft">
        Rows: WACC. Columns: terminal growth rate. Highlighted cell: the model&apos;s live-computed WACC (9.82%) and its 3.5% terminal growth assumption.
      </p>
    </div>
  );
}

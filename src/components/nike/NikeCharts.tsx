// Chart primitives for the Nike project page, deliberately matching
// FpaDecisionLab.tsx's visual language (palette, tight non-zero-based axes,
// point markers, real period labels) so the two case-study pages read as
// part of the same site. Rewritten locally rather than imported because
// FpaDecisionLab's chart functions are private to that file and shaped
// around its month-index model output — these operate on plain labeled
// period arrays instead.

const CHART_WIDTH = 640;
const CHART_HEIGHT = 300;
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

export function formatNikeBillions(valueInMillions: number): string {
  const abs = Math.abs(valueInMillions);
  const sign = valueInMillions < 0 ? "-" : "";
  return `${sign}$${(abs / 1000).toFixed(1)}B`;
}

export function formatNikeMillions(valueInMillions: number): string {
  const abs = Math.abs(valueInMillions);
  const sign = valueInMillions < 0 ? "-" : "";
  return `${sign}$${abs.toFixed(0)}M`;
}

export function formatNikePercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export type Series = {
  key: string;
  label: string;
  stroke: string;
  dash?: string;
  swatchClass: string;
  values: number[];
};

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

function gridAndAxes(
  values: number[],
  includeZero: boolean
): { minValue: number; maxValue: number; gridValues: number[]; showZeroLine: boolean } {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const rawMin = includeZero ? Math.min(0, dataMin) : dataMin;
  const rawMax = includeZero ? Math.max(0, dataMax) : dataMax;
  const pad = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.12 || 1;
  const minValue = rawMin - pad;
  const maxValue = rawMax + pad;
  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  const gridValues = gridFracs.map((f) => minValue + (maxValue - minValue) * f);
  return { minValue, maxValue, gridValues, showZeroLine: minValue < 0 && maxValue > 0 };
}

/**
 * Multi-series line chart over labeled fiscal periods (not months) — used
 * for the scenario fan, bear-case cash, and consensus comparison charts.
 * Every series always plots; `tintKey` gets a low-opacity area fill under
 * its line, the same "which case is this page's point" treatment
 * GenericForecastChart uses for the active scenario.
 */
export function MultiSeriesLineChart({
  periods,
  series,
  ariaLabel,
  valueFormatter,
  tintKey,
  includeZero = false,
}: {
  periods: string[];
  series: Series[];
  ariaLabel: string;
  valueFormatter: (value: number) => string;
  tintKey?: string;
  includeZero?: boolean;
}) {
  const all = series.flatMap((s) => s.values);
  const { minValue, maxValue, gridValues, showZeroLine } = gridAndAxes(all, includeZero);
  const bottomY = CHART_HEIGHT - PAD_BOTTOM;
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

  const tintSeries = tintKey ? series.find((s) => s.key === tintKey) : undefined;
  const tintAreaPoints = tintSeries
    ? [
        `${periodX(0, count)},${bottomY}`,
        ...tintSeries.values.map((v, i) => `${periodX(i, count)},${valueY(v, minValue, maxValue)}`),
        `${periodX(count - 1, count)},${bottomY}`,
      ].join(" ")
    : "";

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
        {gridValues.map((v, i) => (
          <line
            key={i}
            x1={PAD_LEFT}
            x2={CHART_WIDTH - PAD_RIGHT}
            y1={valueY(v, minValue, maxValue)}
            y2={valueY(v, minValue, maxValue)}
            stroke="#1e3a2b"
            strokeOpacity={0.08}
          />
        ))}
        {showZeroLine && (
          <line
            x1={PAD_LEFT}
            x2={CHART_WIDTH - PAD_RIGHT}
            y1={valueY(0, minValue, maxValue)}
            y2={valueY(0, minValue, maxValue)}
            stroke="#2a2820"
            strokeOpacity={0.35}
            strokeDasharray="3 3"
          />
        )}
        {[gridValues[0], gridValues[2], gridValues[4]].map((v, i) => (
          <text
            key={i}
            x={PAD_LEFT - 8}
            y={valueY(v, minValue, maxValue) + 4}
            textAnchor="end"
            className="fill-charcoal-soft text-[10px]"
          >
            {valueFormatter(v)}
          </text>
        ))}
        {periods.map((label, i) => (
          <text
            key={label}
            x={periodX(i, count)}
            y={CHART_HEIGHT - PAD_BOTTOM + 18}
            textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
            className="fill-charcoal-soft text-[10px]"
          >
            {label}
          </text>
        ))}
        {tintSeries && (
          <polygon points={tintAreaPoints} fill={tintSeries.stroke} fillOpacity={0.12} />
        )}
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
          s.values.map((v, i) => (
            <circle key={`${s.key}-${i}`} cx={periodX(i, count)} cy={valueY(v, minValue, maxValue)} r={2.5} fill={s.stroke} />
          ))
        )}
        {series.map((s) => (
          <text
            key={s.key}
            x={CHART_WIDTH - PAD_RIGHT - 4}
            y={endLabelY[s.key] - 6}
            textAnchor="end"
            fontSize={10}
            fontWeight={700}
            fill={s.stroke}
            stroke="#f5f1e6"
            strokeWidth={4}
            paintOrder="stroke"
          >
            {s.label}
          </text>
        ))}
      </svg>
      <Legend series={series} />
    </div>
  );
}

/**
 * The headline chart: North America vs. Greater China revenue, with a
 * marker at the FY2028E breakeven point this page's thesis is built around.
 */
export function SegmentTrajectoryChart({
  periods,
  northAmerica,
  greaterChina,
  markerIndex,
  markerLabel,
}: {
  periods: string[];
  northAmerica: number[];
  greaterChina: number[];
  markerIndex: number;
  markerLabel: string;
}) {
  const series: Series[] = [
    { key: "na", label: "North America", stroke: "#1e3a2b", swatchClass: "bg-forest", values: northAmerica },
    { key: "gc", label: "Greater China", stroke: "#a1462f", swatchClass: "bg-rust", values: greaterChina },
  ];
  const all = [...northAmerica, ...greaterChina];
  const { minValue, maxValue, gridValues } = gridAndAxes(all, false);
  const count = periods.length;
  const markerX = periodX(markerIndex, count);
  const markerY = valueY(northAmerica[markerIndex], minValue, maxValue);

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`North America vs Greater China revenue, ${periods[0]} through ${periods[periods.length - 1]}; ${markerLabel}`}
      >
        {gridValues.map((v, i) => (
          <line
            key={i}
            x1={PAD_LEFT}
            x2={CHART_WIDTH - PAD_RIGHT}
            y1={valueY(v, minValue, maxValue)}
            y2={valueY(v, minValue, maxValue)}
            stroke="#1e3a2b"
            strokeOpacity={0.08}
          />
        ))}
        {[gridValues[0], gridValues[2], gridValues[4]].map((v, i) => (
          <text
            key={i}
            x={PAD_LEFT - 8}
            y={valueY(v, minValue, maxValue) + 4}
            textAnchor="end"
            className="fill-charcoal-soft text-[10px]"
          >
            {formatNikeBillions(v)}
          </text>
        ))}
        {periods.map((label, i) => (
          <text
            key={label}
            x={periodX(i, count)}
            y={CHART_HEIGHT - PAD_BOTTOM + 18}
            textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
            className="fill-charcoal-soft text-[10px]"
          >
            {label}
          </text>
        ))}
        <line
          x1={markerX}
          x2={markerX}
          y1={PAD_TOP}
          y2={CHART_HEIGHT - PAD_BOTTOM}
          stroke="#96703e"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
        <text
          x={markerX}
          y={PAD_TOP + 10}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#96703e"
          stroke="#f5f1e6"
          strokeWidth={4}
          paintOrder="stroke"
        >
          {markerLabel}
        </text>
        {series.map((s) => (
          <polyline
            key={s.key}
            points={s.values.map((v, i) => `${periodX(i, count)},${valueY(v, minValue, maxValue)}`).join(" ")}
            fill="none"
            stroke={s.stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => (
            <circle key={`${s.key}-${i}`} cx={periodX(i, count)} cy={valueY(v, minValue, maxValue)} r={2.5} fill={s.stroke} />
          ))
        )}
        <circle cx={markerX} cy={markerY} r={4.5} fill="none" stroke="#96703e" strokeWidth={2} />
      </svg>
      <Legend series={series} />
    </div>
  );
}

const BRIDGE_WIDTH = 640;
const BRIDGE_HEIGHT = 220;
const BRIDGE_PAD_LEFT = 52;
const BRIDGE_PAD_RIGHT = 16;
const BRIDGE_PAD_TOP = 24;
const BRIDGE_PAD_BOTTOM = 40;

type MarginBridgeStep = {
  label: string;
  pct: number; // percentage-point units: 100 bps = 1.0
  bpsLabel: string;
  kind: "anchor" | "add" | "subtract";
};

/**
 * Gross margin waterfall, FY2026A -> FY2029E (Base case) — the same
 * anchor/add/subtract waterfall pattern as FpaDecisionLab's MrrBridgeChart,
 * adapted from dollar steps to basis-point steps.
 */
export function MarginBridgeWaterfall({ steps }: { steps: MarginBridgeStep[] }) {
  // Cumulative gross-margin level after each step, computed immutably (no
  // captured/reassigned outer variable) so a percentage-point bridge like
  // this one — where every delta is worth under 1% of the anchor values —
  // can share the same tight, non-zero-based axis convention as every
  // other chart on the page instead of collapsing to a sliver against 0.
  const levels = steps.reduce<number[]>((acc, step) => {
    const prev = acc.length === 0 ? 0 : acc[acc.length - 1];
    const level = step.kind === "anchor" ? step.pct : prev + step.pct;
    return [...acc, level];
  }, []);

  const rawMax = Math.max(...levels);
  const rawMin = Math.min(...levels);
  const pad = (rawMax - rawMin) * 0.25 || Math.abs(rawMax) * 0.05 || 1;
  const maxValue = rawMax + pad;
  const minValue = rawMin - pad;

  const positioned = steps.map((step, i) => {
    const level = levels[i];
    if (step.kind === "anchor") {
      return { ...step, from: minValue, to: level };
    }
    const prevLevel = i === 0 ? 0 : levels[i - 1];
    return { ...step, from: Math.min(prevLevel, level), to: Math.max(prevLevel, level) };
  });

  const innerWidth = BRIDGE_WIDTH - BRIDGE_PAD_LEFT - BRIDGE_PAD_RIGHT;
  const innerHeight = BRIDGE_HEIGHT - BRIDGE_PAD_TOP - BRIDGE_PAD_BOTTOM;
  const colWidth = innerWidth / steps.length;
  const barWidth = colWidth * 0.6;

  const y = (v: number) =>
    BRIDGE_PAD_TOP + innerHeight * (1 - (v - minValue) / (maxValue - minValue || 1));

  const fillFor = (kind: MarginBridgeStep["kind"]) =>
    kind === "anchor" ? "#2a2820" : kind === "add" ? "#1e3a2b" : "#a1462f";

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${BRIDGE_WIDTH} ${BRIDGE_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Gross margin bridge: starting 42.9%, tariff and sourcing pressure -40 bps, tariff mitigation +50 bps, inventory normalization +35 bps, mix +30 bps, other -5 bps, ending 43.6%`}
      >
        {positioned.map((step, i) => {
          const x = BRIDGE_PAD_LEFT + colWidth * i + (colWidth - barWidth) / 2;
          const yTop = y(step.to);
          const yBottom = y(step.from);
          const height = Math.max(1.5, yBottom - yTop);
          const valueLabel = step.bpsLabel;
          return (
            <g key={step.label}>
              <rect x={x} y={yTop} width={barWidth} height={height} fill={fillFor(step.kind)} rx={2} />
              <text x={x + barWidth / 2} y={yTop - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#2a2820">
                {valueLabel}
              </text>
              <foreignObject x={x - colWidth / 2 + barWidth / 2} y={BRIDGE_HEIGHT - BRIDGE_PAD_BOTTOM + 6} width={colWidth} height={34}>
                <div className="text-center text-[9px] leading-[10px] text-charcoal-soft">{step.label}</div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-charcoal" /> Starting / Ending
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-forest" /> Adds margin
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-rust" /> Removes margin
        </span>
      </div>
    </div>
  );
}

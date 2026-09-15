"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import {
  FIXED_HEADCOUNT,
  AVG_FULLY_LOADED_COST_PER_EMPLOYEE,
  FIXED_GA_MONTHLY,
  SAAS_BASE_DEFAULTS,
  SAAS_DRIVERS,
  applySaaSScenario,
  buildCfoCommentaryData,
  classifyArrTrend,
  classifyCash,
  classifyLtvToCac,
  classifyMargin,
  classifyNRR,
  classifyRunway,
  decideStance,
  explainDecision,
  northstarBaseline,
  runSaaSForecast,
  runSaaSSensitivityByMetric,
  type ArrTrend,
  type CashStatus,
  type Decision,
  type LtvCacStatus,
  type MarginStatus,
  type NRRStatus,
  type RunwayStatus,
  type SaaSAssumptions,
  type SaaSCompanyBaseline,
  type SaaSForecastResult,
  type SaaSMonthResult,
  type SensitivityMetric,
} from "@/lib/models/saas";
import { parseCompanyCsv, type CsvRow } from "@/lib/csvImport";
import { runMonteCarloSimulation, type MonteCarloResult } from "@/lib/monteCarlo";
import {
  CONSULTING_BASE_DEFAULTS,
  CONSULTING_DRIVERS,
  REFERENCE_CONVERSION,
  STANDARD_BILLABLE_HOURS_PER_MONTH,
  applyConsultingScenario,
  buildConsultingRiskAndAction,
  classifyConsultingCash,
  classifyUtilization,
  decideConsultingStance,
  explainConsultingDecision,
  meridianBaseline,
  runConsultingForecast,
  runConsultingSensitivityByMetric,
  type ConsultingAssumptions,
  type ConsultingForecastResult,
  type ConsultingSensitivityMetric,
} from "@/lib/models/consulting";
import {
  REAL_ESTATE_BASE_DEFAULTS,
  REAL_ESTATE_DRIVERS,
  applyRealEstateScenario,
  buildRealEstateRiskAndAction,
  classifyDebtCoverage,
  classifyOccupancy,
  classifyRealEstateCash,
  debtServiceCoverageRatio,
  decideRealEstateStance,
  explainRealEstateDecision,
  harborViewBaseline,
  runRealEstateForecast,
  runRealEstateSensitivityByMetric,
  type DebtCoverageStatus,
  type RealEstateAssumptions,
  type RealEstateForecastResult,
  type RealEstateSensitivityMetric,
} from "@/lib/models/realEstate";
import type { DriverConfig } from "@/lib/models/shared";
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSignedCompact } from "@/lib/format";

type Industry = "saas" | "consulting" | "realEstate";

const INDUSTRY_LABELS: Record<Industry, string> = {
  saas: "SaaS",
  consulting: "Consulting & Services",
  realEstate: "Real Estate",
};

// The scenario selector always has exactly these 3 options. Base is
// whatever the sliders currently say; Upside/Downside are Base plus each
// industry's own signed delta table (see the model layer). Structurally
// identical to each industry's own ScenarioKey export, so passing this type
// where an industry-specific one is expected type-checks without a cast.
type ScenarioKey = "base" | "upside" | "downside";
const SCENARIO_KEYS: ScenarioKey[] = ["base", "upside", "downside"];
const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  base: "Base",
  upside: "Upside",
  downside: "Downside",
};

// Sourced directly from SAAS_DRIVERS so a decoded share link or a loaded
// save is only ever applied if every field is a finite number inside its
// slider's own range — a malformed/tampered URL can't feed the engine
// something the UI itself could never produce.
const SAAS_ASSUMPTIONS_BOUNDS = new Map(SAAS_DRIVERS.map((d) => [d.key, [d.min, d.max] as const]));

function isValidAssumptions(value: unknown): value is SaaSAssumptions {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return SAAS_DRIVERS.every((driver) => {
    const v = record[driver.key];
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    const [min, max] = SAAS_ASSUMPTIONS_BOUNDS.get(driver.key)!;
    return v >= min && v <= max;
  });
}

function encodeAssumptions(a: SaaSAssumptions): string {
  return encodeURIComponent(btoa(JSON.stringify(a)));
}

function decodeAssumptions(raw: string): SaaSAssumptions | null {
  try {
    const parsed: unknown = JSON.parse(atob(raw));
    return isValidAssumptions(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

type SavedScenario = { name: string; assumptions: SaaSAssumptions; savedAt: number };

const SAVED_SCENARIOS_KEY = "fpa-decision-lab:saved-scenarios";

function loadSavedScenarios(): SavedScenario[] {
  try {
    const raw = window.localStorage.getItem(SAVED_SCENARIOS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SavedScenario =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as SavedScenario).name === "string" &&
        isValidAssumptions((s as SavedScenario).assumptions)
    );
  } catch {
    return [];
  }
}

const SENSITIVITY_TABS: { key: SensitivityMetric; label: string }[] = [
  { key: "ebitda", label: "EBITDA" },
  { key: "revenue", label: "Revenue" },
  { key: "cash", label: "Cash / Runway" },
  { key: "ltvToCac", label: "LTV/CAC" },
];

function formatSensitivityImpact(metric: SensitivityMetric, value: number): string {
  if (metric === "ltvToCac") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}x`;
  }
  return formatSignedCompact(value);
}

const SERIES_STYLE: Record<
  ScenarioKey,
  { label: string; stroke: string; dash?: string; swatchClass: string }
> = {
  base: { label: "Base", stroke: "#1e3a2b", swatchClass: "bg-forest" },
  upside: { label: "Upside", stroke: "#96703e", dash: "7 5", swatchClass: "bg-brass" },
  downside: { label: "Downside", stroke: "#a1462f", dash: "2 5", swatchClass: "bg-rust" },
};

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        <span>{label}</span>
        <span className="text-charcoal">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-forest/15 accent-forest sm:h-1.5"
      />
    </label>
  );
}

function AccordionSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-b border-forest/10 py-3 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
          {title}
          {badge}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 shrink-0 text-charcoal-soft transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

type BadgeTone = "good" | "neutral" | "bad";

const TONE_CLASS: Record<BadgeTone, string> = {
  good: "bg-forest/10 text-forest",
  neutral: "bg-brass/15 text-brass",
  bad: "bg-rust-pale text-rust",
};

const ARR_TONE: Record<ArrTrend, BadgeTone> = {
  Growing: "good",
  Flat: "neutral",
  Contracting: "bad",
};
const MARGIN_TONE: Record<MarginStatus, BadgeTone> = {
  Strong: "good",
  Profitable: "good",
  NearBreakeven: "neutral",
  ApproachingBreakeven: "neutral",
  MateriallyUnprofitable: "bad",
};
// Profitability-language badge text — kept short for the KPI card (the
// full explanation lives in the CFO Commentary / Key Risk prose).
const MARGIN_BADGE_LABEL: Record<MarginStatus, string> = {
  Strong: "Strong",
  Profitable: "Profitable",
  NearBreakeven: "Near Breakeven",
  ApproachingBreakeven: "Approaching Breakeven",
  MateriallyUnprofitable: "Materially Unprofitable",
};
const CASH_TONE: Record<CashStatus, BadgeTone> = {
  Strong: "good",
  Adequate: "neutral",
  Low: "bad",
  Depleted: "bad",
};
const RUNWAY_TONE: Record<RunwayStatus, BadgeTone> = {
  Safe: "good",
  "Self-funded": "good",
  Watch: "neutral",
  Critical: "bad",
};
const NRR_TONE: Record<NRRStatus, BadgeTone> = {
  Strong: "good",
  Healthy: "good",
  Watch: "neutral",
  Weak: "bad",
};
const LTV_CAC_TONE: Record<LtvCacStatus, BadgeTone> = {
  Healthy: "good",
  Watch: "neutral",
  Weak: "bad",
};
const DSCR_TONE: Record<DebtCoverageStatus, BadgeTone> = {
  Strong: "good",
  Healthy: "good",
  Watch: "neutral",
  Weak: "bad",
};
const REAL_ESTATE_DSCR_PHRASE: Record<DebtCoverageStatus, string> = {
  Strong: "a strong cushion well above typical lender covenants",
  Healthy: "a comfortable cushion above typical lender covenants",
  Watch: "a thin cushion above break-even coverage — worth watching, not yet a covenant-level concern",
  Weak: "below the coverage a lender would consider safe, meaning NOI barely covers (or doesn't cover) debt service",
};
const REAL_ESTATE_MARGIN_PHRASE: Record<MarginStatus, string> = {
  Strong: "a strong free cash flow position after debt service",
  Profitable: "a solidly positive free cash flow position after debt service",
  NearBreakeven: "only modestly positive free cash flow, just above breakeven",
  ApproachingBreakeven: "still free-cash-flow negative after debt service, though approaching breakeven",
  MateriallyUnprofitable: "materially free-cash-flow negative after debt service",
};

// Same runway thresholds as RUNWAY_TONE/classifyRunway, relabeled for the
// compact Cash Forecast callout per its own "Healthy / Watch / Critical"
// wording — no new thresholds introduced.
const RUNWAY_HEALTH_LABEL: Record<RunwayStatus, "Healthy" | "Watch" | "Critical"> = {
  Safe: "Healthy",
  "Self-funded": "Healthy",
  Watch: "Watch",
  Critical: "Critical",
};

function KpiCard({
  label,
  value,
  badge,
  tone,
}: {
  label: string;
  value: string;
  badge: string;
  tone: BadgeTone;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-forest/15 bg-white p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">
        {label}
      </span>
      <span className="text-2xl font-black tracking-tight text-charcoal">
        {value}
      </span>
      <span
        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[tone]}`}
      >
        {badge}
      </span>
    </div>
  );
}

// Generic formatter for any industry's driver value, based on the driver
// config's declared unit — used by DriverSlider below so a slider's display
// text is derived from the same config that defines its bounds, never
// hardcoded per driver.
function formatDriverValue(driver: DriverConfig<string>, rawValue: number): string {
  if (driver.unit === "percent") {
    const decimals = driver.step >= 0.01 ? 0 : driver.step >= 0.001 ? 1 : 2;
    return `${(rawValue * 100).toFixed(decimals)}%`;
  }
  if (driver.unit === "currency") {
    return driver.max >= 1_000_000 ? formatCurrencyCompact(rawValue) : formatCurrency(rawValue);
  }
  return Math.round(rawValue).toLocaleString();
}

function DriverSlider<K extends string>({
  driver,
  value,
  onChange,
}: {
  driver: DriverConfig<K>;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <SliderField
      label={driver.label}
      value={value}
      onChange={onChange}
      min={driver.min}
      max={driver.max}
      step={driver.step}
      display={formatDriverValue(driver, value)}
    />
  );
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 300;
const PAD_LEFT = 60;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 32;

function monthX(month: number) {
  const innerWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  return PAD_LEFT + ((month - 1) / 11) * innerWidth;
}

function valueY(value: number, minValue: number, maxValue: number) {
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const range = maxValue - minValue;
  const ratio = range === 0 ? 0 : (value - minValue) / range;
  return PAD_TOP + innerHeight * (1 - ratio);
}

type ChartMetric = "mrr" | "cash" | "nrr";

type ChartSeries = {
  key: string;
  label: string;
  stroke: string;
  dash?: string;
  swatchClass: string;
  months: SaaSMonthResult[];
};

function ForecastChart({
  seriesByScenario,
  metric,
  ariaLabel,
  zeroFloor = true,
  valueFormatter = formatCurrencyCompact,
}: {
  seriesByScenario: Record<ScenarioKey, SaaSForecastResult>;
  metric: ChartMetric;
  ariaLabel: string;
  // Dollar metrics (MRR, Cash) anchor the y-axis at $0 by default. A ratio
  // metric like NRR reads better auto-scaled to its own tight data range —
  // pass false to skip the zero floor.
  zeroFloor?: boolean;
  valueFormatter?: (value: number) => string;
}) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  // All three scenarios always render, regardless of which one is
  // currently selected to feed the KPI cards/badges/commentary — Base is
  // one of these three lines (whatever the sliders say), never a separate
  // "Current" overlay.
  const series: ChartSeries[] = useMemo(() => {
    return SCENARIO_KEYS.map((key) => ({
      key,
      months: seriesByScenario[key].months,
      ...SERIES_STYLE[key],
    }));
  }, [seriesByScenario]);

  const { minValue, maxValue } = useMemo(() => {
    const all = series.flatMap((s) => s.months.map((m) => m[metric]));
    if (zeroFloor) {
      const rawMin = Math.min(0, ...all);
      const rawMax = Math.max(...all);
      const pad = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.12 || 1;
      return {
        minValue: rawMin < 0 ? rawMin - pad : 0,
        maxValue: rawMax + pad,
      };
    }
    const rawMin = Math.min(...all);
    const rawMax = Math.max(...all);
    const pad = (rawMax - rawMin) * 0.15 || 0.01;
    return { minValue: rawMin - pad, maxValue: rawMax + pad };
  }, [series, metric, zeroFloor]);

  const showZeroLine = minValue < 0 && maxValue > 0;
  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  const gridValues = gridFracs.map((f) => minValue + (maxValue - minValue) * f);

  // Direct end-labels can collide when two series end at similar values —
  // nudge them apart vertically, closest-first, so text never overlaps.
  const endLabelY = useMemo(() => {
    const raw = series
      .map((s) => {
        const last = s.months[s.months.length - 1];
        return { key: s.key, y: valueY(last[metric], minValue, maxValue) };
      })
      .sort((a, b) => a.y - b.y);

    const minGap = 12;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y - raw[i - 1].y < minGap) {
        raw[i].y = raw[i - 1].y + minGap;
      }
    }
    return Object.fromEntries(raw.map((r) => [r.key, r.y])) as Record<string, number>;
  }, [series, metric, minValue, maxValue]);

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Gridlines */}
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

        {/* Zero baseline, only shown when the range actually crosses zero */}
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

        {/* Y axis labels */}
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

        {/* X axis month labels */}
        {[1, 3, 6, 9, 12].map((m) => (
          <text
            key={m}
            x={monthX(m)}
            y={CHART_HEIGHT - PAD_BOTTOM + 18}
            textAnchor="middle"
            className="fill-charcoal-soft text-[10px]"
          >
            M{m}
          </text>
        ))}

        {/* Lines */}
        {series.map((s) => {
          const points = s.months
            .map((m) => `${monthX(m.month)},${valueY(m[metric], minValue, maxValue)}`)
            .join(" ");
          return (
            <polyline
              key={s.key}
              points={points}
              fill="none"
              stroke={s.stroke}
              strokeWidth={2}
              strokeDasharray={s.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Direct end labels — a cream halo (paintOrder stroke) keeps the
            label legible where a line's own dashes pass close behind it. */}
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

        {/* Hover hit zones */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <rect
            key={month}
            x={monthX(month) - (CHART_WIDTH - PAD_LEFT - PAD_RIGHT) / 22}
            y={PAD_TOP}
            width={(CHART_WIDTH - PAD_LEFT - PAD_RIGHT) / 11}
            height={CHART_HEIGHT - PAD_TOP - PAD_BOTTOM}
            fill="transparent"
            onMouseEnter={() => setHoverMonth(month)}
            onMouseLeave={() => setHoverMonth(null)}
          />
        ))}

        {/* Crosshair + tooltip */}
        {hoverMonth && (
          <g pointerEvents="none">
            <line
              x1={monthX(hoverMonth)}
              x2={monthX(hoverMonth)}
              y1={PAD_TOP}
              y2={CHART_HEIGHT - PAD_BOTTOM}
              stroke="#2a2820"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
            {(() => {
              const boxWidth = 132;
              const boxHeight = 36 + series.length * 13;
              const rawX = monthX(hoverMonth) + 10;
              const x =
                rawX + boxWidth > CHART_WIDTH - PAD_RIGHT
                  ? monthX(hoverMonth) - boxWidth - 10
                  : rawX;
              const y = PAD_TOP + 4;
              return (
                <g transform={`translate(${x}, ${y})`}>
                  <rect
                    width={boxWidth}
                    height={boxHeight}
                    rx={8}
                    fill="#ffffff"
                    stroke="#1e3a2b"
                    strokeOpacity={0.2}
                  />
                  <text x={10} y={16} fontSize={10} fontWeight={700} fill="#2a2820">
                    Month {hoverMonth}
                  </text>
                  {series.map((s, i) => (
                    <text key={s.key} x={10} y={32 + i * 13} fontSize={10} fill={s.stroke}>
                      {s.label}: {valueFormatter(s.months[hoverMonth - 1][metric])}
                    </text>
                  ))}
                </g>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-charcoal-soft">
            <span className={`h-2.5 w-2.5 rounded-full ${s.swatchClass}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const BRIDGE_WIDTH = 640;
const BRIDGE_HEIGHT = 220;
const BRIDGE_PAD_LEFT = 52;
const BRIDGE_PAD_RIGHT = 16;
const BRIDGE_PAD_TOP = 24;
const BRIDGE_PAD_BOTTOM = 34;

type BridgeStep = {
  label: string;
  value: number; // signed: positive for New/Expansion, negative for Contraction/Churned
  kind: "anchor" | "add" | "subtract";
};

/**
 * Month-12 MRR bridge as a compact waterfall: two solid "anchor" bars
 * (Beginning, Ending) with floating bars in between showing exactly how one
 * becomes the other. Every value is read straight off the engine's month-12
 * SaaSMonthResult — no recomputation here.
 */
function MrrBridgeChart({ month }: { month: SaaSMonthResult }) {
  const steps: BridgeStep[] = [
    { label: "Beginning", value: month.beginningMRR, kind: "anchor" },
    { label: "New", value: month.newMRR, kind: "add" },
    { label: "Expansion", value: month.expansionMRR, kind: "add" },
    { label: "Contraction", value: -month.contractionMRR, kind: "subtract" },
    { label: "Churned", value: -month.churnedMRR, kind: "subtract" },
    { label: "Ending", value: month.mrr, kind: "anchor" },
  ];

  let running = 0;
  const positioned = steps.map((step) => {
    if (step.kind === "anchor") {
      running = step.value;
      return { ...step, from: 0, to: step.value };
    }
    const from = running;
    running = running + step.value;
    return { ...step, from: Math.min(from, running), to: Math.max(from, running) };
  });

  const maxValue = Math.max(...positioned.map((p) => p.to)) * 1.2;
  const innerWidth = BRIDGE_WIDTH - BRIDGE_PAD_LEFT - BRIDGE_PAD_RIGHT;
  const innerHeight = BRIDGE_HEIGHT - BRIDGE_PAD_TOP - BRIDGE_PAD_BOTTOM;
  const colWidth = innerWidth / steps.length;
  const barWidth = colWidth * 0.55;

  const y = (v: number) =>
    BRIDGE_PAD_TOP + innerHeight * (1 - (maxValue === 0 ? 0 : v / maxValue));

  const fillFor = (kind: BridgeStep["kind"]) =>
    kind === "anchor" ? "#2a2820" : kind === "add" ? "#1e3a2b" : "#a1462f";

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${BRIDGE_WIDTH} ${BRIDGE_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Month 12 MRR bridge: beginning ${formatCurrency(
          month.beginningMRR
        )}, plus new ${formatCurrency(month.newMRR)}, plus expansion ${formatCurrency(
          month.expansionMRR
        )}, minus contraction ${formatCurrency(
          month.contractionMRR
        )}, minus churned ${formatCurrency(month.churnedMRR)}, equals ending ${formatCurrency(
          month.mrr
        )}`}
      >
        <line
          x1={BRIDGE_PAD_LEFT}
          x2={BRIDGE_WIDTH - BRIDGE_PAD_RIGHT}
          y1={y(0)}
          y2={y(0)}
          stroke="#1e3a2b"
          strokeOpacity={0.15}
        />
        {positioned.map((step, i) => {
          const x = BRIDGE_PAD_LEFT + colWidth * i + (colWidth - barWidth) / 2;
          const yTop = y(step.to);
          const yBottom = y(step.from);
          const height = Math.max(1.5, yBottom - yTop);
          return (
            <g key={step.label}>
              <rect
                x={x}
                y={yTop}
                width={barWidth}
                height={height}
                fill={fillFor(step.kind)}
                rx={2}
              />
              <text
                x={x + barWidth / 2}
                y={yTop - 6}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="#2a2820"
              >
                {step.kind === "anchor"
                  ? formatCurrencyCompact(step.value)
                  : formatSignedCompact(step.kind === "subtract" ? -Math.abs(step.value) : step.value)}
              </text>
              <text
                x={x + barWidth / 2}
                y={BRIDGE_HEIGHT - BRIDGE_PAD_BOTTOM + 18}
                textAnchor="middle"
                className="fill-charcoal-soft text-[10px]"
              >
                {step.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-charcoal" /> Beginning / Ending
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-forest" /> Adds MRR
        </span>
        <span className="flex items-center gap-1.5 text-xs text-charcoal-soft">
          <span className="h-2.5 w-2.5 rounded-full bg-rust" /> Removes MRR
        </span>
      </div>
    </div>
  );
}

const DECISION_STYLE: Record<Decision, string> = {
  "Invest for growth": "bg-forest text-cream",
  "Run cautiously": "bg-brass-pale text-brass",
  "Preserve cash": "bg-rust-pale text-rust",
};

function runwayLabel(runwayMonths: number | null): string {
  return runwayMonths === null ? "Cash-flow positive" : `${runwayMonths.toFixed(1)} months`;
}

function runwayPhrase(runwayMonths: number | null): string {
  return runwayMonths === null
    ? "is cash-flow positive"
    : `has ${runwayMonths.toFixed(1)} months of runway`;
}

function ScenarioComparisonTable({
  scenarioResults,
  activeColumn,
}: {
  scenarioResults: Record<ScenarioKey, SaaSForecastResult>;
  activeColumn: ScenarioKey;
}) {
  const columns: { key: ScenarioKey; result: SaaSForecastResult }[] = [
    { key: "base", result: scenarioResults.base },
    { key: "upside", result: scenarioResults.upside },
    { key: "downside", result: scenarioResults.downside },
  ];

  const rows: { label: string; format: (r: SaaSForecastResult) => string }[] = [
    { label: "Ending ARR", format: (r) => formatCurrencyCompact(r.endingARR) },
    { label: "EBITDA Margin", format: (r) => formatPercent(r.endingEBITDAMargin) },
    { label: "Ending Cash", format: (r) => formatCurrencyCompact(r.endingCash) },
    { label: "Runway", format: (r) => runwayLabel(r.runwayMonths) },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-forest/15 bg-white">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-forest/10 text-xs uppercase tracking-wide text-charcoal-soft">
            <th className="px-4 py-3 font-semibold">Metric</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold ${
                  col.key === activeColumn ? "bg-forest/10 text-forest" : ""
                }`}
              >
                {SCENARIO_LABELS[col.key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-forest/5 last:border-0">
              <td className="px-4 py-3 font-semibold text-charcoal">{row.label}</td>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-charcoal-soft ${
                    col.key === activeColumn ? "bg-forest/5 font-semibold text-charcoal" : ""
                  }`}
                >
                  {row.format(col.result)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MC_CHART_WIDTH = 640;
const MC_CHART_HEIGHT = 160;
const MC_PAD_LEFT = 4;
const MC_PAD_RIGHT = 4;
const MC_PAD_TOP = 10;
const MC_PAD_BOTTOM = 26;
const MC_BIN_COUNT = 16;

/**
 * Compact histogram of simulated Ending ARR outcomes, with dashed markers
 * for P10 / median / P90 — the one distribution visualization the Monte
 * Carlo brief asks for. Bins and markers are computed from the same sample
 * array the KPI cards above already summarize; nothing is recalculated.
 */
function MonteCarloHistogram({
  samples,
  p10,
  median,
  p90,
}: {
  samples: number[];
  p10: number;
  median: number;
  p90: number;
}) {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min || 1;
  const binWidth = range / MC_BIN_COUNT;
  const bins = Array.from({ length: MC_BIN_COUNT }, () => 0);
  samples.forEach((v) => {
    const idx = Math.min(MC_BIN_COUNT - 1, Math.floor((v - min) / binWidth));
    bins[idx]++;
  });
  const maxCount = Math.max(...bins, 1);
  const innerWidth = MC_CHART_WIDTH - MC_PAD_LEFT - MC_PAD_RIGHT;
  const innerHeight = MC_CHART_HEIGHT - MC_PAD_TOP - MC_PAD_BOTTOM;
  const barGap = 2;
  const barWidth = innerWidth / MC_BIN_COUNT - barGap;

  const xFor = (value: number) => MC_PAD_LEFT + ((value - min) / range) * innerWidth;

  const markers: { value: number; label: string; color: string }[] = [
    { value: p10, label: "P10", color: "#a1462f" },
    { value: median, label: "P50", color: "#2a2820" },
    { value: p90, label: "P90", color: "#96703e" },
  ];

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${MC_CHART_WIDTH} ${MC_CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Distribution of simulated ending ARR across ${samples.length} runs, ranging from ${formatCurrencyCompact(
          min
        )} to ${formatCurrencyCompact(max)}, with P10 ${formatCurrencyCompact(
          p10
        )}, median ${formatCurrencyCompact(median)}, and P90 ${formatCurrencyCompact(p90)}`}
      >
        {bins.map((count, i) => {
          const x = MC_PAD_LEFT + i * (innerWidth / MC_BIN_COUNT) + barGap / 2;
          const height = (count / maxCount) * innerHeight;
          const y = MC_PAD_TOP + innerHeight - height;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(barWidth, 0.5)}
              height={Math.max(height, 0.5)}
              fill="#1e3a2b"
              fillOpacity={0.55}
              rx={1}
            />
          );
        })}
        {markers.map((marker) => (
          <g key={marker.label}>
            <line
              x1={xFor(marker.value)}
              x2={xFor(marker.value)}
              y1={MC_PAD_TOP}
              y2={MC_PAD_TOP + innerHeight}
              stroke={marker.color}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <text
              x={xFor(marker.value)}
              y={MC_CHART_HEIGHT - MC_PAD_BOTTOM + 14}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill={marker.color}
            >
              {marker.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * A trimmed-down version of ForecastChart's visual language (same
 * gridlines, end-label halo, legend) generalized to any industry's monthly
 * series — Consulting and Real Estate hand it plain number[] arrays instead
 * of SaaS-shaped month objects, so this one chart can serve every industry
 * without any industry-specific typing.
 */
function GenericForecastChart({
  seriesByScenario,
  ariaLabel,
  valueFormatter = formatCurrencyCompact,
}: {
  seriesByScenario: Record<ScenarioKey, number[]>;
  ariaLabel: string;
  valueFormatter?: (value: number) => string;
}) {
  const series = SCENARIO_KEYS.map((key) => ({
    key,
    values: seriesByScenario[key],
    ...SERIES_STYLE[key],
  }));

  const all = series.flatMap((s) => s.values);
  const rawMin = Math.min(0, ...all);
  const rawMax = Math.max(...all);
  const pad = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.12 || 1;
  const minValue = rawMin < 0 ? rawMin - pad : 0;
  const maxValue = rawMax + pad;
  const showZeroLine = minValue < 0 && maxValue > 0;
  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  const gridValues = gridFracs.map((f) => minValue + (maxValue - minValue) * f);

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
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
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
        {[1, 3, 6, 9, 12].map((m) => (
          <text
            key={m}
            x={monthX(m)}
            y={CHART_HEIGHT - PAD_BOTTOM + 18}
            textAnchor="middle"
            className="fill-charcoal-soft text-[10px]"
          >
            M{m}
          </text>
        ))}
        {series.map((s) => {
          const points = s.values
            .map((v, i) => `${monthX(i + 1)},${valueY(v, minValue, maxValue)}`)
            .join(" ");
          return (
            <polyline
              key={s.key}
              points={points}
              fill="none"
              stroke={s.stroke}
              strokeWidth={2}
              strokeDasharray={s.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
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
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-charcoal-soft">
            <span className={`h-2.5 w-2.5 rounded-full ${s.swatchClass}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// AI-generated commentary is only ever wired up if a server-side LLM API
// key is already configured — none is in this environment, so AI-Assisted
// stays visibly present but disabled with an explanation, rather than
// faked or silently hidden. If a key were ever configured, the
// architecture would be: engine output -> server-side API route -> LLM ->
// rendered commentary, with the LLM receiving only calculated numbers and
// never performing financial calculations itself.
function CommentaryModeToggle() {
  return (
    <div
      className="flex gap-1 rounded-full border border-forest/20 bg-white p-0.5"
      title="AI-Assisted commentary requires a server-side LLM API key, which isn't configured in this environment. Deterministic commentary is the only mode available."
    >
      <span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-cream">
        Deterministic
      </span>
      <span
        aria-disabled="true"
        className="cursor-not-allowed rounded-full px-3 py-1 text-xs font-semibold text-charcoal-soft/50"
      >
        AI-Assisted
      </span>
    </div>
  );
}

function SampleBadge() {
  return (
    <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-forest">
      Sample
    </span>
  );
}

export default function FpaDecisionLab() {
  // Industry selector — swaps drivers/KPIs/charts/sensitivity/decision
  // rules/commentary while the surrounding shell (hero, sticky sidebar,
  // analysis canvas) stays the same. Each industry keeps its own
  // independent assumptions state below, so switching back and forth never
  // loses what you'd tuned.
  const [industry, setIndustry] = useState<Industry>("saas");

  // `assumptions` IS Base — whatever the sliders currently say. Upside and
  // Downside are always Base plus this industry's own signed delta table
  // (see SAAS_SCENARIO_DELTAS), recomputed live as the sliders move. The
  // scenario selector below only controls which of the three feeds the KPI
  // cards/badges/commentary — it never rewrites the sliders, and there is
  // no separate "Custom" case since Base already is the live, editable one.
  const [assumptions, setAssumptions] = useState<SaaSAssumptions>(SAAS_BASE_DEFAULTS);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("base");
  const [sensitivityTab, setSensitivityTab] = useState<SensitivityMetric>("ebitda");

  // CSV import — a custom baseline threaded through the same
  // runSaaSForecast() path the sample company uses; never a parallel model.
  const [customBaseline, setCustomBaseline] = useState<SaaSCompanyBaseline | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvRow[] | null>(null);
  const activeBaseline = customBaseline ?? northstarBaseline;

  // Save / Load / Share — saved scenarios are user-named Base assumption
  // sets, kept structurally separate from the fixed Upside/Downside deltas.
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveNameDraft, setSaveNameDraft] = useState("");
  const [showLoadList, setShowLoadList] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    setSavedScenarios(loadSavedScenarios());

    const params = new URLSearchParams(window.location.search);
    const shared = params.get("s");
    if (shared) {
      const decoded = decodeAssumptions(shared);
      // A malformed or tampered share link is ignored silently rather than
      // fed to the engine or shown as an error — the app just falls back
      // to the default Base values.
      if (decoded) setAssumptions(decoded);
    }
  }, []);

  const set = <K extends keyof SaaSAssumptions>(key: K) => (value: number) =>
    setAssumptions((prev) => ({ ...prev, [key]: value }));

  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCompanyCsv(String(reader.result ?? ""));
      if (!result.ok) {
        setCsvError(result.error);
        setCsvWarnings([]);
        setCsvPreviewRows(null);
        return;
      }
      setCsvError(null);
      setCsvWarnings(result.warnings);
      setCsvPreviewRows(result.rows);
      setCsvFileName(file.name);
      setCustomBaseline(result.derivedBaseline);
      setAssumptions((prev) => ({ ...prev, ...result.derivedAssumptions }));
    };
    reader.onerror = () => {
      setCsvError("Could not read that file. Please try again.");
      setCsvWarnings([]);
      setCsvPreviewRows(null);
    };
    reader.readAsText(file);
  };

  const resetToSampleData = () => {
    setCustomBaseline(null);
    setCsvFileName(null);
    setCsvError(null);
    setCsvWarnings([]);
    setCsvPreviewRows(null);
    setAssumptions(SAAS_BASE_DEFAULTS);
  };

  const saveScenario = () => {
    const name = saveNameDraft.trim();
    if (!name) return;
    const updated = [
      ...savedScenarios.filter((s) => s.name !== name),
      { name, assumptions, savedAt: Date.now() },
    ];
    setSavedScenarios(updated);
    try {
      window.localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable (private browsing, quota) — the scenario
      // still applies for this session, it just won't persist.
    }
    setSaveNameDraft("");
    setShowSaveInput(false);
  };

  const deleteScenario = (name: string) => {
    const updated = savedScenarios.filter((s) => s.name !== name);
    setSavedScenarios(updated);
    try {
      window.localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(updated));
    } catch {
      // Nothing to do if storage isn't available — state is already updated.
    }
  };

  const shareScenario = () => {
    const url = `${window.location.origin}${window.location.pathname}?s=${encodeAssumptions(
      assumptions
    )}`;
    setShareUrl(url);
    navigator.clipboard?.writeText(url).catch(() => {
      // Clipboard permission denied — the URL is still shown in the box
      // below for the user to copy manually.
    });
  };

  // Monte Carlo — an optional, explicitly-labeled complement to the
  // deterministic scenarios above, never a replacement for them. Always
  // samples around Base (the live sliders), regardless of which scenario
  // tab is selected for the KPI cards. Runs only on demand (never on every
  // slider tick) since each run is hundreds of forecasts.
  const [mcSimCount, setMcSimCount] = useState<500 | 1000>(500);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcProgress, setMcProgress] = useState(0);
  const [mcRanForKey, setMcRanForKey] = useState<string | null>(null);
  const mcAssumptionsKey = useMemo(
    () => JSON.stringify({ assumptions, activeBaseline }),
    [assumptions, activeBaseline]
  );
  const mcStale = mcResult !== null && mcRanForKey !== mcAssumptionsKey;

  const runMonteCarlo = async () => {
    setMcRunning(true);
    setMcProgress(0);
    const key = mcAssumptionsKey;
    const result = await runMonteCarloSimulation(assumptions, activeBaseline, mcSimCount, (done, total) =>
      setMcProgress(done / total)
    );
    setMcResult(result);
    setMcRanForKey(key);
    setMcRunning(false);
  };

  // All three scenarios always drive the charts and the comparison table
  // regardless of which one is selected below. Upside/Downside are Base
  // plus this industry's own signed, directionally-aware delta table, each
  // driver clamped to its own slider bounds — if every delta were zero, all
  // three would collapse onto Base exactly (verified in the model layer).
  const scenarioResults = useMemo(
    () => ({
      base: runSaaSForecast(assumptions, activeBaseline),
      upside: runSaaSForecast(applySaaSScenario(assumptions, "upside"), activeBaseline),
      downside: runSaaSForecast(applySaaSScenario(assumptions, "downside"), activeBaseline),
    }),
    [assumptions, activeBaseline]
  );

  // Whichever scenario is selected drives the KPI cards, banner,
  // commentary, and sensitivity panel — the sliders keep editing Base
  // either way.
  const activeAssumptions = useMemo(
    () => applySaaSScenario(assumptions, activeScenario),
    [assumptions, activeScenario]
  );
  const activeResult = scenarioResults[activeScenario];
  const activeMonth12 = activeResult.months[activeResult.months.length - 1];
  const sensitivity = useMemo(
    () => runSaaSSensitivityByMetric(activeAssumptions, sensitivityTab, activeBaseline),
    [activeAssumptions, sensitivityTab, activeBaseline]
  );
  const decision = decideStance(
    activeResult.runwayMonths,
    activeResult.endingEBITDAMargin
  );
  const decisionReasons = useMemo(
    () => explainDecision(activeResult, decision),
    [activeResult, decision]
  );
  const scenarioStatusLabel = SCENARIO_LABELS[activeScenario];

  const arrTrend = classifyArrTrend(activeResult);
  const marginStatus = classifyMargin(activeResult.endingEBITDAMargin);
  const cashStatus = classifyCash(activeResult.endingCash, activeBaseline);
  const runwayStatus = classifyRunway(activeResult.runwayMonths);
  const nrrStatus = classifyNRR(activeResult.endingNRR);
  const ltvCacStatus = classifyLtvToCac(activeResult.ltvToCac);

  const cfoCommentaryData = useMemo(
    () => buildCfoCommentaryData(activeResult, activeBaseline),
    [activeResult, activeBaseline]
  );
  const cfoCommentary = {
    performance: `ARR reaches ${formatCurrencyCompact(cfoCommentaryData.endingARR)}, ${
      cfoCommentaryData.arrGrowthPct >= 0 ? "up" : "down"
    } ${Math.abs(cfoCommentaryData.arrGrowthPct * 100).toFixed(0)}% from the starting ${formatCurrencyCompact(
      cfoCommentaryData.startingARR
    )}, ${cfoCommentaryData.arrTrendPhrase}.`,
    profitability: `EBITDA margin reaches ${formatPercent(
      cfoCommentaryData.endingEBITDAMargin
    )}, ${cfoCommentaryData.marginPhrase}.`,
    cashPosition:
      cfoCommentaryData.runwayMonths === null
        ? `Ending cash of ${formatCurrencyCompact(
            cfoCommentaryData.endingCash
          )} remains ${cfoCommentaryData.cashHealthPhrase} and the company is cash-flow positive, removing near-term runway pressure.`
        : `Ending cash of ${formatCurrencyCompact(
            cfoCommentaryData.endingCash
          )} remains ${cfoCommentaryData.cashHealthPhrase}, with ${cfoCommentaryData.runwayMonths.toFixed(
            1
          )} months of runway.`,
    retention: `Net revenue retention is ${formatPercent(
      cfoCommentaryData.endingNRR
    )}, ${cfoCommentaryData.nrrPhrase}. Revenue growth this year has been driven ${
      cfoCommentaryData.growthDriverPhrase
    }. LTV/CAC stands at ${cfoCommentaryData.ltvToCac.toFixed(2)}x (LTV ${formatCurrencyCompact(
      cfoCommentaryData.ltv
    )} vs. CAC ${formatCurrencyCompact(cfoCommentaryData.cac)}), ${
      cfoCommentaryData.ltvCacPhrase
    }.`,
    keyRisk: cfoCommentaryData.keyRiskPhrase,
    nextAction: cfoCommentaryData.nextActionPhrase,
  };

  // --- Consulting & Services ---
  // Same architecture as SaaS above: `consultingAssumptions` IS Base;
  // Upside/Downside are always Base plus CONSULTING_SCENARIO_DELTAS.
  const [consultingAssumptions, setConsultingAssumptions] = useState<ConsultingAssumptions>(
    CONSULTING_BASE_DEFAULTS
  );
  const [consultingActiveScenario, setConsultingActiveScenario] = useState<ScenarioKey>("base");
  const [consultingSensitivityTab, setConsultingSensitivityTab] =
    useState<ConsultingSensitivityMetric>("ebitda");

  const setConsulting =
    <K extends keyof ConsultingAssumptions>(key: K) =>
    (value: number) =>
      setConsultingAssumptions((prev) => ({ ...prev, [key]: value }));

  const resetConsultingToBase = () => setConsultingAssumptions(CONSULTING_BASE_DEFAULTS);

  const consultingScenarioResults = useMemo(
    () => ({
      base: runConsultingForecast(consultingAssumptions, meridianBaseline),
      upside: runConsultingForecast(
        applyConsultingScenario(consultingAssumptions, "upside"),
        meridianBaseline
      ),
      downside: runConsultingForecast(
        applyConsultingScenario(consultingAssumptions, "downside"),
        meridianBaseline
      ),
    }),
    [consultingAssumptions]
  );
  const consultingActiveAssumptions = useMemo(
    () => applyConsultingScenario(consultingAssumptions, consultingActiveScenario),
    [consultingAssumptions, consultingActiveScenario]
  );
  const consultingResult = consultingScenarioResults[consultingActiveScenario];
  const consultingSensitivity = useMemo(
    () =>
      runConsultingSensitivityByMetric(
        consultingActiveAssumptions,
        meridianBaseline,
        consultingSensitivityTab
      ),
    [consultingActiveAssumptions, consultingSensitivityTab]
  );
  const consultingDecision = decideConsultingStance(consultingResult);
  const consultingDecisionReasons = explainConsultingDecision(consultingResult, consultingDecision);
  const consultingScenarioStatusLabel = SCENARIO_LABELS[consultingActiveScenario];
  const consultingUtilizationStatus = classifyUtilization(consultingResult.endingUtilization);
  const consultingMarginStatus = classifyMargin(consultingResult.endingEBITDAMargin);
  const consultingCashStatus = classifyConsultingCash(consultingResult.endingCash, meridianBaseline);
  const consultingRunwayStatus = classifyRunway(consultingResult.runwayMonths);
  const consultingRiskAndAction = useMemo(
    () => buildConsultingRiskAndAction(consultingResult),
    [consultingResult]
  );

  // --- Real Estate ---
  // Same architecture again: `realEstateAssumptions` IS Base;
  // Upside/Downside are always Base plus REAL_ESTATE_SCENARIO_DELTAS.
  const [realEstateAssumptions, setRealEstateAssumptions] = useState<RealEstateAssumptions>(
    REAL_ESTATE_BASE_DEFAULTS
  );
  const [realEstateActiveScenario, setRealEstateActiveScenario] = useState<ScenarioKey>("base");
  const [realEstateSensitivityTab, setRealEstateSensitivityTab] =
    useState<RealEstateSensitivityMetric>("noi");

  const setRealEstate =
    <K extends keyof RealEstateAssumptions>(key: K) =>
    (value: number) =>
      setRealEstateAssumptions((prev) => ({ ...prev, [key]: value }));

  const resetRealEstateToBase = () => setRealEstateAssumptions(REAL_ESTATE_BASE_DEFAULTS);

  const realEstateScenarioResults = useMemo(
    () => ({
      base: runRealEstateForecast(realEstateAssumptions, harborViewBaseline),
      upside: runRealEstateForecast(
        applyRealEstateScenario(realEstateAssumptions, "upside"),
        harborViewBaseline
      ),
      downside: runRealEstateForecast(
        applyRealEstateScenario(realEstateAssumptions, "downside"),
        harborViewBaseline
      ),
    }),
    [realEstateAssumptions]
  );
  const realEstateActiveAssumptions = useMemo(
    () => applyRealEstateScenario(realEstateAssumptions, realEstateActiveScenario),
    [realEstateAssumptions, realEstateActiveScenario]
  );
  const realEstateResult = realEstateScenarioResults[realEstateActiveScenario];
  const realEstateSensitivity = useMemo(
    () =>
      runRealEstateSensitivityByMetric(
        realEstateActiveAssumptions,
        harborViewBaseline,
        realEstateSensitivityTab
      ),
    [realEstateActiveAssumptions, realEstateSensitivityTab]
  );
  const realEstateDecision = decideRealEstateStance(realEstateResult, realEstateActiveAssumptions);
  const realEstateDecisionReasons = explainRealEstateDecision(
    realEstateResult,
    realEstateActiveAssumptions,
    realEstateDecision
  );
  const realEstateScenarioStatusLabel = SCENARIO_LABELS[realEstateActiveScenario];
  const realEstateOccupancyStatus = classifyOccupancy(realEstateActiveAssumptions.occupancyPct);
  const realEstateDscr = debtServiceCoverageRatio(realEstateResult, realEstateActiveAssumptions);
  const realEstateDscrStatus = classifyDebtCoverage(realEstateDscr);
  const realEstateCashStatus = classifyRealEstateCash(realEstateResult.endingCash, harborViewBaseline);
  const realEstateRunwayStatus = classifyRunway(realEstateResult.runwayMonths);
  const realEstateMarginStatus = classifyMargin(realEstateResult.endingFreeCashFlowMargin);
  const realEstateRiskAndAction = useMemo(
    () => buildRealEstateRiskAndAction(realEstateResult, realEstateActiveAssumptions),
    [realEstateResult, realEstateActiveAssumptions]
  );

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <Link
          href="/#builds"
          className="text-sm font-semibold text-forest hover:text-forest-dark"
        >
          &larr; Back to Builds
        </Link>

        {/* Hero */}
        <div className="mt-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">
            Interactive Demo
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
            FP&amp;A Decision Lab
          </h1>
          <p className="mt-6 max-w-2xl text-xl italic leading-8 text-charcoal-soft">
            &ldquo;Given where the business is trending, what should we
            actually do about it?&rdquo;
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-rust-pale px-4 py-2 text-xs font-semibold text-rust">
            <span className="text-sm">&#9888;</span>
            DEMO — illustrative sample data for a fictional company, not a
            real client engagement
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-base leading-7 text-charcoal-soft">
          {industry === "saas" &&
            (customBaseline
              ? "Forecasting forward from your uploaded company data."
              : `A small SaaS financial-planning simulator built around a fictional company, ${northstarBaseline.name}.`)}
          {industry === "consulting" &&
            `A Consulting & Services financial-planning simulator built around a fictional firm, ${meridianBaseline.name}.`}
          {industry === "realEstate" &&
            `A Real Estate financial-planning simulator built around a fictional portfolio, ${harborViewBaseline.name}.`}{" "}
          Pick an industry and scenario, or tune the assumptions on the left
          — a 12-month engine recomputes the numbers and a rules-based
          recommendation live.
        </p>

        {/* App workspace: sticky sidebar + live analysis canvas */}
        <div className="mt-12 border-t border-forest/10 pt-8 lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-8">
          {/* Sidebar */}
          <aside className="mb-8 rounded-2xl border border-forest/15 bg-white p-4 lg:sticky lg:top-24 lg:mb-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="mb-3 pb-3 border-b border-forest/10">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                Industry
              </span>
              <div className="flex flex-col gap-1.5">
                {(["saas", "consulting", "realEstate"] as Industry[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIndustry(key)}
                    aria-pressed={industry === key}
                    className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      industry === key
                        ? "bg-forest text-cream"
                        : "border border-forest/20 bg-white text-charcoal hover:border-forest/40"
                    }`}
                  >
                    {INDUSTRY_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            {industry === "saas" && (
              <>
            <div className="mb-1 flex items-center justify-between px-1 pb-2">
              <span className="text-xs font-semibold text-charcoal-soft">Scenario</span>
              <span className="text-xs font-semibold text-forest">{scenarioStatusLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setAssumptions(SAAS_BASE_DEFAULTS)}
              className="mb-3 w-full rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/5"
            >
              Reset to Defaults
            </button>

            <div className="mb-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowSaveInput((v) => !v);
                  setShowLoadList(false);
                  setShareUrl(null);
                }}
                className="rounded-lg border border-forest/20 px-2 py-1.5 text-[11px] font-semibold text-forest transition-colors hover:bg-forest/5"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLoadList((v) => !v);
                  setShowSaveInput(false);
                  setShareUrl(null);
                }}
                className="rounded-lg border border-forest/20 px-2 py-1.5 text-[11px] font-semibold text-forest transition-colors hover:bg-forest/5"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => {
                  shareScenario();
                  setShowSaveInput(false);
                  setShowLoadList(false);
                }}
                className="rounded-lg border border-forest/20 px-2 py-1.5 text-[11px] font-semibold text-forest transition-colors hover:bg-forest/5"
              >
                Share
              </button>
            </div>

            {showSaveInput && (
              <div className="mb-3 flex flex-col gap-1.5 rounded-lg border border-forest/15 bg-forest/5 p-2">
                <input
                  type="text"
                  value={saveNameDraft}
                  onChange={(e) => setSaveNameDraft(e.target.value)}
                  placeholder="Scenario name"
                  className="rounded-md border border-forest/20 bg-white px-2 py-1 text-xs text-charcoal"
                />
                <button
                  type="button"
                  onClick={saveScenario}
                  disabled={!saveNameDraft.trim()}
                  className="rounded-md bg-forest px-2 py-1 text-[11px] font-semibold text-cream transition-opacity disabled:opacity-40"
                >
                  Save Current Assumptions
                </button>
              </div>
            )}

            {showLoadList && (
              <div className="mb-3 flex flex-col gap-1 rounded-lg border border-forest/15 bg-forest/5 p-2">
                {savedScenarios.length === 0 ? (
                  <p className="text-[11px] text-charcoal-soft">No saved scenarios yet.</p>
                ) : (
                  savedScenarios.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssumptions(s.assumptions);
                          setShowLoadList(false);
                        }}
                        className="flex-1 truncate text-left text-xs font-semibold text-forest hover:underline"
                      >
                        {s.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteScenario(s.name)}
                        aria-label={`Delete ${s.name}`}
                        className="text-[11px] text-rust hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {shareUrl && (
              <div className="mb-3 flex flex-col gap-1.5 rounded-lg border border-forest/15 bg-forest/5 p-2">
                <p className="text-[10px] leading-4 text-charcoal-soft">
                  Link copied (if permitted) — opening it recreates this
                  exact scenario:
                </p>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="rounded-md border border-forest/20 bg-white px-2 py-1 text-[10px] text-charcoal"
                />
              </div>
            )}

            <AccordionSection title="Scenario" defaultOpen>
              <div className="flex flex-col gap-2">
                {SCENARIO_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveScenario(key)}
                    aria-pressed={activeScenario === key}
                    className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      activeScenario === key
                        ? "bg-forest text-cream"
                        : "border border-forest/20 bg-white text-charcoal hover:border-forest/40"
                    }`}
                  >
                    {SCENARIO_LABELS[key]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                Upside/Downside apply this industry&apos;s own signed delta
                to whatever the Drivers below currently say — they don&apos;t
                move the sliders. All three always draw on every chart;
                picking one here only changes which case feeds the KPI
                cards, badges, and commentary.
              </p>
            </AccordionSection>

            <AccordionSection title="Drivers" badge={<SampleBadge />} defaultOpen>
              <div className="flex flex-col gap-5">
                {SAAS_DRIVERS.map((driver) => (
                  <DriverSlider
                    key={driver.key}
                    driver={driver}
                    value={assumptions[driver.key]}
                    onChange={set(driver.key)}
                  />
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="Model Assumptions">
              <dl className="flex flex-col gap-2 text-xs">
                {[
                  ["Starting Cash", formatCurrencyCompact(activeBaseline.startingCash)],
                  ["Fixed Headcount", `${FIXED_HEADCOUNT} heads`],
                  [
                    "Avg. Employee Cost",
                    `${formatCurrencyCompact(AVG_FULLY_LOADED_COST_PER_EMPLOYEE)}/yr`,
                  ],
                  ["Fixed G&A", `${formatCurrencyCompact(FIXED_GA_MONTHLY)}/mo`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-charcoal-soft">{label}</dt>
                    <dd className="font-semibold text-charcoal">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-4 text-charcoal-soft">
                {customBaseline
                  ? "Starting cash derived from your uploaded CSV. Headcount, employee cost, and G&A stay fixed model constants for this demo — not sliders."
                  : "Fixed model constants for this demo — not sliders. Starting Customers and Avg MRR per Customer are drivers above, not fixed facts."}
              </p>
            </AccordionSection>

            <AccordionSection
              title="Data & Upload"
              badge={
                customBaseline ? (
                  <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brass">
                    Imported
                  </span>
                ) : (
                  <SampleBadge />
                )
              }
            >
              <div className="flex flex-col gap-3">
                <p className="text-[11px] leading-4 text-charcoal-soft">
                  Upload your own company&apos;s monthly data to forecast
                  forward from real numbers instead of the sample company.
                  Required columns: month, customers, mrr, cash, headcount,
                  sales_marketing_spend. Optional: churned_customers,
                  expansion_mrr, contraction_mrr, new_mrr.
                </p>
                <label className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-forest/30 px-3 py-2 text-xs font-semibold text-forest transition-colors hover:bg-forest/5">
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
                {csvFileName && !csvError && (
                  <p className="text-[11px] font-semibold text-forest">
                    Loaded {csvFileName} ({csvPreviewRows?.length ?? 0} row
                    {csvPreviewRows?.length === 1 ? "" : "s"})
                  </p>
                )}
                {csvError && (
                  <p className="rounded-lg bg-rust-pale px-2.5 py-2 text-[11px] leading-4 text-rust">
                    {csvError}
                  </p>
                )}
                {csvWarnings.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {csvWarnings.map((w) => (
                      <li
                        key={w}
                        className="text-[11px] leading-4 text-brass before:mr-1 before:content-['⚠_']"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
                {csvPreviewRows && csvPreviewRows.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-forest/10">
                    <table className="w-full min-w-[280px] text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-forest/10 text-charcoal-soft">
                          <th className="px-2 py-1 font-semibold">Mo</th>
                          <th className="px-2 py-1 font-semibold">Customers</th>
                          <th className="px-2 py-1 font-semibold">MRR</th>
                          <th className="px-2 py-1 font-semibold">Cash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewRows.slice(-5).map((row) => (
                          <tr key={row.month} className="border-b border-forest/5 last:border-0">
                            <td className="px-2 py-1 text-charcoal-soft">{row.month}</td>
                            <td className="px-2 py-1 text-charcoal-soft">{row.customers}</td>
                            <td className="px-2 py-1 text-charcoal-soft">
                              {formatCurrencyCompact(row.mrr)}
                            </td>
                            <td className="px-2 py-1 text-charcoal-soft">
                              {formatCurrencyCompact(row.cash)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {customBaseline && (
                  <button
                    type="button"
                    onClick={resetToSampleData}
                    className="w-full rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/5"
                  >
                    Reset to Sample Data
                  </button>
                )}
              </div>
            </AccordionSection>
              </>
            )}

            {industry === "consulting" && (
              <>
                <div className="mb-1 flex items-center justify-between px-1 pb-2">
                  <span className="text-xs font-semibold text-charcoal-soft">Scenario</span>
                  <span className="text-xs font-semibold text-forest">
                    {consultingScenarioStatusLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetConsultingToBase}
                  className="mb-3 w-full rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/5"
                >
                  Reset to Defaults
                </button>

                <AccordionSection title="Scenario" defaultOpen>
                  <div className="flex flex-col gap-2">
                    {SCENARIO_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setConsultingActiveScenario(key)}
                        aria-pressed={consultingActiveScenario === key}
                        className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                          consultingActiveScenario === key
                            ? "bg-forest text-cream"
                            : "border border-forest/20 bg-white text-charcoal hover:border-forest/40"
                        }`}
                      >
                        {SCENARIO_LABELS[key]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                    Upside/Downside apply this industry&apos;s own signed
                    delta to whatever the Drivers below currently say.
                  </p>
                </AccordionSection>

                <AccordionSection title="Drivers" badge={<SampleBadge />} defaultOpen>
                  <div className="flex flex-col gap-5">
                    {CONSULTING_DRIVERS.map((driver) => (
                      <DriverSlider
                        key={driver.key}
                        driver={driver}
                        value={consultingAssumptions[driver.key]}
                        onChange={setConsulting(driver.key)}
                      />
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection title="Model Assumptions">
                  <dl className="flex flex-col gap-2 text-xs">
                    {[
                      ["Firm", meridianBaseline.name],
                      ["Starting Cash", formatCurrencyCompact(meridianBaseline.startingCash)],
                      [
                        "Billable Hours / Month",
                        `${STANDARD_BILLABLE_HOURS_PER_MONTH} hrs/consultant`,
                      ],
                      [
                        "Pipeline Conversion Reference",
                        formatPercent(REFERENCE_CONVERSION, 0),
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <dt className="text-charcoal-soft">{label}</dt>
                        <dd className="font-semibold text-charcoal">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[11px] leading-4 text-charcoal-soft">
                    Fixed model constants for this demo — not sliders.
                  </p>
                </AccordionSection>
              </>
            )}

            {industry === "realEstate" && (
              <>
                <div className="mb-1 flex items-center justify-between px-1 pb-2">
                  <span className="text-xs font-semibold text-charcoal-soft">Scenario</span>
                  <span className="text-xs font-semibold text-forest">
                    {realEstateScenarioStatusLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetRealEstateToBase}
                  className="mb-3 w-full rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/5"
                >
                  Reset to Defaults
                </button>

                <AccordionSection title="Scenario" defaultOpen>
                  <div className="flex flex-col gap-2">
                    {SCENARIO_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRealEstateActiveScenario(key)}
                        aria-pressed={realEstateActiveScenario === key}
                        className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                          realEstateActiveScenario === key
                            ? "bg-forest text-cream"
                            : "border border-forest/20 bg-white text-charcoal hover:border-forest/40"
                        }`}
                      >
                        {SCENARIO_LABELS[key]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                    Upside/Downside apply this industry&apos;s own signed
                    delta to whatever the Drivers below currently say.
                  </p>
                </AccordionSection>

                <AccordionSection title="Drivers" badge={<SampleBadge />} defaultOpen>
                  <div className="flex flex-col gap-5">
                    {REAL_ESTATE_DRIVERS.map((driver) => (
                      <DriverSlider
                        key={driver.key}
                        driver={driver}
                        value={realEstateAssumptions[driver.key]}
                        onChange={setRealEstate(driver.key)}
                      />
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection title="Model Assumptions">
                  <dl className="flex flex-col gap-2 text-xs">
                    {[
                      ["Portfolio", harborViewBaseline.name],
                      ["Starting Cash", formatCurrencyCompact(harborViewBaseline.startingCash)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <dt className="text-charcoal-soft">{label}</dt>
                        <dd className="font-semibold text-charcoal">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[11px] leading-4 text-charcoal-soft">
                    Fixed for this demo — not editable. Cap rate values the
                    portfolio; it never enters the cash-flow math.
                  </p>
                </AccordionSection>
              </>
            )}
          </aside>

          {/* Live analysis canvas */}
          <div className="flex flex-col gap-4">
            {industry === "saas" && (
              <>
            {/* Decision banner */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Recommendation
              </h2>
              <div className={`mt-1.5 rounded-xl px-4 py-2.5 ${DECISION_STYLE[decision]}`}>
                <p className="text-lg font-bold">{decision}</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {decisionReasons.map((reason) => (
                    <li
                      key={reason}
                      className="text-sm leading-6 before:mr-2 before:content-['—']"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-charcoal">
                Under these assumptions, {activeBaseline.name} ends the
                year at {formatCurrency(activeResult.endingARR)} ARR with a{" "}
                {formatPercent(activeResult.endingEBITDAMargin)} EBITDA margin
                and {runwayPhrase(activeResult.runwayMonths)}{" "}
                — the model&apos;s read is to &ldquo;{decision.toLowerCase()}.&rdquo;
              </p>
              <p className="mt-1 text-xs leading-4 text-charcoal-soft">
                Deterministic thresholds: runway &gt;18mo + positive margin
                &rarr; Invest for growth; 12–18mo &rarr; Run cautiously;
                &lt;12mo &rarr; Preserve cash.
              </p>
            </section>

            {/* KPI cards */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                12-Month Outlook
              </h2>
              <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="Ending ARR"
                  value={formatCurrencyCompact(activeResult.endingARR)}
                  badge={arrTrend}
                  tone={ARR_TONE[arrTrend]}
                />
                <KpiCard
                  label="EBITDA Margin"
                  value={formatPercent(activeResult.endingEBITDAMargin)}
                  badge={MARGIN_BADGE_LABEL[marginStatus]}
                  tone={MARGIN_TONE[marginStatus]}
                />
                <KpiCard
                  label="Ending Cash"
                  value={formatCurrencyCompact(activeResult.endingCash)}
                  badge={cashStatus}
                  tone={CASH_TONE[cashStatus]}
                />
                <KpiCard
                  label="Runway"
                  value={runwayLabel(activeResult.runwayMonths)}
                  badge={runwayStatus}
                  tone={RUNWAY_TONE[runwayStatus]}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="NRR"
                  value={formatPercent(activeResult.endingNRR)}
                  badge={nrrStatus}
                  tone={NRR_TONE[nrrStatus]}
                />
                <KpiCard
                  label="LTV / CAC"
                  value={`${activeResult.ltvToCac.toFixed(2)}x`}
                  badge={ltvCacStatus}
                  tone={LTV_CAC_TONE[ltvCacStatus]}
                />
              </div>
              <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                CAC {formatCurrency(activeResult.cac)}{" "}
                (blended: ALL annual S&amp;M spend ÷ new customers acquired
                over the year — the model has one combined S&amp;M line, so
                this includes retention/expansion-oriented spend too, not
                only acquisition-specific cost, which can understate true
                acquisition CAC) · LTV {formatCurrency(activeResult.ltv)}{" "}
                (gross-margin-adjusted monthly ARPU ÷ monthly logo churn
                rate — churn is monthly and used directly, so 1 ÷ monthly
                churn is the expected customer lifetime in months; nothing
                is annualized).
              </p>
            </section>

            {/* Main chart */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                12-Month MRR Forecast
              </h2>
              <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                All three scenarios always render. Base moves live with the
                Drivers below; Upside/Downside apply this industry&apos;s
                signed delta on top of it.
              </p>
              <ForecastChart
                seriesByScenario={scenarioResults}
                metric="mrr"
                ariaLabel="12-month MRR forecast under Base, Upside, and Downside scenarios"
              />
            </section>

            {/* MRR Bridge */}
            <section className="border-t border-forest/10 pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                MRR Bridge — Month 12
              </h2>
              <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                How Beginning MRR becomes Ending MRR in the final forecast
                month: Beginning + New + Expansion − Contraction − Churned.
              </p>
              <MrrBridgeChart month={activeMonth12} />
            </section>

            {/* NRR trend chart */}
            <section className="border-t border-forest/10 pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                NRR Trend
              </h2>
              <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                Monthly net revenue retention — excludes New MRR, so it
                isolates how the existing customer base is trending.
              </p>
              <div className="mx-auto mt-2 max-w-lg">
                <ForecastChart
                  seriesByScenario={scenarioResults}
                  metric="nrr"
                  zeroFloor={false}
                  valueFormatter={(v) => formatPercent(v, 1)}
                  ariaLabel="12-month net revenue retention trend under Base, Upside, and Downside scenarios"
                />
              </div>
            </section>

            {/* Cash chart */}
            <section className="border-t border-forest/10 pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                12-Month Cash Balance Forecast
              </h2>
              <p className="mt-2 text-sm leading-6 text-charcoal-soft">
                Same scenarios, tracking ending cash instead of revenue —
                watch how a scenario that turns cash-flow positive levels off
                rather than continuing to decline.
              </p>
              <ForecastChart
                seriesByScenario={scenarioResults}
                metric="cash"
                ariaLabel="12-month cash balance forecast under Base, Upside, and Downside scenarios"
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-forest/15 bg-white px-4 py-3">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">
                    Ending Cash
                  </span>
                  <span className="text-base font-bold text-charcoal">
                    {formatCurrencyCompact(activeResult.endingCash)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">
                    Runway
                  </span>
                  <span className="text-base font-bold text-charcoal">
                    {runwayLabel(activeResult.runwayMonths)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">
                    Status
                  </span>
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[RUNWAY_TONE[runwayStatus]]}`}
                  >
                    {RUNWAY_HEALTH_LABEL[runwayStatus]}
                  </span>
                </div>
              </div>
            </section>

            {/* Scenario comparison table */}
            <section className="border-t border-forest/10 pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Scenario Comparison
              </h2>
              <div className="mt-3">
                <ScenarioComparisonTable
                  scenarioResults={scenarioResults}
                  activeColumn={activeScenario}
                />
              </div>
            </section>

            {/* Top Drivers Sensitivity */}
            <section className="border-t border-forest/10 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                  Top Drivers Sensitivity
                </h2>
                <div className="flex gap-1 rounded-full border border-forest/20 bg-white p-0.5">
                  {SENSITIVITY_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSensitivityTab(tab.key)}
                      aria-pressed={sensitivityTab === tab.key}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        sensitivityTab === tab.key
                          ? "bg-forest text-cream"
                          : "text-charcoal-soft hover:text-charcoal"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Impact of a +10% change on each driver,{" "}
                {sensitivityTab === "cash"
                  ? "on ending cash"
                  : sensitivityTab === "ltvToCac"
                    ? "on the LTV/CAC ratio"
                    : `on ${SENSITIVITY_TABS.find((t) => t.key === sensitivityTab)?.label.toLowerCase()}`}
                .
              </p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {(() => {
                  const maxAbsImpact = Math.max(...sensitivity.map((r) => Math.abs(r.impact)), 1);
                  return sensitivity.map((row, i) => {
                    const isPositive = row.impact >= 0;
                    const pct = (Math.abs(row.impact) / maxAbsImpact) * 100;
                    return (
                      <li key={row.key} className="flex items-center gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-[11px] font-bold text-forest">
                          {i + 1}
                        </span>
                        <span className="w-32 shrink-0 text-xs font-semibold text-charcoal sm:w-40 sm:text-sm">
                          {row.label}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                          <span
                            className={`block h-full rounded-full ${isPositive ? "bg-forest" : "bg-rust"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span
                          className={`w-20 shrink-0 text-right text-xs font-semibold sm:text-sm ${
                            isPositive ? "text-forest" : "text-rust"
                          }`}
                        >
                          {formatSensitivityImpact(sensitivityTab, row.impact)}
                        </span>
                      </li>
                    );
                  });
                })()}
              </ul>
              {sensitivityTab === "cash" && (
                <p className="mt-3 text-[11px] leading-4 text-charcoal-soft">
                  Runway impact shown in months where both the base and +10%
                  cases have finite runway:{" "}
                  {sensitivity
                    .filter((r) => r.runwayImpactMonths !== undefined)
                    .map((r) => `${r.label} ${r.runwayImpactMonths! >= 0 ? "+" : ""}${r.runwayImpactMonths!.toFixed(1)}mo`)
                    .join(" · ") || "n/a while cash-flow positive"}
                </p>
              )}
            </section>

            {/* CFO Commentary */}
            <section className="border-t border-forest/10 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                  CFO Commentary — {scenarioStatusLabel}
                </h2>
                <CommentaryModeToggle />
              </div>
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-forest/15 bg-white p-4">
                <p className="text-sm leading-6 text-charcoal">
                  <span className="font-semibold text-brass">Performance: </span>
                  {cfoCommentary.performance}
                </p>
                <p className="text-sm leading-6 text-charcoal">
                  <span className="font-semibold text-brass">Profitability: </span>
                  {cfoCommentary.profitability}
                </p>
                <p className="text-sm leading-6 text-charcoal">
                  <span className="font-semibold text-brass">Retention / Unit Economics: </span>
                  {cfoCommentary.retention}
                </p>
                <p className="text-sm leading-6 text-charcoal">
                  <span className="font-semibold text-brass">Cash Position: </span>
                  {cfoCommentary.cashPosition}
                </p>
                <p className="text-sm leading-6 text-charcoal">
                  <span className="font-semibold text-brass">Key Risk: </span>
                  {cfoCommentary.keyRisk}
                </p>
                <p className="text-sm leading-6 text-charcoal">
                  <span className="font-semibold text-brass">Next Action: </span>
                  {cfoCommentary.nextAction}
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                Generated deterministically from live model outputs — not AI-written.
              </p>
            </section>

            {/* Monte Carlo simulation */}
            <section className="border-t border-forest/10 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                  Monte Carlo Simulation
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 rounded-full border border-forest/20 bg-white p-0.5">
                    {([500, 1000] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMcSimCount(n)}
                        aria-pressed={mcSimCount === n}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          mcSimCount === n
                            ? "bg-forest text-cream"
                            : "text-charcoal-soft hover:text-charcoal"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={runMonteCarlo}
                    disabled={mcRunning}
                    className="rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-cream transition-opacity hover:bg-forest-dark disabled:opacity-50"
                  >
                    {mcRunning ? `Running… ${Math.round(mcProgress * 100)}%` : "Run Simulation"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Reruns the 12-month engine {mcSimCount} times, randomly
                perturbing Customer Growth, Churn, Expansion, Contraction,
                Pricing, and Gross Margin around your current assumptions
                (normal distributions, clamped to each driver&apos;s slider
                range), holding Headcount and S&amp;M spend fixed.
              </p>

              {mcResult && (
                <>
                  {mcStale && (
                    <p className="mt-3 text-[11px] font-semibold text-brass">
                      Assumptions changed since this run — click Run
                      Simulation to refresh.
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <KpiCard
                      label="P10 Ending ARR"
                      value={formatCurrencyCompact(mcResult.p10EndingARR)}
                      badge={`n=${mcResult.simulations}`}
                      tone="neutral"
                    />
                    <KpiCard
                      label="Median Ending ARR"
                      value={formatCurrencyCompact(mcResult.medianEndingARR)}
                      badge="P50"
                      tone="good"
                    />
                    <KpiCard
                      label="P90 Ending ARR"
                      value={formatCurrencyCompact(mcResult.p90EndingARR)}
                      badge={`n=${mcResult.simulations}`}
                      tone="neutral"
                    />
                    <KpiCard
                      label="Median Ending Cash"
                      value={formatCurrencyCompact(mcResult.medianEndingCash)}
                      badge="P50"
                      tone="good"
                    />
                    <KpiCard
                      label="P(EBITDA > 0)"
                      value={formatPercent(mcResult.probabilityPositiveEBITDA, 0)}
                      badge={mcResult.probabilityPositiveEBITDA >= 0.5 ? "Likely" : "Unlikely"}
                      tone={mcResult.probabilityPositiveEBITDA >= 0.5 ? "good" : "bad"}
                    />
                    <KpiCard
                      label="P(Runway < 12mo)"
                      value={formatPercent(mcResult.probabilityRunwayBelow12Months, 0)}
                      badge={mcResult.probabilityRunwayBelow12Months <= 0.25 ? "Low risk" : "Elevated"}
                      tone={mcResult.probabilityRunwayBelow12Months <= 0.25 ? "good" : "bad"}
                    />
                  </div>
                  <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                    Ending ARR Distribution ({mcResult.simulations} runs)
                  </h3>
                  <MonteCarloHistogram
                    samples={mcResult.samples.map((s) => s.endingARR)}
                    p10={mcResult.p10EndingARR}
                    median={mcResult.medianEndingARR}
                    p90={mcResult.p90EndingARR}
                  />
                </>
              )}

              <p className="mt-3 rounded-lg bg-brass-pale px-3 py-2 text-[11px] leading-4 text-brass">
                Illustrative simulation based on user-defined assumptions,
                not a forecast guarantee.
              </p>
            </section>
              </>
            )}

            {industry === "consulting" && (
              <>
                {/* Decision banner */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    Recommendation
                  </h2>
                  <div
                    className={`mt-1.5 rounded-xl px-4 py-2.5 ${DECISION_STYLE[consultingDecision]}`}
                  >
                    <p className="text-lg font-bold">{consultingDecision}</p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {consultingDecisionReasons.map((reason) => (
                        <li
                          key={reason}
                          className="text-sm leading-6 before:mr-2 before:content-['—']"
                        >
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-charcoal">
                    Under these assumptions, {meridianBaseline.name} runs at{" "}
                    {formatCurrencyCompact(consultingResult.endingNetRevenueAnnualized)} net
                    revenue/yr with a {formatPercent(consultingResult.endingEBITDAMargin)} EBITDA
                    margin and {runwayPhrase(consultingResult.runwayMonths)} — the model&apos;s
                    read is to &ldquo;{consultingDecision.toLowerCase()}.&rdquo;
                  </p>
                  <p className="mt-1 text-xs leading-4 text-charcoal-soft">
                    Deterministic thresholds: weak achieved utilization
                    (&lt;60%) or a margin that isn&apos;t at least
                    profitable &rarr; never &ldquo;Invest for growth&rdquo;,
                    even with ample runway; otherwise runway &gt;18mo +
                    profitable margin + healthy utilization (&ge;75%)
                    &rarr; Invest for growth; runway &ge;12mo &rarr; Run
                    cautiously; else &rarr; Preserve cash.
                  </p>
                </section>

                {/* KPI cards */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    12-Month Outlook
                  </h2>
                  <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <KpiCard
                      label="Net Revenue / yr"
                      value={formatCurrencyCompact(consultingResult.endingNetRevenueAnnualized)}
                      badge={consultingScenarioStatusLabel}
                      tone="neutral"
                    />
                    <KpiCard
                      label="Utilization"
                      value={formatPercent(consultingResult.endingUtilization, 0)}
                      badge={consultingUtilizationStatus}
                      tone={
                        consultingUtilizationStatus === "Healthy"
                          ? "good"
                          : consultingUtilizationStatus === "Watch"
                            ? "neutral"
                            : "bad"
                      }
                    />
                    <KpiCard
                      label="Project Margin"
                      value={formatPercent(consultingResult.endingProjectMarginPct)}
                      badge={consultingScenarioStatusLabel}
                      tone="neutral"
                    />
                    <KpiCard
                      label="EBITDA Margin"
                      value={formatPercent(consultingResult.endingEBITDAMargin)}
                      badge={MARGIN_BADGE_LABEL[consultingMarginStatus]}
                      tone={MARGIN_TONE[consultingMarginStatus]}
                    />
                    <KpiCard
                      label="Ending Cash"
                      value={formatCurrencyCompact(consultingResult.endingCash)}
                      badge={consultingCashStatus}
                      tone={
                        consultingCashStatus === "Strong"
                          ? "good"
                          : consultingCashStatus === "Adequate"
                            ? "neutral"
                            : "bad"
                      }
                    />
                    <KpiCard
                      label="Runway"
                      value={runwayLabel(consultingResult.runwayMonths)}
                      badge={consultingRunwayStatus}
                      tone={RUNWAY_TONE[consultingRunwayStatus]}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                    Achieved utilization = target utilization, adjusted around
                    a {formatPercent(REFERENCE_CONVERSION, 0)} reference
                    pipeline conversion rate — stronger conversion lifts
                    achieved utilization toward or above target, weaker
                    conversion pulls it below and leaves staff on the bench.
                  </p>
                </section>

                {/* Cash chart */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    12-Month Cash Trajectory
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                    Net revenue and margins are flat under fixed drivers each
                    month — cash is what actually moves, accumulating (or
                    draining) monthly EBITDA.
                  </p>
                  <GenericForecastChart
                    seriesByScenario={{
                      base: consultingScenarioResults.base.months.map((m) => m.cash),
                      upside: consultingScenarioResults.upside.months.map((m) => m.cash),
                      downside: consultingScenarioResults.downside.months.map((m) => m.cash),
                    }}
                    ariaLabel="12-month cash trajectory under Base, Upside, and Downside scenarios for the consulting firm"
                  />
                </section>

                {/* Scenario comparison */}
                <section className="border-t border-forest/10 pt-8">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    Scenario Comparison
                  </h2>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-forest/15 bg-white">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-forest/10 text-xs uppercase tracking-wide text-charcoal-soft">
                          <th className="px-4 py-3 font-semibold">Metric</th>
                          {SCENARIO_KEYS.map((key) => (
                            <th
                              key={key}
                              className={`px-4 py-3 font-semibold ${
                                consultingActiveScenario === key ? "bg-forest/10 text-forest" : ""
                              }`}
                            >
                              {SCENARIO_LABELS[key]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: "Net Revenue / yr",
                            format: (r: ConsultingForecastResult) =>
                              formatCurrencyCompact(r.endingNetRevenueAnnualized),
                          },
                          {
                            label: "Utilization",
                            format: (r: ConsultingForecastResult) =>
                              formatPercent(r.endingUtilization, 0),
                          },
                          {
                            label: "EBITDA Margin",
                            format: (r: ConsultingForecastResult) =>
                              formatPercent(r.endingEBITDAMargin),
                          },
                          {
                            label: "Ending Cash",
                            format: (r: ConsultingForecastResult) =>
                              formatCurrencyCompact(r.endingCash),
                          },
                        ].map((row) => (
                          <tr key={row.label} className="border-b border-forest/5 last:border-0">
                            <td className="px-4 py-3 font-semibold text-charcoal">{row.label}</td>
                            {SCENARIO_KEYS.map((key) => (
                              <td
                                key={key}
                                className={`px-4 py-3 text-charcoal-soft ${
                                  consultingActiveScenario === key
                                    ? "bg-forest/5 font-semibold text-charcoal"
                                    : ""
                                }`}
                              >
                                {row.format(consultingScenarioResults[key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Sensitivity */}
                <section className="border-t border-forest/10 pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                      Top Drivers Sensitivity
                    </h2>
                    <div className="flex gap-1 rounded-full border border-forest/20 bg-white p-0.5">
                      {(
                        [
                          { key: "ebitda", label: "EBITDA" },
                          { key: "netRevenue", label: "Net Revenue" },
                          { key: "cash", label: "Cash" },
                        ] as { key: ConsultingSensitivityMetric; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setConsultingSensitivityTab(tab.key)}
                          aria-pressed={consultingSensitivityTab === tab.key}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            consultingSensitivityTab === tab.key
                              ? "bg-forest text-cream"
                              : "text-charcoal-soft hover:text-charcoal"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                    Impact of a +10% change on each driver, on{" "}
                    {consultingSensitivityTab === "ebitda"
                      ? "EBITDA"
                      : consultingSensitivityTab === "netRevenue"
                        ? "net revenue"
                        : "ending cash"}
                    .
                  </p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {(() => {
                      const maxAbsImpact = Math.max(
                        ...consultingSensitivity.map((r) => Math.abs(r.impact)),
                        1
                      );
                      return consultingSensitivity.map((row, i) => {
                        const isPositive = row.impact >= 0;
                        const pct = (Math.abs(row.impact) / maxAbsImpact) * 100;
                        return (
                          <li key={row.key} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-[11px] font-bold text-forest">
                              {i + 1}
                            </span>
                            <span className="w-32 shrink-0 text-xs font-semibold text-charcoal sm:w-40 sm:text-sm">
                              {row.label}
                            </span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                              <span
                                className={`block h-full rounded-full ${isPositive ? "bg-forest" : "bg-rust"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span
                              className={`w-20 shrink-0 text-right text-xs font-semibold sm:text-sm ${
                                isPositive ? "text-forest" : "text-rust"
                              }`}
                            >
                              {formatSignedCompact(row.impact)}
                            </span>
                          </li>
                        );
                      });
                    })()}
                  </ul>
                </section>

                {/* CFO Commentary */}
                <section className="border-t border-forest/10 pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                      CFO Commentary — {consultingScenarioStatusLabel}
                    </h2>
                    <CommentaryModeToggle />
                  </div>
                  <div className="mt-3 flex flex-col gap-3 rounded-xl border border-forest/15 bg-white p-4">
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Performance: </span>
                      Net revenue runs at{" "}
                      {formatCurrencyCompact(consultingResult.endingNetRevenueAnnualized)}/yr on{" "}
                      {formatPercent(consultingResult.endingUtilization, 0)} achieved utilization
                      across {consultingActiveAssumptions.billableHeadcount} billable consultants.
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Profitability: </span>
                      Project margin is {formatPercent(consultingResult.endingProjectMarginPct)}{" "}
                      before SG&amp;A, landing at{" "}
                      {formatPercent(consultingResult.endingEBITDAMargin)} EBITDA margin.
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Cash Position: </span>
                      {consultingResult.runwayMonths === null
                        ? `Ending cash of ${formatCurrencyCompact(consultingResult.endingCash)} is cash-flow positive, removing near-term runway pressure.`
                        : `Ending cash of ${formatCurrencyCompact(consultingResult.endingCash)} implies ${consultingResult.runwayMonths.toFixed(1)} months of runway.`}
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Utilization: </span>
                      Achieved utilization is{" "}
                      {formatPercent(consultingResult.endingUtilization, 0)} against a{" "}
                      {formatPercent(consultingActiveAssumptions.utilizationPct, 0)} target —{" "}
                      {consultingUtilizationStatus === "Healthy"
                        ? "pipeline conversion is comfortably keeping the bench booked"
                        : consultingUtilizationStatus === "Watch"
                          ? "pipeline conversion is only partially keeping the bench booked"
                          : "insufficient pipeline conversion is leaving significant bench time"}
                      .
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Key Risk: </span>
                      {consultingRiskAndAction.keyRiskPhrase}
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Next Action: </span>
                      {consultingRiskAndAction.nextActionPhrase}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                    Generated deterministically from live model outputs — not AI-written.
                  </p>
                </section>
              </>
            )}
            {industry === "realEstate" && (
              <>
                {/* Decision banner */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    Recommendation
                  </h2>
                  <div
                    className={`mt-1.5 rounded-xl px-4 py-2.5 ${DECISION_STYLE[realEstateDecision]}`}
                  >
                    <p className="text-lg font-bold">{realEstateDecision}</p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {realEstateDecisionReasons.map((reason) => (
                        <li
                          key={reason}
                          className="text-sm leading-6 before:mr-2 before:content-['—']"
                        >
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-charcoal">
                    Under these assumptions, {harborViewBaseline.name} runs at{" "}
                    {formatCurrencyCompact(realEstateResult.endingNOIAnnualized)} NOI/yr with a{" "}
                    {formatPercent(realEstateResult.endingFreeCashFlowMargin)} free cash flow
                    margin and {runwayPhrase(realEstateResult.runwayMonths)} — the model&apos;s
                    read is to &ldquo;{realEstateDecision.toLowerCase()}.&rdquo;
                  </p>
                  <p className="mt-1 text-xs leading-4 text-charcoal-soft">
                    Deterministic thresholds: debt service coverage below
                    1.10x &rarr; Preserve cash regardless of runway or
                    margin; 1.10–1.25x &rarr; never better than
                    &ldquo;Run cautiously&rdquo;; otherwise (DSCR
                    &ge;1.25x) runway &gt;18mo + positive free cash flow
                    margin + occupancy not weak &rarr; Invest for growth;
                    runway &ge;12mo &rarr; Run cautiously; else &rarr;
                    Preserve cash.
                  </p>
                </section>

                {/* KPI cards */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    12-Month Outlook
                  </h2>
                  <div className="mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <KpiCard
                      label="Rental Revenue / yr"
                      value={formatCurrencyCompact(realEstateResult.endingRentalRevenueAnnualized)}
                      badge={realEstateScenarioStatusLabel}
                      tone="neutral"
                    />
                    <KpiCard
                      label="NOI / yr"
                      value={formatCurrencyCompact(realEstateResult.endingNOIAnnualized)}
                      badge={realEstateScenarioStatusLabel}
                      tone="neutral"
                    />
                    <KpiCard
                      label="NOI Margin"
                      value={formatPercent(realEstateResult.endingNOIMargin)}
                      badge={realEstateScenarioStatusLabel}
                      tone="neutral"
                    />
                    <KpiCard
                      label="Free Cash Flow / yr"
                      value={formatCurrencyCompact(realEstateResult.endingFreeCashFlowAnnualized)}
                      badge={realEstateRunwayStatus}
                      tone={RUNWAY_TONE[realEstateRunwayStatus]}
                    />
                    <KpiCard
                      label="Ending Cash"
                      value={formatCurrencyCompact(realEstateResult.endingCash)}
                      badge={realEstateCashStatus}
                      tone={
                        realEstateCashStatus === "Strong"
                          ? "good"
                          : realEstateCashStatus === "Adequate"
                            ? "neutral"
                            : "bad"
                      }
                    />
                    <KpiCard
                      label="Runway"
                      value={runwayLabel(realEstateResult.runwayMonths)}
                      badge={realEstateRunwayStatus}
                      tone={RUNWAY_TONE[realEstateRunwayStatus]}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <KpiCard
                      label="Occupancy"
                      value={formatPercent(realEstateActiveAssumptions.occupancyPct, 0)}
                      badge={realEstateOccupancyStatus}
                      tone={
                        realEstateOccupancyStatus === "Healthy"
                          ? "good"
                          : realEstateOccupancyStatus === "Watch"
                            ? "neutral"
                            : "bad"
                      }
                    />
                    <KpiCard
                      label="Debt Service Coverage"
                      value={`${realEstateDscr.toFixed(2)}x`}
                      badge={realEstateDscrStatus}
                      tone={DSCR_TONE[realEstateDscrStatus]}
                    />
                    <KpiCard
                      label="Implied Valuation"
                      value={formatCurrencyCompact(realEstateResult.impliedValuation)}
                      badge="Cap Rate"
                      tone="neutral"
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                    Implied Valuation = annualized NOI ÷ cap rate — cap rate
                    values the asset only, it never enters the cash-flow
                    math. DSCR = annualized NOI ÷ annual debt service.
                  </p>
                </section>

                {/* Cash chart */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    12-Month Cash Trajectory
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                    Rental revenue and NOI are flat under fixed drivers each
                    month — cash is what actually moves, accumulating (or
                    draining) monthly free cash flow after debt service.
                  </p>
                  <GenericForecastChart
                    seriesByScenario={{
                      base: realEstateScenarioResults.base.months.map((m) => m.cash),
                      upside: realEstateScenarioResults.upside.months.map((m) => m.cash),
                      downside: realEstateScenarioResults.downside.months.map((m) => m.cash),
                    }}
                    ariaLabel="12-month cash trajectory under Base, Upside, and Downside scenarios for the real estate portfolio"
                  />
                </section>

                {/* Scenario comparison */}
                <section className="border-t border-forest/10 pt-8">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                    Scenario Comparison
                  </h2>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-forest/15 bg-white">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-forest/10 text-xs uppercase tracking-wide text-charcoal-soft">
                          <th className="px-4 py-3 font-semibold">Metric</th>
                          {SCENARIO_KEYS.map((key) => (
                            <th
                              key={key}
                              className={`px-4 py-3 font-semibold ${
                                realEstateActiveScenario === key
                                  ? "bg-forest/10 text-forest"
                                  : ""
                              }`}
                            >
                              {SCENARIO_LABELS[key]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: "Rental Revenue / yr",
                            format: (r: RealEstateForecastResult) =>
                              formatCurrencyCompact(r.endingRentalRevenueAnnualized),
                          },
                          {
                            label: "NOI / yr",
                            format: (r: RealEstateForecastResult) =>
                              formatCurrencyCompact(r.endingNOIAnnualized),
                          },
                          {
                            label: "Free Cash Flow / yr",
                            format: (r: RealEstateForecastResult) =>
                              formatCurrencyCompact(r.endingFreeCashFlowAnnualized),
                          },
                          {
                            label: "Ending Cash",
                            format: (r: RealEstateForecastResult) =>
                              formatCurrencyCompact(r.endingCash),
                          },
                        ].map((row) => (
                          <tr key={row.label} className="border-b border-forest/5 last:border-0">
                            <td className="px-4 py-3 font-semibold text-charcoal">{row.label}</td>
                            {SCENARIO_KEYS.map((key) => (
                              <td
                                key={key}
                                className={`px-4 py-3 text-charcoal-soft ${
                                  realEstateActiveScenario === key
                                    ? "bg-forest/5 font-semibold text-charcoal"
                                    : ""
                                }`}
                              >
                                {row.format(realEstateScenarioResults[key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Sensitivity */}
                <section className="border-t border-forest/10 pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                      Top Drivers Sensitivity
                    </h2>
                    <div className="flex gap-1 rounded-full border border-forest/20 bg-white p-0.5">
                      {(
                        [
                          { key: "noi", label: "NOI" },
                          { key: "freeCashFlow", label: "Free Cash Flow" },
                          { key: "cash", label: "Cash" },
                          { key: "valuation", label: "Valuation" },
                        ] as { key: RealEstateSensitivityMetric; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setRealEstateSensitivityTab(tab.key)}
                          aria-pressed={realEstateSensitivityTab === tab.key}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            realEstateSensitivityTab === tab.key
                              ? "bg-forest text-cream"
                              : "text-charcoal-soft hover:text-charcoal"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                    Impact of a +10% change on each driver, on{" "}
                    {realEstateSensitivityTab === "noi"
                      ? "NOI"
                      : realEstateSensitivityTab === "freeCashFlow"
                        ? "free cash flow"
                        : realEstateSensitivityTab === "cash"
                          ? "ending cash"
                          : "implied valuation"}
                    .
                  </p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {(() => {
                      const maxAbsImpact = Math.max(
                        ...realEstateSensitivity.map((r) => Math.abs(r.impact)),
                        1
                      );
                      return realEstateSensitivity.map((row, i) => {
                        const isPositive = row.impact >= 0;
                        const pct = (Math.abs(row.impact) / maxAbsImpact) * 100;
                        return (
                          <li key={row.key} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-[11px] font-bold text-forest">
                              {i + 1}
                            </span>
                            <span className="w-32 shrink-0 text-xs font-semibold text-charcoal sm:w-40 sm:text-sm">
                              {row.label}
                            </span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                              <span
                                className={`block h-full rounded-full ${isPositive ? "bg-forest" : "bg-rust"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span
                              className={`w-20 shrink-0 text-right text-xs font-semibold sm:text-sm ${
                                isPositive ? "text-forest" : "text-rust"
                              }`}
                            >
                              {formatSignedCompact(row.impact)}
                            </span>
                          </li>
                        );
                      });
                    })()}
                  </ul>
                </section>

                {/* CFO Commentary */}
                <section className="border-t border-forest/10 pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                      CFO Commentary — {realEstateScenarioStatusLabel}
                    </h2>
                    <CommentaryModeToggle />
                  </div>
                  <div className="mt-3 flex flex-col gap-3 rounded-xl border border-forest/15 bg-white p-4">
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Performance: </span>
                      Rental revenue runs at{" "}
                      {formatCurrencyCompact(realEstateResult.endingRentalRevenueAnnualized)}/yr at{" "}
                      {formatPercent(realEstateActiveAssumptions.occupancyPct, 0)} occupancy across{" "}
                      {realEstateActiveAssumptions.totalUnits} units.
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Profitability: </span>
                      NOI margin is {formatPercent(realEstateResult.endingNOIMargin)}, landing at{" "}
                      {formatPercent(realEstateResult.endingFreeCashFlowMargin)} free cash flow
                      margin after debt service —{" "}
                      {REAL_ESTATE_MARGIN_PHRASE[realEstateMarginStatus]}.
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Cash Position: </span>
                      {realEstateResult.runwayMonths === null
                        ? `Ending cash of ${formatCurrencyCompact(realEstateResult.endingCash)} is cash-flow positive, removing near-term runway pressure.`
                        : `Ending cash of ${formatCurrencyCompact(realEstateResult.endingCash)} implies ${realEstateResult.runwayMonths.toFixed(1)} months of runway.`}
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Debt Coverage: </span>
                      NOI covers debt service at {realEstateDscr.toFixed(2)}x —{" "}
                      {REAL_ESTATE_DSCR_PHRASE[realEstateDscrStatus]}.
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Key Risk: </span>
                      {realEstateRiskAndAction.keyRiskPhrase}
                    </p>
                    <p className="text-sm leading-6 text-charcoal">
                      <span className="font-semibold text-brass">Next Action: </span>
                      {realEstateRiskAndAction.nextActionPhrase}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
                    Generated deterministically from live model outputs — not AI-written.
                  </p>
                </section>
              </>
            )}

            {/* Planned, not built */}
            <section className="border-t border-forest/10 pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Planned — Not In This Version
              </h2>
              <ul className="mt-3 flex flex-col gap-1.5">
                {["AI-generated commentary"].map(
                  (item) => (
                    <li
                      key={item}
                      className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
                    >
                      {item}
                    </li>
                  )
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

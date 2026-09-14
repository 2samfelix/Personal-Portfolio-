"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AVG_FULLY_LOADED_COST_PER_EMPLOYEE,
  FIXED_GA_MONTHLY,
  classifyArrTrend,
  classifyCash,
  classifyMargin,
  classifyRunway,
  compareToBase,
  decideStance,
  diffFromBase,
  explainDecision,
  getSensitivityDetail,
  northstarBaseline,
  runSaaSForecast,
  runSaaSSensitivity,
  scenarioPresets,
  type ArrTrend,
  type CashStatus,
  type Decision,
  type MarginStatus,
  type RunwayStatus,
  type SaaSAssumptions,
  type SaaSForecastResult,
  type ScenarioKey,
  type SensitivityDriverKey,
} from "@/lib/models/saas";
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSignedCompact } from "@/lib/format";

const SCENARIO_KEYS: ScenarioKey[] = ["base", "upside", "downside"];

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
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-forest/15 accent-forest"
      />
    </label>
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
  Healthy: "good",
  Watch: "neutral",
  Negative: "bad",
};
const CASH_TONE: Record<CashStatus, BadgeTone> = {
  Strong: "good",
  Adequate: "neutral",
  Low: "bad",
};
const RUNWAY_TONE: Record<RunwayStatus, BadgeTone> = {
  Safe: "good",
  "Self-funded": "good",
  Watch: "neutral",
  Critical: "bad",
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
    <div className="flex flex-col gap-1.5 rounded-xl border border-forest/15 bg-white p-4">
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

// Formats a raw assumption value the way its slider displays it, for reuse
// in the comparison table's "What changed vs Base?" panel.
function formatAssumptionValue(key: SensitivityDriverKey, value: number): string {
  switch (key) {
    case "monthlyGrowthRate":
    case "monthlyChurnRate":
      return formatPercent(value, 1);
    case "pricingChangePct":
      return `${value >= 0 ? "+" : ""}${formatPercent(value, 1)}`;
    case "grossMarginPct":
      return formatPercent(value, 0);
    case "headcount":
      return `${Math.round(value)}`;
    case "annualSalesMarketing":
      return formatCurrencyCompact(value);
    default:
      return `${value}`;
  }
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

type ChartMetric = "mrr" | "cash";

function ForecastChart({
  seriesByScenario,
  metric,
  ariaLabel,
}: {
  seriesByScenario: Record<ScenarioKey, SaaSForecastResult>;
  metric: ChartMetric;
  ariaLabel: string;
}) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  const { minValue, maxValue } = useMemo(() => {
    const all = SCENARIO_KEYS.flatMap((key) =>
      seriesByScenario[key].months.map((m) => m[metric])
    );
    const rawMin = Math.min(0, ...all);
    const rawMax = Math.max(...all);
    const pad = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.12 || 1;
    return {
      minValue: rawMin < 0 ? rawMin - pad : 0,
      maxValue: rawMax + pad,
    };
  }, [seriesByScenario, metric]);

  const showZeroLine = minValue < 0 && maxValue > 0;
  const gridFracs = [0, 0.25, 0.5, 0.75, 1];
  const gridValues = gridFracs.map((f) => minValue + (maxValue - minValue) * f);

  // Direct end-labels can collide when two series end at similar values —
  // nudge them apart vertically, closest-first, so text never overlaps.
  const endLabelY = useMemo(() => {
    const raw = SCENARIO_KEYS.map((key) => {
      const months = seriesByScenario[key].months;
      const last = months[months.length - 1];
      return { key, y: valueY(last[metric], minValue, maxValue) };
    }).sort((a, b) => a.y - b.y);

    const minGap = 12;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y - raw[i - 1].y < minGap) {
        raw[i].y = raw[i - 1].y + minGap;
      }
    }
    return Object.fromEntries(raw.map((r) => [r.key, r.y])) as Record<ScenarioKey, number>;
  }, [seriesByScenario, metric, minValue, maxValue]);

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
            {formatCurrencyCompact(v)}
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
        {SCENARIO_KEYS.map((key) => {
          const style = SERIES_STYLE[key];
          const points = seriesByScenario[key].months
            .map((m) => `${monthX(m.month)},${valueY(m[metric], minValue, maxValue)}`)
            .join(" ");
          return (
            <polyline
              key={key}
              points={points}
              fill="none"
              stroke={style.stroke}
              strokeWidth={2}
              strokeDasharray={style.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Direct end labels — a cream halo (paintOrder stroke) keeps the
            label legible where a line's own dashes pass close behind it. */}
        {SCENARIO_KEYS.map((key) => {
          const style = SERIES_STYLE[key];
          return (
            <text
              key={key}
              x={CHART_WIDTH - PAD_RIGHT - 4}
              y={endLabelY[key] - 6}
              textAnchor="end"
              fontSize={10}
              fontWeight={700}
              fill={style.stroke}
              stroke="#f5f1e6"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {style.label}
            </text>
          );
        })}

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
              const boxHeight = 62;
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
                  {SCENARIO_KEYS.map((key, i) => (
                    <text
                      key={key}
                      x={10}
                      y={32 + i * 13}
                      fontSize={10}
                      fill={SERIES_STYLE[key].stroke}
                    >
                      {SERIES_STYLE[key].label}:{" "}
                      {formatCurrencyCompact(
                        seriesByScenario[key].months[hoverMonth - 1][metric]
                      )}
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
        {SCENARIO_KEYS.map((key) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-charcoal-soft">
            <span className={`h-2.5 w-2.5 rounded-full ${SERIES_STYLE[key].swatchClass}`} />
            {SERIES_STYLE[key].label}
          </span>
        ))}
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

const COMPARISON_COLUMN_LABEL: Record<ScenarioKey | "custom", string> = {
  base: "Base",
  upside: "Upside",
  downside: "Downside",
  custom: "Custom",
};

function ScenarioComparisonTable({
  scenarioResults,
  activeResult,
  activeColumn,
}: {
  scenarioResults: Record<ScenarioKey, SaaSForecastResult>;
  activeResult: SaaSForecastResult;
  activeColumn: ScenarioKey | "custom";
}) {
  const columns: { key: ScenarioKey | "custom"; result: SaaSForecastResult }[] = [
    { key: "base", result: scenarioResults.base },
    { key: "upside", result: scenarioResults.upside },
    { key: "downside", result: scenarioResults.downside },
    ...(activeColumn === "custom" ? [{ key: "custom" as const, result: activeResult }] : []),
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
                {COMPARISON_COLUMN_LABEL[col.key]}
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

export default function FpaDecisionLab() {
  const [selectedPreset, setSelectedPreset] = useState<ScenarioKey>("base");
  const [assumptions, setAssumptions] = useState<SaaSAssumptions>(
    scenarioPresets.base.assumptions
  );
  const [expandedDriver, setExpandedDriver] = useState<SensitivityDriverKey | null>(null);

  const set = <K extends keyof SaaSAssumptions>(key: K) => (value: number) =>
    setAssumptions((prev) => ({ ...prev, [key]: value }));

  const applyPreset = (key: ScenarioKey) => {
    setSelectedPreset(key);
    setAssumptions(scenarioPresets[key].assumptions);
  };

  // The three canonical scenario forecasts always drive both charts and the
  // comparison table, so they stay a stable reference regardless of slider
  // tweaks below.
  const scenarioResults = useMemo(
    () => ({
      base: runSaaSForecast(scenarioPresets.base.assumptions),
      upside: runSaaSForecast(scenarioPresets.upside.assumptions),
      downside: runSaaSForecast(scenarioPresets.downside.assumptions),
    }),
    []
  );

  // The currently tunable assumptions drive the KPI cards, banner,
  // commentary, and sensitivity panel.
  const activeResult = useMemo(() => runSaaSForecast(assumptions), [assumptions]);
  const sensitivity = useMemo(() => runSaaSSensitivity(assumptions), [assumptions]);
  const decision = decideStance(
    activeResult.runwayMonths,
    activeResult.endingEBITDAMargin
  );
  const decisionReasons = useMemo(
    () => explainDecision(activeResult, decision),
    [activeResult, decision]
  );

  const isCustomized =
    JSON.stringify(assumptions) !==
    JSON.stringify(scenarioPresets[selectedPreset].assumptions);
  const activeColumn: ScenarioKey | "custom" = isCustomized ? "custom" : selectedPreset;

  const isBaseCase =
    JSON.stringify(assumptions) === JSON.stringify(scenarioPresets.base.assumptions);
  const baseChanges = useMemo(
    () => (isBaseCase ? [] : diffFromBase(assumptions)),
    [assumptions, isBaseCase]
  );
  const baseImpact = useMemo(
    () => compareToBase(activeResult, scenarioResults.base),
    [activeResult, scenarioResults]
  );

  const sensitivityDetail = useMemo(
    () => (expandedDriver ? getSensitivityDetail(assumptions, expandedDriver) : null),
    [assumptions, expandedDriver]
  );

  const arrTrend = classifyArrTrend(activeResult);
  const marginStatus = classifyMargin(activeResult.endingEBITDAMargin);
  const cashStatus = classifyCash(activeResult.endingCash);
  const runwayStatus = classifyRunway(activeResult.runwayMonths);

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link
          href="/#builds"
          className="text-sm font-semibold text-forest hover:text-forest-dark"
        >
          &larr; Back to Builds
        </Link>

        {/* Hero */}
        <div className="mt-8">
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
          A small SaaS financial-planning simulator built around a fictional
          company, {northstarBaseline.name}. Pick a scenario or tune the
          assumptions yourself — a 12-month engine recomputes MRR, EBITDA,
          cash, and a rules-based recommendation live.
        </p>

        {/* Scenario selector */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Scenario
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {SCENARIO_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  selectedPreset === key && !isCustomized
                    ? "bg-forest text-cream"
                    : "bg-white text-charcoal border border-forest/20 hover:border-forest/40"
                }`}
              >
                {scenarioPresets[key].label}
              </button>
            ))}
          </div>
          {isCustomized && (
            <p className="mt-2 text-xs text-charcoal-soft">
              Assumptions customized from the {scenarioPresets[selectedPreset].label} preset below.
            </p>
          )}
        </section>

        {/* Inputs */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
              Assumptions
            </h2>
            <span className="rounded-full bg-forest/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest">
              Illustrative sample data
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <SliderField
              label="Monthly Customer Growth Rate"
              value={assumptions.monthlyGrowthRate * 100}
              onChange={(v) => set("monthlyGrowthRate")(v / 100)}
              min={0}
              max={15}
              step={0.5}
              display={formatPercent(assumptions.monthlyGrowthRate)}
            />
            <SliderField
              label="Monthly Churn Rate"
              value={assumptions.monthlyChurnRate * 100}
              onChange={(v) => set("monthlyChurnRate")(v / 100)}
              min={0}
              max={6}
              step={0.1}
              display={formatPercent(assumptions.monthlyChurnRate)}
            />
            <SliderField
              label="Pricing Change"
              value={assumptions.pricingChangePct * 100}
              onChange={(v) => set("pricingChangePct")(v / 100)}
              min={-5}
              max={10}
              step={0.5}
              display={`${assumptions.pricingChangePct >= 0 ? "+" : ""}${formatPercent(
                assumptions.pricingChangePct
              )}`}
            />
            <SliderField
              label="Gross Margin"
              value={assumptions.grossMarginPct * 100}
              onChange={(v) => set("grossMarginPct")(v / 100)}
              min={50}
              max={95}
              step={1}
              display={formatPercent(assumptions.grossMarginPct, 0)}
            />
            <SliderField
              label="Headcount"
              value={assumptions.headcount}
              onChange={set("headcount")}
              min={15}
              max={50}
              step={1}
              display={`${assumptions.headcount} heads`}
            />
            <SliderField
              label="Annual Sales & Marketing Spend"
              value={assumptions.annualSalesMarketing}
              onChange={set("annualSalesMarketing")}
              min={300_000}
              max={1_500_000}
              step={25_000}
              display={formatCurrencyCompact(assumptions.annualSalesMarketing)}
            />
          </div>
          <p className="mt-5 text-xs leading-5 text-charcoal-soft">
            Modeling assumptions disclosed for transparency: avg. fully-loaded
            cost per employee ~{formatCurrencyCompact(AVG_FULLY_LOADED_COST_PER_EMPLOYEE)}
            /yr, fixed G&amp;A ~{formatCurrencyCompact(FIXED_GA_MONTHLY)}/mo.
          </p>
        </section>

        {/* KPI cards */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            12-Month Outlook
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Ending ARR"
              value={formatCurrencyCompact(activeResult.endingARR)}
              badge={arrTrend}
              tone={ARR_TONE[arrTrend]}
            />
            <KpiCard
              label="EBITDA Margin"
              value={formatPercent(activeResult.endingEBITDAMargin)}
              badge={marginStatus}
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
          <p className="mt-3 text-[11px] leading-5 text-charcoal-soft">
            Status thresholds: ARR uses the change from month 1 to month 12
            (&gt;+5% Growing, ±5% Flat, &lt;-5% Contracting). Margin: &gt;0%
            Healthy, -40–0% Watch, &lt;-40% Negative. Cash: &ge;90% of
            starting cash Strong, 50–90% Adequate, &lt;50% Low. Runway:
            &gt;18mo Safe, 12–18mo Watch, &lt;12mo Critical, cash-flow
            positive Self-funded.
          </p>
        </section>

        {/* Scenario comparison table */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Scenario Comparison
          </h2>
          <div className="mt-4">
            <ScenarioComparisonTable
              scenarioResults={scenarioResults}
              activeResult={activeResult}
              activeColumn={activeColumn}
            />
          </div>
        </section>

        {/* Decision banner */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Recommendation
          </h2>
          <div className={`mt-4 rounded-xl px-5 py-4 ${DECISION_STYLE[decision]}`}>
            <p className="text-lg font-bold">{decision}</p>
            <ul className="mt-2 flex flex-col gap-1">
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
          <p className="mt-3 text-sm leading-6 text-charcoal-soft">
            Deterministic rule, not a model guess: runway &gt; 18 months and a
            positive EBITDA margin call for &ldquo;Invest for growth,&rdquo;
            12–18 months of runway calls for &ldquo;Run cautiously,&rdquo; and
            under 12 months calls for &ldquo;Preserve cash.&rdquo;
          </p>
          <p className="mt-4 text-base leading-7 text-charcoal">
            Under these assumptions, {northstarBaseline.name} ends the year at{" "}
            {formatCurrency(activeResult.endingARR)} ARR with a{" "}
            {formatPercent(activeResult.endingEBITDAMargin)} EBITDA margin and{" "}
            {runwayPhrase(activeResult.runwayMonths)}{" "}
            — the model&apos;s read is to &ldquo;{decision.toLowerCase()}.&rdquo;
          </p>
        </section>

        {/* What changed vs Base? */}
        {!isBaseCase && baseChanges.length > 0 && (
          <section className="mt-12 border-t border-forest/10 pt-12">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
              What Changed vs Base?
            </h2>
            <div className="mt-4 rounded-xl border border-forest/15 bg-white p-4">
              <ul className="flex flex-col gap-1.5">
                {baseChanges.map((change) => (
                  <li
                    key={change.key}
                    className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
                  >
                    <span className="font-semibold text-charcoal">{change.label}</span>:{" "}
                    {formatAssumptionValue(change.key, change.fromValue)} &rarr;{" "}
                    {formatAssumptionValue(change.key, change.toValue)}
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-forest/10 pt-4 sm:grid-cols-3">
                <div className="text-sm">
                  <span className="text-charcoal-soft">Ending ARR: </span>
                  <span className="font-semibold text-charcoal">
                    {formatSignedCompact(baseImpact.arrDelta)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-charcoal-soft">EBITDA Margin: </span>
                  <span className="font-semibold text-charcoal">
                    {baseImpact.marginDeltaPts >= 0 ? "+" : ""}
                    {baseImpact.marginDeltaPts.toFixed(1)} pts
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-charcoal-soft">Ending Cash: </span>
                  <span className="font-semibold text-charcoal">
                    {formatSignedCompact(baseImpact.cashDelta)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main chart */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            12-Month MRR Forecast
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            The three scenario lines always reflect their own fixed
            assumptions, independent of the sliders above — a stable
            comparison while you tune your own case.
          </p>
          <ForecastChart
            seriesByScenario={scenarioResults}
            metric="mrr"
            ariaLabel="12-month MRR forecast under Base, Upside, and Downside scenarios"
          />
        </section>

        {/* Cash chart */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            12-Month Cash Balance Forecast
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            Same three scenarios, tracking ending cash instead of revenue —
            watch how a scenario that turns cash-flow positive levels off
            rather than continuing to decline.
          </p>
          <ForecastChart
            seriesByScenario={scenarioResults}
            metric="cash"
            ariaLabel="12-month cash balance forecast under Base, Upside, and Downside scenarios"
          />
        </section>

        {/* Sensitivity panel */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            What Moves EBITDA Most (±10%)
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            Click a driver to see its current value and the impact of ±10% on
            cumulative 12-month EBITDA.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {sensitivity.map((row, i) => {
              const isExpanded = expandedDriver === row.key;
              return (
                <li key={row.key} className="rounded-lg border border-forest/15 bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedDriver(isExpanded ? null : row.key)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest/10 text-xs font-bold text-forest">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-charcoal">
                        {row.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-brass">
                        {formatCurrency(row.range)} swing
                      </span>
                      <span className="text-charcoal-soft">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </span>
                  </button>
                  {isExpanded && sensitivityDetail && sensitivityDetail.key === row.key && (
                    <div className="grid grid-cols-1 gap-3 border-t border-forest/10 px-4 py-3 text-xs sm:grid-cols-3">
                      <div>
                        <span className="block text-charcoal-soft">Current value</span>
                        <span className="font-semibold text-charcoal">
                          {formatAssumptionValue(row.key, sensitivityDetail.baseValue)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-charcoal-soft">
                          -10% ({formatAssumptionValue(row.key, sensitivityDetail.downValue)})
                          cumulative EBITDA
                        </span>
                        <span className="font-semibold text-rust">
                          {formatCurrency(sensitivityDetail.downCumulativeEBITDA)}{" "}
                          (
                          {formatSignedCompact(
                            sensitivityDetail.downCumulativeEBITDA -
                              sensitivityDetail.baseCumulativeEBITDA
                          )}
                          )
                        </span>
                      </div>
                      <div>
                        <span className="block text-charcoal-soft">
                          +10% ({formatAssumptionValue(row.key, sensitivityDetail.upValue)})
                          cumulative EBITDA
                        </span>
                        <span className="font-semibold text-forest">
                          {formatCurrency(sensitivityDetail.upCumulativeEBITDA)}{" "}
                          (
                          {formatSignedCompact(
                            sensitivityDetail.upCumulativeEBITDA -
                              sensitivityDetail.baseCumulativeEBITDA
                          )}
                          )
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Planned, not built */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Planned — Not In This Version
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {[
              "Additional industry models beyond SaaS",
              "CSV upload of real company data",
              "AI-generated commentary",
              "Save / share a scenario",
              "NRR and LTV:CAC metrics",
              "Random-data / Monte Carlo mode",
            ].map((item) => (
              <li
                key={item}
                className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

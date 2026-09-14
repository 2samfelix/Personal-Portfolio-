"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AVG_FULLY_LOADED_COST_PER_EMPLOYEE,
  FIXED_GA_MONTHLY,
  decideStance,
  northstarBaseline,
  runSaaSForecast,
  runSaaSSensitivity,
  scenarioPresets,
  type Decision,
  type SaaSAssumptions,
  type SaaSMonthResult,
  type ScenarioKey,
} from "@/lib/models/saas";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/format";

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

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-forest/15 bg-white p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">
        {label}
      </span>
      <span className="text-2xl font-black tracking-tight text-charcoal">
        {value}
      </span>
      {sub && <span className="text-xs text-charcoal-soft">{sub}</span>}
    </div>
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

function valueY(value: number, maxValue: number) {
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const ratio = maxValue === 0 ? 0 : value / maxValue;
  return PAD_TOP + innerHeight * (1 - ratio);
}

function MrrChart({
  seriesByScenario,
}: {
  seriesByScenario: Record<ScenarioKey, SaaSMonthResult[]>;
}) {
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  const maxMrr = useMemo(() => {
    const all = SCENARIO_KEYS.flatMap((key) =>
      seriesByScenario[key].map((m) => m.mrr)
    );
    return Math.max(...all) * 1.12;
  }, [seriesByScenario]);

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => valueY(maxMrr * f, maxMrr));

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="12-month MRR forecast under Base, Upside, and Downside scenarios"
      >
        {/* Gridlines */}
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={PAD_LEFT}
            x2={CHART_WIDTH - PAD_RIGHT}
            y1={y}
            y2={y}
            stroke="#1e3a2b"
            strokeOpacity={0.08}
          />
        ))}

        {/* Y axis labels */}
        {[0.5, 1].map((f) => (
          <text
            key={f}
            x={PAD_LEFT - 8}
            y={valueY(maxMrr * f, maxMrr) + 4}
            textAnchor="end"
            className="fill-charcoal-soft text-[10px]"
          >
            {formatCurrencyCompact(maxMrr * f)}
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
          const points = seriesByScenario[key]
            .map((m) => `${monthX(m.month)},${valueY(m.mrr, maxMrr)}`)
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

        {/* Direct end labels */}
        {SCENARIO_KEYS.map((key) => {
          const style = SERIES_STYLE[key];
          const last = seriesByScenario[key][seriesByScenario[key].length - 1];
          return (
            <text
              key={key}
              x={monthX(last.month) - 4}
              y={valueY(last.mrr, maxMrr) - 6}
              textAnchor="end"
              fontSize={10}
              fontWeight={700}
              fill={style.stroke}
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
                        seriesByScenario[key][hoverMonth - 1].mrr
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

export default function FpaDecisionLab() {
  const [selectedPreset, setSelectedPreset] = useState<ScenarioKey>("base");
  const [assumptions, setAssumptions] = useState<SaaSAssumptions>(
    scenarioPresets.base.assumptions
  );

  const set = <K extends keyof SaaSAssumptions>(key: K) => (value: number) =>
    setAssumptions((prev) => ({ ...prev, [key]: value }));

  const applyPreset = (key: ScenarioKey) => {
    setSelectedPreset(key);
    setAssumptions(scenarioPresets[key].assumptions);
  };

  // The three canonical scenario forecasts always drive the chart, so it
  // stays a stable comparison reference regardless of slider tweaks below.
  const scenarioForecasts = useMemo(
    () => ({
      base: runSaaSForecast(scenarioPresets.base.assumptions).months,
      upside: runSaaSForecast(scenarioPresets.upside.assumptions).months,
      downside: runSaaSForecast(scenarioPresets.downside.assumptions).months,
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

  const isCustomized =
    JSON.stringify(assumptions) !==
    JSON.stringify(scenarioPresets[selectedPreset].assumptions);

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
            <KpiCard label="Ending ARR" value={formatCurrencyCompact(activeResult.endingARR)} />
            <KpiCard
              label="EBITDA Margin"
              value={formatPercent(activeResult.endingEBITDAMargin)}
            />
            <KpiCard label="Ending Cash" value={formatCurrencyCompact(activeResult.endingCash)} />
            <KpiCard label="Runway" value={runwayLabel(activeResult.runwayMonths)} />
          </div>
        </section>

        {/* Decision banner */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Recommendation
          </h2>
          <div className={`mt-4 rounded-xl px-5 py-4 text-lg font-bold ${DECISION_STYLE[decision]}`}>
            {decision}
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
          <MrrChart seriesByScenario={scenarioForecasts} />
        </section>

        {/* Sensitivity panel */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            What Moves EBITDA Most (±10%)
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {sensitivity.map((row, i) => (
              <li
                key={row.key}
                className="flex items-center justify-between rounded-lg border border-forest/15 bg-white px-4 py-3"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest/10 text-xs font-bold text-forest">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-charcoal">
                    {row.label}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brass">
                  {formatCurrency(row.range)} swing
                </span>
              </li>
            ))}
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

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calcEBITDA,
  defaultSimulatorInputs,
  formatCurrency,
  formatCurrencyCompact,
  formatSignedCompact,
  runTornadoAnalysis,
  type SimulatorInputs,
} from "@/lib/simulator";

const FLEX_PCT = 0.05;

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-lg border border-forest/20 bg-white px-3 py-2">
        <input
          type="number"
          value={value}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-sm font-semibold text-charcoal outline-none"
        />
        {suffix && (
          <span className="shrink-0 text-xs font-medium text-charcoal-soft">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function TreeBox({
  title,
  formula,
  value,
}: {
  title: string;
  formula: string;
  value: string;
}) {
  return (
    <div className="flex min-w-[150px] flex-col items-center gap-1 rounded-xl border border-forest/20 bg-white px-4 py-3 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brass">
        {title}
      </span>
      <span className="text-lg font-black tracking-tight text-charcoal">
        {value}
      </span>
      <span className="text-[11px] leading-4 text-charcoal-soft">
        {formula}
      </span>
    </div>
  );
}

function Connector() {
  return (
    <span className="my-1 text-xl font-bold text-forest/40 sm:mx-2 sm:my-0" aria-hidden>
      <span className="sm:hidden">&darr;</span>
      <span className="hidden sm:inline">&rarr;</span>
    </span>
  );
}

function TornadoBar({
  label,
  downDelta,
  upDelta,
  maxAbsDelta,
}: {
  label: string;
  downDelta: number;
  upDelta: number;
  maxAbsDelta: number;
}) {
  const scale = (delta: number) =>
    maxAbsDelta === 0 ? 0 : (Math.abs(delta) / maxAbsDelta) * 46;

  const downWidth = scale(downDelta);
  const upWidth = scale(upDelta);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-charcoal">{label}</span>
        <span className="text-charcoal-soft">
          {formatSignedCompact(downDelta)} / {formatSignedCompact(upDelta)}
        </span>
      </div>
      <div className="relative h-7 w-full rounded-md bg-mist">
        <div className="absolute inset-y-0 left-1/2 w-px bg-forest/30" />
        <div
          className={`absolute inset-y-0 flex items-center justify-end rounded-l-md pr-1.5 text-[10px] font-semibold text-cream ${
            downDelta >= 0 ? "bg-forest" : "bg-rust"
          }`}
          style={{
            right: `${50 - Math.min(downWidth, 50)}%`,
            width: `${Math.min(downWidth, 50)}%`,
          }}
        >
          {downWidth > 8 ? "-5%" : ""}
        </div>
        <div
          className={`absolute inset-y-0 left-1/2 flex items-center rounded-r-md pl-1.5 text-[10px] font-semibold text-cream ${
            upDelta >= 0 ? "bg-forest" : "bg-rust"
          }`}
          style={{
            width: `${Math.min(upWidth, 50)}%`,
          }}
        >
          {upWidth > 8 ? "+5%" : ""}
        </div>
      </div>
    </div>
  );
}

export default function DriverSensitivitySimulator() {
  const [inputs, setInputs] = useState<SimulatorInputs>(defaultSimulatorInputs);

  const set = (key: keyof SimulatorInputs) => (value: number) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const base = useMemo(() => calcEBITDA(inputs), [inputs]);
  const { rows } = useMemo(
    () => runTornadoAnalysis(inputs, FLEX_PCT),
    [inputs]
  );
  const maxAbsDelta = useMemo(
    () =>
      Math.max(
        ...rows.map((r) => Math.max(Math.abs(r.downDelta), Math.abs(r.upDelta)))
      ),
    [rows]
  );

  const topDriver = rows[0];
  const steadiestDriver = rows[rows.length - 1];
  const margin = base.revenue === 0 ? 0 : (base.ebitda / base.revenue) * 100;

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link
          href="/#interactive-tools"
          className="text-sm font-semibold text-forest hover:text-forest-dark"
        >
          &larr; Back to Interactive Tools
        </Link>

        {/* Hero */}
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">
            Interactive Demo
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
            Driver Sensitivity Simulator
          </h1>
          <p className="mt-6 max-w-2xl text-xl italic leading-8 text-charcoal-soft">
            &ldquo;Which single assumption, if it moved, would change the
            answer?&rdquo;
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-rust-pale px-4 py-2 text-xs font-semibold text-rust">
            <span className="text-sm">&#9888;</span>
            DEMO — illustrative sample data, not a real client engagement
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-base leading-7 text-charcoal-soft">
          This tool is a small, hand-built model of how I approach sensitivity
          analysis: pick a KPI, flex each driver a fixed amount in isolation,
          and see which one actually moves the outcome. Edit the inputs below
          — the KPI tree, tornado chart, table, and narrative all recalculate
          live.
        </p>

        {/* Inputs */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
              Inputs
            </h2>
            <span className="rounded-full bg-forest/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest">
              Illustrative sample data
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Price"
              value={inputs.price}
              onChange={set("price")}
              suffix="$ / unit"
            />
            <NumberField
              label="Volume"
              value={inputs.volume}
              onChange={set("volume")}
              suffix="units"
              step={1000}
            />
            <NumberField
              label="COGS % of Revenue"
              value={Math.round(inputs.cogsPct * 1000) / 10}
              onChange={(v) => set("cogsPct")(v / 100)}
              suffix="%"
              step={0.5}
            />
            <NumberField
              label="Operating Expenses"
              value={inputs.opex}
              onChange={set("opex")}
              suffix="$"
              step={10000}
            />
          </div>
          <button
            type="button"
            onClick={() => setInputs(defaultSimulatorInputs)}
            className="mt-4 text-xs font-semibold text-forest hover:text-forest-dark"
          >
            Reset to default sample data
          </button>
        </section>

        {/* KPI decomposition tree */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            KPI Decomposition
          </h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-y-1 sm:flex-row sm:flex-wrap sm:gap-y-4 sm:overflow-x-auto">
            <TreeBox
              title="Price × Volume"
              formula="Revenue"
              value={formatCurrencyCompact(base.revenue)}
            />
            <Connector />
            <TreeBox
              title="Revenue − COGS"
              formula="Gross Profit"
              value={formatCurrencyCompact(base.grossProfit)}
            />
            <Connector />
            <TreeBox
              title="Gross Profit − OpEx"
              formula="EBITDA"
              value={formatCurrencyCompact(base.ebitda)}
            />
          </div>
          <p className="mt-4 text-center text-xs text-charcoal-soft">
            EBITDA margin: {margin.toFixed(1)}%
          </p>
        </section>

        {/* Tornado chart */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Tornado Sensitivity (±5% Flex)
          </h2>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            Each driver is flexed ±5% in isolation, holding all others at
            their base value. COGS is unit-driven: when Price is flexed, COGS
            is held at its base, Volume-derived dollar amount rather than
            recalculated against the flexed revenue.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {rows.map((row) => (
              <TornadoBar
                key={row.key}
                label={row.label}
                downDelta={row.downDelta}
                upDelta={row.upDelta}
                maxAbsDelta={maxAbsDelta}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-charcoal-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-forest" /> Improves
              EBITDA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rust" /> Reduces
              EBITDA
            </span>
          </div>
        </section>

        {/* Sensitivity table */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Sensitivity Table
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-forest/15 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10 text-xs uppercase tracking-wide text-charcoal-soft">
                  <th className="px-4 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">-5% EBITDA</th>
                  <th className="px-4 py-3 font-semibold">Base EBITDA</th>
                  <th className="px-4 py-3 font-semibold">+5% EBITDA</th>
                  <th className="px-4 py-3 font-semibold">Range</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-forest/5 last:border-0">
                    <td className="px-4 py-3 font-semibold text-charcoal">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-charcoal-soft">
                      {formatCurrency(row.downEbitda)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-soft">
                      {formatCurrency(base.ebitda)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-soft">
                      {formatCurrency(row.upEbitda)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-forest">
                      {formatCurrency(row.range)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Narrative */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Narrative
          </h2>
          <p className="mt-3 text-lg font-medium leading-8 text-charcoal">
            At these inputs, EBITDA is most sensitive to{" "}
            <span className="text-brass">{topDriver.label}</span> — a ±5%
            flex swings EBITDA by {formatCurrency(topDriver.range)}, from{" "}
            {formatCurrency(Math.min(topDriver.downEbitda, topDriver.upEbitda))}{" "}
            to{" "}
            {formatCurrency(Math.max(topDriver.downEbitda, topDriver.upEbitda))}
            . {steadiestDriver.label} is the least impactful driver in this
            range, moving EBITDA by only {formatCurrency(steadiestDriver.range)}
            . Base-case EBITDA is {formatCurrency(base.ebitda)} on{" "}
            {formatCurrency(base.revenue)} of revenue, a {margin.toFixed(1)}%
            margin.
          </p>
        </section>
      </div>
    </main>
  );
}

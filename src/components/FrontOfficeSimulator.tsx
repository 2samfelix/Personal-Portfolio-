"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ACTUAL_2025_PLAYOFF_RESULT,
  ACTUAL_2025_RECORD,
  ACTUAL_2025_SEED,
  ACTUAL_2025_WIN_TOTAL,
  DEVELOPMENT_BOOST_MAX,
  FIXED_OVERHEAD,
  FIXED_OVERHEAD_SHARE_OF_REVENUE,
  FRONT_OFFICE_BASE_DEFAULTS,
  FRONT_OFFICE_DRIVERS,
  OPERATING_RESULT,
  PAYROLL_EQUALS_CAP_ASSUMPTION,
  PLAYER_COST_YOY_CHANGE,
  SALARY_CAP,
  SALARY_FLOOR,
  SALARY_FLOOR_PCT,
  TOTAL_REVENUE,
  buildNfcField,
  clampToDriverBounds,
  runFrontOfficeSimulation,
  type FrontOfficeAssumptions,
  type FrontOfficeDriverKey,
  type FrontOfficeResult,
  type NfcFieldTeam,
} from "@/lib/models/frontOffice";
import type { BadgeTone, DriverConfig } from "@/lib/models/shared";
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSignedCompact } from "@/lib/format";

// ============================================================================
// NFC standings — a thin display wrapper around the model's own
// buildNfcField(). The real 15-team field, the seeding rules, and the
// "insert the Packers at their live win total" logic all live in
// src/lib/models/frontOffice.ts now (not here), because the engine itself
// needs that exact same seed to decide playoff hosting/revenue — see the
// "One Seed, Everywhere" note in Assumptions & Limitations below. This
// file only sorts the 16 already-seeded rows for display.
// ============================================================================

type StandingsRow = NfcFieldTeam & {
  displayRecord: string;
  seedLabel: string | null;
};

function formatProjectedWins(wins: number): string {
  return `${wins.toFixed(2)} projected wins`;
}

function buildStandings(result: FrontOfficeResult): StandingsRow[] {
  const field = buildNfcField(result.wins); // always exactly 16 teams — see buildNfcField's own doc comment
  const rows: StandingsRow[] = field.map((t) => ({
    ...t,
    displayRecord: t.isPackers ? formatProjectedWins(result.wins) : t.record!,
    seedLabel: t.seed !== null ? `${t.seed}${t.isPackers ? " (modeled)" : ""}` : null,
  }));

  // Playoff teams ordered by seed (1-7) — NOT by win total, since a
  // division winner can and legitimately does outrank a better-record
  // wild card (see isDivisionWinner). Non-playoff teams below the line are
  // sorted by win total, since seed doesn't apply to them.
  const playoffTeams = rows.filter((r) => r.seed !== null).sort((a, b) => a.seed! - b.seed!);
  const nonPlayoffTeams = rows.filter((r) => r.seed === null).sort((a, b) => b.wins - a.wins);
  return [...playoffTeams, ...nonPlayoffTeams];
}

// ============================================================================
// UI-only presentation helpers — bands and tones invented for this screen,
// not exported model constants. Disclosed as such rather than presented as
// engine output.
// ============================================================================

const TONE_CLASS: Record<BadgeTone, string> = {
  good: "bg-forest/10 text-forest",
  neutral: "bg-brass/15 text-brass",
  bad: "bg-rust-pale text-rust",
};

const ALERT_STYLE: Record<BadgeTone, string> = {
  good: "bg-forest/5 text-charcoal",
  neutral: "bg-brass-pale text-brass",
  bad: "bg-rust-pale text-rust",
};

function playoffTone(result: FrontOfficeResult): BadgeTone {
  if (!result.playoff.madePlayoffs) return "bad";
  if (result.playoff.result === "Lost Wild Card Round" || result.playoff.result === "Lost Divisional Round") {
    return "neutral";
  }
  return "good";
}

function healthTone(health: number): BadgeTone {
  if (health >= 60) return "good";
  if (health >= 40) return "neutral";
  return "bad";
}

// Distance from the FY2026 baseline lever value, the same "vs Base"
// convention the Decision Lab uses — display only, computed from numbers
// already on screen.
function vsBaseline(current: number, base: number): { text: string; tone: BadgeTone } | null {
  if (current === base) return null;
  const delta = current - base;
  const tone: BadgeTone = "neutral";
  return { text: `${delta > 0 ? "+" : ""}${formatCurrencyCompact(delta)} vs FY2026`, tone };
}

function formatDriverValue(driver: DriverConfig<string>, rawValue: number): string {
  if (driver.unit === "percent") {
    return `${(rawValue * 100).toFixed(0)}%`;
  }
  if (driver.unit === "currency") {
    return driver.max >= 1_000_000 ? formatCurrencyCompact(rawValue) : formatCurrency(rawValue);
  }
  return Math.round(rawValue).toLocaleString();
}

function SliderField({
  driver,
  value,
  baseline,
  onChange,
}: {
  driver: DriverConfig<FrontOfficeDriverKey>;
  value: number;
  baseline: number;
  onChange: (value: number) => void;
}) {
  const delta = vsBaseline(value, baseline);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        <span>{driver.label}</span>
        <span className="text-charcoal">{formatDriverValue(driver, value)}</span>
      </span>
      <input
        type="range"
        min={driver.min}
        max={driver.max}
        step={driver.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-forest/15 accent-forest sm:h-1.5"
      />
      {delta && <span className="text-[11px] font-semibold text-charcoal-soft">{delta.text}</span>}
    </label>
  );
}

function KpiCard({
  label,
  value,
  badge,
  tone,
  sub,
}: {
  label: string;
  value: string;
  badge?: string;
  tone?: BadgeTone;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-forest/15 bg-white p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">{label}</span>
      <span className="text-2xl font-black tracking-tight text-charcoal">{value}</span>
      {badge && tone && (
        <span
          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[tone]}`}
        >
          {badge}
        </span>
      )}
      {sub && <span className="text-[11px] text-charcoal-soft">{sub}</span>}
    </div>
  );
}

function MandateTarget({
  label,
  detail,
  met,
}: {
  label: string;
  detail: string;
  met: boolean;
}) {
  const tone: BadgeTone = met ? "good" : "bad";
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-forest/15 bg-white p-3">
      <div>
        <span className="block text-sm font-semibold text-charcoal">{label}</span>
        <span className="block text-xs text-charcoal-soft">{detail}</span>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[tone]}`}
      >
        {met ? "Met" : "Not Met"}
      </span>
    </div>
  );
}

// The playoff-line gauge: makes the win-total discontinuity visible rather
// than letting a small slider move silently jump the record/seed/revenue.
// Scaled 0-17 (a full regular season). The vertical line marks the actual
// 2025 cutline (9.5 wins, ACTUAL_2025_WIN_TOTAL) as a historical reference
// point — it is NOT the live pass/fail rule. Pass/fail (the fill color)
// comes from madePlayoffs, which the model derives from this plan's real
// position in the NFC field (see buildNfcField), and that field cutoff
// can sit a little above or below 9.5 depending on the other 15 teams'
// fixed records — see "One Seed, Everywhere" in Assumptions below.
const PLAYOFF_LINE_WINS = ACTUAL_2025_WIN_TOTAL;
const GAUGE_MAX_WINS = 17;

function PlayoffLineGauge({ wins, madePlayoffs }: { wins: number; madePlayoffs: boolean }) {
  const pct = Math.min(100, Math.max(0, (wins / GAUGE_MAX_WINS) * 100));
  const linePct = (PLAYOFF_LINE_WINS / GAUGE_MAX_WINS) * 100;
  const distance = wins - PLAYOFF_LINE_WINS;
  const tone: BadgeTone = madePlayoffs ? "good" : "bad";
  return (
    <div className="rounded-xl border border-forest/15 bg-white p-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        <span>Projected Wins vs. Playoff Line</span>
        <span className="text-charcoal">{wins.toFixed(2)} / 17</span>
      </div>
      <div className="relative mt-3 h-3 w-full overflow-visible rounded-full bg-mist">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${madePlayoffs ? "bg-forest" : "bg-rust"}`}
          style={{ width: `${pct}%` }}
        />
        <span
          className="absolute -top-1.5 h-6 w-0.5 bg-charcoal"
          style={{ left: `${linePct}%` }}
          aria-hidden
        />
      </div>
      <div className={`mt-3 rounded-lg px-3 py-2 text-[11px] leading-4 ${ALERT_STYLE[tone]}`}>
        The vertical line marks {PLAYOFF_LINE_WINS} wins — the actual 2025 cutline (see
        Assumptions; the live pass/fail below comes from this plan&apos;s real position in the
        NFC field, not a fixed number). At this plan, projected wins sit{" "}
        <span className="font-semibold">
          {Math.abs(distance).toFixed(2)} wins {distance >= 0 ? "above" : "below"}
        </span>{" "}
        that reference line, and the plan {madePlayoffs ? "made" : "missed"} the real field.
        Crossing the true cutoff is a real step change — playoff hosting revenue and the health
        score jump discontinuously right at the threshold, not smoothly. That is correct
        behavior, not a rendering glitch.
      </div>
    </div>
  );
}

// ============================================================================
// Season P&L table
// ============================================================================

function PnlRow({
  label,
  value,
  tag,
  emphasis,
  fixed,
}: {
  label: string;
  value: number;
  tag?: string;
  emphasis?: boolean;
  fixed?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-forest/5 px-4 py-2.5 last:border-0 ${
        fixed ? "bg-brass-pale/40" : ""
      } ${emphasis ? "bg-forest/5" : ""}`}
    >
      <span className={`flex items-center gap-2 text-sm ${emphasis ? "font-bold text-charcoal" : "text-charcoal-soft"}`}>
        {label}
        {fixed && (
          <span className="rounded-full bg-brass px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cream">
            Fixed — never moves
          </span>
        )}
        {tag && (
          <span className="rounded-full border border-forest/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-charcoal-soft">
            {tag}
          </span>
        )}
      </span>
      <span className={`shrink-0 text-sm ${emphasis ? "font-bold text-charcoal" : "font-semibold text-charcoal"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ============================================================================
// Marginal impact — "what the next $1M does," reusing the Decision Lab's
// ranked-bar sensitivity pattern. Computed entirely by calling the
// committed runFrontOfficeSimulation() before/after +$1M on each spend
// lever — no new model math, the same engine, run twice per row. Ticket
// price and strategy weighting are excluded: neither is a "$1M of spend."
// ============================================================================

type MarginalMetric = "wins" | "operatingResult" | "franchiseHealth";

const MARGINAL_METRIC_TABS: { key: MarginalMetric; label: string }[] = [
  { key: "operatingResult", label: "Operating Result" },
  { key: "wins", label: "Wins" },
  { key: "franchiseHealth", label: "Franchise Health" },
];

const SPEND_LEVER_KEYS: FrontOfficeDriverKey[] = [
  "payroll",
  "coachingSpend",
  "facilitiesSpend",
  "developmentSpend",
  "marketingSpend",
  "gamedaySpend",
];

function metricValue(result: FrontOfficeResult, metric: MarginalMetric): number {
  if (metric === "wins") return result.wins;
  if (metric === "operatingResult") return result.operatingResult;
  return result.franchiseHealth;
}

type MarginalImpactRow = {
  key: FrontOfficeDriverKey;
  label: string;
  impact: number;
  // True when the lever already has zero headroom — payroll sitting at the
  // salary cap, or any other lever already at its slider max — so a "next
  // $1M" literally cannot be spent there. Rendered as an explicit "At Cap"
  // / "At Max" badge rather than a numeric +$0, which read as "this lever
  // does nothing" instead of "this lever can't move."
  atCeiling: boolean;
};

function computeMarginalImpact(
  assumptions: FrontOfficeAssumptions,
  metric: MarginalMetric
): MarginalImpactRow[] {
  const baseValue = metricValue(runFrontOfficeSimulation(assumptions), metric);
  return SPEND_LEVER_KEYS.map((key) => {
    const driver = FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!;
    const bumpedValue_ = clampToDriverBounds(key, assumptions[key] + 1_000_000);
    const atCeiling = bumpedValue_ === assumptions[key];
    const bumped: FrontOfficeAssumptions = { ...assumptions, [key]: bumpedValue_ };
    const bumpedValue = metricValue(runFrontOfficeSimulation(bumped), metric);
    return { key, label: driver.label, impact: bumpedValue - baseValue, atCeiling };
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function formatMarginalImpact(metric: MarginalMetric, value: number): string {
  if (metric === "wins") return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
  if (metric === "franchiseHealth") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  return formatSignedCompact(value);
}

// ============================================================================
// Assumptions & Limitations
// ============================================================================

function DisclosureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']">
      {children}
    </li>
  );
}

export default function FrontOfficeSimulator() {
  const [assumptions, setAssumptions] = useState<FrontOfficeAssumptions>(FRONT_OFFICE_BASE_DEFAULTS);
  const [marginalMetric, setMarginalMetric] = useState<MarginalMetric>("operatingResult");

  const result = useMemo(() => runFrontOfficeSimulation(assumptions), [assumptions]);
  // result.playoff.seed IS the standings' seed — buildStandings below calls
  // the same buildNfcField() the engine itself uses for playoff hosting, so
  // there is exactly one seed number anywhere on this page. See "One Seed,
  // Everywhere" in Assumptions & Limitations.
  const standings = useMemo(() => buildStandings(result), [result]);
  const marginalImpact = useMemo(
    () => computeMarginalImpact(assumptions, marginalMetric),
    [assumptions, marginalMetric]
  );

  const set = <K extends keyof FrontOfficeAssumptions>(key: K) => (value: number) =>
    setAssumptions((prev) => ({ ...prev, [key]: value }));

  const resetToBaseline = () => setAssumptions(FRONT_OFFICE_BASE_DEFAULTS);

  const playoffTargetMet = result.playoff.madePlayoffs;
  const financialTargetMet = result.operatingResult > OPERATING_RESULT;

  const capBindState: "cap" | "floor" | null =
    result.capUsed >= SALARY_CAP ? "cap" : assumptions.payroll <= SALARY_FLOOR ? "floor" : null;

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <Link href="/#interactive-tools" className="text-sm font-semibold text-forest hover:text-forest-dark">
          &larr; Back to Interactive Tools
        </Link>

        {/* Hero */}
        <div className="mt-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Interactive Demo</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
            Front Office
          </h1>
          <p className="mt-6 max-w-2xl text-xl italic leading-8 text-charcoal-soft">
            &ldquo;You have a hard cap and a revenue ceiling you don&apos;t control. What&apos;s
            the plan?&rdquo;
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-brass-pale px-4 py-2 text-xs font-semibold text-brass">
            <span className="text-sm">&#9873;</span>
            Built on the Green Bay Packers&apos; actual FY2026 disclosed financials. Every plan
            you build from here is modeled, not predicted.
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-base leading-7 text-charcoal-soft">
          The Packers are the only NFL franchise that publishes audited financial statements.
          This is a one-season front-office simulator built on their real numbers — six spending
          levers, a ticket price, and a strategy weighting, recomputing live with every move. No
          submit button.
        </p>

        {/* The board's mandate */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            The Board&apos;s Mandate
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-soft">
            You&apos;re running the Packers&apos; front office for one season. You inherit the
            FY2026 position below. The board wants two things — and they don&apos;t fully agree
            with each other.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-forest/15 bg-white p-3">
              <span className="block text-sm font-semibold text-charcoal">A playoff berth</span>
              <span className="block text-xs text-charcoal-soft">
                A top-7 seed in the real NFC field (see NFC Standings) — {PLAYOFF_LINE_WINS} wins
                got the 7-seed in the actual 2025 season, though the exact cutoff for a given plan
                depends on the other 15 teams&apos; fixed records.
              </span>
            </div>
            <div className="rounded-xl border border-forest/15 bg-white p-3">
              <span className="block text-sm font-semibold text-charcoal">
                An operating result better than last season
              </span>
              <span className="block text-xs text-charcoal-soft">
                Better than the FY2026 result of {formatCurrency(OPERATING_RESULT)}.
              </span>
            </div>
          </div>
        </section>

        {/* FY2026 reference case */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            The FY2026 Reference Case
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-soft">
            This is what actually happened, before you touch anything: record revenue, and still
            an operating loss, because player costs rose more than revenue could cover. This
            block never moves — it&apos;s the baseline everything below is measured against.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <KpiCard label="Total Revenue" value={formatCurrencyCompact(TOTAL_REVENUE)} sub="SOURCED" />
            <KpiCard label="Operating Result" value={formatCurrencyCompact(OPERATING_RESULT)} sub="SOURCED" />
            <KpiCard
              label="Player Costs, YoY"
              value={`+${formatCurrencyCompact(PLAYER_COST_YOY_CHANGE)}`}
              sub="SOURCED"
            />
            <KpiCard
              label="Record"
              value={`${ACTUAL_2025_RECORD.wins}-${ACTUAL_2025_RECORD.losses}-${ACTUAL_2025_RECORD.ties}`}
              sub={`SOURCED · Seed ${ACTUAL_2025_SEED}`}
            />
            <KpiCard label="Playoff Result" value="Wild Card Loss" sub={ACTUAL_2025_PLAYOFF_RESULT} />
          </div>
          <p className="mt-3 text-[11px] text-charcoal-soft">
            Source: Packers FY2026 annual financial release (packers.com, July 2026); Sportico;
            Yahoo Sports.
          </p>
        </section>

        {/* The console */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">The Console</h2>
          <div className="mt-4 lg:grid lg:grid-cols-[420px_1fr] lg:items-start lg:gap-6">
            {/* Left: levers, cap readout pinned at top */}
            <aside className="mb-8 flex flex-col rounded-2xl border border-forest/15 bg-white p-4 lg:sticky lg:top-24 lg:mb-0 lg:max-h-[calc(100vh-7rem)]">
              {/* Cap readout — never scrolls, sits above the scrollable slider list */}
              <div className="mb-3 shrink-0 rounded-xl border border-forest/20 bg-forest/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                    Cap Readout
                  </span>
                  {capBindState && (
                    <span className="rounded-full bg-brass px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cream">
                      {capBindState === "cap" ? "At Cap" : "At Floor"}
                    </span>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                  <dt className="text-charcoal-soft">Cap</dt>
                  <dd className="text-right font-semibold text-charcoal">{formatCurrencyCompact(SALARY_CAP)}</dd>
                  <dt className="text-charcoal-soft">CBA Floor ({formatPercent(SALARY_FLOOR_PCT, 0)})</dt>
                  <dd className="text-right font-semibold text-charcoal">{formatCurrencyCompact(SALARY_FLOOR)}</dd>
                  <dt className="text-charcoal-soft">Payroll</dt>
                  <dd className="text-right font-semibold text-charcoal">{formatCurrencyCompact(result.capUsed)}</dd>
                  <dt className="text-charcoal-soft">Room Remaining</dt>
                  <dd className="text-right font-semibold text-charcoal">
                    {formatCurrencyCompact(result.capRoomRemaining)}
                  </dd>
                </dl>
              </div>

              <button
                type="button"
                onClick={resetToBaseline}
                className="mb-3 w-full shrink-0 rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/5"
              >
                Reset to FY2026 Baseline
              </button>

              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                {FRONT_OFFICE_DRIVERS.map((driver) => (
                  <SliderField
                    key={driver.key}
                    driver={driver}
                    value={assumptions[driver.key]}
                    baseline={FRONT_OFFICE_BASE_DEFAULTS[driver.key]}
                    onChange={set(driver.key)}
                  />
                ))}
              </div>
            </aside>

            {/* Right: outcomes */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Projected Wins" value={result.wins.toFixed(2)} sub="of 17 games" />
                <KpiCard
                  label="Seed & Result"
                  value={result.playoff.seed !== null ? `${result.playoff.seed} Seed` : "Missed"}
                  badge={result.playoff.result}
                  tone={playoffTone(result)}
                  sub={
                    result.playoff.isDivisionWinner
                      ? "NFC North Winner"
                      : result.playoff.seed !== null
                        ? "Wild Card"
                        : undefined
                  }
                />
                <KpiCard
                  label="Operating Result"
                  value={formatCurrencyCompact(result.operatingResult)}
                  badge={financialTargetMet ? "Beats FY2026" : "Below FY2026"}
                  tone={financialTargetMet ? "good" : "bad"}
                />
                <KpiCard
                  label="Franchise Health"
                  value={result.franchiseHealth.toFixed(1)}
                  badge={`${(assumptions.strategyWeighting * 100).toFixed(0)}% On-Field Weighting`}
                  tone={healthTone(result.franchiseHealth)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MandateTarget
                  label="Playoff berth"
                  detail={`${result.wins.toFixed(2)} projected wins`}
                  met={playoffTargetMet}
                />
                <MandateTarget
                  label="Beat FY2026 operating result"
                  detail={`${formatCurrencyCompact(result.operatingResult)} vs ${formatCurrencyCompact(OPERATING_RESULT)}`}
                  met={financialTargetMet}
                />
              </div>

              <PlayoffLineGauge wins={result.wins} madePlayoffs={result.playoff.madePlayoffs} />
            </div>
          </div>
        </section>

        {/* Standings */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            NFC Standings
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-charcoal-soft">
            Team names only. Every row but the Packers&apos; is the real, final 2025 result —
            fixed, and sourced independently of this model. The Packers&apos; record and seed are
            this plan&apos;s live output. Seeds are recomputed for the whole field on every plan:
            each division&apos;s winner (highest wins,
            <span className="mx-1 rounded-full bg-forest/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-forest">
              Div
            </span>
            below) takes seeds 1-4 by record, then the next three best remaining records take 5-7
            — so a division winner can rank above a wild card with more wins, exactly as it does
            in the real NFL. That&apos;s why the seed column won&apos;t always match a plain sort
            by record.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-forest/15 bg-white">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10 text-xs uppercase tracking-wide text-charcoal-soft">
                  <th className="px-4 py-3 font-semibold">Seed</th>
                  <th className="px-4 py-3 font-semibold">Team</th>
                  <th className="px-4 py-3 font-semibold">Division</th>
                  <th className="px-4 py-3 text-right font-semibold">Record</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const isLastPlayoffRow = row.seed !== null && standings[i + 1]?.seed === null;
                  return (
                    <tr
                      key={row.key}
                      className={`border-b border-forest/5 last:border-0 ${
                        row.isPackers ? "bg-forest/10 font-semibold" : ""
                      } ${isLastPlayoffRow ? "border-b-2 border-b-charcoal" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-charcoal-soft">{row.seedLabel ?? "—"}</td>
                      <td className="px-4 py-2.5 text-charcoal">
                        <span className="flex items-center gap-1.5">
                          {row.name}
                          {row.isDivisionWinner && (
                            <span
                              title="Division winner"
                              className="rounded-full bg-forest/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-forest"
                            >
                              Div
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-charcoal-soft">{row.division}</td>
                      <td className="px-4 py-2.5 text-right text-charcoal-soft">{row.displayRecord}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Season P&L */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Season P&amp;L</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                Revenue
              </h3>
              <div className="overflow-hidden rounded-xl border border-forest/15 bg-white">
                <PnlRow label="National Revenue" value={result.revenue.national} fixed />
                <PnlRow label="Ticketing" value={result.revenue.ticketing} />
                <PnlRow label="Concessions &amp; Merchandise" value={result.revenue.concessionsMerchandise} />
                <PnlRow label="Local Sponsorship" value={result.revenue.sponsorship} />
                <PnlRow label="Playoff Revenue" value={result.revenue.playoff} />
                <PnlRow label="Total Revenue" value={result.revenue.total} emphasis />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                Cost
              </h3>
              <div className="overflow-hidden rounded-xl border border-forest/15 bg-white">
                <PnlRow label="Payroll" value={result.cost.payroll} tag="Cap Allocation" />
                <PnlRow label="Coaching &amp; Football Staff" value={result.cost.coaching} />
                <PnlRow label="Facilities &amp; Sports Science" value={result.cost.facilities} />
                <PnlRow label="Scouting &amp; Development" value={result.cost.development} />
                <PnlRow label="Marketing &amp; Fan Engagement" value={result.cost.marketing} />
                <PnlRow label="Stadium &amp; Gameday Ops" value={result.cost.gameday} />
                <PnlRow label="Fixed Overhead" value={result.cost.fixedOverhead} tag="Derived Residual" />
                <PnlRow label="Total Cost" value={result.cost.total} emphasis />
              </div>
              <p className="mt-2 rounded-lg bg-brass-pale/40 p-2.5 text-[11px] leading-4 text-charcoal-soft">
                Fixed Overhead is {formatPercent(FIXED_OVERHEAD_SHARE_OF_REVENUE, 0)} of total
                revenue at baseline ({formatCurrencyCompact(FIXED_OVERHEAD)}) — the largest single
                cost line in the model. It&apos;s a derived residual, not an independently sourced
                or assumed figure: it absorbs whatever error sits in the five assumed
                discretionary cost lines above. See Assumptions &amp; Limitations below.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-forest/15 bg-forest/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-charcoal">Operating Result</span>
              <span className={`text-xl font-black ${result.operatingResult >= 0 ? "text-forest" : "text-rust"}`}>
                {formatCurrency(result.operatingResult)}
              </span>
            </div>
          </div>
        </section>

        {/* Marginal impact */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
              Marginal Impact — What the Next $1M Does
            </h2>
            <div className="flex gap-1 rounded-full border border-forest/20 bg-white p-0.5">
              {MARGINAL_METRIC_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMarginalMetric(tab.key)}
                  aria-pressed={marginalMetric === tab.key}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    marginalMetric === tab.key
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
            Impact of one more $1M on each spend lever, from the current plan, on{" "}
            {MARGINAL_METRIC_TABS.find((t) => t.key === marginalMetric)?.label.toLowerCase()}. This
            is where the tool stops being a game and starts being an analyst&apos;s instrument —
            every row is a full engine re-run, not an estimate.
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {(() => {
              const maxAbsImpact = Math.max(...marginalImpact.map((r) => Math.abs(r.impact)), 1e-9);
              return marginalImpact.map((row, i) => {
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
                    {row.atCeiling ? (
                      <>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist" />
                        <span className="w-20 shrink-0 rounded-full bg-brass/15 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-brass">
                          {row.key === "payroll" ? "At Cap" : "At Max"}
                        </span>
                      </>
                    ) : (
                      <>
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
                          {formatMarginalImpact(marginalMetric, row.impact)}
                        </span>
                      </>
                    )}
                  </li>
                );
              });
            })()}
          </ul>
        </section>

        {/* Assumptions & Limitations */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Assumptions &amp; Limitations
          </h2>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-charcoal">What&apos;s Sourced vs. Assumed</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              <DisclosureItem>
                The Packers publish totals, not line items: total revenue, national revenue, the
                operating result, and the salary cap allocation are [SOURCED]. Local revenue and
                total operating cost are [DERIVED] by subtraction.
              </DisclosureItem>
              <DisclosureItem>
                The split of local revenue into ticketing/sponsorship/concessions/merchandise, and
                of operating cost into payroll/coaching/facilities/development/marketing/gameday/fixed
                overhead, is [ASSUMPTION] — each decomposition reconciles exactly to its sourced or
                derived total.
              </DisclosureItem>
            </ul>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              Fixed Overhead is a Derived Residual
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              At {formatPercent(FIXED_OVERHEAD_SHARE_OF_REVENUE, 0)} of total revenue
              ({formatCurrencyCompact(FIXED_OVERHEAD)} at baseline), Fixed Overhead is the largest
              cost line in the model and does not move with any lever. It is not independently
              sourced or assumed — it is defined as whatever remains after the five assumed
              discretionary cost lines are subtracted from the real, derived operating-cost total,
              so it silently absorbs all of the imprecision in those five assumptions.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">Payroll = Cap Allocation</h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              This model treats the {formatCurrencyCompact(SALARY_CAP)} salary cap allocation as
              the P&amp;L payroll cost line ({String(PAYROLL_EQUALS_CAP_ASSUMPTION)}). Cap
              accounting and GAAP financial-statement accounting genuinely differ — the Packers
              don&apos;t disclose a separate cash-payroll figure, so this is the only real number
              available for &ldquo;how much the roster costs.&rdquo;
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">Development Boost: {formatPercent(DEVELOPMENT_BOOST_MAX, 0)}</h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              Scouting and development spend can raise payroll&apos;s effective quality-per-dollar
              by at most {formatPercent(DEVELOPMENT_BOOST_MAX, 0)}. This is anchored to published
              rookie-contract surplus-value research (the league&apos;s #1 overall pick costs
              roughly 4.1% of the cap for production valued at roughly 6.5% of the cap), discounted
              because this lever funds a whole scouting/development program, not a guaranteed top
              pick. It is a disclosed judgment call, not a canonical figure the literature hands
              you directly.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              The Salary Floor Is Simplified
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              The NFL CBA requires each club to spend at least {formatPercent(SALARY_FLOOR_PCT, 0)}{" "}
              of the salary cap in cash, aggregated over a multi-year window (three years for the
              2024-2026 period this model is baselined on) — a single season below the floor is
              legal on its own, as long as the club catches up later. This model has no
              multi-season memory, so it applies {formatPercent(SALARY_FLOOR_PCT, 0)} as a hard
              per-season minimum instead ({formatCurrencyCompact(SALARY_FLOOR)}), which is
              stricter than the real rule. That&apos;s part of why a low-payroll strategy
              underperforms here: the real CBA would let a club dip below this floor for one
              season and recover the shortfall later, and this model doesn&apos;t give it that
              flexibility.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">One Seed, Everywhere</h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              This plan&apos;s projected wins are inserted into the real 2025 NFC field and
              reseeded with real NFL rules (division winners take seeds 1-4 by record, then the
              best three remaining records take 5-7) by a single function committed in the model
              layer (<code>buildNfcField</code>, <code>src/lib/models/frontOffice.ts</code>). The
              Seed &amp; Result card, the NFC Standings table, and the Season P&amp;L&apos;s
              playoff-revenue line all read that exact same number — there is no second,
              independent seeding table. Only the round-by-round result phrase (&ldquo;Lost Wild
              Card Round,&rdquo; etc.) is decided separately, by comparing team strength against a
              documented survival bar for each round; that part doesn&apos;t simulate the other 31
              teams and never did, but which rounds are played at home — and therefore which
              rounds earn playoff revenue — now comes entirely from the seed above, so a hosted
              game always traces back to a real top-4 (or #1) seed you can check in the standings.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

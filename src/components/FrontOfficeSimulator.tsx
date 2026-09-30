"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ACTUAL_2025_PLAYOFF_RESULT,
  ACTUAL_2025_RECORD,
  ACTUAL_2025_SEED,
  ACTUAL_2025_WIN_TOTAL,
  AVAILABILITY_K,
  AVAILABILITY_MAX,
  AVAILABILITY_MIN,
  BASELINE_TICKET_PRICE,
  COACHING_QUALITY_K,
  COACHING_WEIGHT,
  DEVELOPMENT_BOOST_MAX,
  DEVELOPMENT_K,
  FIXED_OVERHEAD,
  FIXED_OVERHEAD_SHARE_OF_REVENUE,
  FREE_ZONE_MULTIPLIER,
  FRONT_OFFICE_BASE_DEFAULTS,
  FRONT_OFFICE_DRIVERS,
  FRONT_OFFICE_MANDATE_BAND_LABEL,
  FRONT_OFFICE_MANDATE_GAP_MATERIAL,
  FRONT_OFFICE_MANDATE_GAP_SEVERE,
  LEAGUE_AVERAGE_DEVELOPMENT_SPEND,
  LEAGUE_AVERAGE_PAYROLL,
  NATIONAL_REVENUE,
  OPERATING_RESULT,
  PAYROLL_EQUALS_CAP_ASSUMPTION,
  PLAYER_COST_YOY_CHANGE,
  ROSTER_QUALITY_K,
  ROSTER_WEIGHT,
  SALARY_CAP,
  SALARY_FLOOR,
  SALARY_FLOOR_PCT,
  TOTAL_REVENUE,
  buildFrontOfficeVerdict,
  buildNfcField,
  clampToDriverBounds,
  developmentMultiplier,
  expectedWins,
  runFrontOfficeSimulation,
  teamStrength,
  type FrontOfficeAssumptions,
  type FrontOfficeDriverKey,
  type FrontOfficeResult,
  type NfcFieldTeam,
} from "@/lib/models/frontOffice";
import type { BadgeTone, DriverConfig } from "@/lib/models/shared";
import {
  ATTENDANCE_NOISE_STDDEV,
  runFrontOfficeMonteCarlo,
  type FrontOfficeMonteCarloResult,
} from "@/lib/frontOfficeMonteCarlo";
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSignedCompact } from "@/lib/format";
import FrontOfficeCausalChain from "@/components/FrontOfficeCausalChain";
import {
  BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO_STATS,
  SPEND_TO_CONTEND_MONTE_CARLO_STATS,
} from "@/lib/models/frontOfficeClosingCardStats.generated";
import {
  STRATEGY_MAP_FEASIBLE_SAMPLE_DATA,
  STRATEGY_MAP_INJECTED_ANCHORS_DATA,
} from "@/lib/models/frontOfficeStrategyMapSample.generated";

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

function formatExpectedWins(wins: number): string {
  return `${wins.toFixed(2)} expected wins`;
}

function buildStandings(result: FrontOfficeResult): StandingsRow[] {
  const field = buildNfcField(result.wins); // always exactly 16 teams — see buildNfcField's own doc comment
  const rows: StandingsRow[] = field.map((t) => ({
    ...t,
    displayRecord: t.isPackers ? formatExpectedWins(result.wins) : t.record!,
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

// Display-only shorthand for labels that wrap awkwardly in the label/value
// row at phone widths — the model's own driver.label (used in Marginal
// Impact and elsewhere) is untouched; this changes only what this one
// slider heading renders as. "Strategy Weighting (Financial <-> On-Field)"
// was wrapping mid-parenthetical on narrow screens; the direction is
// already restated as a live percentage in the Franchise Health card and
// the Strategy Map, so the parenthetical isn't the only place it lives.
const SLIDER_DISPLAY_LABEL: Partial<Record<FrontOfficeDriverKey, string>> = {
  strategyWeighting: "Strategy Weighting",
};

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
  const displayLabel = SLIDER_DISPLAY_LABEL[driver.key] ?? driver.label;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        <span>{displayLabel}</span>
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

// Player Payroll gets a special control: the slider's own min/max ARE the
// CBA floor and salary cap (Prompt 1's engine), so on its own the control
// just looks like a short slider. This renders the full theoretical
// payroll range as a ruler first, with the floor-to-cap window highlighted
// and everything outside it visibly greyed out and labeled "not
// reachable" — so hitting either end of the real slider below reads as
// "the cap/floor stopped me," not "this slider is oddly short." Values
// only, no engine change: SALARY_FLOOR and SALARY_CAP are the same
// committed constants the slider itself already uses as min/max.
const PAYROLL_AXIS_MIN = 200_000_000;
const PAYROLL_AXIS_MAX = 340_000_000;

function PayrollAxis({
  value,
  baseline,
  onChange,
}: {
  value: number;
  baseline: number;
  onChange: (value: number) => void;
}) {
  const axisRange = PAYROLL_AXIS_MAX - PAYROLL_AXIS_MIN;
  const pctFor = (v: number) => ((v - PAYROLL_AXIS_MIN) / axisRange) * 100;
  const floorPct = pctFor(SALARY_FLOOR);
  const capPct = pctFor(SALARY_CAP);
  const delta = vsBaseline(value, baseline);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-forest/15 bg-forest/[0.03] p-3">
      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        <span>Player Payroll</span>
        <span className="text-charcoal">{formatCurrencyCompact(value)}</span>
      </span>

      {/* The full theoretical axis: grey = unreachable, colored = the
          floor-to-cap window the slider below can actually move within. */}
      <div className="relative h-4 w-full rounded-full bg-mist" aria-hidden>
        <span
          className="absolute inset-y-0 rounded-full bg-forest/25"
          style={{ left: `${floorPct}%`, width: `${capPct - floorPct}%` }}
        />
        <span className="absolute inset-y-0 border-l border-dashed border-charcoal/30" style={{ left: `${floorPct}%` }} />
        <span className="absolute inset-y-0 border-l border-dashed border-charcoal/30" style={{ left: `${capPct}%` }} />
      </div>
      <div className="relative h-7 text-[9px] font-semibold leading-tight text-charcoal-soft/70" aria-hidden>
        <span className="absolute left-0 top-0">{formatCurrencyCompact(PAYROLL_AXIS_MIN)}</span>
        <span className="absolute top-0 text-center text-forest" style={{ left: `${floorPct}%`, transform: "translateX(-50%)" }}>
          Floor
          <br />
          {formatCurrencyCompact(SALARY_FLOOR)}
        </span>
        <span className="absolute top-0 text-center text-forest" style={{ left: `${capPct}%`, transform: "translateX(-50%)" }}>
          Cap
          <br />
          {formatCurrencyCompact(SALARY_CAP)}
        </span>
        <span className="absolute right-0 top-0">{formatCurrencyCompact(PAYROLL_AXIS_MAX)}</span>
      </div>
      <p className="text-[10px] leading-4 text-charcoal-soft">
        The grey zones are enforced by the real NFL salary cap and CBA cash floor — not a slider
        limitation. This plan can never spend below {formatCurrencyCompact(SALARY_FLOOR)} or above{" "}
        {formatCurrencyCompact(SALARY_CAP)}.
      </p>

      {/* The functional control — moves only within the reachable window. */}
      <input
        type="range"
        min={SALARY_FLOOR}
        max={SALARY_CAP}
        step={1_000_000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-forest/20 accent-forest sm:h-1.5"
      />
      {delta && <span className="text-[11px] font-semibold text-charcoal-soft">{delta.text}</span>}

      <p className="border-t border-forest/10 pt-1.5 text-[10px] leading-4 text-charcoal-soft">
        One input among several, not a direct wins dial — Team Strength below also depends on
        Coaching, Facilities, and Scouting &amp; Development spend.
      </p>
    </div>
  );
}

// A restrained chapter marker — a roman numeral and a short label above a
// section's existing heading, so the page reads as a sequence (question ->
// model -> decisions -> marginal effects -> strategic position ->
// uncertainty -> how it was built -> what it shows) without renaming,
// renumbering, or otherwise touching any of those headings themselves.
function ChapterMark({ roman, label }: { roman: string; label: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brass/70">
      <span>{roman}</span>
      <span className="text-brass/30" aria-hidden>
        &middot;
      </span>
      {label}
    </p>
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

function driverMax(key: FrontOfficeDriverKey): number {
  return FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!.max;
}

function driverMin(key: FrontOfficeDriverKey): number {
  return FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!.min;
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

// The achievable win range — every lever at its slider minimum vs. every
// lever at its slider maximum — computed by calling the committed engine's
// own teamStrength/expectedWins on the two extreme assumption sets, not
// guessed or hardcoded. Only payroll, coaching, facilities, and
// development feed teamStrength (see teamStrength in frontOffice.ts) —
// marketing, gameday, ticket price, and strategy weighting don't move
// wins at all, so they're irrelevant to this pair and set to their own
// minimum/maximum purely for a complete, valid FrontOfficeAssumptions
// object.
const FLOOR_WIN_ASSUMPTIONS: FrontOfficeAssumptions = {
  payroll: SALARY_FLOOR,
  coachingSpend: driverMin("coachingSpend"),
  facilitiesSpend: driverMin("facilitiesSpend"),
  developmentSpend: driverMin("developmentSpend"),
  marketingSpend: driverMin("marketingSpend"),
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: driverMin("ticketPrice"),
  strategyWeighting: 0.5,
};
const CEILING_WIN_ASSUMPTIONS: FrontOfficeAssumptions = {
  payroll: SALARY_CAP,
  coachingSpend: driverMax("coachingSpend"),
  facilitiesSpend: driverMax("facilitiesSpend"),
  developmentSpend: driverMax("developmentSpend"),
  marketingSpend: driverMax("marketingSpend"),
  gamedaySpend: driverMax("gamedaySpend"),
  ticketPrice: driverMax("ticketPrice"),
  strategyWeighting: 0.5,
};
const FLOOR_WINS = expectedWins(teamStrength(FLOOR_WIN_ASSUMPTIONS));
const CEILING_WINS = expectedWins(teamStrength(CEILING_WIN_ASSUMPTIONS));

/**
 * [DERIVED] Effective payroll at the CBA floor with scouting/development
 * spend at its own minimum, as a share of the LEAGUE-AVERAGE TEAM'S OWN
 * effective payroll — not the league's raw payroll figure. The
 * league-average team in this model also spends on development
 * (LEAGUE_AVERAGE_DEVELOPMENT_SPEND feeds LEAGUE_AVERAGE_STRENGTH in
 * frontOffice.ts), so it carries its own developmentMultiplier too;
 * comparing a floor team's EFFECTIVE payroll against the average team's
 * RAW payroll would mix two different bases and produce a number
 * (~103%) that looks like the floor team out-earns the average team,
 * which isn't a real or checkable comparison. Effective-to-effective is
 * the comparison a reader can actually verify against the same formula
 * on both sides.
 */
const FLOOR_EFFECTIVE_PAYROLL = SALARY_FLOOR * developmentMultiplier(driverMin("developmentSpend"));
const LEAGUE_AVERAGE_EFFECTIVE_PAYROLL =
  LEAGUE_AVERAGE_PAYROLL * developmentMultiplier(LEAGUE_AVERAGE_DEVELOPMENT_SPEND);
const FLOOR_EFFECTIVE_PAYROLL_PCT_OF_LEAGUE_AVG = FLOOR_EFFECTIVE_PAYROLL / LEAGUE_AVERAGE_EFFECTIVE_PAYROLL;
const FACILITIES_AVAILABILITY_SWING = AVAILABILITY_MAX - AVAILABILITY_MIN;

function PlayoffLineGauge({ wins, madePlayoffs }: { wins: number; madePlayoffs: boolean }) {
  const pct = Math.min(100, Math.max(0, (wins / GAUGE_MAX_WINS) * 100));
  const linePct = (PLAYOFF_LINE_WINS / GAUGE_MAX_WINS) * 100;
  const floorPct = (FLOOR_WINS / GAUGE_MAX_WINS) * 100;
  const ceilingPct = (CEILING_WINS / GAUGE_MAX_WINS) * 100;
  const distance = wins - PLAYOFF_LINE_WINS;
  const tone: BadgeTone = madePlayoffs ? "good" : "bad";
  return (
    <div className="rounded-xl border border-forest/15 bg-white p-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
        <span>Expected Wins vs. Playoff Line</span>
        <span className="text-charcoal">{wins.toFixed(2)} / 17</span>
      </div>
      <div className="relative mt-3 h-3 w-full overflow-visible rounded-full bg-mist">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${madePlayoffs ? "bg-forest" : "bg-rust"}`}
          style={{ width: `${pct}%` }}
        />
        <span
          className="absolute -top-2 h-4 w-px bg-charcoal/35"
          style={{ left: `${floorPct}%` }}
          aria-hidden
        />
        <span
          className="absolute -top-2 h-4 w-px bg-charcoal/35"
          style={{ left: `${ceilingPct}%` }}
          aria-hidden
        />
        <span
          className="absolute -top-1.5 h-6 w-0.5 bg-charcoal"
          style={{ left: `${linePct}%` }}
          aria-hidden
        />
      </div>
      <div className="relative mt-1 h-7 text-[9px] font-semibold leading-tight text-charcoal-soft/70" aria-hidden>
        <span className="absolute top-0 text-center" style={{ left: `${floorPct}%`, transform: "translateX(-50%)" }}>
          Floor
          <br />
          {FLOOR_WINS.toFixed(2)}
        </span>
        <span className="absolute top-0 text-center" style={{ left: `${ceilingPct}%`, transform: "translateX(-50%)" }}>
          Ceiling
          <br />
          {CEILING_WINS.toFixed(2)}
        </span>
      </div>
      <div className={`mt-2 rounded-lg px-3 py-2 text-[11px] leading-4 ${ALERT_STYLE[tone]}`}>
        The vertical line marks {PLAYOFF_LINE_WINS}{" "}
        wins — the actual 2025 cutline (see
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
      <div className="mt-2 rounded-lg bg-brass-pale/40 px-3 py-2 text-[11px] leading-4 text-charcoal-soft">
        <span className="font-semibold text-charcoal">
          Every lever at its minimum produces {FLOOR_WINS.toFixed(2)} wins; every lever at its
          maximum produces {CEILING_WINS.toFixed(2)}.
        </span>{" "}
        That {(CEILING_WINS - FLOOR_WINS).toFixed(2)}-win range is narrow because you cannot field
        a cheap roster in this league: even at the CBA floor with scouting funded at its minimum,
        effective payroll — what actually drives team strength — still comes to{" "}
        {formatPercent(FLOOR_EFFECTIVE_PAYROLL_PCT_OF_LEAGUE_AVG, 0)}{" "}
        of the league-average team&apos;s own effective payroll (both sides computed the same way:
        payroll times its own development multiplier). The floor is fixed at{" "}
        {formatPercent(SALARY_FLOOR_PCT, 0)}{" "}
        of the cap by CBA rule, and development spend only ever raises effective payroll, never
        lowers it, so a floor-payroll team can never fall further behind than that. Nearly all of
        the floor-to-ceiling range comes from coaching and facilities instead:
        coaching carries only {formatPercent(COACHING_WEIGHT, 0)}{" "}
        of team strength on its own, and facilities can only
        swing strength across a {formatPercent(FACILITIES_AVAILABILITY_SWING, 0)}{" "}
        availability band. That&apos;s the CBA doing what it&apos;s designed to do — producing competitive
        parity — not a limitation of this model.
      </div>
    </div>
  );
}

// ============================================================================
// Monte Carlo — the "Run 1,000 Seasons" section
// ============================================================================

const MONTE_CARLO_RUNS = 1000;

type HistogramMarker = { value: number; label: string; color: string };

const HIST_WIDTH = 640;
const HIST_HEIGHT = 220;
const HIST_PAD_LEFT = 8;
const HIST_PAD_RIGHT = 8;
const HIST_PAD_TOP = 10;
const HIST_PAD_BOTTOM = 56; // room for two staggered rows of marker labels

/**
 * A binned histogram over `values`, with labeled vertical reference lines
 * — the one distribution chart shape both Monte Carlo charts share (win
 * totals and operating result), same visual language as the Decision
 * Lab's own Monte Carlo histogram (bars + dashed markers), generalized to
 * an arbitrary domain and an arbitrary list of markers instead of a fixed
 * P10/median/P90 triplet, since these two charts need different markers
 * (deterministic expectation; $0 and the FY2026 line).
 */
function DistributionHistogram({
  values,
  domain,
  binCount,
  markers,
  formatValue,
  ariaLabel,
}: {
  values: number[];
  domain: [number, number];
  binCount: number;
  markers: HistogramMarker[];
  formatValue: (v: number) => string;
  ariaLabel: string;
}) {
  const [min, max] = domain;
  const range = max - min || 1;
  const binWidth = range / binCount;
  const bins = Array.from({ length: binCount }, () => 0);
  values.forEach((v) => {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / binWidth)));
    bins[idx]++;
  });
  const maxCount = Math.max(...bins, 1);
  const innerWidth = HIST_WIDTH - HIST_PAD_LEFT - HIST_PAD_RIGHT;
  const innerHeight = HIST_HEIGHT - HIST_PAD_TOP - HIST_PAD_BOTTOM;
  const barGap = 2;
  const barWidth = innerWidth / binCount - barGap;
  const xFor = (value: number) => HIST_PAD_LEFT + ((value - min) / range) * innerWidth;

  return (
    <div className="overflow-x-auto">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft sm:hidden">
        <span aria-hidden>&larr;</span> Scroll to see the full chart <span aria-hidden>&rarr;</span>
      </p>
      <svg
        viewBox={`0 0 ${HIST_WIDTH} ${HIST_HEIGHT}`}
        className="w-full"
        style={{ minWidth: 480 }}
        role="img"
        aria-label={`${ariaLabel}. ${markers.map((m) => `${m.label}: ${formatValue(m.value)}`).join(", ")}.`}
      >
      {bins.map((count, i) => {
        const x = HIST_PAD_LEFT + i * (innerWidth / binCount) + barGap / 2;
        const height = (count / maxCount) * innerHeight;
        const y = HIST_PAD_TOP + innerHeight - height;
        return (
          <rect key={i} x={x} y={y} width={Math.max(barWidth, 0.5)} height={Math.max(height, 0.5)} fill="#1e3a2b" fillOpacity={0.55} rx={1} />
        );
      })}
      {(() => {
        // Row-stagger labels that would otherwise collide: sort markers by
        // x position and alternate rows whenever two neighbors land closer
        // than a label's width needs — the same problem (and the same
        // "give the second one a different row" fix) as multi-series line
        // end-labels elsewhere on this page.
        const MIN_LABEL_GAP = 70;
        const withX = markers.map((m) => ({ ...m, x: xFor(m.value) })).sort((a, b) => a.x - b.x);
        let lastX = -Infinity;
        let row = 0;
        const rowFor = new Map<string, number>();
        withX.forEach((m) => {
          if (m.x - lastX < MIN_LABEL_GAP) {
            row = row === 0 ? 1 : 0;
          } else {
            row = 0;
          }
          rowFor.set(m.label, row);
          lastX = m.x;
        });

        return markers.map((marker) => {
          const labelRow = rowFor.get(marker.label) ?? 0;
          const rowOffset = labelRow * 22;
          return (
            <g key={marker.label}>
              <line
                x1={xFor(marker.value)}
                x2={xFor(marker.value)}
                y1={HIST_PAD_TOP}
                y2={HIST_PAD_TOP + innerHeight}
                stroke={marker.color}
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
              <text
                x={xFor(marker.value)}
                y={HIST_HEIGHT - HIST_PAD_BOTTOM + 14 + rowOffset}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill={marker.color}
                stroke="#f5f1e6"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {marker.label}
              </text>
              <text
                x={xFor(marker.value)}
                y={HIST_HEIGHT - HIST_PAD_BOTTOM + 26 + rowOffset}
                textAnchor="middle"
                fontSize={9}
                fill={marker.color}
                stroke="#f5f1e6"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {formatValue(marker.value)}
              </text>
            </g>
          );
        });
      })()}
      </svg>
    </div>
  );
}

// The three-part caption structure (stat bar, tone-colored alert, static
// explainer) used everywhere else on the page — hand-built here rather
// than through shared.ts's ChartConfig, since that type is shaped for a
// 12-month series per scenario, and these are single-run distributions.
function MonteCarloChartCaption({
  statLabel,
  statValue,
  badge,
  tone,
  alertLead,
  alertExplanation,
  explainer,
  explainerCollapsible,
}: {
  statLabel: string;
  statValue: string;
  badge: string;
  tone: BadgeTone;
  alertLead: string;
  alertExplanation: string;
  explainer: string;
  // The Strategy Map's own explainer runs long (sampling methodology, not a
  // quick read) — collapsed by default there so it doesn't sit at the same
  // visual weight as the recruiter-readable stat/alert above it. Every other
  // caller's explainer is short enough to stay always-visible, so this
  // defaults to false rather than changing behavior everywhere at once.
  explainerCollapsible?: boolean;
}) {
  const [explainerOpen, setExplainerOpen] = useState(!explainerCollapsible);
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-forest/15 bg-white px-4 py-3">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">{statLabel}</span>
          <span className="text-xl font-bold text-charcoal">{statValue}</span>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[tone]}`}>
          {badge}
        </span>
      </div>
      <div className={`rounded-xl px-4 py-2.5 text-sm leading-6 ${ALERT_STYLE[tone]}`}>
        <span className="font-bold">{alertLead}</span> {alertExplanation}
      </div>
      {explainerCollapsible ? (
        <div>
          <button
            type="button"
            onClick={() => setExplainerOpen((o) => !o)}
            aria-expanded={explainerOpen}
            className="text-[11px] font-semibold text-forest underline decoration-forest/40 underline-offset-2 hover:decoration-forest"
          >
            {explainerOpen ? "Hide sampling methodology" : "Show sampling methodology"}
          </button>
          {explainerOpen && <p className="mt-1.5 text-xs leading-5 text-charcoal-soft">{explainer}</p>}
        </div>
      ) : (
        <p className="text-xs leading-5 text-charcoal-soft">{explainer}</p>
      )}
    </div>
  );
}

// ============================================================================
// Season P&L — compact column, proportional bars per line item (same
// visual language as the Marginal Impact panel's ranked bars below) rather
// than the old wide two-column table, so it's narrow enough to sit beside
// the levers and standings instead of below the fold.
// ============================================================================

function PnlBar({
  label,
  value,
  tone,
  maxAbs,
  emphasis,
}: {
  label: string;
  value: number;
  tone: "revenue" | "cost";
  maxAbs: number;
  emphasis?: boolean;
}) {
  const pct = maxAbs === 0 ? 0 : (Math.abs(value) / maxAbs) * 100;
  const barColor = tone === "revenue" ? "bg-forest" : "bg-brass";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs leading-4 ${emphasis ? "font-bold text-charcoal" : "text-charcoal-soft"}`}>
          {label}
        </span>
        <span className={`shrink-0 text-xs leading-4 ${emphasis ? "font-bold text-charcoal" : "font-semibold text-charcoal"}`}>
          {formatCurrencyCompact(value)}
        </span>
      </div>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <span
          className={`block h-full rounded-full ${barColor} ${emphasis ? "" : "opacity-50"}`}
          style={{ width: `${pct}%` }}
        />
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

// Six cards of reference material is the longest block on the page and
// isn't something most visitors read top to bottom on arrival — collapsed
// by default, the heading still signals the disclosure exists (and a
// one-line summary says what's inside) without costing four screens of
// scroll. Same expand/collapse mechanics as the Decision Lab's own
// AccordionSection: a grid-template-rows transition, not a hard show/hide.
function CollapsibleSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-12 border-t border-forest/10 pt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">{title}</h2>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 shrink-0 text-charcoal-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!open && <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">{summary}</p>}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

// ============================================================================
// Scenario presets — coherent named strategies a visitor can load in one
// click, so the console's depth (six independent levers) is discoverable
// without requiring someone to invent a plan from scratch by hand. Each
// preset is a full, real FrontOfficeAssumptions object built entirely from
// already-committed model constants: SALARY_CAP / SALARY_FLOOR, each named
// lever's own slider max from FRONT_OFFICE_DRIVERS, FRONT_OFFICE_BASE_DEFAULTS
// for every lever a preset doesn't name, and BASELINE_TICKET_PRICE x
// FREE_ZONE_MULTIPLIER for "the top of the free zone" — the exact price
// point above which the engine's own attendanceRate() starts responding to
// price. No new number is invented for this feature, and nothing here
// changes what a given set of assumptions produces — same engine, same
// constants, just three real starting points on it.
// ============================================================================

/** [DERIVED] The highest ticket price at which the model's own free-zone
 * rule (FREE_ZONE_MULTIPLIER, frontOffice.ts) still shows zero attendance
 * response — real revenue upside with no demand cost, and the least
 * discoverable lever on this page since nothing on the slider itself
 * marks where the free zone ends. Verified against the committed engine
 * (a full sweep of runFrontOfficeSimulation across the entire ticketPrice
 * range) to be the actual revenue-maximizing price, not just a plausible
 * one: below it, price rises with zero attendance cost; above it,
 * PRICE_ELASTICITY > 1 (frontOffice.ts) guarantees attendance falls faster
 * than price rises, so revenue strictly declines past this exact point in
 * both directions. */
const TOP_OF_FREE_ZONE_TICKET_PRICE = BASELINE_TICKET_PRICE * FREE_ZONE_MULTIPLIER;

/**
 * Ternary search, run once at module load against the real committed
 * engine (runFrontOfficeSimulation — no reimplementation of its formulas),
 * for the marketingSpend value that maximizes operatingResult holding
 * every other lever in `base` fixed. Marketing is the one discretionary
 * lever on this page whose profit curve is genuinely single-peaked: it
 * raises both attendance-linked revenue and sponsorship through the
 * engine's own saturating diminishing-returns curves, but every dollar of
 * it is also a real dollar of cost, so the curve rises then falls. 60
 * ternary-search iterations over a smooth single-peaked function converge
 * to sub-cent precision — this is verification against the shipped model,
 * not a guess or a slider position picked by eye. Used below to build
 * "Maximize the Business" from the engine's own computed optimum rather
 * than an assumed "more marketing is better" reading, which turns out to
 * be false past roughly $21M (see the Assumptions disclosure for the
 * sweep that shows why).
 */
function argmaxMarketingSpend(base: FrontOfficeAssumptions): number {
  const { min, max } = FRONT_OFFICE_DRIVERS.find((d) => d.key === "marketingSpend")!;
  let lo = min;
  let hi = max;
  const profitAt = (m: number) => runFrontOfficeSimulation({ ...base, marketingSpend: m }).operatingResult;
  for (let i = 0; i < 60; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (profitAt(m1) < profitAt(m2)) {
      lo = m1;
    } else {
      hi = m2;
    }
  }
  return (lo + hi) / 2;
}

// "Maximize the Business" is built from an actual search of the engine's
// output, not an assumption that maxing every revenue-flavored lever wins.
// Payroll and every football-ops lever (coaching, facilities, development)
// go to their floor: each only affects revenue indirectly, through a small
// team-strength sensitivity, and that trickle never outweighs its own
// dollar-for-dollar cost once the playoff path is abandoned. Gameday ops
// ALSO wants its floor — verified below, not assumed — because its
// per-cap-spend lift saturates fast relative to its cost. Marketing is the
// one lever with a real, single-peaked ROI curve, so its value comes from
// argmaxMarketingSpend rather than from the slider's own max. Ticket price
// sits at the free-zone ceiling — see TOP_OF_FREE_ZONE_TICKET_PRICE.
const MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_FLOOR,
  coachingSpend: driverMin("coachingSpend"),
  facilitiesSpend: driverMin("facilitiesSpend"),
  developmentSpend: driverMin("developmentSpend"),
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: TOP_OF_FREE_ZONE_TICKET_PRICE,
};

const MAXIMIZE_BUSINESS_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR,
  marketingSpend: argmaxMarketingSpend(MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR),
};

// The "obvious but wrong" reading of this preset — max out marketing AND
// gameday, since both are named as revenue levers — kept here only so the
// Assumptions disclosure below can quote its real shortfall against the
// searched optimum, computed live rather than typed as a remembered
// number.
const MAXIMIZE_BUSINESS_NAIVE_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR,
  gamedaySpend: driverMax("gamedaySpend"),
  marketingSpend: driverMax("marketingSpend"),
};
const MAXIMIZE_BUSINESS_NAIVE_OPERATING_RESULT = runFrontOfficeSimulation(
  MAXIMIZE_BUSINESS_NAIVE_ASSUMPTIONS
).operatingResult;
const MAXIMIZE_BUSINESS_OPERATING_RESULT = runFrontOfficeSimulation(MAXIMIZE_BUSINESS_ASSUMPTIONS).operatingResult;
const MAXIMIZE_BUSINESS_SEARCH_IMPROVEMENT =
  MAXIMIZE_BUSINESS_OPERATING_RESULT - MAXIMIZE_BUSINESS_NAIVE_OPERATING_RESULT;

type FrontOfficePreset = {
  key: string;
  label: string;
  description: string;
  assumptions: FrontOfficeAssumptions;
  // Computed once, at module load, by calling the committed engine
  // (runFrontOfficeSimulation) on this preset's own assumptions — never a
  // second, hand-written estimate of what a preset "should" produce. The
  // compact wins/operating-result summary shown on each preset button reads
  // straight from this field.
  result: FrontOfficeResult;
};

// ----------------------------------------------------------------------------
// Preset separation audit (see conversation record) found three problems
// with the original three-preset lineup and fixed them here. Nothing in
// frontOffice.ts changed — only which lever combinations these three named
// strategies point at.
//
// 1. "Spend to Contend" left developmentSpend at its FY2026 baseline ($18M)
//    while maxing payroll/coaching/facilities — silently forfeiting the top
//    4.6% of the engine's own win range (10.80 vs. an 11.02 ceiling) with no
//    disclosed reason. Fixed: developmentSpend now maxes too, so this preset
//    IS the engine's actual all-levers-maxed ceiling (11.02 wins).
//
// 2. "Develop and Promote" (floor payroll + maxed development + maxed
//    facilities) produced 9.45 wins against the FY2026 baseline's 9.50 — a
//    0.05-win difference — while costing $10.16M MORE than baseline. It was
//    strictly worse than baseline on both axes: not a strategy, a dominated
//    one. Root cause, confirmed by isolating each football lever's own
//    floor-to-max win contribution at baseline: coaching spend swings wins by
//    2.78 over its $50M range; development spend swings wins by only 0.68
//    over a comparable $30M range. A "development-first" preset was
//    competing with one hand tied — development is real but not this
//    engine's highest-leverage lever, coaching is. Rebuilt around that
//    finding: floor payroll (still the "not free agency" thesis) + coaching
//    maxed (coaching staff is unambiguously part of a player-development
//    program, not a free-agency cost) + facilities at its floor + scouting
//    spend at the FY2026 baseline. Result: 9.58 wins AND +$18.17M operating
//    result — it now dominates the FY2026 baseline outright (more wins, and
//    $19.27M better financially), which the old version never did.
//
// 3. The gap between the financial floor (6.21 wins) and the rebuilt
//    "Develop and Promote" (9.58 wins) looks like room for a fourth, "modest
//    but solvent, ~8 wins" preset. It was searched for and deliberately NOT
//    shipped: every lever combination tested in that gap — including the
//    engine's own true cost-minimal allocation for a fixed win target,
//    found by numerical search, not just the preset-style {floor, baseline,
//    max} grid — sits ON OR BELOW the straight line connecting Maximize the
//    Business and Develop and Promote in (financial score, on-field score)
//    space. That means for every strategy weighting from 0 to 1, a visitor
//    is always at least as well off at one of the two neighboring presets as
//    at any single "middle" plan — a 4th preset here would never be the best
//    choice at ANY point on the strategy-weighting slider, which is the
//    literal failure mode this audit was checking for. The gap is real, but
//    it isn't empty because a preset is missing — it's empty because the
//    engine's own cost structure (coaching's cost-efficiency saturates hard
//    once it's maxed, and nothing else is cheap enough to pick up the slack)
//    makes that stretch of the range strictly dominated by a plan on either
//    side of it. A user can still drag the sliders into that zone by hand;
//    it's just never the best preset to load.
//
// Verified for all three shipped presets: each is the strict optimum of
// franchiseHealthScore for a real range of strategyWeighting — Maximize the
// Business for w in [0, 0.68), Develop and Promote for w in [0.68, 0.73),
// Spend to Contend for w in [0.73, 1]. None is dominated everywhere.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Middle-preset swap (Candidate B audit, see conversation record): the
// former "Develop and Promote" allocation was replaced with a plan found on
// the Strategy Map's own 500-point Halton frontier — not assumed, searched.
// Its four win-determining levers (payroll, coaching, facilities,
// development) are that frontier point's own sampled allocation, rounded to
// the nearest $10K. strategyWeighting is set to 0.5 — matching Maximize the
// Business and Spend to Contend, both of which already default to 0.5
// rather than overriding it — specifically so this preset's Franchise
// Health score sits on the same footing as the other two rather than
// quietly using the frontier point's own raw sampled weighting (0.371,
// on-field-leaning), which would have made a cross-preset Franchise Health
// comparison misleading. strategyWeighting affects franchiseHealthScore
// only (see franchiseHealthScore in frontOffice.ts) — it does not change
// wins, revenue, cost, operating result, seed, or any Monte Carlo output.
//
// Local-efficiency audit (see conversation record): marketingSpend,
// gamedaySpend, and ticketPrice don't feed teamStrength at all (see
// teamStrength in frontOffice.ts) — only payroll, coaching, facilities, and
// development do. That means any change to those three revenue/cost-only
// levers that improves operatingResult is a strict Pareto improvement over
// the current plan (identical wins, strictly more profit), never a
// trade-off. Checked against the live engine (full-range sweeps confirming
// each curve is single-peaked, not just a local marginal check) for every
// preset: Maximize the Business was already sitting at each lever's own
// profit-maximizing point (it was built that way from the start — see
// argmaxMarketingSpend and TOP_OF_FREE_ZONE_TICKET_PRICE above). Both
// Spend to Contend and this preset were not: each had gamedaySpend and
// ticketPrice left at inherited baseline/frontier-sample values with real,
// engine-confirmed profit-only improvements sitting on the table — gameday
// spend's cost-to-attendance-quality curve is a linear cost against a
// saturating (diminishing-returns) benefit, so its profit-maximizing point
// is the driver's own $40M floor for every preset tested, not an interior
// value; ticket price's profit-maximizing point converges (via ternary
// search over the live engine, confirmed single-peaked by full $1
// resolution sweep) to the exact same ~$261.86 "top of the free zone" value
// Maximize the Business already uses, independent of team strength — a
// structural feature of the model's price/attendance curve, not a
// coincidence of any one preset's allocation. Only marketingSpend,
// gamedaySpend, and ticketPrice were touched by this pass; payroll,
// coaching, facilities, and development are unchanged from the Candidate B
// swap above, and Maximize the Business is untouched entirely (nothing
// dominated it). No model formula, coefficient, calibration constant, or
// simulation logic changed — only which values these two presets' three
// revenue-only levers point at.
const SPEND_TO_CONTEND_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_CAP,
  coachingSpend: driverMax("coachingSpend"),
  facilitiesSpend: driverMax("facilitiesSpend"),
  developmentSpend: driverMax("developmentSpend"),
  marketingSpend: 21_101_431.52,
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: TOP_OF_FREE_ZONE_TICKET_PRICE,
};

const BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS: FrontOfficeAssumptions = {
  payroll: 271_060_000,
  coachingSpend: 68_150_000,
  facilitiesSpend: 18_320_000,
  developmentSpend: 28_270_000,
  marketingSpend: 21_749_290.92,
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: TOP_OF_FREE_ZONE_TICKET_PRICE,
  strategyWeighting: 0.5,
};

// Ordered to match the strategy spectrum this section narrates: prioritize
// the business, hold a competitive/efficient middle ground, or push
// football investment to the ceiling — finance-first to wins-first left to
// right, not the order the presets were originally authored in.
const FRONT_OFFICE_PRESETS: FrontOfficePreset[] = [
  {
    key: "maximizeBusiness",
    label: "Maximize the Business",
    description:
      "Every football-ops lever (payroll, coaching, facilities, scouting, gameday) at its floor; marketing funded to its own profit-maximizing point, not its max; ticket price at the top of the free zone. This is the model's actual financial ceiling, found by searching the engine, not assumed. Prioritizes operating economics and franchise health even as competitive performance declines.",
    assumptions: MAXIMIZE_BUSINESS_ASSUMPTIONS,
    result: runFrontOfficeSimulation(MAXIMIZE_BUSINESS_ASSUMPTIONS),
  },
  {
    key: "buildThroughDevelopment",
    label: "Build Through Development",
    description:
      "Invest heavily in coaching and player development, keep player payroll below the cap, and preserve strong operating economics while remaining competitive. The competitive edge comes from coaching and scouting/development spend; marketing, gameday operations, and ticket price are each set to their own engine-searched profit-maximizing point rather than a round number, since none of the three affects expected wins. It sits near the sampled efficient frontier — one sampled plan edges it out by a fraction of a win and about $1M, well inside this sample's resolution — chosen for what it represents (win through coaching and development, not free agency), not picked to chase that fractional edge.",
    assumptions: BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS,
    result: runFrontOfficeSimulation(BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS),
  },
  {
    key: "spendToContend",
    label: "Spend to Contend",
    description:
      "Every football-ops lever at its max: payroll at the cap, coaching, facilities, and scouting/development all maxed out. This is the engine's actual win ceiling (11.02 expected wins) — not close to it. Marketing, gameday operations, and ticket price are each set to their own engine-searched profit-maximizing point rather than the FY2026 baseline, since none of the three affects expected wins — pushing football investment to the competitive ceiling still costs real operating profit compared to the other two presets, but far less than leaving those three revenue levers unoptimized would suggest.",
    assumptions: SPEND_TO_CONTEND_ASSUMPTIONS,
    result: runFrontOfficeSimulation(SPEND_TO_CONTEND_ASSUMPTIONS),
  },
];

// Module-level derived facts for the hero's proof-point row and the closing
// "What the Model Shows" card — every figure below is read off the same
// committed engine calls the rest of the page already makes (preset.result,
// runFrontOfficeMonteCarlo), never a separately hand-typed number, so none
// of them can drift from what the console itself would show for these
// plans.
const FRONT_OFFICE_PRESETS_BY_WINS = [...FRONT_OFFICE_PRESETS].sort((a, b) => a.result.wins - b.result.wins);
const LOWEST_WIN_PRESET = FRONT_OFFICE_PRESETS_BY_WINS[0];
const HIGHEST_WIN_PRESET = FRONT_OFFICE_PRESETS_BY_WINS[FRONT_OFFICE_PRESETS_BY_WINS.length - 1];
const STRATEGY_RANGE_OPERATING_PROFIT_SPREAD = Math.abs(
  HIGHEST_WIN_PRESET.result.operatingResult - LOWEST_WIN_PRESET.result.operatingResult
);

const BUILD_THROUGH_DEVELOPMENT_PRESET = FRONT_OFFICE_PRESETS.find((p) => p.key === "buildThroughDevelopment")!;
const SPEND_TO_CONTEND_PRESET = FRONT_OFFICE_PRESETS.find((p) => p.key === "spendToContend")!;
const DETERMINISTIC_PRESET_GAP = Math.abs(
  BUILD_THROUGH_DEVELOPMENT_PRESET.result.operatingResult - SPEND_TO_CONTEND_PRESET.result.operatingResult
);

// Precomputed by scripts/precompute-front-office-closing-card.mts (real
// runFrontOfficeMonteCarlo output at the same MONTE_CARLO_RUNS the console's
// own "Run 1,000 Seasons" button uses) rather than run here at module load.
// Measured cost of running both live in this "use client" module: ~38ms in
// every visitor's browser on top of the Strategy Map's own 500-plan Halton
// sample — real but avoidable, since neither preset's assumptions change at
// runtime. See that script's header for how to regenerate after a change to
// either preset's assumptions.
const BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO = BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO_STATS;
const SPEND_TO_CONTEND_MONTE_CARLO = SPEND_TO_CONTEND_MONTE_CARLO_STATS;
const SIMULATED_MEDIAN_PRESET_GAP = Math.abs(
  BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO.medianOperatingResult - SPEND_TO_CONTEND_MONTE_CARLO.medianOperatingResult
);
const SIMULATED_VS_DETERMINISTIC_GAP_RATIO = SIMULATED_MEDIAN_PRESET_GAP / DETERMINISTIC_PRESET_GAP;

function assumptionsEqual(a: FrontOfficeAssumptions, b: FrontOfficeAssumptions): boolean {
  return (Object.keys(a) as FrontOfficeDriverKey[]).every((key) => a[key] === b[key]);
}

// ============================================================================
// Strategy Map / "You Are Here" — presentation layer only. Every plotted
// point comes from calling the committed runFrontOfficeSimulation() on a
// real, valid FrontOfficeAssumptions object; nothing here re-derives wins or
// operating result by any other means.
// ============================================================================

/** [DERIVED] FY2026 baseline plotted as a run of the live engine on
 * FRONT_OFFICE_BASE_DEFAULTS — by construction this reproduces the sourced
 * 9.50 wins / -$1.10M exactly, same as every other point on this chart, so
 * the baseline sits on identical footing to the presets and the current
 * plan rather than being a separately-sourced number. */
const FY2026_BASELINE_RESULT = runFrontOfficeSimulation(FRONT_OFFICE_BASE_DEFAULTS);

const STRATEGY_MAP_SAMPLE_SIZE = 500;

type StrategyMapPoint = { wins: number; operatingResult: number };

// The 500-plan Halton-sampled feasible cloud, precomputed by
// scripts/precompute-front-office-strategy-map.mts (real engine output,
// nothing hand-typed — see that script and frontOfficePureAssumptions.ts's
// sampleFeasibleFrontOfficePlans for the exact sampling algorithm) instead
// of rebuilt here at module load in every visitor's browser. Measured cost
// of running it live: ~240ms of blocking JS per visit, on a cloud that
// never depends on the current plan and so never needs to be recomputed
// anyway.
const STRATEGY_MAP_FEASIBLE_SAMPLE: StrategyMapPoint[] = STRATEGY_MAP_FEASIBLE_SAMPLE_DATA;

/**
 * Non-dominated (efficient) frontier: a point survives only if no other
 * candidate matches or beats it on wins AND on operating result with at
 * least one strictly better — the exact dominance rule specified, not an
 * approximation. Standard two-objective skyline algorithm: sort candidates
 * by wins descending or, on a wins tie, by operating result descending;
 * scan once, keeping a running best operating result seen so far; a point
 * survives only if it strictly beats that running best (otherwise some
 * earlier point already has >= wins AND >= operating result). Run against
 * the 500-plan Halton sample PLUS the explicitly injected boundary/reference
 * plans below (STRATEGY_MAP_INJECTED_ANCHORS) — both extremes (every lever
 * at its floor; every lever at its cap), the three presets, the FY2026
 * baseline, and all four payroll-floor/cap x football-levers-min/max
 * corners — so the frontier is checked against the engine's true 6.21/11.02
 * win extremes as real evaluated plans, not just inferred from wherever the
 * random sample happened to land closest to them.
 */
function computeEfficientFrontier(points: StrategyMapPoint[]): StrategyMapPoint[] {
  const sorted = [...points].sort(
    (a, b) => b.wins - a.wins || b.operatingResult - a.operatingResult
  );
  const frontier: StrategyMapPoint[] = [];
  let bestOperatingResult = -Infinity;
  for (const p of sorted) {
    if (p.operatingResult > bestOperatingResult) {
      frontier.push(p);
      bestOperatingResult = p.operatingResult;
    }
  }
  return frontier.sort((a, b) => a.wins - b.wins);
}

// The ten explicitly injected boundary/reference plans (both extremes, the
// FY2026 baseline, the three presets, and all four payroll x football-lever
// corners), precomputed by the same script alongside the feasible sample —
// see frontOfficePureAssumptions.ts's STRATEGY_MAP_INJECTED_ANCHOR_ASSUMPTIONS
// for the exact ten assumption objects each key maps to.
const STRATEGY_MAP_INJECTED_ANCHORS: (StrategyMapPoint & { key: string })[] = STRATEGY_MAP_INJECTED_ANCHORS_DATA;

// The subset of injected anchors worth a distinct (if unlabeled) mark in the
// cloud: the true floor/ceiling and the four payroll x football-lever
// corners. FY2026 baseline and the three presets already get their own
// dedicated, labeled markers elsewhere on the chart, so repeating them here
// would just draw a second dot under an existing one.
const STRATEGY_MAP_EXTRA_ANCHOR_KEYS = new Set([
  "allMin",
  "allMax",
  "payrollFloorFootballMin",
  "payrollFloorFootballMax",
  "payrollCapFootballMin",
]);
const STRATEGY_MAP_EXTRA_ANCHOR_POINTS: StrategyMapPoint[] = STRATEGY_MAP_INJECTED_ANCHORS.filter((a) =>
  STRATEGY_MAP_EXTRA_ANCHOR_KEYS.has(a.key)
);

const STRATEGY_MAP_FRONTIER_CANDIDATES: StrategyMapPoint[] = [
  ...STRATEGY_MAP_FEASIBLE_SAMPLE,
  ...STRATEGY_MAP_INJECTED_ANCHORS,
];
const STRATEGY_MAP_FRONTIER = computeEfficientFrontier(STRATEGY_MAP_FRONTIER_CANDIDATES);

const STRATEGY_MAP_VIEW = { width: 860, height: 420, margin: { top: 24, right: 28, bottom: 48, left: 78 } };

/**
 * The Strategy Map / "You Are Here" chart. Presentation only: every (wins,
 * operatingResult) pair it draws — presets, FY2026 baseline, the feasible
 * cloud, the frontier, and the current plan — comes from
 * runFrontOfficeSimulation, called either here at module load (the fixed
 * reference layers above) or once per assumptions change by the parent
 * (the `result` prop). Nothing below re-derives either number.
 */
function StrategyMapChart({ result }: { result: FrontOfficeResult }) {
  const currentPoint: StrategyMapPoint = { wins: result.wins, operatingResult: result.operatingResult };
  const baselinePoint: StrategyMapPoint = {
    wins: FY2026_BASELINE_RESULT.wins,
    operatingResult: FY2026_BASELINE_RESULT.operatingResult,
  };

  const domain = useMemo(() => {
    const allWins = [
      ...STRATEGY_MAP_FEASIBLE_SAMPLE.map((p) => p.wins),
      ...STRATEGY_MAP_EXTRA_ANCHOR_POINTS.map((p) => p.wins),
      ...FRONT_OFFICE_PRESETS.map((p) => p.result.wins),
      baselinePoint.wins,
      currentPoint.wins,
    ];
    const allOperatingResults = [
      ...STRATEGY_MAP_FEASIBLE_SAMPLE.map((p) => p.operatingResult),
      ...STRATEGY_MAP_EXTRA_ANCHOR_POINTS.map((p) => p.operatingResult),
      ...FRONT_OFFICE_PRESETS.map((p) => p.result.operatingResult),
      baselinePoint.operatingResult,
      currentPoint.operatingResult,
    ];
    const winsMin = Math.min(...allWins);
    const winsMax = Math.max(...allWins);
    const opMin = Math.min(...allOperatingResults);
    const opMax = Math.max(...allOperatingResults);
    const winsPad = (winsMax - winsMin) * 0.08 || 1;
    const opPad = (opMax - opMin) * 0.08 || 1_000_000;
    return { winsMin: winsMin - winsPad, winsMax: winsMax + winsPad, opMin: opMin - opPad, opMax: opMax + opPad };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPoint.wins, currentPoint.operatingResult]);

  const { width, height, margin } = STRATEGY_MAP_VIEW;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  // Rounded to 2dp: SVG coordinates only, no effect on any plotted value —
  // avoids a server/client hydration mismatch from floating-point noise in
  // the last few digits of an unrounded pixel position.
  const xScale = (wins: number) =>
    Math.round((margin.left + ((wins - domain.winsMin) / (domain.winsMax - domain.winsMin)) * plotWidth) * 100) / 100;
  const yScale = (op: number) =>
    Math.round((margin.top + (1 - (op - domain.opMin) / (domain.opMax - domain.opMin)) * plotHeight) * 100) / 100;

  const winsTicks = Array.from({ length: 5 }, (_, i) => domain.winsMin + (i / 4) * (domain.winsMax - domain.winsMin));
  const opTicks = Array.from({ length: 5 }, (_, i) => domain.opMin + (i / 4) * (domain.opMax - domain.opMin));

  const regionX = xScale(ACTUAL_2025_WIN_TOTAL);
  const regionY = yScale(OPERATING_RESULT);
  const frontierPath = STRATEGY_MAP_FRONTIER.map(
    (p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.wins).toFixed(1)} ${yScale(p.operatingResult).toFixed(1)}`
  ).join(" ");

  const meetsCompetitive = result.wins >= ACTUAL_2025_WIN_TOTAL;
  const meetsFinancial = result.operatingResult > OPERATING_RESULT;
  const tone: BadgeTone =
    meetsCompetitive && meetsFinancial ? "good" : !meetsCompetitive && !meetsFinancial ? "bad" : "neutral";
  const badge =
    tone === "good" ? "Above Both References" : tone === "bad" ? "Below Both References" : "Splits the References";

  // "Computed insight": how many of the evaluated feasible plans — the 500
  // Halton samples plus the ten injected boundary/reference plans, the same
  // pool the frontier itself is computed from — strictly beat this exact
  // plan on both axes. A direct count against real engine output, not an
  // estimate of frontier distance.
  const dominatingCount = STRATEGY_MAP_FRONTIER_CANDIDATES.filter(
    (p) =>
      p.wins >= currentPoint.wins &&
      p.operatingResult >= currentPoint.operatingResult &&
      (p.wins > currentPoint.wins || p.operatingResult > currentPoint.operatingResult)
  ).length;
  const onFrontier = dominatingCount === 0;

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft sm:hidden">
        <span aria-hidden>&larr;</span> Scroll to see the full chart <span aria-hidden>&rarr;</span>
      </p>
      <div className="overflow-x-auto rounded-2xl border border-forest/15 bg-white p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: 620 }}
          role="img"
          aria-label={`Strategy map plotting projected wins against operating result. Current plan sits at ${result.wins.toFixed(
            2
          )} wins and ${formatCurrencyCompact(result.operatingResult)}.`}
        >
          {/* Subtle "clears both references" tint — restrained, not a labeled quadrant infographic */}
          <rect
            x={regionX}
            y={margin.top}
            width={Math.max(0, margin.left + plotWidth - regionX)}
            height={Math.max(0, regionY - margin.top)}
            fill="#1e3a2b"
            fillOpacity={0.045}
          />

          {winsTicks.map((t, i) => (
            <line
              key={`vg-${i}`}
              x1={xScale(t)}
              x2={xScale(t)}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#2a2820"
              strokeOpacity={0.06}
            />
          ))}
          {opTicks.map((t, i) => (
            <line
              key={`hg-${i}`}
              x1={margin.left}
              x2={margin.left + plotWidth}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="#2a2820"
              strokeOpacity={0.06}
            />
          ))}

          <line
            x1={margin.left}
            x2={margin.left + plotWidth}
            y1={margin.top + plotHeight}
            y2={margin.top + plotHeight}
            stroke="#2a2820"
            strokeOpacity={0.25}
          />
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="#2a2820" strokeOpacity={0.25} />

          {winsTicks.map((t, i) => (
            <text key={`vt-${i}`} x={xScale(t)} y={margin.top + plotHeight + 16} textAnchor="middle" fontSize={9} fill="#5b5847">
              {t.toFixed(1)}
            </text>
          ))}
          {opTicks.map((t, i) => (
            <text key={`ht-${i}`} x={margin.left - 8} y={yScale(t) + 3} textAnchor="end" fontSize={9} fill="#5b5847">
              {formatCurrencyCompact(t)}
            </text>
          ))}

          <text
            x={margin.left + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#5b5847"
            letterSpacing="0.04em"
          >
            PROJECTED WINS
          </text>
          <text
            x={14}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#5b5847"
            letterSpacing="0.04em"
            transform={`rotate(-90 14 ${margin.top + plotHeight / 2})`}
          >
            OPERATING RESULT
          </text>

          {/* Board reference lines — read from the same engine constants the rest of the page uses */}
          <line x1={regionX} x2={regionX} y1={margin.top} y2={margin.top + plotHeight} stroke="#2a2820" strokeOpacity={0.35} strokeDasharray="4 3" />
          <line x1={margin.left} x2={margin.left + plotWidth} y1={regionY} y2={regionY} stroke="#2a2820" strokeOpacity={0.35} strokeDasharray="4 3" />
          <text x={regionX + 5} y={margin.top + 11} fontSize={9} fill="#5b5847">
            {ACTUAL_2025_WIN_TOTAL} wins (FY2026 cutline)
          </text>
          <text x={margin.left + 5} y={regionY + 13} fontSize={9} fill="#5b5847">
            FY2026 operating result
          </text>

          {/* Feasible-region cloud — faint, background. The 500 Halton-sampled
              plans (small, very faint) and the explicitly injected boundary
              cases (slightly larger and more solid) are visually distinct
              layers, not because every injected point needs its own label,
              but because a visitor should be able to tell "randomly sampled"
              from "deliberately evaluated at a known extreme" at a glance. */}
          {STRATEGY_MAP_FEASIBLE_SAMPLE.map((p, i) => (
            <circle key={`cloud-${i}`} cx={xScale(p.wins)} cy={yScale(p.operatingResult)} r={2} fill="#1e3a2b" fillOpacity={0.09} />
          ))}
          {STRATEGY_MAP_EXTRA_ANCHOR_POINTS.map((p, i) => (
            <circle key={`anchor-${i}`} cx={xScale(p.wins)} cy={yScale(p.operatingResult)} r={3.5} fill="#1e3a2b" fillOpacity={0.4} />
          ))}

          {/* Efficient frontier — emphasized over the cloud */}
          <path d={frontierPath} fill="none" stroke="#1e3a2b" strokeWidth={1.75} strokeOpacity={0.55} />

          {/* FY2026 Baseline — a diamond with a dashed ring, deliberately unlike the solid preset circles: a historical reference, not a selectable strategy */}
          <g transform={`translate(${xScale(baselinePoint.wins)}, ${yScale(baselinePoint.operatingResult)})`}>
            <rect x={-8} y={-8} width={16} height={16} fill="none" stroke="#2a2820" strokeOpacity={0.4} strokeDasharray="2 2" transform="rotate(45)" />
            <rect x={-5} y={-5} width={10} height={10} fill="#2a2820" fillOpacity={0.85} transform="rotate(45)" />
            <text y={22} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#2a2820">
              FY2026 Baseline
            </text>
          </g>

          {/* The three presets — reference points, not selectable from this chart.
              All three label above their own dot: the middle preset previously
              labeled below (to stay clear of its own dot when it was assumed
              isolated), but its dot — when that preset was still "Develop and
              Promote" — sat close enough to the FY2026 Baseline diamond that a
              below-placed label overlapped the diamond shape itself — moving it
              above keeps every preset label on the same, predictable side and
              pulls it away from the baseline marker instead of toward it. Build
              Through Development now sits well clear of the baseline, but the
              shared above-placement convention is kept for all three rather
              than special-cased per preset. */}
          {FRONT_OFFICE_PRESETS.map((preset) => {
            const x = xScale(preset.result.wins);
            const y = yScale(preset.result.operatingResult);
            return (
              <g key={preset.key}>
                <circle cx={x} cy={y} r={6} fill="#96703e" stroke="#f5f1e6" strokeWidth={1.5} />
                <text x={x} y={y - 11} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#96703e">
                  {preset.label}
                </text>
              </g>
            );
          })}

          {/* Current Plan — the one point that moves, smoothly, on every lever
              change. Its label tries a fixed sequence of candidate positions
              (right, left, above, below, then the four diagonals) and uses
              the first one that doesn't overlap any other label's own
              (estimated) bounding box — because the current plan routinely
              lands exactly on a preset, or (with the old, since-replaced
              "Develop and Promote" allocation) close to a tightly-clustered
              baseline/preset pair, and no single fixed offset avoids every
              other label in every one of those cases. */}
          {(() => {
            const cx = xScale(currentPoint.wins);
            const cy = yScale(currentPoint.operatingResult);

            // Rough estimated label footprint, calibrated against this
            // chart's own rendered text (9.5-10px bold, this font stack):
            // ~5.4 SVG units per character, ~12 units tall. Only used to
            // pick a non-colliding position for the one label that moves —
            // never plotted or shown, so an estimate is fine here.
            const CHAR_WIDTH = 5.4;
            // "YOU ARE HERE" is bold, all-caps, and letter-spaced — measurably
            // wider per character than this chart's other (title-case,
            // normal-spacing) labels, so it gets its own, larger estimate
            // rather than sharing CHAR_WIDTH and under-counting its own footprint.
            const YOU_ARE_HERE_CHAR_WIDTH = 6.8;
            const LABEL_HEIGHT = 12;
            type LabelRect = { x1: number; x2: number; y1: number; y2: number };
            const textRect = (
              anchorX: number,
              anchorY: number,
              text: string,
              anchor: "start" | "middle" | "end",
              charWidth: number = CHAR_WIDTH
            ): LabelRect => {
              const w = text.length * charWidth;
              const x1 = anchor === "start" ? anchorX : anchor === "end" ? anchorX - w : anchorX - w / 2;
              return { x1, x2: x1 + w, y1: anchorY - LABEL_HEIGHT * 0.8, y2: anchorY + LABEL_HEIGHT * 0.3 };
            };
            const overlaps = (a: LabelRect, b: LabelRect) =>
              a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

            const baselineX = xScale(baselinePoint.wins);
            const baselineY = yScale(baselinePoint.operatingResult);
            // Includes the marker SHAPES too (the baseline diamond, the preset
            // dots), not just their text — a prior version of this list only
            // checked label-vs-label and missed that a preset's own label
            // could overlap a nearby marker's graphic instead of its text.
            const referenceRects: LabelRect[] = [
              textRect(baselineX, baselineY + 22, "FY2026 Baseline", "middle"),
              { x1: baselineX - 12, x2: baselineX + 12, y1: baselineY - 12, y2: baselineY + 12 },
              ...FRONT_OFFICE_PRESETS.flatMap((preset) => {
                const px = xScale(preset.result.wins);
                const py = yScale(preset.result.operatingResult);
                return [
                  textRect(px, py - 11, preset.label, "middle"),
                  { x1: px - 7, x2: px + 7, y1: py - 7, y2: py + 7 },
                ];
              }),
              textRect(margin.left + 5, regionY + 13, "FY2026 operating result", "start"),
              textRect(regionX + 5, margin.top + 11, `${ACTUAL_2025_WIN_TOTAL} wins (FY2026 cutline)`, "start"),
            ];

            const YOU_ARE_HERE = "YOU ARE HERE";
            // Graduated escalation: try the tight, close-to-the-marker
            // offsets first (best-looking for an isolated point), then
            // widen. The preset/baseline labels are wide (up to ~100 SVG
            // units) relative to how close the current plan often sits to
            // them — e.g. loading a preset puts it exactly on that preset's
            // label, and the old "Develop and Promote" allocation sat close
            // enough to the baseline that a +-15 nudge never cleared either
            // one's full width — so the wide candidates exist specifically
            // for that clustered case (kept even though Build Through
            // Development itself no longer sits that close to baseline).
            const candidates: { dx: number; dy: number; anchor: "start" | "middle" | "end" }[] = [
              { dx: 15, dy: 4, anchor: "start" },
              { dx: -15, dy: 4, anchor: "end" },
              { dx: 0, dy: -24, anchor: "middle" },
              { dx: 0, dy: 30, anchor: "middle" },
              { dx: 70, dy: 4, anchor: "start" },
              { dx: -70, dy: 4, anchor: "end" },
              { dx: 40, dy: -24, anchor: "start" },
              { dx: -40, dy: -24, anchor: "end" },
              { dx: 40, dy: 30, anchor: "start" },
              { dx: -40, dy: 30, anchor: "end" },
              { dx: 90, dy: -24, anchor: "start" },
              { dx: -90, dy: -24, anchor: "end" },
            ];
            // Pick the first candidate with zero collisions; if every one
            // collides with something (only possible in extreme clustering),
            // fall back to whichever collides with the fewest reference labels.
            let chosen = candidates[0];
            let bestCollisions = Infinity;
            for (const c of candidates) {
              const rect = textRect(cx + c.dx, cy + c.dy, YOU_ARE_HERE, c.anchor, YOU_ARE_HERE_CHAR_WIDTH);
              const withinBounds = rect.x1 >= margin.left - 4 && rect.x2 <= margin.left + plotWidth + 4;
              if (!withinBounds) continue;
              const collisions = referenceRects.filter((r) => overlaps(rect, r)).length;
              if (collisions === 0) {
                chosen = c;
                bestCollisions = 0;
                break;
              }
              if (collisions < bestCollisions) {
                chosen = c;
                bestCollisions = collisions;
              }
            }

            return (
              <g style={{ transition: "transform 300ms ease-out" }} transform={`translate(${cx}, ${cy})`}>
                <circle r={12} fill="none" stroke="#1e3a2b" strokeOpacity={0.3} strokeWidth={2} />
                <circle r={7} fill="#1e3a2b" stroke="#f5f1e6" strokeWidth={2} />
                <text
                  x={chosen.dx}
                  y={chosen.dy}
                  textAnchor={chosen.anchor}
                  fontSize={10}
                  fontWeight={700}
                  fill="#1e3a2b"
                  letterSpacing="0.04em"
                >
                  {YOU_ARE_HERE}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-charcoal-soft">
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="4.5" fill="#1e3a2b" />
          </svg>
          Current Plan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="4.5" fill="#96703e" />
          </svg>
          Presets
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <rect x="1" y="1" width="8" height="8" fill="#2a2820" transform="rotate(45 5 5)" />
          </svg>
          FY2026 Baseline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="10" aria-hidden>
            <line x1="1" y1="5" x2="15" y2="5" stroke="#1e3a2b" strokeWidth="2" />
          </svg>
          Efficient Frontier
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="10" aria-hidden>
            <circle cx="2" cy="6" r="1.5" fill="#1e3a2b" fillOpacity="0.35" />
            <circle cx="8" cy="3" r="1.5" fill="#1e3a2b" fillOpacity="0.35" />
            <circle cx="13" cy="7" r="1.5" fill="#1e3a2b" fillOpacity="0.35" />
          </svg>
          Feasible Plans (sampled)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="#1e3a2b" fillOpacity="0.4" />
          </svg>
          Boundary Cases
        </span>
      </div>

      <MonteCarloChartCaption
        statLabel="Current Plan"
        statValue={`${result.wins.toFixed(2)} Wins · ${formatSignedCompact(result.operatingResult)}`}
        badge={badge}
        tone={tone}
        alertLead={
          onFrontier
            ? "This plan sits on the sampled efficient frontier."
            : `${dominatingCount} of ${STRATEGY_MAP_FRONTIER_CANDIDATES.length} evaluated plans dominate this one.`
        }
        alertExplanation={
          onFrontier
            ? `No plan among the ${STRATEGY_MAP_FRONTIER_CANDIDATES.length} evaluated feasible plans below is equal-or-better on both projected wins and operating result — within this set, everything that does better on one axis does worse on the other.`
            : `Those plans are equal-or-better on both projected wins and operating result, with at least one strictly better — a real, feasible reallocation of the same eight levers does strictly better without giving up ground elsewhere.`
        }
        explainer={`A plan is "dominated" when another feasible plan is equal-or-better on both projected wins and operating result, with at least one strictly better. The "sampled efficient frontier" is the sequence of actually-evaluated plans that no other evaluated plan dominates — run against real engine output across ${STRATEGY_MAP_FRONTIER_CANDIDATES.length} evaluated plans (${STRATEGY_MAP_SAMPLE_SIZE} Halton-sampled, plus ten explicitly injected boundary cases: both true extremes, the FY2026 baseline, all three presets, and every payroll-floor/cap x football-lever corner). Each Halton-sampled plan varies only the four levers that actually move projected wins — payroll, coaching, facilities, and scouting/development — while ticket price and gameday spend are fixed at their own engine-confirmed profit-maximizing values (the same ones the three presets use) and marketing is optimized for that specific plan by the same search method used to build Maximize the Business; strategy weighting is left out of the sample since it affects only Franchise Health, never wins or operating result. That puts every sampled point on equal financial-efficiency footing, so the frontier reflects genuine strategic trade-off rather than which points also happened to get a lucky, unoptimized ticket price or marketing budget. The line between frontier points is a visual connector only, not a claim that the plans in between were tested, and this is a sampled frontier over a finite evaluated set, not a proof of global optimality. The faint cloud is the ${STRATEGY_MAP_SAMPLE_SIZE} Halton-sampled plans; the slightly larger, more solid dots are the ten injected boundary cases.`}
        explainerCollapsible
      />
    </div>
  );
}

export default function FrontOfficeSimulator() {
  const [assumptions, setAssumptions] = useState<FrontOfficeAssumptions>(FRONT_OFFICE_BASE_DEFAULTS);
  const [marginalMetric, setMarginalMetric] = useState<MarginalMetric>("operatingResult");
  // Monte Carlo is a deliberate action, not something that recomputes on
  // every slider move (see Section 1 of the brief) — null means "no run
  // for the current plan," and every assumptions change resets it to null
  // via set()/resetToBaseline() below, so a stale distribution can never
  // sit next to a plan it no longer describes.
  const [monteCarlo, setMonteCarlo] = useState<FrontOfficeMonteCarloResult | null>(null);
  // The standings table defaults to the playoff field + the Packers' own
  // row (so it's compact enough to sit beside the sliders at a glance) —
  // expandable to all 16 on request.
  const [standingsExpanded, setStandingsExpanded] = useState(false);
  // Each preset's full description lives in its `title` attribute (a hover
  // tooltip) for desktop mouse users — invisible on touch, where nothing
  // hovers. This tracks which preset's description is expanded inline
  // instead, so the same content is reachable by tap. Only one open at a
  // time; independent of which preset is actually loaded.
  const [expandedPresetKey, setExpandedPresetKey] = useState<string | null>(null);
  // Bumped only on loadPreset() below — never on a slider nudge or reset —
  // so the causal diagram's own number-tween animation fires specifically
  // for "load a strategy and watch the chain re-settle," the one motion the
  // spec calls for, and stays silent for ordinary dragging.
  const [presetLoadTick, setPresetLoadTick] = useState(0);

  const result = useMemo(() => runFrontOfficeSimulation(assumptions), [assumptions]);
  // result.playoff.seed IS the standings' seed — buildStandings below calls
  // the same buildNfcField() the engine itself uses for playoff hosting, so
  // there is exactly one seed number anywhere on this page. See "One Seed,
  // Everywhere" in Assumptions & Limitations.
  const standings = useMemo(() => buildStandings(result), [result]);
  const visibleStandings = useMemo(
    () => (standingsExpanded ? standings : standings.filter((r) => r.seed !== null || r.isPackers)),
    [standings, standingsExpanded]
  );
  const marginalImpact = useMemo(
    () => computeMarginalImpact(assumptions, marginalMetric),
    [assumptions, marginalMetric]
  );
  // The compact P&L's bars scale against the larger of the two totals, so
  // every line item reads as its share of whichever side is bigger — the
  // same "scale against the largest value in the list" rule Marginal
  // Impact's own bars already use.
  const pnlScale = Math.max(result.revenue.total, result.cost.total);

  const set = <K extends keyof FrontOfficeAssumptions>(key: K) => (value: number) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
    setMonteCarlo(null);
  };

  const runSimulation = () => setMonteCarlo(runFrontOfficeMonteCarlo(assumptions, MONTE_CARLO_RUNS));

  const resetToBaseline = () => {
    setAssumptions(FRONT_OFFICE_BASE_DEFAULTS);
    setMonteCarlo(null);
  };

  const loadPreset = (preset: FrontOfficePreset) => {
    setAssumptions(preset.assumptions);
    setMonteCarlo(null);
    setPresetLoadTick((t) => t + 1);
  };

  const playoffTargetMet = result.playoff.madePlayoffs;
  const financialTargetMet = result.operatingResult > OPERATING_RESULT;

  const capBindState: "cap" | "floor" | null =
    result.capUsed >= SALARY_CAP ? "cap" : assumptions.payroll <= SALARY_FLOOR ? "floor" : null;

  // The verdict quotes this exact plan's Monte Carlo run once one exists —
  // resets to the point-estimate reading the moment a lever moves, since
  // set()/resetToBaseline()/loadPreset() all null out monteCarlo already.
  const verdict = useMemo(
    () =>
      buildFrontOfficeVerdict(
        result,
        monteCarlo && {
          playoffProbability: monteCarlo.playoffProbability,
          probabilityBeatsFY2026: monteCarlo.probabilityBeatsFY2026,
          medianOperatingResult: monteCarlo.medianOperatingResult,
        }
      ),
    [result, monteCarlo]
  );

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
          FY2026 was a paradox: {formatCurrencyCompact(TOTAL_REVENUE)} in revenue — a franchise
          record — and a {formatCurrencyCompact(OPERATING_RESULT)} operating result in the same
          season. The three strategies below span{" "}
          {formatCurrencyCompact(STRATEGY_RANGE_OPERATING_PROFIT_SPREAD)}{" "}
          in operating profit, from the most conservative to the most aggressive. Every plan
          below is built on the Packers&apos; own disclosed numbers — the only NFL franchise
          that publishes them.
        </p>

        {/* Proof-point row — results, not activity counts. Both figures are
            read straight off the same preset.result values the console and
            presets already use (see the module-level constants above), so
            they can only ever say what the engine actually found. */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-brass/30 bg-brass-pale/30 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brass">
              FY2026 &mdash; Sourced
            </span>
            <p className="mt-1.5 text-xl font-black tracking-tight text-charcoal sm:text-2xl">
              {formatCurrencyCompact(TOTAL_REVENUE)}{" "}
              <span className="text-charcoal-soft">&rarr;</span>{" "}
              {formatCurrencyCompact(OPERATING_RESULT)}
            </p>
            <p className="mt-1 text-xs leading-5 text-charcoal-soft">
              Record revenue. An operating loss. Same season.
            </p>
          </div>
          <div className="rounded-xl border-2 border-brass/30 bg-brass-pale/30 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brass">
              Across the Full Strategy Range
            </span>
            <p className="mt-1.5 text-xl font-black tracking-tight text-charcoal sm:text-2xl">
              {formatCurrencyCompact(STRATEGY_RANGE_OPERATING_PROFIT_SPREAD)}
            </p>
            <p className="mt-1 text-xs leading-5 text-charcoal-soft">
              Operating-profit spread between the {LOWEST_WIN_PRESET.result.wins.toFixed(2)}-win
              plan and the {HIGHEST_WIN_PRESET.result.wins.toFixed(2)}-win plan.
            </p>
          </div>
        </div>

        {/* The board's mandate */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="I" label="The Question" />
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
                A top-7 seed in the real NFC field (see NFC Standings) — {PLAYOFF_LINE_WINS}{" "}
                wins got the 7-seed in the actual 2025 season, though the exact cutoff for a given plan
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

        {/* How this model thinks — the onboarding layer. First interactive
            thing on the page: the causal-chain diagram plus the scenario
            presets, so a visitor clicks a strategy and watches the whole
            chain re-settle before ever touching a slider. The console below
            keeps its own, separate Reset to FY2026 Baseline. */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="II" label="The Model" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            How This Model Thinks
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            Six levers, one fixed revenue line the board can&apos;t touch, and a chain connecting
            them to the board&apos;s two targets. Load a strategy and watch it move before you
            touch a single slider.
          </p>

          <div className="mt-4 flex flex-wrap items-start gap-2">
            {FRONT_OFFICE_PRESETS.map((preset) => {
              const active = assumptionsEqual(assumptions, preset.assumptions);
              const infoOpen = expandedPresetKey === preset.key;
              return (
                <div key={preset.key} className="flex max-w-xs flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => loadPreset(preset)}
                    title={preset.description}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border px-4 py-2 text-left transition-colors ${
                      active
                        ? "border-forest bg-forest text-cream"
                        : "border-forest/20 bg-white text-forest hover:bg-forest/5"
                    }`}
                  >
                    <span className="text-sm font-semibold">{preset.label}</span>
                    {/* Engine-derived, not a second estimate — read straight off
                        preset.result, computed once at module load by calling
                        runFrontOfficeSimulation on this preset's own assumptions. */}
                    <span className={`text-[11px] font-medium ${active ? "text-cream/80" : "text-charcoal-soft"}`}>
                      {preset.result.wins.toFixed(2)} Wins · {formatSignedCompact(preset.result.operatingResult)}
                    </span>
                  </button>
                  {/* Tap-accessible equivalent of the button's own title=
                      tooltip above — the tooltip never fires on touch, so
                      this is the only way a phone/tablet visitor reads what
                      each preset actually represents. */}
                  <button
                    type="button"
                    onClick={() => setExpandedPresetKey(infoOpen ? null : preset.key)}
                    aria-expanded={infoOpen}
                    className="self-start text-[11px] font-semibold text-forest underline decoration-forest/40 underline-offset-2 hover:decoration-forest"
                  >
                    {infoOpen ? "Hide details" : "What is this?"}
                  </button>
                  {infoOpen && (
                    <p className="text-[11px] leading-5 text-charcoal-soft">{preset.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Full-bleed: the diagram is wide (9 causal stages) and reads
              better with more than the article column's width to work
              with. Breaks out to the viewport width, re-centered, then
              caps back down on very wide screens — the heading/intro/
              presets above stay in the normal column. */}
          <div className="relative left-1/2 mt-4 w-screen -translate-x-1/2">
            <div className="mx-auto max-w-[1680px] px-6">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft xl:hidden">
                <span aria-hidden>&larr;</span> Scroll to see the full diagram <span aria-hidden>&rarr;</span>
              </p>
              <FrontOfficeCausalChain
                assumptions={assumptions}
                result={result}
                presetLoadTick={presetLoadTick}
              />
            </div>
          </div>
        </section>

        {/* The console */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="III" label="Your Decisions" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">The Console</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            Move a lever and watch the Packers move in the standings beside it — record, seed,
            operating result, and franchise health all recompute in the same view as the control
            that moved them.
          </p>

          {/* KPI row — above both columns, so it's in the same glance as either one */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Expected Wins" value={result.wins.toFixed(2)} sub="of 17 games" />
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
          <p className="mt-1.5 text-[11px] leading-4 text-charcoal-soft">
            Expected wins are a continuous season average, not a predicted final record.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MandateTarget
              label="Playoff berth"
              detail={`${result.wins.toFixed(2)} expected wins`}
              met={playoffTargetMet}
            />
            <MandateTarget
              label="Beat FY2026 operating result"
              detail={`${formatCurrencyCompact(result.operatingResult)} vs ${formatCurrencyCompact(OPERATING_RESULT)}`}
              met={financialTargetMet}
            />
          </div>

          {/* The board's verdict — what the two badges above mean TOGETHER,
              not each in isolation. Generated by the model layer's own
              buildFrontOfficeVerdict, never hand-written per plan. */}
          <div className="mt-3 rounded-xl border border-forest/15 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                The Board&apos;s Verdict
              </h3>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[verdict.tone]}`}
              >
                {FRONT_OFFICE_MANDATE_BAND_LABEL[verdict.mandateBand]}
              </span>
            </div>
            <p className="mt-2 text-base font-bold leading-6 text-charcoal">{verdict.headline}</p>
            <p className="mt-1.5 text-sm leading-6 text-charcoal-soft">{verdict.detail}</p>
            <p className="mt-2 text-[11px] leading-4 text-charcoal-soft">
              {verdict.quotingProbabilities
                ? "Quoting the last 1,000-season run for this exact plan."
                : "Quoting this plan's single-season point estimate — run 1,000 seasons below to see it restated as odds."}
            </p>
          </div>

          <div className="mt-3">
            <PlayoffLineGauge wins={result.wins} madePlayoffs={result.playoff.madePlayoffs} />
          </div>

          {/* Three columns: levers, standings, and the P&L — every view a
              plan produces sits in the same glance as the control that
              moved it. */}
          {/* Three-column grid only from xl (1280px) up: at 1024px (lg) the
              fixed 360px + 300px side columns plus the standings table's own
              420px minimum left less than 300px for the middle column,
              overflowing the page. Below xl, this is a plain block — the
              three pieces stack in DOM order (controls, then standings, then
              P&L), which already reads as decisions -> competitive outcome
              -> financial outcome. */}
          <div className="mt-6 xl:grid xl:grid-cols-[360px_1fr_300px] xl:items-start xl:gap-4">
            {/* Left: levers, cap readout pinned at top */}
            <aside className="mb-8 flex flex-col rounded-2xl border border-forest/15 bg-white p-4 xl:sticky xl:top-24 xl:mb-0 xl:max-h-[calc(100vh-7rem)]">
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

              {/* Player Payroll sits immediately below the Cap Readout, not
                  buried as just the first item in the lever list — it's the
                  single largest lever and the one most visitors expect to
                  find right next to the cap numbers it's bound by. Still the
                  same PayrollAxis component and the same live assumptions.payroll
                  state; only its position moved, so it's filtered out of the
                  lever-list map below rather than duplicated. */}
              <PayrollAxis
                value={assumptions.payroll}
                baseline={FRONT_OFFICE_BASE_DEFAULTS.payroll}
                onChange={set("payroll")}
              />

              <button
                type="button"
                onClick={resetToBaseline}
                className="mb-3 mt-3 w-full shrink-0 rounded-lg border border-forest/20 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/5"
              >
                Reset to FY2026 Baseline
              </button>

              {/* Live results strip — while dragging the lever stack below,
                  the outcomes that actually matter can scroll out of view on
                  a short phone screen, making every change feel invisible.
                  Sticky only below xl (1280px): at xl+ the whole aside is
                  already pinned via xl:sticky above, so a second nested
                  sticky context isn't needed there. It sticks only within
                  this aside — once the visitor scrolls past the controls
                  into standings/P&L, this scrolls away with it rather than
                  floating over content it no longer describes. top-20 clears
                  the site header's own sticky bar at every width it applies. */}
              <div className="sticky top-20 z-10 mb-3 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-forest/20 bg-white px-3 py-2 shadow-sm xl:static xl:top-auto xl:z-auto xl:shadow-none">
                <span className="text-sm font-bold text-charcoal">{result.wins.toFixed(2)} Wins</span>
                <span className="text-sm font-bold text-charcoal">
                  {formatSignedCompact(result.operatingResult)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    TONE_CLASS[
                      playoffTargetMet && financialTargetMet
                        ? "good"
                        : playoffTargetMet || financialTargetMet
                          ? "neutral"
                          : "bad"
                    ]
                  }`}
                >
                  {(playoffTargetMet ? 1 : 0) + (financialTargetMet ? 1 : 0)}/2 Met
                </span>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                {FRONT_OFFICE_DRIVERS.filter((driver) => driver.key !== "payroll").map((driver) => (
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

            {/* Right: NFC standings — the Packers' row moves here, live, right
                beside the lever that moved it */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                  NFC Standings
                </h3>
                <button
                  type="button"
                  onClick={() => setStandingsExpanded((v) => !v)}
                  className="rounded-lg border border-forest/20 px-2.5 py-1 text-[11px] font-semibold text-forest transition-colors hover:bg-forest/5"
                >
                  {standingsExpanded ? "Show playoff field only" : "Show all 16 teams"}
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Team names only. Every row but the Packers&apos; is the real, final 2025 result —
                fixed, and sourced independently of this model. The Packers&apos; record and seed
                are this plan&apos;s live output. Seeds are recomputed for the whole field on every
                plan: each division&apos;s winner (highest wins,
                <span className="mx-1 rounded-full bg-forest/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-forest">
                  Div
                </span>
                below) takes seeds 1-4 by record, then the next three best remaining records take
                5-7 — so a division winner can rank above a wild card with more wins, exactly as it
                does in the real NFL. Ties are simplified: the Packers must strictly beat an
                incumbent&apos;s win total to take a tie, not the real NFL&apos;s full
                head-to-head/common-games/strength-of-schedule tiebreaker hierarchy.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft sm:hidden">
                <span aria-hidden>&larr;</span> Scroll for the Record column <span aria-hidden>&rarr;</span>
              </p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-forest/15 bg-white sm:mt-3">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-forest/10 text-xs uppercase tracking-wide text-charcoal-soft">
                      <th className="px-4 py-3 font-semibold">Seed</th>
                      <th className="px-4 py-3 font-semibold">Team</th>
                      <th className="px-4 py-3 font-semibold">Division</th>
                      <th className="px-4 py-3 text-right font-semibold">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStandings.map((row, i) => {
                      const isLastPlayoffRow =
                        row.seed !== null && visibleStandings[i + 1]?.seed === null;
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
              {!standingsExpanded && standings.length > visibleStandings.length && (
                <p className="mt-2 text-[11px] text-charcoal-soft">
                  Showing the playoff field{result.playoff.seed === null ? " plus the Packers' row" : ""}{" "}
                  — {standings.length - visibleStandings.length} more teams hidden.
                </p>
              )}
            </div>

            {/* Third column: Season P&L, compact — the financial
                consequence of a lever drag in the same view as the lever
                and the standings it also moved. */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Season P&amp;L</h3>
              <div className="mt-2 flex flex-col gap-4 rounded-xl border border-forest/15 bg-white p-3">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-charcoal-soft/70">
                    Revenue
                  </span>
                  <PnlBar label="National Revenue" value={result.revenue.national} tone="revenue" maxAbs={pnlScale} />
                  <PnlBar label="Ticketing" value={result.revenue.ticketing} tone="revenue" maxAbs={pnlScale} />
                  <PnlBar
                    label="Concessions & Merchandise"
                    value={result.revenue.concessionsMerchandise}
                    tone="revenue"
                    maxAbs={pnlScale}
                  />
                  <PnlBar label="Local Sponsorship" value={result.revenue.sponsorship} tone="revenue" maxAbs={pnlScale} />
                  <PnlBar label="Playoff Revenue" value={result.revenue.playoff} tone="revenue" maxAbs={pnlScale} />
                  <PnlBar
                    label="Total Revenue"
                    value={result.revenue.total}
                    tone="revenue"
                    maxAbs={pnlScale}
                    emphasis
                  />
                </div>
                <div className="flex flex-col gap-2.5 border-t border-forest/10 pt-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-charcoal-soft/70">
                    Cost
                  </span>
                  <PnlBar label="Payroll" value={result.cost.payroll} tone="cost" maxAbs={pnlScale} />
                  <PnlBar label="Coaching & Football Staff" value={result.cost.coaching} tone="cost" maxAbs={pnlScale} />
                  <PnlBar
                    label="Facilities & Sports Science"
                    value={result.cost.facilities}
                    tone="cost"
                    maxAbs={pnlScale}
                  />
                  <PnlBar
                    label="Scouting & Development"
                    value={result.cost.development}
                    tone="cost"
                    maxAbs={pnlScale}
                  />
                  <PnlBar
                    label="Marketing & Fan Engagement"
                    value={result.cost.marketing}
                    tone="cost"
                    maxAbs={pnlScale}
                  />
                  <PnlBar label="Stadium & Gameday Ops" value={result.cost.gameday} tone="cost" maxAbs={pnlScale} />
                  <PnlBar label="Fixed Overhead" value={result.cost.fixedOverhead} tone="cost" maxAbs={pnlScale} />
                  <PnlBar label="Total Cost" value={result.cost.total} tone="cost" maxAbs={pnlScale} emphasis />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-forest/5 px-3 py-2">
                  <span className="text-xs font-bold text-charcoal">Operating Result</span>
                  <span
                    className={`text-sm font-black ${result.operatingResult >= 0 ? "text-forest" : "text-rust"}`}
                  >
                    {formatCurrency(result.operatingResult)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-charcoal-soft">
                Bars are scaled against the larger of this plan&apos;s total revenue or total cost,
                the same proportional-bar convention Marginal Impact uses below. Fixed Overhead
                ({formatCurrencyCompact(FIXED_OVERHEAD)} at baseline,{" "}
                {formatPercent(FIXED_OVERHEAD_SHARE_OF_REVENUE, 0)}{" "}
                of total revenue) is a derived
                residual that never moves with any lever — see Assumptions &amp; Limitations.
              </p>
            </div>
          </div>
        </section>

        {/* FY2026 reference case */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            The FY2026 Reference Case
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-soft">
            This is what actually happened — compare it against the plan you just built above.
            Record revenue, and still an operating loss, because player costs rose more than
            revenue could cover. This block never moves.
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

        {/* Marginal impact */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="IV" label="Marginal Effects" />
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
            {MARGINAL_METRIC_TABS.find((t) => t.key === marginalMetric)?.label.toLowerCase()}. Every
            row is a full engine re-run, not an estimate.
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

        {/* Strategy Map / "You Are Here" — sits between the deterministic
            decision layers above (levers, marginal impact) and the
            uncertainty layer below (Monte Carlo): decisions → marginal
            effects → strategic position → uncertainty. */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="V" label="Strategic Position" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Strategy Map
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            The whole front-office trade-off in one picture: how much competitive performance a
            plan buys against how much it costs the operating result. The three presets and the
            FY2026 baseline are fixed reference points — the current plan is the one marker that
            moves.
          </p>
          <div className="mt-4">
            <StrategyMapChart result={result} />
          </div>
        </section>

        {/* Monte Carlo — "now stress your plan," after everything deterministic */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="VI" label="Uncertainty" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Run {MONTE_CARLO_RUNS.toLocaleString()} Seasons
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
                Everything above is the plan on paper — one run under average luck. Football
                isn&apos;t played on paper. This runs the exact same plan through{" "}
                {MONTE_CARLO_RUNS.toLocaleString()} seasons of variance and reports the range
                instead of a point estimate.
              </p>
            </div>
            <button
              type="button"
              onClick={runSimulation}
              className="shrink-0 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
            >
              Run {MONTE_CARLO_RUNS.toLocaleString()} Seasons
            </button>
          </div>

          {!monteCarlo && (
            <p className="mt-4 rounded-xl border border-dashed border-forest/25 bg-white p-4 text-sm text-charcoal-soft">
              No simulation has been run for this plan yet. Moving any lever clears a prior run —
              the numbers below always describe the plan currently on screen.
            </p>
          )}

          {monteCarlo && (
            <div className="mt-6 flex flex-col gap-6">
              {/* Mandate restated as probabilities */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                  The Board&apos;s Mandate, Restated as Odds
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-forest/15 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-charcoal">Playoff berth</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[playoffTargetMet ? "good" : "bad"]}`}
                      >
                        {playoffTargetMet ? "Met" : "Not Met"} on paper
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal-soft">
                      Achieved in{" "}
                      <span className="font-semibold text-charcoal">
                        {(monteCarlo.playoffProbability * 100).toFixed(0)}%
                      </span>{" "}
                      of simulated seasons.
                    </p>
                  </div>
                  <div className="rounded-xl border border-forest/15 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-charcoal">
                        Beat FY2026 operating result
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[financialTargetMet ? "good" : "bad"]}`}
                      >
                        {financialTargetMet ? "Met" : "Not Met"} on paper
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal-soft">
                      Achieved in{" "}
                      <span className="font-semibold text-charcoal">
                        {(monteCarlo.probabilityBeatsFY2026 * 100).toFixed(0)}%
                      </span>{" "}
                      of simulated seasons.
                    </p>
                  </div>
                </div>
              </div>

              {/* Six required outputs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="Playoff Probability"
                  value={`${(monteCarlo.playoffProbability * 100).toFixed(0)}%`}
                />
                <KpiCard
                  label="Prob. of Operating Profit"
                  value={`${(monteCarlo.probabilityOperatingProfit * 100).toFixed(0)}%`}
                />
                <KpiCard
                  label="Prob. Beats FY2026"
                  value={`${(monteCarlo.probabilityBeatsFY2026 * 100).toFixed(0)}%`}
                />
                <KpiCard
                  label="Median Operating Result"
                  value={formatCurrencyCompact(monteCarlo.medianOperatingResult)}
                />
              </div>

              {/* P10 — given prominence, per the brief */}
              <div className="rounded-xl border-2 border-rust/30 bg-rust-pale p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-rust">
                  10th Percentile Operating Result — the downside case
                </span>
                <div className="mt-1 text-3xl font-black text-rust">
                  {formatCurrencyCompact(monteCarlo.p10OperatingResult)}
                </div>
                <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                  1 season in 10 comes in at or below this. (For reference, the 90th percentile —
                  a good-luck season — is {formatCurrencyCompact(monteCarlo.p90OperatingResult)}.)
                </p>
              </div>

              {/* Win total distribution */}
              <section className="rounded-xl border border-forest/15 bg-white p-4 sm:p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brass">
                  Win Total Distribution
                </h3>
                <div className="mt-2">
                  <DistributionHistogram
                    values={monteCarlo.samples.map((s) => s.wins)}
                    domain={[-0.5, 17.5]}
                    binCount={18}
                    markers={[
                      { value: monteCarlo.deterministicWins, label: "Expected", color: "#96703e" },
                    ]}
                    formatValue={(v) => `${v.toFixed(1)} wins`}
                    ariaLabel={`Win total distribution across ${monteCarlo.simulations} simulated seasons, mean ${monteCarlo.meanWins.toFixed(2)} wins`}
                  />
                </div>
                <MonteCarloChartCaption
                  statLabel="Mean Simulated Wins"
                  statValue={monteCarlo.meanWins.toFixed(2)}
                  badge={`${(monteCarlo.playoffProbability * 100).toFixed(0)}% of seasons made the field`}
                  tone={playoffTargetMet ? "good" : "bad"}
                  alertLead="The distribution centers on the deterministic expectation."
                  alertExplanation={`Mean simulated wins (${monteCarlo.meanWins.toFixed(2)}) land almost exactly on the deterministic expected wins (${monteCarlo.deterministicWins.toFixed(2)}) — the resampling doesn't shift the plan's true talent level, it only spreads a single season's luck around it. The spread itself comes from treating expected wins as a per-game win probability and drawing 17 games — the same binomial that gives a real NFL season its unpredictability.`}
                  explainer="Each simulated season converts this plan's expected wins into a per-game win probability (expected wins ÷ 17) and draws 17 independent games. That's a Binomial(17, p) win total, not an invented noise term — at a competitive win probability it produces a standard deviation of about 2 wins, in line with real NFL season-to-season variance."
                />
              </section>

              {/* Operating result distribution */}
              <section className="rounded-xl border border-forest/15 bg-white p-4 sm:p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brass">
                  Operating Result Distribution
                </h3>
                <div className="mt-2">
                  <DistributionHistogram
                    values={monteCarlo.samples.map((s) => s.operatingResult)}
                    domain={[
                      Math.min(...monteCarlo.samples.map((s) => s.operatingResult), OPERATING_RESULT, 0),
                      Math.max(...monteCarlo.samples.map((s) => s.operatingResult), 0),
                    ]}
                    binCount={24}
                    markers={[
                      { value: 0, label: "Breakeven", color: "#2a2820" },
                      { value: OPERATING_RESULT, label: "FY2026", color: "#96703e" },
                      { value: monteCarlo.p10OperatingResult, label: "P10", color: "#a1462f" },
                    ]}
                    formatValue={(v) => formatCurrencyCompact(v)}
                    ariaLabel={`Operating result distribution across ${monteCarlo.simulations} simulated seasons, median ${formatCurrencyCompact(monteCarlo.medianOperatingResult)}`}
                  />
                </div>
                <MonteCarloChartCaption
                  statLabel="Median Operating Result"
                  statValue={formatCurrencyCompact(monteCarlo.medianOperatingResult)}
                  badge={financialTargetMet ? "Beats FY2026 on paper" : "Below FY2026 on paper"}
                  tone={financialTargetMet ? "good" : "bad"}
                  alertLead="Playoff outcomes, not attendance, drive most of this spread."
                  alertExplanation={`A season that misses the field entirely loses playoff revenue outright; a season that lands a home-hosting seed gains one or more extra gates worth several million dollars each. That swing dominates the modest, weather-and-demand-driven attendance noise layered on top — which is deliberate: the real financial risk in a football season is what the standings say in January, not a few thousand empty seats in October.`}
                  explainer="Attendance is jittered a modest 2% (standard deviation on the rate, clamped to stadium capacity) to represent weather, schedule quality, and one-off demand — not a second coin flip. National revenue never varies: it's contractually fixed regardless of the season played out."
                />
              </section>
            </div>
          )}
        </section>

        {/* How the Model Was Built — a credibility/explanation section, not
            another analytical feature. Six compact, scannable cards; no new
            calculation, no accordion, same card language as the rest of the
            page (KpiCard/MandateTarget's rounded-xl border-forest/15
            bg-white treatment). Sits ahead of the two deep-dive accordions
            below (Model Mechanics, Assumptions & Limitations) on purpose —
            this is the recruiter-readable summary; those are the optional
            next layer for anyone who wants more than six cards. */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="VII" label="How It Was Built" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            How the Model Was Built
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            What&apos;s real, what&apos;s calculated, what&apos;s calibrated, and what&apos;s
            assumed — in six cards instead of a technical paper.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Real Financial Base</h3>
              <p className="mt-1.5 text-sm leading-6 text-charcoal-soft">
                The model starts from the Green Bay Packers&apos; publicly disclosed FY2026
                financials — a rare level of transparency for an NFL franchise. The modeled P&amp;L
                reconciles to that real base: {formatCurrencyCompact(TOTAL_REVENUE)} in revenue and
                a {formatCurrencyCompact(OPERATING_RESULT)} operating result at the FY2026 baseline,
                exactly. Every lever moves away from that real starting point, not a hypothetical
                one.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Decision Engine</h3>
              <p className="mt-1.5 text-sm leading-6 text-charcoal-soft">
                Payroll and Scouting/Development combine into Roster Quality; Coaching sets
                Coaching Quality; Facilities set Availability. Those three combine into Team
                Strength, which drives Expected Wins — and with it, this plan&apos;s real NFC seed
                and playoff revenue. Marketing, Gameday Operations, and Ticket Price separately
                drive commercial revenue. Revenue and Cost net into Operating Result — the same
                chain the causal diagram above visualizes live.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Monte Carlo</h3>
              <p className="mt-1.5 text-sm leading-6 text-charcoal-soft">
                The console above is one deterministic plan — a single expected season.
                &ldquo;Run 1,000 Seasons&rdquo; turns that same plan into odds by resampling wins
                and attendance. One real consequence: projected wins is a continuous expectation,
                but a simulated season resolves to an integer record, so a plan sitting just above
                a division or playoff threshold can show a discontinuous jump in seed and playoff
                revenue across the 1,000 seasons — a threshold effect built into the model rather
                than a smooth transition.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Strategy Map</h3>
              <p className="mt-1.5 text-sm leading-6 text-charcoal-soft">
                The Strategy Map plots 500 deterministic Halton-sampled plans across the four
                levers that actually move wins — payroll, coaching, facilities, development — while
                ticket price and gameday spend sit at their own engine-derived profit-maximizing
                values and marketing is optimized per sampled plan. Ten explicit boundary cases are
                added on top. The frontier is the sequence of actually-evaluated, non-dominated
                plans in that set — a <em>sampled</em> efficient frontier, not proof of a global
                optimum.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4 sm:col-span-2 lg:col-span-1">
              <h3 className="text-sm font-semibold text-charcoal">Sourced / Calibrated / Assumed</h3>
              <dl className="mt-1.5 space-y-2.5 text-sm leading-6 text-charcoal-soft">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-forest">
                    Sourced
                  </dt>
                  <dd>
                    The Packers&apos; FY2026 financials, the NFL salary floor (90% of the cap) and
                    hard cap, and the other 15 NFC teams&apos; real 2025 records.
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-forest">
                    Calibrated
                  </dt>
                  <dd>
                    Selected parameters are fitted so the FY2026 baseline reproduces the real
                    9.5-win, {formatCurrencyCompact(OPERATING_RESULT)} reference point exactly.
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-forest">
                    Assumed
                  </dt>
                  <dd>
                    The shape of each spending curve, the roster-vs-coaching weighting inside Team
                    Strength, and ticket-price elasticity — disclosed modeling choices, not
                    externally validated coefficients.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Limitations</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-6 text-charcoal-soft">
                <li>One NFL season, not a multi-year cap simulation.</li>
                <li>A front-office allocation model, not a player-level roster simulator.</li>
                <li>Simplified tiebreakers, not the NFL&apos;s full official hierarchy.</li>
                <li>Response curves are decision-model assumptions, not proven causal estimates.</li>
                <li>Outputs are decision-support scenarios, not predictions.</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm italic leading-6 text-charcoal-soft">
            The goal isn&apos;t to predict the NFL perfectly — it&apos;s to make the financial and
            competitive consequences of front-office decisions explicit.
          </p>
        </section>

        {/* Model Mechanics — the actual response-curve formulas, so the
            causal diagram's arrows and the qualitative "Decision Engine"
            card above have a citable functional form behind them, not just
            a paragraph. Every constant below is read from the committed
            engine constants (frontOffice.ts) through the page's existing
            imports — nothing here is hand-typed or could silently drift
            from the real model. Collapsed by default: optional for anyone
            who wants the math, not required to follow the rest of the page.
            This replaces the constant-by-constant listing that used to live
            inline in the "Saturation Constants" card below, rather than
            adding a second place that states the same numbers. */}
        <CollapsibleSection
          title="Model Mechanics — The Actual Formulas"
          summary="The exact saturating-curve formulas and constants behind Roster Quality, Coaching Quality, Availability, Team Strength, and Fixed Overhead — for anyone who wants the math behind the diagram, not just the shape of it. Click to expand."
        >
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Roster Quality</h3>
              <p className="mt-2 rounded-lg bg-mist/60 px-2.5 py-2 font-mono text-[11px] leading-5 text-charcoal">
                rosterQuality = 100 × effectivePayroll / (effectivePayroll + {formatCurrencyCompact(ROSTER_QUALITY_K)})
              </p>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                effectivePayroll is payroll after the Development Effect multiplier (right) is
                applied. A saturating curve, scaled 0–100 — each additional payroll dollar buys
                less quality than the last.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Development Effect</h3>
              <p className="mt-2 rounded-lg bg-mist/60 px-2.5 py-2 font-mono text-[11px] leading-5 text-charcoal">
                developmentMultiplier = 1 + {formatPercent(DEVELOPMENT_BOOST_MAX, 0)} × devSpend / (devSpend + {formatCurrencyCompact(DEVELOPMENT_K)})
              </p>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Multiplies payroll before Roster Quality is computed, capped at a{" "}
                {formatPercent(DEVELOPMENT_BOOST_MAX, 0)} boost — itself saturating the same way.
                Development spend has no other effect on the model.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Coaching Quality</h3>
              <p className="mt-2 rounded-lg bg-mist/60 px-2.5 py-2 font-mono text-[11px] leading-5 text-charcoal">
                coachingQuality = 100 × coachingSpend / (coachingSpend + {formatCurrencyCompact(COACHING_QUALITY_K)})
              </p>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Same saturating form as Roster Quality, on coaching spend alone, with about a
                sixth of Roster Quality&apos;s half-max constant — which is why coaching dollars
                move quality faster per dollar (see &ldquo;Why Payroll Moves Wins the Least&rdquo;
                below).
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Availability</h3>
              <p className="mt-2 rounded-lg bg-mist/60 px-2.5 py-2 font-mono text-[11px] leading-5 text-charcoal">
                availability = {formatPercent(AVAILABILITY_MIN, 0)} + {formatPercent(AVAILABILITY_MAX - AVAILABILITY_MIN, 0)} × facilitiesSpend / (facilitiesSpend + {formatCurrencyCompact(AVAILABILITY_K)})
              </p>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Bounded between {formatPercent(AVAILABILITY_MIN, 0)} and{" "}
                {formatPercent(AVAILABILITY_MAX, 0)}. Facilities spend narrows the gap between an
                injury-depleted roster and a fully healthy one — it can&apos;t do more than that.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Team Strength</h3>
              <p className="mt-2 rounded-lg bg-mist/60 px-2.5 py-2 font-mono text-[11px] leading-5 text-charcoal">
                teamStrength = ({formatPercent(ROSTER_WEIGHT, 0)} × rosterQuality + {formatPercent(COACHING_WEIGHT, 0)} × coachingQuality) × availability
              </p>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Roster Quality counts more than twice as much as Coaching Quality, before
                Availability scales the whole blend down.
              </p>
            </div>

            <div className="rounded-xl border border-forest/15 bg-white p-4">
              <h3 className="text-sm font-semibold text-charcoal">Fixed Overhead</h3>
              <p className="mt-2 rounded-lg bg-mist/60 px-2.5 py-2 font-mono text-[11px] leading-5 text-charcoal">
                fixedOverhead = totalOperatingCost − (payroll + coaching + facilities +
                development + marketing + gameday)
              </p>
              <p className="mt-2 text-xs leading-5 text-charcoal-soft">
                Fixed at {formatCurrencyCompact(FIXED_OVERHEAD)} ({formatPercent(FIXED_OVERHEAD_SHARE_OF_REVENUE, 0)}{" "}
                of revenue) for every plan — computed once from the FY2026 baseline and never
                recalculated per lever. See &ldquo;Fixed Overhead is a Derived Residual&rdquo; in
                Assumptions &amp; Limitations for what that means for this page&apos;s
                operating-result numbers.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Assumptions & Limitations — collapsed by default, reference material */}
        <CollapsibleSection
          title="Assumptions & Limitations"
          summary="Every constant tagged and every simplification disclosed — sourced/assumed splits, the salary floor and cap, the development-boost evidence, the one-seed architecture, and the Monte Carlo variance model. Click to expand."
        >
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
              At {formatPercent(FIXED_OVERHEAD_SHARE_OF_REVENUE, 0)}{" "}
              of total revenue ({formatCurrencyCompact(FIXED_OVERHEAD)}{" "}
              at baseline), Fixed Overhead is the largest
              cost line in the model and does not move with any lever. It is not independently
              sourced or assumed — it is defined as whatever remains after the five assumed
              discretionary cost lines are subtracted from the real, derived operating-cost total
              (see Model Mechanics above for the exact formula), so it silently absorbs all of the
              imprecision in those five assumptions. Any single plan&apos;s absolute operating-result
              level inherits that same imprecision.
            </p>
            <p className="mt-3 text-sm leading-6 text-charcoal-soft">
              That is why this page treats operating result as a comparison, not a standalone
              forecast. Fixed Overhead is computed once, from the FY2026 baseline, and held at the
              exact same dollar figure for every plan you build — it never recomputes per lever.
              That means it cancels out exactly of any difference between two plans, or between a
              plan and FY2026, even though it never cancels out of one plan&apos;s absolute level.
              The Board&apos;s Verdict, the Strategy Map, and the Monte Carlo readouts all key off
              deltas and beats/misses against a reference point for exactly this reason.
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
              multi-season memory, so it applies {formatPercent(SALARY_FLOOR_PCT, 0)}{" "}
              as a hard per-season minimum instead ({formatCurrencyCompact(SALARY_FLOOR)}), which is
              stricter than the real rule. That&apos;s part of why a low-payroll strategy
              underperforms here: the real CBA would let a club dip below this floor for one
              season and recover the shortfall later, and this model doesn&apos;t give it that
              flexibility.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              The Saturation Constants Validate One Point, Not a Slope
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              WINS_ELASTICITY is solved so the FY2026 baseline reproduces the real 2025 season
              (9.5 wins) exactly — a real strength: the engine&apos;s one sourced data point is
              hit precisely, regardless of how the underlying curves are shaped. But because that
              solve happens AFTER team strength is computed, it silently re-centers itself around
              whatever the saturation constants happen to produce (see Model Mechanics above for
              the exact constants and formulas). Tested directly: at five values of
              ROSTER_QUALITY_K spanning $50M to $880M, the baseline came back exactly 9.500
              expected wins every time. The calibration validates one point on the curve; it
              constrains no slope away from it — each constant is a disclosed [ASSUMPTION], chosen
              for a defensible economic reading (each K is &ldquo;the spend level at half-max
              quality&rdquo;), not derived from external data or checked against a second real
              season.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              Why Payroll Moves Wins the Least
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              The CBA&apos;s real {formatPercent(SALARY_FLOOR_PCT, 0)} cash floor confines the
              payroll lever to a {formatCurrencyCompact(FRONT_OFFICE_MANDATE_GAP_SEVERE)} legal
              window — just {formatPercent(FRONT_OFFICE_MANDATE_GAP_SEVERE / ROSTER_QUALITY_K, 0)}{" "}
              of ROSTER_QUALITY_K. Coaching spend, by contrast, has a $50M legal range that is{" "}
              {formatPercent(50_000_000 / COACHING_QUALITY_K, 0)}{" "}
              of its own K. That is why moving
              payroll floor-to-cap (holding everything else fixed) swings projected wins by only
              about half a win, while coaching&apos;s own floor-to-max swing alone is worth close
              to three wins over a comparable dollar range: nearly all of the engine&apos;s
              achievable win separation comes from the uncapped levers — coaching, facilities, and
              development — not from payroll, even though payroll is the largest single dollar
              figure on the page. This is a structural fact about the real, sourced CBA rule
              interacting with a disclosed [ASSUMPTION] (ROSTER_QUALITY_K), not a bug in either
              one.
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
            <p className="mt-3 text-sm leading-6 text-charcoal-soft">
              Two simplifications, stated plainly rather than left implicit. First, ties: a
              division winner is decided by wins alone, and the Packers must strictly exceed an
              incumbent&apos;s win total to take a tie — the real NFL&apos;s full tiebreaker
              hierarchy (head-to-head record, common games, conference record, strength of
              schedule, and more) isn&apos;t modeled. Second, and more consequential: projected
              wins is a continuous expectation (e.g. 11.02), while each simulated season in
              &ldquo;Run 1,000 Seasons&rdquo; below resolves to an actual integer record. A plan
              whose expected wins sits just above a division or playoff threshold can look
              decisively better in that single deterministic number than it does across 1,000
              simulated seasons, where roughly half the integer outcomes land back on the other
              side of that same threshold, taking the modeled home-playoff revenue with them —
              a real consequence of running a discrete, threshold-based rule on a random
              variable, not a bug in the seeding function or the simulation.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              The Monte Carlo Variance Model — Two Sources, Not Six
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              Only two inputs are resampled per simulated season, and neither is invented noise.{" "}
              <strong>Game outcomes:</strong> the plan&apos;s expected wins imply a per-game win
              probability (expected wins ÷ 17); each season draws 17 independent games from that
              probability — a Binomial(17, p) win total, which at a competitive probability
              produces roughly a 2-win standard deviation, a defensible real-NFL spread.{" "}
              <strong>Attendance:</strong> a modest {formatPercent(ATTENDANCE_NOISE_STDDEV, 0)}{" "}
              standard deviation on the deterministic attendance rate (weather, schedule quality,
              one-off demand), clamped to stadium capacity, feeding ticketing and
              concessions/merchandise only — never sponsorship, never national revenue, which
              stays exactly {formatCurrencyCompact(NATIONAL_REVENUE)} regardless, since
              it&apos;s contractually fixed. Team strength itself is never
              resampled — the roster and coaching staff don&apos;t change from one simulated
              season to the next, only the bounces of 17 games and a given Sunday&apos;s
              attendance do. Runs are seeded from the plan&apos;s own assumptions (the same
              pattern the FP&amp;A Decision Lab&apos;s Monte Carlo uses), so re-running &ldquo;Run
              1,000 Seasons&rdquo; against an unchanged plan reproduces the exact same
              distribution — chosen over fresh randomness because this page&apos;s own numbers
              need to be verifiable, and because two plans should be compared apples to apples
              rather than each drawing a different roll of the dice.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              Why the Verdict Doesn&apos;t Reuse the Decision Lab&apos;s Margin Bands
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              The FP&amp;A Decision Lab grades SaaS/Consulting/Real Estate margins as a percentage
              of revenue (<code>classifyMargin</code>, <code>src/lib/models/shared.ts</code>) — the
              right lens when the target itself is a margin. The board&apos;s mandate here is not a
              margin, it&apos;s a fixed dollar bar: beat FY2026&apos;s {formatCurrency(OPERATING_RESULT)}{" "}
              operating result. Because this franchise&apos;s revenue base is large (roughly
              $750-800M) relative to what any one plan can move, a genuinely large miss against
              that bar still reads as a small percentage of revenue — a $46.81M loss is only a -6%
              margin, which landed in <code>classifyMargin</code>&apos;s mildest &ldquo;Approaching
              Breakeven&rdquo; band next to a plan missing by under $1M. That&apos;s the exact
              failure mode the Decision Lab&apos;s own margin-band QA pass exists to prevent for
              SaaS, showing up here for a different reason. So the verdict bands the actual DOLLAR
              gap to the board&apos;s bar instead: a miss or beat past{" "}
              {formatCurrencyCompact(FRONT_OFFICE_MANDATE_GAP_SEVERE)} — the payroll lever&apos;s
              own full floor-to-cap swing, the single largest move any one lever on this page can
              make by itself — reads as &ldquo;severe&rdquo; or &ldquo;with room to spare&rdquo;;
              half that ({formatCurrencyCompact(FRONT_OFFICE_MANDATE_GAP_MATERIAL)}) separates
              &ldquo;narrowly&rdquo; from &ldquo;materially.&rdquo; This band set
              (<code>classifyMandateGap</code>) lives in{" "}
              <code>src/lib/models/frontOffice.ts</code> only — <code>shared.ts</code> and the
              Decision Lab it serves are untouched.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">
              &ldquo;Maximize the Business&rdquo; Is a Searched Optimum, Not a Guess
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              The obvious reading of &ldquo;maximize the business&rdquo; — floor payroll, max out
              every revenue-flavored lever, price at the free-zone ceiling — is wrong, and checking
              it against the committed engine is what caught it: maxing marketing and gameday spend
              produces {formatCurrencyCompact(MAXIMIZE_BUSINESS_NAIVE_OPERATING_RESULT)} in
              operating result, while a directed search of the same engine finds a plan{" "}
              {formatCurrencyCompact(MAXIMIZE_BUSINESS_SEARCH_IMPROVEMENT)} better. Gameday
              ops&apos; per-cap-spend lift
              saturates fast relative to its own cost — every dollar of gameday spend past the
              floor loses money on this plan, all the way to its max. Marketing is the one
              exception with a genuine, single-peaked return (it lifts both attendance-linked
              revenue and sponsorship), but even it peaks around $21M, well short of its own
              $35M ceiling. The preset&apos;s marketing figure is the actual output of a 60-round
              ternary search against <code>runFrontOfficeSimulation</code> holding every other
              lever fixed — not a hand-picked value — so if a future change to the engine&apos;s
              formulas moves that optimum, this preset moves with it automatically.
            </p>
          </div>
        </CollapsibleSection>

        {/* What the Model Shows — the one conclusion the page was missing.
            One card, not a section: every figure is the module-level
            constants above (BUILD_THROUGH_DEVELOPMENT_PRESET /
            SPEND_TO_CONTEND_PRESET / their Monte Carlo runs), so it reads
            exactly what a visitor sees if they load either preset and run
            1,000 seasons themselves. */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <ChapterMark roman="VIII" label="What It Shows" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            What the Model Shows
          </h2>
          <div className="mt-4 rounded-xl border-2 border-brass/30 bg-brass-pale/30 p-4 sm:p-6">
            <p className="text-sm leading-6 text-charcoal-soft">
              Build Through Development and Spend to Contend look like a close call on paper:{" "}
              {formatSignedCompact(BUILD_THROUGH_DEVELOPMENT_PRESET.result.operatingResult)} against{" "}
              {formatSignedCompact(SPEND_TO_CONTEND_PRESET.result.operatingResult)}, a{" "}
              {formatCurrencyCompact(DETERMINISTIC_PRESET_GAP)} gap. Run each through{" "}
              {MONTE_CARLO_RUNS.toLocaleString()} simulated seasons and the gap becomes{" "}
              {formatCurrencyCompact(SIMULATED_MEDIAN_PRESET_GAP)} —{" "}
              {formatSignedCompact(BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO.medianOperatingResult)} against{" "}
              {formatSignedCompact(SPEND_TO_CONTEND_MONTE_CARLO.medianOperatingResult)}{" "}
              in the median season — because Spend to Contend&apos;s{" "}
              {SPEND_TO_CONTEND_PRESET.result.playoff.seed}-seed rests on clearing 11 wins by{" "}
              {(SPEND_TO_CONTEND_PRESET.result.wins - 11).toFixed(2)}, a margin a real,
              whole-game season doesn&apos;t preserve. Build Through Development is profitable in{" "}
              {(BUILD_THROUGH_DEVELOPMENT_MONTE_CARLO.probabilityOperatingProfit * 100).toFixed(0)}%
              {" "}of simulated seasons; Spend to Contend in{" "}
              {(SPEND_TO_CONTEND_MONTE_CARLO.probabilityOperatingProfit * 100).toFixed(0)}%.
            </p>
            <p className="mt-3 text-sm leading-6 text-charcoal-soft">
              The point estimate showed a {formatCurrencyCompact(DETERMINISTIC_PRESET_GAP)}{" "}
              difference. The distribution shows one roughly{" "}
              {Math.round(SIMULATED_VS_DETERMINISTIC_GAP_RATIO)} times that size. A deterministic
              console, on its own, would never have surfaced it.
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-sm italic leading-6 text-charcoal-soft">
            Built with a deterministic financial engine, a Monte Carlo simulation layer, and a
            sampled efficient frontier — all computed from the Packers&apos; own disclosed
            FY2026 numbers.
          </p>
        </section>
      </div>
    </main>
  );
}

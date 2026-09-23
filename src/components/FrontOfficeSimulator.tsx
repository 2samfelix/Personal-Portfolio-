"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ACTUAL_2025_PLAYOFF_RESULT,
  ACTUAL_2025_RECORD,
  ACTUAL_2025_SEED,
  ACTUAL_2025_WIN_TOTAL,
  AVAILABILITY_MAX,
  AVAILABILITY_MIN,
  BASELINE_TICKET_PRICE,
  COACHING_WEIGHT,
  DEVELOPMENT_BOOST_MAX,
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
    </div>
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
        <span>Projected Wins vs. Playoff Line</span>
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
    <svg
      viewBox={`0 0 ${HIST_WIDTH} ${HIST_HEIGHT}`}
      className="w-full"
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
}: {
  statLabel: string;
  statValue: string;
  badge: string;
  tone: BadgeTone;
  alertLead: string;
  alertExplanation: string;
  explainer: string;
}) {
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
      <p className="text-xs leading-5 text-charcoal-soft">{explainer}</p>
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
};

const FRONT_OFFICE_PRESETS: FrontOfficePreset[] = [
  {
    key: "spendToContend",
    label: "Spend to Contend",
    description:
      "Payroll at the cap; coaching and facilities spend maxed out. Buy the best roster and infrastructure the cap allows.",
    assumptions: {
      ...FRONT_OFFICE_BASE_DEFAULTS,
      payroll: SALARY_CAP,
      coachingSpend: driverMax("coachingSpend"),
      facilitiesSpend: driverMax("facilitiesSpend"),
    },
  },
  {
    key: "developAndPromote",
    label: "Develop and Promote",
    description:
      "Payroll at the CBA floor; scouting and facilities spend maxed out. Win through the draft and player development instead of free agency.",
    assumptions: {
      ...FRONT_OFFICE_BASE_DEFAULTS,
      payroll: SALARY_FLOOR,
      developmentSpend: driverMax("developmentSpend"),
      facilitiesSpend: driverMax("facilitiesSpend"),
    },
  },
  {
    key: "maximizeBusiness",
    label: "Maximize the Business",
    description:
      "Every football-ops lever (payroll, coaching, facilities, scouting, gameday) at its floor; marketing funded to its own profit-maximizing point, not its max; ticket price at the top of the free zone. This is the model's actual financial ceiling, found by searching the engine, not assumed.",
    assumptions: MAXIMIZE_BUSINESS_ASSUMPTIONS,
  },
];

function assumptionsEqual(a: FrontOfficeAssumptions, b: FrontOfficeAssumptions): boolean {
  return (Object.keys(a) as FrontOfficeDriverKey[]).every((key) => a[key] === b[key]);
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

        {/* The console */}
        <section className="mt-12 border-t border-forest/10 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">The Console</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            Move a lever and watch the Packers move in the standings beside it — record, seed,
            operating result, and franchise health all recompute in the same view as the control
            that moved them.
          </p>

          {/* KPI row — above both columns, so it's in the same glance as either one */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              Generated deterministically from live model outputs — not AI-written.{" "}
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
          <div className="mt-6 lg:grid lg:grid-cols-[360px_1fr_300px] lg:items-start lg:gap-4">
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

              {/* Scenario presets — coherent starting points so the six
                  levers' depth is discoverable without inventing a plan
                  from scratch; see FRONT_OFFICE_PRESETS above. */}
              <div className="mb-3 shrink-0">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-charcoal-soft">
                  Load a Strategy
                </span>
                <div className="flex flex-col gap-1.5">
                  {FRONT_OFFICE_PRESETS.map((preset) => {
                    const active = assumptionsEqual(assumptions, preset.assumptions);
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => loadPreset(preset)}
                        title={preset.description}
                        aria-pressed={active}
                        className={`w-full rounded-lg border px-3 py-1.5 text-left text-xs font-semibold transition-colors ${
                          active
                            ? "border-forest bg-forest text-cream"
                            : "border-forest/20 text-forest hover:bg-forest/5"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                {FRONT_OFFICE_DRIVERS.map((driver) =>
                  driver.key === "payroll" ? (
                    <PayrollAxis
                      key={driver.key}
                      value={assumptions.payroll}
                      baseline={FRONT_OFFICE_BASE_DEFAULTS.payroll}
                      onChange={set("payroll")}
                    />
                  ) : (
                    <SliderField
                      key={driver.key}
                      driver={driver}
                      value={assumptions[driver.key]}
                      baseline={FRONT_OFFICE_BASE_DEFAULTS[driver.key]}
                      onChange={set(driver.key)}
                    />
                  )
                )}
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
                does in the real NFL.
              </p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-forest/15 bg-white">
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

        {/* Monte Carlo — "now stress your plan," after everything deterministic */}
        <section className="mt-12 border-t border-forest/10 pt-8">
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
                  1 season in 10 comes in at or below this. This is the number a real board would
                  ask for, and the one most people don&apos;t think to compute. (For reference,
                  the 90th percentile — a good-luck season — is{" "}
                  {formatCurrencyCompact(monteCarlo.p90OperatingResult)}.)
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
              of total revenue ({formatCurrencyCompact(FIXED_OVERHEAD)} at baseline), Fixed Overhead is the largest
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
              multi-season memory, so it applies {formatPercent(SALARY_FLOOR_PCT, 0)}{" "}
              as a hard per-season minimum instead ({formatCurrencyCompact(SALARY_FLOOR)}), which is
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
      </div>
    </main>
  );
}

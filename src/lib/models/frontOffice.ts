// Pure Green Bay Packers front-office engine. No React, no formatting, no UI
// concerns — same discipline as saas.ts. Every function here takes an
// assumptions object and returns numbers; a future UI only ever displays
// what this engine already computed.
//
// PROMPT 1 SCOPE: model layer only. No charts, no scenario presets, no
// commentary builder — those are later prompts (2-4) in the four-part build
// sequence. This file exists to prove the economics work before any pixel
// is drawn.

import type { DriverConfig } from "./shared";

// ============================================================================
// 1. SOURCED BASELINE — Green Bay Packers FY2026 (the 2025 season)
// Fiscal year ended March 31, 2026; results released July 2026.
// Sources: Packers FY2026 annual financial release (packers.com, July 2026);
// Sportico; Yahoo Sports.
// ============================================================================

/** [SOURCED] Total franchise revenue, FY2026. */
export const TOTAL_REVENUE = 753_000_000;

/**
 * [SOURCED] Equal-share national/league media revenue — identical, by
 * league rule, to every other team's share regardless of market size or
 * performance. This is the number the model must never let a lever move.
 */
export const NATIONAL_REVENUE = 453_200_000;

/**
 * [DERIVED] Local revenue = Total − National. The Packers do not disclose a
 * local-revenue line directly; this follows from the two disclosed totals
 * above. 753.0M − 453.2M = 299.8M.
 */
export const LOCAL_REVENUE = TOTAL_REVENUE - NATIONAL_REVENUE;

/** [SOURCED] Operating result, FY2026 — an operating loss. */
export const OPERATING_RESULT = -1_100_000;

/**
 * [SOURCED] Operating result, FY2025 (prior year) — a gain. Carried for the
 * thesis narrative (the ~$85M swing); not consumed by the engine, which
 * models one season only.
 */
export const PRIOR_YEAR_OPERATING_RESULT = 83_700_000;

/**
 * [SOURCED] Year-over-year CHANGE in player costs — not a level, and it
 * includes accelerated accounting on released/traded players, not cash
 * spend. The engine needs a cost LEVEL (payroll), not a YoY change, so this
 * figure is disclosed for narrative fidelity but not consumed directly by
 * any formula below.
 */
export const PLAYER_COST_YOY_CHANGE = 131_700_000;

/**
 * [SOURCED] Salary cap allocation. This is a CAP figure, not the P&L
 * player-cost line — cap accounting (signing-bonus proration, void years,
 * dead money) differs from GAAP financial-statement accounting. Treating
 * this cap figure as the model's payroll cost line is an explicit
 * [ASSUMPTION] (see PAYROLL_EQUALS_CAP_ASSUMPTION below), not a silent
 * conflation of the two.
 */
export const SALARY_CAP = 290_100_000;

/**
 * [ASSUMPTION] The model treats the salary cap allocation as the P&L
 * payroll cost line. Cap and GAAP accounting genuinely differ (see the
 * caution above), but the Packers don't disclose a separate cash payroll
 * figure, and the cap allocation is the only real, sourced number available
 * for "how much the roster costs." Disclosed here explicitly rather than
 * treated as interchangeable without comment.
 */
export const PAYROLL_EQUALS_CAP_ASSUMPTION = true;

/**
 * [SOURCED] Team salary-cash-spending floor under the current NFL CBA
 * (2020 CBA, Article 12, Section 9, "Minimum Team Cash Spending"). The CBA
 * sets this floor over four DIFFERENT multi-League-Year windows, not all
 * the same length: 2017-2020 (four years, 89% floor), 2021-2023 (three
 * years, 90%), 2024-2026 (three years, 90%), and 2027-2030 (four years,
 * 90%). The 2025 season this model is baselined on falls in the
 * 2024-2026 window — a THREE-year aggregation period, not four — over
 * which each club must spend at least 90% of the salary cap in actual
 * cash on players. (A separate, higher 95%-of-cap floor applies
 * league-wide across all 32 clubs combined, over the same windows.)
 * Source: NFL CBA Article 12 §9, as reproduced at Over The Cap
 * (https://overthecap.com/collective-bargaining-agreement/article/12/section/9),
 * cross-checked against Steelers Depot's and Cincy Jungle's independent
 * write-ups of the same clause.
 *
 * [ASSUMPTION] simplification for a one-season model: the real rule is a
 * multi-year AGGREGATE — a single season under 90% is legal on its own, as
 * long as the club catches up across the full period. This model has no
 * multi-season memory, so it applies the 90% floor as a hard per-season
 * minimum instead (the payroll lever's slider minimum, see
 * FRONT_OFFICE_DRIVERS below) rather than tracking a rolling shortfall.
 * That's a conservative simplification, not a loosening of the real rule:
 * it prevents the model from ever showing a plan that the real CBA would
 * actually allow (a legal one-year dip that's made up later) as though it
 * were the whole picture, and disclosed here explicitly rather than a
 * silent soft-flag a user could miss.
 */
export const SALARY_FLOOR_PCT = 0.90;

/** [DERIVED] SALARY_CAP x SALARY_FLOOR_PCT = $261.09M. */
export const SALARY_FLOOR = SALARY_CAP * SALARY_FLOOR_PCT;

/** [SOURCED] Net income, FY2026 — includes non-operating income below. */
export const NET_INCOME = 132_500_000;

/**
 * [SOURCED] Non-operating income (investment gains; NFL Network sale to
 * ESPN). Not modeled — the engine produces an OPERATING result only, since
 * that's what the levers can actually affect. Disclosed for completeness.
 */
export const NON_OPERATING_INCOME = 133_600_000;

/** [SOURCED] Home games played, FY2026 season (down from 9 the prior year). */
export const HOME_GAMES = 8;

/**
 * [SOURCED] League-wide total revenue, all 32 teams, FY2026 (~$14.5B).
 * Disclosure/narrative only — not consumed by the engine.
 */
export const LEAGUE_TOTAL_REVENUE = 14_500_000_000;

/**
 * [DERIVED] Total operating cost = Total revenue − Operating result.
 * 753.0M − (−1.1M) = 754.1M. This is the figure the cost decomposition
 * below must reconcile to exactly.
 */
export const TOTAL_OPERATING_COST = TOTAL_REVENUE - OPERATING_RESULT;

/**
 * [SOURCED] Packers' actual 2025 regular-season record: 9 wins, 7 losses, 1
 * tie — 2nd in the NFC North, 7th seed in the NFC playoff field, eliminated
 * in the Wild Card Round on the road at the Chicago Bears, 27–31 (blew a
 * 21–3 halftime lead). Source: packers.com, "Dope Sheet: 2025 season
 * review" (https://www.packers.com/news/dope-sheet-2025-season-review);
 * corroborated by Wikipedia's "2025 Green Bay Packers season" and StatMuse.
 */
export const ACTUAL_2025_RECORD = { wins: 9, losses: 7, ties: 1 } as const;

/** [DERIVED] A tie counts as half a win in NFL standings math: 9 + 0.5 = 9.5. */
export const ACTUAL_2025_WIN_TOTAL =
  ACTUAL_2025_RECORD.wins + 0.5 * ACTUAL_2025_RECORD.ties;

/** [SOURCED] Actual 2025 NFC playoff seed. */
export const ACTUAL_2025_SEED = 7;

/** [SOURCED] Actual 2025 playoff result. */
export const ACTUAL_2025_PLAYOFF_RESULT =
  "Lost Wild Card Round, at Chicago Bears, 27–31";

/**
 * [SOURCED] Lambeau Field seating capacity, post-2013 south end zone
 * renovation.
 */
export const STADIUM_CAPACITY = 81_441;

// ============================================================================
// 2. REVENUE DECOMPOSITION — [ASSUMPTION], reconciles to LOCAL_REVENUE exactly
// ============================================================================

/**
 * [ASSUMPTION] Local-revenue split across the four lines the Packers don't
 * itemize publicly. Ticketing is the largest line for a team with the
 * league's longest season-ticket waitlist and a stadium at effective full
 * capacity every week; sponsorship is second, reflecting a small-market
 * team's reliance on regional/corporate partnerships over big-market
 * premium sponsorship deals; concessions and merchandise are the two
 * smallest, standard for a single-stadium franchise with only 8 home dates.
 * Shares sum to 1.00 exactly by construction (0.48+0.30+0.12+0.10=1.00), so
 * the four dollar lines below reconcile to LOCAL_REVENUE exactly regardless
 * of any later edit to LOCAL_REVENUE's own inputs.
 */
export const LOCAL_REVENUE_SHARE = {
  ticketing: 0.48,
  sponsorship: 0.30,
  concessions: 0.12,
  merchandise: 0.10,
} as const;

/** [DERIVED] */
export const BASELINE_TICKETING_REVENUE =
  LOCAL_REVENUE * LOCAL_REVENUE_SHARE.ticketing;
/** [DERIVED] */
export const BASELINE_SPONSORSHIP_REVENUE =
  LOCAL_REVENUE * LOCAL_REVENUE_SHARE.sponsorship;
/** [DERIVED] */
export const BASELINE_CONCESSIONS_REVENUE =
  LOCAL_REVENUE * LOCAL_REVENUE_SHARE.concessions;
/** [DERIVED] */
export const BASELINE_MERCHANDISE_REVENUE =
  LOCAL_REVENUE * LOCAL_REVENUE_SHARE.merchandise;

// ============================================================================
// 3. COST DECOMPOSITION — [ASSUMPTION], reconciles to TOTAL_OPERATING_COST
// ============================================================================

/**
 * [ASSUMPTION] Cost decomposition of the derived $754.1M operating-cost
 * total. Payroll is [SOURCED] (the cap allocation, per the caution above).
 * The five discretionary lines are sized against public reporting on NFL
 * club opex mix: coaching staffs run roughly $30-50M at market-rate clubs;
 * stadium/gameday operations scale with a full year of Lambeau events, not
 * just the 8 home games; scouting/development is typically the smallest
 * discretionary football-ops line leaguewide. Fixed overhead (front-office
 * salaries, G&A, insurance, debt service) is the ONE line NOT independently
 * assumed — it is the residual, forcing exact reconciliation to
 * TOTAL_OPERATING_COST by construction (see FIXED_OVERHEAD below), and it
 * is genuinely fixed: it does not move with any lever.
 */
export const BASELINE_COACHING_SPEND = 42_000_000;
export const BASELINE_FACILITIES_SPEND = 28_000_000;
export const BASELINE_DEVELOPMENT_SPEND = 18_000_000;
export const BASELINE_MARKETING_SPEND = 16_000_000;
export const BASELINE_GAMEDAY_SPEND = 85_000_000;

/**
 * [DERIVED] Fixed overhead = Total operating cost − payroll − the five
 * assumed discretionary lines. Forces the cost decomposition to reconcile
 * to TOTAL_OPERATING_COST exactly at baseline, for whatever values the five
 * assumed lines above take. At baseline: 754.1M − 290.1M − 42M − 28M − 18M
 * − 16M − 85M = 275.0M. This constant does not change when the levers move
 * — it represents true fixed costs (front-office payroll, G&A, insurance,
 * debt service) that don't scale with football-ops discretionary spend.
 *
 * ⚠ DISCLOSURE FLAG FOR PROMPT 2 (UI): at baseline this is ~36% of total
 * revenue — the largest single cost line in the model, larger than
 * payroll. It is a derived RESIDUAL, not an independently sourced or
 * assumed figure: it silently absorbs all of the error/imprecision in the
 * five assumed discretionary lines above (coaching, facilities,
 * development, marketing, gameday), since it's defined as "whatever is
 * left over" after those five are subtracted from the real operating-cost
 * total. A user staring at a $275M "Fixed Overhead" line with no
 * explanation would reasonably ask what it is and why it's the biggest
 * cost bucket in the model. The UI must show this line with the same
 * [DERIVED]-residual disclosure given here, not bury it in a tooltip or
 * omit it from the cost breakdown — see FIXED_OVERHEAD_SHARE_OF_REVENUE
 * below, computed so the UI has the exact percentage to display rather
 * than hardcoding "36%" separately from this constant.
 */
export const FIXED_OVERHEAD =
  TOTAL_OPERATING_COST -
  SALARY_CAP -
  BASELINE_COACHING_SPEND -
  BASELINE_FACILITIES_SPEND -
  BASELINE_DEVELOPMENT_SPEND -
  BASELINE_MARKETING_SPEND -
  BASELINE_GAMEDAY_SPEND;

/** [DERIVED] FIXED_OVERHEAD / TOTAL_REVENUE — see the disclosure flag above. */
export const FIXED_OVERHEAD_SHARE_OF_REVENUE = FIXED_OVERHEAD / TOTAL_REVENUE;

// ============================================================================
// 4. LEVERS — six spending levers, plus ticket price and strategy weighting
// ============================================================================

export type FrontOfficeAssumptions = {
  payroll: number; // $ — player payroll, hard-bounded by the salary cap
  coachingSpend: number; // $ — coaching & football staff
  facilitiesSpend: number; // $ — facilities & sports science
  developmentSpend: number; // $ — scouting & player development
  marketingSpend: number; // $ — marketing & fan engagement
  gamedaySpend: number; // $ — stadium & gameday operations
  ticketPrice: number; // $ / seat, blended average across price tiers
  strategyWeighting: number; // 0 = pure financial result, 1 = pure on-field success
};

export type FrontOfficeDriverKey = keyof FrontOfficeAssumptions;

/**
 * [ASSUMPTION] Baseline attendance as a share of Lambeau capacity. Green Bay
 * has carried the NFL's longest season-ticket waitlist for decades and has
 * not had a non-sellout home game in the modern stadium era; 97% (rather
 * than 100%) accounts for no-shows, comps, and a handful of seats that
 * don't move with demand.
 */
export const BASELINE_ATTENDANCE_RATE = 0.97;

/** [DERIVED] */
export const BASELINE_ATTENDANCE = STADIUM_CAPACITY * BASELINE_ATTENDANCE_RATE;

/**
 * [DERIVED] Baseline ticket price ($/seat, blended across all price tiers).
 * Backed out of the assumed baseline ticketing-revenue line so that
 * Attendance × Price × Home games reconciles to BASELINE_TICKETING_REVENUE
 * exactly at baseline: revenue / (attendance × home games).
 */
export const BASELINE_TICKET_PRICE =
  BASELINE_TICKETING_REVENUE / (BASELINE_ATTENDANCE * HOME_GAMES);

/**
 * [DERIVED] Baseline combined concessions+merchandise spend per attendee,
 * per game. Backed out the same way as BASELINE_TICKET_PRICE.
 */
export const BASELINE_PERCAP_SPEND =
  (BASELINE_CONCESSIONS_REVENUE + BASELINE_MERCHANDISE_REVENUE) /
  (BASELINE_ATTENDANCE * HOME_GAMES);

/**
 * Six spending levers + ticket price + strategy weighting — exactly these,
 * each with min/max/step/unit and a baseline anchored to the FY2026
 * figures. The payroll lever's max is SALARY_CAP itself: the cap genuinely
 * binds, structurally, not as a UI-layer clamp bolted on afterward.
 */
export const FRONT_OFFICE_DRIVERS: DriverConfig<FrontOfficeDriverKey>[] = [
  { key: "payroll", label: "Player Payroll", unit: "currency", min: SALARY_FLOOR, max: SALARY_CAP, step: 1_000_000 },
  { key: "coachingSpend", label: "Coaching & Football Staff", unit: "currency", min: 20_000_000, max: 70_000_000, step: 1_000_000 },
  { key: "facilitiesSpend", label: "Facilities & Sports Science", unit: "currency", min: 10_000_000, max: 50_000_000, step: 1_000_000 },
  { key: "developmentSpend", label: "Scouting & Player Development", unit: "currency", min: 5_000_000, max: 35_000_000, step: 1_000_000 },
  { key: "marketingSpend", label: "Marketing & Fan Engagement", unit: "currency", min: 5_000_000, max: 35_000_000, step: 1_000_000 },
  { key: "gamedaySpend", label: "Stadium & Gameday Operations", unit: "currency", min: 40_000_000, max: 130_000_000, step: 1_000_000 },
  { key: "ticketPrice", label: "Ticket Price", unit: "currency", min: 100, max: 400, step: 5 },
  { key: "strategyWeighting", label: "Strategy Weighting (Financial ↔ On-Field)", unit: "percent", min: 0, max: 1, step: 0.05 },
];

const DRIVER_BOUNDS = new Map(FRONT_OFFICE_DRIVERS.map((d) => [d.key, d]));

export function clampToDriverBounds(key: FrontOfficeDriverKey, value: number): number {
  const driver = DRIVER_BOUNDS.get(key)!;
  return Math.min(driver.max, Math.max(driver.min, value));
}

/**
 * Baseline default lever settings — the sourced FY2026 case. Every
 * baseline value here is either [SOURCED] (payroll = the cap) or [DERIVED]
 * from the reconciliation above (ticketPrice), or the assumed discretionary
 * spend levels from section 3. Strategy weighting defaults to 0.5 (neutral).
 */
export const FRONT_OFFICE_BASE_DEFAULTS: FrontOfficeAssumptions = {
  payroll: SALARY_CAP,
  coachingSpend: BASELINE_COACHING_SPEND,
  facilitiesSpend: BASELINE_FACILITIES_SPEND,
  developmentSpend: BASELINE_DEVELOPMENT_SPEND,
  marketingSpend: BASELINE_MARKETING_SPEND,
  gamedaySpend: BASELINE_GAMEDAY_SPEND,
  ticketPrice: BASELINE_TICKET_PRICE,
  strategyWeighting: 0.5,
};

// ============================================================================
// 5. THE ENGINE — diminishing returns, team strength, expected wins
// ============================================================================
//
// Every diminishing-returns relationship uses the same Michaelis-Menten
// saturating form: quality = QMAX x spend / (spend + K). It's monotonic,
// bounded, and K has a direct reading ("the spend level at which you're
// halfway to max quality"), which is what makes each K defensible as a
// documented, disclosed constant rather than an arbitrary curve shape.

function saturating(spend: number, k: number): number {
  return spend / (spend + k);
}

/** [ASSUMPTION] Normalized 0-100 roster-quality scale — only the ratio of
 * a team's strength to LEAGUE_AVERAGE_STRENGTH is ever consumed downstream,
 * so the scale's absolute units don't matter. */
export const ROSTER_QUALITY_MAX = 100;
/** [ASSUMPTION] Effective-payroll level for half-max roster quality. */
export const ROSTER_QUALITY_K = 220_000_000;
/**
 * [ASSUMPTION] Development spend can raise payroll's effective
 * quality-per-dollar by at most 35% — a boost, not a second source of
 * quality, which is what keeps it distinct from the payroll lever.
 *
 * Anchored to published rookie-contract surplus-value research, not picked
 * to produce a particular strategy ranking: the #1 overall pick costs
 * ~4.1% of the salary cap for production valued at ~6.5% of the cap — a
 * ~58% surplus-efficiency premium (production/cost ≈ 1.59x) for the single
 * most valuable pick in the draft (PFF, "The surplus value of each
 * position in the NFL draft"). At the extreme, elite rookie-scale QB
 * production costs ~3.6-3.9% of the cap versus ~21.5% of the cap for
 * comparable veteran QB production, a 5-6x gap — but QB is the most
 * positionally scarce case in the league, not representative of a whole
 * roster. Surplus value is real through day two of the draft but shrinks
 * fast further down the board and is bust-risk-adjusted; PFF's own
 * analysis places the actual peak of surplus value outside the top 10
 * picks, and the premium-vs-non-premium surplus gap narrows from roughly
 * $6M (early) to $3M (late) over a rookie deal.
 *
 * This lever funds an entire scouting/development program — many picks
 * across all seven rounds and the staff that develops them — not a
 * guaranteed top-five selection, and most of a 53-man roster's cap hit at
 * any given time is still veteran money even at a well-run drafting
 * organization (the Packers' own archetype: draft, develop, extend,
 * let good-but-not-great players walk for compensatory picks). 35% is
 * anchored to the #1 pick's ~58% surplus-efficiency figure as an upper
 * reference and discounted substantially for that reality — a judgment
 * call on a real and well-documented phenomenon, not a number the
 * literature hands you directly as a single "development boost %."
 */
export const DEVELOPMENT_BOOST_MAX = 0.35;
/** [ASSUMPTION] Development spend for half of DEVELOPMENT_BOOST_MAX. */
export const DEVELOPMENT_K = 20_000_000;

/**
 * Development's effect on roster quality: a multiplier on payroll's
 * *effective* size, not an additive quality term. This is what makes
 * development raise quality-per-dollar-of-payroll rather than duplicating
 * payroll's own effect.
 *   multiplier = 1 + DEVELOPMENT_BOOST_MAX x devSpend / (devSpend + DEVELOPMENT_K)
 */
export function developmentMultiplier(developmentSpend: number): number {
  return 1 + DEVELOPMENT_BOOST_MAX * saturating(developmentSpend, DEVELOPMENT_K);
}

/**
 * Roster quality = f(payroll, development spend), diminishing returns on
 * both:
 *   effectivePayroll = payroll x developmentMultiplier(devSpend)
 *   rosterQuality = ROSTER_QUALITY_MAX x effectivePayroll / (effectivePayroll + ROSTER_QUALITY_K)
 */
export function rosterQuality(payroll: number, developmentSpend: number): number {
  const effectivePayroll = payroll * developmentMultiplier(developmentSpend);
  return ROSTER_QUALITY_MAX * (effectivePayroll / (effectivePayroll + ROSTER_QUALITY_K));
}

/** [ASSUMPTION] */
export const COACHING_QUALITY_MAX = 100;
/** [ASSUMPTION] Coaching spend for half-max coaching quality. */
export const COACHING_QUALITY_K = 35_000_000;

/** Coaching quality = f(coaching spend), diminishing returns. */
export function coachingQuality(coachingSpend: number): number {
  return COACHING_QUALITY_MAX * saturating(coachingSpend, COACHING_QUALITY_K);
}

/** [ASSUMPTION] Worst-case fraction of full playing strength lost to
 * injury, at zero facilities spend. */
export const AVAILABILITY_MIN = 0.90;
/** [ASSUMPTION] Best-case fraction, at very high facilities spend. */
export const AVAILABILITY_MAX = 1.00;
/** [ASSUMPTION] Facilities spend for the halfway point between the two. */
export const AVAILABILITY_K = 20_000_000;

/**
 * Availability = f(facilities spend): a multiplier for games effectively
 * lost to injury.
 *   availability = AVAILABILITY_MIN + (AVAILABILITY_MAX - AVAILABILITY_MIN) x facilitiesSpend / (facilitiesSpend + AVAILABILITY_K)
 */
export function availability(facilitiesSpend: number): number {
  return (
    AVAILABILITY_MIN +
    (AVAILABILITY_MAX - AVAILABILITY_MIN) * saturating(facilitiesSpend, AVAILABILITY_K)
  );
}

/** [ASSUMPTION] Roster talent matters more to team strength than coaching. */
export const ROSTER_WEIGHT = 0.7;
/** [ASSUMPTION] */
export const COACHING_WEIGHT = 0.3;

/**
 * Team strength = weighted blend of roster and coaching quality, scaled by
 * availability:
 *   teamStrength = (ROSTER_WEIGHT x rosterQuality + COACHING_WEIGHT x coachingQuality) x availability
 */
export function teamStrength(a: FrontOfficeAssumptions): number {
  const roster = rosterQuality(a.payroll, a.developmentSpend);
  const coaching = coachingQuality(a.coachingSpend);
  const avail = availability(a.facilitiesSpend);
  return (ROSTER_WEIGHT * roster + COACHING_WEIGHT * coaching) * avail;
}

/**
 * [ASSUMPTION] Documented "league-average" spend levels, used only to
 * compute LEAGUE_AVERAGE_STRENGTH — the denominator every team-strength
 * ratio in the engine is measured against. Set below the Packers' own
 * sourced baseline on every line (most clubs spend close to, but not at,
 * the cap; Green Bay's disclosed baseline payroll IS the cap), so a team
 * spending at the Packers' baseline comes out stronger than a league-average
 * team — consistent with a playoff-caliber season.
 */
export const LEAGUE_AVERAGE_PAYROLL = 270_000_000;
export const LEAGUE_AVERAGE_COACHING_SPEND = 35_000_000;
export const LEAGUE_AVERAGE_FACILITIES_SPEND = 22_000_000;
export const LEAGUE_AVERAGE_DEVELOPMENT_SPEND = 14_000_000;

/** [DERIVED] Computed via the same teamStrength() formula as every other
 * team-strength figure, at the documented league-average spend levels
 * above. Marketing/gameday/ticket price/strategy weighting don't affect
 * strength, so they're passed as 0. */
export const LEAGUE_AVERAGE_STRENGTH = teamStrength({
  payroll: LEAGUE_AVERAGE_PAYROLL,
  coachingSpend: LEAGUE_AVERAGE_COACHING_SPEND,
  facilitiesSpend: LEAGUE_AVERAGE_FACILITIES_SPEND,
  developmentSpend: LEAGUE_AVERAGE_DEVELOPMENT_SPEND,
  marketingSpend: 0,
  gamedaySpend: 0,
  ticketPrice: 0,
  strategyWeighting: 0,
});

/** [DERIVED] Team strength at the sourced FY2026 baseline lever settings. */
export const BASELINE_TEAM_STRENGTH = teamStrength(FRONT_OFFICE_BASE_DEFAULTS);

/** [ASSUMPTION] Average-team win total over a 17-game season — 17/2 = 8.5,
 * by definition of "average." */
export const LEAGUE_AVERAGE_WINS = 8.5;

/**
 * [DERIVED] — THE CALIBRATION STEP. Solved so that at BASELINE_TEAM_STRENGTH
 * the model reproduces ACTUAL_2025_WIN_TOTAL (9.5) exactly:
 *
 *   9.5 = 8.5 + WINS_ELASTICITY x ln(BASELINE_TEAM_STRENGTH / LEAGUE_AVERAGE_STRENGTH)
 *   WINS_ELASTICITY = (ACTUAL_2025_WIN_TOTAL - LEAGUE_AVERAGE_WINS)
 *                      / ln(BASELINE_TEAM_STRENGTH / LEAGUE_AVERAGE_STRENGTH)
 *
 * Rather than hand-picking a win-sensitivity constant, it's solved
 * algebraically from two team-strength values the engine itself computes
 * (baseline vs. documented league-average spend) — forcing the baseline
 * case to reproduce the real 2025 record by construction, not by tuning.
 */
export const WINS_ELASTICITY =
  (ACTUAL_2025_WIN_TOTAL - LEAGUE_AVERAGE_WINS) /
  Math.log(BASELINE_TEAM_STRENGTH / LEAGUE_AVERAGE_STRENGTH);

/**
 * Expected wins over 17 games = f(team strength vs. league average):
 *   wins = LEAGUE_AVERAGE_WINS + WINS_ELASTICITY x ln(strength / LEAGUE_AVERAGE_STRENGTH)
 * clamped to [0, 17].
 */
export function expectedWins(strength: number): number {
  const raw =
    LEAGUE_AVERAGE_WINS + WINS_ELASTICITY * Math.log(strength / LEAGUE_AVERAGE_STRENGTH);
  return Math.min(17, Math.max(0, raw));
}

// ============================================================================
// 6. PLAYOFF SEEDING AND ADVANCEMENT
// ============================================================================

/**
 * [ASSUMPTION] NFC win-total → seed thresholds. [SOURCED]: current 7-team
 * playoff format per conference, #1 seed bye. Calibrated so a 9.5-win team
 * lands at exactly seed 7 (ACTUAL_2025_SEED), matching the real 2025
 * result; thresholds are strictly increasing so no win total resolves
 * ambiguously.
 */
export const SEED_WIN_THRESHOLDS: { seed: number; minWins: number }[] = [
  { seed: 1, minWins: 13.5 },
  { seed: 2, minWins: 12.5 },
  { seed: 3, minWins: 11.5 },
  { seed: 4, minWins: 11.0 },
  { seed: 5, minWins: 10.5 },
  { seed: 6, minWins: 10.0 },
  { seed: 7, minWins: 9.5 },
];

export function seedForWins(wins: number): number | null {
  for (const { seed, minWins } of SEED_WIN_THRESHOLDS) {
    if (wins >= minWins) return seed;
  }
  return null; // missed the playoffs
}

/** [DERIVED] Baseline team-strength ratio to league average. */
export const BASELINE_STRENGTH_RATIO = BASELINE_TEAM_STRENGTH / LEAGUE_AVERAGE_STRENGTH;

/**
 * [ASSUMPTION] Round-survival strength-ratio bars, each set relative to
 * BASELINE_STRENGTH_RATIO so the baseline case reproduces the actual 2025
 * playoff result: a 7-seed team at exactly BASELINE_STRENGTH_RATIO falls
 * just short of the Wild Card bar (real outcome: lost at Chicago). Each
 * later round's bar is set higher, since survivors face progressively
 * tougher remaining competition.
 */
export const WILDCARD_SURVIVAL_RATIO = BASELINE_STRENGTH_RATIO * 1.03;
export const DIVISIONAL_SURVIVAL_RATIO = WILDCARD_SURVIVAL_RATIO * 1.05;
export const CONFERENCE_SURVIVAL_RATIO = DIVISIONAL_SURVIVAL_RATIO * 1.05;
export const SUPERBOWL_SURVIVAL_RATIO = CONFERENCE_SURVIVAL_RATIO * 1.05;

export type PlayoffOutcome = {
  madePlayoffs: boolean;
  seed: number | null;
  result: string;
  homeGamesHosted: number;
};

/**
 * Playoff outcome from win total against the documented seeding model
 * above, then a deterministic single-path advancement rule: a team
 * survives a round if its strength ratio clears that round's bar.
 * [ASSUMPTION] simplified home-field rule (single-path, not a full bracket
 * simulation — that's Monte Carlo territory in Prompt 3): seeds 1-4 host
 * Wild Card (seed 1 has a bye), seeds 1-2 host Divisional, only the #1 seed
 * hosts the Conference Championship, and the Super Bowl is a neutral site.
 */
export function resolvePlayoffs(wins: number, strengthRatio: number): PlayoffOutcome {
  const seed = seedForWins(wins);
  if (seed === null) {
    return { madePlayoffs: false, seed: null, result: "Missed the playoffs", homeGamesHosted: 0 };
  }

  let homeGamesHosted = 0;

  if (seed !== 1) {
    if (seed <= 4) homeGamesHosted += 1; // hosts Wild Card
    if (strengthRatio < WILDCARD_SURVIVAL_RATIO) {
      return { madePlayoffs: true, seed, result: "Lost Wild Card Round", homeGamesHosted };
    }
  }

  if (seed <= 2) homeGamesHosted += 1; // hosts Divisional
  if (strengthRatio < DIVISIONAL_SURVIVAL_RATIO) {
    return { madePlayoffs: true, seed, result: "Lost Divisional Round", homeGamesHosted };
  }

  if (seed === 1) homeGamesHosted += 1; // hosts Conference Championship
  if (strengthRatio < CONFERENCE_SURVIVAL_RATIO) {
    return { madePlayoffs: true, seed, result: "Lost Conference Championship", homeGamesHosted };
  }

  if (strengthRatio < SUPERBOWL_SURVIVAL_RATIO) {
    return { madePlayoffs: true, seed, result: "Lost Super Bowl", homeGamesHosted }; // neutral site
  }
  return { madePlayoffs: true, seed, result: "Won Super Bowl", homeGamesHosted };
}

// ============================================================================
// 7. REVENUE RESPONSE
// ============================================================================

/**
 * [ASSUMPTION] Marketing spend for half-max saturating "marketing quality."
 * Set equal to baseline marketing spend so the baseline marketing-quality
 * reading is exactly 0.5 — a clean, disclosed reference point.
 */
export const MARKETING_ATTENDANCE_K = BASELINE_MARKETING_SPEND;
/** [ASSUMPTION] Attendance sensitivity to marketing-driven demand changes. */
export const MARKETING_ATTENDANCE_SENSITIVITY = 0.25;
/** [ASSUMPTION] Attendance sensitivity to team-strength changes. */
export const STRENGTH_ATTENDANCE_SENSITIVITY = 0.15;

/**
 * [ASSUMPTION] Price can rise to 115% of baseline before demand responds at
 * all — Lambeau's season-ticket waitlist absorbs a moderate price increase
 * with zero attendance impact. This is the "free zone."
 */
export const FREE_ZONE_MULTIPLIER = 1.15;
/**
 * [ASSUMPTION] Demand elasticity above the free zone. >1 guarantees gate
 * revenue eventually falls as price keeps rising (see the elasticity proof
 * in the Prompt 1 writeup) — this is what makes the ticket-price lever
 * genuinely, not decoratively, elastic.
 */
export const PRICE_ELASTICITY = 1.4;

const BASELINE_MARKETING_QUALITY = saturating(BASELINE_MARKETING_SPEND, MARKETING_ATTENDANCE_K);

/**
 * Attendance rate (0-1, share of stadium capacity) responds to marketing
 * spend, team strength, and ticket price:
 *   marketingFactor = 1 + MARKETING_ATTENDANCE_SENSITIVITY x (marketingQuality(spend) - marketingQuality(baseline))
 *   strengthFactor  = 1 + STRENGTH_ATTENDANCE_SENSITIVITY x (strength / BASELINE_TEAM_STRENGTH - 1)
 *   priceFactor     = 1                                              if priceRatio <= FREE_ZONE_MULTIPLIER
 *                     (priceRatio / FREE_ZONE_MULTIPLIER)^(-PRICE_ELASTICITY)   otherwise
 *   rate = clamp(BASELINE_ATTENDANCE_RATE x marketingFactor x strengthFactor x priceFactor, 0, 1)
 */
export function attendanceRate(a: FrontOfficeAssumptions, strength: number): number {
  const marketingFactor =
    1 +
    MARKETING_ATTENDANCE_SENSITIVITY *
      (saturating(a.marketingSpend, MARKETING_ATTENDANCE_K) - BASELINE_MARKETING_QUALITY);
  const strengthFactor =
    1 + STRENGTH_ATTENDANCE_SENSITIVITY * (strength / BASELINE_TEAM_STRENGTH - 1);

  const priceRatio = a.ticketPrice / BASELINE_TICKET_PRICE;
  const priceFactor =
    priceRatio <= FREE_ZONE_MULTIPLIER
      ? 1
      : Math.pow(priceRatio / FREE_ZONE_MULTIPLIER, -PRICE_ELASTICITY);

  return Math.min(1, Math.max(0, BASELINE_ATTENDANCE_RATE * marketingFactor * strengthFactor * priceFactor));
}

/**
 * [ASSUMPTION] Gameday spend for half-max saturating per-cap quality; set
 * equal to baseline gameday spend for the same reason as
 * MARKETING_ATTENDANCE_K above.
 */
export const GAMEDAY_PERCAP_K = BASELINE_GAMEDAY_SPEND;
/** [ASSUMPTION] Per-cap sensitivity to gameday-ops spend changes. */
export const GAMEDAY_PERCAP_SENSITIVITY = 0.30;
/** [ASSUMPTION] Per-cap sensitivity to team-strength changes — winning
 * teams sell more premium concessions/merch per fan. */
export const STRENGTH_PERCAP_SENSITIVITY = 0.10;

const BASELINE_GAMEDAY_QUALITY = saturating(BASELINE_GAMEDAY_SPEND, GAMEDAY_PERCAP_K);

/**
 * Concessions & merchandise per-cap spend responds to gameday-ops spend and
 * team strength, mirroring the attendance-factor pattern above.
 */
export function perCapSpend(a: FrontOfficeAssumptions, strength: number): number {
  const gamedayFactor =
    1 +
    GAMEDAY_PERCAP_SENSITIVITY *
      (saturating(a.gamedaySpend, GAMEDAY_PERCAP_K) - BASELINE_GAMEDAY_QUALITY);
  const strengthFactor =
    1 + STRENGTH_PERCAP_SENSITIVITY * (strength / BASELINE_TEAM_STRENGTH - 1);
  return BASELINE_PERCAP_SPEND * gamedayFactor * strengthFactor;
}

/** Concessions & merchandise revenue = attendance x per-cap spend x home games. */
export function concessionsMerchandiseRevenue(
  attendance: number,
  a: FrontOfficeAssumptions,
  strength: number
): number {
  return attendance * perCapSpend(a, strength) * HOME_GAMES;
}

/** [ASSUMPTION] Marketing spend for half-max saturating sponsorship
 * quality; set equal to baseline marketing spend. */
export const SPONSOR_MARKETING_K = BASELINE_MARKETING_SPEND;
/** [ASSUMPTION] Sponsorship sensitivity to marketing spend changes. */
export const SPONSOR_MARKETING_SENSITIVITY = 0.35;
/** [ASSUMPTION] Sponsorship sensitivity to team-strength changes — winning
 * teams command better local sponsorship rates. */
export const SPONSOR_STRENGTH_SENSITIVITY = 0.20;

const BASELINE_SPONSOR_MARKETING_QUALITY = saturating(BASELINE_MARKETING_SPEND, SPONSOR_MARKETING_K);

/** Local sponsorship revenue responds to marketing spend and team strength. */
export function sponsorshipRevenue(a: FrontOfficeAssumptions, strength: number): number {
  const marketingFactor =
    1 +
    SPONSOR_MARKETING_SENSITIVITY *
      (saturating(a.marketingSpend, SPONSOR_MARKETING_K) - BASELINE_SPONSOR_MARKETING_QUALITY);
  const strengthFactor =
    1 + SPONSOR_STRENGTH_SENSITIVITY * (strength / BASELINE_TEAM_STRENGTH - 1);
  return BASELINE_SPONSORSHIP_REVENUE * marketingFactor * strengthFactor;
}

/** [ASSUMPTION] Playoff games at Lambeau always sell out. */
export const PLAYOFF_ATTENDANCE_RATE = 1.0;
/** [ASSUMPTION] Playoff tickets command a premium over the blended
 * regular-season price. */
export const PLAYOFF_PRICE_PREMIUM = 1.5;
/** [ASSUMPTION] NFL playoff gate receipts are split with the league and
 * visiting club; the home team nets roughly two-thirds. */
export const PLAYOFF_GATE_HOME_SHARE = 0.66;

/**
 * Playoff revenue — home playoff gate only, the one place winning pays
 * meaningfully. At baseline the team hosts zero playoff games (7-seed,
 * eliminated on the road), so baseline playoff revenue is exactly $0,
 * consistent with the real 2025 season and preserving the exact revenue
 * reconciliation to $753.0M.
 */
export function playoffRevenue(homeGamesHosted: number, ticketPrice: number): number {
  const revenuePerGame =
    STADIUM_CAPACITY * PLAYOFF_ATTENDANCE_RATE * ticketPrice * PLAYOFF_PRICE_PREMIUM * PLAYOFF_GATE_HOME_SHARE;
  return revenuePerGame * homeGamesHosted;
}

// ============================================================================
// 8. CAP LOGIC, HEALTH SCORE, AND THE MAIN ORCHESTRATION FUNCTION
// ============================================================================

export function capUsed(a: FrontOfficeAssumptions): number {
  return Math.min(a.payroll, SALARY_CAP);
}

export function capRoomRemaining(a: FrontOfficeAssumptions): number {
  return SALARY_CAP - capUsed(a);
}

/** [ASSUMPTION] An operating result of ±$100M maps to the full 0-100
 * financial-score range — roughly the real swing the FY2026 disclosure
 * itself demonstrates (an ~$85M operating-result swing year over year). */
export const FINANCIAL_SCORE_SCALE = 100_000_000;

/**
 * Franchise health (0-100) blends on-field and financial results per the
 * strategy weighting w (0 = pure financial, 1 = pure on-field):
 *   onFieldScore  = clamp(wins / 17 x 100, 0, 100)
 *   financialScore = clamp(50 + operatingResult / FINANCIAL_SCORE_SCALE x 50, 0, 100)
 *   health = w x onFieldScore + (1 - w) x financialScore
 */
export function franchiseHealthScore(
  wins: number,
  operatingResult: number,
  strategyWeighting: number
): number {
  const onFieldScore = Math.min(100, Math.max(0, (wins / 17) * 100));
  const financialScore = Math.min(
    100,
    Math.max(0, 50 + (operatingResult / FINANCIAL_SCORE_SCALE) * 50)
  );
  return strategyWeighting * onFieldScore + (1 - strategyWeighting) * financialScore;
}

/**
 * [ASSUMPTION] The deterministic engine outputs an expected win TOTAL, not
 * individual game simulation, so a displayed record rounds to the nearest
 * half-win (allowing a ".5" to read as a tie, matching how ties are
 * conventionally displayed in NFL standings).
 */
export type FrontOfficeRecord = { wins: number; losses: number };
function winsToRecord(wins: number): FrontOfficeRecord {
  const rounded = Math.round(wins * 2) / 2;
  return { wins: rounded, losses: 17 - rounded };
}

export type FrontOfficeRevenue = {
  national: number;
  ticketing: number;
  concessionsMerchandise: number;
  sponsorship: number;
  playoff: number;
  total: number;
};

export type FrontOfficeCost = {
  payroll: number;
  coaching: number;
  facilities: number;
  development: number;
  marketing: number;
  gameday: number;
  fixedOverhead: number;
  total: number;
};

export type FrontOfficeResult = {
  teamStrength: number;
  strengthRatio: number;
  wins: number;
  record: FrontOfficeRecord;
  playoff: PlayoffOutcome;
  attendance: number;
  revenue: FrontOfficeRevenue;
  cost: FrontOfficeCost;
  operatingResult: number;
  capUsed: number;
  capRoomRemaining: number;
  franchiseHealth: number;
};

/**
 * The main orchestration function: one plan in, one full season's outcome
 * out. Every number in the result traces back to a lever or a disclosed
 * constant above — nothing here is hardcoded independently of the engine.
 */
export function runFrontOfficeSimulation(rawAssumptions: FrontOfficeAssumptions): FrontOfficeResult {
  const a: FrontOfficeAssumptions = {
    ...rawAssumptions,
    payroll: Math.min(rawAssumptions.payroll, SALARY_CAP), // the cap genuinely binds
  };

  const strength = teamStrength(a);
  const strengthRatio = strength / LEAGUE_AVERAGE_STRENGTH;
  const wins = expectedWins(strength);
  const playoff = resolvePlayoffs(wins, strengthRatio);

  const attendance = attendanceRate(a, strength) * STADIUM_CAPACITY;

  const revenue: FrontOfficeRevenue = {
    national: NATIONAL_REVENUE,
    ticketing: attendance * a.ticketPrice * HOME_GAMES,
    concessionsMerchandise: concessionsMerchandiseRevenue(attendance, a, strength),
    sponsorship: sponsorshipRevenue(a, strength),
    playoff: playoffRevenue(playoff.homeGamesHosted, a.ticketPrice),
    total: 0,
  };
  revenue.total =
    revenue.national +
    revenue.ticketing +
    revenue.concessionsMerchandise +
    revenue.sponsorship +
    revenue.playoff;

  const cost: FrontOfficeCost = {
    payroll: capUsed(a),
    coaching: a.coachingSpend,
    facilities: a.facilitiesSpend,
    development: a.developmentSpend,
    marketing: a.marketingSpend,
    gameday: a.gamedaySpend,
    fixedOverhead: FIXED_OVERHEAD,
    total: 0,
  };
  cost.total =
    cost.payroll +
    cost.coaching +
    cost.facilities +
    cost.development +
    cost.marketing +
    cost.gameday +
    cost.fixedOverhead;

  const operatingResult = revenue.total - cost.total;

  return {
    teamStrength: strength,
    strengthRatio,
    wins,
    record: winsToRecord(wins),
    playoff,
    attendance,
    revenue,
    cost,
    operatingResult,
    capUsed: cost.payroll,
    capRoomRemaining: SALARY_CAP - cost.payroll,
    franchiseHealth: franchiseHealthScore(wins, operatingResult, a.strategyWeighting),
  };
}

import {
  FIXED_OVERHEAD,
  HOME_GAMES,
  LEAGUE_AVERAGE_STRENGTH,
  NATIONAL_REVENUE,
  OPERATING_RESULT,
  SALARY_CAP,
  STADIUM_CAPACITY,
  attendanceRate,
  capUsed,
  concessionsMerchandiseRevenue,
  expectedWins,
  franchiseHealthScore,
  packersFieldSeed,
  playoffRevenue,
  resolvePlayoffs,
  sponsorshipRevenue,
  teamStrength,
  type FrontOfficeAssumptions,
} from "@/lib/models/frontOffice";
import { hashStringToSeed, mulberry32, percentile, standardNormal } from "@/lib/models/shared";

// Monte Carlo mode reruns the SAME committed engine (via the exact same
// exported pure functions runFrontOfficeSimulation itself calls — see the
// line-by-line correspondence in runOneSeason below) many times with two
// resampled inputs: this season's actual win total and this season's
// actual attendance. It is not a second forecasting model, and it does not
// touch the revenue/cost formulas — every dollar figure a season produces
// comes from the exact same functions the deterministic console uses.

// ============================================================================
// THE VARIANCE MODEL — two sources, both documented
// ============================================================================

/**
 * [ASSUMPTION] Game outcomes: the plan's deterministic expected wins over
 * 17 games imply a per-game win probability (expectedWins / 17). Each
 * simulated season draws 17 independent Bernoulli(p) games and sums them —
 * a Binomial(17, p) win total, not a hand-picked noise term. At a
 * competitive team (p around 0.56, i.e. ~9.5 expected wins), this gives
 * stdDev = sqrt(17 x p x (1-p)) ≈ 2.0 wins — a defensible, real spread for
 * an NFL season (the binomial IS the "convert to a coin-flip-per-game"
 * formulation the league's own single-elimination unpredictability comes
 * from), and it's principled rather than invented: the only free
 * parameter is the plan's own expected win total, already the engine's
 * output, not a new constant.
 */
function sampleSeasonWins(deterministicWins: number, rng: () => number): number {
  const perGameWinProbability = Math.min(1, Math.max(0, deterministicWins / 17));
  let wins = 0;
  for (let game = 0; game < 17; game++) {
    if (rng() < perGameWinProbability) wins++;
  }
  return wins;
}

/**
 * [ASSUMPTION] Attendance: a modest per-season multiplicative jitter on
 * top of the deterministic attendance rate, representing weather,
 * schedule quality, and one-off demand — not a second win/loss coin flip.
 * 2% standard deviation on the RATE (not a fixed headcount) is kept
 * deliberately small: at the baseline ~97% deterministic rate, one
 * standard deviation is under 1,700 fans out of a 81,441-seat stadium.
 * Clamped to [0, 1] so a lucky draw can never exceed the stadium's
 * physical capacity. Applied only to the two regular-season revenue lines
 * that actually depend on attendance (ticketing, concessions &
 * merchandise) — playoff games keep their own always-sells-out assumption
 * from the deterministic engine, and sponsorship doesn't depend on
 * attendance at all.
 */
export const ATTENDANCE_NOISE_STDDEV = 0.02;

function sampleAttendanceRate(deterministicRate: number, rng: () => number): number {
  const noisy = deterministicRate * (1 + standardNormal(rng) * ATTENDANCE_NOISE_STDDEV);
  return Math.min(1, Math.max(0, noisy));
}

// ============================================================================
// One simulated season
// ============================================================================

export type FrontOfficeSeasonSample = {
  wins: number; // this season's actual (integer) win total
  seed: number | null;
  madePlayoffs: boolean;
  homeGamesHosted: number;
  playoffResult: string;
  // Carried on every sample specifically so callers can verify — not just
  // take on faith — that it never varies: see the invariance check this
  // pass's deliverables call for.
  revenueNational: number;
  revenueTotal: number;
  playoffRevenue: number;
  costTotal: number;
  operatingResult: number;
  franchiseHealth: number;
};

/**
 * Runs one full simulated season for a fixed plan: resample wins and
 * attendance, then recompute the ENTIRE downstream chain the same way the
 * deterministic engine does — wins -> real NFC field position -> seed ->
 * home playoff games -> playoff revenue, and attendance -> ticketing +
 * concessions/merchandise — using the exact same exported functions
 * runFrontOfficeSimulation itself calls (teamStrength, packersFieldSeed,
 * resolvePlayoffs, attendanceRate, concessionsMerchandiseRevenue,
 * sponsorshipRevenue, playoffRevenue, capUsed, franchiseHealthScore). Team
 * STRENGTH (and therefore strengthRatio, which governs round-by-round
 * playoff survival) does not get resampled — the roster and coaching
 * staff don't change game to game, only the bounces of an 17-game season
 * and a given Sunday's attendance do.
 */
function runOneSeason(rawAssumptions: FrontOfficeAssumptions, rng: () => number): FrontOfficeSeasonSample {
  const a: FrontOfficeAssumptions = {
    ...rawAssumptions,
    payroll: Math.min(rawAssumptions.payroll, SALARY_CAP),
  };

  const strength = teamStrength(a);
  const strengthRatio = strength / LEAGUE_AVERAGE_STRENGTH;
  const deterministicWins = expectedWins(strength);

  const wins = sampleSeasonWins(deterministicWins, rng);
  const fieldSeeding = packersFieldSeed(wins);
  const playoff = resolvePlayoffs(strengthRatio, fieldSeeding.seed, fieldSeeding.isDivisionWinner);

  const deterministicAttendanceRate = attendanceRate(a, strength);
  const seasonAttendanceRate = sampleAttendanceRate(deterministicAttendanceRate, rng);
  const attendance = seasonAttendanceRate * STADIUM_CAPACITY;

  const revenueNational = NATIONAL_REVENUE;
  const revenueTicketing = attendance * a.ticketPrice * HOME_GAMES;
  const revenueConcessionsMerch = concessionsMerchandiseRevenue(attendance, a, strength);
  const revenueSponsorship = sponsorshipRevenue(a, strength);
  const revenuePlayoff = playoffRevenue(playoff.homeGamesHosted, a.ticketPrice);
  const revenueTotal =
    revenueNational + revenueTicketing + revenueConcessionsMerch + revenueSponsorship + revenuePlayoff;

  const costTotal =
    capUsed(a) + a.coachingSpend + a.facilitiesSpend + a.developmentSpend + a.marketingSpend + a.gamedaySpend + FIXED_OVERHEAD;

  const operatingResult = revenueTotal - costTotal;

  return {
    wins,
    seed: playoff.seed,
    madePlayoffs: playoff.madePlayoffs,
    homeGamesHosted: playoff.homeGamesHosted,
    playoffResult: playoff.result,
    revenueNational,
    revenueTotal,
    playoffRevenue: revenuePlayoff,
    costTotal,
    operatingResult,
    franchiseHealth: franchiseHealthScore(wins, operatingResult, a.strategyWeighting),
  };
}

// ============================================================================
// The full run
// ============================================================================

export type FrontOfficeMonteCarloResult = {
  simulations: number;
  seed: number;
  samples: FrontOfficeSeasonSample[];
  // The deterministic engine's own expected-wins figure, echoed back here
  // so the UI can mark it on the win-distribution histogram without a
  // second call — the deterministic *operating result* isn't duplicated
  // here, since the console already holds it from its own
  // runFrontOfficeSimulation() call.
  deterministicWins: number;
  meanWins: number;
  playoffProbability: number;
  probabilityOperatingProfit: number;
  probabilityBeatsFY2026: number;
  medianOperatingResult: number;
  p10OperatingResult: number;
  p90OperatingResult: number;
};

/**
 * Reproducible, not freshly random: the seed is a hash of the assumptions
 * themselves (same pattern as the SaaS Monte Carlo — see
 * seedForAssumptions in src/lib/monteCarlo.ts), so re-running "1,000
 * Seasons" against the exact same plan reproduces the exact same
 * distribution. Chosen deliberately over fresh randomness: this pass's
 * own deliverables ask to verify the win distribution's mean against the
 * deterministic expectation and to confirm national revenue never varies
 * — both are far easier to check, and to re-check after a code change,
 * against a fixed, reproducible sample set than against a new random draw
 * every time. A visitor comparing two plans also deserves an
 * apples-to-apples distribution for each, not one that reshuffles if they
 * nudge a slider back and forth.
 */
export function seedForFrontOfficePlan(assumptions: FrontOfficeAssumptions, simulations: number): number {
  return hashStringToSeed(JSON.stringify(assumptions)) ^ simulations;
}

export function runFrontOfficeMonteCarlo(
  assumptions: FrontOfficeAssumptions,
  simulations: number
): FrontOfficeMonteCarloResult {
  const seed = seedForFrontOfficePlan(assumptions, simulations);
  const rng = mulberry32(seed);

  const samples: FrontOfficeSeasonSample[] = [];
  for (let i = 0; i < simulations; i++) {
    samples.push(runOneSeason(assumptions, rng));
  }

  const strength = teamStrength({ ...assumptions, payroll: Math.min(assumptions.payroll, SALARY_CAP) });
  const deterministicWins = expectedWins(strength);

  const winsSum = samples.reduce((sum, s) => sum + s.wins, 0);
  const opResultsSorted = samples.map((s) => s.operatingResult).sort((a, b) => a - b);
  const playoffCount = samples.filter((s) => s.madePlayoffs).length;
  const profitCount = samples.filter((s) => s.operatingResult > 0).length;
  const beatsFy2026Count = samples.filter((s) => s.operatingResult > OPERATING_RESULT).length;

  return {
    simulations,
    seed,
    samples,
    deterministicWins,
    meanWins: winsSum / samples.length,
    playoffProbability: playoffCount / samples.length,
    probabilityOperatingProfit: profitCount / samples.length,
    probabilityBeatsFY2026: beatsFy2026Count / samples.length,
    medianOperatingResult: percentile(opResultsSorted, 0.5),
    p10OperatingResult: percentile(opResultsSorted, 0.1),
    p90OperatingResult: percentile(opResultsSorted, 0.9),
  };
}

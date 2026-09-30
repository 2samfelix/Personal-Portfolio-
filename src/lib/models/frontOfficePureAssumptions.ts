// Pure copies of several of FrontOfficeSimulator.tsx's own assumption
// objects and helpers — same values, same driverMax/driverMin/
// TOP_OF_FREE_ZONE_TICKET_PRICE/argmaxMarketingSpend logic, just re-declared
// here so plain Node scripts (scripts/precompute-front-office-*.mts) can
// import them without pulling in React or JSX. FrontOfficeSimulator.tsx is
// a "use client" component; nothing in it can be imported by a standalone
// script.
//
// This file changes no model, engine, preset, or sampling behavior — it
// only lets two expensive, non-reactive computations be precomputed once at
// build time instead of re-run in every visitor's browser:
//   - the closing "What the Model Shows" card's two Monte Carlo runs
//     (scripts/precompute-front-office-closing-card.mts)
//   - the Strategy Map's 500-plan Halton sample + 10 injected anchor points
//     (scripts/precompute-front-office-strategy-map.mts)
//
// Every object below is deliberately DUPLICATED data, not a shared import
// with FrontOfficeSimulator.tsx — that file keeps its own originals
// (several of these, like MAXIMIZE_BUSINESS_ASSUMPTIONS and
// FLOOR_WIN_ASSUMPTIONS/CEILING_WIN_ASSUMPTIONS, are also used elsewhere on
// the page beyond what's precomputed here, e.g. the console's own
// floor-to-ceiling win range note). If any of these ever change in
// FrontOfficeSimulator.tsx, update the matching object here too, then
// rerun both precompute scripts (wired into `npm run prebuild`, so a normal
// `npm run build` already does this — see package.json).
import {
  BASELINE_TICKET_PRICE,
  FREE_ZONE_MULTIPLIER,
  FRONT_OFFICE_BASE_DEFAULTS,
  FRONT_OFFICE_DRIVERS,
  SALARY_CAP,
  SALARY_FLOOR,
  runFrontOfficeSimulation,
  type FrontOfficeAssumptions,
  type FrontOfficeDriverKey,
} from "./frontOffice";

export function driverMax(key: FrontOfficeDriverKey): number {
  return FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!.max;
}

export function driverMin(key: FrontOfficeDriverKey): number {
  return FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!.min;
}

export const TOP_OF_FREE_ZONE_TICKET_PRICE = BASELINE_TICKET_PRICE * FREE_ZONE_MULTIPLIER;

// ============================================================================
// Closing-card presets (used by precompute-front-office-closing-card.mts)
// ============================================================================

export const SPEND_TO_CONTEND_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_CAP,
  coachingSpend: driverMax("coachingSpend"),
  facilitiesSpend: driverMax("facilitiesSpend"),
  developmentSpend: driverMax("developmentSpend"),
  marketingSpend: 21_101_431.52,
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: TOP_OF_FREE_ZONE_TICKET_PRICE,
};

export const BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS: FrontOfficeAssumptions = {
  payroll: 271_060_000,
  coachingSpend: 68_150_000,
  facilitiesSpend: 18_320_000,
  developmentSpend: 28_270_000,
  marketingSpend: 21_749_290.92,
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: TOP_OF_FREE_ZONE_TICKET_PRICE,
  strategyWeighting: 0.5,
};

// ============================================================================
// Strategy Map inputs (used by precompute-front-office-strategy-map.mts)
// ============================================================================

export const FLOOR_WIN_ASSUMPTIONS: FrontOfficeAssumptions = {
  payroll: SALARY_FLOOR,
  coachingSpend: driverMin("coachingSpend"),
  facilitiesSpend: driverMin("facilitiesSpend"),
  developmentSpend: driverMin("developmentSpend"),
  marketingSpend: driverMin("marketingSpend"),
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: driverMin("ticketPrice"),
  strategyWeighting: 0.5,
};

export const CEILING_WIN_ASSUMPTIONS: FrontOfficeAssumptions = {
  payroll: SALARY_CAP,
  coachingSpend: driverMax("coachingSpend"),
  facilitiesSpend: driverMax("facilitiesSpend"),
  developmentSpend: driverMax("developmentSpend"),
  marketingSpend: driverMax("marketingSpend"),
  gamedaySpend: driverMax("gamedaySpend"),
  ticketPrice: driverMax("ticketPrice"),
  strategyWeighting: 0.5,
};

/**
 * Ternary search for the marketingSpend that maximizes operatingResult
 * holding every other lever in `base` fixed — same 60-iteration search
 * FrontOfficeSimulator.tsx's own argmaxMarketingSpend runs, against the
 * same committed runFrontOfficeSimulation.
 */
export function argmaxMarketingSpend(base: FrontOfficeAssumptions): number {
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

const MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_FLOOR,
  coachingSpend: driverMin("coachingSpend"),
  facilitiesSpend: driverMin("facilitiesSpend"),
  developmentSpend: driverMin("developmentSpend"),
  gamedaySpend: driverMin("gamedaySpend"),
  ticketPrice: TOP_OF_FREE_ZONE_TICKET_PRICE,
};

export const MAXIMIZE_BUSINESS_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR,
  marketingSpend: argmaxMarketingSpend(MAXIMIZE_BUSINESS_FOOTBALL_SPEND_AT_FLOOR),
};

const PAYROLL_FLOOR_FOOTBALL_MIN_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_FLOOR,
  coachingSpend: driverMin("coachingSpend"),
  facilitiesSpend: driverMin("facilitiesSpend"),
  developmentSpend: driverMin("developmentSpend"),
};
const PAYROLL_FLOOR_FOOTBALL_MAX_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_FLOOR,
  coachingSpend: driverMax("coachingSpend"),
  facilitiesSpend: driverMax("facilitiesSpend"),
  developmentSpend: driverMax("developmentSpend"),
};
const PAYROLL_CAP_FOOTBALL_MIN_ASSUMPTIONS: FrontOfficeAssumptions = {
  ...FRONT_OFFICE_BASE_DEFAULTS,
  payroll: SALARY_CAP,
  coachingSpend: driverMin("coachingSpend"),
  facilitiesSpend: driverMin("facilitiesSpend"),
  developmentSpend: driverMin("developmentSpend"),
};

type StrategyMapAnchor = { key: string; assumptions: FrontOfficeAssumptions };

// The ten explicitly injected boundary/reference plans, same set and same
// order as FrontOfficeSimulator.tsx's own STRATEGY_MAP_INJECTED_ANCHOR_ASSUMPTIONS.
export const STRATEGY_MAP_INJECTED_ANCHOR_ASSUMPTIONS: StrategyMapAnchor[] = [
  { key: "allMin", assumptions: FLOOR_WIN_ASSUMPTIONS },
  { key: "allMax", assumptions: CEILING_WIN_ASSUMPTIONS },
  { key: "fy2026Baseline", assumptions: FRONT_OFFICE_BASE_DEFAULTS },
  { key: "maximizeBusiness", assumptions: MAXIMIZE_BUSINESS_ASSUMPTIONS },
  { key: "buildThroughDevelopment", assumptions: BUILD_THROUGH_DEVELOPMENT_ASSUMPTIONS },
  { key: "spendToContend", assumptions: SPEND_TO_CONTEND_ASSUMPTIONS },
  { key: "payrollFloorFootballMin", assumptions: PAYROLL_FLOOR_FOOTBALL_MIN_ASSUMPTIONS },
  { key: "payrollFloorFootballMax", assumptions: PAYROLL_FLOOR_FOOTBALL_MAX_ASSUMPTIONS },
  { key: "payrollCapFootballMin", assumptions: PAYROLL_CAP_FOOTBALL_MIN_ASSUMPTIONS },
  { key: "payrollCapFootballMax", assumptions: SPEND_TO_CONTEND_ASSUMPTIONS },
];

/**
 * Halton low-discrepancy sequence — deterministic, reproducible. Same
 * implementation as FrontOfficeSimulator.tsx's own haltonValue.
 */
export function haltonValue(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f = f / base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

export const STRATEGY_MAP_HALTON_DRIVERS: FrontOfficeDriverKey[] = [
  "payroll",
  "coachingSpend",
  "facilitiesSpend",
  "developmentSpend",
];
export const STRATEGY_MAP_HALTON_BASES = [2, 3, 5, 7];
export const STRATEGY_MAP_SAMPLE_SIZE = 500;
const STRATEGY_MAP_FIXED_GAMEDAY_SPEND = driverMin("gamedaySpend");
const STRATEGY_MAP_FIXED_TICKET_PRICE = TOP_OF_FREE_ZONE_TICKET_PRICE;

export type StrategyMapPoint = { wins: number; operatingResult: number };

/**
 * The feasible-region cloud: STRATEGY_MAP_SAMPLE_SIZE plans, each built by
 * mapping one Halton point onto that lever's own [min, max], fixing
 * gameday/ticket at their own optimum and marketing at its own per-plan
 * optimum, then run through the real engine. Same algorithm as
 * FrontOfficeSimulator.tsx's own sampleFeasibleFrontOfficePlans.
 */
export function sampleFeasibleFrontOfficePlans(): StrategyMapPoint[] {
  const points: StrategyMapPoint[] = [];
  for (let i = 1; i <= STRATEGY_MAP_SAMPLE_SIZE; i++) {
    const sampled = {
      gamedaySpend: STRATEGY_MAP_FIXED_GAMEDAY_SPEND,
      ticketPrice: STRATEGY_MAP_FIXED_TICKET_PRICE,
      strategyWeighting: 0.5,
    } as FrontOfficeAssumptions;
    STRATEGY_MAP_HALTON_DRIVERS.forEach((key, dimIndex) => {
      const t = haltonValue(i, STRATEGY_MAP_HALTON_BASES[dimIndex]);
      sampled[key] = driverMin(key) + t * (driverMax(key) - driverMin(key));
    });
    sampled.marketingSpend = argmaxMarketingSpend(sampled);
    const r = runFrontOfficeSimulation(sampled);
    points.push({ wins: r.wins, operatingResult: r.operatingResult });
  }
  return points;
}

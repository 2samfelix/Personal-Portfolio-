// Pure copies of two of FrontOfficeSimulator.tsx's own preset assumption
// objects (Build Through Development, Spend to Contend) — same values,
// same driverMax/driverMin/TOP_OF_FREE_ZONE_TICKET_PRICE logic, just
// re-declared here so a plain Node script
// (scripts/precompute-front-office-closing-card.mts) can import them
// without pulling in React or JSX. FrontOfficeSimulator.tsx is a "use
// client" component; nothing in it can be imported by a standalone script.
//
// This file changes no model, engine, or preset behavior — it only lets the
// closing "What the Model Shows" card's Monte Carlo numbers be precomputed
// once at build time (see the generated stats file the script writes)
// instead of every visitor's browser re-running 2,000 simulated seasons
// during hydration. If either preset's assumptions ever change in
// FrontOfficeSimulator.tsx, update the matching object here too — both are
// deliberately duplicated data, not a shared import, so this file has zero
// risk of pulling client-only code into a build script.
import {
  BASELINE_TICKET_PRICE,
  FREE_ZONE_MULTIPLIER,
  FRONT_OFFICE_BASE_DEFAULTS,
  FRONT_OFFICE_DRIVERS,
  SALARY_CAP,
  type FrontOfficeAssumptions,
  type FrontOfficeDriverKey,
} from "./frontOffice";

function driverMax(key: FrontOfficeDriverKey): number {
  return FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!.max;
}

function driverMin(key: FrontOfficeDriverKey): number {
  return FRONT_OFFICE_DRIVERS.find((d) => d.key === key)!.min;
}

const TOP_OF_FREE_ZONE_TICKET_PRICE = BASELINE_TICKET_PRICE * FREE_ZONE_MULTIPLIER;

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

// The Chicago skyline, as seen from Lake Michigan looking due west at the Loop.
//
// Data: src/lib/skyline-buildings.json — for each building its sourced heights, floors,
// coordinates and a simplified silhouette in metres (tiers, taper, roof, masts). Nothing
// here is traced from a photograph; each outline is drawn from the published heights,
// floor counts and setback descriptions cited in the file.
//
// Projection: orthographic, so relative heights are exact. Looking west, south is on the
// left and north on the right, so a building's horizontal position is its north-south
// distance from the reference latitude; its depth is its east-west distance (further
// east = nearer the viewer, drawn later so it sits in front).
// scripts/test-skyline.py recomputes this from the coordinates and checks the drawing.
import data from "./skyline-buildings.json";

export type Tier = { y0: number; y1: number; w0: number; w1?: number; dx?: number };
export type Mast = { dx: number; y0: number; y1: number };
export type Building = {
  id: string;
  name: string;
  floors: number;
  lat: number;
  lon: number;
  height: { architectural_m: number; tip_m?: number; roof_m?: number };
  /** Body tiers bottom to top, metres above ground; w0/w1 = width at y0/y1 (taper). */
  tiers: Tier[];
  /** Optional pitched or stepped top, drawn above the last tier. */
  roof?: { type: "pyramid"; y0: number; y1: number; w: number };
  /** Antennas or spires, as lines. */
  masts?: Mast[];
  /** Marina City: horizontal balcony scallops on a cylinder. */
  corncob?: boolean;
  sources: string[];
};

export const BUILDINGS = data.buildings as Building[];

const M_PER_DEG_LAT = 111_320;

/** Horizontal (north-south) and depth (east-west, + = east) offsets in metres. */
export function project(b: Pick<Building, "lat" | "lon">, ref = data.reference) {
  const x = (b.lat - ref.lat) * M_PER_DEG_LAT;
  const depth = (b.lon - ref.lon) * M_PER_DEG_LAT * Math.cos((ref.lat * Math.PI) / 180);
  return { x, depth };
}

/** Buildings with their projected positions, farthest (westernmost) first. */
export function skylineLayout() {
  return BUILDINGS.map((b) => ({ ...b, ...project(b) })).sort((a, b) => a.depth - b.depth);
}

export const SKYLINE_REFERENCE = data.reference;

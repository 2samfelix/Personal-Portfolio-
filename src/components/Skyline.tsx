// A stylized Chicago skyline from Lake Michigan looking west, drawn from
// src/lib/skyline-buildings.json (sourced heights, floors and coordinates; see
// src/lib/skyline.ts for the projection). Decorative only: hidden from assistive
// technology and from print, no motion, and it never carries text.
//
// Geometry is in metres (x: north-south offset, y: height above the waterline), so the
// drawing keeps the buildings' real relative heights and positions; the viewBox scales
// it to the container width with a fixed aspect ratio, so it cannot shift layout.
// Each building is a <g data-building>; its body parts carry data-part="body" and its
// antennas / spires data-part="mast", which scripts/test-skyline.py measures.
import { skylineLayout, type Building, type Tier } from "@/lib/skyline";

const r = (n: number) => Math.round(n * 100) / 100;

const TONES = {
  // Brass lines on cream; the fill is the cream itself with a faint brass wash, so
  // nearer buildings hide the lines of those behind them.
  light: { stroke: "#96703e", wash: "#96703e", washOpacity: 0.07, base: "#f5f1e6", strokeOpacity: 0.55 },
  // On the forest footer: the light brass used for text on forest, at low strength.
  dark: { stroke: "#d8b888", wash: "#d8b888", washOpacity: 0.05, base: "#152a1f", strokeOpacity: 0.35 },
};

function tierPath(t: Tier, cx: number, ground: number) {
  const w1 = t.w1 ?? t.w0;
  const x = cx + (t.dx ?? 0);
  const pts = [
    [x - t.w0 / 2, ground - t.y0],
    [x - w1 / 2, ground - t.y1],
    [x + w1 / 2, ground - t.y1],
    [x + t.w0 / 2, ground - t.y0],
  ];
  return `M${pts.map(([a, b]) => `${r(a)} ${r(b)}`).join(" L")} Z`;
}

function BuildingShape({ b, cx, ground, tone }: { b: Building; cx: number; ground: number; tone: (typeof TONES)["light"] }) {
  const parts: string[] = b.tiers.map((t) => tierPath(t, cx, ground));
  if (b.roof) {
    const { y0, y1, w } = b.roof;
    parts.push(`M${r(cx - w / 2)} ${r(ground - y0)} L${r(cx)} ${r(ground - y1)} L${r(cx + w / 2)} ${r(ground - y0)} Z`);
  }
  if (b.spire) {
    const { y0, y1, w } = b.spire;
    parts.push(`M${r(cx - w / 2)} ${r(ground - y0)} L${r(cx)} ${r(ground - y1)} L${r(cx + w / 2)} ${r(ground - y0)} Z`);
  }
  const top = b.tiers[0];
  return (
    <g data-building={b.id}>
      {parts.map((d, i) => (
        <g key={i}>
          <path d={d} fill={tone.base} stroke="none" />
          <path d={d} data-part="body" fill={tone.wash} fillOpacity={tone.washOpacity} stroke={tone.stroke} strokeOpacity={tone.strokeOpacity} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>
      ))}
      {b.corncob &&
        // Balcony scallops: short arcs across the cylinder, every ~10 m of the upper (residential) part.
        Array.from({ length: Math.floor((top.y1 - b.tiers[0].y0) / 10) - 1 }, (_, i) => {
          const y = ground - b.tiers[0].y0 - 10 * (i + 1);
          const w = (top.w1 ?? top.w0) / 2;
          return (
            <path
              key={i}
              d={`M${r(cx - w)} ${r(y)} Q${r(cx)} ${r(y + 4)} ${r(cx + w)} ${r(y)}`}
              fill="none"
              stroke={tone.stroke}
              strokeOpacity={tone.strokeOpacity * 0.6}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      {b.masts?.map((m, i) => (
        <line
          key={i}
          data-part="mast"
          x1={r(cx + m.dx)}
          x2={r(cx + m.dx)}
          y1={r(ground - m.y0)}
          y2={r(ground - m.y1)}
          stroke={tone.stroke}
          strokeOpacity={tone.strokeOpacity}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

/**
 * The skyline. `tone` picks brass on cream (light) or light brass on the forest footer
 * (dark). The SVG fills its container's width at the drawing's own aspect ratio.
 */
export default function Skyline({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const layout = skylineLayout();
  const t = TONES[tone];
  const halfWidths = layout.map((b) => Math.max(...b.tiers.map((x) => Math.max(x.w0, x.w1 ?? x.w0) / 2 + Math.abs(x.dx ?? 0))));
  const minX = Math.min(...layout.map((b, i) => b.x - halfWidths[i]));
  const maxX = Math.max(...layout.map((b, i) => b.x + halfWidths[i]));
  const tallest = Math.max(...layout.map((b) => Math.max(b.height.tip_m ?? 0, b.height.architectural_m)));
  const margin = 60;
  const ground = tallest + 20;
  const width = maxX - minX + 2 * margin;
  const height = ground + 14;
  const ox = margin - minX; // shift so the leftmost building starts at the margin
  return (
    <svg
      viewBox={`0 0 ${r(width)} ${r(height)}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
      data-skyline=""
      data-ground={r(ground)}
      className={`block h-auto w-full print:hidden ${className}`}
    >
      {layout.map((b) => (
        <BuildingShape key={b.id} b={b} cx={b.x + ox} ground={ground} tone={t} />
      ))}
      {/* Waterline. */}
      <line x1={0} x2={r(width)} y1={r(ground)} y2={r(ground)} stroke={t.stroke} strokeOpacity={t.strokeOpacity} strokeWidth={1} vectorEffect="non-scaling-stroke" data-part="waterline" />
      <line x1={r(width * 0.08)} x2={r(width * 0.92)} y1={r(ground + 8)} y2={r(ground + 8)} stroke={t.stroke} strokeOpacity={t.strokeOpacity * 0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

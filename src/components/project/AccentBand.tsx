import type { ReactNode } from "react";

/**
 * The soft tint of each project's accent, for the band behind its "What I Built" block.
 * Each is the colour its card uses on the home page, or, where that colour is the page's
 * own or too dark to set text on, a light tint of the same hue:
 * - Caterpillar: brass-pale, its card's frame colour.
 * - Arm: mist, its card's frame colour.
 * - Microsoft × Activision: rust-pale, its card's frame colour.
 * - Nike: its card's frame is cream, the page colour, so a light tint of the chart's
 *   charcoal ink (hue 45°).
 * - FP&A Intelligence Engine: its card's frame is white, so a light tint of the forest its
 *   chart is drawn in (hue 146°).
 * - monday.com: its card is forest, too dark for a band, so the same light forest tint.
 * Text set on these (charcoal, charcoal-soft, brass-ink, forest) passes WCAG AA.
 */
export const ACCENT_TINT: Record<string, string> = {
  "caterpillar-demand-quality": "#ecdfc2",
  arm: "#e6ebea",
  "microsoft-activision": "#f1ded8",
  nike: "#e3dfd3",
  "fpa-intelligence-engine": "#e0ebe4",
  "monday-operating-plan": "#e0ebe4",
};

/**
 * A full-width band in a project's accent tint. It bleeds to the viewport edges with a
 * spread box-shadow clipped to its own height, so it never widens the page (no horizontal
 * scroll). Print drops the tint.
 */
export function AccentBand({ slug, className = "", children }: { slug: string; className?: string; children: ReactNode }) {
  const c = ACCENT_TINT[slug];
  if (!c) return <div className={className}>{children}</div>;
  return (
    <div
      data-accent-band={slug}
      className={`py-10 [clip-path:inset(0_-100vmax)] sm:py-12 print:!bg-transparent print:!py-0 print:!shadow-none ${className}`}
      style={{ backgroundColor: c, boxShadow: `0 0 0 100vmax ${c}` }}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * A subtle full-width band behind a project page's header (back link and hero), tinted
 * with the accent of that project's card thumbnail at 7% over cream. The colours are the
 * accent tokens (brass, forest, rust, charcoal) mixed 7:93 with cream, as solid values.
 *
 * The band bleeds to the viewport edges with a spread box-shadow clipped to the band's own
 * height, so it never widens the page (no horizontal scroll). It pulls up over the page's
 * top padding and gives the same padding back, so nothing moves. Print drops the tint.
 */
const TINTS = {
  brass: "#eee8da", // Caterpillar: #96703e at 7% over #f5f1e6
  forest: "#e6e4d9", // Arm: #1e3a2b at 7%
  rust: "#efe5d9", // Microsoft × Activision: #a1462f at 7%
  charcoal: "#e7e3d8", // Nike: #2a2820 at 7%
} as const;

export type HeaderTint = keyof typeof TINTS;

export function ProjectHeaderBand({ tint, children }: { tint: HeaderTint; children: ReactNode }) {
  const c = TINTS[tint];
  return (
    <div
      data-header-tint={tint}
      className="-mt-16 pb-12 pt-16 [clip-path:inset(0_-100vmax)] sm:-mt-24 sm:pb-16 sm:pt-24 print:!bg-transparent print:!shadow-none"
      style={{ backgroundColor: c, boxShadow: `0 0 0 100vmax ${c}` }}
    >
      {children}
    </div>
  );
}

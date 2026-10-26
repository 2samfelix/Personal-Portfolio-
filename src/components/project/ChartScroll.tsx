import type { CSSProperties, ReactNode } from "react";

/**
 * Keeps a chart's text legible on phones: below md the chart is drawn at no less
 * than minWidth (its authored width, so text renders at its designed size) inside
 * a horizontally scrollable box with a swipe hint. From md up it fills its column
 * exactly as before.
 */
export function ChartScroll({ minWidth, children }: { minWidth: number; children: ReactNode }) {
  return (
    <>
      <div className="max-md:overflow-x-auto">
        <div className="max-md:min-w-[var(--chart-min-w)]" style={{ "--chart-min-w": `${minWidth}px` } as CSSProperties}>
          {children}
        </div>
      </div>
      <p className="mt-1.5 text-right text-xs italic text-charcoal-soft md:hidden" aria-hidden="true">
        Swipe to view chart &rarr;
      </p>
    </>
  );
}

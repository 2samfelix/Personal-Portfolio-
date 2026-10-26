/**
 * A waterfall bridge on phones (below md): one row per step with its label and
 * value, coloured like the desktop waterfall (start/end charcoal, adds forest,
 * reductions rust). Each change gets a small bar scaled to the largest change;
 * the start and end rows are set apart instead. Fed the same steps and value
 * labels as the desktop chart, so the two never disagree.
 */
export type BridgeListStep = {
  label: string;
  sublabel?: string;
  /** The value as the desktop chart labels it, e.g. "+50 bps" or "$72.36B". */
  valueLabel: string;
  /** Size of the change, in any unit; ignored for anchors. */
  magnitude: number;
  kind: "anchor" | "add" | "subtract";
};

const TEXT = { anchor: "text-charcoal", add: "text-forest", subtract: "text-rust" } as const;
const BAR = { anchor: "bg-charcoal", add: "bg-forest", subtract: "bg-rust" } as const;

export function BridgeList({ steps, ariaLabel }: { steps: BridgeListStep[]; ariaLabel: string }) {
  const largest = Math.max(...steps.filter((s) => s.kind !== "anchor").map((s) => Math.abs(s.magnitude)), 0) || 1;
  return (
    <ol aria-label={ariaLabel} className="md:hidden">
      {steps.map((step, i) => {
        const anchor = step.kind === "anchor";
        return (
          <li
            key={step.label}
            className={`py-2.5 ${anchor ? `border-forest/20 ${i === 0 ? "border-b" : "border-t"}` : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={anchor ? "font-semibold text-charcoal" : "text-charcoal"}>
                {step.label}
                {step.sublabel && <span className="block text-xs font-normal text-charcoal-soft">{step.sublabel}</span>}
              </span>
              <span className={`shrink-0 font-bold tabular-nums ${TEXT[step.kind]}`}>{step.valueLabel}</span>
            </div>
            {!anchor && (
              <div className="mt-1 h-2" aria-hidden="true">
                <div className={`h-full rounded-sm ${BAR[step.kind]}`} style={{ width: `${(Math.abs(step.magnitude) / largest) * 100}%` }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

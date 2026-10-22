"use client";

import { useEffect, useRef, useState } from "react";

// Every value and label is copied from text already on the site:
// Caterpillar figures from CaterpillarProjectPage's hero metrics; the $3.64B
// label from the home-page hero badge ("$3.64B Synergy Breakeven Modeled").
// Eyebrows are the project titles from src/lib/projects.ts.
// keepTogether: a phrase in the label that must not break across lines.
// sentenceCase: shown in sentence case with CSS only; the text stays as copied.
const FIGURES: {
  project: string;
  value: string;
  label: string;
  keepTogether?: string;
  sentenceCase?: boolean;
}[] = [
  {
    project: "Caterpillar, Inc.",
    value: "$1.5B → $400M",
    label: "Construction Industries dealer-inventory build, Q1 → Q2 2026",
    keepTogether: "Q1 → Q2 2026",
  },
  {
    project: "Caterpillar, Inc.",
    value: "7% → 22%",
    label: "Retail sales growth to end users",
  },
  {
    project: "Microsoft × Activision Blizzard",
    value: "$3.64B",
    label: "Synergy Breakeven Modeled",
    sentenceCase: true,
  },
];

const COUNT_MS = 1000;
const NUMBER = /\d+(?:\.\d+)?/g;

/** The value with every number scaled by t (0..1), keeping each number's decimal places. */
function partway(value: string, t: number) {
  if (t >= 1) return value;
  return value.replace(NUMBER, (n) => {
    const decimals = n.split(".")[1]?.length ?? 0;
    return (Number(n) * t).toFixed(decimals);
  });
}

/** Renders the arrow in brass; everything else inherits the strip's cream. */
function withBrassArrow(text: string) {
  const parts = text.split("→");
  return parts.flatMap((part, i) =>
    i === 0 ? [part] : [<span key={i} className="text-brass-light">→</span>, part],
  );
}

/** The label, with its keepTogether phrase on one line. */
function labelText(label: string, keepTogether?: string) {
  if (!keepTogether || !label.includes(keepTogether)) return label;
  const [before, after] = label.split(keepTogether);
  return (
    <>
      {before}
      <span className="whitespace-nowrap">{keepTogether}</span>
      {after}
    </>
  );
}

/**
 * Full-width forest band directly below the hero. The server renders the final
 * figures, so without JavaScript (or if anything fails) the exact values show.
 * When the band first scrolls into view, the numbers count up from zero once,
 * over about a second with an ease-out. A hidden copy of the final text sizes
 * each figure, so the count-up never changes the layout; screen readers only
 * get the final text. With prefers-reduced-motion the figures never animate.
 */
export default function ProofStrip() {
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / COUNT_MS);
          setT(1 - Math.pow(1 - p, 3)); // ease-out cubic; reaches exactly 1
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        setT(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={ref} id="proof" aria-label="Key figures" className="bg-forest text-cream">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-14 sm:py-20 lg:grid-cols-3 lg:gap-8">
        {FIGURES.map((figure) => (
          <div key={figure.value} className="@container flex min-w-0 flex-col">
            <span className="h-px w-10 bg-brass" aria-hidden="true" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-brass-light">
              {figure.project}
            </p>
            {/* Sized from the column, not the viewport: 12.5% of the column width keeps
                the widest figure at about 87% of its column. If a wider font still
                would not fit, the figure wraps at a space instead of overlapping. */}
            <p className="relative mt-3 text-[clamp(2rem,12.5cqi,4.5rem)] font-black leading-none tracking-tight tabular-nums">
              <span className="invisible" aria-hidden="true">
                {figure.value}
              </span>
              <span className="absolute inset-0" aria-hidden="true">
                {withBrassArrow(partway(figure.value, t))}
              </span>
              <span className="sr-only">{figure.value}</span>
            </p>
            <p
              className={`mt-4 max-w-xs text-sm leading-6 text-cream/75 ${
                figure.sentenceCase ? "lowercase first-letter:uppercase" : ""
              }`}
            >
              {labelText(figure.label, figure.keepTogether)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

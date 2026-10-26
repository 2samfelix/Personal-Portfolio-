"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Class the proof strip's inline script puts on <html> (globals.css). */
const COUNTUP_PENDING = "countup-pending";

const COUNT_MS = 1000;
// If the observer has not reported at all by then, show the final figure.
const SAFETY_MS = 3000;

/** A number scaled by t (0..1), keeping its decimal places. */
function partway(n: string, t: number) {
  if (t >= 1) return n;
  const decimals = n.split(".")[1]?.length ?? 0;
  return (Number(n) * t).toFixed(decimals);
}

/**
 * The figure at t (1 = final). Connectors ("→", "vs.") are brass; "vs." is set
 * smaller. Each number sits in a slot sized by its final digits and counts up
 * left-aligned inside it, so the text around it never moves while it counts.
 */
function figureText(value: string, t: number) {
  return value.split(/(→|vs\.|\d+(?:\.\d+)?)/).map((part, i) =>
    part === "→" ? (
      <span key={i} className="text-brass-light">
        →
      </span>
    ) : part === "vs." ? (
      <span key={i} className="text-[0.5em] font-bold tracking-normal text-brass-light">
        vs.
      </span>
    ) : /^\d/.test(part) && t < 1 ? (
      <span key={i} className="relative inline-block">
        <span className="invisible">{part}</span>
        <span className="absolute left-0 top-0">{partway(part, t)}</span>
      </span>
    ) : (
      part
    ),
  );
}

const LAYER = "absolute inset-x-0 bottom-0 block whitespace-nowrap";

/**
 * The visible figure: a live layer that counts up from zero once, over about a
 * second with an ease-out, when the figure scrolls into view, and a static
 * zero layer shown until then (only while <html> has .countup-pending). Both
 * sit over a hidden copy of the final text that sizes the figure, so nothing
 * moves.
 */
export default function ProofStripCountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [t, setT] = useState(1);
  const [started, setStarted] = useState(false);

  // Before paint: also covers client-side navigation, where the inline script
  // does not run.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const figure = ref.current?.parentElement;
    if (!figure || root.dataset.countup === "off") return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove(COUNTUP_PENDING);
      return;
    }
    root.classList.add(COUNTUP_PENDING);
    root.dataset.countup = "armed";

    let frame = 0;
    let reported = false;
    const observer = new IntersectionObserver(
      (entries) => {
        reported = true;
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / COUNT_MS);
          setT(1 - Math.pow(1 - p, 3)); // ease-out cubic; reaches exactly 1
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        setT(0);
        setStarted(true);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(figure);
    const finish = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      setT(1);
      setStarted(true);
    };
    const safety = window.setTimeout(() => {
      if (!reported) finish();
    }, SAFETY_MS);
    window.addEventListener("beforeprint", finish);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(safety);
      window.removeEventListener("beforeprint", finish);
    };
  }, []);

  // Swap the zero layer for the live one in the same frame the count starts.
  useLayoutEffect(() => {
    if (started) ref.current?.parentElement?.setAttribute("data-count-started", "");
  }, [started]);

  return (
    <>
      <span className="invisible block whitespace-nowrap" aria-hidden="true">
        {figureText(value, 1)}
      </span>
      <span ref={ref} className={`proof-live ${LAYER}`} aria-hidden="true">
        {figureText(value, t)}
      </span>
      <span className={`proof-zero ${LAYER}`} aria-hidden="true">
        {figureText(value, 0)}
      </span>
    </>
  );
}

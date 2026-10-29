"use client";

import { useEffect, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days left until the results release, computed in the viewer's browser so the
 * static page never shows a stale count. Before it runs, and on or after the
 * release, only the static date shows. The line's height is always reserved, so
 * nothing shifts when the count appears.
 */
export default function ResultsCountdown({ at, className = "" }: { at: string; className?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const left = Date.parse(at) - Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the count depends on the viewer's clock, known only after mount
    if (left > 0) setText(`${Math.ceil(left / DAY_MS)} ${Math.ceil(left / DAY_MS) === 1 ? "day" : "days"} to go. No result is claimed here.`);
  }, [at]);
  return (
    <p className={`min-h-6 ${className}`} aria-live="polite">
      {text}
    </p>
  );
}

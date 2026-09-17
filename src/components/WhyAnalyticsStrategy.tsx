"use client";

import { useEffect, useRef, useState } from "react";

const boxes = [
  {
    before:
      "Working inside a real operating business taught me what analysis is actually for. At Marketstaff, I help manage payroll, cash flow, and reporting across a portfolio of client businesses — watching costs move, performance shift, and problems surface in the numbers before anyone says a word about them out loud. Financial visibility isn't a slide in a deck; it's the difference between catching a discrepancy while it's still small and explaining it after it's already a problem. ",
    punchline:
      "The value of analysis was never the spreadsheet — it was seeing the problem before it became obvious.",
  },
  {
    before:
      "That instinct to see clearly is what pulled me toward building things myself instead of only studying them. I built three independent financial models end-to-end — a three-statement forecast, an IPO valuation, and an M&A analysis — each grounded in real public filings. Along the way I picked up SQL to work with data directly, started building dashboards to make numbers easier to act on, and used AI as a research and development partner to move faster through unfamiliar territory and catch my own mistakes. ",
    punchline:
      "I learn best by building the solution to a problem I don't yet know how to solve.",
  },
  {
    before:
      "That combination — finance, data, AI, and a genuine interest in how businesses make decisions — is where I want to build a career. I'm drawn to roles where I can take a complicated, ambiguous problem, work through the data underneath it, build the model or tool that makes it tractable, and explain what I found clearly enough for someone to act on it. Whether that's inside a finance team, a strategy group, or an analytics function, the work looks the same to me: ",
    punchline:
      "the work I enjoy most sits where financial reasoning, data, and business decisions meet.",
  },
];

export default function WhyAnalyticsStrategy() {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(boxes.length - 1, i));
    setIndex(clamped);
    const track = trackRef.current;
    const child = track?.children[clamped] as HTMLElement | undefined;
    if (child) {
      isProgrammatic.current = true;
      child.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => {
        isProgrammatic.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      if (isProgrammatic.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let closestDist = Infinity;
        Array.from(track.children).forEach((child, i) => {
          const el = child as HTMLElement;
          const elCenter = el.offsetLeft + el.offsetWidth / 2;
          const dist = Math.abs(elCenter - center);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setIndex(closest);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="why" className="border-t border-forest/10 bg-dot-grid">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-40">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.35fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
              Why Analytics &amp; Strategy?
            </h2>
            <p className="mt-4 text-lg leading-8 text-charcoal-soft">
              I&apos;ve seen what happens when a business understands its own
              data — and when it doesn&apos;t.
            </p>
          </div>

          <div>
            <div className="relative">
              <div
                ref={trackRef}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[5%] sm:px-[10%] lg:px-[11%] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {boxes.map((box, i) => (
                  <div
                    key={i}
                    className="flex min-h-[260px] w-[90%] shrink-0 snap-center flex-col justify-center rounded-2xl border border-forest/15 bg-white p-6 sm:w-[80%] sm:p-8 lg:w-[78%]"
                  >
                    <p className="text-sm leading-7 text-charcoal-soft">
                      {box.before}
                      <span className="font-semibold text-brass">
                        {box.punchline}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                aria-label="Previous"
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-forest/25 bg-cream text-charcoal shadow-sm transition-opacity hover:bg-forest/10 disabled:pointer-events-none disabled:opacity-30"
              >
                &larr;
              </button>
              <button
                onClick={() => goTo(index + 1)}
                disabled={index === boxes.length - 1}
                aria-label="Next"
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-forest/25 bg-cream text-charcoal shadow-sm transition-opacity hover:bg-forest/10 disabled:pointer-events-none disabled:opacity-30"
              >
                &rarr;
              </button>
            </div>

            <div className="mt-6 flex justify-center gap-2">
              {boxes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to card ${i + 1}`}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === index ? "bg-brass" : "bg-forest/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type WhyCard = {
  label: string;
  body: string;
};

const CARDS: WhyCard[] = [
  {
    label: "01 — My Experience",
    body: "At Marketstaff, I work inside a real operating business — tracking cash flow, supporting reporting, and working across payroll and financial operations for a portfolio of client companies. That hands-on exposure carried into forecasting, scenario analysis, and valuation work of my own: a three-statement model, an IPO valuation, and an M&A analysis, each built from real public filings. Along the way, numbers stopped being an abstraction and became the clearest way to see what was actually happening in a business.",
  },
  {
    label: "02 — Why This Work",
    body: "What draws me to analytics and strategy is turning raw financial and operating data into something decision-useful — not just reporting what happened, but testing what could happen next. I like figuring out what actually drives a business, pressure-testing assumptions with scenarios and sensitivities, and using AI to accelerate research, analysis, and iteration while keeping the underlying financial judgment and validation my own.",
  },
  {
    label: "03 — Where I'm Going",
    body: "That's the kind of work I want to keep doing — using financial and operating data, modern analytical tools, and sound financial judgment to understand what matters and help make better business decisions.",
  },
];

export default function WhyAnalyticsStrategy() {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(CARDS.length - 1, i));
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
      <div className="mx-auto w-full max-w-6xl px-6 pt-6 pb-12 sm:pt-8 sm:pb-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-10">
          <div className="max-w-md">
            <h2 className="text-3xl font-black tracking-tight text-charcoal sm:text-4xl">
              Why Analytics &amp; Strategy?
            </h2>
            <p className="mt-3 text-base leading-7 text-charcoal-soft">
              I&apos;ve seen what happens when a business understands its own
              data — and when it doesn&apos;t.
            </p>
          </div>

          <div>
            <div className="relative mx-auto w-full lg:max-w-[520px]">
              <div
                ref={trackRef}
                className="flex items-start snap-x snap-mandatory overflow-x-auto scroll-smooth sm:items-stretch sm:gap-3 sm:px-[4%] sm:scroll-pl-[4%] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {CARDS.map((card) => (
                  <div
                    key={card.label}
                    className="flex w-full shrink-0 snap-center flex-col justify-start rounded-2xl border border-forest/15 bg-white p-5 sm:min-h-[240px] sm:w-[85%] sm:p-7"
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest text-brass">{card.label}</p>
                    <p className="mt-3 text-sm leading-6 text-charcoal-soft">{card.body}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                aria-label="Previous"
                className="absolute -left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-forest/25 bg-cream text-charcoal shadow-sm transition-opacity hover:bg-forest/10 disabled:pointer-events-none disabled:opacity-30"
              >
                &larr;
              </button>
              <button
                onClick={() => goTo(index + 1)}
                disabled={index === CARDS.length - 1}
                aria-label="Next"
                className="absolute -right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-forest/25 bg-cream text-charcoal shadow-sm transition-opacity hover:bg-forest/10 disabled:pointer-events-none disabled:opacity-30"
              >
                &rarr;
              </button>
            </div>

            <div className="mt-4 flex justify-center gap-2 lg:justify-start lg:pl-1">
              {CARDS.map((card, i) => (
                <button
                  key={card.label}
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

import { Fragment, type CSSProperties } from "react";
import { siteConfig } from "@/lib/site-config";

const badges = [
  "SEC-Sourced Financials",
  "$3.64B Synergy Breakeven Modeled",
  "Monte Carlo & Scenario Analysis",
];

const HEADLINE_LEAD = "Good financial models don't end in a number.";
const HEADLINE_BRASS = "They end in a decision.";

/**
 * The headline as one span per word, so it can reveal word by word on load
 * (globals.css, .hero-word). The stagger index continues across both parts,
 * so the brass sentence lands last. The text and its wrapping are unchanged.
 */
function words(text: string, offset = 0) {
  return text.split(" ").map((word, i) => (
    <Fragment key={word + i}>
      {i > 0 && " "}
      <span className="hero-word" style={{ "--i": offset + i } as CSSProperties}>
        {word}
      </span>
    </Fragment>
  ));
}

export default function Hero() {
  return (
    <section id="home" className="bg-cream text-charcoal">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-4 pt-10 sm:pb-6 sm:pt-14 lg:grid-cols-[1.3fr_0.85fr] lg:items-stretch">
        <div className="flex flex-col justify-center gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal-soft">
            Sam Felix &mdash; Financial Analyst
          </span>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.05]">
            {words(HEADLINE_LEAD)}{" "}
            <span className="text-brass">{words(HEADLINE_BRASS, HEADLINE_LEAD.split(" ").length)}</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-charcoal-soft">
            I build financial models from real company filings, then push
            them further into interactive tools that test scenarios,
            trade-offs, and risk. From forecasting and valuation to capital
            allocation and M&amp;A, the goal is the same: structure the
            decision and find the number that matters.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1 sm:gap-2">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-1.5 rounded-full border border-forest/20 bg-white px-2.5 py-1 sm:rounded-xl sm:px-3 sm:py-1.5"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-brass" />
                <span className="text-[9px] font-semibold uppercase tracking-normal text-charcoal sm:text-[11px] sm:tracking-wide">
                  {badge}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="#work"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
            >
              Explore the Work &rarr;
            </a>
            <a
              href={siteConfig.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
            >
              Download Resume
            </a>
          </div>
        </div>

        <div className="min-h-[300px] w-full overflow-hidden rounded-3xl border border-forest/15 lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/headshot.png"
            alt="Sam Felix"
            className="hero-photo h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

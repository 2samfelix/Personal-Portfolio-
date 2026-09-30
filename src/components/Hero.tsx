import { siteConfig } from "@/lib/site-config";

const badges = [
  "SEC-Sourced Financials",
  "$3.64B Synergy Breakeven Modeled",
  "Monte Carlo & Scenario Analysis",
];

export default function Hero() {
  return (
    <section id="home" className="bg-cream text-charcoal">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 pb-16 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
        <div className="flex flex-col justify-center gap-6">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal-soft">
            Sam Felix &mdash; Financial Analyst
          </span>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl sm:leading-[0.95]">
            Good financial models don&apos;t end in a number.{" "}
            <span className="text-brass">They end in a decision.</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-charcoal-soft">
            I build financial models from real company filings, then push
            them further into interactive tools that test scenarios,
            trade-offs, and risk. From forecasting and valuation to capital
            allocation and M&amp;A, the goal is the same: structure the
            decision and find the number that matters.
          </p>

          <div className="flex flex-wrap gap-2 pt-2 sm:gap-3">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-1.5 rounded-full border border-forest/20 bg-white px-3 py-1.5 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2"
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-brass sm:h-1.5 sm:w-1.5" />
                <span className="text-[10px] font-semibold uppercase tracking-normal text-charcoal sm:text-xs sm:tracking-wide">
                  {badge}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
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

        <div className="min-h-[420px] w-full overflow-hidden rounded-3xl border border-forest/15 lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/headshot.png"
            alt="Sam Felix"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

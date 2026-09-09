import { siteConfig } from "@/lib/site-config";

const badges = ["3 Financial Models Built", "SEC-Sourced Data", "11-Tab Linked Model"];

export default function Hero() {
  return (
    <section id="home" className="bg-cream text-charcoal">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 pb-16 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
        <div className="flex flex-col justify-center gap-6">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal-soft">
            Sam Felix &mdash; Financial Analyst
          </span>
          <h1 className="text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            I build financial models{" "}
            <span className="text-brass">to answer real business questions.</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-charcoal-soft">
            I&apos;m a business analyst and junior accountant with
            hands-on experience in payroll, reconciliations, and financial
            reporting — and I build independent financial models outside
            of work to practice the modeling and analysis skills FP&amp;A
            and financial analyst roles run on.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {badges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 rounded-xl border border-forest/20 bg-white px-4 py-2"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                <span className="text-xs font-semibold uppercase tracking-wide text-charcoal">
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
              Explore My Work &rarr;
            </a>
            <a
              href={siteConfig.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
            >
              Download Resume
            </a>
            <a
              href={siteConfig.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <div className="flex min-h-[420px] w-full items-center justify-center rounded-3xl border-2 border-dashed border-forest/25 bg-white/50 p-8 text-center text-sm text-charcoal-soft lg:min-h-0">
          Add a headshot here — drop an image in{" "}
          <code className="mx-1 rounded bg-forest/10 px-1.5 py-0.5 text-xs text-forest">
            public/headshot.jpg
          </code>{" "}
          and swap it in.
        </div>
      </div>
    </section>
  );
}

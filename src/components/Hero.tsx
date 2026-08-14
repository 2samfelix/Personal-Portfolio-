import { siteConfig } from "@/lib/site-config";

const stats = [
  { value: "18 Clients", label: "Payroll & benefits managed monthly" },
  { value: "150+ Employees", label: "HRIS & org data maintained" },
  { value: "3 Models", label: "Independent financial models built" },
  { value: "Marketstaff", label: "Business Analyst & Jr. Accountant" },
];

export default function Hero() {
  return (
    <section id="home" className="bg-cream text-charcoal">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-forest/25 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" />
              Finance &middot; Modeling &middot; Analysis
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
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

          <div className="flex aspect-[4/5] w-full max-w-sm items-center justify-center justify-self-center rounded-3xl border-2 border-dashed border-forest/25 bg-white/50 p-8 text-center text-sm text-charcoal-soft lg:justify-self-end">
            Add a headshot here — drop an image in{" "}
            <code className="mx-1 rounded bg-forest/10 px-1.5 py-0.5 text-xs text-forest">
              public/headshot.jpg
            </code>{" "}
            and swap it in.
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-forest/15 pt-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.value}>
              <p className="text-lg font-bold text-charcoal">{stat.value}</p>
              <p className="mt-1 text-sm text-charcoal-soft">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

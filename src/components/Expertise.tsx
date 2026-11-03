import Link from "next/link";

// "Core Expertise": one chip per skill, each linking to the project section that
// shows it. Plain links rendered on the server: no JavaScript, keyboard order is
// reading order, and every chip is at least 44px tall.
const SKILLS: { name: string; project: string; href: string }[] = [
  { name: "DCF valuation", project: "Arm Holdings", href: "/projects/arm#inside-the-valuation" },
  { name: "M&A accretion / dilution", project: "Microsoft × Activision", href: "/projects/microsoft-activision#inside-the-deal-model" },
  { name: "Three-statement modeling", project: "Nike", href: "/projects/nike#inside-the-model" },
  { name: "Scenario analysis", project: "monday.com plan", href: "/projects/monday-operating-plan#scenarios" },
  { name: "Demand and inventory analysis", project: "Caterpillar", href: "/projects/caterpillar-demand-quality#model-preview" },
  { name: "Forecasting and scoring", project: "monday.com plan", href: "/projects/monday-operating-plan#q3-test" },
  { name: "Excel", project: "monday.com plan workbook", href: "/projects/monday-operating-plan#inside-the-model" },
  { name: "Python", project: "FP&A Intelligence Engine", href: "/projects/fpa-intelligence-engine#trace-a-statement" },
  { name: "AI validation", project: "FP&A Intelligence Engine", href: "/projects/fpa-intelligence-engine#validation-lab" },
];

export default function Expertise() {
  return (
    <section id="expertise" className="border-t border-forest/10 bg-mist">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        {/* A darker brass than the site's: brass on mist is 3.72:1; this is 4.70:1 (AA). */}
        <p className="text-sm font-semibold uppercase tracking-widest text-[#826136]">Core Expertise</p>
        <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">Skills, with the proof.</h2>
        {/* Ruled rows in up to three columns; each row is one link. */}
        <ul className="mt-12 grid grid-cols-1 border-b border-forest/20 sm:mt-16 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3" aria-label="Skills, each linked to the project that shows it">
          {SKILLS.map((s) => (
            <li key={s.name} className="border-t border-forest/20">
              <Link
                href={s.href}
                className="group flex min-h-11 items-center justify-between gap-4 rounded-sm py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-mist"
              >
                <span className="min-w-0">
                  <span className="block text-lg font-semibold leading-7 text-charcoal underline-offset-4 group-hover:underline">{s.name}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-charcoal-soft">{s.project}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-lg text-forest transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

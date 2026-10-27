import Link from "next/link";

// Each step is proved by one figure from a project page, checked against the
// project's workbook:
// - Caterpillar: Analysis!H15:I15 (Dealer Inventory!G10:G11), the Construction
//   Industries dealer-inventory increase disclosed for Q1 2026 ($1.5B) and
//   Q2 2026 ($400M). Scoped to Construction Industries because the
//   company-wide Q1 2026 build was $2.0B.
// - Microsoft × Activision: Synergy Breakeven!B10, required annual pre-tax
//   synergies that solve to EPS-neutral ($3,636.67M).
// - Arm: DCF Valuation!B48 (DCF-implied share price, $51.54) and B49 (market
//   price on Aug 10, 2026, $272.21).
const STEPS = [
  {
    number: "01",
    title: "Source the evidence",
    body: "Start from company filings, earnings materials and disclosed operating data.",
    project: "Caterpillar",
    proof: "disclosed Construction Industries dealer-inventory build, ",
    figure: "$1.5B → $400M",
    href: "/projects/caterpillar-demand-quality#model-preview",
  },
  {
    number: "02",
    title: "Build the model",
    body: "Forecasts, valuation and scenarios built in working Excel formulas.",
    project: "Microsoft × Activision",
    proof: "",
    figure: "$3.64B",
    after: " of annual pre-tax synergies needed for EPS-neutral",
    href: "/projects/microsoft-activision#inside-the-deal-model",
  },
  {
    number: "03",
    title: "Make the decision clear",
    body: "Turn the outputs into a view on value, risk and trade-offs.",
    project: "Arm",
    proof: "DCF-implied ",
    figure: "$51.54 vs. $272.21",
    after: " market price (Aug. 10, 2026)",
    href: "/projects/arm#inside-the-valuation",
  },
];

// Links on forest: cream text with a brass underline that firms up on hover
// and focus. Motion is limited to the underline offset, and off with reduced
// motion. Padding keeps each link at least 44px tall.
const LINK =
  "rounded-sm py-2.5 leading-6 underline decoration-brass-light/70 decoration-1 underline-offset-4 transition-[text-decoration-color,text-underline-offset,color] duration-200 ease-out hover:text-cream hover:decoration-brass-light hover:underline-offset-[6px] focus-visible:text-cream focus-visible:decoration-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:ring-offset-2 focus-visible:ring-offset-forest motion-reduce:transition-none motion-reduce:hover:underline-offset-4";

/**
 * "How I work": a forest editorial band above the project grid. Three steps of
 * the process, each proved by one link to a real project. Static markup, so it
 * reads the same without JavaScript, with reduced motion and in print
 * (globals.css prints it dark on white).
 */
export default function HowIWork() {
  return (
    <section id="how-i-work" aria-labelledby="how-i-work-heading" className="bg-forest text-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass-light">How I work</p>
        <h2 id="how-i-work-heading" className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
          From a messy question to a decision someone can use.
        </h2>

        <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step) => (
            <li key={step.number} data-step className="flex flex-col border-t border-cream/20 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-cream/90">
                <span className="text-sm tabular-nums text-brass-light">{step.number}</span>
                <span className="text-brass-light"> — </span>
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-cream/80">{step.body}</p>
              <p className="mt-auto pt-3 text-sm">
                <Link href={step.href} className={`inline-block text-cream/90 ${LINK}`}>
                  <span className="font-semibold">{step.project}:</span> {step.proof}
                  <span className="font-semibold tabular-nums text-brass-light">{step.figure}</span>
                  {step.after}
                </Link>
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-8 border-t border-cream/15 pt-2 text-sm">
          <a href="#work" className={`inline-block text-cream/80 ${LINK}`}>
            The work below is where that process gets tested. <span aria-hidden="true">↓</span>
          </a>
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";

// Each step links to the top of the project page that shows it. The figures themselves are
// on the project cards below, so they are not repeated here.
const STEPS = [
  {
    number: "01",
    title: "Source the evidence",
    body: "Start from company filings, earnings materials and disclosed operating data.",
    project: "Caterpillar",
    proof: "reading demand from the company's own disclosures",
    href: "/projects/caterpillar-demand-quality",
  },
  {
    number: "02",
    title: "Build the model",
    body: "Forecasts, valuation and scenarios built in working Excel formulas.",
    project: "Microsoft × Activision",
    proof: "a working accretion/dilution model",
    href: "/projects/microsoft-activision",
  },
  {
    number: "03",
    title: "Make the decision clear",
    body: "Turn the outputs into a view on value, risk and trade-offs.",
    project: "Arm",
    proof: "a fundamentals-only valuation set against the market price",
    href: "/projects/arm",
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

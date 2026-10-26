import Link from "next/link";
import ProofStripCountUp from "@/components/ProofStripCountUp";

// Must match COUNTUP_PENDING in ProofStripCountUp.tsx and globals.css.
const COUNTUP_PENDING = "countup-pending";

// One figure per project, each linking to that project's model preview (the
// anchors the project heroes' "Explore the model" buttons use). Every sentence
// and figure restates what the linked page says:
// - Caterpillar hero metric "$1.5B → $400M", "Construction Industries
//   dealer-inventory build, Q1 → Q2 2026"; the finding calls it the
//   "disclosed CI dealer build".
// - Microsoft x Activision hero metric "$3.64B synergy hurdle", "Annual pre-tax
//   synergies required for EPS neutrality"; the page calls it "a
//   model-derived breakeven, not a management target", hence "my model".
// - Arm hero metric "$51.54 → $272.21", "DCF-implied fair value (2026) vs.
//   current market price"; the price chart dates $272.21 "as of August 10, 2026".
const ITEMS = [
  {
    project: "Caterpillar",
    sentence: "Disclosed dealer-inventory build in Construction Industries, Q1 to Q2 2026",
    value: "$1.5B → $400M",
    href: "/projects/caterpillar-demand-quality#model-preview",
  },
  {
    project: "Microsoft × Activision",
    sentence: "Annual pre-tax synergies my model says Microsoft needs for the Activision deal to be EPS-neutral",
    value: "$3.64B",
    href: "/projects/microsoft-activision#inside-the-deal-model",
  },
  {
    project: "Arm",
    sentence: "My DCF-implied share price against Arm's market price on Aug 10, 2026",
    value: "$51.54 vs. $272.21",
    href: "/projects/arm#inside-the-valuation",
  },
];

// Runs while the HTML is parsed, before the figures below it exist, so with
// JavaScript they first paint at their starting values (globals.css,
// .countup-pending). If the page has not hydrated within 3s, it gives up and
// the final figures show; ProofStripCountUp then leaves them alone.
const PRE_PAINT = `(function(){try{var d=document.documentElement;if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("${COUNTUP_PENDING}");setTimeout(function(){if(d.dataset.countup!=="armed"){d.dataset.countup="off";d.classList.remove("${COUNTUP_PENDING}")}},3000)}catch(e){}})();`;

/**
 * Full-width forest band directly below the hero: three figures, each a link
 * to the model behind it. Sentence first, figure second. The server renders
 * the final figures, so without JavaScript, with reduced motion and in print
 * the exact values show; with JavaScript each figure counts up once when it
 * scrolls into view (ProofStripCountUp).
 */
export default function ProofStrip() {
  return (
    <section id="proof" aria-label="Key figures" className="bg-forest text-cream">
      <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
      <ul className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-10 sm:py-16 lg:grid-cols-3 lg:gap-6">
        {ITEMS.map((item) => (
          <li key={item.href} className="flex min-w-0">
            <Link
              href={item.href}
              className="group -mx-4 flex w-[calc(100%+2rem)] min-w-0 flex-col rounded-2xl px-4 py-4 transition-colors hover:bg-forest-dark focus-visible:bg-forest-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
            >
              <div className="@container flex min-w-0 flex-1 flex-col">
                <span className="h-px w-10 bg-brass" aria-hidden="true" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-brass-light">
                  {item.project}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-cream/80 transition-colors group-hover:text-cream">
                  {item.sentence}
                </p>
                {/* Sized from the column, not the viewport, so the widest figure never
                    overflows its column at any width (see ProofStripCountUp). */}
                <p
                  data-count
                  className="relative mt-auto pt-4 text-[clamp(1.25rem,11.5cqi,4.5rem)] font-black leading-none tracking-tight tabular-nums"
                >
                  <ProofStripCountUp value={item.value} />
                  <span className="sr-only">{item.value}</span>
                </p>
                <span className="mt-4 text-sm font-semibold text-brass-light">
                  Explore the model{" "}
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
                  >
                    &rarr;
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

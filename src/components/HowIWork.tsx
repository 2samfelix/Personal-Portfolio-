import Link from "next/link";
import { PROJECT_ORDER, flagshipProjects } from "@/lib/projects";
import { loadMondayResults } from "@/lib/mondayResults";
import { loadValidationLab } from "@/lib/validationLab";

// "What the projects show": a forest band above the project grid. One linked item per
// project, in the grid's order. Figures come from the site's data, not typed here:
// - the project count: the projects list (src/lib/projects.ts);
// - monday.com: the validated Q3 results file (src/lib/mondayResults.ts), counted as the
//   project page's score strip counts it (src/components/monday/ResultsSection.tsx);
// - the validation lab's case count: public/engine/validation-lab.json (src/lib/validationLab.ts).

function mondayLine(): string {
  const r = loadMondayResults();
  const lead = "Plan locked before earnings,";
  if (r.state !== "scored") return `${lead} to be scored against the reported results.`;
  const rows = r.rows.filter((row) => row.scored);
  const inside = rows.filter((row) => row.position === "inside").length;
  const misses = rows.length - inside;
  const score = misses
    ? `then scored: ${inside} of ${rows.length} metrics in range, ${misses === 1 ? "miss" : "misses"} explained`
    : `then scored: all ${rows.length} metrics in range`;
  return `${lead} ${score}${r.fixture ? " (test fixture, not real results)" : ""}.`;
}

const LINES: Record<string, { name: string; line: () => string }> = {
  "caterpillar-demand-quality": {
    name: "Caterpillar",
    line: () => "Reads demand from the company's own disclosures, splitting a quarter's growth into volume, price, FX and other.",
  },
  "monday-operating-plan": { name: "monday.com", line: mondayLine },
  "fpa-intelligence-engine": {
    name: "FP&A Intelligence Engine",
    // The engine page's own words: "The AI writes the brief" and "Code checks … that every figure
    // matches what the statement cites". The case count is the validation lab's.
    line: () => `The AI writes the brief; code checks every figure. Tested on ${loadValidationLab().stats.cases} cases, misses shown.`,
  },
  arm: {
    name: "Arm",
    line: () => "A fundamentals-only DCF set against the market price, with IPO comps and a sensitivity range.",
  },
  "microsoft-activision": {
    name: "Microsoft × Activision",
    line: () => "A working accretion/dilution model of a real deal, built in live Excel formulas.",
  },
  // From the Nike page's own description ("three-statement model", "stress-tested across bull,
  // base, and bear scenarios") and question ("How quickly must North America recover to offset
  // continued weakness in Greater China?"), src/components/NikeProjectPage.tsx.
  nike: {
    name: "Nike",
    line: () =>
      "Three-statement model stress-tested across bull, base and bear: how quickly must North America recover to offset Greater China?",
  },
};

const ITEMS = PROJECT_ORDER.filter((slug) => flagshipProjects.some((p) => p.slug === slug)).map((slug) => {
  const copy = LINES[slug];
  if (!copy) throw new Error(`HowIWork: no line for project "${slug}"`);
  return { slug, href: `/projects/${slug}`, name: copy.name, line: copy.line() };
});

/** The count spelled out, capitalized (up to twelve); the numeral beyond that. */
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
export function countWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

/**
 * One forest band: "<Word> projects, each showing something different." and one linked item per
 * project. Static markup (no reveal or other motion), so it reads the same without
 * JavaScript, with reduced motion and in print (globals.css prints #how-i-work dark on white).
 * The id stays "how-i-work" so existing links keep working. Type: the root is 80% from 640px
 * up (globals.css), so the sm: sizes keep the lines at 14px or more (14px on phones, 14.4px
 * from 640px) and the names at 16px.
 */
export default function HowIWork() {
  const n = ITEMS.length;
  return (
    <section id="how-i-work" aria-labelledby="how-i-work-heading" className="bg-forest text-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-14">
        <h2 id="how-i-work-heading" className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
          {countWord(n)} projects, each showing something different.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-cream/85 sm:text-[1.25rem] sm:leading-[2.1875rem]">
          Each starts with a real company and public filings, so every number traces back to a source.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <li key={item.slug}>
              <Link
                href={item.href}
                className="group flex h-full flex-col rounded-md border-t border-cream/20 px-1 pb-4 pt-4 hover:border-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
              >
                <span className="text-base font-bold text-cream sm:text-[1.25rem] group-hover:underline group-hover:decoration-brass-light group-hover:underline-offset-4 group-focus-visible:underline group-focus-visible:decoration-brass-light group-focus-visible:underline-offset-4">
                  {item.name}
                </span>
                <span className="mt-1.5 text-sm leading-6 text-cream/85 sm:text-[1.125rem] sm:leading-[1.75rem]">{item.line}</span>
                <span aria-hidden="true" className="mt-auto pt-2 text-base font-semibold text-brass-light sm:text-[1.25rem]">
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

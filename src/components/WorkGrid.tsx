import Link from "next/link";
import { CARD_CTA, CARD_LIFT } from "@/components/project/cardLift";
import { flagshipProjects, type Project } from "@/lib/projects";
import { loadMondayPlan } from "@/lib/mondayPlan";

/** A run of answer text; `figure` parts are set in bold. */
type Part = string | { figure: string };

type CardCopy = {
  question: string;
  answer: Part[];
  /** At most three, taken from the project's own tools list. */
  tags: string[];
};

// Home-grid order and card copy. The order is set here, not in projects.ts,
// so the project pages' Previous/Next order is unchanged. Figures checked
// against the workbooks and project pages:
// - Caterpillar: Analysis!H15:I15, CI dealer inventory change 1,500 (Q1 2026)
//   and 400 (Q2 2026), $mm.
// - Arm: DCF Valuation!B48 (51.54, implied share price) and B49 (272.21,
//   "Current Market Price (Aug 10, 2026)").
// - Microsoft × Activision: Synergy Breakeven!B10, 3,636.67 $mm of required
//   annual pre-tax synergies ("Solves to EPS-neutral").
// - Nike: Scenario Dashboard!B42, 439.45 $mm cushion, base case, FY2028E.
// - FP&A Intelligence Engine: 735 tests passing at the engine's main; the
//   engine page states all five briefs were accepted on the first attempt.
// - monday.com: question and figure read at build time from the locked plan
//   workbook's Executive_Summary (src/lib/mondayPlan.ts), not typed here.
const MONDAY = loadMondayPlan().plan;
const CARDS: Record<string, CardCopy> = {
  "caterpillar-demand-quality": {
    question: "Was Construction Industries growth real demand, or dealer restocking?",
    answer: ["The disclosed dealer-inventory build fell from ", { figure: "$1.5B" }, " in Q1 2026 to ", { figure: "$400M" }, " in Q2."],
    tags: ["Segment Analysis", "SEC Filings", "Demand Quality"],
  },
  arm: {
    question: "Did Arm's valuation justify the premium?",
    answer: ["My fundamentals-only DCF implies ", { figure: "$51.54" }, " a share against a ", { figure: "$272.21" }, " market price (Aug. 10, 2026)."],
    tags: ["Excel", "DCF", "CCA"],
  },
  "microsoft-activision": {
    question: "How much synergy did Microsoft need to make Activision EPS-neutral?",
    answer: ["About ", { figure: "$3.64B" }, " a year, pre-tax."],
    tags: ["Excel", "M&A", "Purchase Accounting"],
  },
  nike: {
    question: "Can North America's growth cover Greater China's decline?",
    answer: ["In my base case, yes, with a ", { figure: "$439M" }, " cushion by FY2028E."],
    tags: ["FP&A", "Forecasting", "Scenario Analysis"],
  },
  "fpa-intelligence-engine": {
    question: "AI writes the brief; code does the math and decides whether it's accepted.",
    answer: [{ figure: "735" }, " tests; all five benchmark runs accepted on the first attempt."],
    tags: ["Python", "AI", "Validation"],
  },
  "monday-operating-plan": {
    question: MONDAY.question,
    answer: [
      "The FY27 Base–Downside revenue gap is ",
      { figure: MONDAY.gapX.values[0] },
      " the average 4-quarter-ahead backtest miss, so the plan acts on triggers. Q3 2026 results pending.",
    ],
    tags: ["Strategic FP&A", "Scenario analysis", "Cash / FCF"],
  },
};

const ORDER = ["caterpillar-demand-quality", "arm", "microsoft-activision", "nike", "fpa-intelligence-engine", "monday-operating-plan"];

const projects = ORDER.map((slug) => flagshipProjects.find((p) => p.slug === slug)).filter(
  (p): p is Project => !!p,
);

/** One project card, fully clickable: the image over the text. */
function ProjectCard({ project }: { project: Project }) {
  const copy = CARDS[project.slug];
  const tags = copy ? project.tools.filter((t) => copy.tags.includes(t)) : project.tools.slice(0, 3);
  return (
    <Link href={`/projects/${project.slug}`} data-reveal-item className={`group flex h-full flex-col overflow-hidden text-left ${CARD_LIFT}`}>
      <div className="flex h-48 w-full shrink-0 items-center justify-center overflow-hidden border-b border-forest/10 bg-cream">
        {project.visual && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.visual} alt={`${project.title} preview`} className="h-full w-full object-contain" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tool) => (
            <li
              key={tool}
              className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-forest"
            >
              {tool}
            </li>
          ))}
        </ul>
        <h3 className="text-xl font-bold tracking-tight text-charcoal">{project.title}</h3>
        {copy ? (
          <>
            <p className="text-sm font-medium leading-6 text-charcoal">{copy.question}</p>
            <p className="text-sm leading-6 text-charcoal-soft">
              {copy.answer.map((part, i) =>
                typeof part === "string" ? (
                  part
                ) : (
                  <strong key={i} className="font-semibold text-charcoal">
                    {part.figure}
                  </strong>
                ),
              )}
            </p>
          </>
        ) : (
          <p className="text-sm leading-6 text-charcoal-soft">{project.description ?? project.summary}</p>
        )}
        <span className={`mt-auto pt-4 ${CARD_CTA}`}>View project &rarr;</span>
      </div>
    </Link>
  );
}

export default function WorkGrid() {
  return (
    <section id="work" className="border-t border-forest/10 bg-dot-grid">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-40">
        <h2 className="text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
          Projects
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-charcoal-soft">
          A growing collection of finance, analytics, and strategy projects —
          each built around a real business question.
        </p>

        {/* Scroll-reveal hook: ScrollReveal.tsx reveals the cards one by one.
            Six cards: three columns from 1024px (3 + 3), two from 640px, one below. */}
        <div data-reveal-group className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.slug} className="min-w-0">
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

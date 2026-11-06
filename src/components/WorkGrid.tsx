import Image from "next/image";
import Link from "next/link";
import { CARD_CTA, CARD_LIFT } from "@/components/project/cardLift";
import ProjectCarousel from "@/components/ProjectCarousel";
import { PROJECT_ORDER, flagshipProjects, type Project } from "@/lib/projects";
import { loadMondayPlan } from "@/lib/mondayPlan";
import { SCORED_VISUAL, loadMondayResults } from "@/lib/mondayResults";
import thumbAlts from "@/lib/projectVisualAlts.generated.json";

// The monday card's results line follows the validated results file (src/lib/mondayResults.ts).
const MONDAY_RESULTS = loadMondayResults();
const MONDAY_STATUS =
  MONDAY_RESULTS.state === "scored"
    ? `Q3 2026 results scored against the locked call${MONDAY_RESULTS.fixture ? " (test fixture, not real results)" : ""}.`
    : "Q3 2026 results pending.";

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
// - FP&A Intelligence Engine: 739 automated test cases (pytest's count, parametrized
//   cases included) passing at the engine's main (c91e254); run 1, the run recorded on
//   this site, was accepted on the first attempt.
// - monday.com: figure read at build time from the locked plan workbook's
//   Executive_Summary (src/lib/mondayPlan.ts), not typed here. The question is a
//   shortened card version; the project page shows the workbook's full question.
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
    answer: [{ figure: "739" }, " automated test cases; the recorded run was accepted on the first attempt."],
    tags: ["Python", "AI", "Validation"],
  },
  "monday-operating-plan": {
    question: "How should management adjust spend if growth slows faster than guided?",
    answer: [
      "The FY27 Base–Downside revenue gap is ",
      { figure: MONDAY.gapX.values[0] },
      ` the average 4-quarter-ahead backtest miss, so the plan acts on triggers. ${MONDAY_STATUS}`,
    ],
    tags: ["Strategic FP&A", "Scenario analysis", "Cash / FCF"],
  },
};

const projects = PROJECT_ORDER.map((slug) => flagshipProjects.find((p) => p.slug === slug)).filter(
  (p): p is Project => !!p,
);

// The monday card's alt text states its thumbnail's figures (written with the image by
// scripts/render-monday-thumbnail.mjs) for the thumbnail the status selects.
const MONDAY_ALT =
  (MONDAY_RESULTS.state === "scored" ? thumbAlts["monday-operating-plan-scored"] : thumbAlts["monday-operating-plan"]) +
  (MONDAY_RESULTS.state === "scored" && MONDAY_RESULTS.fixture ? " Test fixture, not real results." : "");

// Card image width: a carousel card (85vw, at most 30rem) below 768px, two columns to
// 1023px, three from 1024px (the grid's container is max-w-6xl, 1152px less 48px padding
// and 64px of gaps).
const SIZES = "(min-width: 1024px) 347px, (min-width: 768px) calc((100vw - 80px) / 2), min(85vw, 480px)";

// Each thumbnail's content box in its own pixels (the chart without the render's empty
// margin), measured from the images in public/project-visuals, with 12px kept around it.
// The card shows that box, scaled to the frame's height and centred: the margin is cropped
// away, nothing is stretched, and the image files are untouched.
const CONTENT_BOX: Record<string, { w: number; h: number; top: number; height: number; cx: number }> = {
  "caterpillar-demand-quality": { w: 1280, h: 800, top: 61, height: 689, cx: 628.5 },
  arm: { w: 1280, h: 800, top: 61, height: 694, cx: 640.5 },
  "microsoft-activision": { w: 1280, h: 800, top: 61, height: 718, cx: 628.5 },
  nike: { w: 1280, h: 800, top: 61, height: 684, cx: 655.5 },
  "fpa-intelligence-engine": { w: 1280, h: 800, top: 62, height: 682, cx: 638 },
  "monday-operating-plan": { w: 1360, h: 800, top: 62, height: 694, cx: 708.5 },
};

// Each thumbnail's background token (scripts/render-project-thumbnails.mjs, render-monday-thumbnail.mjs),
// so the frame around a 16:10 image matches it on wide cards.
const FRAME_BG: Record<string, string> = {
  "caterpillar-demand-quality": "bg-brass-pale",
  arm: "bg-mist",
  "microsoft-activision": "bg-rust-pale",
  nike: "bg-cream",
  "fpa-intelligence-engine": "bg-white",
  "monday-operating-plan": "bg-forest",
};

/** One project card, fully clickable: the image over the text. The first card's image loads eagerly. */
function ProjectCard({ project, eager }: { project: Project; eager: boolean }) {
  const copy = CARDS[project.slug];
  const tags = copy ? project.tools.filter((t) => copy.tags.includes(t)) : project.tools.slice(0, 3);
  return (
    <Link href={`/projects/${project.slug}`} data-reveal-item className={`group flex h-full flex-col overflow-hidden text-left ${CARD_LIFT}`}>
      <div className={`relative h-40 w-full shrink-0 overflow-hidden border-b border-forest/10 ${FRAME_BG[project.slug] ?? "bg-cream"}`}>
        {project.visual && project.visualSize && (() => {
          const box = CONTENT_BOX[project.slug];
          return (
          <Image
            src={project.slug === "monday-operating-plan" && MONDAY_RESULTS.state === "scored" ? SCORED_VISUAL : project.visual}
            alt={project.slug === "monday-operating-plan" ? MONDAY_ALT : (project.visualAlt ?? `${project.title} preview`)}
            width={project.visualSize.width}
            height={project.visualSize.height}
            sizes={SIZES}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            className={box ? "absolute left-1/2 max-w-none" : "h-full w-full object-contain"}
            style={
              box
                ? {
                    height: `${(box.h / box.height) * 100}%`,
                    width: "auto",
                    top: `${(-box.top / box.height) * 100}%`,
                    transform: `translateX(${(-box.cx / box.w) * 100}%)`,
                  }
                : undefined
            }
          />
          );
        })()}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {/* One row of tags: the row is one tag tall and clips its overflow, so a tag that
            does not fit wraps out of sight whole, and titles line up across a row. */}
        <ul className="flex h-[1.3125rem] flex-wrap content-start items-start gap-1.5 overflow-hidden">
          {tags.map((tool) => (
            <li
              key={tool}
              className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-forest"
            >
              {tool}
            </li>
          ))}
        </ul>
        <h3 className="mt-3 text-lg font-bold tracking-tight text-charcoal">{project.title}</h3>
        {copy ? (
          <>
            <p className="mt-1.5 text-sm font-medium leading-5 text-charcoal">{copy.question}</p>
            <p className="mt-1.5 text-sm leading-5 text-charcoal-soft">
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
          <p className="mt-1.5 text-sm leading-5 text-charcoal-soft">{project.description ?? project.summary}</p>
        )}
        <span className={`mt-auto pt-3 ${CARD_CTA}`}>View project &rarr;</span>
      </div>
    </Link>
  );
}

export default function WorkGrid() {
  return (
    <section id="work" className="border-t border-forest/10 bg-dot-grid">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-3xl font-black tracking-tight text-charcoal sm:text-4xl">
          Projects
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft sm:text-base sm:leading-7">
          A growing collection of finance, analytics, and strategy projects —
          each built around a real business question.
        </p>

        {/* Scroll-reveal hook: ScrollReveal.tsx reveals the cards one by one.
            Six cards: three columns from 1024px (3 + 3), two from 640px, one below. */}
        {/* Below 768px a swipe carousel, one card at a time; from 768px the grid, every
            row as tall as the tallest card so each "View project" sits at the bottom. */}
        <ProjectCarousel label="Projects">
          {projects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} eager={i === 0} />
          ))}
        </ProjectCarousel>
      </div>
    </section>
  );
}

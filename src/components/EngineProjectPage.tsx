import Link from "next/link";
import type { Project } from "@/lib/projects";
import EngineTrace, { type TraceHeaders } from "@/components/engine/EngineTrace";
// Written by scripts/export-engine-trace.py. Imported here only for the lists and the provenance
// line, which render before the data loads; the trace itself is fetched lazily.
import traceJson from "../../public/engine/trace.json";
import { MEASURE, STACK_BODY, STACK_HEAD, STACK_LABEL, STACK_ROW, STACK_TABLE, STACK_VALUE, STACK_WIDE } from "@/components/project/layout";

const ENGINE_REPO = "https://github.com/2samfelix/fpa-intelligence-engine";
const STATUS_DOC = `${ENGINE_REPO}/blob/main/docs/project_status.md`;
const CATERPILLAR_PAGE = "/projects/caterpillar-demand-quality";
const TRACE_HEADERS: TraceHeaders = {
  statements: traceJson.statements.map(({ id, kind, severity, text }) => ({ id, kind, severity, text })),
  tests: traceJson.tests.map(({ file, status, description }) => ({ file, status, description })),
  commit: traceJson.engine.commit,
};
const TRACE_RUN = traceJson.run;

const STEPS: { title: string; owner: string; body: string }[] = [
  {
    title: "Load and validate",
    owner: "Code",
    body: "A deterministic loader reads sourced facts and checks them against their evidence.",
  },
  {
    title: "Calculate and reconcile",
    owner: "Code",
    body: "Python computes derived figures with exact decimal arithmetic, then marks each reconciliation as reconciled, unresolved or not applicable. The engine never forces a tie-out.",
  },
  {
    title: "Package",
    owner: "Code",
    body: "The verified facts go into a fixed, hashed input packet, so every run can be traced to exactly what the model saw.",
  },
  {
    title: "Write, then check",
    owner: "AI writes · code checks",
    body: "The AI writes structured statements only. A deterministic validator accepts or rejects the brief. The system allows one attempt plus at most one corrective retry. There is no second AI grading the first.",
  },
];

const LIMITATIONS = [
  "It is one company and one quarter, with a hand-curated benchmark.",
  "Five runs show consistency on one input, not general reliability.",
  "The \"28 / 32\" bridge figure on my Caterpillar page comes from the workbook. The engine independently confirms two bridges (R01 and R02). The three profit bridges (R03 to R05) are left unresolved on purpose, because the data does not support a tie-out.",
  "Assumption disclosure was verified only by offline tests, because all five live runs used a path with no assumptions.",
  "Some benchmark entries are known to need correction. They are documented in the repo.",
  "The model chose the severity labels itself, and they varied across runs.",
];

type StatementType = "FACT" | "INTERPRETIVE" | "LIMITATION";

// Run 1 of the five-run evaluation, quoted unedited. "Linked to" counts come
// from the brief's own citations; do not reword or recount.
const BRIEF_STATEMENTS: { id: string; type: StatementType; linkedTo: string; text: string }[] = [
  {
    id: "B1",
    type: "FACT",
    linkedTo: "4 facts, 1 reconciliation",
    text: "Construction Industries sales rose to $8,346M in Q2 2026 from $6,190M a year earlier. The company's sales bridge reconciles, with sales volume contributing $1,755M and price realization $309M.",
  },
  {
    id: "B2",
    type: "FACT",
    linkedTo: "4 facts",
    text: "The disclosed CI dealer-inventory build fell from $1,500M in Q1 2026 to $400M in Q2 2026. Over the same quarters, price-neutral CI retail sales growth rose from 7% to 22%.",
  },
  {
    id: "B5",
    type: "INTERPRETIVE",
    linkedTo: "no figures (an inference, labeled as one)",
    text: "Taken together, a smaller disclosed dealer build alongside faster price-neutral retail growth suggests that Q2 2026 CI growth leaned less on dealer restocking and more on end-user demand than in Q1 2026.",
  },
  {
    id: "B6",
    type: "LIMITATION",
    linkedTo: "1 fact, 3 reconciliations",
    text: "The drivers of the $703M increase in Q2 2026 CI segment profit remain unresolved. The volume and price-realization contributions were not captured, and no manufacturing-cost driver was disclosed, which should not be read as zero. The Q1 2026 and Q4 2025 CI profit bridges also leave residuals for drivers Caterpillar did not itemize.",
  },
];

const TYPE_TAG_CLASS: Record<StatementType, string> = {
  FACT: "bg-forest/10 text-forest",
  INTERPRETIVE: "bg-mist text-charcoal",
  LIMITATION: "bg-brass/15 text-brass",
};

// Caterpillar workbook, Dealer Inventory tab, rows 10-11, columns A, C, D, E, F, G.
// Copied cell for cell; column D keeps the workbook's double spaces around "|".
const WORKBOOK_HEADERS = ["Quarter", "Scope", "Disclosed language (verbatim)", "Source", "Class", "CI-specific $mm"];
const WORKBOOK_ROWS: [string, string, string, string, string, string][] = [
  ["Q1 2026", "Company-wide AND CI split", "10-Q: \"dealer inventory increased $2.0 billion\"  |  10-Q: \"Construction Industries dealer inventory increased by $1.5 billion\"  |  Call (corroborating, CFO Bonfield): \"a more typical $1.5 billion increase in the first quarter as compared to a slight decrease in the prior year.\"", "Q1 2026 Form 10-Q, Item 2 MD&A — accession 0000018230-26-000021; corroborated by Q1 2026 earnings call", "SOURCED", "1500"],
  ["Q2 2026", "CI only", "10-Q: \"Construction Industries dealer inventory increased by $400 million\"  |  Call (corroborating): \"Dealer inventory increased by $400 million in Construction Industries compared to a decrease in the second quarter of 2025.\"", "Q2 2026 Form 10-Q, Item 2 MD&A — accession 0000018230-26-000046; corroborated by Q2 2026 earnings call", "SOURCED (CI)", "400"],
];
// Long-text columns wrap at a minimum width; the rest stay on one line.
// Below md the minimum widths are dropped and each row stacks (see STACK_* in layout.ts).
const WORKBOOK_COL_CLASS = [
  "whitespace-nowrap",
  "min-w-[7rem] max-md:min-w-0",
  "min-w-[16rem] whitespace-pre-wrap max-md:min-w-0",
  "min-w-[10rem] max-md:min-w-0",
  "whitespace-nowrap",
  "whitespace-nowrap text-right tabular-nums",
];
// Stacked below md: the verbatim language and the source take the full width.
const WORKBOOK_STACK_WIDE = [false, false, true, true, false, false];

const linkClass = "font-semibold text-forest hover:text-forest-dark";

/**
 * One statement from the example brief. The LIMITATION card gets a warm brass
 * accent so a stated limit reads as part of the output, not as an error.
 */
function StatementCard({ statement }: { statement: (typeof BRIEF_STATEMENTS)[number] }) {
  const isLimitation = statement.type === "LIMITATION";
  return (
    <li
      className={`flex flex-col rounded-2xl border p-5 ${
        isLimitation ? "border-brass/50 border-l-4 border-l-brass bg-brass-pale/40" : "border-forest/15 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-charcoal">{statement.id}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${TYPE_TAG_CLASS[statement.type]}`}
        >
          {statement.type}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-charcoal">{statement.text}</p>
      <p className="mt-auto pt-4 text-xs leading-5 text-charcoal-soft">Linked to {statement.linkedTo}</p>
    </li>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">{children}</h2>;
}

/**
 * Four-step flow: stacked with down arrows on mobile, one row with right
 * arrows from sm: up. Step titles only; the full step text follows below.
 */
function StepFlow() {
  return (
    <ol
      aria-label="How it works, in four steps"
      className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0"
    >
      {STEPS.flatMap((step, index) => {
        const isAiStep = index === STEPS.length - 1;
        const box = (
          <li
            key={step.title}
            className={`flex flex-col rounded-xl border p-4 sm:flex-1 sm:basis-0 ${
              isAiStep ? "border-forest/30 bg-forest/5" : "border-forest/15 bg-white"
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-bold text-cream">
              {index + 1}
            </span>
            <span className="mt-3 text-sm font-semibold leading-5 text-charcoal">{step.title}</span>
            <span className="mt-auto pt-3 text-[11px] font-medium uppercase tracking-wide text-brass">
              {step.owner}
            </span>
          </li>
        );
        if (index === STEPS.length - 1) return [box];
        return [
          box,
          <li
            key={`${step.title}-arrow`}
            aria-hidden="true"
            className="self-center py-1 text-lg leading-none text-forest/50 sm:px-2 sm:py-0"
          >
            <span className="sm:hidden">&darr;</span>
            <span className="hidden sm:inline">&rarr;</span>
          </li>,
        ];
      })}
    </ol>
  );
}

export default function EngineProjectPage({
  project,
  prev,
  next,
}: {
  project: Project;
  prev: Project;
  next: Project;
}) {
  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <Link href="/#work" className="text-sm font-semibold text-forest hover:text-forest-dark">
          &larr; Back to Projects
        </Link>

        <div className="mt-8">
          <h1 className="text-4xl font-black tracking-tight text-charcoal sm:text-5xl">{project.title}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-charcoal-soft">
            The AI writes the brief. Code does the math and decides whether the writing is accepted.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-charcoal-soft">
            The model only sees verified figures and can only write structured statements that point to them. Every
            number is checked against the computed values and every quote against its source, and a statement that
            fails is rejected. That doesn&apos;t mean the briefs are right in judgment. The checks confirm that
            figures and quotes match the evidence, not that the interpretation is the right one.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={ENGINE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
            >
              View on GitHub ↗
            </a>
            <a
              href={STATUS_DOC}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
            >
              Project status ↗
            </a>
          </div>
        </div>

        <section className="mt-16 border-t border-forest/10 pt-12">
          <SectionHeading>The problem</SectionHeading>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            AI can write a convincing finance summary, but it can also invent a number or misattribute a quote. In
            FP&amp;A, one bad figure undermines the whole brief. I built the engine so that code, not the model, is
            responsible for the math and for accepting or rejecting what the model writes.
          </p>
        </section>

        <section className="mt-12 border-t border-forest/10 pt-12">
          <SectionHeading>What it produces</SectionHeading>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            This is part of a real brief the engine produced and accepted. It is shown unedited. Each statement carries
            a type and the evidence it points to, which the validator checks.
          </p>
          <ul aria-label="Four statements from an accepted brief" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BRIEF_STATEMENTS.map((statement) => (
              <StatementCard key={statement.id} statement={statement} />
            ))}
          </ul>
          <p className={`mt-3 text-xs leading-5 text-charcoal-soft ${MEASURE}`}>
            Run 1 of 5. Accepted on the first attempt. The full brief has 8 statements; four are shown. This brief was
            checked against the evidence for the numbers it contains, not for whether its reading of them is right.
          </p>
        </section>

        <section aria-labelledby="trace-heading" className="mt-12 border-t border-forest/10 pt-12">
          <h2 id="trace-heading" className="text-sm font-semibold uppercase tracking-widest text-brass">
            Trace a statement
          </h2>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            Follow any sentence of the accepted brief back to the facts, bridges and evidence it cites, and see what the
            validator checked. The second tab shows what the checker rejects. This shows that the figures trace to their
            evidence and that the checker enforces its rules, not that the brief&apos;s reading is right (see{" "}
            <a href="#what-this-doesnt-prove" className="font-semibold text-forest underline-offset-2 hover:underline">
              What this doesn&apos;t prove
            </a>
            ).
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-5 text-charcoal-soft">
            <span>
              Run {TRACE_RUN.run} of {TRACE_RUN.of_runs}, prompt {TRACE_RUN.prompt_version}, model {TRACE_RUN.served_model},
              packet {TRACE_RUN.packet_hash.slice(0, 12)}, engine commit {TRACE_HEADERS.commit.slice(0, 7)}.
            </span>
            <a href={ENGINE_REPO} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest hover:text-forest-dark">
              Engine on GitHub ↗
            </a>
          </p>
          <EngineTrace headers={TRACE_HEADERS} src="/engine/trace.json" />
        </section>

        <section className="mt-12 border-t border-forest/10 pt-12">
          <SectionHeading>How it works</SectionHeading>
          <StepFlow />
          <ol className={`mt-8 space-y-4 ${MEASURE}`}>
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="w-5 shrink-0 text-sm font-bold text-forest">{index + 1}.</span>
                <p className={`text-sm leading-6 text-charcoal-soft ${MEASURE}`}>
                  <span className="font-semibold text-charcoal">{step.title}.</span> {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 border-t border-forest/10 pt-12">
          <SectionHeading>The test case</SectionHeading>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            The engine runs on my Caterpillar Q2 2026 case study: 40 sourced facts, 25 derived facts, 7 disclosure
            gaps, 13 bridges and 24 sources.
          </p>
          <figure className="mt-6">
            <div className="overflow-x-auto rounded-xl border border-forest/15 bg-white">
              <table className={`w-full min-w-[720px] text-left align-top text-xs leading-5 ${STACK_TABLE}`}>
                <thead className={STACK_HEAD}>
                  <tr className="border-b border-forest/15">
                    {WORKBOOK_HEADERS.map((header, col) => (
                      <th
                        key={header}
                        scope="col"
                        className={`whitespace-nowrap px-3 py-2.5 align-bottom font-semibold text-charcoal ${
                          col === 5 ? "text-right" : ""
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={STACK_BODY}>
                  {WORKBOOK_ROWS.map((row) => (
                    <tr key={row[0]} className={`border-b border-forest/10 last:border-0 ${STACK_ROW}`}>
                      {row.map((cell, col) => (
                        <td
                          key={col}
                          data-label={col ? WORKBOOK_HEADERS[col] : undefined}
                          className={`px-3 py-2.5 align-top text-charcoal-soft ${WORKBOOK_COL_CLASS[col]} ${
                            col === 5 ? "font-semibold text-charcoal" : ""
                          } ${col === 0 ? `font-semibold text-charcoal ${STACK_LABEL}` : `${STACK_VALUE} ${WORKBOOK_STACK_WIDE[col] ? STACK_WIDE : ""}`}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="mt-3 text-xs leading-5 text-charcoal-soft">
              Excerpt from the Caterpillar case-study workbook (Dealer Inventory tab). The $1,500M and $400M figures
              are the ones in brief statement B2 above. The engine reads its own curated benchmark files, not this
              spreadsheet.
            </figcaption>
          </figure>
          <Link href={CATERPILLAR_PAGE} className={`mt-4 inline-block text-sm ${linkClass}`}>
            Caterpillar case study &rarr;
          </Link>
        </section>

        <section className="mt-12 border-t border-forest/10 pt-12">
          <SectionHeading>What I tested</SectionHeading>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            I ran the engine five times on the same pinned input. All five briefs were accepted on the first attempt,
            with no retries, no rejections, no provider errors and no number problems flagged. Each brief had 8 to 10
            statements.
          </p>
          <p className={`mt-3 text-xs leading-5 text-charcoal-soft ${MEASURE}`}>
            Pinned configuration: prompt synthesis_v3, packet version 2, model claude-opus-5-5. Evaluated at commit
            f33a569, with one small error-message wording fix (72d5299) added afterward.
          </p>
        </section>

        <section id="what-this-doesnt-prove" className="mt-12 scroll-mt-8 border-t border-forest/10 pt-12">
          <SectionHeading>What this doesn&apos;t prove</SectionHeading>
          <ul className={`mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-charcoal-soft marker:text-brass ${MEASURE}`}>
            {LIMITATIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-forest/10 pt-12">
          <SectionHeading>What I&apos;d do next</SectionHeading>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            Extract evidence from raw filings with its own validator, correct the known benchmark entries under a new
            evaluation, and add automated testing on every change.
          </p>
        </section>

        <section className="mt-12 border-t border-forest/10 pt-8">
          <p className="text-sm text-charcoal-soft">
            Links:{" "}
            <a href={ENGINE_REPO} target="_blank" rel="noopener noreferrer" className={linkClass}>
              GitHub repo ↗
            </a>
            {" · "}
            <a href={STATUS_DOC} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Project status doc ↗
            </a>
            {" · "}
            <Link href={CATERPILLAR_PAGE} className={linkClass}>
              Caterpillar case study &rarr;
            </Link>
          </p>
        </section>

        <nav className="mt-16 flex items-center justify-between border-t border-forest/10 pt-8">
          <Link href={`/projects/${prev.slug}`} className="text-sm font-semibold text-charcoal-soft hover:text-charcoal">
            &larr; Previous Project
          </Link>
          <Link href={`/projects/${next.slug}`} className="text-sm font-semibold text-charcoal-soft hover:text-charcoal">
            Next Project &rarr;
          </Link>
        </nav>
      </div>
    </main>
  );
}

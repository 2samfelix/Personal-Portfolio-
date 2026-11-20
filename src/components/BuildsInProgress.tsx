"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

// "Project builds in progress": a sub-section under the home page Projects grid (WorkGrid.tsx),
// above the skyline band. These are not shipped projects, so they stay out of the grid and its
// carousel. The cards are deliberately lighter than the project cards: a thin dashed border, no
// preview image and no logo. "Learn more" opens an inline panel, the same disclosure pattern as
// the tools pages (FpaDecisionLab.tsx, FrontOfficeSimulator.tsx): a real <button> with
// aria-expanded / aria-controls; Enter and Space toggle it, Esc closes it and returns focus.

type Build = {
  id: string;
  tag: "In progress" | "Planned next";
  title: string;
  question: string;
  builtWith: string;
  /** "What I'm building" or "What I'll build". */
  buildLabel: string;
  build: string;
  data: string;
  status: string;
};

const BUILDS: Build[] = [
  {
    id: "gxo-guidance-tracker",
    tag: "In progress",
    title: "GXO Guidance vs. Actual Tracker",
    question: "How close did GXO's own guidance come to what it reported, and what does Q4 need to deliver to hit its targets?",
    builtWith: "SQL Server · Power BI",
    buildLabel: "What I'm building",
    build:
      "A SQL Server database that stores each version of GXO's FY2026 guidance next to its reported results, with views that calculate where results stand against guidance and what the fourth quarter must deliver. A Power BI dashboard reads those views.",
    data: "GXO's own earnings releases filed with the SEC. Every number is tied to its source document.",
    status: "In progress.",
  },
  {
    id: "fy2027-operating-budget",
    tag: "Planned next",
    title: "FY2027 Operating Budget & Headcount Plan",
    question: "What does it cost to run a business next year, and how sensitive is the budget to hiring pace and wage growth?",
    builtWith: "Excel",
    buildLabel: "What I'll build",
    build: "A headcount-driven operating budget with hires, attrition and cost per person, phased by month, plus a budget-versus-actual view.",
    data: "A public company's annual filing. A public-information budget, not the company's internal budget. Every number will be tagged as sourced, derived or assumed.",
    status: "Planned next.",
  },
];

// Status pills: "In progress" in forest, "Planned next" in brass (the skills section's "Planned" pill).
const TAG_CLASS: Record<Build["tag"], string> = {
  "In progress": "bg-forest/10 text-forest",
  "Planned next": "bg-brass-pale text-brass-ink",
};

function BuildCard({ build }: { build: Build }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <li
      onKeyDown={onKeyDown}
      className="flex flex-col rounded-2xl border border-dashed border-forest/30 bg-white p-5"
      data-build={build.id}
    >
      <span className={`self-start rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${TAG_CLASS[build.tag]}`}>
        {build.tag}
      </span>
      <h4 className="mt-3 text-base font-bold tracking-tight text-charcoal sm:text-lg">{build.title}</h4>
      <p className="mt-1.5 text-sm leading-5 text-charcoal">{build.question}</p>
      <p className="mt-2 text-xs leading-5 text-charcoal-soft">
        <span className="font-semibold">Built with:</span> {build.builtWith}
      </p>

      <div className="mt-auto pt-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="tap -mx-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:min-h-0 sm:py-1"
        >
          {open ? "Show less" : "Learn more"}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div
        id={panelId}
        role="region"
        aria-label={`${build.title}: details`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        {/* Closed: inert and hidden from assistive tech, so nothing in it is read or focused. */}
        <div className="overflow-hidden" inert={!open} aria-hidden={!open}>
          <dl className="mt-3 flex flex-col gap-3 border-t border-forest/10 pt-3 text-sm leading-5">
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brass-ink">The question</dt>
              <dd className="mt-0.5 text-charcoal">{build.question}</dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brass-ink">{build.buildLabel}</dt>
              <dd className="mt-0.5 text-charcoal">{build.build}</dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brass-ink">Data</dt>
              <dd className="mt-0.5 text-charcoal">{build.data}</dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brass-ink">Status</dt>
              <dd className="mt-0.5 text-charcoal">{build.status}</dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
}

export default function BuildsInProgress() {
  return (
    <div className="mt-14 border-t border-forest/10 pt-10" aria-labelledby="builds-in-progress-heading" role="group">
      <h3 id="builds-in-progress-heading" className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
        Project builds in progress
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-charcoal-soft sm:text-base sm:leading-7">What I&apos;m building next.</p>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        {BUILDS.map((b) => (
          <BuildCard key={b.id} build={b} />
        ))}
      </ul>
    </div>
  );
}

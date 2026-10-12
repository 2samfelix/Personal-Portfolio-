"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { builds, flagshipProjects, type Project } from "@/lib/projects";

type GalleryItem = {
  project: Project;
  href: string;
};

const frontOffice = builds.find((b) => b.slug === "front-office-simulator")!;

const GALLERY_ITEMS: GalleryItem[] = [
  ...flagshipProjects.map((project) => ({
    project,
    href: `/projects/${project.slug}`,
  })),
  { project: frontOffice, href: frontOffice.link! },
];

// Short navigational labels for the narrow collapsed panels/rows only — the
// full `project.category` text (unchanged) is always shown in the expanded
// view. These are the finance-skill groupings the collapsed UI needs room for.
const SKILL_LABELS: Record<string, string> = {
  nike: "Forecasting / Scenario Analysis",
  arm: "Valuation / Market Expectations",
  "microsoft-activision": "M&A / Transaction Economics",
  "caterpillar-demand-quality": "Operating / Demand Quality",
  "front-office-simulator": "Strategy / Simulation",
};

const ACTIVE_FLEX_GROW = 16;
const COLLAPSED_MIN_WIDTH = 96;

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-forest transition-transform duration-300 motion-reduce:transition-none ${
        expanded ? "rotate-180" : ""
      }`}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GalleryPanel({
  item,
  isActive,
  onActivate,
  onPreviewStart,
  onPreviewEnd,
  linkRef,
}: {
  item: GalleryItem;
  isActive: boolean;
  onActivate: () => void;
  onPreviewStart: () => void;
  onPreviewEnd: () => void;
  linkRef: (el: HTMLAnchorElement | null) => void;
}) {
  const { project, href } = item;

  return (
    <div
      className="h-[420px] overflow-hidden rounded-2xl border border-forest/15 bg-white transition-[flex-grow] duration-500 ease-out motion-reduce:transition-none"
      style={{
        flexGrow: isActive ? ACTIVE_FLEX_GROW : 1,
        flexShrink: 0,
        flexBasis: 0,
        minWidth: isActive ? undefined : COLLAPSED_MIN_WIDTH,
      }}
      onMouseEnter={onPreviewStart}
      onMouseLeave={onPreviewEnd}
    >
      {isActive ? (
        <Link
          href={href}
          ref={linkRef}
          className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass"
        >
          <div className="min-h-0 flex-[7] overflow-hidden bg-cream p-5 sm:p-7">
            {project.visual && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.visual}
                alt={`${project.title} preview`}
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <div className="flex min-h-0 flex-[3] flex-col justify-center gap-1.5 border-t border-forest/10 px-5 py-4 sm:px-7">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-brass">
              {project.category}
            </span>
            <h3 className="text-lg font-bold tracking-tight text-charcoal sm:text-xl">
              {project.title}
            </h3>
            <p className="line-clamp-2 text-xs leading-5 text-charcoal-soft sm:text-sm">
              {project.description ?? project.summary}
            </p>
            {project.headlineStat && (
              <p className="text-xs font-semibold text-forest sm:text-sm">
                {project.headlineStat}
              </p>
            )}
            <span className="pt-1 text-xs font-semibold text-forest sm:text-sm">
              View Project &rarr;
            </span>
          </div>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          aria-label={`Show project: ${project.title}`}
          className="flex h-full w-full flex-col items-center justify-between gap-4 py-6 text-charcoal transition-colors hover:bg-forest/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden="true" />
          <span className="flex min-h-0 flex-1 items-center justify-center">
            <span className="rotate-180 whitespace-nowrap text-xs font-bold uppercase tracking-wide [writing-mode:vertical-rl]">
              {project.title}
            </span>
          </span>
          <span className="w-full px-1.5 text-center text-[9px] font-medium uppercase leading-tight tracking-wide text-charcoal-soft">
            {SKILL_LABELS[project.slug] ?? project.category}
          </span>
        </button>
      )}
    </div>
  );
}

function AccordionRow({ item }: { item: GalleryItem }) {
  const { project, href } = item;
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <div className="overflow-hidden rounded-2xl border border-forest/15 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass"
      >
        <span>
          <span className="block text-base font-bold tracking-tight text-charcoal">
            {project.title}
          </span>
          <span className="mt-0.5 block text-xs font-medium uppercase tracking-wide text-charcoal-soft">
            {SKILL_LABELS[project.slug] ?? project.category}
          </span>
        </span>
        <ChevronIcon expanded={expanded} />
      </button>

      <div
        id={contentId}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 border-t border-forest/10 px-5 pb-5 pt-4">
            {project.visual && (
              <div className="w-full overflow-hidden rounded-xl bg-cream p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.visual}
                  alt={`${project.title} preview`}
                  className="h-auto max-h-56 w-full object-contain"
                />
              </div>
            )}
            <p className="text-sm leading-6 text-charcoal-soft">
              {project.description ?? project.summary}
            </p>
            {project.headlineStat && (
              <p className="text-sm font-semibold text-forest">{project.headlineStat}</p>
            )}
            <Link
              href={href}
              className="inline-flex w-fit text-sm font-semibold text-forest underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              View Project &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkGrid() {
  const [pinned, setPinned] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const activeIndex = preview ?? pinned;

  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const hasMounted = useRef(false);

  // When a collapsed panel is activated (click, or Enter/Space on the
  // button), it unmounts and is replaced by the expanded panel's link.
  // Move focus there so keyboard users never silently lose focus.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    linkRefs.current[pinned]?.focus();
  }, [pinned]);

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

        <div className="mt-14 hidden gap-3 lg:flex">
          {GALLERY_ITEMS.map((item, i) => (
            <GalleryPanel
              key={item.project.slug}
              item={item}
              isActive={i === activeIndex}
              onActivate={() => setPinned(i)}
              onPreviewStart={() => setPreview(i)}
              onPreviewEnd={() => setPreview(null)}
              linkRef={(el) => {
                linkRefs.current[i] = el;
              }}
            />
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 lg:hidden">
          {GALLERY_ITEMS.map((item) => (
            <AccordionRow key={item.project.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

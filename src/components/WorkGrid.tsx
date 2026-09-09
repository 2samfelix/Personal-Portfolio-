"use client";

import { useEffect, useState } from "react";
import { flagshipProjects, type Project } from "@/lib/projects";

function ProjectVisual({ index }: { index: number }) {
  const bars = [38, 62, 48, 78, 58];

  return (
    <svg viewBox="0 0 200 100" className="h-full w-full" aria-hidden="true">
      <rect width="200" height="100" fill="var(--color-forest)" opacity="0.04" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={16 + i * 38}
          y={100 - h}
          width="22"
          height={h}
          fill={i === (index % 5) ? "var(--color-brass)" : "var(--color-forest)"}
          opacity={i === (index % 5) ? 0.9 : 0.25}
        />
      ))}
    </svg>
  );
}

function CaseStudyModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-forest/15 bg-cream p-8 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {project.category}
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-charcoal">
              {project.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close case study"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-forest/20 text-charcoal transition-colors hover:bg-forest/10"
          >
            &times;
          </button>
        </div>

        {project.headlineStat && (
          <p className="mt-4 text-4xl font-black tracking-tight text-brass">
            {project.headlineStat}
          </p>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">
            Thesis
          </p>
          <p className="mt-2 text-base leading-7 text-charcoal-soft">
            {project.summary}
          </p>
        </div>

        {!project.headlineStat && !project.keyNumbers && (
          <p className="mt-6 rounded-xl border border-dashed border-forest/25 bg-white/50 px-4 py-3 text-sm text-charcoal-soft">
            Full write-up (headline numbers and links) coming soon.
          </p>
        )}

        {project.keyNumbers && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">
              Key Numbers
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {project.keyNumbers.map((item) => (
                <li
                  key={item}
                  className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.verdict && (
          <p className="mt-6 rounded-xl border border-forest/15 bg-forest/5 px-4 py-3 text-sm italic leading-6 text-charcoal">
            &ldquo;{project.verdict}&rdquo;
          </p>
        )}

        <ul className="mt-6 flex flex-wrap gap-2">
          {project.tools.map((tool) => (
            <li
              key={tool}
              className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest"
            >
              {tool}
            </li>
          ))}
        </ul>

        {project.deliverables && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">
              Deliverables
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {project.deliverables.map((file) => (
                <li
                  key={file}
                  className="font-mono text-xs text-charcoal-soft"
                >
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.githubUrl && (
          <div className="mt-6">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full border border-forest/30 px-4 py-2 text-sm font-semibold text-charcoal hover:border-forest"
            >
              View Repo &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkGrid() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const openProject = flagshipProjects.find((p) => p.slug === openSlug) ?? null;

  return (
    <section id="work" className="bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brass">
              Featured Work
            </p>
            <h2 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
              Three deals. Three theses.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-charcoal-soft">
            Independent financial models built end-to-end from public
            filings — modeling, valuation, and strategic analysis.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {flagshipProjects.map((project, i) => (
            <button
              key={project.slug}
              onClick={() => setOpenSlug(project.slug)}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-forest/15 bg-white text-left transition-shadow hover:shadow-xl"
            >
              <span className="pointer-events-none absolute left-5 top-4 z-10 text-6xl font-black text-forest/10 sm:text-7xl">
                {project.icon}
              </span>
              <div className="relative h-32 w-full border-b border-forest/10">
                <ProjectVisual index={i} />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-brass">
                  {project.category}
                </span>
                <h3 className="text-2xl font-black tracking-tight text-charcoal">
                  {project.title}
                </h3>
                {project.headlineStat && (
                  <p className="text-xl font-black tracking-tight text-brass">
                    {project.headlineStat}
                  </p>
                )}
                <p className="text-sm leading-6 text-charcoal-soft">
                  {project.summary}
                </p>
                <span className="mt-auto pt-4 text-sm font-semibold text-forest transition-colors group-hover:text-forest-dark">
                  View Details &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {openProject && (
        <CaseStudyModal project={openProject} onClose={() => setOpenSlug(null)} />
      )}
    </section>
  );
}

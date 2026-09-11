"use client";

import { useEffect, useState } from "react";
import { flagshipProjects, type Project } from "@/lib/projects";

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

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-forest/15 bg-white text-left transition-colors hover:border-forest/35"
    >
      <div className="h-48 w-full overflow-hidden border-b border-forest/10 bg-cream">
        {project.visual && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.visual}
            alt={`${project.title} preview`}
            className="h-full w-full object-cover object-top"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <ul className="flex flex-wrap gap-1.5">
          {project.tools.map((tool) => (
            <li
              key={tool}
              className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-forest"
            >
              {tool}
            </li>
          ))}
        </ul>
        <h3 className="text-xl font-bold tracking-tight text-charcoal">
          {project.title}
        </h3>
        <p className="text-sm leading-6 text-charcoal-soft">
          {project.description ?? project.summary}
        </p>
        <span className="mt-auto pt-4 text-sm font-semibold text-forest">
          View project &rarr;
        </span>
      </div>
    </button>
  );
}

export default function WorkGrid() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const openProject = flagshipProjects.find((p) => p.slug === openSlug) ?? null;

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

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {flagshipProjects.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              onOpen={() => setOpenSlug(project.slug)}
            />
          ))}
        </div>
      </div>

      {openProject && (
        <CaseStudyModal project={openProject} onClose={() => setOpenSlug(null)} />
      )}
    </section>
  );
}

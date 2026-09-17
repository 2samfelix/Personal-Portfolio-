import Link from "next/link";
import type { Project } from "@/lib/projects";

const formatIcon: Record<string, string> = {
  XLSX: "📊",
  PDF: "📄",
  PPTX: "📑",
  DOCX: "📝",
};

export default function ProjectPage({
  project,
  prev,
  next,
}: {
  project: Project;
  prev: Project;
  next: Project;
}) {
  const cs = project.caseStudy;

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link
          href="/#work"
          className="text-sm font-semibold text-forest hover:text-forest-dark"
        >
          &larr; Back to Projects
        </Link>

        {/* Hero */}
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">
            {project.category}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
            {project.title}
          </h1>
          {cs && (
            <p className="mt-6 max-w-2xl text-xl leading-8 text-charcoal-soft">
              <span className="font-semibold text-charcoal">Question: </span>
              {cs.question}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {project.tools.map((tool) => (
              <span
                key={tool}
                className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-forest"
              >
                {tool}
              </span>
            ))}
            <span className="ml-2 text-xs text-charcoal-soft">
              {project.year}
            </span>
          </div>
        </div>

        {/* Large visual */}
        {project.visual && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-forest/15 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.visual}
              alt={`${project.title} model preview`}
              className="w-full"
            />
          </div>
        )}

        {cs && (
          <>
            {/* Overview */}
            <section className="mt-14">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Overview
              </h2>
              <p className="mt-3 text-base leading-7 text-charcoal-soft">
                {cs.overview}
              </p>
            </section>

            {/* Methodology */}
            <section className="mt-12 border-t border-forest/10 pt-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Business Question &amp; Methodology
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">
                    Data Sources
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-soft">
                    {cs.dataSources}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">
                    Modeling Approach
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-soft">
                    {cs.approach}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-charcoal">
                  Major Assumptions
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {cs.assumptions.map((item) => (
                    <li
                      key={item}
                      className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Key findings */}
            <section className="mt-12 border-t border-forest/10 pt-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Key Findings
              </h2>
              <ul className="mt-4 flex flex-col gap-4">
                {cs.findings.map((finding) => (
                  <li
                    key={finding}
                    className="rounded-xl border border-forest/15 bg-white p-4 text-sm leading-6 text-charcoal-soft"
                  >
                    {finding}
                  </li>
                ))}
              </ul>
            </section>

            {/* Deliverables */}
            <section className="mt-12 border-t border-forest/10 pt-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Deliverables
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {cs.deliverables.map((d) => (
                  <a
                    key={d.label}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-forest/15 bg-white p-4 transition-colors hover:border-forest/35"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{formatIcon[d.format]}</span>
                      <span>
                        <span className="block text-sm font-semibold text-charcoal">
                          {d.label}
                        </span>
                        <span className="block text-xs uppercase tracking-wide text-charcoal-soft">
                          {d.format}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-forest">
                      {d.format === "PDF" ? "Open →" : "Download →"}
                    </span>
                  </a>
                ))}
              </div>

              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
                >
                  View GitHub Repository &#8599;
                </a>
              )}
            </section>

            {/* Takeaway */}
            <section className="mt-12 border-t border-forest/10 pt-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
                Final Takeaway
              </h2>
              <p className="mt-3 text-lg font-medium leading-8 text-charcoal">
                {cs.takeaway}
              </p>
            </section>
          </>
        )}

        {/* Prev / Next */}
        <nav className="mt-16 flex items-center justify-between border-t border-forest/10 pt-8">
          <Link
            href={`/projects/${prev.slug}`}
            className="text-sm font-semibold text-charcoal-soft hover:text-charcoal"
          >
            &larr; Previous Project
          </Link>
          <Link
            href={`/projects/${next.slug}`}
            className="text-sm font-semibold text-charcoal-soft hover:text-charcoal"
          >
            Next Project &rarr;
          </Link>
        </nav>
      </div>
    </main>
  );
}

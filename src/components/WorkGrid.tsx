import Link from "next/link";
import { flagshipProjects, type Project } from "@/lib/projects";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
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

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {flagshipProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

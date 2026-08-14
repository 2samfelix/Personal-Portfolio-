import type { Project } from "@/lib/projects";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-forest/15 bg-white p-6 transition-shadow hover:shadow-md">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-lg">
        {project.icon}
      </span>
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-brass">
          {project.category}
        </span>
        <h3 className="mt-1 text-lg font-semibold text-charcoal">
          {project.title}
        </h3>
      </div>
      <p className="text-sm leading-6 text-charcoal-soft">
        {project.summary}
      </p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-2">
        {project.tools.map((tool) => (
          <li
            key={tool}
            className="rounded-full bg-cream px-3 py-1 text-xs font-medium text-charcoal-soft"
          >
            {tool}
          </li>
        ))}
      </ul>
      {project.link && (
        <a
          href={project.link}
          className="text-sm font-semibold text-forest hover:text-forest-dark"
        >
          View project &rarr;
        </a>
      )}
    </article>
  );
}

import type { Project } from "@/lib/projects";

export default function ProjectCard({ project }: { project: Project }) {
  const isLive = project.status === "live";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
          {project.icon}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isLive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isLive ? "Live" : "In development"}
        </span>
      </div>
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-blue-600">
          {project.category}
        </span>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">
          {project.title}
        </h3>
      </div>
      <p className="text-sm leading-6 text-slate-600">{project.summary}</p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-2">
        {project.tools.map((tool) => (
          <li
            key={tool}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {tool}
          </li>
        ))}
      </ul>
      {project.link && (
        <a
          href={project.link}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View project &rarr;
        </a>
      )}
    </article>
  );
}

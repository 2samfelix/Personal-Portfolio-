import type { Project } from "@/lib/projects";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-blue-700 dark:text-blue-400">
          {project.category}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {project.year}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        {project.title}
      </h3>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
        {project.summary}
      </p>
      <ul className="flex flex-wrap gap-2 pt-2">
        {project.tools.map((tool) => (
          <li
            key={tool}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {tool}
          </li>
        ))}
      </ul>
    </article>
  );
}

import { projects } from "@/lib/projects";
import ProjectCard from "@/components/ProjectCard";

export default function Projects() {
  return (
    <section
      id="projects"
      className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Projects
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        A selection of financial models built to practice the core toolkit of
        equity research and investment banking analysts.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}

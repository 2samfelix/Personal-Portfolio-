import { projects } from "@/lib/projects";
import ProjectCard from "@/components/ProjectCard";

export default function Projects() {
  return (
    <section id="work" className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Featured Work
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Projects that show how I think.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Financial models built independently to practice the core
            toolkit of FP&amp;A and financial analysts, plus AI-powered
            finance tools currently in the works.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

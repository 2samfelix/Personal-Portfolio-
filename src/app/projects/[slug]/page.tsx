import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectPage from "@/components/ProjectPage";
import {
  flagshipProjects,
  getAdjacentProjects,
  getProjectBySlug,
} from "@/lib/projects";

export function generateStaticParams() {
  return flagshipProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: `${project.title} — ${project.category} | Sam Felix`,
    description: project.description ?? project.summary,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const { prev, next } = getAdjacentProjects(slug);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <ProjectPage project={project} prev={prev} next={next} />
      <Footer />
    </div>
  );
}

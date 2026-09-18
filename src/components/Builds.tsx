import Link from "next/link";
import { builds, type Project } from "@/lib/projects";

function BuildCard({ build }: { build: Project }) {
  return (
    <Link
      href={build.link!}
      className="flex items-start gap-3 rounded-xl border border-forest/15 bg-white p-4 transition-colors hover:border-forest/35"
    >
      <span className="text-base">{build.icon}</span>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-charcoal">
            {build.title}
          </h4>
          <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brass">
            Interactive Demo
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-charcoal-soft">
          {build.summary}
        </p>
        <span className="mt-2 inline-block text-xs font-semibold text-forest">
          Try it &rarr;
        </span>
      </div>
    </Link>
  );
}

export default function Builds() {
  if (builds.length === 0) return null;

  return (
    <section id="interactive-tools" className="border-t border-forest/10 bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-40">
        <h2 className="text-4xl font-black tracking-tight text-charcoal sm:text-5xl">
          Interactive Tools
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-charcoal-soft">
          Financial models you can drive yourself — the assumptions exposed
          and the decision logic stated, not just described.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {builds.map((build) => (
            <BuildCard key={build.slug} build={build} />
          ))}
        </div>
      </div>
    </section>
  );
}

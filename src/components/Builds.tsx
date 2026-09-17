import Link from "next/link";
import { builds, type Project } from "@/lib/projects";

function BuildCard({ build }: { build: Project }) {
  const isLive = build.status === "live" && build.link;

  const content = (
    <>
      <span className="text-base">{build.icon}</span>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-charcoal">
            {build.title}
          </h4>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isLive ? "bg-brass/15 text-brass" : "bg-forest/10 text-forest"
            }`}
          >
            {isLive ? "Interactive Demo" : "In development"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-charcoal-soft">
          {build.summary}
        </p>
        {isLive && (
          <span className="mt-2 inline-block text-xs font-semibold text-forest">
            Try it &rarr;
          </span>
        )}
      </div>
    </>
  );

  if (isLive) {
    return (
      <Link
        href={build.link!}
        className="flex items-start gap-3 rounded-xl border border-forest/15 bg-cream/60 p-4 transition-colors hover:border-forest/35"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-forest/10 bg-cream/60 p-4">
      {content}
    </div>
  );
}

export default function Builds() {
  if (builds.length === 0) return null;

  return (
    <section id="builds" className="border-t border-forest/10 bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-40">
        <div className="rounded-2xl border border-dashed border-forest/20 bg-white/40 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">
            Early-Stage Builds
          </p>
          <h3 className="mt-1 text-lg font-semibold text-charcoal">
            AI tools and interactive demos I&apos;m experimenting with on the
            side.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            Not flagship work — just small projects to explore how AI and
            interactive tools fit into everyday finance tasks.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {builds.map((build) => (
              <BuildCard key={build.slug} build={build} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

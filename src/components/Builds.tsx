import { builds } from "@/lib/projects";

export default function Builds() {
  if (builds.length === 0) return null;

  return (
    <section id="builds" className="bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="rounded-2xl border border-dashed border-forest/20 bg-white/40 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">
            Early-Stage Builds
          </p>
          <h3 className="mt-1 text-lg font-semibold text-charcoal">
            AI tools I&apos;m experimenting with on the side.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal-soft">
            Not flagship work — just small projects to explore how AI fits
            into everyday finance tasks.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {builds.map((build) => (
              <div
                key={build.slug}
                className="flex items-start gap-3 rounded-xl border border-forest/10 bg-cream/60 p-4"
              >
                <span className="text-base">{build.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-charcoal">
                      {build.title}
                    </h4>
                    <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                      In development
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-charcoal-soft">
                    {build.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

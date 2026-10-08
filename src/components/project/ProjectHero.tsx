export type HeroMetric = {
  value: string;
  label: string;
};

export type HeroCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
  external?: boolean;
};

/**
 * Shared top-of-page hero: title, business question, short description,
 * one or two headline metrics, and CTAs. Layout/responsive behavior only —
 * all copy and metrics are caller-supplied, per project.
 *
 * Mobile order (grid-cols-1, DOM order): title/question/description block,
 * then metrics, then CTAs. On desktop (lg:), the metrics block uses
 * lg:row-span-2 to sit in the right column, vertically centered beside the
 * text+CTAs stack in the left column — this is what keeps the metric above
 * the CTAs on mobile without affecting the two-column desktop layout.
 */
export function ProjectHero({
  title,
  question,
  description,
  metrics,
  ctas,
}: {
  title: string;
  question: string;
  description: string;
  metrics: HeroMetric[];
  ctas: HeroCta[];
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-charcoal sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-charcoal-soft">{question}</p>
        <p className="mt-4 max-w-2xl text-base leading-7 text-charcoal-soft">{description}</p>
      </div>

      <div className="rounded-2xl border border-forest/20 bg-forest/5 p-8 lg:row-span-2">
        {metrics.map((metric, index) => (
          <div key={metric.label} className={index === 0 ? undefined : "mt-8"}>
            <p className="text-3xl font-black tracking-tight text-forest sm:text-4xl">{metric.value}</p>
            <p className="mt-2 text-sm leading-5 text-charcoal-soft">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {ctas.map((cta) => (
          <a
            key={cta.label}
            href={cta.href}
            {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={
              cta.variant === "primary"
                ? "rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
                : "rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
            }
          >
            {cta.label}
          </a>
        ))}
      </div>
    </div>
  );
}

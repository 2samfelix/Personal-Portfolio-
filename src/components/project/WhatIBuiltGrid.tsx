import { CARD_CTA, CARD_LIFT } from "./cardLift";

export type DeliverableCard = {
  title: string;
  format: string;
  description: string;
  href?: string;
  ctaLabel?: string;
};

/**
 * Shared "What I Built" deliverable grid. Layout only — items (and their
 * copy) are caller-supplied per project. A card without an `href` (e.g. a
 * deliverable that doesn't exist for that project) renders without its CTA
 * and is not clickable, matching the original per-project conditional rendering.
 */
export function WhatIBuiltGrid({
  heading = "What I Built",
  items,
}: {
  heading?: string;
  items: DeliverableCard[];
}) {
  return (
    <div className="mt-16">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">{heading}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold text-charcoal">{item.title}</p>
                <span className="shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest">
                  {item.format}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-charcoal-soft">{item.description}</p>
            </>
          );
          // A card with a link is clickable as a whole and lifts on hover, like the
          // home page project cards; one without a link stays a plain card.
          return item.href ? (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col p-6 ${CARD_LIFT}`}
            >
              {body}
              <span className={`mt-auto pt-4 ${CARD_CTA}`}>{item.ctaLabel}</span>
            </a>
          ) : (
            <div key={item.title} className="rounded-2xl border border-forest/15 bg-white p-6">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

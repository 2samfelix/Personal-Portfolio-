"use client";

import { useRef } from "react";

export type MenuItem = { href: string; label: string };

const LINK =
  "rounded-sm px-1 py-2 text-base font-semibold text-charcoal underline-offset-4 hover:text-forest hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass";

/**
 * Sticky in-page menu, under the site header (77px tall on phones, 69px from 640px). A row of links from md;
 * on phones a collapsed "On this page" menu whose list opens over the page and
 * closes when a link is chosen. Native links and <details>, so it works with the
 * keyboard; sections set scroll-margin so the bar never covers a heading.
 */
export default function InPageMenu({ items }: { items: MenuItem[] }) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <nav aria-label="On this page" className="sticky top-[77px] z-40 sm:top-[69px] border-b border-forest/10 bg-cream/95 backdrop-blur print:hidden">
      <div className="mx-auto w-full max-w-6xl px-6">
        <ul className="hidden items-center gap-6 py-2 md:flex">
          {items.map((i) => (
            <li key={i.href}>
              <a href={i.href} className={LINK}>
                {i.label}
              </a>
            </li>
          ))}
        </ul>
        <details ref={details} className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-base font-semibold text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass [&::-webkit-details-marker]:hidden">
            On this page
            <span aria-hidden="true" className="text-[#7a5a30] group-open:rotate-180">▾</span>
          </summary>
          <ul className="absolute inset-x-0 top-full -mx-6 border-b border-forest/10 bg-cream px-6 pb-3 shadow-lg">
            {items.map((i) => (
              <li key={i.href}>
                <a href={i.href} className={`block ${LINK}`} onClick={() => details.current?.removeAttribute("open")}>
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </nav>
  );
}

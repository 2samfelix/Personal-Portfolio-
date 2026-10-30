"use client";

import { useEffect, useRef, useState } from "react";

export type MenuItem = { href: string; label: string };

// Pills: cream with a soft border and forest text (11.9:1); the current section's
// pill is forest with cream text. Hover adds a brass border and a 1px lift (none
// under reduced motion). 44px minimum tap height; the border width never changes,
// so the highlight cannot shift layout.
const PILL =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-forest/25 bg-cream px-4 text-[15px] font-semibold leading-5 text-forest transition-[translate,border-color,background-color,color] duration-150 hover:-translate-y-px hover:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none motion-reduce:hover:translate-y-0 aria-[current=location]:border-forest aria-[current=location]:bg-forest aria-[current=location]:text-cream";

// A section counts as current while it crosses this band: from just below the
// site header and menu (sections use scroll-mt-36, 144px) to 45% down the viewport.
const BAND_TOP = 150;

/**
 * Sticky in-page menu, under the site header (77px tall on phones, 69px from 640px):
 * one row of pill links, scrolling sideways on narrow screens, with a brass line
 * showing progress through the page. Plain links without JavaScript; with it, an
 * IntersectionObserver marks the section in view (aria-current="location") and
 * keeps its pill scrolled into view. Hidden in print.
 */
export default function InPageMenu({ items }: { items: MenuItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);

  // Current section.
  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.href.slice(1)))
      .filter((el): el is HTMLElement => !!el);
    const inBand = new Set<Element>();
    const pick = () => {
      const hit = sections.find((s) => inBand.has(s));
      if (hit) return setActive(hit.id);
      // Between bands (or past the last section): the last section whose top has passed.
      const passed = sections.filter((s) => s.getBoundingClientRect().top < BAND_TOP);
      setActive(passed.length ? passed[passed.length - 1].id : null);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target);
          else inBand.delete(e.target);
        }
        pick();
      },
      { rootMargin: `-${BAND_TOP}px 0px -55% 0px` },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  // Keep the current pill in view inside the row (sideways only; the page never moves).
  useEffect(() => {
    const row = scroller.current;
    const pill = active ? row?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null;
    if (!row || !pill || row.scrollWidth <= row.clientWidth) return;
    const left = pill.offsetLeft - (row.clientWidth - pill.offsetWidth) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  // Scroll progress, drawn with a transform only.
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progress.current) progress.current.style.transform = `scaleX(${p})`;
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label="On this page" className="sticky top-[77px] z-40 sm:top-[69px] border-b border-forest/10 bg-cream/95 backdrop-blur print:hidden">
      <div className="mx-auto w-full max-w-6xl px-6">
        {/* On narrow screens the row scrolls sideways; its edges fade into the 24px gutters. */}
        <div
          ref={scroller}
          className="-mx-6 overflow-x-auto px-6 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] [scrollbar-width:none] md:[mask-image:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-max items-center gap-2 py-2.5">
            {items.map((i) => (
              <li key={i.href} className="shrink-0">
                <a
                  href={i.href}
                  aria-current={active === i.href.slice(1) ? "location" : undefined}
                  onClick={() => setActive(i.href.slice(1))}
                  className={PILL}
                >
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-[-1px] h-0.5 overflow-hidden">
        <div ref={progress} className="h-full origin-left bg-brass" style={{ transform: "scaleX(0)" }} />
      </div>
    </nav>
  );
}

"use client";

import { Children, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// Below 768px the project cards are a swipe carousel; from 768px they are the grid they
// always were. The breakpoint matches Tailwind's md (48rem; media-query rem is 16px).
const CAROUSEL_QUERY = "(max-width: 47.98rem)";

/**
 * The home Projects cards. Below 768px: a native scroll-snap carousel, one card at a time
 * (85% of the viewport wide, so the next one peeks), with prev/next arrows and dots under
 * it, following the "Why Analytics & Strategy" carousel's pattern. From 768px: the
 * unchanged grid, with no arrows or dots. In print: the grid.
 *
 * The cards are server-rendered children; this component only lays them out and tracks
 * which one is in view (a scroll listener, read on the next frame, so nothing reflows).
 * The carousel roles and labels are set only while it is a carousel.
 */
export default function ProjectCarousel({ label, children }: { label: string; children: ReactNode }) {
  const slides = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [isCarousel, setIsCarousel] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(CAROUSEL_QUERY);
    const update = () => setIsCarousel(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // The card whose left edge is nearest the track's snap edge (its left padding);
        // at the end of the track, the last card.
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        if (atEnd) return setIndex(track.children.length - 1);
        const edge = track.scrollLeft + parseFloat(getComputedStyle(track).scrollPaddingLeft || "0");
        let closest = 0;
        let best = Infinity;
        Array.from(track.children).forEach((child, i) => {
          const d = Math.abs((child as HTMLElement).offsetLeft - edge);
          if (d < best) {
            best = d;
            closest = i;
          }
        });
        setIndex(closest);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
    };
  }, []);

  const goTo = (i: number) => {
    const track = trackRef.current;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    const child = track?.children[clamped] as HTMLElement | undefined;
    if (!track || !child) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad = parseFloat(getComputedStyle(track).scrollPaddingLeft || "0");
    track.scrollTo({ left: child.offsetLeft - pad, behavior: reduce ? "auto" : "smooth" });
    setIndex(clamped);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isCarousel) return;
    if (e.key === "ArrowRight") goTo(index + 1);
    else if (e.key === "ArrowLeft") goTo(index - 1);
    else if (e.key === "Home") goTo(0);
    else if (e.key === "End") goTo(slides.length - 1);
    else return;
    e.preventDefault();
  };

  // The Why carousel's arrow button, at 44px so it meets the tap-target size.
  const arrow =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-forest/40 bg-cream text-charcoal shadow-sm transition-opacity hover:bg-forest/10 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      role={isCarousel ? "region" : undefined}
      aria-roledescription={isCarousel ? "carousel" : undefined}
      aria-label={isCarousel ? label : undefined}
      className="mt-8"
    >
      <div className="relative">
        <div
          ref={trackRef}
          data-reveal-group
          tabIndex={isCarousel ? 0 : undefined}
          onKeyDown={onKeyDown}
          aria-label={isCarousel ? `${label}: use the arrow keys to move between cards` : undefined}
          className={[
            // Below 768px: a full-bleed horizontal track that snaps card by card. The side
            // padding and scroll padding keep the first card on the heading's left edge.
            "-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-6 scroll-px-6 pb-1 motion-safe:scroll-smooth",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
            // From 768px (and in print): the grid exactly as before.
            "md:mx-0 md:grid md:auto-rows-fr md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3",
            "print:mx-0 print:grid print:grid-cols-2 print:gap-5 print:overflow-visible print:px-0",
          ].join(" ")}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              role={isCarousel ? "group" : undefined}
              aria-roledescription={isCarousel ? "slide" : undefined}
              aria-label={isCarousel ? `${i + 1} of ${slides.length}` : undefined}
              className="w-[85vw] max-w-[30rem] shrink-0 snap-start md:w-auto md:max-w-none md:min-w-0 print:w-auto print:max-w-none"
            >
              {slide}
            </div>
          ))}
        </div>

      </div>

      {/* Under the track: prev arrow, dots, next arrow. The arrows sit here rather than
          over the cards (as in the Why carousel) so they never cover a chart. Dots: the
          current card is a brass bar, the others forest dots (3:1 or more on cream). */}
      <div className="mt-3 flex items-center justify-center gap-1 md:hidden print:hidden">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous project" className={arrow}>
          &larr;
        </button>
        {/* Each dot is a 36 x 44 button (the dot drawn inside it), so six fit between the
            arrows at 375px with no overlapping targets. */}
        <div className="flex items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to project ${i + 1} of ${slides.length}`}
              aria-current={i === index ? "true" : undefined}
              className="flex h-11 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                  i === index ? "w-4 bg-brass" : "w-1.5 bg-forest/60"
                }`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === slides.length - 1}
          aria-label="Next project"
          className={arrow}
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}

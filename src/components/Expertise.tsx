"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

// Each skill points at real work, with one figure checked against its source:
// - Arm: DCF Valuation!B48 ($51.54, implied share price) and B49 ($272.21,
//   "Current Market Price (Aug 10, 2026)").
// - Microsoft x Activision: Synergy Breakeven!B10 ($3,636.67M, required annual
//   pre-tax synergies, "Solves to EPS-neutral").
// - Nike: Scenario Dashboard!B42 ($439.45M cushion, base case, FY2028E), read
//   after a LibreOffice recalculation (the saved workbook has no cached values).
// - Caterpillar: Analysis!H15:I15 (CI dealer inventory change, $1,500M in
//   Q1 2026 and $400M in Q2 2026), quoted from the 10-Qs on Dealer Inventory.
// - 1,205 formula cells across the four preview workbooks (Caterpillar 234,
//   Arm 307, Microsoft x Activision 363, Nike 301), counted in the workbook XML;
//   735 tests in fpa-intelligence-engine, all passing at the engine's main.
// - Run 1 of 5 of the engine evaluation; the engine page states all five were
//   accepted on the first attempt.
// Images are Playwright captures of the built site (public/expertise).
const SKILLS = [
  {
    id: "dcf",
    name: "DCF valuation",
    proof: "My fundamentals-only DCF implies $51.54 a share for Arm, against a $272.21 market price on Aug 10, 2026.",
    image: "/expertise/arm-dcf.webp",
    alt: "Arm valuation workbook preview, From WACC to share price: a 9.8% WACC leads to a DCF-implied share price of $51.54 against a $272.21 current market price.",
    caption: "Arm Holdings: inside the valuation",
    href: "/projects/arm#inside-the-valuation",
  },
  {
    id: "mna",
    name: "M&A accretion / dilution",
    proof: "My model puts the annual pre-tax synergies Microsoft needs for the Activision deal to be EPS-neutral at $3.64B.",
    image: "/expertise/msft-deal-model.webp",
    alt: "Microsoft × Activision deal model preview: the accretion/dilution bridge, with pro forma EPS of $9.29 against $9.68 standalone, a 4.07% dilution.",
    caption: "Microsoft × Activision Blizzard: inside the deal model",
    href: "/projects/microsoft-activision#inside-the-deal-model",
  },
  {
    id: "three-statement",
    name: "Three-statement and scenario modeling",
    proof: "In my Nike base case, North America's growth covers Greater China's modeled decline by FY2028E with a $439M cushion.",
    image: "/expertise/nike-offset.webp",
    alt: "Nike model preview, Does North America offset Greater China: Greater China loses about $1.34B of revenue by FY2028E, North America needs 3.22% annual growth, the base case has 4.25%, a $439M cushion.",
    caption: "Nike: inside the model, scenario dashboard",
    href: "/projects/nike#inside-the-model",
  },
  {
    id: "demand",
    name: "Demand and inventory analysis",
    proof: "Caterpillar's disclosed Construction Industries dealer-inventory build fell from $1.5B in Q1 2026 to $400M in Q2 2026.",
    image: "/expertise/cat-dealer-inventory.webp",
    alt: "Caterpillar operating workbook preview, Analysis sheet: the CI dealer inventory change row shows 1,500 in Q1 2026 and 400 in Q2 2026 ($mm), with the Q2 cell linked to the Dealer Inventory sheet.",
    caption: "Caterpillar demand quality: model preview",
    href: "/projects/caterpillar-demand-quality#model-preview",
  },
  {
    id: "excel-python",
    name: "Excel and Python",
    proof: "About 1,200 live formulas across four workbooks, and the FP&A Intelligence Engine with 735 tests passing.",
    image: "/expertise/engine-trace.webp",
    alt: "FP&A Intelligence Engine trace: statement B1 of the accepted brief with the four sourced facts and the reconciliation it cites.",
    caption: "FP&A Intelligence Engine: trace a statement",
    href: "/projects/fpa-intelligence-engine#trace-a-statement",
  },
  {
    id: "ai",
    name: "AI / LLM tools",
    proof: "Accepted run 1 of 5 on a Caterpillar Q2 2026 benchmark. All five were accepted on the first attempt.",
    image: "/expertise/ai-accepted-brief.webp",
    alt: "The start of the engine's accepted Caterpillar Q2 2026 brief: statement B1, a fact linked to four facts and one reconciliation.",
    caption: "FP&A Intelligence Engine: accepted brief, run 1 of 5",
    href: "/projects/fpa-intelligence-engine#trace-a-statement",
  },
];

const AUTO_MS = 7000;
// Auto-advance only on wide screens with a fine pointer that can hover, and
// never with reduced motion.
const AUTO_QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

// Below 768px the rows are an accordion (globals: md breakpoint).
const PHONE_QUERY = "(max-width: 767px)";

/** The capture, at a fixed 4:3 so swapping or opening it never shifts the layout. */
function Shot({ skill, shown = true }: { skill: (typeof SKILLS)[number]; shown?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={skill.image}
      alt={shown ? skill.alt : ""}
      aria-hidden={shown ? undefined : true}
      width={1056}
      height={792}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover object-left-top transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

const FRAME = "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-forest/15 bg-white shadow-sm";
const LINK = "font-semibold text-forest hover:text-forest-dark";

/**
 * "Core Expertise" as a proof stage: each skill row shows a real capture of
 * the work behind it.
 *
 * From 768px the rows are tabs and the capture is their tabpanel. Clicking,
 * hovering or focusing a row selects it; arrow keys, Home and End move between
 * rows (roving tabindex). From 1024px the stage sits beside the rows and stays
 * vertically centred in the viewport (sticky) while they scroll; with a mouse
 * it advances every 7s while in view, pausing while the pointer or focus is in
 * the section. The images crossfade in a fixed 4:3 frame, so nothing shifts.
 *
 * Below 768px the rows are an accordion: the selected row opens to show its
 * capture, caption and link directly under its sentence, so the image is never
 * off-screen. If opening a row leaves its top off-screen (a row above it
 * closed), the page scrolls it back into view, smoothly unless reduced motion.
 *
 * Both patterns are in the DOM; CSS shows one, and the hidden one (display:
 * none) is out of the accessibility tree and the tab order.
 */
export default function Expertise() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const toggles = useRef<(HTMLButtonElement | null)[]>([]);
  const section = useRef<HTMLElement>(null);
  const paused = useRef(false);
  const opened = useRef<number | null>(null);

  useEffect(() => {
    const el = section.current;
    if (!el || !window.matchMedia(AUTO_QUERY).matches) return;
    let inView = false;
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), { threshold: 0.5 });
    observer?.observe(el);
    const id = window.setInterval(() => {
      if (inView && !paused.current && !document.hidden && window.matchMedia(AUTO_QUERY).matches) {
        setActive((i) => (i + 1) % SKILLS.length);
      }
    }, AUTO_MS);
    return () => {
      observer?.disconnect();
      window.clearInterval(id);
    };
  }, []);

  // Phones: after a row opens (before paint), bring its top back into view if
  // the row above that closed pushed it off-screen.
  useLayoutEffect(() => {
    const i = opened.current;
    opened.current = null;
    const row = i === null ? null : toggles.current[i];
    if (!row || !window.matchMedia(PHONE_QUERY).matches) return;
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const top = row.getBoundingClientRect().top;
    if (top >= headerBottom && top < window.innerHeight) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: window.scrollY + top - headerBottom - 12, behavior: reduce ? "instant" : "smooth" });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i + 1) % SKILLS.length
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (i - 1 + SKILLS.length) % SKILLS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? SKILLS.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  const skill = SKILLS[active];
  const rowName = (s: (typeof SKILLS)[number], i: number) => (
    <>
      <span className="flex items-start gap-2 text-base font-semibold text-charcoal">
        <span
          aria-hidden="true"
          className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${i === active ? "bg-brass" : "bg-forest/25"}`}
        />
        {s.name}
      </span>
      <span className="mt-1 block text-sm leading-6 text-charcoal-soft">{s.proof}</span>
    </>
  );
  const rowSurface = (i: number) => (i === active ? "border-forest/25 bg-white shadow-sm" : "border-transparent");
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-mist";

  return (
    <section
      ref={section}
      id="expertise"
      className="border-t border-forest/10 bg-mist"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) paused.current = false;
      }}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-28 sm:py-40 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8">
        <div className="order-1 lg:order-none lg:col-start-2">
          {/* A darker brass than the site's: brass on mist is 3.72:1; this is 4.70:1 (AA). */}
          <p className="text-sm font-semibold uppercase tracking-widest text-[#826136]">Core Expertise</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">Skills, with the proof.</h2>
        </div>

        {/* Phones: accordion. */}
        <div className="order-2 flex flex-col gap-2 md:hidden">
          {SKILLS.map((s, i) => (
            <div key={s.id} className={`rounded-xl border transition-colors ${rowSurface(i)}`}>
              <h3>
                <button
                  ref={(el) => {
                    toggles.current[i] = el;
                  }}
                  id={`expertise-row-${s.id}`}
                  type="button"
                  aria-expanded={i === active}
                  aria-controls={`expertise-panel-${s.id}`}
                  onClick={() => {
                    opened.current = i;
                    setActive(i);
                  }}
                  className={`w-full rounded-xl px-5 py-4 text-left ${focusRing}`}
                >
                  {rowName(s, i)}
                </button>
              </h3>
              <div
                id={`expertise-panel-${s.id}`}
                role="region"
                aria-labelledby={`expertise-row-${s.id}`}
                hidden={i !== active}
                className="px-5 pb-5"
              >
                <div className={FRAME}>{i === active && <Shot skill={s} />}</div>
                {/* Two caption lines reserved, so every open panel is the same height. */}
                <p className="mt-3 min-h-10 text-sm leading-5 text-charcoal-soft">{s.caption}</p>
                <Link href={s.href} className={`mt-1 inline-block text-sm ${LINK}`}>
                  See it in the project &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* From 768px: tabs and their panel. */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Skills"
          className="order-3 hidden flex-col gap-2 md:flex lg:order-none lg:col-start-2"
        >
          {SKILLS.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`expertise-tab-${s.id}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls="expertise-stage"
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`rounded-xl border px-5 py-4 text-left transition-colors ${focusRing} ${
                i === active ? rowSurface(i) : "border-transparent hover:bg-white/60"
              }`}
            >
              {rowName(s, i)}
            </button>
          ))}
        </div>

        {/* Sticky from 1024px: centred in the viewport (the frame is 3/4 of the
            column wide, plus about 2rem of caption), never under the header. */}
        <figure
          id="expertise-stage"
          role="tabpanel"
          aria-labelledby={`expertise-tab-${skill.id}`}
          className="order-2 hidden min-w-0 md:block lg:sticky lg:top-[max(5.5rem,calc(50vh-((min(100vw,72rem)-7rem)/2*0.75+2rem)/2))] lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start"
        >
          <div className={FRAME}>
            {SKILLS.map((s, i) => (
              <Shot key={s.id} skill={s} shown={i === active} />
            ))}
          </div>
          <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-charcoal-soft">{skill.caption}</span>
            <Link href={skill.href} className={LINK}>
              See it in the project &rarr;
            </Link>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

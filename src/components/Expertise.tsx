// "Core Expertise": the layout of the Oct 25 version (4d89fd5^, a vertical reel of cards
// beside the skills list) with the six skills and proof lines from 4ec43db^, unchanged.
// Server-rendered; the reel moves with CSS only (globals.css .reel-*), pauses on hover
// and focus, and stays still (and scrollable) under reduced motion and below 640px.
import Link from "next/link";

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
//   739 automated test cases in fpa-intelligence-engine (pytest's count), all passing
//   at the engine's main (c91e254).
// - Run 1 of 5 of the engine evaluation, the only run recorded on the site; it was
//   accepted on the first attempt, before the Oct 30, 2026 benchmark corrections.
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
    proof: "About 1,200 live formulas across four workbooks, and the FP&A Intelligence Engine with 739 automated test cases passing.",
    image: "/expertise/engine-trace.webp",
    alt: "FP&A Intelligence Engine trace: statement B1 of the accepted brief with the four sourced facts and the reconciliation it cites.",
    caption: "FP&A Intelligence Engine: trace a statement",
    href: "/projects/fpa-intelligence-engine#trace-a-statement",
  },
  {
    id: "ai",
    name: "AI / LLM tools",
    proof: "An AI-written brief on a Caterpillar Q2 2026 benchmark, accepted by deterministic checks on the first attempt (run 1, the run recorded on the site).",
    image: "/expertise/ai-accepted-brief.webp",
    alt: "The start of the engine's accepted Caterpillar Q2 2026 brief: statement B1, a fact linked to four facts and one reconciliation.",
    caption: "FP&A Intelligence Engine: accepted brief, run 1 of 5",
    href: "/projects/fpa-intelligence-engine#trace-a-statement",
  },
];

/** One reel card: the real screenshot, its caption, linking to the project section. */
function ReelCard({ skill, hidden = false }: { skill: (typeof SKILLS)[number]; hidden?: boolean }) {
  return (
    <Link
      href={skill.href}
      tabIndex={hidden ? -1 : undefined}
      className="group mb-4 block overflow-hidden rounded-2xl border border-forest/15 bg-white transition-colors hover:border-forest/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-mist"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={skill.image}
        alt={hidden ? "" : skill.alt}
        width={1056}
        height={792}
        loading="lazy"
        decoding="async"
        className="block aspect-[4/3] h-auto w-full object-cover object-left-top"
      />
      <span className="flex min-h-11 items-center justify-between gap-3 border-t border-forest/10 px-4 py-2.5 text-sm font-semibold text-forest">
        <span className="min-w-0">{skill.caption}</span>
        <span aria-hidden="true">&rarr;</span>
      </span>
    </Link>
  );
}

function VisualReel() {
  return (
    <div className="reel reel-mask relative mx-auto h-[520px] w-full max-w-md overflow-hidden">
      <div className="reel-track flex flex-col">
        {SKILLS.map((s) => (
          <ReelCard key={s.id} skill={s} />
        ))}
        {/* The second copy only completes the loop: hidden from assistive technology and
            the tab order, and not rendered when the reel stands still. */}
        <div className="reel-dup" aria-hidden="true" inert>
          {SKILLS.map((s) => (
            <ReelCard key={s.id} skill={s} hidden />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Expertise() {
  return (
    <section id="expertise" className="border-t border-forest/10 bg-mist">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-40">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <VisualReel />
          <div>
            {/* A darker brass than the site's: brass on mist is 3.72:1; this is 4.70:1 (AA). */}
            <p className="text-sm font-semibold uppercase tracking-widest text-[#826136]">Core Expertise</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">I build and test financial models.</h2>
            <ul className="mt-8 flex flex-col divide-y divide-forest/10">
              {SKILLS.map((s) => (
                <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="text-base font-semibold text-charcoal">{s.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-charcoal-soft">{s.proof}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

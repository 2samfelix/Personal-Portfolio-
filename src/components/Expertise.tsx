// "Core Expertise": a vertical reel of real work on the left, a short skills list on the
// right. Server-rendered; the reel advances one card about every 3.5 seconds with CSS
// only (globals.css .reel-*, plus the keyframes generated below for this card count),
// pauses on hover and focus, and stands still (and scrolls) under reduced motion,
// below 640px and in print.
//
// Every card is real: workbook screenshots (public/expertise, Playwright captures of the
// built site), project thumbnails (public/project-visuals, drawn from source data and
// checked by test:thumbnails), a verbatim snippet of the engine's code, and tool cards
// that carry a name and no data. The one logo is Python's, from the simple-icons package
// (CC0-1.0); the other tools are plain text labels.
import Link from "next/link";
import { siPython } from "simple-icons";
import thumbAlts from "@/lib/projectVisualAlts.generated.json";

const SKILLS = [
  { name: "Excel", line: "Financial modeling, valuation and scenario analysis" },
  { name: "Python", line: "Automation, testing and finance workflows" },
  { name: "SQL", line: "Project in progress" },
  { name: "Power BI", line: "Project in progress" },
  { name: "AI / LLM tools", line: "Prototyping and analysis support, with outputs checked by code" },
];

// fpa_engine/brief_validator.py, lines 204-211, at fpa-intelligence-engine main (c91e254).
const CODE_SNIPPET = `def matches_fact(token: NumberToken, fact: PacketFact) -> bool:
    """The token renders this fact: within its written rounding of the value, or equal to the canonical value
    rounded to the fact's display step (so "~510 bps" matches 509.07 shown at a 10 bps step)."""
    expressed = _expressed_with_step(fact, token.unit)
    if expressed is None:
        return False
    value, step = expressed
    return _close(token, value) or abs(token.value - abs(round_to_step(value, step))) <= EPSILON`;

type Card =
  | { kind: "image"; id: string; src: string; width: number; height: number; alt: string; caption: string; href: string; bg: string }
  | { kind: "code"; id: string; caption: string; href: string }
  | { kind: "tool"; id: string; name: string; note: string; inProgress?: boolean; python?: boolean };

const shot = (id: string, alt: string, caption: string, href: string): Card => ({
  kind: "image",
  id,
  src: `/expertise/${id}.webp`,
  width: 1056,
  height: 792,
  alt,
  caption,
  href,
  bg: "#ffffff",
});

// A project card thumbnail, letterboxed into the 4:3 frame on its own background colour.
const thumb = (slug: keyof typeof thumbAlts, caption: string, bg: string, width = 1280): Card => ({
  kind: "image",
  id: `thumb-${slug}`,
  src: `/project-visuals/${slug}.webp`,
  width,
  height: 800,
  alt: thumbAlts[slug],
  caption,
  href: `/projects/${slug}`,
  bg,
});

const CARDS: Card[] = [
  shot(
    "arm-dcf",
    "Arm valuation workbook preview, From WACC to share price: a 9.8% WACC leads to a DCF-implied share price of $51.54 against a $272.21 current market price.",
    "Arm Holdings: inside the valuation",
    "/projects/arm",
  ),
  { kind: "tool", id: "tool-excel", name: "Excel", note: "Financial modeling, valuation and scenario analysis" },
  thumb("caterpillar", "Caterpillar demand quality", "#ecdfc1"),
  { kind: "code", id: "code-validator", caption: "FP&A Intelligence Engine: brief_validator.py", href: "/projects/fpa-intelligence-engine" },
  shot(
    "msft-deal-model",
    "Microsoft × Activision deal model preview: the accretion/dilution bridge, with pro forma EPS of $9.29 against $9.68 standalone, a 4.07% dilution.",
    "Microsoft × Activision: inside the deal model",
    "/projects/microsoft-activision",
  ),
  { kind: "tool", id: "tool-python", name: "Python", note: "Automation, testing and finance workflows", python: true },
  thumb("monday-operating-plan", "monday.com Operating Plan", "#1e392c", 1360),
  shot(
    "cat-dealer-inventory",
    "Caterpillar operating workbook preview, Analysis sheet: the CI dealer inventory change row shows 1,500 in Q1 2026 and 400 in Q2 2026 ($mm), with the Q2 cell linked to the Dealer Inventory sheet.",
    "Caterpillar: model preview",
    "/projects/caterpillar-demand-quality",
  ),
  { kind: "tool", id: "tool-sql", name: "SQL", note: "Project in progress", inProgress: true },
  thumb("fpa-intelligence-engine", "FP&A Intelligence Engine: validation lab", "#ffffff"),
  shot(
    "nike-offset",
    "Nike model preview, Does North America offset Greater China: Greater China loses about $1.34B of revenue by FY2028E, North America needs 3.22% annual growth, the base case has 4.25%, a $439M cushion.",
    "Nike: scenario dashboard",
    "/projects/nike",
  ),
  { kind: "tool", id: "tool-powerbi", name: "Power BI", note: "Project in progress", inProgress: true },
  shot(
    "engine-trace",
    "FP&A Intelligence Engine trace: statement B1 of the accepted brief with the four sourced facts and the reconciliation it cites.",
    "FP&A Intelligence Engine: trace a statement",
    "/projects/fpa-intelligence-engine",
  ),
  thumb("nike", "Nike: North America scenarios", "#f6f1e7"),
  shot(
    "ai-accepted-brief",
    "The start of the engine's accepted Caterpillar Q2 2026 brief: statement B1, a fact linked to four facts and one reconciliation.",
    "FP&A Intelligence Engine: accepted brief",
    "/projects/fpa-intelligence-engine",
  ),
];

const STEP_SECONDS = 3.5;
const MOVE_SECONDS = 0.6;

/** Keyframes that hold each card at the top of the reel, then move up one slot. Every
 *  card has the same height, and the track holds the cards twice, so one slot is
 *  100% / (2 × count) of the track and the loop ends exactly where it began. */
function reelKeyframes(count: number): string {
  const frames: string[] = [];
  const hold = ((STEP_SECONDS - MOVE_SECONDS) / STEP_SECONDS) * (100 / count);
  for (let i = 0; i < count; i++) {
    const start = (i * 100) / count;
    const y = (-100 * i) / (2 * count);
    frames.push(`${start.toFixed(4)}%,${(start + hold).toFixed(4)}%{transform:translateY(${y.toFixed(4)}%)}`);
  }
  frames.push(`100%{transform:translateY(-50%)}`);
  return (
    `@keyframes reel-step{${frames.join("")}}` +
    `@media screen and (prefers-reduced-motion:no-preference) and (min-width:640px){` +
    `.reel-track{animation:reel-step ${count * STEP_SECONDS}s ease-in-out infinite}}`
  );
}

const FRAME = "block aspect-[4/3] w-full overflow-hidden";
// One line and a fixed height from 640px, where the reel moves and every card must be the
// same height; below that the reel stands still and long captions wrap.
const CAPTION =
  "flex min-h-12 items-center justify-between gap-3 border-t border-forest/10 px-4 py-2 text-sm font-semibold text-forest sm:h-12 sm:py-0";

function ReelCard({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  const shell = "reel-card mb-4 block overflow-hidden rounded-2xl border border-forest/15 bg-white";
  if (card.kind === "tool") {
    return (
      <div className={shell}>
        <div className={`${FRAME} flex flex-col items-center justify-center gap-4 bg-cream px-6 text-center`}>
          {card.python && (
            <svg viewBox="0 0 24 24" width={56} height={56} aria-hidden="true" fill={`#${siPython.hex}`}>
              <path d={siPython.path} />
            </svg>
          )}
          <span className="text-3xl font-black tracking-tight text-charcoal">{card.name}</span>
          {card.inProgress && (
            <span className="rounded-full bg-charcoal px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cream">
              In progress
            </span>
          )}
        </div>
        <span className={`${CAPTION} !font-medium !text-charcoal-soft`}>
          <span className="min-w-0 sm:truncate">{card.inProgress ? `${card.name}: project in progress` : card.note}</span>
        </span>
      </div>
    );
  }
  const linkClass = `${shell} group transition-colors hover:border-forest/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-mist`;
  const caption = (
    <span className={CAPTION}>
      <span className="min-w-0 sm:truncate">{card.caption}</span>
      <span aria-hidden="true">&rarr;</span>
    </span>
  );
  if (card.kind === "code") {
    return (
      <Link href={card.href} tabIndex={hidden ? -1 : undefined} className={linkClass}>
        <span className={`${FRAME} bg-forest-dark p-3 sm:p-4`}>
          <span className="block font-mono text-[10px] font-semibold text-brass-light sm:text-[11px]">
            fpa_engine/brief_validator.py
          </span>
          <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.4] text-cream sm:mt-2 sm:text-[10.5px] sm:leading-[1.45]">
            <code>{CODE_SNIPPET}</code>
          </pre>
        </span>
        {caption}
      </Link>
    );
  }
  return (
    <Link href={card.href} tabIndex={hidden ? -1 : undefined} className={linkClass}>
      <span className={`${FRAME} flex items-center`} style={{ backgroundColor: card.bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.src}
          alt={hidden ? "" : card.alt}
          width={card.width}
          height={card.height}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-contain"
        />
      </span>
      {caption}
    </Link>
  );
}

function VisualReel() {
  return (
    <div className="reel reel-mask relative mx-auto h-[520px] w-full max-w-md overflow-hidden pt-12">
      <style>{reelKeyframes(CARDS.length)}</style>
      <div className="reel-track flex flex-col">
        {CARDS.map((c) => (
          <ReelCard key={c.id} card={c} />
        ))}
        {/* The second copy only completes the loop: hidden from assistive technology and
            the tab order, and not rendered when the reel stands still. */}
        <div className="reel-dup" aria-hidden="true" inert>
          {CARDS.map((c) => (
            <ReelCard key={c.id} card={c} hidden />
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
                <li key={s.name} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4">
                  <h3 className="shrink-0 text-base font-semibold text-charcoal sm:w-36">{s.name}</h3>
                  <p className="text-sm leading-6 text-charcoal-soft">{s.line}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

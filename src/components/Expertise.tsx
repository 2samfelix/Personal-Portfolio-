// "Core Expertise": a slim vertical reel of real work beside a five-row skills list.
// Server-rendered. The reel scrolls up slowly and continuously with CSS only (globals.css
// .reel-*): the cards are listed twice, so moving the track up by half of its height
// loops without a seam. It pauses on hover and focus; under reduced motion and in print
// it stands still and shows the first three cards.
//
// Every card is real: crops of the workbook previews (public/expertise/cards, cut from
// the Playwright captures by scripts/crop-expertise-cards.mjs), project thumbnails
// (public/project-visuals, drawn from source data and checked by test:thumbnails),
// seven verbatim lines of the engine's validator, and tool cards that carry a name and
// no data. Icons: Python's mark from simple-icons (CC0-1.0); everything else is a generic
// lucide glyph (ISC). No logo is drawn here.
import Link from "next/link";
import type { ReactNode } from "react";
import { ChartColumn, Database, Sparkles, Table } from "lucide-react";
import { siPython } from "simple-icons";
import thumbAlts from "@/lib/projectVisualAlts.generated.json";

function PythonMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d={siPython.path} />
    </svg>
  );
}

const ICON: Record<string, (size: number) => ReactNode> = {
  excel: (s) => <Table size={s} strokeWidth={1.75} aria-hidden="true" />,
  python: (s) => <PythonMark size={s} />,
  sql: (s) => <Database size={s} strokeWidth={1.75} aria-hidden="true" />,
  powerbi: (s) => <ChartColumn size={s} strokeWidth={1.75} aria-hidden="true" />,
  ai: (s) => <Sparkles size={s} strokeWidth={1.75} aria-hidden="true" />,
};

const SKILLS = [
  { id: "excel", name: "Excel", line: "Financial modeling, valuation and scenario analysis" },
  { id: "python", name: "Python", line: "Automation, testing and finance workflows" },
  { id: "sql", name: "SQL", line: "Querying SEC disclosures and relational financial datasets", inProgress: true },
  { id: "powerbi", name: "Power BI", line: "Visualizing variance bridges and operational KPIs", inProgress: true },
  { id: "ai", name: "AI / LLM tools", line: "Prototyping and analysis support, with outputs checked by code" },
];

// fpa_engine/brief_validator.py, lines 674-680 (validate_statements), at
// fpa-intelligence-engine main (c91e254), shown without their shared 4-space indent.
const CODE_LINES = `for s in statements:
    if _check_references(s, ctx, errors):
        _check_kind(s, ctx, errors)
        _check_prose(s, ctx, errors)
        _check_assumptions(s, ctx, errors)
        _check_voice(s, ctx, errors)
        _check_numbers(s, ctx, errors)`;

type Card =
  | { kind: "sheet"; id: string; src: string; width: number; height: number; alt: string; caption: string; href: string }
  | { kind: "thumb"; id: string; slug: keyof typeof thumbAlts; width: number; caption: string; position: string }
  | { kind: "code"; id: string }
  | { kind: "tool"; id: string; icon: string; name: string; inProgress?: boolean };

// Thumbnails are cropped to a wide band through the chart (object-position picks it).
// Mixed so that no two cards of a kind sit next to each other, the loop's seam included.
const CARDS: Card[] = [
  {
    kind: "sheet",
    id: "arm",
    src: "/expertise/cards/arm-dcf.webp",
    width: 558,
    height: 149,
    alt: "Arm DCF Valuation rows: implied equity value $54,842, diluted shares 1,064.1, implied share price $51.54, current market price $272.21, DCF implied value vs. current price −81.1%.",
    caption: "Arm · DCF implied price vs. market",
    href: "/projects/arm",
  },
  { kind: "thumb", id: "t-cat", slug: "caterpillar", width: 1280, caption: "Caterpillar · CI sales bridge", position: "50% 30%" },
  { kind: "tool", id: "excel", icon: "excel", name: "Excel" },
  {
    kind: "sheet",
    id: "msft",
    src: "/expertise/cards/msft-deal-model.webp",
    width: 476,
    height: 140,
    alt: "Microsoft × Activision accretion/dilution rows: pro forma net income $69,382, diluted shares 7,472.0, pro forma diluted EPS $9.29, standalone diluted EPS $9.68, EPS accretion (dilution) (4.1%).",
    caption: "Microsoft × Activision · EPS bridge",
    href: "/projects/microsoft-activision",
  },
  { kind: "thumb", id: "t-monday", slug: "monday-operating-plan", width: 1360, caption: "monday.com · revenue growth", position: "50% 45%" },
  { kind: "code", id: "code" },
  {
    kind: "sheet",
    id: "nike",
    src: "/expertise/cards/nike-offset.webp",
    width: 570,
    height: 152,
    alt: "Nike Scenario Dashboard rows: base-case FY2028E North America revenue $22,290, base-case North America annualized growth 4.25%, cushion over the required revenue $439.",
    caption: "Nike · does North America offset China?",
    href: "/projects/nike",
  },
  { kind: "tool", id: "python", icon: "python", name: "Python" },
  { kind: "thumb", id: "t-engine", slug: "fpa-intelligence-engine", width: 1280, caption: "FP&A Engine · detection map", position: "50% 40%" },
  {
    kind: "sheet",
    id: "trace",
    src: "/expertise/cards/engine-trace.webp",
    width: 462,
    height: 150,
    alt: "FP&A Intelligence Engine trace, fact S01: CI segment sales $8,346M, Q2 2026, scope CI, benchmark cell Construction Industries!I5, source 2Q 2026 Earnings Release.",
    caption: "FP&A Engine · a sourced fact",
    href: "/projects/fpa-intelligence-engine",
  },
  { kind: "tool", id: "sql", icon: "sql", name: "SQL", inProgress: true },
  { kind: "thumb", id: "t-nike", slug: "nike", width: 1280, caption: "Nike · North America scenarios", position: "50% 55%" },
  { kind: "tool", id: "powerbi", icon: "powerbi", name: "Power BI", inProgress: true },
  { kind: "thumb", id: "t-msft", slug: "msft", width: 1280, caption: "Microsoft × Activision · diluted EPS", position: "50% 35%" },
];

const THUMB_HREF: Record<string, string> = {
  caterpillar: "/projects/caterpillar-demand-quality",
  "monday-operating-plan": "/projects/monday-operating-plan",
  "fpa-intelligence-engine": "/projects/fpa-intelligence-engine",
  nike: "/projects/nike",
  msft: "/projects/microsoft-activision",
};

const SHELL =
  "reel-card mb-2 block h-[7.5rem] overflow-hidden rounded-md border border-forest/15 bg-white shadow-[0_1px_3px_rgba(42,40,32,0.08)]";
const LINK =
  "transition-colors hover:border-forest/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-mist";
const CAPTION = "flex h-8 items-center border-t border-forest/10 px-3 text-[0.6875rem] font-semibold text-forest";

function ReelCard({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  const tab = hidden ? -1 : undefined;
  if (card.kind === "tool") {
    return (
      <div className={`${SHELL} flex items-center gap-3 px-5`}>
        <span className="text-forest">{ICON[card.icon](28)}</span>
        <span className="text-lg font-bold tracking-tight text-charcoal">{card.name}</span>
        {card.inProgress && (
          <span className="ml-auto rounded-full bg-brass-pale px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-brass-ink">
            In progress
          </span>
        )}
      </div>
    );
  }
  if (card.kind === "code") {
    return (
      <Link href="/projects/fpa-intelligence-engine" tabIndex={tab} className={`${SHELL} ${LINK} !bg-forest px-3 py-2.5`}>
        <span className="block font-mono text-[0.625rem] text-brass-light">brief_validator.py · lines 674–680</span>
        <pre className="mt-1 overflow-hidden font-mono text-[0.5625rem] leading-[1.35] text-cream">
          <code>{CODE_LINES}</code>
        </pre>
        <span className="sr-only">FP&amp;A Intelligence Engine: the validator&apos;s checks, in its source code</span>
      </Link>
    );
  }
  if (card.kind === "thumb") {
    return (
      <Link href={THUMB_HREF[card.slug]} tabIndex={tab} className={`${SHELL} ${LINK}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/project-visuals/${card.slug}.webp`}
          alt={hidden ? "" : thumbAlts[card.slug]}
          width={card.width}
          height={800}
          loading="lazy"
          decoding="async"
          className="block h-[5.375rem] w-full object-cover"
          style={{ objectPosition: card.position }}
        />
        <span className={CAPTION}>
          <span className="truncate">{card.caption}</span>
        </span>
      </Link>
    );
  }
  return (
    <Link href={card.href} tabIndex={tab} className={`${SHELL} ${LINK}`}>
      <span className="flex h-[5.375rem] items-center justify-center px-2 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.src}
          alt={hidden ? "" : card.alt}
          width={card.width}
          height={card.height}
          loading="lazy"
          decoding="async"
          className="block h-auto max-h-full w-auto max-w-full"
        />
      </span>
      <span className={CAPTION}>
        <span className="truncate">{card.caption}</span>
      </span>
    </Link>
  );
}

function VisualReel() {
  return (
    <div className="reel reel-mask relative h-[16.25rem] w-full overflow-hidden md:h-[23.75rem] md:w-[18.75rem]">
      <div className="reel-track flex flex-col">
        {CARDS.map((c) => (
          <ReelCard key={c.id} card={c} />
        ))}
        {/* The second copy only completes the loop: hidden from assistive technology and
            the tab order, and not shown when the reel stands still. */}
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
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-6 py-12 md:grid-cols-[300px_minmax(0,1fr)] md:gap-12 md:py-20 lg:gap-20">
        <VisualReel />
        <div>
          {/* A darker brass than the site's: brass on mist is 3.72:1; this is 4.70:1 (AA). */}
          <p className="text-sm font-semibold uppercase tracking-widest text-[#826136]">Core Expertise</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">I build and test financial models.</h2>
          <ul className="mt-6">
            {SKILLS.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-t border-forest/15 py-3 first:border-t-0">
                <span className="shrink-0 text-forest">{ICON[s.id](24)}</span>
                <h3 className="flex shrink-0 items-center gap-2 text-base font-semibold text-charcoal">
                  {s.name}
                  {"inProgress" in s && s.inProgress && (
                    <span className="rounded-full bg-brass-pale px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-brass-ink">
                      In progress
                    </span>
                  )}
                </h3>
                <p className="ml-auto text-right text-sm leading-5 text-charcoal-soft">{s.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

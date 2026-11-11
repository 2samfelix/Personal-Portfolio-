/**
 * Company logos, as supplied by the site owner (public/logos/; never recoloured, redrawn or
 * resampled). A project with no entry here shows no logo and no trademark note.
 *
 * Files: caterpillar.webp, arm.png and monday.png are byte for byte as supplied. microsoft.webp
 * and activision.webp are lossless crops of public/logos/originals/*-original.webp to the mark's
 * bounding box plus 8 px of the file's own transparent margin (integer crop, saved as lossless
 * WebP; pixel-identical to that region of the original). The originals are kept as supplied.
 *
 * Each image is drawn at a fixed height with its own proportions (the width and height
 * attributes reserve the box, so nothing shifts as it loads). Plain <img>, not next/image,
 * so the browser gets the file as stored rather than a re-encoded copy.
 *
 * Not shown, on purpose:
 * - FP&A Intelligence Engine: not a company analysis.
 * - Nike: no logo file was supplied.
 *
 * Microsoft × Activision Blizzard shows a pair, Microsoft then Activision.
 */
import type React from "react";

type Mark = {
  company: string;
  src: string;
  /** Intrinsic size of the file, in pixels. */
  width: number;
  height: number;
};

type Entry = {
  /** As named in the trademark note. */
  name: string;
  /** One logo, or a pair shown "A × B". */
  marks: Mark[];
};

const LOGOS: Record<string, Entry> = {
  "caterpillar-demand-quality": {
    name: "Caterpillar",
    marks: [{ company: "Caterpillar", src: "/logos/caterpillar.webp", width: 2000, height: 1125 }],
  },
  arm: { name: "Arm", marks: [{ company: "Arm", src: "/logos/arm.png", width: 300, height: 175 }] },
  "monday-operating-plan": {
    name: "monday.com",
    marks: [{ company: "monday.com", src: "/logos/monday.png", width: 740, height: 121 }],
  },
  "microsoft-activision": {
    name: "Microsoft or Activision Blizzard",
    marks: [
      { company: "Microsoft", src: "/logos/microsoft.webp", width: 1584, height: 352 },
      { company: "Activision", src: "/logos/activision.webp", width: 1979, height: 492 },
    ],
  },
};

/** Logo heights in CSS px. A pair is drawn shorter than a single logo so it stays on one line;
 * below 368 px wide (320-360 px phones) it steps down once more so it still fits. */
const SIZES = {
  card: { single: 22, pair: 16, pairNarrow: 12 },
  page: { single: 30, pair: 24, pairNarrow: 18 },
} as const;

export function companyFor(slug: string): string | null {
  return LOGOS[slug]?.name ?? null;
}

/** One logo. `height` sets the width/height attributes (the reserved box and its aspect ratio);
 * a pair sizes itself from the --logo-h CSS variable instead, with width following the ratio. */
function MarkImg({ mark, height, fluid = false }: { mark: Mark; height: number; fluid?: boolean }) {
  const width = Math.round((mark.width / mark.height) * height);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mark.src}
      alt={`${mark.company} logo`}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className="block shrink-0"
      style={fluid ? { height: "var(--logo-h)", width: "auto" } : { height, width }}
    />
  );
}

/** The project's logo (or "A × B" pair) at the card or page size; nothing if none. */
export function CompanyLogo({ slug, size }: { slug: string; size: keyof typeof SIZES }) {
  const entry = LOGOS[slug];
  if (!entry) return null;
  if (entry.marks.length === 1) return <MarkImg mark={entry.marks[0]} height={SIZES[size].single} />;
  const { pair, pairNarrow } = SIZES[size];
  return (
    // One line, never wrapping. The "×" is the title's own separator, muted and hidden from
    // screen readers (each logo has its own alt text); a space's width either side, as in the title.
    <span
      className="flex shrink-0 flex-nowrap items-center gap-[calc(var(--logo-h)*0.28)] whitespace-nowrap [--logo-h:var(--logo-h-wide)] max-[368px]:[--logo-h:var(--logo-h-narrow)]"
      style={{ "--logo-h-wide": `${pair}px`, "--logo-h-narrow": `${pairNarrow}px` } as React.CSSProperties}
    >
      {entry.marks.map((mark, i) => (
        <span key={mark.src} className="flex items-center gap-[calc(var(--logo-h)*0.28)]">
          {i > 0 && (
            <span aria-hidden="true" className="text-[length:calc(var(--logo-h)*0.9)] leading-none text-charcoal-soft">
              ×
            </span>
          )}
          <MarkImg mark={mark} height={pair} fluid />
        </span>
      ))}
    </span>
  );
}

/** "Company analyzed" row for the top of a project page, on a plain light background. */
export function CompanyAnalyzed({ slug, className = "" }: { slug: string; className?: string }) {
  if (!LOGOS[slug]) return null;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">Company analyzed</span>
      <CompanyLogo slug={slug} size="page" />
    </div>
  );
}

/** The one-line trademark note for the bottom of a project page that shows a logo. */
export function CompanyDisclaimer({ slug, className = "" }: { slug: string; className?: string }) {
  const company = companyFor(slug);
  if (!company) return null;
  return (
    <p className={`text-sm leading-6 text-charcoal-soft ${className}`}>
      Independent analysis built from public filings; not affiliated with or endorsed by {company}. Company names and logos
      are trademarks of their owners and are shown only to identify the company analyzed.
    </p>
  );
}

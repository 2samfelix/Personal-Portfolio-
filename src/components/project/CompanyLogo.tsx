/**
 * Company logos, as supplied by the site owner (public/logos/, byte for byte; never recoloured,
 * cropped or re-encoded). A project with no entry here shows no logo and no disclaimer.
 *
 * Each image is drawn at a fixed height with its own proportions (the width and height
 * attributes reserve the box, so nothing shifts as it loads). Plain <img>, not next/image,
 * so the browser gets the original file rather than a re-encoded copy.
 *
 * Not shown, on purpose:
 * - FP&A Intelligence Engine: not a company analysis.
 * - Nike: no logo file was supplied.
 * - Microsoft × Activision: public/logos/microsoft.avif is saved, but its mark is 193 x 49 px
 *   inside a 380 x 213 white frame, so at card size (22 px) the wordmark would be about 5 px
 *   tall. The file cannot be cropped, so it stays off until a tighter version is supplied.
 *   No Activision file was supplied.
 */
type Logo = {
  company: string;
  src: string;
  /** Intrinsic size of the file, in pixels. */
  width: number;
  height: number;
};

const LOGOS: Record<string, Logo> = {
  "caterpillar-demand-quality": { company: "Caterpillar", src: "/logos/caterpillar.webp", width: 2000, height: 1125 },
  arm: { company: "Arm", src: "/logos/arm.png", width: 300, height: 175 },
  "monday-operating-plan": { company: "monday.com", src: "/logos/monday.png", width: 740, height: 121 },
};

export function companyFor(slug: string): string | null {
  return LOGOS[slug]?.company ?? null;
}

/** The logo at a fixed CSS height (22 px on cards, 30 px on project pages); nothing if none. */
export function CompanyLogo({ slug, height, className = "" }: { slug: string; height: number; className?: string }) {
  const logo = LOGOS[slug];
  if (!logo) return null;
  const width = Math.round((logo.width / logo.height) * height);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt={`${logo.company} logo`}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={`block shrink-0 ${className}`}
      style={{ height, width }}
    />
  );
}

/** "Company analyzed" row for the top of a project page, on a plain light background. */
export function CompanyAnalyzed({ slug, className = "" }: { slug: string; className?: string }) {
  if (!LOGOS[slug]) return null;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-widest text-charcoal-soft">Company analyzed</span>
      <CompanyLogo slug={slug} height={30} />
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

import Link from "next/link";
import type { Project } from "@/lib/projects";

const VERIFICATION_STRIP = [
  { value: "8", label: "Quarters analysed, Q3 2024 – Q2 2026" },
  { value: "32 / 32", label: "Segment bridges reconcile to zero" },
  { value: "0", label: "Assumed figures" },
  { value: "16", label: "Comparability issues logged and tested" },
];

const EVIDENCE_ROWS: [string, string, string][] = [
  ["Disclosed CI dealer-inventory build", "$1.5B", "$400M"],
  ["Management driver named first", "dealer inventories", "end users"],
  ["Adjusted reported-vs-retail gap", "24.3 pts", "7.8 pts"],
  ["Retail sales growth to end users", "7%", "22%"],
  ["Reported CI sales growth", "38.1%", "34.8%"],
];

// Q2 2026's 340 bps is the figure SOURCED verbatim from the Q2 2026 earnings
// call (CFO Kyle Epley); the $284M dollar drag is DERIVED from it, not the
// other way around. 343 (the bps recomputed back from the rounded $284M) is
// a rounding artifact of that conversion and is not the disclosed number —
// do not substitute it back in.
const MARGIN_ROWS: [string, string, string, string][] = [
  ["Reported segment margin", "14.9%", "21.4%", "23.3%"],
  ["Disclosed tariff drag, $m", "420", "362", "284"],
  ["Tariff drag, bps of margin", "604", "509", "340"],
  ["Margin excluding that drag, derived", "20.9%", "26.5%", "26.7%"],
];

// Workbook source: Analysis tab, rows 40-43, columns B-I. Only four of the
// eight quarters carry a disclosed dollar figure to test the gap against;
// the other four (B, C, E, G) have no row 41/42 values in the workbook and
// are omitted here rather than shown as blank or zero. Q3 2025 (column F)
// has no disclosed dollar figure either, but Caterpillar's narrative
// disclosure (an increase against a prior-year decrease) is carried through
// explicitly per row 47's verdict — not coerced into a number or left blank.
// The Verdict row is reformatted (not reworded) from the workbook's own
// per-quarter notes: Q1 2025 from row 45, Q3 2025 from row 47, Q1 2026 from
// row 48, Q2 2026 from row 46.
const PRESSURE_TEST_ROWS: [string, string, string, string, string][] = [
  ["Implied stocking swing", "−$1,078M", "+$233M", "+$1,258M", "+$485M"],
  [
    "Disclosed build, this quarter",
    "$100M",
    "Increase (no dollar disclosed)",
    "$1,500M",
    "$400M",
  ],
  [
    "Disclosed build, prior-year quarter",
    "$1,400M",
    "Decrease (no dollar disclosed)",
    "slight decrease (unquantified)",
    "decrease (unquantified)",
  ],
  ["Scope", "Company-wide", "—", "CI", "CI"],
  [
    "Verdict",
    "FITS — 83% of the company-wide swing",
    "Sign agrees; magnitude untestable",
    "UNDERSTATES by roughly $290M",
    "FITS — $485M implied vs $400M disclosed build; prior-year decrease unquantified",
  ],
];

const LIMITATIONS = [
  "The reported-vs-retail gap is directional and relative, not a precise dealer-inventory dollar measure.",
  "Q2 2026 retail strength is a single observation and needs H2 confirmation.",
  "Segment-level dealer-inventory dollars are not disclosed continuously, so no unbroken eight-quarter series exists at either scope.",
];

const DOCS_BASE =
  "https://github.com/2samfelix/Personal-Portfolio-/blob/main/caterpillar-demand-quality/docs";

// Exhibits render at a 620px floor width below the 720px breakpoint (see the
// horizontal-scroll treatment). Below that breakpoint the SVG's own baked-in
// title/subtitle region is cropped out of the scrollable viewport — shifted
// up via a negative margin sized from the SVG's own viewBox geometry — and
// replaced by native HTML text above it, so the title is never clipped and
// never duplicated. At 720px and up the crop is removed and the SVG renders
// exactly as authored.
//
// The title/subtitle props below are a second copy of text already baked
// into each SVG as <text class="ttl">/<text class="sub"> elements, and the
// two are never visible at the same time (HTML below 720px, SVG at and
// above), so they can silently drift if one is edited without the other.
// Run `npm run verify:caterpillar-exhibits` after touching either side —
// it diffs these props against the actual <text> content of the SVGs in
// public/caterpillar/ and fails if they no longer match verbatim.
const EXHIBIT_RENDER_WIDTH = 620;
const EXHIBIT_NATURAL_WIDTH = 760;
const CROP_SCALE = EXHIBIT_RENDER_WIDTH / EXHIBIT_NATURAL_WIDTH;

function ExhibitFigure({
  src,
  alt,
  eyebrow,
  title,
  subtitle,
  naturalHeight,
  headerHeight,
}: {
  src: string;
  alt: string;
  eyebrow: string;
  /** Must match the SVG's `<text class="ttl">` content verbatim — see the note above. */
  title: string;
  /** Must match the SVG's `<text class="sub">` content verbatim (joined with a single space if the SVG splits it across lines) — see the note above. */
  subtitle: string;
  /**
   * The SVG's own `viewBox` height, in user units. Depends entirely on that
   * exhibit's internal layout — if the SVG is regenerated with a taller or
   * shorter canvas, this silently goes stale and the mobile crop will be
   * wrong. Read it from the SVG's `viewBox="0 0 W H"` attribute.
   */
  naturalHeight: number;
  /**
   * The y-coordinate (SVG user units) below which the plot/footer content
   * begins — i.e., how much of the top of the SVG is the title+subtitle
   * block being cropped out on mobile. Depends on the number of subtitle
   * lines in that specific SVG (one line ≈ 70, two lines ≈ 86 in this
   * family of exhibits) and silently goes stale if a subtitle wraps to a
   * different number of lines, as Exhibit 4's did this week. Re-derive by
   * reading the y of the last title/subtitle `<text>` element in the SVG
   * and adding a small margin before the first gridline.
   */
  headerHeight: number;
}) {
  const croppedHeight = Math.round((naturalHeight - headerHeight) * CROP_SCALE);
  const headerOffset = Math.round(headerHeight * CROP_SCALE);

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass">{eyebrow}</p>
      <div className="mt-3 rounded-xl border border-forest/15 bg-white p-4 sm:p-6">
        {/* Mobile-only title/subtitle: hidden at >=720px, where the SVG carries its own. */}
        <div className="min-[720px]:hidden">
          <p className="text-base font-semibold text-charcoal">{title}</p>
          <p className="mb-3 mt-1 text-xs leading-5 text-charcoal-soft">{subtitle}</p>
        </div>
        <div
          className="overflow-x-auto overflow-y-hidden min-[720px]:!h-auto min-[720px]:overflow-y-visible"
          style={{ height: croppedHeight }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full min-w-[620px] min-[720px]:!mt-0"
            style={{ marginTop: -headerOffset }}
          />
        </div>
      </div>
      <p className="mt-1.5 text-right text-xs italic text-charcoal-soft min-[720px]:hidden">
        Swipe to view chart &rarr;
      </p>
    </div>
  );
}

export default function CaterpillarProjectPage({
  project,
  prev,
  next,
}: {
  project: Project;
  prev: Project;
  next: Project;
}) {
  const cs = project.caseStudy!;
  const pdfDeliverable = cs.deliverables.find((d) => d.format === "PDF");
  const xlsxDeliverable = cs.deliverables.find((d) => d.format === "XLSX");

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link href="/#work" className="text-sm font-semibold text-forest hover:text-forest-dark">
          &larr; Back to Projects
        </Link>

        {/* 1. Question + one-sentence finding */}
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">{project.category}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">{project.title}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-charcoal-soft">
            <span className="font-semibold text-charcoal">Question: </span>
            {cs.question}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {project.tools.map((tool) => (
              <span
                key={tool}
                className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-forest"
              >
                {tool}
              </span>
            ))}
            <span className="ml-2 text-xs text-charcoal-soft">{project.year}</span>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-forest/20 bg-forest/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Finding</p>
          <p className="mt-3 text-xl font-semibold leading-8 text-charcoal">
            Caterpillar&apos;s Construction Industries growth was still heavily supported by dealer restocking in
            Q1 2026, but by Q2 the mix had shifted materially toward end-user demand.
          </p>
        </div>

        {/* 2. Verification strip */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VERIFICATION_STRIP.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-forest/15 bg-white p-4">
              <span className="block text-2xl font-black text-charcoal">{stat.value}</span>
              <span className="mt-1 block text-xs leading-5 text-charcoal-soft">{stat.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-charcoal-soft">
          A bridge is Caterpillar&apos;s own disclosed volume, price realization, currency and inter-segment
          components reconciled against its reported sales change, tested for each of four segments across eight
          quarters. Reconciliation demonstrates internal consistency with those components, not that the right
          line items were chosen.
        </p>

        {/* 3. Hero demand-quality chart */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Demand Quality</h2>
          {/*
            title/subtitle must match exhibit-2-demand-quality-gap.svg's own
            <text class="ttl">/<text class="sub"> verbatim — see the note on
            ExhibitFigure. headerHeight=70: single-line subtitle ending ~y=52,
            plus margin before the first gridline at y=102.8. Verify with
            `npm run verify:caterpillar-exhibits`.
          */}
          <ExhibitFigure
            eyebrow="Exhibit 2"
            src="/caterpillar/exhibit-2-demand-quality-gap.svg"
            alt="Construction Industries price-adjusted sales growth against retail sales to end users, eight quarters. The gap narrowed from 24.3 points in Q1 2026 to 7.8 points in Q2 2026."
            title="The shipping-to-retail gap narrowed from 24.3 points to 7.8 in Q2 2026"
            subtitle="Construction Industries, year-over-year growth. Band = shipments above retail: a directional read on dealer stocking."
            naturalHeight={452}
            headerHeight={70}
          />
          <p className="mt-6 text-base font-semibold text-charcoal">Q1 2025 is the control case</p>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            The same pattern runs the other way a year earlier. Retail sales to end users rose 3% while
            price-adjusted CI shipments fell 13.8%, as dealer inventory accumulation slowed sharply. That
            historical quarter is why I treat the reported-vs-retail gap as a directional signal rather than a
            story fitted to Q1 and Q2 2026.
          </p>
        </section>

        {/* 4. Q1 2026 vs Q2 2026 evidence table */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Q1 2026 vs. Q2 2026 — What Changed
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-forest/15 bg-white">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-forest/15">
                  <th className="px-4 py-3 font-semibold text-charcoal">Construction Industries</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q1 2026</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q2 2026</th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE_ROWS.map(([label, q1, q2]) => (
                  <tr key={label} className="border-b border-forest/10 last:border-0">
                    <td className="px-4 py-3 text-charcoal-soft">{label}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q1}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-charcoal-soft">
            Reported growth barely moved. What produced it changed.
          </p>
          <div className="mt-4 rounded-xl border-l-4 border-brass bg-brass-pale/40 px-4 py-3 text-sm leading-6 text-charcoal">
            Read the reported-vs-retail gap as a <span className="font-bold">directional</span> indicator of
            dealer stocking, not as an exact dollar measurement of inventory. The two disclosures differ in price
            basis, scope, the treatment of parts and services, and possibly currency.
          </div>
        </section>

        {/* Pressure test: does the directional proxy hold up? */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Does the Directional Proxy Hold Up?
          </h2>
          <p className="mt-3 text-sm leading-6 text-charcoal-soft">
            I pressure-tested the reported-vs-retail signal against the four quarters where Caterpillar disclosed
            dealer-inventory changes. The direction agrees in all four, but the magnitude does not reconcile
            precisely, and this is not an accounting identity. In Q1 2026 the gap-based estimate of $1,258M falls
            roughly $290M short of the implied year-over-year swing — Caterpillar&apos;s disclosed $1.5B
            Construction Industries build against a slight decrease in the prior-year quarter. Price-basis
            differences explain part of that shortfall, while parts/services, currency and other scope
            differences prevent a precise reconciliation. Disclosure scope is not fully like-for-like across the
            four tests, so the result supports direction rather than a precise segment-level reconciliation.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-forest/15 bg-white">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-forest/15">
                  <th className="px-4 py-3 font-semibold text-charcoal">Construction Industries</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q1 2025</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q3 2025</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q1 2026</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q2 2026</th>
                </tr>
              </thead>
              <tbody>
                {PRESSURE_TEST_ROWS.map(([label, q1_25, q3_25, q1_26, q2_26]) => (
                  <tr key={label} className="border-b border-forest/10 last:border-0">
                    <td className="px-4 py-3 text-charcoal-soft">{label}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q1_25}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q3_25}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q1_26}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q2_26}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-charcoal-soft">
            Source: underlying workbook Analysis tab, based on Caterpillar dealer-inventory disclosures. Q1 2025
            compares a CI-derived estimate against a company-wide disclosure; CI-level dollars were not disclosed
            that quarter. Q3 2025 is testable on direction only; no dollar amount was disclosed.
          </p>
        </section>

        {/* 5. Dealer-inventory disclosure record */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Filed Evidence: What Caterpillar Actually Disclosed
          </h2>
          {/*
            title/subtitle must match exhibit-3-dealer-inventory-record.svg's
            own <text class="ttl">/<text class="sub"> verbatim — see the note
            on ExhibitFigure. headerHeight=70: single-line subtitle ending
            ~y=52, plus margin before the first gridline at y=112.1. Verify
            with `npm run verify:caterpillar-exhibits`.
          */}
          <ExhibitFigure
            eyebrow="Exhibit 3"
            src="/caterpillar/exhibit-3-dealer-inventory-record.svg"
            alt="Disclosed dealer-inventory change by quarter. The Construction Industries build collapsed from 1.5 billion dollars in Q1 2026 to 400 million in Q2 2026."
            title="Construction Industries dealer build collapsed from $1.5B to $0.4B in Q2 2026"
            subtitle="Disclosed dealer-inventory change. Every quarter has two slots; a hatched stub means that figure was never disclosed."
            naturalHeight={456}
            headerHeight={70}
          />
          <p className="mt-6 text-base font-semibold text-charcoal">Why this matters</p>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            The $1.5B → $400M decline is the hardest evidence in the analysis because it comes directly from
            Caterpillar&apos;s disclosed Construction Industries dealer-inventory figures. Showing all eight
            quarters also makes clear where dollar disclosure exists and where it does not; missing disclosure is
            not treated as zero.
          </p>
        </section>

        {/* 6. Operating drivers */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Operating Drivers: What Produced the Reported Sales Change
          </h2>
          {/*
            title/subtitle must match exhibit-4-operating-bridge.svg's own
            <text class="ttl">/<text class="sub"> verbatim (the SVG splits the
            subtitle across two <text> lines at y=52/y=68; join with a single
            space here) — see the note on ExhibitFigure. headerHeight=86:
            two-line subtitle ending ~y=68, plus margin before the first
            gridline at y=119.4. This changed from 70 to 86 when the v2 fix
            wrapped the subtitle onto two lines — re-check it any time this
            SVG is regenerated. Verify with
            `npm run verify:caterpillar-exhibits`.
          */}
          <ExhibitFigure
            eyebrow="Exhibit 4"
            src="/caterpillar/exhibit-4-operating-bridge.svg"
            alt="Construction Industries sales change by component, eight quarters. Volume produces the 2026 growth; price realization turns positive only in 2026."
            title="Volume produces the 2026 growth; price turns positive only in 2026"
            subtitle="Construction Industries sales change against the prior-year quarter, $ millions. Stacked bars are component contributions; the diamond is the net reported change."
            naturalHeight={452}
            headerHeight={86}
          />
          <p className="mt-6 text-base font-semibold text-charcoal">Why this matters</p>
          <p className="mt-2 text-sm leading-6 text-charcoal-soft">
            Volume, not price, produced the 2026 sales growth. Price realization was negative through Q4 2025 and
            turned positive only in Q1 2026. That makes the demand-quality question central: the key issue is
            where the additional volume went — to end users or into dealer inventory.
          </p>
        </section>

        {/* 7. Forward judgment */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Forward Judgment: What This Implies, and What Would Break It
          </h2>
          <p className="mt-2 text-xs italic leading-5 text-charcoal-soft">
            Stated as inference, not finding. All three describe H2 2026, which had not been reported when this
            was written.
          </p>
          <p className="mt-4 text-base leading-7 text-charcoal-soft">
            If Caterpillar follows through on the expected dealer-inventory drawdown while end-user demand
            remains healthy, dealer stocking should contribute less to reported CI growth in H2 2026. Reported
            growth should therefore move closer to retail growth, or temporarily trail it during destocking.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-r-lg border-l-4 border-forest bg-forest/5 p-4">
              <h3 className="text-sm font-bold text-charcoal">Strengthens the thesis</h3>
              <p className="mt-1 text-sm leading-6 text-charcoal-soft">
                Retail growth remains elevated while dealer inventory growth continues to slow or turns negative.
              </p>
            </div>
            <div className="rounded-r-lg border-l-4 border-rust bg-rust-pale p-4">
              <h3 className="text-sm font-bold text-charcoal">Weakens the thesis</h3>
              <p className="mt-1 text-sm leading-6 text-charcoal-soft">
                Retail growth falls materially in H2 while dealer inventories draw down, suggesting Q2&apos;s 22%
                was a temporary spike rather than evidence of durable end demand.
              </p>
            </div>
            <div className="rounded-r-lg border-l-4 border-charcoal-soft/50 bg-mist p-4">
              <h3 className="text-sm font-bold text-charcoal">Alternative: demand pull-forward</h3>
              <p className="mt-1 text-sm leading-6 text-charcoal-soft">
                Positive tariff-related price realization may have encouraged some customers to purchase earlier
                than planned, inflating Q2 retail at the expense of H2. A hypothesis, not a proven fact. H2 retail
                behaviour should distinguish durable demand from pull-forward.
              </p>
            </div>
          </div>
        </section>

        {/* 8. Margin context */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Margin Context, and What the Analysis Cannot Claim
          </h2>
          <p className="mt-3 text-sm leading-6 text-charcoal-soft">
            The Q4 2025 margin trough was driven largely by tariff costs rather than an underlying efficiency or
            cost-control deterioration, and the 2026 recovery is partly that pressure receding.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-forest/15 bg-white">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-forest/15">
                  <th className="px-4 py-3 font-semibold text-charcoal">Construction Industries</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q4 2025</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q1 2026</th>
                  <th className="px-4 py-3 text-right font-semibold text-charcoal">Q2 2026</th>
                </tr>
              </thead>
              <tbody>
                {MARGIN_ROWS.map(([label, q4, q1, q2]) => (
                  <tr key={label} className="border-b border-forest/10 last:border-0">
                    <td className="px-4 py-3 text-charcoal-soft">{label}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q4}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q1}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{q2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-charcoal-soft">
            Q4 2025 and Q1 2026 drags are dollar figures disclosed in the earnings releases. Q2 2026 is sourced as
            340 bps from the Q2 2026 earnings call and converted to dollars here.{" "}
            <span className="font-bold">
              Ex-tariff margin is an upper bound on underlying performance
            </span>
            : the price realization that lifted it was taken partly to recover the same tariff costs. Separately,
            Q2 2026 consolidated operating profit included $392m of one-time IEEPA tariff recoveries, which the
            CFO stated sat mostly in corporate items — CI segment margin is unaffected by them.
          </p>
          <p className="mt-2 text-xs leading-5 text-charcoal-soft">
            Caterpillar 4Q 2025, 1Q 2026 and 2Q 2026 earnings releases and Q2 2026 earnings call
          </p>
        </section>

        {/* 9. What I expected to corroborate — and didn't */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            What I Expected to Corroborate — and Didn&apos;t
          </h2>
          <p className="mt-3 text-sm leading-6 text-charcoal-soft">
            I expected inventory-heavy Q1 2026 growth to show up as unusually weak cash conversion. It
            didn&apos;t — Q1 is seasonally weak and Q1 2026 operating cash flow was stronger than Q1 2025, so cash
            flow does not independently confirm the stocking thesis. It is reported here because leaving it out
            would be selective.
          </p>
        </section>

        {/* 10. Limitations / methodology / sources */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Limitations, Methodology &amp; Sources
          </h2>
          <ul className="mt-4 flex flex-col gap-1.5">
            {LIMITATIONS.map((item) => (
              <li
                key={item}
                className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-6 text-charcoal-soft">
            Financial figures are sourced to Caterpillar and SEC filings wherever available: quarterly earnings
            releases Q3 2024 – Q2 2026, Ex 99.2 Rolling 3-Month Retail Sales Statistics, and the Q1 and Q2 2026
            Forms 10-Q (accessions 0000018230-26-000021 and -000046). Management commentary not reproduced in a
            filing is identified as earnings-call commentary and supported by transcript sources. No third-party
            estimates or analyst summaries are used as financial inputs.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <a href={`${DOCS_BASE}/methodology.md`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-forest hover:text-forest-dark">
              Methodology &rarr;
            </a>
            <a href={`${DOCS_BASE}/sources.md`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-forest hover:text-forest-dark">
              Sources &rarr;
            </a>
            <a href={`${DOCS_BASE}/definitions.md`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-forest hover:text-forest-dark">
              Definitions &rarr;
            </a>
          </div>
        </section>

        {/* 11. Download links */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Downloads</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {pdfDeliverable && (
              <a
                href={pdfDeliverable.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
              >
                Download PDF &rarr;
              </a>
            )}
            {xlsxDeliverable && (
              <a
                href={xlsxDeliverable.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
              >
                Download Workbook &rarr;
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
              >
                View GitHub Folder &#8599;
              </a>
            )}
          </div>
        </section>

        {/* Prev / Next */}
        <nav className="mt-16 flex items-center justify-between border-t border-forest/10 pt-8">
          <Link href={`/projects/${prev.slug}`} className="text-sm font-semibold text-charcoal-soft hover:text-charcoal">
            &larr; Previous Project
          </Link>
          <Link href={`/projects/${next.slug}`} className="text-sm font-semibold text-charcoal-soft hover:text-charcoal">
            Next Project &rarr;
          </Link>
        </nav>
      </div>
    </main>
  );
}

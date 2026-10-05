import Link from "next/link";
import type { Project } from "@/lib/projects";

const VERIFICATION_STRIP = [
  { value: "8", label: "Quarters analysed, Q3 2024 – Q2 2026" },
  { value: "32 / 32", label: "Segment bridges reconcile to zero" },
  { value: "4", label: "Classification levels on every figure" },
  { value: "16", label: "Comparability issues logged and tested" },
];

const EVIDENCE_ROWS: [string, string, string][] = [
  ["Disclosed CI dealer-inventory build", "$1.5B", "$400M"],
  ["Management driver named first", "dealer inventories", "end users"],
  ["Adjusted reported-vs-retail gap", "24.3 pts", "7.8 pts"],
  ["Retail sales growth to end users", "7%", "22%"],
  ["Reported CI sales growth", "38.1%", "34.8%"],
];

const MARGIN_ROWS: [string, string, string, string][] = [
  ["Reported segment margin", "14.9%", "21.4%", "23.3%"],
  ["Disclosed tariff drag, $m", "420", "362", "284"],
  ["Tariff drag, bps of margin", "604", "509", "343"],
  ["Margin excluding that drag, derived", "~20.9%", "~26.5%", "~26.7%"],
];

const LIMITATIONS = [
  "The reported-vs-retail gap is directional and relative, not a precise dealer-inventory dollar measure.",
  "Q2 2026 retail strength is a single observation and needs H2 confirmation.",
  "Segment-level dealer-inventory dollars are not disclosed continuously, so no unbroken eight-quarter series exists at either scope.",
];

const DOCS_BASE =
  "https://github.com/2samfelix/Personal-Portfolio-/blob/main/caterpillar-demand-quality/docs";

function ExhibitFigure({
  src,
  alt,
  eyebrow,
}: {
  src: string;
  alt: string;
  eyebrow: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-brass">{eyebrow}</p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-forest/15 bg-white p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full min-w-[620px]" />
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
          <ExhibitFigure
            eyebrow="Exhibit 2"
            src="/caterpillar/exhibit-2-demand-quality-gap.svg"
            alt="Construction Industries price-adjusted sales growth against retail sales to end users, eight quarters. The gap narrowed from 24.3 points in Q1 2026 to 7.8 points in Q2 2026."
          />
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

        {/* 5. Dealer-inventory disclosure record */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Filed Evidence: What Caterpillar Actually Disclosed
          </h2>
          <ExhibitFigure
            eyebrow="Exhibit 3"
            src="/caterpillar/exhibit-3-dealer-inventory-record.svg"
            alt="Disclosed dealer-inventory change by quarter. The Construction Industries build collapsed from 1.5 billion dollars in Q1 2026 to 400 million in Q2 2026."
          />
        </section>

        {/* 6. Operating drivers */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">
            Operating Drivers: What Produced the Reported Sales Change
          </h2>
          <ExhibitFigure
            eyebrow="Exhibit 4"
            src="/caterpillar/exhibit-4-operating-bridge.svg"
            alt="Construction Industries sales change by component, eight quarters. Volume produces the 2026 growth; price realization turns positive only in 2026."
          />
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
            The Q4 2025 margin trough was a tariff cost shock rather than operating deterioration, and the 2026
            recovery is partly that shock receding.
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

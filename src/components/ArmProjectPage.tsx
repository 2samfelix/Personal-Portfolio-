import Link from "next/link";
import type { Project } from "@/lib/projects";
import {
  COMPARABLE_SET_NOTE,
  CURRENT_EV_REVENUE,
  CURRENT_MARKET_PRICE,
  DCF_GRID,
  DCF_GROWTH_COLS,
  DCF_LIMITATIONS,
  DCF_LIVE_GROWTH_COL,
  DCF_LIVE_WACC_ROW,
  DCF_FY2031_REVENUE,
  DCF_TERMINAL_EV_REVENUE,
  DCF_TERMINAL_VALUE,
  DCF_WACC_ROWS,
  FOOTBALL_FIELD,
  LICENSE_CAGR,
  LICENSE_REVENUE,
  PRICE_PATH,
  RETURN_DECOMPOSITION,
  REVENUE_MIX_PERIODS,
  ROYALTY_CAGR,
  ROYALTY_REVENUE,
} from "@/lib/armChartData";
import {
  DCFHeatmap,
  FootballFieldChart,
  MilestoneChart,
  ReturnDecompositionChart,
  TwoLineChart,
  formatUsd,
  formatUsdCompact,
} from "@/components/arm/ArmCharts";

const formatIcon: Record<string, string> = {
  XLSX: "📊",
  PDF: "📄",
  PPTX: "📑",
  DOCX: "📝",
};

const DELIVERABLE_DETAIL: Record<string, string> = {
  "Valuation Model":
    "12 tabs, every input color-coded — blue for assumptions and source-reported figures, black for formulas, green for cross-sheet links — with sources cited next to each figure.",
  "Full Report":
    "The full write-up: IPO transaction overview, comparable company analysis, IPO valuation, post-IPO performance and return decomposition, DCF cross-check, and strategic risk assessment.",
  "Executive Summary":
    "The one-page version — thesis, key findings, and the recommendation, without the supporting detail.",
  "Strategy Deck":
    "A slide walkthrough of the transaction, the comps, the valuation range, and the return decomposition.",
};

const ANSWER =
  "No, and not close. Three independent fundamentals-based methods — the 2023 comparable-company analysis, the actual IPO transaction, and a 2026 DCF built entirely on today's actuals — cluster between $43 and $52, with the DCF landing at $51.54. The market prices Arm at $272.21, roughly 5.3x that cluster.";

const TAKEAWAY =
  "Arm priced at $51.00 against a comp-implied range of roughly $43–$45 per ADS — an 11–15% premium to the closest public comparables that looks conservative, not aggressive, in hindsight. Arm's 5.34x total return since IPO decomposes into 1.67x from EPS growth and 3.20x from P/E expansion: the market re-rated the business roughly twice as much as it grew, which means today's shares carry more re-rating risk than the IPO price did.";

type BadgeTone = "good" | "neutral" | "bad";

const TONE_CLASS: Record<BadgeTone, string> = {
  good: "bg-forest/10 text-forest",
  neutral: "bg-brass/15 text-brass",
  bad: "bg-rust-pale text-rust",
};

const ALERT_STYLE: Record<BadgeTone, string> = {
  good: "bg-forest/5 text-charcoal",
  neutral: "bg-brass-pale text-brass",
  bad: "bg-rust-pale text-rust",
};

function ChartCaption({
  statLabel,
  statValue,
  deltaText,
  badgeLabel,
  badgeTone,
  alertLead,
  alertText,
  explainer,
}: {
  statLabel: string;
  statValue: string;
  deltaText: string;
  badgeLabel: string;
  badgeTone: BadgeTone;
  alertLead: string;
  alertText: string;
  explainer: string;
}) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-forest/15 bg-white px-4 py-3">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">{statLabel}</span>
          <span className="text-xl font-bold text-charcoal">{statValue}</span>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[badgeTone]}`}>
          {badgeLabel}
        </span>
        <span className="ml-auto text-sm font-semibold text-charcoal-soft">{deltaText}</span>
      </div>
      <div className={`rounded-xl px-4 py-2.5 text-sm leading-6 ${ALERT_STYLE[badgeTone]}`}>
        <span className="font-bold">{alertLead}</span> {alertText}
      </div>
      <p className="text-xs leading-5 text-charcoal-soft">{explainer}</p>
    </div>
  );
}

function ChartSection({ label, children, first = false }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <section className={`rounded-xl border border-forest/15 bg-white p-4 sm:p-6 ${first ? "" : "mt-6"}`}>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">{label}</h2>
      {children}
    </section>
  );
}

export default function ArmProjectPage({ project, prev, next }: { project: Project; prev: Project; next: Project }) {
  const cs = project.caseStudy!;

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link href="/#work" className="text-sm font-semibold text-forest hover:text-forest-dark">
          &larr; Back to Projects
        </Link>

        {/* Hero */}
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">{project.category}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">{project.title}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-charcoal-soft">
            <span className="font-semibold text-charcoal">Question: </span>
            {cs.question}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {project.tools.map((tool) => (
              <span key={tool} className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-forest">
                {tool}
              </span>
            ))}
            <span className="ml-2 text-xs text-charcoal-soft">{project.year}</span>
          </div>
        </div>

        {/* Answer */}
        <div className="mt-10 rounded-2xl border border-forest/20 bg-forest/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Answer</p>
          <p className="mt-3 text-xl font-semibold leading-8 text-charcoal">{ANSWER}</p>
        </div>

        {/* Takeaway */}
        <div className="mt-6 rounded-2xl border border-forest/15 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Takeaway</p>
          <p className="mt-3 text-lg font-medium leading-8 text-charcoal">{TAKEAWAY}</p>
        </div>

        {/* Headline chart */}
        <div className="mt-10">
          <ChartSection label="Valuation Football Field: IPO Price vs. Comp-Implied Range vs. Market" first>
            <FootballFieldChart
              items={FOOTBALL_FIELD}
              marketPrice={CURRENT_MARKET_PRICE}
              ariaLabel="Valuation football field: full peer median $35.00, core IP/EDA average $43.41, peer 75th percentile $45.22, actual IPO $51.00, DCF implied $51.54, and current market price $272.21"
            />
            <ChartCaption
              statLabel="DCF-Implied Value (2026)"
              statValue={formatUsd(51.54)}
              deltaText={`Market is ${(CURRENT_MARKET_PRICE / 51.54).toFixed(1)}x this`}
              badgeLabel="Cluster holds"
              badgeTone="neutral"
              alertLead="Five fundamentals-based methods cluster within $17 of each other."
              alertText={`Full peer median ($35.00, IPO Valuation!E16), core IP/EDA average ($43.41, IPO Valuation!E17), peer 75th percentile ($45.22, CCA!L27 / IPO Valuation!B18), the actual IPO price ($51.00), and a 2026 fundamentals-only DCF ($51.54, DCF Valuation!B48) all land between $35 and $52. The market price, $272.21, sits ${(CURRENT_MARKET_PRICE / 51.54).toFixed(1)}x above the DCF figure and outside every comp-based range in this analysis.`}
              explainer="Each comp-based method applies its own EV/Revenue multiple to Arm's FY2023A revenue, then backs into an implied share price using the IPO-date share count and net cash position."
            />
          </ChartSection>
        </div>

        {/* Deliverables */}
        <section className="mt-10 border-t border-forest/10 pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Deliverables</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal-soft">
            Every number and chart on this page traces back to a specific cell in the model below —
            open it and check the assumptions yourself. The willingness to be audited is part of the signal.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cs.deliverables.map((d) => (
              <a
                key={d.label}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-forest/15 bg-white p-4 transition-colors hover:border-forest/35"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{formatIcon[d.format]}</span>
                    <span>
                      <span className="block text-sm font-semibold text-charcoal">{d.label}</span>
                      <span className="block text-xs uppercase tracking-wide text-charcoal-soft">{d.format}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-forest">{d.format === "PDF" ? "Open →" : "Download →"}</span>
                </span>
                {DELIVERABLE_DETAIL[d.label] && <span className="text-xs leading-5 text-charcoal-soft">{DELIVERABLE_DETAIL[d.label]}</span>}
              </a>
            ))}
          </div>

          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
            >
              View GitHub Repository &#8599;
            </a>
          )}
        </section>

        {/* Overview */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Overview</h2>
          <p className="mt-3 text-base leading-7 text-charcoal-soft">{cs.overview}</p>
        </section>

        {/* Methodology */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Business Question &amp; Methodology</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-charcoal">Data Sources</h3>
              <p className="mt-2 text-sm leading-6 text-charcoal-soft">{cs.dataSources}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-charcoal">Modeling Approach</h3>
              <p className="mt-2 text-sm leading-6 text-charcoal-soft">{cs.approach}</p>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-charcoal">Major Assumptions</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {cs.assumptions.map((item) => (
                <li key={item} className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-charcoal">Comparable Set</h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">{COMPARABLE_SET_NOTE}</p>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-charcoal">Limitations (DCF Cross-Check)</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {DCF_LIMITATIONS.map((item) => (
                <li key={item} className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Key findings */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Key Findings</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {cs.findings.map((finding) => (
              <li key={finding} className="rounded-xl border border-forest/15 bg-white p-4 text-sm leading-6 text-charcoal-soft">
                {finding}
              </li>
            ))}
          </ul>
        </section>

        {/* Supporting charts */}
        <section className="mt-12 border-t border-forest/10 pt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Supporting Analysis</h2>

          <div className="mt-4">
            <ChartSection label="Return Decomposition: Price = EPS × P/E" first>
              <ReturnDecompositionChart
                totalReturn={RETURN_DECOMPOSITION.totalReturn}
                epsGrowth={RETURN_DECOMPOSITION.epsGrowth}
                peExpansion={RETURN_DECOMPOSITION.peExpansion}
                evRevenueCheck={RETURN_DECOMPOSITION.evRevenueExpansion}
              />
              <ChartCaption
                statLabel="Total Return Since IPO"
                statValue={`${RETURN_DECOMPOSITION.totalReturn.toFixed(2)}x`}
                deltaText={`${RETURN_DECOMPOSITION.epsGrowth.toFixed(2)}x × ${RETURN_DECOMPOSITION.peExpansion.toFixed(2)}x`}
                badgeLabel="Re-rating led"
                badgeTone="neutral"
                alertLead="Multiple expansion did more work than earnings growth."
                alertText={`Price = EPS × P/E is an exact identity, not an approximation: ${RETURN_DECOMPOSITION.epsGrowth.toFixed(2)}x from EPS growth times ${RETURN_DECOMPOSITION.peExpansion.toFixed(2)}x from P/E expansion multiplies to ${RETURN_DECOMPOSITION.checkProduct.toFixed(2)}x (Post-IPO Performance!B60:B63) — matching the total return exactly. EV/Revenue expanded an independent, closely matching ${RETURN_DECOMPOSITION.evRevenueExpansion.toFixed(2)}x (Post-IPO Performance!D55), corroborating the P/E-based read with a second multiple.`}
                explainer="Rendered as three plain bars rather than a waterfall, since the two factors multiply rather than sum — summing 1.67x and 3.20x would land on 4.87x, not the actual 5.34x total return."
              />
            </ChartSection>

            <ChartSection label="Revenue Mix Since IPO: License & Other vs. Royalty">
              <TwoLineChart
                periods={REVENUE_MIX_PERIODS}
                series={[
                  { key: "license", label: "License & Other", stroke: "#96703e", swatchClass: "bg-brass", values: LICENSE_REVENUE },
                  { key: "royalty", label: "Royalty", stroke: "#1e3a2b", swatchClass: "bg-forest", values: ROYALTY_REVENUE },
                ]}
                ariaLabel="License and other revenue vs royalty revenue, FY2023A through FY2026A"
                valueFormatter={(v) => `$${v.toFixed(0)}mm`}
              />
              <ChartCaption
                statLabel="Royalty Revenue, FY2026A"
                statValue={`$${ROYALTY_REVENUE[ROYALTY_REVENUE.length - 1].toLocaleString("en-US")}mm`}
                deltaText={`License CAGR ${(LICENSE_CAGR * 100).toFixed(1)}% vs Royalty CAGR ${(ROYALTY_CAGR * 100).toFixed(1)}%`}
                badgeLabel="Both grew"
                badgeTone="good"
                alertLead="Both sides of the business expanded."
                alertText={`License & Other revenue grew at a ${(LICENSE_CAGR * 100).toFixed(1)}% CAGR (Post-IPO Performance!F8) while royalty revenue grew at ${(ROYALTY_CAGR * 100).toFixed(1)}% (Post-IPO Performance!F9) — evidence Arm won new designs while continuing to monetize its installed base, rather than growth coming from only one side of the model.`}
                explainer="License & Other includes upfront licensing fees; Royalty is the recurring per-unit revenue on shipped Arm-based chips."
              />
            </ChartSection>

            <ChartSection label="Post-IPO Price Path">
              <MilestoneChart
                points={PRICE_PATH}
                ariaLabel="Arm share price path: $51 at IPO, $63.59 first-day close, $129.50 at lock-up expiry, $272.21 as of August 10, 2026"
              />
              <ChartCaption
                statLabel="Current Price (Aug 10, 2026)"
                statValue={formatUsd(CURRENT_MARKET_PRICE)}
                deltaText={`${(CURRENT_MARKET_PRICE / 51).toFixed(2)}x IPO price`}
                badgeLabel="Re-rated"
                badgeTone="neutral"
                alertLead="Most of the move came after the lock-up, not on day one."
                alertText="Day-one demand was real (+24.7% to $63.59, Post-IPO Performance!C19) but modest next to the move since: shares more than doubled again to $129.50 by the March 2024 lock-up expiry (Post-IPO Performance!C20), then more than doubled again to $272.21 by August 2026 (Post-IPO Performance!C46)."
                explainer="Milestones: IPO price, first trading-day close, IPO lock-up expiry close, and the most recent price used throughout this analysis."
              />
            </ChartSection>

            <ChartSection label="DCF Sensitivity: Implied Share Price by WACC and Terminal Growth">
              <DCFHeatmap waccRows={DCF_WACC_ROWS} growthCols={DCF_GROWTH_COLS} grid={DCF_GRID} liveRow={DCF_LIVE_WACC_ROW} liveCol={DCF_LIVE_GROWTH_COL} />
              <ChartCaption
                statLabel="Implied Terminal EV / Revenue"
                statValue={`${DCF_TERMINAL_EV_REVENUE.toFixed(1)}x`}
                deltaText={`vs. ${CURRENT_EV_REVENUE.toFixed(1)}x today`}
                badgeLabel="Terminal value drives the result"
                badgeTone="bad"
                alertLead="No fundamentals-based terminal assumption gets near today's price."
                alertText={`The $51.54 DCF value rests on a perpetuity terminal value of ${formatUsdCompact(DCF_TERMINAL_VALUE)} on FY2031E revenue of ${formatUsdCompact(DCF_FY2031_REVENUE)} — an implied terminal EV/Revenue of about ${DCF_TERMINAL_EV_REVENUE.toFixed(1)}x, for a business the market currently prices at ${CURRENT_EV_REVENUE.toFixed(1)}x (Post-IPO Performance!C55). Three independent methods — a 2023 comp analysis, the actual transaction, and this 2026 fundamentals-only DCF — all land between $43 and $52. The distance to $272 is the market capitalizing a narrative, not a modeling error.`}
                explainer="The workbook also carries an exit-multiple cross-check (DCF Valuation!B38), but its formula multiplies 20x by FY2030E revenue rather than FY2031E, the final explicit forecast year — producing a terminal value roughly 3x the perpetuity figure through a column-reference error, not genuine corroboration. It's excluded from this page."
              />
            </ChartSection>
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

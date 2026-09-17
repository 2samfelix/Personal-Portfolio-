import Link from "next/link";
import type { Project } from "@/lib/projects";
import {
  BREAKEVEN,
  CASH_BY_SCENARIO,
  CONSOLIDATED_REVENUE_BY_SCENARIO,
  EPS_CONSENSUS,
  FORECAST_ONLY,
  GREATER_CHINA_REVENUE,
  HISTORY_AND_FORECAST,
  MARGIN_BRIDGE_STEPS,
  MODEL_LIMITATIONS,
  NORTH_AMERICA_REVENUE,
} from "@/lib/nikeChartData";
import {
  MarginBridgeWaterfall,
  MultiSeriesLineChart,
  SegmentTrajectoryChart,
  formatNikeBillions,
  formatNikePercent,
} from "@/components/nike/NikeCharts";

const formatIcon: Record<string, string> = {
  XLSX: "📊",
  PDF: "📄",
  PPTX: "📑",
  DOCX: "📝",
};

const DELIVERABLE_DETAIL: Record<string, string> = {
  "Financial Model":
    "8 linked tabs — historicals, assumptions with a Bull/Base/Bear toggle, segment revenue build, margin bridge, balance sheet, cash flow, and a scenario dashboard. The balance sheet balances to $0 in all three scenarios.",
  "Full Report":
    "The full write-up: methodology, segment forecast, margin bridge, breakeven analysis, scenario stress test, and the consensus comparison.",
  "Executive Summary":
    "The one-page version — thesis, four key findings, and the recommendation, without the supporting detail.",
};

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
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-charcoal-soft">
            {statLabel}
          </span>
          <span className="text-xl font-bold text-charcoal">{statValue}</span>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[badgeTone]}`}
        >
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

function ChartSection({
  label,
  children,
  first = false,
}: {
  label: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-forest/15 bg-white p-4 sm:p-6 ${first ? "" : "mt-6"}`}>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">{label}</h2>
      {children}
    </section>
  );
}

export default function NikeProjectPage({
  project,
  prev,
  next,
}: {
  project: Project;
  prev: Project;
  next: Project;
}) {
  const cs = project.caseStudy!;

  const naSeries = HISTORY_AND_FORECAST.map((p) => NORTH_AMERICA_REVENUE[p]);
  const gcSeries = HISTORY_AND_FORECAST.map((p) => GREATER_CHINA_REVENUE[p]);

  const revenueFan = [
    { key: "bull", label: "Bull", stroke: "#96703e", dash: "7 5", swatchClass: "bg-brass", values: FORECAST_ONLY.map((p) => CONSOLIDATED_REVENUE_BY_SCENARIO.bull[p]) },
    { key: "base", label: "Base", stroke: "#1e3a2b", swatchClass: "bg-forest", values: FORECAST_ONLY.map((p) => CONSOLIDATED_REVENUE_BY_SCENARIO.base[p]) },
    { key: "bear", label: "Bear", stroke: "#a1462f", dash: "2 5", swatchClass: "bg-rust", values: FORECAST_ONLY.map((p) => CONSOLIDATED_REVENUE_BY_SCENARIO.bear[p]) },
  ];

  const cashFan = [
    { key: "bull", label: "Bull", stroke: "#96703e", dash: "7 5", swatchClass: "bg-brass", values: FORECAST_ONLY.map((p) => CASH_BY_SCENARIO.bull[p]) },
    { key: "base", label: "Base", stroke: "#1e3a2b", swatchClass: "bg-forest", values: FORECAST_ONLY.map((p) => CASH_BY_SCENARIO.base[p]) },
    { key: "bear", label: "Bear", stroke: "#a1462f", dash: "2 5", swatchClass: "bg-rust", values: FORECAST_ONLY.map((p) => CASH_BY_SCENARIO.bear[p]) },
  ];

  const consensusSeries = [
    { key: "model", label: "This Model", stroke: "#1e3a2b", swatchClass: "bg-forest", values: [EPS_CONSENSUS[0].values.FY2027E, EPS_CONSENSUS[0].values.FY2028E, EPS_CONSENSUS[0].values.FY2029E as number] },
    { key: "zacks", label: "Zacks Consensus", stroke: "#96703e", dash: "7 5", swatchClass: "bg-brass", values: [EPS_CONSENSUS[1].values.FY2027E, EPS_CONSENSUS[1].values.FY2028E, EPS_CONSENSUS[1].values.FY2029E as number] },
    { key: "jpmorgan", label: "JPMorgan (bear)", stroke: "#a1462f", dash: "2 5", swatchClass: "bg-rust", values: [EPS_CONSENSUS[2].values.FY2027E, EPS_CONSENSUS[2].values.FY2028E] },
  ];

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

        {/* Answer — directly under the question */}
        <div className="mt-10 rounded-2xl border border-forest/20 bg-forest/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Answer</p>
          <p className="mt-3 text-xl font-semibold leading-8 text-charcoal">{project.summary}</p>
        </div>

        {/* Takeaway */}
        <div className="mt-6 rounded-2xl border border-forest/15 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Takeaway</p>
          <p className="mt-3 text-lg font-medium leading-8 text-charcoal">{cs.takeaway}</p>
        </div>

        {/* Headline chart */}
        <div className="mt-10">
          <ChartSection label="North America vs. Greater China Revenue, FY2024A–FY2029E" first>
            <SegmentTrajectoryChart
              periods={HISTORY_AND_FORECAST}
              northAmerica={naSeries}
              greaterChina={gcSeries}
              markerIndex={HISTORY_AND_FORECAST.indexOf("FY2028E")}
              markerLabel="FY2028E offset point"
            />
            <ChartCaption
              statLabel="North America Revenue, FY2028E (Base)"
              statValue={formatNikeBillions(BREAKEVEN.northAmericaActualFY28E)}
              deltaText={`▲ ${formatNikeBillions(BREAKEVEN.northAmericaActualFY28E - BREAKEVEN.northAmericaFY26A)} vs FY2026A`}
              badgeLabel="Offset holds"
              badgeTone="good"
              alertLead="Offset holds, but thinly."
              alertText={`North America needs $${BREAKEVEN.northAmericaRequiredFY28E.toLocaleString("en-US", { maximumFractionDigits: 0 })}M by FY2028E to fully offset Greater China's modeled decline (Scenario Dashboard!B38); the Base case delivers $${BREAKEVEN.northAmericaActualFY28E.toLocaleString("en-US", { maximumFractionDigits: 0 })}M (Scenario Dashboard!B40) — a ${formatNikePercent(BREAKEVEN.actualAnnualizedGrowth, 2)} annualized growth rate vs. the ${formatNikePercent(BREAKEVEN.requiredAnnualizedGrowth)} required, a $${BREAKEVEN.cushion.toFixed(0)}M cushion (Scenario Dashboard!B42).`}
              explainer="Required growth is the CAGR North America needs from its FY2026A base to cover Greater China's modeled dollar decline by FY2028E; actual growth is what the Base case's segment-level growth assumptions (Assumptions tab) actually produce, run through the same linked model."
            />
          </ChartSection>
        </div>

        {/* Deliverables — moved above the fold */}
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
                  <span className="shrink-0 text-sm font-semibold text-forest">
                    {d.format === "PDF" ? "Open →" : "Download →"}
                  </span>
                </span>
                {DELIVERABLE_DETAIL[d.label] && (
                  <span className="text-xs leading-5 text-charcoal-soft">{DELIVERABLE_DETAIL[d.label]}</span>
                )}
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
            <h3 className="text-sm font-semibold text-charcoal">Limitations</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {MODEL_LIMITATIONS.map((item) => (
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
            <ChartSection label="Consolidated Revenue by Scenario, FY2026A–FY2029E" first>
              <MultiSeriesLineChart
                periods={FORECAST_ONLY}
                series={revenueFan}
                ariaLabel="Consolidated revenue under bull, base, and bear scenarios, FY2026A through FY2029E"
                valueFormatter={formatNikeBillions}
              />
              <ChartCaption
                statLabel="Consolidated Revenue, FY2029E (Base)"
                statValue={formatNikeBillions(CONSOLIDATED_REVENUE_BY_SCENARIO.base.FY2029E)}
                deltaText={`${formatNikeBillions(CONSOLIDATED_REVENUE_BY_SCENARIO.bear.FY2029E)} – ${formatNikeBillions(CONSOLIDATED_REVENUE_BY_SCENARIO.bull.FY2029E)} range`}
                badgeLabel="Range widens"
                badgeTone="neutral"
                alertLead="The range widens every year."
                alertText={`FY2029E consolidated revenue spans ${formatNikeBillions(CONSOLIDATED_REVENUE_BY_SCENARIO.bear.FY2029E)} (bear) to ${formatNikeBillions(CONSOLIDATED_REVENUE_BY_SCENARIO.bull.FY2029E)} (bull) around a ${formatNikeBillions(CONSOLIDATED_REVENUE_BY_SCENARIO.base.FY2029E)} base case (Segment Revenue Build!E13, read once per scenario) — an $8.5B spread, about 18% of the base case.`}
                explainer="Each scenario applies its own North America, Greater China, EMEA, and APLA growth path (Assumptions tab), not a single blended growth rate. Converse and Corporate/GBD are held constant across all three scenarios — about 2.4% of consolidated revenue — so only the four NIKE Brand geographies actually flex by scenario."
              />
            </ChartSection>

            <ChartSection label="Gross Margin Bridge, FY2026A → FY2029E (Base Case)">
              <MarginBridgeWaterfall steps={MARGIN_BRIDGE_STEPS} />
              <ChartCaption
                statLabel="Gross Margin, FY2029E (Base)"
                statValue="43.6%"
                deltaText="▲ +70 bps vs FY2026A"
                badgeLabel="Mitigation-led"
                badgeTone="good"
                alertLead="Recovery is mitigation-led, not volume-led."
                alertText="Tariff and sourcing pressure costs 40 bps before any offset; tariff mitigation and pricing actions alone recover 50 bps of that, with inventory normalization (+35 bps) and mix shift toward North America (+30 bps) providing the rest of the net +70 bps gain (Margin Bridge!B29:B35)."
                explainer="This is the model's own estimated allocation of the margin change, not a breakdown Nike discloses — the components are constructed to reconcile exactly to the modeled ending margin."
              />
            </ChartSection>

            <ChartSection label="Cash & Equivalents by Scenario, FY2026A–FY2029E">
              <MultiSeriesLineChart
                periods={FORECAST_ONLY}
                series={cashFan}
                ariaLabel="Cash and equivalents under bull, base, and bear scenarios, FY2026A through FY2029E"
                valueFormatter={formatNikeBillions}
                tintKey="bear"
              />
              <ChartCaption
                statLabel="Cash & Equivalents, FY2029E (Bear)"
                statValue={formatNikeBillions(CASH_BY_SCENARIO.bear.FY2029E)}
                deltaText={`▼ ${formatNikeBillions(CASH_BY_SCENARIO.bear.FY2029E - CASH_BY_SCENARIO.bear.FY2026A)} vs FY2026A`}
                badgeLabel="Stress-tested"
                badgeTone="bad"
                alertLead="Cash genuinely declines under stress."
                alertText={`Under the bear case, cash falls from ${formatNikeBillions(CASH_BY_SCENARIO.bear.FY2026A)} (Balance Sheet!B5) to ${formatNikeBillions(CASH_BY_SCENARIO.bear.FY2029E)} by FY2029E (Balance Sheet!E5, Assumptions!C3 = Bear) as operating cash flow compresses — even as the balance sheet still balances to $0 in every year.`}
                explainer="Bull and Base cash both grow over the same period ($13.6B and $9.3B respectively) — only the bear case's weaker margins and slower collections turn the model's cash line into a genuine liquidity drawdown."
              />
            </ChartSection>

            <ChartSection label="Base-Case EPS vs. Published Consensus, FY2027E–FY2029E">
              <MultiSeriesLineChart
                periods={["FY2027E", "FY2028E", "FY2029E"]}
                series={consensusSeries}
                ariaLabel="This model's base-case EPS vs Zacks Research consensus and JPMorgan's bearish case, FY2027E through FY2029E"
                valueFormatter={(v) => `$${v.toFixed(2)}`}
              />
              <ChartCaption
                statLabel="Diluted EPS, FY2029E (Base)"
                statValue={`$${(EPS_CONSENSUS[0].values.FY2029E as number).toFixed(2)}`}
                deltaText="▼ -9.3% vs Zacks"
                badgeLabel="Conservative on China"
                badgeTone="neutral"
                alertLead="The model grows more conservative than consensus over time."
                alertText="This model's Base-case EPS runs 3.9% above Zacks Research consensus in FY2027E, then 3.2% and 9.3% below in FY2028E/FY2029E (Scenario Dashboard!B27:D27) — a gap driven by this model's more cautious Greater China recovery assumption. Both this model and Zacks remain well above JPMorgan's bearish case."
                explainer="Zacks estimates published July 21, 2026; JPMorgan's bearish case did not publish an FY2029E estimate."
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

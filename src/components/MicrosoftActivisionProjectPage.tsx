import Link from "next/link";
import type { Project } from "@/lib/projects";
import {
  AMORTIZATION_BY_YEAR,
  BASE_CASE_SYNERGY_ROW,
  BASE_CASE_YIELD_COL,
  BASIS_INCONSISTENCY,
  BREAKEVEN_SYNERGY_BY_YIELD,
  EPS_BRIDGE,
  FIVE_YEAR_EPS_PATH,
  FIVE_YEAR_LABELS,
  LIMITATIONS,
  RECONCILIATION,
  SYNERGY_GRID,
  SYNERGY_ROWS,
  YIELD_COLS,
} from "@/lib/msftAtviChartData";
import {
  AmortizationBarChart,
  EpsBridgeWaterfall,
  EpsPathChart,
  SynergyHeatmap,
  formatPercent,
  formatUsdM,
} from "@/components/msft-atvi/MsftAtviCharts";
import { ProjectHero } from "@/components/project/ProjectHero";
import { QuestionApproachFinding } from "@/components/project/QuestionApproachFinding";
import { WhatIBuiltGrid } from "@/components/project/WhatIBuiltGrid";

const DELIVERABLE_DETAIL: Record<string, string> = {
  "M&A Model":
    "11 tabs, fully formula-linked, with a permanent balance check that returns $0 and a Year-1 reconciliation confirming the five-year forecast ties back exactly to the base-case bridge.",
  "Full Report":
    "The full write-up, with every figure tagged [SOURCED], [ASSUMPTION], [MODEL-DERIVED], or [INTERPRETATION]: transaction overview, purchase price allocation, accretion/dilution bridge, synergy breakeven, five-year pro forma, and strategic risk assessment.",
  "Executive Summary":
    "The one-page version — thesis, key findings, and the recommendation, without the supporting detail.",
  "Presentation Deck":
    "A slide walkthrough of the transaction, the purchase price allocation, the EPS bridge, and the synergy breakeven finding.",
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

export default function MicrosoftActivisionProjectPage({ project, prev, next }: { project: Project; prev: Project; next: Project }) {
  const cs = project.caseStudy!;
  const maModelDeliverable = cs.deliverables.find((d) => d.label === "M&A Model");
  const fullReportDeliverable = cs.deliverables.find((d) => d.label === "Full Report");
  const executiveSummaryDeliverable = cs.deliverables.find((d) => d.label === "Executive Summary");
  const presentationDeckDeliverable = cs.deliverables.find((d) => d.label === "Presentation Deck");

  const bridgeSteps = [
    { label: "Microsoft Standalone", sublabel: "$9.68/share", value: EPS_BRIDGE.msftStandaloneNetIncome, kind: "anchor" as const },
    { label: "+ Activision Net Income", sublabel: "", value: EPS_BRIDGE.atviNetIncomeContribution, kind: "add" as const },
    { label: "Foregone After-Tax Interest", sublabel: "", value: EPS_BRIDGE.foregoneAfterTaxInterest, kind: "subtract" as const },
    { label: "After-Tax PPA Amortization", sublabel: "", value: EPS_BRIDGE.afterTaxPpaAmortization, kind: "subtract" as const },
    { label: "Pro Forma", sublabel: `$${(EPS_BRIDGE.proFormaEps).toFixed(2)}/share`, value: EPS_BRIDGE.proFormaNetIncome, kind: "anchor" as const },
  ];

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link href="/#work" className="text-sm font-semibold text-forest hover:text-forest-dark">
          &larr; Back to Projects
        </Link>

        <ProjectHero
          title="Microsoft × Activision Deal Economics"
          question="Was the deal financially justified, and how much in annual synergies did it take to break even?"
          description="An accretion/dilution model and strategic analysis of Microsoft's acquisition of Activision Blizzard."
          metrics={[
            { value: "-4.07%", label: "Year-1 EPS dilution at zero synergies" },
            {
              value: "$3.64B synergy hurdle",
              label: "Annual pre-tax synergies required for EPS neutrality (~48% of Activision's FY2022 revenue)",
            },
          ]}
          ctas={[{ label: "View the analysis ↓", href: "#analysis", variant: "primary" }]}
        />

        <QuestionApproachFinding
          question={{
            label: "01 — The Question",
            body: "Was the deal financially justified, and how much in annual synergies did it take to break even?",
          }}
          approach={{
            label: "02 — The Approach",
            body: "I built a purchase price allocation from Microsoft's final (not preliminary) disclosure, then solved an accretion/dilution bridge and a synergy-breakeven analysis directly against Microsoft's standalone EPS, reconciled against Microsoft's own reported pro forma figures.",
          }}
          finding={{
            label: "03 — The Finding",
            body: "With zero synergies, the deal dilutes Microsoft's EPS by 4.07% in Year 1 — driven by foregone interest income and new intangible amortization, not operating weakness. Reaching EPS-neutral requires about $3.64B of annual pre-tax synergies, roughly 48% of Activision's entire FY2022 revenue: an exceptionally high bar for a conventional cost-synergy story.",
          }}
        />

        <WhatIBuiltGrid
          items={[
            {
              title: "M&A Model",
              format: "XLSX",
              description: DELIVERABLE_DETAIL["M&A Model"],
              href: maModelDeliverable?.url,
              ctaLabel: "Download model ↗",
            },
            {
              title: "Full Report",
              format: "PDF",
              description: DELIVERABLE_DETAIL["Full Report"],
              href: fullReportDeliverable?.url,
              ctaLabel: "Open report ↗",
            },
            {
              title: "Executive Summary",
              format: "PDF",
              description: DELIVERABLE_DETAIL["Executive Summary"],
              href: executiveSummaryDeliverable?.url,
              ctaLabel: "Open summary ↗",
            },
            {
              title: "Presentation Deck",
              format: "PPTX",
              description: DELIVERABLE_DETAIL["Presentation Deck"],
              href: presentationDeckDeliverable?.url,
              ctaLabel: "Open deck ↗",
            },
            {
              title: "GitHub Project",
              format: "REPOSITORY",
              description:
                "Source documentation, the full M&A model, and the written report, all in the public repository for this analysis.",
              href: project.githubUrl,
              ctaLabel: "View GitHub ↗",
            },
          ]}
        />

        {/* Headline chart */}
        <div id="analysis" className="mt-16 scroll-mt-8">
          <ChartSection label="EPS Bridge: Microsoft Standalone to Pro Forma (Year 1, No Synergies)" first>
            <EpsBridgeWaterfall steps={bridgeSteps} />
            <ChartCaption
              statLabel="Pro Forma EPS (Year 1, No Synergies)"
              statValue={`$${EPS_BRIDGE.proFormaEps.toFixed(4)}`}
              deltaText={formatPercent(EPS_BRIDGE.epsDilution)}
              badgeLabel="Dilutive"
              badgeTone="bad"
              alertLead="The bars sum exactly to the endpoint."
              alertText={`Microsoft standalone net income (${formatUsdM(EPS_BRIDGE.msftStandaloneNetIncome)}, Accretion Dilution!B13) plus Activision's (${formatUsdM(EPS_BRIDGE.atviNetIncomeContribution)}, !B14), less foregone after-tax interest (${formatUsdM(EPS_BRIDGE.foregoneAfterTaxInterest)}, !B15) and after-tax PPA amortization (${formatUsdM(EPS_BRIDGE.afterTaxPpaAmortization)}, !B16), equals pro forma net income of ${formatUsdM(EPS_BRIDGE.proFormaNetIncome)} (!B18) — a ${formatPercent(EPS_BRIDGE.epsDilution)} EPS dilution against Microsoft's reported $9.68 standalone EPS.`}
              explainer="Two of the four drivers are transaction mechanics (foregone interest, amortization), not operating performance — see the reconciliation below."
            />
          </ChartSection>
        </div>

        {/* Reconciliation bridge — its own block, not a chart */}
        <section className="mt-10 rounded-2xl border border-forest/20 bg-forest/5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-brass">Reconciliation Against Microsoft&apos;s Own Disclosure</h2>
          <p className="mt-3 text-sm leading-6 text-charcoal-soft">
            The model&apos;s Accretion Dilution tab already checks itself against Microsoft&apos;s reported pro forma figures
            in the FY2024 10-K. Nobody had decomposed the gap — it decomposes to one line item.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-forest/15 bg-white">
            <table className="w-full min-w-[420px] text-left text-sm">
              <tbody>
                <tr className="border-b border-forest/10">
                  <td className="px-4 py-3 text-charcoal-soft">Model pro forma net income</td>
                  <td className="px-4 py-3 text-right font-semibold text-charcoal">{formatUsdM(RECONCILIATION.modelProFormaNetIncome)}</td>
                </tr>
                <tr className="border-b border-forest/10">
                  <td className="px-4 py-3 text-charcoal-soft">Add back after-tax foregone interest</td>
                  <td className="px-4 py-3 text-right font-semibold text-forest">+{formatUsdM(RECONCILIATION.addBackForegoneInterest)}</td>
                </tr>
                <tr className="border-b border-forest/10">
                  <td className="px-4 py-3 text-charcoal-soft">Result vs. Microsoft&apos;s reported pro forma</td>
                  <td className="px-4 py-3 text-right font-semibold text-charcoal">
                    {formatUsdM(RECONCILIATION.reconciledNetIncome)} vs. {formatUsdM(RECONCILIATION.msftReportedProFormaNetIncome)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-charcoal-soft">On a per-share basis</td>
                  <td className="px-4 py-3 text-right font-semibold text-charcoal">
                    ${RECONCILIATION.reconciledEpsPerShare.toFixed(4)} vs. ${RECONCILIATION.msftReportedProFormaEps.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-charcoal-soft">
            A difference of {formatUsdM(RECONCILIATION.reconciledNetIncome - RECONCILIATION.msftReportedProFormaNetIncome)}, or about 0.003%. The entire gap between this
            model&apos;s -4.07% dilution and Microsoft&apos;s implied -1.34% is exactly one item: the opportunity cost of
            deploying $61.8B of cash. Microsoft&apos;s GAAP pro forma cannot include foregone interest income — it isn&apos;t a
            GAAP line. This model includes it deliberately, because it is economically real. (Accretion Dilution!B18, B15, B26, B27.)
          </p>
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
              {LIMITATIONS.map((item) => (
                <li key={item} className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 rounded-xl border border-brass/30 bg-brass-pale/40 p-4">
            <h3 className="text-sm font-semibold text-charcoal">A Disclosed Inconsistency</h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-soft">
              The Year-1 base case (above) measures dilution against Microsoft&apos;s <em>reported</em> FY2023A diluted EPS of{" "}
              ${BASIS_INCONSISTENCY.reportedStandaloneEps.toFixed(2)} (Accretion Dilution!B21): {formatPercent(BASIS_INCONSISTENCY.dilutionVsReported)}. The five-year
              build (below) instead measures against a <em>computed</em> standalone EPS of ${BASIS_INCONSISTENCY.computedStandaloneEps.toFixed(4)} — Microsoft&apos;s own
              net income divided by its own share count (Pro Forma Income Statement!B75). Holding the same 0%-synergy scenario constant and swapping only the
              denominator gives {formatPercent(BASIS_INCONSISTENCY.dilutionVsComputed)} instead of {formatPercent(BASIS_INCONSISTENCY.dilutionVsReported)} — both are
              correct on their own basis. This is stated rather than silently fixed; the model was not changed to force them to match.
            </p>
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
            <ChartSection label="Synergy Breakeven Sensitivity" first>
              <SynergyHeatmap
                synergyRows={SYNERGY_ROWS}
                yieldCols={YIELD_COLS}
                grid={SYNERGY_GRID}
                baseRow={BASE_CASE_SYNERGY_ROW}
                baseCol={BASE_CASE_YIELD_COL}
                breakevenByYield={BREAKEVEN_SYNERGY_BY_YIELD}
              />
              <ChartCaption
                statLabel="Required Synergies for EPS Neutrality (4.0% Yield)"
                statValue={formatUsdM(BREAKEVEN_SYNERGY_BY_YIELD[BASE_CASE_YIELD_COL])}
                deltaText="≈48% of Activision FY2022 revenue"
                badgeLabel="High bar"
                badgeTone="bad"
                alertLead="The crossing line barely moves across a wide range of yield assumptions."
                alertText={`At the base-case 4.0% foregone cash yield, the deal needs ${formatUsdM(BREAKEVEN_SYNERGY_BY_YIELD[2])} of annual pre-tax synergies to reach 0% accretion/dilution (Synergy Breakeven!D10). Across the full 2%–6% yield range tested, the breakeven synergy requirement only moves from ${formatUsdM(BREAKEVEN_SYNERGY_BY_YIELD[0])} to ${formatUsdM(BREAKEVEN_SYNERGY_BY_YIELD[4])} (Synergy Breakeven!B15:F15) — the hurdle is large under any reasonable assumption, not just the base case.`}
                explainer="Microsoft has never guided to a synergy figure; this is a model-derived breakeven, not a management target."
              />
            </ChartSection>

            <ChartSection label="Five-Year EPS Accretion Path">
              <EpsPathChart labels={FIVE_YEAR_LABELS} values={FIVE_YEAR_EPS_PATH} />
              <ChartCaption
                statLabel="EPS Impact, Year 5"
                statValue={formatPercent(FIVE_YEAR_EPS_PATH[4])}
                deltaText="Crosses zero between Year 3 and Year 4"
                badgeLabel="Turns accretive"
                badgeTone="good"
                alertLead="The crossover is the whole story."
                alertText={`Under the breakeven-synergy ramp and the scheduled amortization step-down, EPS impact moves from ${formatPercent(FIVE_YEAR_EPS_PATH[0])} in Year 1 to ${formatPercent(FIVE_YEAR_EPS_PATH[2])} in Year 3, crossing to ${formatPercent(FIVE_YEAR_EPS_PATH[3])} in Year 4 and ${formatPercent(FIVE_YEAR_EPS_PATH[4])} by Year 5 (Pro Forma Income Statement!B77:F77).`}
                explainer="This path uses a computed standalone EPS denominator that grows year over year, not the flat $9.68 reported figure used in the Year-1 base case above — see the disclosed inconsistency in Methodology."
              />
            </ChartSection>

            <ChartSection label="Purchase-Accounting Amortization Step-Down">
              <AmortizationBarChart labels={FIVE_YEAR_LABELS} values={AMORTIZATION_BY_YEAR} />
              <ChartCaption
                statLabel="Amortization, Year 5"
                statValue={formatUsdM(AMORTIZATION_BY_YEAR[4])}
                deltaText={`from ${formatUsdM(AMORTIZATION_BY_YEAR[0])} in Years 1-4`}
                badgeLabel="Mechanical driver"
                badgeTone="neutral"
                alertLead="This is what mechanically drives the accretion crossover."
                alertText="The 4-year-life technology-based ($9,689M) and customer-related ($661M) intangibles fully amortize after Year 4, dropping total amortization from $3,071.6M to $484.1M — just the 24-year marketing-related intangible continuing (Pro Forma Income Statement!B47:F47)."
                explainer="Pairs directly with the five-year EPS path above: synergies ramping to full run-rate and this amortization step-down compound together to produce the Year 4 crossover."
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

export type ProjectStatus = "live" | "in-development";

export type Deliverable = {
  label: string;
  format: "XLSX" | "PDF" | "PPTX" | "DOCX";
  url: string;
};

export type CaseStudy = {
  question: string;
  overview: string;
  dataSources: string;
  approach: string;
  assumptions: string[];
  findings: string[];
  takeaway: string;
  deliverables: Deliverable[];
};

export type Project = {
  slug: string;
  title: string;
  category: string;
  description?: string;
  summary: string;
  tools: string[];
  year: string;
  status: ProjectStatus;
  icon: string;
  visual?: string;
  link?: string;
  ctaLabel?: string;
  headlineStat?: string;
  githubUrl?: string;
  caseStudy?: CaseStudy;
};

export const flagshipProjects: Project[] = [
  {
    slug: "nike",
    title: "Nike, Inc.",
    category: "Three-Statement Model & Scenario Analysis",
    description:
      "A driver-based three-statement model and forecast for Nike, stress-tested across bull, base, and bear scenarios.",
    summary:
      "North America needs 3.2% growth to offset Greater China's decline by FY2028 — the base case delivers 4.25%, a $439M cushion.",
    tools: ["Excel", "FP&A", "Forecasting", "Scenario Analysis"],
    year: "2026",
    status: "live",
    icon: "01",
    visual: "/project-visuals/nike.png",
    headlineStat: "$439M cushion",
    githubUrl: "https://github.com/2samfelix/nike-three-statement-model",
    caseStudy: {
      question:
        "How quickly must North America recover to offset continued weakness in Greater China?",
      overview:
        "A fully linked three-statement financial model for Nike, Inc., built end-to-end to answer one specific question rather than produce a generic forecast: can Nike's North America turnaround offset its Greater China decline by fiscal 2028, and at what pace? The income statement, balance sheet, and cash flow statement are fully linked, with segment revenue built bottom-up rather than off a flat blended growth rate.",
      dataSources:
        "NIKE's FY2024–FY2026 Form 10-K filings, sourced directly from SEC EDGAR.",
      approach:
        "Driver-based segment revenue forecasting, a margin bridge reconciling gross margin from actual to forecast basis-point by basis-point, and bull/base/bear scenario modeling stress-tested across the entire linked model — including the balance sheet.",
      assumptions: [
        "Growth and margin assumptions beyond FY2026A are the author's own estimates, disclosed throughout the model",
        "Scenario logic (bull/base/bear) is applied consistently across every linked statement, not just a summary output",
        "Base-case EPS is benchmarked against consensus estimates attributed to Zacks Research",
      ],
      findings: [
        "North America needs ~3.2% annualized growth through FY2028 to offset the modeled Greater China decline; the base case assumes ~4.25%, a $439M cushion.",
        "Base-case operating margin improves from 8.2% (FY2026A) to 10.1% (FY2029E) as gross margin recovers from tariff pressure (42.9% → 43.6%).",
        "FY2029E consolidated revenue spans $43.7B (bear) to $52.2B (bull); the balance sheet still balances to $0 in every scenario, and cash genuinely declines from $7.6B to $2.9B under the bear case.",
        "Base-case EPS is within 4% of published consensus in FY2027E, growing more conservative than consensus through FY2029E on a slower assumed China recovery.",
      ],
      takeaway:
        "The offset holds under Nike's own base case, but the $439M cushion is modest relative to Nike's scale — this is a thesis that survives stress-testing, not one with much room for execution slippage.",
      deliverables: [
        {
          label: "Financial Model",
          format: "XLSX",
          url: "https://raw.githubusercontent.com/2samfelix/nike-three-statement-model/main/Sam_Felix_Nike_Three_Statement_Model%20(4).xlsx",
        },
        {
          label: "Full Report",
          format: "DOCX",
          url: "https://raw.githubusercontent.com/2samfelix/nike-three-statement-model/main/Nike_Three_Statement_Model_Report.docx",
        },
        {
          label: "Executive Summary",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/nike-three-statement-model/main/Executive_Summary_Final%20(1).pdf",
        },
      ],
    },
  },
  {
    slug: "arm",
    title: "Arm Holdings",
    category: "IPO Valuation & Strategy Analysis",
    description:
      "An IPO valuation for Arm Holdings combining comparable company analysis, a DCF, and strategic positioning research.",
    summary:
      "Three independent valuation methods converge on ~$51 fair value for Arm — the market prices it at $272.",
    tools: ["Excel", "Valuation", "DCF", "CCA", "Strategy"],
    year: "2026",
    status: "live",
    icon: "02",
    visual: "/project-visuals/arm.png",
    headlineStat: "5.34× total return",
    githubUrl: "https://github.com/2samfelix/arm-ipo-valuation-strategy-analysis",
    caseStudy: {
      question:
        "Do Arm's fundamentals justify a stock price of $272 — more than 5x where three independent valuation methods land?",
      overview:
        "A full investment-banking-style analysis of Arm Holdings' September 2023 IPO, covering equity valuation at the offering, a forward-looking DCF cross-check, and a strategic read on how the market has re-rated the business since. Built to simulate how an analyst would approach a live deal — real SEC filings, real valuation techniques, and a thesis question answered with actual numbers.",
      dataSources:
        "Arm's SEC filings — the F-1/424B4 IPO prospectus and FY2024–FY2026 Form 20-F — sourced from SEC EDGAR.",
      approach:
        "Comparable company analysis at the IPO pricing date, a valuation-evolution bridge decomposing total shareholder return into EPS growth vs. P/E multiple expansion, and a discounted cash flow cross-check built independently of both the IPO price and the market's later re-rating.",
      assumptions: [
        "Every input is color-coded (assumption vs. formula vs. cross-sheet link) with sources cited next to each figure",
        "The DCF's sensitivity table is centered on the model's own live-computed WACC, not a static assumption",
        "Growth, margin, and DCF assumptions beyond reported historicals are the author's own estimates, clearly disclosed as such",
      ],
      findings: [
        "Arm priced at ~18.7x FY2023 EV/Revenue, ~49% above the six-peer median of 12.6x; the closest comp-based range was $43–45 per ADS vs. the $51 IPO price.",
        "Arm's 5.34x total shareholder return since IPO decomposes into 1.67x from EPS growth and 3.20x from P/E multiple expansion — cross-confirmed by a matching 3.11x expansion in EV/Revenue.",
        "A DCF built entirely from today's fundamentals implies a fair value of ~$51.54 — almost exactly the original $51.00 IPO price — despite the stock trading at $272.21.",
        "Three independent methods (2023 CCA, the actual IPO, and a 2026 fundamentals-only DCF) all cluster in the $43–52 range, while the market prices Arm at roughly 5x that.",
      ],
      takeaway:
        "The original 11–15% IPO premium looks conservative in hindsight, not aggressive — the market has re-rated Arm to a materially richer multiple than any fundamentals-based method, at IPO or today, would support on its own.",
      deliverables: [
        {
          label: "Valuation Model",
          format: "XLSX",
          url: "https://raw.githubusercontent.com/2samfelix/arm-ipo-valuation-strategy-analysis/main/Sam_Felix_Arm_IPO_Valuation_Strategy_Analysis.xlsx",
        },
        {
          label: "Full Report",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/arm-ipo-valuation-strategy-analysis/main/Arm_IPO_Valuation_Strategy_Report%20(1).pdf",
        },
        {
          label: "Executive Summary",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/arm-ipo-valuation-strategy-analysis/main/Arm_IPO_Executive_Summary.pdf",
        },
        {
          label: "Strategy Deck",
          format: "PPTX",
          url: "https://raw.githubusercontent.com/2samfelix/arm-ipo-valuation-strategy-analysis/main/Arm_IPO_Valuation_Strategy_Deck%20(1).pptx",
        },
      ],
    },
  },
  {
    slug: "microsoft-activision",
    title: "Microsoft × Activision Blizzard",
    category: "M&A Accretion/Dilution & Strategic Analysis",
    description:
      "An accretion/dilution model and strategic analysis of Microsoft's acquisition of Activision Blizzard.",
    summary:
      "Was Microsoft's $75.4B acquisition financially justified, and what synergy level was required for EPS accretion?",
    tools: ["Excel", "M&A", "Purchase Accounting", "Strategy"],
    year: "2026",
    status: "live",
    icon: "03",
    visual: "/project-visuals/msft.png",
    headlineStat: "-4.07% EPS dilution",
    githubUrl: "https://github.com/2samfelix/microsoft-activision-ma-analysis",
    caseStudy: {
      question:
        "Was Microsoft's $75.4B acquisition of Activision Blizzard financially justified, and what synergy level was required for EPS accretion?",
      overview:
        "A full investment-banking-style analysis of Microsoft's acquisition of Activision Blizzard, built around Microsoft's final (not preliminary) purchase price allocation and real, sourced financial data throughout — quantifying whether the deal was financially justified rather than describing it as a case study.",
      dataSources:
        "Microsoft's FY2025 Form 10-K (final Activision purchase price allocation), Microsoft's FY2023 Form 10-K and earnings release, and Activision Blizzard's FY2022 Q4 earnings release exhibit — all sourced from SEC EDGAR.",
      approach:
        "Purchase price allocation using Microsoft's final post-measurement-period disclosure, a segment-specific tax-rate accretion/dilution bridge preserving each company's real historical effective tax rate, synergy breakeven analysis solved directly against Microsoft's standalone EPS, and a five-year linked pro forma income statement, balance sheet, and cash flow statement.",
      assumptions: [
        "Every figure in the full report is tagged [SOURCED], [ASSUMPTION], [MODEL-DERIVED], or [INTERPRETATION]",
        "The workbook carries a permanent balance check (Total Assets − Total Liabilities & Equity = $0) across all five forecast years",
        "Growth, margin, tax-transition, and cash-flow assumptions beyond reported historicals are the author's own, clearly disclosed throughout",
      ],
      findings: [
        "The deal dilutes Microsoft's EPS by ~4.07% with zero synergies — driven by foregone interest income and new intangible amortization, not operational weakness.",
        "The EPS-neutral synergy hurdle is ~$3.637B of annual pre-tax synergies — about 48.31% of Activision's entire FY2022 revenue, a model-derived breakeven rather than a figure Microsoft has guided to.",
        "The five-year EPS path improves steadily, from -3.10% in Year 1 under the synergy ramp to +2.33% by Year 5, as synergies reach full run-rate and intangible amortization steps down.",
        "Microsoft's cash-generation capacity could rebuild the $61.8B of deployed liquidity in ~2.40 years under the model's forecast assumptions, with no debt-paydown story required.",
        "Goodwill of $51,001M is roughly 68% of the $75,408M final purchase price — a statement about how much of the deal is unallocated strategic value rather than identifiable assets.",
      ],
      takeaway:
        "Financially absorbable, strategically defensible, but not compelling on near-term EPS alone — the deal is more defensible as a long-duration strategic investment than as a traditional cost-synergy transaction.",
      deliverables: [
        {
          label: "M&A Model",
          format: "XLSX",
          url: "https://raw.githubusercontent.com/2samfelix/microsoft-activision-ma-analysis/main/Sam_Felix_MSFT_ATVI_MA_Model.xlsx",
        },
        {
          label: "Full Report",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/microsoft-activision-ma-analysis/main/MSFT_ATVI_Full_Report.pdf",
        },
        {
          label: "Executive Summary",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/microsoft-activision-ma-analysis/main/MSFT_ATVI_Executive_Summary.pdf",
        },
        {
          label: "Presentation Deck",
          format: "PPTX",
          url: "https://raw.githubusercontent.com/2samfelix/microsoft-activision-ma-analysis/main/MSFT_ATVI_Deck.pptx",
        },
      ],
    },
  },
  {
    slug: "caterpillar-demand-quality",
    title: "Caterpillar, Inc.",
    category: "Demand Quality & Segment Disclosure Analysis",
    description:
      "A segment-level test of whether Caterpillar's 2026 Construction Industries growth came from real end-user demand or dealer restocking, built on eight quarters of disclosed figures with a four-level classification on every figure.",
    summary:
      "Construction Industries growth was still heavily supported by dealer restocking in Q1 2026, but by Q2 the mix had shifted materially toward end-user demand — the shipping-to-retail gap narrowed from 24.3 points to 7.8.",
    tools: ["Segment Analysis", "SEC Filings", "Earnings-Call Transcripts", "Demand Quality"],
    year: "2026",
    status: "live",
    icon: "04",
    visual: "/project-visuals/caterpillar.png",
    githubUrl: "https://github.com/2samfelix/Personal-Portfolio-/tree/main/caterpillar-demand-quality",
    headlineStat: "$1.5B → $0.4B dealer build",
    caseStudy: {
      question:
        "Was Caterpillar's 2026 Construction Industries growth driven by real end-user demand or dealer restocking?",
      overview:
        "An eight-quarter (Q3 2024 – Q2 2026) segment-level analysis of Caterpillar's Construction Industries growth, testing whether the 2026 growth reflects real end-user demand or dealer restocking. Built on Caterpillar's own disclosed segment bridges, dealer-inventory disclosures, and retail sales statistics, with every figure classified SOURCED, DERIVED, CALC, or NOT DISCLOSED.",
      dataSources:
        "Caterpillar quarterly earnings releases (Q3 2024 – Q2 2026), Ex 99.2 Rolling 3-Month Retail Sales Statistics, and the Q1 and Q2 2026 Forms 10-Q (accessions 0000018230-26-000021 and -000046), sourced from SEC EDGAR and Caterpillar's investor-relations releases. Management commentary not reproduced in a filing is identified as earnings-call commentary and supported by transcript sources.",
      approach:
        "Segment-level sales bridges (volume, price realization, currency, inter-segment) reconciled to zero across all 32 quarter-segment checks; a reported-vs-retail gap tracked as a directional indicator of dealer stocking rather than a precise inventory measure; and a comparability log testing for segment renames, restatements, and disclosure-basis changes before any figure is charted as a continuous series.",
      assumptions: [
        "The reported-vs-retail gap is treated as directional and relative, not a precise dollar measurement of dealer inventory.",
        "No figure in the underlying dataset is assumed: every figure is classified SOURCED, DERIVED, CALC, or NOT DISCLOSED, with INFERRED used only in notes.",
        "Ex-tariff margin is presented as an upper bound on underlying performance, not as an efficiency or cost-control finding.",
      ],
      findings: [
        "The disclosed Construction Industries dealer-inventory build fell from $1.5B in Q1 2026 to $400M in Q2 2026, while management's own language shifted from naming dealer inventories first to naming end users first.",
        "The reported-vs-retail gap narrowed from 24.3 points in Q1 2026 to 7.8 points in Q2 2026, even as reported CI sales growth barely moved (38.1% to 34.8%).",
        "Volume, not price, produced the 2026 growth: price realization was negative every quarter from Q3 2024 through Q4 2025 and turned positive only in Q1 2026.",
        "The Q4 2025 margin trough of 14.9% was a tariff cost shock rather than an efficiency or cost-control deterioration; the derived ex-tariff margin of approximately 20.9% is an upper bound on underlying performance.",
        "All 32 segment-quarter reconciliation bridges return exactly zero, and 16 logged comparability issues (segment renames, a prior-year restatement, a retail-basis wording change) are tested rather than smoothed over.",
      ],
      takeaway:
        "If Caterpillar follows through on the expected dealer-inventory drawdown while end-user demand remains healthy, dealer stocking should contribute less to reported Construction Industries growth in H2 2026. An alternative hypothesis — tariff-driven demand pull-forward into Q2 — remains untested until H2 results are reported.",
      deliverables: [
        {
          label: "Case Study",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/Personal-Portfolio-/main/caterpillar-demand-quality/analysis/Caterpillar_Demand_Quality_Case_Study.pdf",
        },
        {
          label: "Presentation",
          format: "PDF",
          url: "https://raw.githubusercontent.com/2samfelix/Personal-Portfolio-/main/caterpillar-demand-quality/presentation/Caterpillar_Demand_Quality_Presentation.pdf",
        },
        {
          label: "Operating Dataset",
          format: "XLSX",
          url: "https://raw.githubusercontent.com/2samfelix/Personal-Portfolio-/main/caterpillar-demand-quality/model/CAT_8Q_Operating_Dataset.xlsx",
        },
      ],
    },
  },
];

export const builds: Project[] = [
  {
    slug: "fpa-decision-lab",
    title: "FP&A Decision Lab",
    category: "Interactive Demo",
    summary:
      "Given where the business is trending, what should we actually do about it? A 12-month planning tool across SaaS, Real Estate, and Consulting & Services, with Upside and Downside scenarios modeled as deltas on live driver values.",
    tools: ["FP&A", "Scenario Modeling", "Interactive"],
    year: "2026",
    status: "live",
    icon: "🧭",
    link: "/tools/fpa-decision-lab",
  },
  {
    slug: "front-office-simulator",
    title: "Front Office",
    category: "NFL Strategy & Financial Simulation",
    description:
      "The Packers posted $753.00M in record revenue — and still closed the season with a $1.10M operating loss. This simulator runs the front office that produced that paradox: six spending decisions, a hard salary cap, and a live P&L built on Green Bay's real, audited FY2026 financials. Move the levers and see if you can do better.",
    summary:
      "$753.00M in record revenue. A $1.10M operating loss. Same season. A Green Bay Packers front-office simulator built on their real, audited FY2026 financials — six spending levers, a hard salary cap, and a 1,000-season Monte Carlo stress test.",
    tools: ["Strategy", "Financial Modeling", "Monte Carlo", "Interactive"],
    year: "2026",
    status: "live",
    icon: "🏈",
    visual: "/project-visuals/front-office.png",
    link: "/tools/front-office-simulator",
    ctaLabel: "Run the Simulation →",
  },
  {
    slug: "driver-sensitivity-simulator",
    title: "Driver Sensitivity Simulator",
    category: "Interactive Demo",
    summary:
      "Which single assumption, if it moved, would change the answer? An interactive tool that flexes revenue and cost drivers ±5% to show which assumptions move EBITDA the most — illustrative sample data, not a real case study.",
    tools: ["Sensitivity Analysis", "Interactive"],
    year: "2026",
    status: "live",
    icon: "📉",
    link: "/tools/driver-sensitivity-simulator",
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return flagshipProjects.find((p) => p.slug === slug);
}

export function getAdjacentProjects(slug: string) {
  const index = flagshipProjects.findIndex((p) => p.slug === slug);
  const prev =
    flagshipProjects[(index - 1 + flagshipProjects.length) % flagshipProjects.length];
  const next = flagshipProjects[(index + 1) % flagshipProjects.length];
  return { prev, next };
}

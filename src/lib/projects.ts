export type ProjectStatus = "live" | "in-development";

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
  headlineStat?: string;
  keyNumbers?: string[];
  verdict?: string;
  githubUrl?: string;
  deliverables?: string[];
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
    deliverables: [
      "Sam_Felix_Nike_Three_Statement_Model.xlsx",
      "Executive_Summary_Final.pdf",
      "Interview_Prep_Notes.pdf",
    ],
  },
  {
    slug: "arm-holdings",
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
    keyNumbers: [
      "$43–45 comp-implied value (2023)",
      "$51.00 IPO price",
      "$51.54 DCF value (2026)",
      "$272.21 market price today",
      "Return decomposition: 1.67× EPS growth × 3.20× P/E expansion = 5.34× total return",
    ],
    githubUrl: "https://github.com/2samfelix/arm-ipo-valuation-strategy-analysis",
    deliverables: [
      "Sam_Felix_Arm_IPO_Valuation_Strategy_Analysis.xlsx",
      "Arm_IPO_Valuation_Strategy_Report.pdf",
      "Arm_IPO_Executive_Summary.pdf",
      "Arm_IPO_Valuation_Strategy_Deck.pptx",
    ],
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
    keyNumbers: [
      "-4.07% no-synergy EPS dilution",
      "$3.637B annual synergies required for neutrality (48.31% of Activision's FY2022 revenue)",
      "2.40 years to rebuild the $61.8B deployed",
    ],
    verdict:
      "Financially absorbable. Strategically defensible. Not compelling on near-term EPS alone.",
    githubUrl: "https://github.com/2samfelix/microsoft-activision-ma-analysis",
    deliverables: [
      "Sam_Felix_MSFT_ATVI_MA_Model.xlsx",
      "MSFT_ATVI_Full_Report.pdf",
      "MSFT_ATVI_Executive_Summary.pdf",
      "MSFT_ATVI_Deck.pptx",
    ],
  },
];

export const builds: Project[] = [
  {
    slug: "ai-finance-calculator",
    title: "AI-Assisted Finance Calculator",
    category: "AI & Tools",
    summary:
      "Building an interactive web calculator that helps model loan payoff timelines, savings growth, and budget scenarios — a hands-on way to pair a finance background with front-end and AI tooling.",
    tools: ["AI", "Calculators", "Web App"],
    year: "2026",
    status: "in-development",
    icon: "🧮",
  },
  {
    slug: "ai-variance-commentary-agent",
    title: "AI Variance-Commentary Agent",
    category: "AI Agent",
    summary:
      "Prototyping an AI agent that reads monthly budget-vs-actual data and drafts plain-English variance commentary — automating the kind of ad hoc reporting done day-to-day at Marketstaff.",
    tools: ["AI Agent", "FP&A", "Automation"],
    year: "2026",
    status: "in-development",
    icon: "🤖",
  },
];

export type ProjectStatus = "live" | "in-development";

export type Project = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  tools: string[];
  year: string;
  status: ProjectStatus;
  icon: string;
  link?: string;
  // Optional deeper case-study content — fill in once available.
  thesis?: string;
  headlineStat?: string;
  githubUrl?: string;
  deliverableUrl?: string;
};

export const flagshipProjects: Project[] = [
  {
    slug: "nike",
    title: "Nike, Inc.",
    category: "Three-Statement Model & Scenario Analysis",
    summary:
      "A driver-based three-statement model and forecast for Nike, stress-tested with bull / base / bear scenario analysis.",
    tools: ["Excel", "3-Statement Modeling", "Scenario Analysis"],
    year: "2026",
    status: "live",
    icon: "01",
  },
  {
    slug: "arm-holdings",
    title: "Arm Holdings",
    category: "IPO Valuation & Strategy Analysis",
    summary:
      "An IPO valuation and strategic positioning analysis built around Arm Holdings' public listing.",
    tools: ["Excel", "Valuation", "IPO Analysis"],
    year: "2026",
    status: "live",
    icon: "02",
  },
  {
    slug: "microsoft-activision",
    title: "Microsoft × Activision Blizzard",
    category: "M&A Accretion/Dilution & Strategic Analysis",
    summary:
      "An accretion/dilution model and strategic rationale for Microsoft's acquisition of Activision Blizzard.",
    tools: ["Excel", "M&A", "Accretion / Dilution"],
    year: "2026",
    status: "live",
    icon: "03",
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

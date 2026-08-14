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
};

export const projects: Project[] = [
  {
    slug: "three-statement-model",
    title: "3-Statement Financial Model",
    category: "Valuation / Modeling",
    summary:
      "Built a driver-based 3-statement model and 3-year forecast for a public company, with revenue and opex assumptions built from unit economics rather than flat growth rates, and bull/base/bear scenario analysis to identify a break-even revenue threshold.",
    tools: ["Excel", "Forecasting", "Scenario Analysis"],
    year: "2026",
    status: "live",
    icon: "📊",
  },
  {
    slug: "budget-vs-actual-variance",
    title: "Budget vs. Actual Variance Analysis",
    category: "FP&A",
    summary:
      "Built a 12-month departmental budget and variance report, diagnosing the two largest drivers of a variance and recommending corrective actions in a memo format for department leadership.",
    tools: ["Excel", "Budgeting", "Variance Analysis"],
    year: "2026",
    status: "live",
    icon: "📉",
  },
  {
    slug: "sales-performance-dashboard",
    title: "Sales Performance Dashboard",
    category: "Data Analysis",
    summary:
      "Analyzed a regional sales dataset to isolate a pricing/discounting issue from a true demand issue, building an interactive dashboard to summarize findings for a non-technical audience.",
    tools: ["Excel", "Dashboarding", "Data Analysis"],
    year: "2025",
    status: "live",
    icon: "📈",
  },
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

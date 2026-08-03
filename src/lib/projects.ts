export type Project = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  tools: string[];
  year: string;
};

export const projects: Project[] = [
  {
    slug: "three-statement-model",
    title: "3-Statement Financial Model",
    category: "Valuation/Modeling",
    summary:
      "Built a driver-based 3-statement model and 3-year forecast for a public company, with revenue and opex assumptions built from unit economics rather than flat growth rates, and bull/base/bear scenario analysis to identify a break-even revenue threshold.",
    tools: ["Excel", "Forecasting", "Scenario Analysis"],
    year: "2026",
  },
  {
    slug: "budget-vs-actual-variance",
    title: "Budget vs. Actual Variance Analysis",
    category: "FP&A",
    summary:
      "Built a 12-month departmental budget and variance report, diagnosing the two largest drivers of a variance and recommending corrective actions in a memo format for department leadership.",
    tools: ["Excel", "Budgeting", "Variance Analysis"],
    year: "2026",
  },
  {
    slug: "sales-performance-dashboard",
    title: "Sales Performance Dashboard",
    category: "Data Analysis",
    summary:
      "Analyzed a regional sales dataset to isolate a pricing/discounting issue from a true demand issue, building an interactive dashboard to summarize findings for a non-technical audience.",
    tools: ["Excel", "Dashboarding", "Data Analysis"],
    year: "2025",
  },
];

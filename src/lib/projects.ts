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
    slug: "dcf-valuation",
    title: "DCF Valuation Model",
    category: "Valuation",
    summary:
      "Discounted cash flow model projecting five years of free cash flow, a WACC-derived discount rate, and a sensitivity table to estimate intrinsic equity value.",
    tools: ["Excel", "WACC", "Sensitivity Analysis"],
    year: "2026",
  },
  {
    slug: "lbo-model",
    title: "LBO Model",
    category: "Private Equity",
    summary:
      "Leveraged buyout model with a full debt schedule, returns waterfall, and IRR / MOIC analysis across entry and exit multiple scenarios.",
    tools: ["Excel", "Debt Schedules", "IRR / MOIC"],
    year: "2026",
  },
  {
    slug: "comps-analysis",
    title: "Comparable Company Analysis",
    category: "Valuation",
    summary:
      "Trading comps benchmarking a target company against public peers using EV/EBITDA, EV/Revenue, and P/E multiples.",
    tools: ["Excel", "Trading Multiples"],
    year: "2025",
  },
  {
    slug: "merger-model",
    title: "M&A Merger Model",
    category: "M&A",
    summary:
      "Accretion / dilution model for a hypothetical acquisition, including pro forma EPS impact and purchase price allocation.",
    tools: ["Excel", "Accretion / Dilution", "Pro Forma EPS"],
    year: "2025",
  },
];

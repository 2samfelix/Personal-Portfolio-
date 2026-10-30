import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The locked monday.com plan workbook, hosted as a download (its SHA-256 is
        // checked against the locked release at build time, src/lib/mondayPlan.ts).
        source: "/monday-operating-plan/monday_plan.xlsx",
        headers: [
          { key: "Content-Type", value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
          { key: "Content-Disposition", value: 'attachment; filename="monday_plan.xlsx"' },
        ],
      },
      {
        // The one-page management memo, derived from the locked plan workbook (its
        // SHA-256 is pinned at build time, src/lib/mondayPlan.ts).
        source: "/downloads/monday-operating-plan-memo.pdf",
        headers: [
          { key: "Content-Type", value: "application/pdf" },
          { key: "Content-Disposition", value: 'attachment; filename="monday-operating-plan-memo.pdf"' },
        ],
      },
    ];
  },
};

export default nextConfig;

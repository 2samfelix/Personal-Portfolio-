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
    ];
  },
};

export default nextConfig;

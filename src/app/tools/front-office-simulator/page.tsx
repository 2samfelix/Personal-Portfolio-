import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FrontOfficeSimulator from "@/components/FrontOfficeSimulator";

export const metadata: Metadata = {
  title: "Front Office — Interactive Demo | Sam Felix",
  description:
    "A Green Bay Packers front-office simulator built on their real, audited FY2026 financials — six spending levers, a hard salary cap, and a live operating P&L.",
};

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <FrontOfficeSimulator />
      <Footer />
    </div>
  );
}

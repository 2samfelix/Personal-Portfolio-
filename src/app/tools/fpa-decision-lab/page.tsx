import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FpaDecisionLab from "@/components/FpaDecisionLab";

export const metadata: Metadata = pageMetadata({
  title: "FP&A Decision Lab — Interactive Demo | Sam Felix",
  description:
    "An interactive SaaS financial-planning simulator that projects MRR, EBITDA, and cash runway 12 months forward under Base, Upside, and Downside scenarios.",
  path: "/tools/fpa-decision-lab",
  image: "/og/site.png",
});

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <FpaDecisionLab />
      <Footer />
    </div>
  );
}

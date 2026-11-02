import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DriverSensitivitySimulator from "@/components/DriverSensitivitySimulator";

export const metadata: Metadata = pageMetadata({
  title: "Driver Sensitivity Simulator — Interactive Demo | Sam Felix",
  description:
    "An interactive demo tool that flexes revenue and cost drivers to show which assumptions move EBITDA the most.",
  path: "/tools/driver-sensitivity-simulator",
  image: "/og/site.png",
});

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <DriverSensitivitySimulator />
      <Footer />
    </div>
  );
}

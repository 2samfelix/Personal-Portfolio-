import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ScrollReveal from "@/components/ScrollReveal";
import WhyAnalyticsStrategy from "@/components/WhyAnalyticsStrategy";
import WorkGrid from "@/components/WorkGrid";
import Builds from "@/components/Builds";
import Experience from "@/components/Experience";
import Expertise from "@/components/Expertise";
import HowIWork from "@/components/HowIWork";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { SITE_DESCRIPTION, SITE_NAME, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/" });

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <WhyAnalyticsStrategy />
        <HowIWork />
        <WorkGrid />
        <Builds />
        <Expertise />
        {/* Space kept clear between Expertise and Experience (reserved for a skyline). */}
        <Experience />
        <Contact />
      </main>
      <Footer />
      <ScrollReveal />
    </div>
  );
}

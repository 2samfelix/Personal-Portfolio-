import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ScrollReveal from "@/components/ScrollReveal";
import WhyAnalyticsStrategy from "@/components/WhyAnalyticsStrategy";
import WorkGrid from "@/components/WorkGrid";
import Builds from "@/components/Builds";
import Experience from "@/components/Experience";
import Skyline from "@/components/Skyline";
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
        {/* The Chicago skyline, between Expertise and Experience: decorative, no text. */}
        <div aria-hidden="true" className="bg-cream pt-16 sm:pt-24 print:hidden">
          <div className="mx-auto w-full max-w-6xl px-6">
            <Skyline />
          </div>
        </div>
        <Experience />
        <Contact />
      </main>
      <Footer />
      <ScrollReveal />
    </div>
  );
}

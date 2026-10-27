import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ScrollReveal from "@/components/ScrollReveal";
import WhyAnalyticsStrategy from "@/components/WhyAnalyticsStrategy";
import WorkGrid from "@/components/WorkGrid";
import Builds from "@/components/Builds";
import Philosophy from "@/components/Philosophy";
import Experience from "@/components/Experience";
import Expertise from "@/components/Expertise";
import HowIWork from "@/components/HowIWork";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <WhyAnalyticsStrategy />
        <Expertise />
        <HowIWork />
        <WorkGrid />
        <Builds />
        <Philosophy />
        <Experience />
        <Contact />
      </main>
      <Footer />
      <ScrollReveal />
    </div>
  );
}

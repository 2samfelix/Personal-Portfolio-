import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhyAnalyticsStrategy from "@/components/WhyAnalyticsStrategy";
import WorkGrid from "@/components/WorkGrid";
import Builds from "@/components/Builds";
import Philosophy from "@/components/Philosophy";
import Experience from "@/components/Experience";
import Expertise from "@/components/Expertise";
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
        <WorkGrid />
        <Builds />
        <Philosophy />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

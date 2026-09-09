import Header from "@/components/Header";
import Hero from "@/components/Hero";
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
        <WorkGrid />
        <Builds />
        <Philosophy />
        <Experience />
        <Expertise />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

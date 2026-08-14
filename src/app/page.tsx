import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
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
        <Projects />
        <Philosophy />
        <Experience />
        <Expertise />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

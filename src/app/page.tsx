import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Projects from "@/components/Projects";
import About from "@/components/About";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-slate-950">
      <Header />
      <main className="flex flex-1 flex-col divide-y divide-slate-200 dark:divide-slate-800">
        <Hero />
        <Projects />
        <About />
      </main>
    </div>
  );
}

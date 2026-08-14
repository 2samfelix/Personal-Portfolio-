import { siteConfig } from "@/lib/site-config";

const stats = [
  { value: "18 Clients", label: "Payroll & benefits managed monthly" },
  { value: "150+ Employees", label: "HRIS & org data maintained" },
  { value: "3 Projects", label: "Independent financial models built" },
  { value: "AI-Focused", label: "Building AI-powered finance tools" },
];

export default function Hero() {
  return (
    <section id="home" className="bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Finance &middot; Accounting &middot; AI
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Building the finance toolkit{" "}
              <span className="text-blue-500">of the AI era.</span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-400">
              I&apos;m a business analyst and junior accountant with
              hands-on experience in payroll, reconciliations, and financial
              reporting — now building independent financial models and
              AI-powered finance tools to sharpen my analytics skillset.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="#work"
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Explore My Work &rarr;
              </a>
              <a
                href={siteConfig.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-900"
              >
                Download Resume
              </a>
              <a
                href={siteConfig.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-900"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className="flex aspect-[4/5] w-full max-w-sm items-center justify-center justify-self-center rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-500 lg:justify-self-end">
            Add a headshot here — drop an image in{" "}
            <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
              public/headshot.jpg
            </code>{" "}
            and swap it in.
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-slate-800 pt-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.value}>
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

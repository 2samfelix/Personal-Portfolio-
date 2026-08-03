export default function Hero() {
  return (
    <section
      id="home"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-16 pt-24 sm:pt-32"
    >
      <p className="text-sm font-medium uppercase tracking-widest text-blue-700 dark:text-blue-400">
        Finance Student
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
        Sam Felix
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
        Building financial models and analysis to break into a junior
        financial analyst role — 3-statement modeling, budgeting &amp;
        forecasting, and business analysis built from scratch in Excel.
      </p>
      <div className="flex flex-wrap gap-4 pt-2">
        <a
          href="#projects"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          View Projects
        </a>
        <a
          href="mailto:2samfelix@gmail.com"
          className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-50 dark:hover:bg-slate-900"
        >
          Get in Touch
        </a>
      </div>
    </section>
  );
}

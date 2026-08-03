const skills = [
  "Financial Modeling",
  "DCF Valuation",
  "LBO Analysis",
  "Comparable Company Analysis",
  "Excel (Advanced)",
  "PowerPoint",
];

export default function About() {
  return (
    <section
      id="about"
      className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        About
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-12 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
            I&apos;m a finance student focused on equity valuation and
            corporate finance, currently building out a portfolio of
            financial models to prepare for a junior financial analyst role.
            Each project on this site was built independently in Excel to
            practice the modeling standards used in investment banking and
            equity research.
          </p>
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Education
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              B.S. in Finance, [Your University] — Expected [Month Year]
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Skills &amp; Tools
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="text-sm text-slate-600 dark:text-slate-400"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

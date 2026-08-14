export default function Experience() {
  return (
    <section id="experience" className="bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-10 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
              Experience
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hands-on in finance, payroll, and people ops.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Experience across payroll processing, financial reporting, HRIS
            data, and compensation administration.
          </p>
        </div>

        <div className="flex flex-col gap-8 border-b border-slate-800 py-10 sm:flex-row sm:gap-12">
          <div className="w-full shrink-0 text-sm font-medium text-slate-400 sm:w-40">
            2025 — Present
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              Marketstaff — Business Analyst &amp; Junior Accountant
            </h3>
            <p className="mt-1 text-sm text-slate-500">Chicago, IL</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Started as a summer intern in 2025, converted to full-time
              upon graduation in 2026
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Process payroll for 18 clients on monthly, semimonthly, and
              bi-weekly cycles, monitor company cash flow and forecasting,
              and manage full-cycle accounts payable and receivable, bank
              and insurance benefit reconciliations, and invoicing. Validate
              HRIS data and maintain an accurate organizational chart and
              compensation range catalog for roughly 150 employees, support
              the annual compensation process (merit increases and bonus
              administration), and assist with the annual performance
              review cycle.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8 pt-10 sm:flex-row sm:gap-12">
          <div className="w-full shrink-0 text-sm font-medium text-slate-400 sm:w-40">
            Education
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              Syracuse University, Whitman School of Management
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              B.S. in Finance &amp; Management (double major) — Graduated
              May 2026
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const columns = [
  {
    title: "Finance & Accounting",
    items: [
      "Payroll processing (multi-client)",
      "Accounts payable & receivable",
      "Bank & benefits reconciliation",
      "Cash flow monitoring & forecasting",
      "Compensation & bonus administration",
    ],
  },
  {
    title: "Data & Modeling",
    items: [
      "3-statement financial modeling",
      "Budgeting & variance analysis",
      "Excel (advanced) & VBA",
      "Ad hoc & dashboard reporting",
      "Data analysis",
    ],
  },
  {
    title: "Systems & AI",
    items: [
      "HRIS data management",
      "Payroll & benefits systems",
      "AI-assisted finance workflows (learning)",
      "Prompt engineering (learning)",
      "Building finance calculators & tools",
    ],
  },
];

export default function Expertise() {
  return (
    <section id="expertise" className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Core Expertise
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Where finance meets data.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            A combination of hands-on payroll and accounting experience and
            a growing toolkit in modeling, analytics, and AI.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {columns.map((column) => (
            <div
              key={column.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="text-sm leading-6 text-slate-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type EmploymentPeriod = {
  label: string;
  dates: string;
};

const MARKETSTAFF_PERIODS: EmploymentPeriod[] = [
  { label: "Summer Intern", dates: "May 2025 – August 2025" },
  { label: "Full-Time", dates: "May 2026 – Present" },
];

const MARKETSTAFF_BULLETS: string[] = [
  "Process payroll for 18 clients across monthly, semimonthly, and biweekly cycles, and perform monthly bank and insurance-benefit reconciliations.",
  "Monitor company cash flow for monthly spend and forecasting.",
  "Manage accounts payable and accounts receivable, and issue invoices for services rendered.",
  "Produce ad hoc reporting across payroll, insurance benefits, and company demographics; validate HRIS data and maintain the organizational chart and compensation-range catalog for roughly 150 employees.",
  "Support annual compensation administration (merit increases, bonus calculations) and the annual performance-review cycle, employee onboarding/offboarding, benefits open enrollment, and employee payroll/benefits inquiries.",
];

type LeadershipEntry = {
  org: string;
  role: string;
  dates: string;
  location: string;
  bullets: string[];
};

const LEADERSHIP: LeadershipEntry[] = [
  {
    org: "Syracuse University Running Club",
    role: "Secretary & Assistant Treasurer",
    dates: "Fall 2025 – Spring 2026",
    location: "Syracuse, NY",
    bullets: [
      "Helped organize and track funds for meets, travel, uniforms, entry fees, and other club operating costs.",
      "Supported day-to-day club administration and organization.",
    ],
  },
  {
    org: "Syracuse University Investment Club",
    role: "Member",
    dates: "2023 – 2025",
    location: "Syracuse, NY",
    bullets: [
      "Attended weekly investment and market-analysis meetings.",
      "Participated in the club's stock-pitch competition.",
    ],
  },
];

type CredentialStatus = "Completed" | "In Progress";

type Credential = {
  name: string;
  status: CredentialStatus;
  /** Fill in once finalized — left blank until confirmed. */
  issuer?: string;
  completedDate?: string;
  credentialId?: string;
  verifyUrl?: string;
};

const CREDENTIALS: Credential[] = [
  { name: "Bloomberg Market Concepts", status: "Completed" },
  { name: "SIE", status: "In Progress" },
  { name: "Advanced Excel Certification", status: "In Progress" },
];

function CredentialStatusPill({ status }: { status: CredentialStatus }) {
  if (status === "Completed") {
    return (
      <span className="inline-flex w-fit items-center rounded-full bg-brass px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cream">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-forest/25 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-charcoal-soft">
      In Progress
    </span>
  );
}

type CourseworkGroup = {
  group: string;
  /** Provisional placeholder titles — swap for final Syracuse catalog names. */
  courses: string[];
};

const COURSEWORK_GROUPS: CourseworkGroup[] = [
  { group: "Finance & Markets", courses: ["International Finance", "Investments", "Finance Analytics"] },
  { group: "Accounting & Corporate Finance", courses: ["Financial Accounting", "Managerial Accounting"] },
  { group: "Analytics & Operations", courses: ["Business Analytics", "Introduction to Supply Chain"] },
  { group: "Management", courses: ["Selected Management Coursework"] },
];

const COURSEWORK_COLUMN_COUNT = Math.max(...COURSEWORK_GROUPS.map((g) => g.courses.length));

function SubsectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-brass">{children}</h3>
      <span className="mt-2 block h-0.5 w-10 bg-brass" />
    </div>
  );
}

export default function Experience() {
  return (
    <section id="experience" className="bg-cream">
      {/* Intro + Professional Experience — base cream */}
      <div className="mx-auto w-full max-w-5xl px-6 pt-28 sm:pt-40">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass">Experience</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            Where I&apos;ve worked, led, and learned.
          </h2>
          <p className="mt-4 text-base leading-7 text-charcoal-soft">
            Real operating experience across finance, payroll, client service, and people operations.
          </p>
        </div>

        <div className="mt-24">
          <SubsectionHeading>Professional Experience</SubsectionHeading>

          <div className="relative mt-8 border-l-2 border-forest/15 pl-8">
            <span className="absolute left-0 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brass" />

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="text-xl font-bold text-forest">Marketstaff</h4>
              <span className="text-sm text-charcoal-soft">Chicago, IL</span>
            </div>
            <p className="mt-1 text-base font-medium text-charcoal">Business Analyst &amp; Junior Accountant</p>

            <div className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-10">
              {MARKETSTAFF_PERIODS.map((period) => (
                <div key={period.label} className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brass">{period.dates}</span>
                  <span className="text-xs text-charcoal-soft">{period.label}</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs italic leading-5 text-charcoal-soft">
              Started as a summer intern in 2025 and returned full-time after graduating in 2026.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {MARKETSTAFF_BULLETS.map((bullet) => (
                <li
                  key={bullet}
                  className="text-sm leading-7 text-charcoal-soft before:mr-2 before:text-brass before:content-['—']"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Leadership & Activities — subtle mist wash */}
      <div className="mt-24 bg-mist/60 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <SubsectionHeading>Leadership &amp; Activities</SubsectionHeading>

          <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
            {LEADERSHIP.map((entry) => (
              <div key={entry.org} className="relative border-l border-forest/10 pl-6">
                <span className="absolute left-0 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brass/60" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h4 className="text-sm font-semibold text-charcoal">{entry.org}</h4>
                  <span className="text-xs text-charcoal-soft">{entry.dates}</span>
                </div>
                <p className="mt-0.5 text-xs text-charcoal-soft">
                  {entry.role} · {entry.location}
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {entry.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="text-xs leading-5 text-charcoal-soft before:mr-2 before:text-forest/30 before:content-['—']"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Education — back to base cream */}
      <div className="bg-cream py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <SubsectionHeading>Education</SubsectionHeading>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <h4 className="text-base font-semibold text-charcoal">
                Syracuse University — Martin J. Whitman School of Management
              </h4>
              <p className="mt-1 text-sm text-charcoal-soft">B.S. in Finance &amp; Management — Dual Major</p>
            </div>
            <p className="text-xs text-charcoal-soft">Syracuse, NY · May 2026</p>
          </div>
        </div>
      </div>

      {/* Credentials — pale stone band */}
      <div className="bg-brass-pale/35 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-6">
          <SubsectionHeading>Credentials</SubsectionHeading>
          <div className="mt-8 divide-y divide-forest/10 border-y border-forest/10">
            {CREDENTIALS.map((credential) => (
              <div key={credential.name} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-charcoal">{credential.name}</span>
                <CredentialStatusPill status={credential.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Relevant Coursework — muted panel */}
      <div className="bg-mist/40 py-16 pb-28 sm:py-20 sm:pb-40">
        <div className="mx-auto w-full max-w-5xl px-6">
          <SubsectionHeading>Selected Relevant Coursework</SubsectionHeading>
          <p className="mt-2 text-xs leading-5 text-charcoal-soft">
            Selected coursework relevant to financial analysis, markets, accounting, analytics, and business
            operations.
          </p>
          {/* Grid column count (sm:grid-cols-[190px_repeat(3,1fr)]) is a static
              Tailwind class tied to COURSEWORK_COLUMN_COUNT=3, the current
              data's widest row (Finance & Markets). If a future group grows
              past 3 courses, update this class to match. */}
          <div className="mt-8 overflow-hidden border border-forest/10 bg-cream/60">
            {COURSEWORK_GROUPS.map((group, rowIndex) => (
              <div
                key={group.group}
                className={`grid grid-cols-1 sm:grid-cols-[190px_repeat(3,1fr)] ${
                  rowIndex !== 0 ? "border-t border-forest/10" : ""
                } ${rowIndex % 2 === 1 ? "bg-forest/[0.03]" : ""}`}
              >
                <div className="px-4 py-3 sm:border-r sm:border-forest/10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brass">{group.group}</p>
                </div>
                {Array.from({ length: COURSEWORK_COLUMN_COUNT }).map((_, colIndex) => {
                  const course = group.courses[colIndex];
                  return (
                    <div
                      key={colIndex}
                      className={`border-t border-forest/10 px-4 py-3 text-sm sm:border-t-0 ${
                        colIndex < COURSEWORK_COLUMN_COUNT - 1 ? "sm:border-r sm:border-forest/10" : ""
                      } ${course ? "text-forest" : "hidden text-charcoal-soft/30 sm:block"}`}
                    >
                      {course}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

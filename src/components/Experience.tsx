// Experience, Leadership & Activities, and one dark band for Education, Credentials and
// Coursework. Static markup (no JavaScript); thin rules and spacing instead of boxes.
// Text on the forest band is cream or light brass, which pass WCAG AA on forest.

type EmploymentPeriod = {
  label: string;
  dates: string;
};

const MARKETSTAFF_PERIODS: EmploymentPeriod[] = [
  { label: "Accounting and Payroll Intern", dates: "Summer 2025" },
  { label: "Accounting & Payroll Associate", dates: "June 2026 – Present" },
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
  /** Omitted when not yet confirmed. */
  role?: string;
  dates?: string;
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
  {
    org: "Franklin Supply Chain Club",
    dates: "2023 – 2025",
    location: "Syracuse University",
    bullets: [],
  },
  {
    org: "Delta Tau Delta fraternity",
    location: "Syracuse University",
    bullets: [],
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
      <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-brass-light px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-forest">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-cream/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-cream">
      In Progress
    </span>
  );
}

type CourseworkGroup = {
  group: string;
  courses: string[];
};

const COURSEWORK_GROUPS: CourseworkGroup[] = [
  { group: "Finance & Markets", courses: ["International Finance", "Investments", "Financial Analytics", "Sustainable Finance & Impact Investing"] },
  { group: "Accounting & Corporate Finance", courses: ["Financial Accounting", "Managerial Accounting", "Corporate Finance"] },
  { group: "Analytics & Operations", courses: ["Business Analytics for Management Decisions", "Introduction to Supply Chain"] },
  {
    group: "Management & Strategy",
    courses: ["Managing in a Global Setting", "Strategic and Entrepreneurial Management", "Principles of Marketing", "Geopolitics & Firm Strategy"],
  },
];

/** A section heading inside Experience: larger than before, with a short brass rule. */
function SubsectionHeading({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h3 className={`text-2xl font-bold tracking-tight sm:text-3xl ${dark ? "text-cream" : "text-charcoal"}`}>
      {children}
      <span aria-hidden="true" className={`mt-3 block h-0.5 w-10 ${dark ? "bg-brass-light" : "bg-brass"}`} />
    </h3>
  );
}

export default function Experience() {
  return (
    <section id="experience" className="bg-cream pb-24 sm:pb-32">
      {/* Intro */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-28 sm:pt-40">
        <p className="text-sm font-semibold uppercase tracking-widest text-brass-ink">Experience</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
          Where I&apos;ve worked, led, and learned.
        </h2>
        <p className="mt-5 max-w-[60ch] text-lg leading-8 text-charcoal-soft">
          Real operating experience across finance, payroll, client service, and people operations.
        </p>

        {/* Marketstaff: the anchor entry */}
        <div className="mt-20">
          <div className="relative border-l-2 border-forest/20 pl-8 sm:pl-10">
            <span aria-hidden="true" className="absolute left-0 top-3 h-3 w-3 -translate-x-[calc(50%+1px)] rounded-full bg-brass" />
            <p className="text-sm font-semibold uppercase tracking-widest text-brass-ink">Professional Experience</p>
            <h3 className="mt-3 text-3xl font-black leading-tight tracking-tight text-charcoal sm:text-4xl">Accounting &amp; Payroll Associate</h3>
            <p className="mt-2 text-lg font-semibold text-forest">
              Marketstaff <span className="font-normal text-charcoal-soft">· Chicago, IL</span>
            </p>

            {/* The two periods on the timeline rule. */}
            <ol className="mt-8 flex flex-col gap-4">
              {MARKETSTAFF_PERIODS.map((period) => (
                <li key={period.label} className="relative">
                  <span aria-hidden="true" className="absolute -left-8 top-2 h-2 w-2 -translate-x-[calc(50%+1px)] rounded-full border-2 border-brass bg-cream sm:-left-10" />
                  <span className="block text-sm font-semibold uppercase tracking-wide text-brass-ink">{period.dates}</span>
                  <span className="block text-base text-charcoal">{period.label}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 max-w-[60ch] text-sm italic leading-6 text-charcoal-soft">
              Started as a summer intern in 2025 and returned full-time in 2026 while finishing my B.S.
            </p>

            <ul className="mt-8 flex max-w-[65ch] flex-col gap-4 border-t border-forest/15 pt-8">
              {MARKETSTAFF_BULLETS.map((bullet) => (
                <li key={bullet} className="text-base leading-7 text-charcoal-soft before:mr-2 before:text-brass-ink before:content-['—']">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Leadership & Activities: secondary entries in a ruled grid */}
        <div className="mt-24 sm:mt-28">
          <SubsectionHeading>Leadership &amp; Activities</SubsectionHeading>
          <ul className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {LEADERSHIP.map((entry) => (
              <li key={entry.org} className="border-t border-forest/20 pt-5">
                {entry.dates && <p className="text-xl font-light tracking-tight text-charcoal-soft">{entry.dates}</p>}
                <h4 className="mt-2 text-base font-semibold leading-6 text-charcoal">{entry.org}</h4>
                <p className="mt-1 text-sm text-charcoal-soft">{entry.role ? `${entry.role} · ${entry.location}` : entry.location}</p>
                {entry.bullets.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {entry.bullets.map((bullet) => (
                      <li key={bullet} className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-brass-ink before:content-['—']">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Education, Credentials and Coursework: one forest band */}
      <div className="mt-24 bg-forest py-20 text-cream sm:mt-28 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
          <div>
            <SubsectionHeading dark>Education</SubsectionHeading>
            <div className="mt-8 border-t border-cream/20 pt-5">
              <h4 className="text-lg font-semibold leading-7 text-cream">Syracuse University — Martin J. Whitman School of Management</h4>
              <p className="mt-2 text-base text-cream/90">B.S. in Finance &amp; Management — Dual Major</p>
              <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-brass-light">Syracuse, NY · Degree expected Winter 2026</p>
            </div>
          </div>

          <div>
            <SubsectionHeading dark>Credentials</SubsectionHeading>
            <ul className="mt-8 border-b border-cream/20">
              {CREDENTIALS.map((credential) => (
                <li key={credential.name} className="flex items-center justify-between gap-4 border-t border-cream/20 py-4">
                  <span className="text-base font-medium text-cream">{credential.name}</span>
                  <CredentialStatusPill status={credential.status} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SubsectionHeading dark>Selected Relevant Coursework</SubsectionHeading>
            <p className="mt-6 max-w-[55ch] text-sm leading-6 text-cream/80">
              Selected coursework relevant to financial analysis, markets, accounting, analytics, and business operations.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {COURSEWORK_GROUPS.map((group) => (
                <div key={group.group} className="border-t border-cream/20 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-brass-light">{group.group}</h4>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {group.courses.map((course) => (
                      <li key={course} className="text-sm leading-6 text-cream/90">
                        {course}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { Project } from "@/lib/projects";
import WorkbookPreview from "@/components/model-preview/WorkbookPreview";
import ModelPreviewTeaser from "@/components/model-preview/ModelPreviewTeaser";
import { formulaBarHeights, viewGridHeights } from "@/lib/modelPreview";
import {
  LIMITS,
  PLAN_DOC,
  PLAN_DOWNLOAD_PATH,
  PLAN_SHA256,
  README_URL,
  RELEASES,
  REPO_URL,
  RESULTS_AT_UTC,
  RESULTS_DATE,
  RESULTS_DATE_SHORT,
  loadMondayCharts,
  loadMondayPlan,
  type LockRelease,
} from "@/lib/mondayPlan";
import { CARD_CTA, CARD_LIFT } from "@/components/project/cardLift";
import {
  MEASURE,
  STACK_BODY,
  STACK_HEAD,
  STACK_LABEL,
  STACK_ROW,
  STACK_TABLE,
  STACK_VALUE,
  STACK_WIDE,
} from "@/components/project/layout";
import { BreakevenChart, BridgeChart, GrowthChart, QuarterlyCharts, RangeChart, WorkbookNumber as N } from "@/components/monday/MondayCharts";
import InPageMenu from "@/components/monday/InPageMenu";
import ResultsCountdown from "@/components/monday/ResultsCountdown";

// Whole sheets at 100% zoom; the desktop grid is sized to each tab at build time.
const PREVIEW_ZOOM = 1;
const PREVIEW_GRID_HEIGHTS = viewGridHeights(PLAN_DOC, PREVIEW_ZOOM, 480);
const PREVIEW_BAR_HEIGHTS = {
  narrow: formulaBarHeights(PLAN_DOC, "narrow"),
  wide: formulaBarHeights(PLAN_DOC, "wide"),
};

const TAGS = ["Strategic FP&A", "Scenario analysis", "Cash / FCF"];

// Text labels use a darker brass than the site's text-brass (3.97:1 on cream), so
// they pass WCAG AA (5.58:1 on cream, 6.3:1 on white).
const LABEL = "text-[#7a5a30]";

const MENU = [
  { href: "#plan", label: "Plan" },
  { href: "#scenarios", label: "Scenarios" },
  { href: "#triggers", label: "Triggers" },
  { href: "#q3-test", label: "Locked test" },
  { href: "#inside-the-model", label: "Model" },
  { href: "#downloads", label: "Downloads" },
];

// Sections clear the site header (69-77px) and the in-page menu when jumped to.
const SECTION = "scroll-mt-36";

const TAG_CLASS: Record<string, string> = {
  Sourced: "bg-[#e3eaf7] text-[#1d3f8a]",
  Derived: "bg-forest/10 text-forest",
  Assumed: "bg-[#fbe5d6] text-[#8a3d0c]",
  Text: "bg-charcoal/5 text-charcoal-soft",
};

/** A Sourced / Derived / Assumed label beside a figure, as in the workbook. */
function Tag({ tag }: { tag: string }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TAG_CLASS[tag] ?? TAG_CLASS.Text}`}>
      {tag}
    </span>
  );
}

function SectionHeading({ id, eyebrow, children }: { id: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <div>
      {eyebrow && <p className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>{eyebrow}</p>}
      <h2 id={id} className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
        {children}
      </h2>
    </div>
  );
}

const TH = "px-4 py-3 text-right text-[13px] font-semibold uppercase tracking-wide text-charcoal-soft";
const TH_LEFT = "px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-wide text-charcoal-soft";
const TD = "px-4 py-3 text-right text-base tabular-nums text-charcoal";

function utc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

function ReleaseCard({ release }: { release: LockRelease }) {
  return (
    <div className="rounded-2xl border border-forest/15 bg-white p-6">
      <p className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>{release.title}</p>
      <a href={release.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-lg font-bold text-forest hover:text-forest-dark">
        {release.tag} ↗
      </a>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-base">
        <dt className="text-charcoal-soft">Published</dt>
        <dd className="text-charcoal">{utc(release.publishedAt)}</dd>
        <dt className="text-charcoal-soft">Commit</dt>
        <dd className="break-all font-mono text-sm text-charcoal">{release.commit}</dd>
        <dt className="text-charcoal-soft">File</dt>
        <dd className="text-charcoal">{release.file}</dd>
        <dt className="text-charcoal-soft">SHA-256</dt>
        <dd className="break-all font-mono text-sm text-charcoal">{release.sha256}</dd>
      </dl>
    </div>
  );
}

export default function MondayPlanProjectPage({ prev, next }: { project: Project; prev?: Project; next?: Project }) {
  const { plan, scorecard } = loadMondayPlan();
  const charts = loadMondayCharts();
  const { cases, caseHead } = plan;
  const { strip } = charts;
  const [q3Release, planRelease] = RELEASES;
  const [watchMap, actionMap, plusT3Map] = plan.mapping;
  // The lever each trigger maps to, from the workbook's tier-to-action table.
  const triggerLever = [watchMap, actionMap, actionMap, plusT3Map];

  const summary = [
    <>
      <strong>The plan.</strong> A quarterly operating plan for monday.com, Q3 2026 to Q4 2027, built outside-in from SEC filings, with a Base case and a Downside case.
    </>,
    <>
      <strong>Base vs Downside.</strong> FY27 revenue <N c={strip.baseRevenue} /> vs <N c={strip.downRevenue} /> (USD m); non-GAAP operating margin <N c={strip.baseMargin} /> vs{" "}
      <N c={strip.downMargin} />.
    </>,
    <>
      <strong>Why the cases cannot be told apart in advance.</strong> The FY27 revenue gap (<N c={strip.gapPct} /> of Base) is <N c={strip.gapX} /> the average 4-quarter-ahead backtest miss.
    </>,
    <>
      <strong>The triggers.</strong> A revenue trigger in two tiers (Watch is review only; Action pulls Lever 1), a guidance-beat trigger and a net-adds trigger for customers above $50K ARR; Lever 2 only if net adds also fall.
    </>,
    <>
      <strong>What is locked.</strong> The Q3 forecast ({q3Release.tag}) and the operating plan ({planRelease.tag}), frozen as GitHub Releases before the results on {RESULTS_DATE}.
    </>,
  ];

  const timeline = [
    { when: utc(q3Release.publishedAt), what: "Q3 call locked", detail: q3Release.tag, href: q3Release.url, done: true },
    { when: utc(planRelease.publishedAt), what: "Operating plan locked", detail: planRelease.tag, href: planRelease.url, done: true },
    { when: RESULTS_DATE, what: "Q3 2026 results", detail: "Pending", done: false },
    { when: "After the results", what: "Scoring", detail: "Actuals recorded in the Scorecard; thresholds unchanged", done: false },
  ];

  return (
    <main className="bg-cream">
      {/* Hero: full-width forest band (prints in colour; see globals.css). */}
      <section id="monday-hero" aria-labelledby="monday-title" className="bg-forest text-cream">
        <div className="mx-auto w-full max-w-6xl px-6 pb-12 pt-10 sm:pb-16">
          <Link
            href="/#work"
            className="rounded-sm text-base font-semibold text-cream/90 underline-offset-4 hover:text-cream hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light"
          >
            &larr; Back to Projects
          </Link>
          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
            <div>
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {TAGS.map((t) => (
                  <li key={t} className="rounded-full bg-cream/10 px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-cream">
                    {t}
                  </li>
                ))}
              </ul>
              <h1 id="monday-title" className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-cream sm:text-5xl lg:text-6xl">
                monday.com Operating Plan &amp; Rolling Reforecast
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-cream/90">
                A plan that says in advance what management should do if growth slows faster than guided, locked before the results.
              </p>
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-xl border border-brass-light/60 px-4 py-3">
                <span className="rounded-md bg-brass-light px-2 py-0.5 text-sm font-black uppercase tracking-widest text-forest">Pending</span>
                <span className="text-base text-cream/90">Q3 2026 results: {RESULTS_DATE}. No result is claimed on this page.</span>
              </div>
            </div>
            <GrowthChart g={charts.growth} />
          </div>
        </div>
      </section>

      <InPageMenu items={MENU} />

      <div className="mx-auto w-full max-w-6xl px-6 pb-16 sm:pb-24">
        {/* Number strip */}
        <section aria-label="Key numbers" className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-forest/15 bg-white p-6">
            <p className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>FY27 operating margin</p>
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-charcoal">
              <span className="text-forest"><N c={strip.baseMargin} /></span>
              <span className="mx-2 text-2xl font-semibold text-charcoal-soft">vs</span>
              <span className="text-rust"><N c={strip.downMargin} /></span>
            </p>
            <p className="mt-2 text-base text-charcoal-soft">Base vs Downside, non-GAAP</p>
          </div>
          <div className="rounded-2xl border border-forest/15 bg-white p-6">
            <p className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>FY27 revenue gap</p>
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-charcoal">
              <N c={strip.gapPct} />
            </p>
            <p className="mt-2 text-base text-charcoal-soft">
              of Base: <strong className="text-charcoal"><N c={strip.gapX} /></strong> a normal 4-quarter forecast miss
            </p>
          </div>
          <div className="rounded-2xl border border-forest/30 bg-forest/5 p-6">
            <p className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>Q3 results</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-forest">{RESULTS_DATE_SHORT}</p>
            <ResultsCountdown at={RESULTS_AT_UTC} className="mt-2 text-base text-charcoal-soft" />
          </div>
        </section>

        {/* Plan: 60-second summary and the management question */}
        <section id="plan" aria-labelledby="summary-heading" className={`mt-16 ${SECTION}`}>
          <SectionHeading id="summary-heading" eyebrow="Plan">60-second summary</SectionHeading>
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {summary.map((s, i) => (
              <li
                key={i}
                className={`flex flex-col gap-2 rounded-2xl border border-forest/15 bg-white p-6 ${i < 3 ? "lg:col-span-2" : "lg:col-span-3"} ${i === 4 ? "sm:col-span-2" : ""}`}
              >
                <span aria-hidden="true" className={`text-2xl font-black tabular-nums ${LABEL}`}>
                  {i + 1}
                </span>
                <p className="text-base leading-7 text-charcoal">{s}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-base text-charcoal-soft">
            Figures from the locked workbook&apos;s Executive_Summary sheet (USD millions unless shown). Base is a beat-adjusted central estimate, not guidance.
          </p>

          <figure className="mt-14 border-t border-forest/10 pt-10">
            <figcaption className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>
              <h2 id="question-heading" className="inline">Management question</h2>
            </figcaption>
            <span aria-hidden="true" className={`mt-4 block text-6xl font-black leading-none ${LABEL}`}>
              &ldquo;
            </span>
            <blockquote className="mt-2 max-w-4xl text-2xl font-semibold leading-10 tracking-tight text-charcoal sm:text-3xl sm:leading-[1.35]">
              {plan.question}
            </blockquote>
          </figure>
        </section>

        {/* Scenarios: charts, bridge, then the tables */}
        <section id="scenarios" aria-labelledby="cases-heading" className={`mt-20 ${SECTION}`}>
          <SectionHeading id="cases-heading" eyebrow="Scenarios">Base vs Downside (locked forecast, USD millions)</SectionHeading>
          <div className="mt-6 rounded-2xl border border-forest/15 bg-white p-5 sm:p-8">
            <QuarterlyCharts q={charts.quarterly} />
          </div>
          <div className="mt-6 rounded-2xl border border-forest/15 bg-white p-5 sm:p-8">
            <BridgeChart b={charts.bridge} />
          </div>

          <h3 className="mt-10 text-lg font-bold text-charcoal">FY2026 and FY2027 by case</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
            <table className={`w-full min-w-[42rem] border-collapse ${STACK_TABLE}`}>
              <thead className={STACK_HEAD}>
                <tr className="border-b border-forest/10 bg-cream">
                  <th scope="col" className={TH_LEFT}>Metric</th>
                  {caseHead.map((h) => (
                    <th key={h} scope="col" className={TH}>{h}</th>
                  ))}
                  <th scope="col" className={TH_LEFT}>Label</th>
                </tr>
              </thead>
              <tbody className={STACK_BODY}>
                {Object.values(cases).map((line) => (
                  <tr key={line.label} className={`border-b border-forest/10 last:border-b-0 ${STACK_ROW}`}>
                    <th scope="row" className={`px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{line.label}</th>
                    {line.values.map((v, i) => (
                      <td key={i} data-label={caseHead[i]} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td className={`px-4 py-3 ${STACK_VALUE} ${STACK_WIDE}`} data-label="Label"><Tag tag={line.tag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 text-lg font-bold text-charcoal">FY2027 Base adjusted FCF range</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
            <table className={`w-full min-w-[32rem] border-collapse ${STACK_TABLE}`}>
              <thead className={STACK_HEAD}>
                <tr className="border-b border-forest/10 bg-cream">
                  <th scope="col" className={TH_LEFT}>Case</th>
                  {plan.rangeHead.map((h) => (
                    <th key={h} scope="col" className={TH}>{h}</th>
                  ))}
                  <th scope="col" className={TH_LEFT}>Label</th>
                </tr>
              </thead>
              <tbody className={STACK_BODY}>
                {plan.fcfRange.map((line) => (
                  <tr key={line.label} className={`border-b border-forest/10 last:border-b-0 ${STACK_ROW}`}>
                    <th scope="row" className={`px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{line.label}</th>
                    {line.values.map((v, i) => (
                      <td key={i} data-label={plan.rangeHead[i]} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td className={`px-4 py-3 ${STACK_VALUE} ${STACK_WIDE}`} data-label="Label"><Tag tag={line.tag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`mt-3 text-base leading-7 text-charcoal-soft ${MEASURE}`}>
            The FY27 Base–Downside revenue gap is {plan.gapPct.values[0]} of Base, {plan.gapX.values[0]} the average 4-quarter-ahead backtest miss (both <Tag tag={plan.gapX.tag} />).
          </p>
        </section>

        {/* Management response */}
        <section id="response" aria-labelledby="response-heading" className={`mt-20 ${SECTION}`}>
          <SectionHeading id="response-heading" eyebrow="Management response">Breakeven for each lever</SectionHeading>
          <p className={`mt-3 text-base leading-7 text-charcoal-soft ${MEASURE}`}>
            Each lever saves operating income from the start quarter. The breakeven is the FY27 revenue loss that would cancel that saving; the growth cost itself cannot be measured from public data.
          </p>
          <div className="mt-6 rounded-2xl border border-forest/15 bg-white p-5 sm:p-8">
            <BreakevenChart rows={charts.breakeven} />
          </div>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
            <table className={`w-full min-w-[44rem] border-collapse ${STACK_TABLE}`}>
              <thead className={STACK_HEAD}>
                <tr className="border-b border-forest/10 bg-cream">
                  <th scope="col" className={TH_LEFT}>Lever</th>
                  {plan.breakeven.head.map((h) => (
                    <th key={h} scope="col" className={TH}>{h}</th>
                  ))}
                  <th scope="col" className={TH_LEFT}>Label</th>
                </tr>
              </thead>
              <tbody className={STACK_BODY}>
                {plan.breakeven.rows.map((line) => (
                  <tr key={line.label} className={`border-b border-forest/10 last:border-b-0 ${STACK_ROW}`}>
                    <th scope="row" className={`px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{line.label}</th>
                    {line.values.map((v, i) => (
                      <td key={i} data-label={plan.breakeven.head[i]} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td className={`px-4 py-3 ${STACK_VALUE} ${STACK_WIDE}`} data-label="Label"><Tag tag={line.tag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Triggers */}
        <section id="triggers" aria-labelledby="triggers-heading" className={`mt-20 ${SECTION}`}>
          <SectionHeading id="triggers-heading" eyebrow="Triggers">What would change the plan, and what happens then</SectionHeading>
          <p className={`mt-3 text-base leading-7 text-charcoal ${MEASURE}`}>{plan.fixedNote}</p>
          <p className={`mt-2 text-base leading-7 text-charcoal-soft ${MEASURE}`}>{plan.tierNote}</p>
          <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {plan.triggers.map((t, i) => {
              const tier = triggerLever[i].tier.split(":")[0];
              const badge = i < 2 ? tier : t.label.slice(0, 2);
              return (
                <li key={t.label} className="flex flex-col gap-3 rounded-2xl border border-forest/15 bg-white p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-sm font-black uppercase tracking-widest ${i === 0 ? "bg-brass-pale text-[#7a5a30]" : "bg-forest text-cream"}`}>
                      {badge}
                    </span>
                    <Tag tag={t.tag} />
                  </div>
                  <p className="text-lg font-bold leading-7 text-charcoal">{t.label}</p>
                  {t.values.length > 1 ? (
                    <dl className="grid w-full grid-cols-5 gap-2 max-sm:grid-cols-3">
                      {t.values.map((v, j) => (
                        <div key={j} className="flex flex-col items-end">
                          <dt className="text-sm text-charcoal-soft">{plan.recHead[j]}</dt>
                          <dd className="text-base font-semibold tabular-nums text-charcoal">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-3xl font-black tabular-nums text-forest">{t.values[0]}</p>
                  )}
                  <p className="text-base leading-7 text-charcoal-soft">{t.rule}</p>
                  <p className="rounded-xl bg-brass-pale px-3 py-2 text-base leading-7 text-charcoal">
                    <span className="font-semibold">History: </span>
                    {t.history}
                  </p>
                  <p className="mt-auto border-t border-forest/10 pt-3 text-base leading-7 text-charcoal">
                    <span className={`font-semibold ${LABEL}`}>Lever: </span>
                    {triggerLever[i].action}
                  </p>
                </li>
              );
            })}
          </ul>
          <h3 className="mt-10 text-lg font-bold text-charcoal">Tiers and actions</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
            <table className={`w-full min-w-[44rem] border-collapse ${STACK_TABLE}`}>
              <thead className={STACK_HEAD}>
                <tr className="border-b border-forest/10 bg-cream">
                  <th scope="col" className={TH_LEFT}>Tier / signal</th>
                  <th scope="col" className={TH_LEFT}>Action</th>
                  <th scope="col" className={TH_LEFT}>Earliest timing</th>
                  <th scope="col" className={TH_LEFT}>Note</th>
                </tr>
              </thead>
              <tbody className={STACK_BODY}>
                {plan.mapping.map((m) => (
                  <tr key={m.tier} className={`border-b border-forest/10 align-top last:border-b-0 ${STACK_ROW}`}>
                    <th scope="row" className={`px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{m.tier}</th>
                    <td data-label="Action" className={`px-4 py-3 text-base text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>{m.action}</td>
                    <td data-label="Earliest timing" className={`px-4 py-3 text-base text-charcoal-soft ${STACK_VALUE} ${STACK_WIDE}`}>{m.timing}</td>
                    <td data-label="Note" className={`px-4 py-3 text-base text-charcoal-soft ${STACK_VALUE} ${STACK_WIDE}`}>{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pre-Registered Q3 Test */}
        <section id="q3-test" aria-labelledby="q3-heading" className={`mt-20 ${SECTION}`}>
          <SectionHeading id="q3-heading" eyebrow="Locked test">Pre-Registered Q3 Test</SectionHeading>
          <p className="mt-4 inline-flex w-fit rounded-full border border-dashed border-charcoal-soft px-3 py-1 text-sm font-bold uppercase tracking-widest text-charcoal">
            Status: pending
          </p>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            The Q3 forecast and operating plan were locked before results were released. Actuals will be scored against the frozen files on November 9, 2026.
          </p>

          <h3 className="mt-10 text-lg font-bold text-charcoal">Lock timeline</h3>
          <ol className="mt-4 grid grid-cols-1 gap-0 md:grid-cols-4 md:gap-4">
            {timeline.map((s, i) => (
              <li key={s.what} className="relative flex gap-4 pb-6 md:flex-col md:gap-3 md:pb-0">
                {/* Connector: vertical on phones, horizontal from md. */}
                {i < timeline.length - 1 && (
                  <span aria-hidden="true" className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-forest/20 md:left-7 md:right-[-1rem] md:top-[11px] md:bottom-auto md:h-0.5 md:w-auto" />
                )}
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 ${s.done ? "border-forest bg-forest" : "border-dashed border-charcoal-soft bg-cream"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal-soft">{s.when}</p>
                  <p className="text-lg font-bold text-charcoal">{s.what}</p>
                  {s.href ? (
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="break-all text-base font-semibold text-forest hover:text-forest-dark">
                      {s.detail} ↗
                    </a>
                  ) : (
                    <p className={`text-base ${s.done ? "text-charcoal" : "italic text-charcoal-soft"}`}>{s.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {RELEASES.map((r) => (
              <ReleaseCard key={r.tag} release={r} />
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-forest/15 bg-white p-5 sm:p-8">
            <RangeChart ranges={charts.ranges} />
            <ul className="mt-6 flex flex-col gap-3 border-t border-forest/10 pt-5">
              {scorecard.noCalls.map((s) => (
                <li key={s.metric} className="text-base leading-7 text-charcoal">
                  <span className="font-bold">{s.metric}: No call made.</span>{" "}
                  <span className="text-charcoal-soft">Workbook reason: &ldquo;{s.reason}&rdquo;</span>
                </li>
              ))}
            </ul>
          </div>

          <h3 className="mt-10 text-lg font-bold text-charcoal">Scorecard</h3>
          <p className={`mt-2 text-base leading-7 text-charcoal-soft ${MEASURE}`}>
            Locked values from the locked Q3 call workbook ({q3Release.file}); guidance from the company&apos;s August 10, 2026 outlook. Actual, variance and interpretation stay empty until the results.
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
            <table className={`w-full min-w-[64rem] border-collapse ${STACK_TABLE}`}>
              <thead className={STACK_HEAD}>
                <tr className="border-b border-forest/10 bg-cream">
                  <th scope="col" className={TH_LEFT}>Metric</th>
                  <th scope="col" className={TH_LEFT}>Guidance</th>
                  <th scope="col" className={TH}>Locked Low</th>
                  <th scope="col" className={TH}>Locked Mid</th>
                  <th scope="col" className={TH}>Locked High</th>
                  <th scope="col" className={TH_LEFT}>Actual</th>
                  <th scope="col" className={TH_LEFT}>Variance</th>
                  <th scope="col" className={TH_LEFT}>Interpretation</th>
                </tr>
              </thead>
              <tbody className={STACK_BODY}>
                {scorecard.rows.map((s) => (
                  <tr key={s.metric} className={`border-b border-forest/10 align-top ${STACK_ROW}`}>
                    <th scope="row" className={`min-w-[11rem] px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>
                      {s.metric}
                      <span className="mt-1 block"><Tag tag={s.tag} /></span>
                    </th>
                    <td data-label="Guidance" className={`min-w-[13rem] px-4 py-3 text-base text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>
                      {s.guidance.text}
                      {s.guidance.label && <span className="mt-1 block text-sm leading-6 text-charcoal-soft">{s.guidance.label}</span>}
                    </td>
                    {s.values.map((v, i) => (
                      <td key={i} data-label={`Locked ${["Low", "Mid", "High"][i]}`} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td data-label="Actual" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Pending: Nov. 9</td>
                    <td data-label="Variance" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                    <td data-label="Interpretation" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                  </tr>
                ))}
                {scorecard.noCalls.map((s) => (
                  <tr key={s.metric} className={`border-b border-forest/10 align-top last:border-b-0 ${STACK_ROW}`}>
                    <th scope="row" className={`px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{s.metric}</th>
                    <td data-label="Guidance" className={`px-4 py-3 text-base text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>{s.guidance}</td>
                    <td colSpan={3} data-label="Locked" className={`px-4 py-3 text-left text-base text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>
                      <span className="font-semibold">No call made.</span>{" "}
                      <span className="text-charcoal-soft">Workbook reason: &ldquo;{s.reason}&rdquo;</span>
                    </td>
                    <td data-label="Actual" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Pending: Nov. 9</td>
                    <td data-label="Variance" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                    <td data-label="Interpretation" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Model Preview */}
        <section id="inside-the-model" aria-labelledby="inside-model-heading" className={`mt-20 ${SECTION}`}>
          <SectionHeading id="inside-model-heading" eyebrow="Model">Inside the model</SectionHeading>
          <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <p className={`text-base leading-7 text-charcoal ${MEASURE}`}>
              Six sheets of the locked plan workbook, as stored. Click any cell to see its formula and where it comes from.
            </p>
            <p className="text-base leading-7 text-charcoal-soft lg:max-w-[24rem]">
              The Executive_Summary title still reads &ldquo;DRAFT, not locked&rdquo; because it was written before the lock; the Release and hash are authoritative.
            </p>
          </div>
          <WorkbookPreview
            src="/monday-operating-plan/model-preview.json"
            title="monday.com operating plan: Executive_Summary, Scenarios, Revenue_Build, Cash_FCF, Recommendation and Assumptions sheets"
            downloadUrl={PLAN_DOWNLOAD_PATH}
            teaser={<ModelPreviewTeaser doc={PLAN_DOC} />}
            layout={{ zoom: PREVIEW_ZOOM, formulaBarHeights: PREVIEW_BAR_HEIGHTS, gridHeights: PREVIEW_GRID_HEIGHTS }}
          />
          <p className="mt-3 text-base leading-7 text-charcoal-soft">
            Labels in the workbook: <span className="font-semibold text-[#1d3f8a]">blue</span> = Sourced (copied from a filing, with a Row ID),
            black = Derived (a formula), <span className="font-semibold text-[#8a3d0c]">orange on peach</span> = Assumed (a judgement with rationale and sensitivity).
          </p>
        </section>

        {/* Downloads, repository */}
        <section id="downloads" aria-labelledby="downloads-heading" className={`mt-20 ${SECTION}`}>
          <SectionHeading id="downloads-heading" eyebrow="Downloads">Files and sources</SectionHeading>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Operating plan workbook",
                format: "XLSX",
                description: `monday_plan.xlsx, 18 sheets, live formulas: a copy of the locked file hosted on this site. SHA-256 ${PLAN_SHA256.slice(0, 12)}…`,
                href: PLAN_DOWNLOAD_PATH,
                cta: "Download workbook ↓",
                download: true,
              },
              {
                title: `GitHub Release ${planRelease.tag}`,
                format: "AUTHORITATIVE",
                description: "The authoritative copy of the operating plan, with its SHA-256 and the commit it points to.",
                href: planRelease.url,
                cta: "Open Release ↗",
              },
              {
                title: `GitHub Release ${q3Release.tag}`,
                format: "AUTHORITATIVE",
                description: "The authoritative copy of the Q3 2026 forecast to be scored on November 9.",
                href: q3Release.url,
                cta: "Open Release ↗",
              },
              {
                title: "Repository",
                format: "REPOSITORY",
                description: "All five workbooks, the design brief and the method change log.",
                href: REPO_URL,
                cta: "View GitHub ↗",
              },
              {
                title: "README",
                format: "README",
                description: "How the pre-registration and locks work, the scoring plan, labels, limits and data sources.",
                href: README_URL,
                cta: "Read README ↗",
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.href}
                {...(item.download ? { download: "monday_plan.xlsx" } : { target: "_blank", rel: "noopener noreferrer" })}
                className={`group flex flex-col p-6 ${CARD_LIFT}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-lg font-bold text-charcoal">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest">
                    {item.format}
                  </span>
                </div>
                <p className="mt-2 text-base leading-7 text-charcoal-soft">{item.description}</p>
                <span className={`mt-auto pt-4 ${CARD_CTA}`}>{item.cta}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Limits */}
        <section aria-labelledby="limits-heading" className="mt-16 border-t border-forest/10 pt-12">
          <SectionHeading id="limits-heading" eyebrow="Limits">What this plan is not</SectionHeading>
          <ul className={`mt-4 flex flex-col gap-2 ${MEASURE}`}>
            {LIMITS.map((item) => (
              <li key={item} className={`text-base leading-7 text-charcoal-soft before:mr-2 before:content-['—'] before:text-[#7a5a30]`}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Prev / Next */}
        <nav aria-label="Projects" className="mt-16 flex items-center justify-between border-t border-forest/10 pt-8">
          {prev ? (
            <Link href={`/projects/${prev.slug}`} className="text-base font-semibold text-charcoal-soft hover:text-charcoal">
              &larr; Previous Project
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/projects/${next.slug}`} className="text-base font-semibold text-charcoal-soft hover:text-charcoal">
              Next Project &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </main>
  );
}

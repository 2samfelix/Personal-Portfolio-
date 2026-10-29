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
  RESULTS_DATE,
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

// Whole sheets at 100% zoom; the desktop grid is sized to each tab at build time.
const PREVIEW_ZOOM = 1;
const PREVIEW_GRID_HEIGHTS = viewGridHeights(PLAN_DOC, PREVIEW_ZOOM, 480);
const PREVIEW_BAR_HEIGHTS = {
  narrow: formulaBarHeights(PLAN_DOC, "narrow"),
  wide: formulaBarHeights(PLAN_DOC, "wide"),
};

const TAGS = ["Strategic FP&A", "Scenario analysis", "Cash / FCF"];

// Section labels use a darker brass than the site's text-brass (3.97:1 on cream),
// so they pass WCAG AA (5.58:1 on cream, 6.3:1 on white).

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

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-sm font-semibold uppercase tracking-widest text-[#7a5a30]">
      {children}
    </h2>
  );
}

const TH = "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-soft";
const TH_LEFT = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-soft";
const TD = "px-4 py-3 text-right text-sm tabular-nums text-charcoal";

function utc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

function ReleaseCard({ release }: { release: LockRelease }) {
  return (
    <div className="rounded-2xl border border-forest/15 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#7a5a30]">{release.title}</p>
      <a href={release.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-lg font-bold text-forest hover:text-forest-dark">
        {release.tag} ↗
      </a>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-charcoal-soft">Published</dt>
        <dd className="text-charcoal">{utc(release.publishedAt)}</dd>
        <dt className="text-charcoal-soft">Commit</dt>
        <dd className="break-all font-mono text-[13px] text-charcoal">{release.commit}</dd>
        <dt className="text-charcoal-soft">File</dt>
        <dd className="text-charcoal">{release.file}</dd>
        <dt className="text-charcoal-soft">SHA-256</dt>
        <dd className="break-all font-mono text-[13px] text-charcoal">{release.sha256}</dd>
      </dl>
    </div>
  );
}

export default function MondayPlanProjectPage({ prev, next }: { project: Project; prev: Project; next: Project }) {
  const { plan, scorecard } = loadMondayPlan();
  const { cases, caseHead } = plan;
  const [q3Release, planRelease] = RELEASES;

  const summary = [
    "The plan: a quarterly operating plan for monday.com, Q3 2026 to Q4 2027, built outside-in from SEC filings, with a Base case and a Downside case.",
    `Base vs Downside: FY27 revenue ${cases.revenue.values[1]} vs ${cases.revenue.values[3]} (USD m); non-GAAP operating margin ${cases.margin.values[1]} vs ${cases.margin.values[3]}.`,
    `Why the cases cannot be told apart in advance: the FY27 revenue gap (${plan.gapPct.values[0]} of Base) is ${plan.gapX.values[0]} the average 4-quarter-ahead backtest miss.`,
    "The triggers: a revenue trigger in two tiers (Watch is review only; Action pulls Lever 1), a guidance-beat trigger and a net-adds trigger for customers above $50K ARR; Lever 2 only if net adds also fall.",
    `What is locked: the Q3 forecast (${q3Release.tag}) and the operating plan (${planRelease.tag}), frozen as GitHub Releases before the results on ${RESULTS_DATE}.`,
  ];

  return (
    <main className="bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <Link href="/#work" className="text-sm font-semibold text-forest hover:text-forest-dark">
          &larr; Back to Projects
        </Link>

        {/* 1. Hero */}
        <div className="mt-8">
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {TAGS.map((t) => (
              <li key={t} className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-forest">
                {t}
              </li>
            ))}
          </ul>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-charcoal sm:text-5xl">monday.com Operating Plan &amp; Rolling Reforecast</h1>
          <p className={`mt-6 text-xl leading-8 text-charcoal-soft ${MEASURE}`}>
            A quarterly operating plan with a Base and a Downside case, trigger metrics for management action, and a pre-registered Q3 2026 test, all locked before the results.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-forest/30 bg-forest/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#7a5a30]">Q3 2026 results</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-forest">PENDING</p>
              <p className="mt-2 text-sm leading-6 text-charcoal-soft">Reports {RESULTS_DATE}. No result is claimed on this page.</p>
            </div>
            {RELEASES.map((r) => (
              <div key={r.tag} className="rounded-2xl border border-forest/15 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7a5a30]">Locked: {r.title}</p>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all text-base font-bold text-forest hover:text-forest-dark">
                  {r.tag} ↗
                </a>
                <p className="mt-1 text-sm text-charcoal-soft">{utc(r.publishedAt)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Management question */}
        <section aria-labelledby="question-heading" className="mt-16">
          <SectionHeading id="question-heading">Management question</SectionHeading>
          <p className={`mt-4 text-2xl font-semibold leading-9 tracking-tight text-charcoal ${MEASURE}`}>{plan.question}</p>
        </section>

        {/* 3. 60-second summary */}
        <section aria-labelledby="summary-heading" className="mt-16 rounded-2xl border border-forest/15 bg-white p-6 sm:p-8">
          <SectionHeading id="summary-heading">60-second summary</SectionHeading>
          <ul className={`mt-4 flex flex-col gap-3 ${MEASURE}`}>
            {summary.map((s) => (
              <li key={s} className="text-base leading-7 text-charcoal before:mr-2 before:text-[#7a5a30] before:content-['—']">
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-charcoal-soft">
            Figures from the locked workbook&apos;s Executive_Summary sheet (USD millions unless shown). Base is a beat-adjusted central estimate, not guidance.
          </p>
        </section>

        {/* 4. Base vs Downside */}
        <section id="results" aria-labelledby="cases-heading" className="mt-16 scroll-mt-24">
          <SectionHeading id="cases-heading">Base vs Downside (locked forecast, USD millions)</SectionHeading>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
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
                    <th scope="row" className={`px-4 py-3 text-left text-sm font-semibold text-charcoal ${STACK_LABEL}`}>{line.label}</th>
                    {line.values.map((v, i) => (
                      <td key={i} data-label={caseHead[i]} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td className={`px-4 py-3 ${STACK_VALUE} ${STACK_WIDE}`} data-label="Label"><Tag tag={line.tag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 text-sm font-semibold text-charcoal">FY2027 Base adjusted FCF range</h3>
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
                    <th scope="row" className={`px-4 py-3 text-left text-sm font-semibold text-charcoal ${STACK_LABEL}`}>{line.label}</th>
                    {line.values.map((v, i) => (
                      <td key={i} data-label={plan.rangeHead[i]} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td className={`px-4 py-3 ${STACK_VALUE} ${STACK_WIDE}`} data-label="Label"><Tag tag={line.tag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`mt-3 text-sm leading-6 text-charcoal-soft ${MEASURE}`}>
            The FY27 Base–Downside revenue gap is {plan.gapPct.values[0]} of Base, {plan.gapX.values[0]} the average 4-quarter-ahead backtest miss (both <Tag tag={plan.gapX.tag} />).
          </p>
        </section>

        {/* 5. Management response */}
        <section aria-labelledby="response-heading" className="mt-16">
          <SectionHeading id="response-heading">Management response: breakeven</SectionHeading>
          <p className={`mt-3 text-base leading-7 text-charcoal-soft ${MEASURE}`}>
            Each lever saves operating income from the start quarter. The breakeven is the FY27 revenue loss that would cancel that saving; the growth cost itself cannot be measured from public data.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
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
                    <th scope="row" className={`px-4 py-3 text-left text-sm font-semibold text-charcoal ${STACK_LABEL}`}>{line.label}</th>
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

        {/* 6. Triggers */}
        <section aria-labelledby="triggers-heading" className="mt-16">
          <SectionHeading id="triggers-heading">Triggers</SectionHeading>
          <p className={`mt-3 text-base leading-7 text-charcoal ${MEASURE}`}>{plan.fixedNote}</p>
          <p className={`mt-2 text-base leading-7 text-charcoal-soft ${MEASURE}`}>{plan.tierNote}</p>
          <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {plan.triggers.map((t) => (
              <li key={t.label} className="flex flex-col gap-3 rounded-2xl border border-forest/15 bg-white p-6">
                <p className="text-base font-bold leading-6 text-charcoal">{t.label}</p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {t.values.length > 1 ? (
                    <dl className="grid w-full grid-cols-5 gap-2 text-sm max-sm:grid-cols-3">
                      {t.values.map((v, i) => (
                        <div key={i} className="flex flex-col items-end">
                          <dt className="text-xs text-charcoal-soft">{plan.recHead[i]}</dt>
                          <dd className="font-semibold tabular-nums text-charcoal">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-2xl font-black tabular-nums text-forest">{t.values[0]}</p>
                  )}
                  <Tag tag={t.tag} />
                </div>
                <p className="text-sm leading-6 text-charcoal-soft">{t.rule}</p>
                <p className="rounded-xl bg-brass-pale px-3 py-2 text-sm leading-6 text-charcoal">
                  <span className="font-semibold">History: </span>
                  {t.history}
                </p>
              </li>
            ))}
          </ul>
          <h3 className="mt-8 text-sm font-semibold text-charcoal">Tiers and actions</h3>
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
                    <th scope="row" className={`px-4 py-3 text-left text-sm font-semibold text-charcoal ${STACK_LABEL}`}>{m.tier}</th>
                    <td data-label="Action" className={`px-4 py-3 text-sm text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>{m.action}</td>
                    <td data-label="Earliest timing" className={`px-4 py-3 text-sm text-charcoal-soft ${STACK_VALUE} ${STACK_WIDE}`}>{m.timing}</td>
                    <td data-label="Note" className={`px-4 py-3 text-sm text-charcoal-soft ${STACK_VALUE} ${STACK_WIDE}`}>{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Pre-Registered Q3 Test */}
        <section id="q3-test" aria-labelledby="q3-heading" className="mt-16 scroll-mt-24">
          <SectionHeading id="q3-heading">Pre-Registered Q3 Test</SectionHeading>
          <p className="mt-3 inline-flex w-fit rounded-full border border-dashed border-charcoal-soft px-3 py-1 text-xs font-bold uppercase tracking-widest text-charcoal">
            Status: pending
          </p>
          <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
            The Q3 forecast and operating plan were locked before results were released. Actuals will be scored against the frozen files on November 9, 2026.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {RELEASES.map((r) => (
              <ReleaseCard key={r.tag} release={r} />
            ))}
          </div>

          {/* 8. Scorecard */}
          <h3 className="mt-10 text-sm font-semibold text-charcoal">Scorecard</h3>
          <p className={`mt-2 text-sm leading-6 text-charcoal-soft ${MEASURE}`}>
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
                    <th scope="row" className={`min-w-[11rem] px-4 py-3 text-left text-sm font-semibold text-charcoal ${STACK_LABEL}`}>
                      {s.metric}
                      <span className="mt-1 block"><Tag tag={s.tag} /></span>
                    </th>
                    <td data-label="Guidance" className={`min-w-[13rem] px-4 py-3 text-sm text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>
                      {s.guidance.text}
                      {s.guidance.label && <span className="mt-1 block text-xs leading-5 text-charcoal-soft">{s.guidance.label}</span>}
                    </td>
                    {s.values.map((v, i) => (
                      <td key={i} data-label={`Locked ${["Low", "Mid", "High"][i]}`} className={`${TD} ${STACK_VALUE}`}>{v}</td>
                    ))}
                    <td data-label="Actual" className={`px-4 py-3 text-sm italic text-charcoal-soft ${STACK_VALUE}`}>Pending: Nov. 9</td>
                    <td data-label="Variance" className={`px-4 py-3 text-sm italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                    <td data-label="Interpretation" className={`px-4 py-3 text-sm italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                  </tr>
                ))}
                {scorecard.noCalls.map((s) => (
                  <tr key={s.metric} className={`border-b border-forest/10 align-top last:border-b-0 ${STACK_ROW}`}>
                    <th scope="row" className={`px-4 py-3 text-left text-sm font-semibold text-charcoal ${STACK_LABEL}`}>{s.metric}</th>
                    <td data-label="Guidance" className={`px-4 py-3 text-sm text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>{s.guidance}</td>
                    <td colSpan={3} data-label="Locked" className={`px-4 py-3 text-left text-sm text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>
                      <span className="font-semibold">No call made.</span>{" "}
                      <span className="text-charcoal-soft">Workbook reason: &ldquo;{s.reason}&rdquo;</span>
                    </td>
                    <td data-label="Actual" className={`px-4 py-3 text-sm italic text-charcoal-soft ${STACK_VALUE}`}>Pending: Nov. 9</td>
                    <td data-label="Variance" className={`px-4 py-3 text-sm italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                    <td data-label="Interpretation" className={`px-4 py-3 text-sm italic text-charcoal-soft ${STACK_VALUE}`}>Pending</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. Model Preview */}
        <section id="inside-the-model" aria-labelledby="inside-model-heading" className="mt-16 scroll-mt-24">
          <SectionHeading id="inside-model-heading">Inside the model</SectionHeading>
          <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <p className={`text-base leading-7 text-charcoal ${MEASURE}`}>
              Six sheets of the locked plan workbook, as stored. Click any cell to see its formula and where it comes from.
            </p>
            <p className="text-sm leading-6 text-charcoal-soft lg:max-w-[24rem]">
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
          <p className="mt-3 text-sm text-charcoal-soft">
            Labels in the workbook: <span className="font-semibold text-[#1d3f8a]">blue</span> = Sourced (copied from a filing, with a Row ID),
            black = Derived (a formula), <span className="font-semibold text-[#8a3d0c]">orange on peach</span> = Assumed (a judgement with rationale and sensitivity).
          </p>
        </section>

        {/* 10. Limits */}
        <section aria-labelledby="limits-heading" className="mt-12 border-t border-forest/10 pt-12">
          <SectionHeading id="limits-heading">Limits</SectionHeading>
          <ul className={`mt-4 flex flex-col gap-1.5 ${MEASURE}`}>
            {LIMITS.map((item) => (
              <li key={item} className="text-sm leading-6 text-charcoal-soft before:mr-2 before:text-[#7a5a30] before:content-['—']">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 11-12. Downloads, repository */}
        <section aria-labelledby="downloads-heading" className="mt-16">
          <SectionHeading id="downloads-heading">Downloads</SectionHeading>
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
                  <p className="min-w-0 break-words text-base font-bold text-charcoal">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-forest">
                    {item.format}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-charcoal-soft">{item.description}</p>
                <span className={`mt-auto pt-4 ${CARD_CTA}`}>{item.cta}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Prev / Next */}
        <nav className="mt-16 flex items-center justify-between border-t border-forest/10 pt-8">
          <Link href={`/projects/${prev.slug}`} className="text-sm font-semibold text-charcoal-soft hover:text-charcoal">
            &larr; Previous Project
          </Link>
          <Link href={`/projects/${next.slug}`} className="text-sm font-semibold text-charcoal-soft hover:text-charcoal">
            Next Project &rarr;
          </Link>
        </nav>
      </div>
    </main>
  );
}

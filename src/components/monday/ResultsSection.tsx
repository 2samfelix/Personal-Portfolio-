// The Q3 2026 results section of the monday.com page, drawn at build time.
//
// Pending (no results file): the lock facts, the locked call and guidance, an empty
// Actual column and how the call will be scored. Scored (a validated results file,
// src/lib/mondayResults.ts): the same table with each actual and its result, a chart
// of each actual against its locked range, and the first T2 and T3 readings.
//
// Every locked number is a workbook cell tagged like the page's charts (data-ref,
// data-wb, data-v, data-d); every actual is tagged data-actual with its JSON key and
// value, so scripts/test-monday-results.py can check each one against the JSON.
// All text is static: no dates are computed in the browser.
import type { ReactNode } from "react";
import { MEASURE, STACK_BODY, STACK_HEAD, STACK_LABEL, STACK_ROW, STACK_TABLE, STACK_VALUE, STACK_WIDE } from "@/components/project/layout";
import { C, ChartFigure, DataTable, FONT, linear, mark, money, num, r2 } from "@/components/monday/MondayCharts";
import { REPO_URL, loadMondayCharts, loadMondayPlan, loadResultsInputs, type CellValue, type MondayCharts } from "@/lib/mondayPlan";
import { METRIC_KEYS, Q3_RELEASE, formatValue, loadMondayResults, type MetricKey, type MondayResults, type ScoredRow, type TriggerKey } from "@/lib/mondayResults";

const LABEL = "text-[#7a5a30]";
const TH = "px-4 py-3 text-right text-[0.8125rem] font-semibold uppercase tracking-wide text-charcoal-soft";
const TH_LEFT = "px-4 py-3 text-left text-[0.8125rem] font-semibold uppercase tracking-wide text-charcoal-soft";
const TD = "px-4 py-3 text-right text-base tabular-nums text-charcoal";
/** The Actual column before the results. */
export const PENDING_ACTUAL = "Reported Nov 9, 2026";

type Range = MondayCharts["ranges"][number];
type Scored = Extract<MondayResults, { state: "scored" }>;

function utc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

/** A locked workbook value, tagged with its cell. */
function Locked({ m, c }: { m: Range; c: CellValue }) {
  return <span {...num(c)}>{money(m.unit, c)}</span>;
}

/** An actual from the results file, tagged with its JSON key and value. */
function Actual({ k, v, className }: { k: MetricKey | TriggerKey; v: number; className?: string }) {
  const d = formatValue(k, v);
  return (
    <span data-actual={k} data-v={v} data-d={d} className={className}>
      {d}
    </span>
  );
}

// --- Chart: each actual against its locked range (scored state only) ----------------

function ResultsSvg({ ranges, actuals, w }: { ranges: Range[]; actuals: Record<MetricKey, number>; w: number }) {
  const rowH = 138;
  const h = ranges.length * rowH;
  const pad = { l: 8, r: 8 };
  const CHAR_PX = 7.2; // approximate width of a 13px Arial character
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-labelledby="results-chart-title" style={{ fontFamily: FONT }}>
      {ranges.map((m, i) => {
        const key = METRIC_KEYS[i];
        const a = actuals[key];
        const top = i * rowH;
        const lo = Math.min(m.low.v, a, m.guidance?.low.v ?? Infinity);
        const hi = Math.max(m.high.v, a, m.guidance?.high.v ?? -Infinity);
        const span = hi - lo;
        const x = linear(lo - span * 0.12, hi + span * 0.12, pad.l, w - pad.r);
        const axis = `results-${w}-${i}`;
        const barY = top + 52;
        const ax = x(a);
        const actualText = `Actual ${formatValue(key, a)}`;
        // Keep the actual's label inside the chart.
        const half = (actualText.length * CHAR_PX) / 2;
        const labelX = Math.min(Math.max(ax, pad.l + half), w - pad.r - half);
        let guide: { x: number; anchor: "start" | "end" } | null = null;
        if (m.guidance) {
          const len = `Guide ${money(m.unit, m.guidance.low)} to ${money(m.unit, m.guidance.high)}`.length * CHAR_PX;
          const gx = x(m.guidance.low.v);
          guide = gx + len <= w - pad.r ? { x: gx, anchor: "start" } : { x: Math.max(x(m.guidance.high.v), pad.l + len), anchor: "end" };
        }
        return (
          <g key={m.metric}>
            <text x={pad.l} y={top + 18} fontSize={15} fontWeight={700} fill={C.ink} data-label="row label">{m.metric}</text>
            {m.guidance && (
              <rect
                x={r2(x(m.guidance.low.v))}
                y={barY - 8}
                width={r2(Math.max(x(m.guidance.high.v) - x(m.guidance.low.v), 2))}
                height={30}
                fill={C.brassPale}
                {...mark(m.guidance.low, axis, x(m.guidance.low.v))}
              />
            )}
            {m.guidance && <rect x={r2(x(m.guidance.high.v)) - 1} y={barY - 8} width={1} height={30} fill={C.brassPale} {...mark(m.guidance.high, axis, x(m.guidance.high.v))} />}
            {guide && m.guidance && (
              // The band's label, above it, kept inside the chart.
              <text x={r2(guide.x)} y={barY - 14} textAnchor={guide.anchor} fontSize={13} fill={C.brassDark}>
                Guide <tspan {...num(m.guidance.low)}>{money(m.unit, m.guidance.low)}</tspan> to <tspan {...num(m.guidance.high)}>{money(m.unit, m.guidance.high)}</tspan>
              </text>
            )}
            <rect x={r2(x(m.low.v))} y={barY} width={r2(x(m.high.v) - x(m.low.v))} height={14} rx={7} fill={C.forest} {...mark(m.low, axis, x(m.low.v))} />
            <rect x={r2(x(m.high.v)) - 1} y={barY} width={1} height={14} fill={C.forest} {...mark(m.high, axis, x(m.high.v))} />
            <rect x={r2(x(m.mid.v)) - 1.5} y={barY - 6} width={3} height={26} fill={C.ink} {...mark(m.mid, axis, x(m.mid.v))} />
            <text x={r2(x(m.low.v))} y={barY + 32} textAnchor="middle" fontSize={13} fill={C.ink} {...num(m.low)}>{money(m.unit, m.low)}</text>
            <text x={r2(x(m.high.v))} y={barY + 32} textAnchor="middle" fontSize={13} fill={C.ink} {...num(m.high)}>{money(m.unit, m.high)}</text>
            {/* The actual: a rust marker across the bar, labelled beneath. */}
            <line x1={r2(ax)} x2={r2(ax)} y1={barY - 4} y2={barY + 18} stroke={C.rust} strokeWidth={2} data-actual={key} data-v={a} data-axis={axis} data-pos={r2(ax)} />
            <circle cx={r2(ax)} cy={barY + 7} r={7} fill={C.rust} stroke={C.cream} strokeWidth={2} data-actual={key} data-v={a} data-axis={axis} data-pos={r2(ax)} />
            <text x={r2(labelX)} y={barY + 54} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.rust}>
              Actual <tspan data-actual={key} data-v={a} data-d={formatValue(key, a)}>{formatValue(key, a)}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ResultsChart({ ranges, r }: { ranges: Range[]; r: Scored }) {
  return (
    <ChartFigure
      id="results-chart"
      title="Each Q3 actual against its locked range"
      caption="Dark bar: the locked low to high, with the mid as a tick. Tan band: the company's August 10 guidance, where it gave one. Rust marker: the actual from the results file. Each metric has its own scale."
      table={
        <DataTable
          head={["Metric", "Locked low", "Locked high", "Actual", "Result"]}
          rows={ranges.map((m, i) => [
            m.metric,
            <Locked key="l" m={m} c={m.low} />,
            <Locked key="h" m={m} c={m.high} />,
            <Actual key="a" k={METRIC_KEYS[i]} v={r.actuals[METRIC_KEYS[i]]} />,
            r.rows[i].result,
          ])}
        />
      }
    >
      <div className="mx-auto max-w-[30rem] md:hidden">
        <ResultsSvg ranges={ranges} actuals={r.actuals} w={300} />
      </div>
      <div className="hidden max-w-4xl md:block">
        <ResultsSvg ranges={ranges} actuals={r.actuals} w={680} />
      </div>
    </ChartFigure>
  );
}

// --- Section ----------------------------------------------------------------------------

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-charcoal-soft">{term}</dt>
      <dd className="min-w-0 text-charcoal">{children}</dd>
    </>
  );
}

function resultClass(row: ScoredRow): string {
  if (!row.scored) return "text-charcoal-soft";
  return row.position === "inside" ? "font-semibold text-forest" : "font-semibold text-rust";
}

export default function ResultsSection({ className = "" }: { className?: string }) {
  const results = loadMondayResults();
  const { scorecard } = loadMondayPlan();
  const { ranges } = loadMondayCharts();
  const inputs = loadResultsInputs();
  const scored = results.state === "scored" ? results : null;
  const release = Q3_RELEASE;

  const guidance = (i: number): ReactNode => {
    const m = ranges[i];
    if (m.guidance) {
      const mid = i === 0 ? inputs.guidanceMid.revenue : inputs.guidanceMid.oi;
      return (
        <>
          <Locked m={m} c={m.guidance.low} />–<Locked m={m} c={m.guidance.high} />
          <span className="mt-1 block text-sm text-charcoal-soft">
            Midpoint <span {...num(mid)}>{money(m.unit, mid)}</span>
          </span>
        </>
      );
    }
    if (METRIC_KEYS[i] === "non_gaap_operating_margin") {
      return (
        <>
          Derived: <span {...num(inputs.guidanceMid.margin)}>{inputs.guidanceMid.margin.d}</span>
          <span className="mt-1 block text-sm text-charcoal-soft">Guidance midpoints, op. income ÷ revenue</span>
        </>
      );
    }
    return <span className="text-charcoal-soft">Not guided</span>;
  };

  return (
    <section
      id="results"
      aria-labelledby="results-heading"
      className={className}
      data-results-state={results.state}
      data-results-file={scored?.file ?? ""}
      data-results-sha256={scored?.sha256 ?? ""}
    >
      <div>
        <p className={`text-sm font-semibold uppercase tracking-widest ${LABEL}`}>Results</p>
        <h2 id="results-heading" className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Q3 2026 results against the locked call
        </h2>
      </div>
      {scored ? (
        <p className="mt-4 inline-flex w-fit rounded-full bg-forest px-3 py-1 text-sm font-bold uppercase tracking-widest text-cream">Status: scored</p>
      ) : (
        <p className="mt-4 inline-flex w-fit rounded-full border border-dashed border-charcoal-soft px-3 py-1 text-sm font-bold uppercase tracking-widest text-charcoal">
          Status: pending
        </p>
      )}

      {scored?.fixture && (
        <p role="note" className="mt-4 rounded-2xl border-2 border-rust bg-white px-5 py-4 text-base font-semibold leading-7 text-rust">
          Test fixture: invented numbers that check the scored layout. These are not monday.com&apos;s results.
        </p>
      )}

      {scored ? (
        <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
          The plan and this call were locked before the results (lock facts below). The actuals are taken from the company&apos;s own filing:{" "}
          <a href={scored.source.url} target="_blank" rel="noopener noreferrer" className="tap font-semibold text-forest underline-offset-4 hover:underline">
            {scored.source.document} ↗
          </a>
          , retrieved {utc(scored.source.retrieved_at)}.
        </p>
      ) : (
        <p className={`mt-4 text-base leading-7 text-charcoal ${MEASURE}`}>
          The plan and this call were locked before the results (lock facts below). The actuals will be taken from the company&apos;s own Q3 2026 results
          filing on November 9, 2026, and compared with the locked figures. No result is shown until then.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-2xl border border-forest/15 bg-white p-6 text-base sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Fact term="Release">
          <a href={release.url} target="_blank" rel="noopener noreferrer" className="tap font-semibold text-forest hover:text-forest-dark">
            {release.tag} ↗
          </a>
        </Fact>
        <Fact term="Published">{utc(release.publishedAt)}</Fact>
        <Fact term="Commit">
          <a href={`${REPO_URL}/commit/${release.commit}`} target="_blank" rel="noopener noreferrer" className="tap font-mono text-sm font-semibold text-forest hover:text-forest-dark" title={release.commit}>
            {release.commit.slice(0, 7)} ↗
          </a>
        </Fact>
        <Fact term="SHA-256">
          <span className="break-all font-mono text-sm">{release.sha256}</span>
        </Fact>
      </dl>

      <h3 className="mt-10 text-lg font-bold text-charcoal">The locked call {scored ? "and the actuals" : "and guidance"}</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-forest/15 bg-white max-md:overflow-visible">
        <table className={`w-full ${scored ? "min-w-[64rem]" : "min-w-[52rem]"} border-collapse ${STACK_TABLE}`}>
          <thead className={STACK_HEAD}>
            <tr className="border-b border-forest/10 bg-cream">
              <th scope="col" className={TH_LEFT}>Metric</th>
              <th scope="col" className={TH}>Locked low</th>
              <th scope="col" className={TH}>Locked mid</th>
              <th scope="col" className={TH}>Locked high</th>
              <th scope="col" className={TH_LEFT}>Guidance</th>
              <th scope="col" className={TH_LEFT}>Actual</th>
              {scored && <th scope="col" className={TH_LEFT}>Result</th>}
              {scored && <th scope="col" className={TH_LEFT}>Versus guidance</th>}
            </tr>
          </thead>
          <tbody className={STACK_BODY}>
            {ranges.map((m, i) => {
              const row = scored?.rows[i];
              return (
                <tr key={m.metric} className={`border-b border-forest/10 align-top ${STACK_ROW}`} data-metric={METRIC_KEYS[i]}>
                  <th scope="row" className={`min-w-[11rem] px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{m.metric}</th>
                  {(["low", "mid", "high"] as const).map((k) => (
                    <td key={k} data-label={`Locked ${k}`} className={`${TD} ${STACK_VALUE}`}>
                      <Locked m={m} c={m[k]} />
                    </td>
                  ))}
                  <td data-label="Guidance" className={`min-w-[11rem] px-4 py-3 text-base text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>{guidance(i)}</td>
                  {row ? (
                    <td data-label="Actual" className={`px-4 py-3 text-base font-semibold tabular-nums text-charcoal ${STACK_VALUE}`}>
                      <Actual k={row.key} v={row.actual} />
                    </td>
                  ) : (
                    <td data-label="Actual" className={`px-4 py-3 text-base italic text-charcoal-soft md:whitespace-nowrap ${STACK_VALUE}`} data-pending-actual="">
                      {PENDING_ACTUAL}
                    </td>
                  )}
                  {row && (
                    <td data-label="Result" className={`px-4 py-3 text-base ${resultClass(row)} ${STACK_VALUE}`} data-result={row.position} data-scored={row.scored ? "true" : "false"}>
                      {row.result}
                      {row.boundaryNote && <span className="mt-1 block text-sm font-normal text-charcoal-soft">Printed values tie; {row.boundaryNote}.</span>}
                    </td>
                  )}
                  {row && (
                    <td data-label="Versus guidance" className={`px-4 py-3 text-base text-charcoal ${STACK_VALUE}`} data-guide={row.versusGuide?.position ?? "none"}>
                      {row.versusGuide ? row.versusGuide.text : <span className="text-charcoal-soft">Not guided</span>}
                    </td>
                  )}
                </tr>
              );
            })}
            {scorecard.noCalls.map((s) => (
              <tr key={s.metric} className={`border-b border-forest/10 align-top last:border-b-0 ${STACK_ROW}`}>
                <th scope="row" className={`px-4 py-3 text-left text-base font-semibold text-charcoal ${STACK_LABEL}`}>{s.metric}</th>
                <td colSpan={3} data-label="Locked" className={`px-4 py-3 text-left text-base text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>
                  <span className="font-semibold">No call made.</span> <span className="text-charcoal-soft">Workbook reason: &ldquo;{s.reason}&rdquo;</span>
                </td>
                <td data-label="Guidance" className={`px-4 py-3 text-base text-charcoal ${STACK_VALUE}`}>{s.guidance}</td>
                <td data-label="Actual" className={`px-4 py-3 text-base italic text-charcoal-soft ${STACK_VALUE}`}>Not scored</td>
                {scored && <td data-label="Result" className={`px-4 py-3 text-base text-charcoal-soft ${STACK_VALUE}`}>No call</td>}
                {scored && <td data-label="Versus guidance" className={`px-4 py-3 text-base text-charcoal-soft ${STACK_VALUE}`}>Not scored</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`mt-3 text-base leading-7 text-charcoal-soft ${MEASURE}`}>
        Locked low, mid and high from the locked Q3 call workbook ({release.file}); guidance and its midpoints from the same workbook (the company&apos;s August 10, 2026 outlook).
      </p>

      <h3 className="mt-10 text-lg font-bold text-charcoal">How it {scored ? "was" : "will be"} scored</h3>
      <p className={`mt-2 text-base leading-7 text-charcoal ${MEASURE}`}>
        Each call is a locked range. A result is inside the range if the company&apos;s reported figure is between the locked low and high, ends included; otherwise it is
        above or below. Net dollar retention is scored on the reported whole percentage. Revenue and operating income are also set against the company&apos;s own
        guidance. The operating margin is derived from the two calls, so it is recorded for information and not scored on its own. The first Q3 readings of the
        guidance-beat trigger (T2) and the net-adds trigger (T3) are recorded; each needs two consecutive quarters, so Q3 alone cannot fire one. Thresholds stay as
        locked, and a miss is published as a miss: the locked files and Releases are never edited.
      </p>

      {scored && (
        <>
          <div className="mt-8 rounded-2xl border border-forest/15 bg-white p-5 sm:p-8">
            <ResultsChart ranges={ranges} r={scored} />
          </div>

          <h3 className="mt-10 text-lg font-bold text-charcoal">First trigger readings</h3>
          <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {scored.triggers.map((t) => (
              <li key={t.key} className="flex flex-col gap-3 rounded-2xl border border-forest/15 bg-white p-6" data-trigger={t.key} data-counts={t.counts ? "true" : "false"}>
                <p className="text-lg font-bold leading-7 text-charcoal">{t.label}</p>
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-sm text-charcoal-soft">Q3 reading</dt>
                    <dd className="text-2xl font-black tabular-nums text-charcoal">
                      <Actual k={t.key} v={t.value} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-charcoal-soft">Locked threshold</dt>
                    <dd className="text-2xl font-black tabular-nums text-charcoal">
                      <span {...num(t.threshold)}>{t.threshold.d}</span>
                    </dd>
                  </div>
                </dl>
                <p className="text-base leading-7 text-charcoal-soft">{t.rule}</p>
                <p className={`border-t border-forest/10 pt-3 text-base font-semibold leading-7 ${t.counts ? "text-rust" : "text-forest"}`}>{t.text}</p>
              </li>
            ))}
          </ul>

          {scored.notes.length > 0 && (
            <>
              <h3 className="mt-10 text-lg font-bold text-charcoal">What I got wrong</h3>
              <ul className={`mt-3 flex flex-col gap-2 ${MEASURE}`}>
                {scored.notes.map((n) => (
                  <li key={n} className="text-base leading-7 text-charcoal before:mr-2 before:text-[#7a5a30] before:content-['—']">
                    {n}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

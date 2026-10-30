// The validation lab on the FP&A Intelligence Engine page: hero stat tiles, the pipeline diagram,
// the detection map and the full results table. All drawn on the server at build time from
// public/engine/validation-lab.json (loaded and hash-checked by src/lib/validationLab.ts); no
// number here is typed. Marks and printed counts carry data-lab-* attributes so
// scripts/test-engine-lab.py can check every drawn number against the JSON. Nothing animates.
import type { ReactNode } from "react";
import { DETECTIONS, type Detection, type ValidationLab } from "@/lib/validationLab";
import { C } from "@/components/monday/MondayCharts";
import { STACK_BODY, STACK_HEAD, STACK_LABEL, STACK_ROW, STACK_TABLE, STACK_VALUE, STACK_WIDE } from "@/components/project/layout";

const FONT = "Arial, Helvetica, sans-serif";

/** Status palette with a distinct mark each, so status never rests on colour alone. */
export const STATUS: Record<Detection, { label: string; short: string; fill: string; stroke: string; glyph: string }> = {
  caught: { label: "Caught", short: "caught", fill: C.forest, stroke: C.forest, glyph: C.cream },
  conditional: { label: "Caught only under a condition", short: "conditional", fill: C.brassPale, stroke: C.brassDark, glyph: C.brassDark },
  missed: { label: "Not caught (faulty statement accepted)", short: "not caught", fill: C.rust, stroke: C.rust, glyph: C.cream },
};

const CELL = 24;
const GAP = 4;

/** The status mark: a check, a tilde or a cross, drawn as paths in a CELL-sized box at (x, y). */
function Glyph({ d, x = 0, y = 0 }: { d: Detection; x?: number; y?: number }) {
  const s = STATUS[d];
  const common = { fill: "none", stroke: s.glyph, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0.75} y={0.75} width={CELL - 1.5} height={CELL - 1.5} rx={4} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />
      {d === "caught" && <path d="M6.5 12.5l3.8 3.8 7.2-8.4" {...common} />}
      {d === "conditional" && <path d="M6 13.5c2-3.2 4-3.2 6 0s4 3.2 6 0" {...common} />}
      {d === "missed" && <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" {...common} />}
    </g>
  );
}

export function GlyphIcon({ d }: { d: Detection }) {
  return (
    <svg width={CELL} height={CELL} viewBox={`0 0 ${CELL} ${CELL}`} aria-hidden="true" className="inline-block shrink-0 align-middle">
      <Glyph d={d} />
    </svg>
  );
}

// ---------------------------------------------------------------- hero tiles ---

export function LabStatTiles({ lab }: { lab: ValidationLab }) {
  const s = lab.stats;
  const tiles = [
    { key: "cases", value: s.cases, label: "Cases tested", note: `${s.faulty} faulty statements and ${s.controls} valid controls` },
    { key: "caught", value: s.caughtAsExpected, label: "Caught as expected", note: "faulty statements the validator rejected" },
    { key: "limitations", value: s.knownLimitations, label: "Known limitations", note: "faulty statements it accepted, all shown below" },
  ];
  return (
    <ul aria-label="Validation lab results" className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {tiles.map((t) => (
        <li key={t.key} className="rounded-2xl border border-brass-light/50 bg-cream/5 p-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-brass-light">{t.label}</p>
          <p className="mt-1 text-5xl font-black tabular-nums tracking-tight text-cream" data-lab-stat={t.key} data-v={t.value}>
            {t.value}
          </p>
          <p className="mt-1 text-sm leading-6 text-cream/90">{t.note}</p>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------- pipeline diagram ---

const CHECKS = [
  "Every cited ID exists",
  "Figures match what is cited, at the written precision",
  "Quoted text matches the curated excerpt",
  "No forbidden values or false precision",
  "Statement kind fits the evidence cited",
  "Required limitations are present",
];

function Box({ x, y, w, h, fill, stroke, children }: { x: number; y: number; w: number; h: number; fill: string; stroke: string; children: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {children}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = (r: number) => x2 - 9 * Math.cos(a + r);
  const hy = (r: number) => y2 - 9 * Math.sin(a + r);
  return (
    <g stroke={C.soft} strokeWidth={1.75} fill="none" strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={`M${hx(0.45)} ${hy(0.45)}L${x2} ${y2}L${hx(-0.45)} ${hy(-0.45)}`} />
    </g>
  );
}

function CheckLines({ x, y, step }: { x: number; y: number; step: number }) {
  return (
    <>
      {CHECKS.map((c, i) => (
        <g key={c}>
          <path d={`M${x} ${y + i * step - 4}l3 3 6-7`} fill="none" stroke={C.brassLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <text x={x + 14} y={y + i * step} fontSize={14} fill={C.cream}>{c}</text>
        </g>
      ))}
    </>
  );
}

/** The check list wrapped for the narrow diagram: at most 26 characters a line, 20 px line pitch. */
const NARROW_CHECKS = (() => {
  let y = 352;
  return CHECKS.map((c) => {
    const words = c.split(" ");
    const lines: string[] = [];
    for (const w of words) {
      if (lines.length && `${lines[lines.length - 1]} ${w}`.length <= 26) lines[lines.length - 1] += ` ${w}`;
      else lines.push(w);
    }
    const item = { c, lines, y0: y };
    y += lines.length * 20 + 14;
    return item;
  });
})();

export function PipelineDiagram({ packetHash }: { packetHash: string }) {
  const hash = `${packetHash.slice(0, 8)}…`;
  const title = "From evidence packet to an accepted or rejected brief";
  return (
    <figure aria-labelledby="pipeline-title" className="min-w-0">
      <h3 id="pipeline-title" className="text-lg font-bold leading-7 text-charcoal">{title}</h3>
      {/* Wide: one row, from lg up. */}
      <svg viewBox="0 0 1100 300" className="mt-4 hidden h-auto w-full lg:block" role="img" aria-labelledby="pipeline-title pipeline-desc" style={{ fontFamily: FONT }}>
        <desc id="pipeline-desc">
          The evidence packet goes to the AI, which writes statements citing packet IDs; the validator checks them and the brief is accepted or rejected.
        </desc>
        <Box x={0} y={70} w={200} h={150} fill="#ffffff" stroke={C.forest}>
          <text x={20} y={110} fontSize={17} fontWeight={700} fill={C.ink}>Evidence packet</text>
          <text x={20} y={138} fontSize={14} fill={C.soft}>Curated facts, evidence</text>
          <text x={20} y={158} fontSize={14} fill={C.soft}>and policies, hashed</text>
          <text x={20} y={190} fontSize={14} fill={C.ink}>Packet {hash}</text>
        </Box>
        <Arrow x1={204} y1={145} x2={246} y2={145} />
        <Box x={250} y={70} w={200} h={150} fill={C.mist} stroke={C.soft}>
          <text x={270} y={110} fontSize={17} fontWeight={700} fill={C.ink}>AI writes</text>
          <text x={270} y={138} fontSize={14} fill={C.ink}>Structured statements</text>
          <text x={270} y={158} fontSize={14} fill={C.ink}>that cite packet IDs</text>
          <text x={270} y={190} fontSize={14} fill={C.soft}>No arithmetic, no title</text>
        </Box>
        <Arrow x1={454} y1={145} x2={496} y2={145} />
        <Box x={500} y={10} w={390} h={280} fill={C.forest} stroke={C.forest}>
          <text x={522} y={46} fontSize={17} fontWeight={700} fill={C.cream}>Deterministic validator</text>
          <CheckLines x={524} y={84} step={34} />
        </Box>
        <Arrow x1={894} y1={120} x2={936} y2={86} />
        <Arrow x1={894} y1={170} x2={936} y2={204} />
        <Box x={940} y={40} w={160} h={84} fill="#ffffff" stroke={C.forest}>
          <Glyph d="caught" x={956} y={56} />
          <text x={990} y={74} fontSize={17} fontWeight={700} fill={C.forest}>Accepted</text>
          <text x={956} y={104} fontSize={14} fill={C.soft}>every check passes</text>
        </Box>
        <Box x={940} y={168} w={160} h={84} fill="#ffffff" stroke={C.rust}>
          <Glyph d="missed" x={956} y={184} />
          <text x={990} y={202} fontSize={17} fontWeight={700} fill={C.rust}>Rejected</text>
          <text x={956} y={232} fontSize={14} fill={C.soft}>any check fails</text>
        </Box>
      </svg>
      {/* Narrow: one column, below lg. */}
      <svg viewBox="0 0 360 842" className="mx-auto mt-4 block h-auto w-full max-w-md lg:hidden" role="img" aria-labelledby="pipeline-title pipeline-desc-n" style={{ fontFamily: FONT }}>
        <desc id="pipeline-desc-n">
          The evidence packet goes to the AI, which writes statements citing packet IDs; the validator checks them and the brief is accepted or rejected.
        </desc>
        <Box x={0} y={0} w={360} h={104} fill="#ffffff" stroke={C.forest}>
          <text x={18} y={34} fontSize={17} fontWeight={700} fill={C.ink}>Evidence packet</text>
          <text x={18} y={60} fontSize={14} fill={C.soft}>Curated facts, evidence and policies</text>
          <text x={18} y={84} fontSize={14} fill={C.ink}>Hashed: packet {hash}</text>
        </Box>
        <Arrow x1={180} y1={108} x2={180} y2={136} />
        <Box x={0} y={140} w={360} h={104} fill={C.mist} stroke={C.soft}>
          <text x={18} y={174} fontSize={17} fontWeight={700} fill={C.ink}>AI writes</text>
          <text x={18} y={200} fontSize={14} fill={C.ink}>Structured statements that cite packet IDs</text>
          <text x={18} y={224} fontSize={14} fill={C.soft}>No arithmetic, no title</text>
        </Box>
        <Arrow x1={180} y1={248} x2={180} y2={276} />
        <Box x={0} y={280} w={360} h={378} fill={C.forest} stroke={C.forest}>
          <text x={18} y={316} fontSize={17} fontWeight={700} fill={C.cream}>Deterministic validator</text>
          {NARROW_CHECKS.map(({ c, lines, y0 }) => {
            return (
              <g key={c}>
                <path d={`M20 ${y0 - 4}l3 3 6-7`} fill="none" stroke={C.brassLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {lines.map((l, j) => (
                  <text key={l} x={36} y={y0 + j * 20} fontSize={14} fill={C.cream}>{l}</text>
                ))}
              </g>
            );
          })}
        </Box>
        <Arrow x1={110} y1={662} x2={90} y2={702} />
        <Arrow x1={250} y1={662} x2={270} y2={702} />
        <Box x={0} y={706} w={172} h={130} fill="#ffffff" stroke={C.forest}>
          <Glyph d="caught" x={16} y={724} />
          <text x={48} y={742} fontSize={17} fontWeight={700} fill={C.forest}>Accepted</text>
          <text x={16} y={778} fontSize={14} fill={C.soft}>every check</text>
          <text x={16} y={798} fontSize={14} fill={C.soft}>passes</text>
        </Box>
        <Box x={188} y={706} w={172} h={130} fill="#ffffff" stroke={C.rust}>
          <Glyph d="missed" x={204} y={724} />
          <text x={236} y={742} fontSize={17} fontWeight={700} fill={C.rust}>Rejected</text>
          <text x={204} y={778} fontSize={14} fill={C.soft}>any check</text>
          <text x={204} y={798} fontSize={14} fill={C.soft}>fails</text>
        </Box>
      </svg>
      <figcaption className="mt-3 text-base leading-7 text-charcoal-soft">
        The validator does not check fiscal periods, direction, segment, causal claims or whether a citation is relevant,
        and nothing is compared with the filings themselves.
      </figcaption>
    </figure>
  );
}

// ------------------------------------------------------------- detection map ---

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function DetectionMap({ lab }: { lab: ValidationLab }) {
  const totals = Object.fromEntries(DETECTIONS.map((d) => [d, lab.map.reduce((n, r) => n + r.counts[d], 0)])) as Record<Detection, number>;
  return (
    <figure aria-labelledby="detection-title" className="min-w-0">
      <h3 id="detection-title" className="text-lg font-bold leading-7 text-charcoal">
        What the validator catches, by kind of fault
      </h3>
      <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-base text-charcoal">
        {DETECTIONS.map((d) => (
          <li key={d} className="flex items-center gap-2">
            <GlyphIcon d={d} />
            <span>
              {STATUS[d].label}: <strong data-lab-total={d} data-v={totals[d]}>{totals[d]}</strong>
            </span>
          </li>
        ))}
      </ul>
      <ol className="mt-5 divide-y divide-forest/10 border-y border-forest/10">
        {lab.map.map((row) => {
          const ids = row.cases.flat();
          const width = Math.max(1, ids.length) * (CELL + GAP) - GAP;
          const summary = DETECTIONS.filter((d) => row.counts[d]).map((d) => `${row.counts[d]} ${STATUS[d].short}`).join(", ");
          let i = -1;
          return (
            <li key={row.id} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[18rem_minmax(0,1fr)] md:items-center md:gap-6">
              <p className="text-base font-semibold text-charcoal" data-lab-topic-label={row.id}>{row.label}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <svg width={width} height={CELL} viewBox={`0 0 ${width} ${CELL}`} role="img" aria-label={`${row.label}: ${summary}`} className="block shrink-0">
                  {DETECTIONS.map((d, di) =>
                    row.cases[di].map((id) => {
                      i += 1;
                      return (
                        <g key={id} data-lab-cell="" data-case={id} data-topic={row.id} data-detection={d} data-x={i * (CELL + GAP)}>
                          <title>{`${id}: ${STATUS[d].label}`}</title>
                          <Glyph d={d} x={i * (CELL + GAP)} />
                        </g>
                      );
                    }),
                  )}
                </svg>
                <p className="text-sm text-charcoal-soft">
                  {DETECTIONS.filter((d) => row.counts[d]).map((d, k) => (
                    <span key={d}>
                      {k > 0 && " · "}
                      <span data-lab-count="" data-topic={row.id} data-detection={d} data-v={row.counts[d]}>{row.counts[d]}</span> {STATUS[d].short}
                    </span>
                  ))}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-3 text-base leading-7 text-charcoal-soft">
        One mark per case. The {plural(lab.stats.controls, "valid control")} ({lab.stats.controlsAccepted} accepted) are not on the map;
        they are in the table below with every other case.
      </figcaption>
      <details className="mt-3 text-base text-charcoal print:hidden">
        <summary className="cursor-pointer rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
          Data table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left tabular-nums">
            <thead>
              <tr className="border-b border-forest/10">
                <th scope="col" className="py-2 pr-4 font-semibold">Kind of fault</th>
                {DETECTIONS.map((d) => (
                  <th key={d} scope="col" className="py-2 pr-4 text-right font-semibold">{STATUS[d].short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lab.map.map((row) => (
                <tr key={row.id} className="border-b border-forest/10">
                  <th scope="row" className="py-2 pr-4 font-normal">{row.label}</th>
                  {DETECTIONS.map((d) => (
                    <td key={d} className="py-2 pr-4 text-right">{row.counts[d]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

// ------------------------------------------------------------- results table ---

function resultOf(c: ValidationLab["cases"][number]): { d: Detection; text: string } {
  if (c.missed) return { d: "missed", text: "Not caught" };
  if (c.actual.outcome === "REJECT") return { d: c.group === "conditional" ? "conditional" : "caught", text: "Rejected" };
  return { d: c.group === "conditional" ? "conditional" : "caught", text: c.group === "control" ? "Accepted (valid)" : "Accepted (correct)" };
}

function CodeList({ codes, empty = "none" }: { codes: string[]; empty?: string }) {
  if (!codes.length) return <span className="block text-xs text-charcoal-soft">{empty}</span>;
  return (
    <span className="block font-mono text-[11px] leading-5">
      {codes.map((c) => (
        <span key={c} className="block">
          {/* Long codes may break after an underscore, so narrow columns never scroll. */}
          {c.split("_").map((part, i, all) => (
            <span key={i}>
              {part}
              {i < all.length - 1 && (
                <>
                  _<wbr />
                </>
              )}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function LabResultsTable({ lab }: { lab: ValidationLab }) {
  const topic = Object.fromEntries(lab.doc.topics.map((t) => [t.id, t.label]));
  const head = ["Case", "Fault and statement", "Expected", "Actual", "Stage that fired", "Result"];
  return (
    <div className="overflow-x-auto rounded-xl border border-forest/15 bg-white">
      <table className={`w-full min-w-[960px] text-left align-top text-sm leading-6 ${STACK_TABLE}`}>
        <thead className={STACK_HEAD}>
          <tr className="border-b border-forest/15">
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 align-bottom font-semibold text-charcoal">{h}</th>
            ))}
          </tr>
        </thead>
        {lab.doc.groups.map((g) => {
          const rows = lab.cases.filter((c) => c.group === g.id);
          return (
            <tbody key={g.id} className={STACK_BODY}>
              <tr className="border-b border-forest/15 bg-forest/5 max-md:block">
                <th colSpan={head.length} scope="colgroup" className="px-3 py-2 text-left font-semibold text-charcoal max-md:block">
                  {g.label} ({rows.length})
                </th>
              </tr>
              {rows.map((c) => {
                const r = resultOf(c);
                return (
                  <tr key={c.id} data-lab-row={c.id} data-actual={c.actual.outcome} className={`border-b border-forest/10 last:border-0 ${c.missed ? "bg-rust/5" : ""} ${STACK_ROW}`}>
                    <th scope="row" className={`w-28 px-3 py-2.5 align-top font-mono font-bold text-charcoal ${STACK_LABEL}`}>
                      {c.id}{" "}
                      <span className="font-sans text-xs font-normal text-charcoal-soft md:block">{topic[c.topic]}</span>
                    </th>
                    <td data-label="Fault and statement" className={`min-w-[18rem] px-3 py-2.5 align-top text-charcoal ${STACK_VALUE} ${STACK_WIDE}`}>
                      <span className="font-semibold">{c.description}</span>
                      {c.statement && (
                        <span className="mt-1 block text-charcoal-soft">
                          {c.statement.id} ({c.statement.kind.replace("_", " ")}): {c.statement.text}
                        </span>
                      )}
                    </td>
                    <td data-label="Expected" className={`px-3 py-2.5 align-top text-charcoal ${STACK_VALUE}`}>
                      {c.expected.outcome === "ACCEPT" ? "Accept" : "Reject"}
                      <CodeList codes={c.expected.codes} />
                    </td>
                    <td data-label="Actual" className={`px-3 py-2.5 align-top text-charcoal ${STACK_VALUE}`}>
                      {c.actual.outcome === "ACCEPT" ? "Accept" : "Reject"}
                      <CodeList codes={c.actual.codes} />
                    </td>
                    <td data-label="Stage that fired" className={`px-3 py-2.5 align-top text-charcoal ${STACK_VALUE}`}>
                      <CodeList codes={c.stages} />
                    </td>
                    <td data-label="Result" className={`whitespace-nowrap px-3 py-2.5 align-top ${STACK_VALUE}`}>
                      <span className="flex items-center gap-2 font-semibold text-charcoal">
                        <GlyphIcon d={r.d} />
                        {r.text}
                      </span>
                      {!c.matches_expectation && <span className="mt-1 block text-xs font-semibold text-rust">Differs from expectation</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

export function LabProvenance({ lab }: { lab: ValidationLab }) {
  const v = lab.doc.validator;
  const short = (h: string) => h.slice(0, 12);
  return (
    <p className="text-xs leading-5 text-charcoal-soft">
      Validator version: engine {lab.doc.engine.commit.slice(0, 7)} ({lab.doc.engine.repo}), brief_validator.py{" "}
      {short(v.files["fpa_engine/brief_validator.py"])}, synthesizer.py {short(v.files["fpa_engine/synthesizer.py"])}, prompt{" "}
      {v.prompt_version}, packet {short(v.packet_hash)} (version {v.packet_version}). Run offline with Python {v.python} and pydantic{" "}
      {v.pydantic} through {v.entry_point}; no model was called. Lab data SHA-256 {short(lab.sha256)}, pinned at build time.
    </p>
  );
}

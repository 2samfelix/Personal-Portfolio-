"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MEASURE } from "@/components/project/layout";

// Data written by scripts/export-engine-trace.py (public/engine/trace.json).
type Fact = {
  id: string;
  metric: string;
  value: string;
  unit: string;
  value_from: string;
  inputs: string[] | null;
  display: string;
  period: string;
  scope: string;
  origin: string;
  benchmark_cell: string | null;
  source_ids: string[];
  derived_from: string[];
  formula: string | null;
  flags: string[];
};
type Source = { id: string; publisher: string; document: string; section?: string; excerpt?: string; url?: string; verification_method?: string };
type Rec = {
  id: string;
  name: string;
  period: string;
  scope: string;
  status: "RECONCILED" | "UNRESOLVED" | "NOT_APPLICABLE";
  bridge_type: string;
  starting_value: string | null;
  ending_value: string | null;
  reported_change: string | null;
  identified_change: string | null;
  residual: string | null;
  allowed: string | null;
  unquantified_components: string[];
  reason: string;
};
type Narrative = { id: string; claim: string; evidence_type: string; verbatim_quote: string | null; period: string; scope: string; review_status: string; source_ids: string[] };
type Assertion = { id: string; narrative_id: string; text: string; voice: string; quote: string | null };
type Flag = { id: string; kind: string; message: string };
type Note = { id: string; text: string };
type NumberMatch = { text: string; matches: "fact" | "reconciliation" | "evidence"; id: string; field?: string; value?: string };
type Rule = { codes: string[]; check: string };
type Statement = {
  id: string;
  kind: string;
  severity: string;
  text: string;
  facts: string[];
  reconciliations: string[];
  narratives: string[];
  assertions: string[];
  premises: { type: "fact" | "narrative"; id: string }[];
  flags: string[];
  notes: string[];
  numbers: NumberMatch[];
  rules: Rule[];
};
type TestBrief = {
  file: string;
  description: string;
  status: "VALID" | "REJECTED";
  statements: { id: string; kind: string; text: string }[];
  errors: { code: string; statement_id: string | null; subject_id: string | null; message: string }[];
};
export type TraceDoc = {
  engine: { repo: string; commit: string };
  run: { run: number; of_runs: number; prompt_version: string; served_model: string; packet_hash: string; final_status: string; revalidated_at_commit: string };
  brief_rules: Rule[];
  statements: Statement[];
  items: {
    facts: Record<string, Fact>;
    sources: Record<string, Source>;
    reconciliations: Record<string, Rec>;
    narratives: Record<string, Narrative>;
    assertions: Record<string, Assertion>;
    flags: Record<string, Flag>;
    notes: Record<string, Note>;
  };
  tests: TestBrief[];
};

/** What the page renders before the data loads: enough for the lists, so nothing moves when it arrives. */
export type TraceHeaders = {
  statements: { id: string; kind: string; severity: string; text: string }[];
  tests: { file: string; status: string; description: string }[];
  commit: string;
};

const KIND_LABEL: Record<string, string> = { fact: "Fact", explicit_claim: "Explicit claim", interpretive: "Interpretive", limitation: "Limitation" };
const STATUS_CLASS: Record<string, string> = {
  RECONCILED: "bg-forest/10 text-forest",
  UNRESOLVED: "bg-rust-pale text-rust",
  NOT_APPLICABLE: "bg-brass-pale text-brass",
  VALID: "bg-forest/10 text-forest",
  REJECTED: "bg-rust-pale text-rust",
};
/** Desktop panel height: fixed, so the section never moves while the data loads. */
const PANEL_PX = 620;
const PRELOAD_MARGIN = "600px 0px";

const usdM = (v: string | null) => {
  if (v === null) return "—";
  const n = Number(v);
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
};
const metricLabel = (m: string) => m.replace(/^ci_/, "CI ").replace(/_/g, " ");
const testLabel = (file: string) => file.replace(/\.json$/, "").replace(/^invalid_(\d+)_/, "#$1 ").replace(/_/g, " ");

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className || "bg-forest/10 text-forest"}`}>
      {children}
    </span>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-brass">{title}</h4>
      <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function Card({ id, title, badge, children }: { id: string; title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-forest/15 bg-white p-3 text-sm leading-6 text-charcoal">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-bold text-charcoal">{id}</span>
        <span className="min-w-0 font-semibold">{title}</span>
        {badge}
      </div>
      <div className="mt-1 break-words text-charcoal-soft">{children}</div>
    </div>
  );
}

function FactCard({ f, doc }: { f: Fact; doc: TraceDoc }) {
  return (
    <Card id={f.id} title={metricLabel(f.metric)} badge={<Badge>{f.origin}</Badge>}>
      <p>
        <span className="text-base font-bold text-charcoal">{f.display}</span> · {f.period} · scope {f.scope}
      </p>
      {f.benchmark_cell && <p>Benchmark cell: <span className="font-mono text-xs">{f.benchmark_cell}</span></p>}
      {f.origin === "derived" && f.formula && (
        <p>
          Computed by the engine: {f.formula.replace(/_/g, " ")} of {(f.inputs ?? f.derived_from).join(", ")}
        </p>
      )}
      {f.source_ids.map((sid) => {
        const s = doc.items.sources[sid];
        return (
          <div key={sid} className="mt-1">
            <p>
              Source: {s.document}
              {s.section ? `, ${s.section}` : ""}
            </p>
            {s.excerpt && <blockquote className="border-l-2 border-brass/60 pl-2 italic text-charcoal">&ldquo;{s.excerpt}&rdquo;</blockquote>}
          </div>
        );
      })}
    </Card>
  );
}

function NarrativeCard({ n, doc }: { n: Narrative; doc: TraceDoc }) {
  return (
    <Card id={n.id} title={`${n.evidence_type} evidence`} badge={<Badge>{n.review_status}</Badge>}>
      <p>{n.claim}</p>
      {n.verbatim_quote && <blockquote className="mt-1 border-l-2 border-brass/60 pl-2 italic text-charcoal">&ldquo;{n.verbatim_quote}&rdquo;</blockquote>}
      <p className="mt-1">Source: {n.source_ids.map((sid) => doc.items.sources[sid].document).join("; ")}</p>
    </Card>
  );
}

function StatementDetail({ s, doc }: { s: Statement; doc: TraceDoc }) {
  const { items } = doc;
  const premiseFacts = s.premises.filter((p) => p.type === "fact").map((p) => items.facts[p.id]);
  const premiseNarratives = s.premises.filter((p) => p.type === "narrative").map((p) => items.narratives[p.id]);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold text-charcoal">{s.id}</span>
        <Badge>{KIND_LABEL[s.kind]}</Badge>
        <Badge className={s.severity === "warning" ? "bg-brass-pale text-brass" : "bg-forest/10 text-forest"}>{s.severity}</Badge>
      </div>
      <p className={`mt-2 text-base leading-7 text-charcoal ${MEASURE}`}>{s.text}</p>

      {s.facts.length > 0 && (
        <Group title="Facts cited">
          {s.facts.map((id) => (
            <FactCard key={id} f={items.facts[id]} doc={doc} />
          ))}
        </Group>
      )}
      {(premiseFacts.length > 0 || premiseNarratives.length > 0) && (
        <Group title="Premises (what the interpretation rests on)">
          {premiseFacts.map((f) => (
            <FactCard key={f.id} f={f} doc={doc} />
          ))}
          {premiseNarratives.map((n) => (
            <NarrativeCard key={n.id} n={n} doc={doc} />
          ))}
        </Group>
      )}
      {s.reconciliations.length > 0 && (
        <Group title="Reconciliations">
          {s.reconciliations.map((id) => {
            const r = items.reconciliations[id];
            return (
              <Card key={id} id={id} title={`${r.name}, ${r.period}`} badge={<Badge className={STATUS_CLASS[r.status]}>{r.status}</Badge>}>
                {r.status === "NOT_APPLICABLE" ? (
                  <p>{r.reason}</p>
                ) : (
                  <>
                    <p>
                      {usdM(r.starting_value)} → {usdM(r.ending_value)}: reported change {usdM(r.reported_change)}, identified{" "}
                      {usdM(r.identified_change)}
                    </p>
                    <p>
                      Residual <span className="font-bold text-charcoal">{usdM(r.residual)}</span> (allowed {usdM(r.allowed)})
                    </p>
                    {r.unquantified_components.length > 0 && <p>Not quantified: {r.unquantified_components.join("; ")}</p>}
                  </>
                )}
              </Card>
            );
          })}
        </Group>
      )}
      {s.narratives.length > 0 && (
        <Group title="Narrative evidence">
          {s.narratives.map((id) => (
            <NarrativeCard key={id} n={items.narratives[id]} doc={doc} />
          ))}
        </Group>
      )}
      {s.assertions.length > 0 && (
        <Group title="Assertions restated">
          {s.assertions.map((id) => {
            const a = items.assertions[id];
            return (
              <Card key={id} id={id} title={`${a.voice} voice`}>
                <p>{a.text}</p>
              </Card>
            );
          })}
        </Group>
      )}
      {s.flags.length > 0 && (
        <Group title="Limitation flags">
          {s.flags.map((id) => (
            <Card key={id} id={id} title={items.flags[id].kind.replace(/_/g, " ")}>
              <p>{items.flags[id].message}</p>
            </Card>
          ))}
        </Group>
      )}
      {s.notes.length > 0 && (
        <Group title="Comparability notes">
          {s.notes.map((id) => (
            <Card key={id} id={id} title="Comparability">
              <p>{items.notes[id].text}</p>
            </Card>
          ))}
        </Group>
      )}

      <section className="mt-6">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-brass">What the code checked</h4>
        {s.numbers.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-charcoal">Each number in the text, and what it matched:</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm text-charcoal-soft">
              {s.numbers.map((n, i) => (
                <li key={i}>
                  <span className="font-semibold text-charcoal">{n.text}</span> → {n.matches} <span className="font-mono text-xs">{n.id}</span>
                  {n.value && ` (${n.matches === "reconciliation" ? `${n.field} ${usdM(n.value)}` : n.value})`}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-sm text-charcoal">The validator&apos;s rules for {KIND_LABEL[s.kind].toLowerCase()} statements:</p>
        <ul className={`mt-1 flex flex-col gap-1.5 text-sm leading-6 text-charcoal-soft ${MEASURE}`}>
          {s.rules.map((r) => (
            <li key={r.codes[0]} className="before:mr-2 before:text-forest before:content-['✓']">
              {r.check} <span className="font-mono text-xs text-charcoal-soft/80">{r.codes.join(", ")}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-5 rounded-lg bg-forest/5 px-3 py-2 text-sm font-semibold text-forest">
        Verdict: {doc.run.final_status} on attempt 1, no retry. Re-validated at engine commit {doc.engine.commit.slice(0, 7)}:{" "}
        {doc.run.revalidated_at_commit}.
      </p>
    </div>
  );
}

function TestDetail({ t }: { t: TestBrief }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold text-charcoal">{t.file}</span>
        <Badge className={STATUS_CLASS[t.status]}>{t.status}</Badge>
      </div>
      <p className={`mt-2 text-base leading-7 text-charcoal ${MEASURE}`}>{t.description}</p>
      {t.statements.map((st) => (
        <div key={st.id} className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-brass">
            Offending sentence ({st.id}, {KIND_LABEL[st.kind] ?? st.kind})
          </h4>
          <blockquote className={`mt-1 border-l-2 border-rust/60 pl-3 text-sm leading-6 text-charcoal ${MEASURE}`}>{st.text}</blockquote>
        </div>
      ))}
      <h4 className="mt-5 text-xs font-semibold uppercase tracking-widest text-brass">Validator output</h4>
      {t.errors.length === 0 ? (
        <p className="mt-1 text-sm font-semibold text-forest">VALID: the validator returned no errors.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-2">
          {t.errors.map((e, i) => (
            <li key={i} className="rounded-lg border border-forest/15 bg-white p-3 text-sm leading-6">
              <span className="font-mono text-xs font-bold text-rust">{e.code}</span>
              {e.statement_id && <span className="ml-2 font-mono text-xs text-charcoal-soft">[{e.statement_id}]</span>}
              <p className="break-words text-charcoal-soft">{e.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Row = { key: string; label: ReactNode; summary: string };

/**
 * A list beside its detail. Desktop: a listbox (arrow keys, Home/End) and a scrolling detail pane
 * whose selection is announced. Phones: an accordion, the detail opening under its row.
 */
function ListDetail({ rows, selected, onSelect, detail, label, idBase }: {
  rows: Row[];
  selected: number;
  onSelect: (i: number) => void;
  detail: (i: number) => ReactNode;
  label: string;
  idBase: string;
}) {
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const paneRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const move = (i: number) => {
    const next = Math.max(0, Math.min(rows.length - 1, i));
    onSelect(next);
    optionRefs.current[next]?.focus();
    paneRef.current?.scrollTo({ top: 0 });
  };
  const onKey = (e: KeyboardEvent) => {
    const k = { ArrowDown: selected + 1, ArrowUp: selected - 1, Home: 0, End: rows.length - 1 }[e.key];
    if (k === undefined) return;
    e.preventDefault();
    move(k);
  };
  return (
    <>
      {/* Desktop and tablet */}
      <div className="hidden overflow-hidden rounded-xl border border-forest/15 bg-cream md:grid md:grid-cols-[18rem_minmax(0,1fr)]" style={{ height: PANEL_PX }}>
        <ul role="listbox" aria-label={label} className="overflow-y-auto border-r border-forest/15 bg-white" onKeyDown={onKey}>
          {rows.map((r, i) => (
            <li
              key={r.key}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              id={`${idBase}-opt-${i}`}
              role="option"
              aria-selected={i === selected}
              aria-controls={`${idBase}-detail`}
              tabIndex={i === selected ? 0 : -1}
              onClick={() => move(i)}
              className={`cursor-pointer border-b border-forest/10 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass ${
                i === selected ? "bg-forest/10" : "hover:bg-forest/5"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">{r.label}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-charcoal-soft">{r.summary}</p>
            </li>
          ))}
        </ul>
        <div ref={paneRef} id={`${idBase}-detail`} role="region" aria-label={`${label}: detail`} className="overflow-y-auto p-5">
          {detail(selected)}
        </div>
      </div>
      {/* Phones */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label={label}>
        {rows.map((r, i) => (
          <li key={r.key} className="rounded-xl border border-forest/15 bg-white">
            <button
              type="button"
              aria-expanded={open === i}
              aria-controls={`${idBase}-m-${i}`}
              onClick={() => {
                setOpen(open === i ? null : i);
                onSelect(i);
              }}
              className="w-full px-3 py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <span className="flex flex-wrap items-center gap-1.5">
                {r.label}
                <span className="ml-auto text-xs text-charcoal-soft" aria-hidden="true">
                  {open === i ? "Hide trace ▲" : "Show trace ▼"}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-charcoal-soft">{r.summary}</span>
            </button>
            {open === i && (
              <div id={`${idBase}-m-${i}`} className="border-t border-forest/10 bg-cream p-3">
                {detail(i)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function EngineTrace({ headers, src }: { headers: TraceHeaders; src: string }) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<TraceDoc | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState(0);
  const [statement, setStatement] = useState(0);
  const [test, setTest] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const started = useRef(false);

  const load = useCallback(() => {
    if (started.current) return;
    started.current = true;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: TraceDoc) => setDoc(d))
      .catch(() => setFailed(true));
  }, [src]);

  // Load when the section nears the viewport, never with the page.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && load(), { rootMargin: PRELOAD_MARGIN });
    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);

  const waiting = (
    <p className="text-sm text-charcoal-soft">{failed ? "The trace could not be loaded." : "Loading the trace…"}</p>
  );
  const statementRows: Row[] = headers.statements.map((s) => ({
    key: s.id,
    label: (
      <>
        <span className="font-mono text-xs font-bold text-charcoal">{s.id}</span>
        <Badge>{KIND_LABEL[s.kind]}</Badge>
        <Badge className={s.severity === "warning" ? "bg-brass-pale text-brass" : "bg-forest/10 text-forest"}>{s.severity}</Badge>
      </>
    ),
    summary: s.text,
  }));
  const testRows: Row[] = headers.tests.map((t) => ({
    key: t.file,
    label: (
      <>
        <span className="text-xs font-semibold text-charcoal">{testLabel(t.file)}</span>
        <Badge className={STATUS_CLASS[t.status]}>{t.status}</Badge>
      </>
    ),
    summary: t.description,
  }));
  const tabs = ["Follow a statement", "What the checker rejects"];
  const onTabKey = (e: KeyboardEvent) => {
    const next = { ArrowRight: (tab + 1) % 2, ArrowLeft: (tab + 1) % 2, Home: 0, End: 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };
  const current = tab === 0 ? headers.statements[statement] : null;

  return (
    <div ref={rootRef} className="mt-6">
      <div role="tablist" aria-label="Trace views" className="flex flex-wrap gap-2" onKeyDown={onTabKey}>
        {tabs.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`${uid}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={tab === i}
            aria-controls={`${uid}-panel-${i}`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            className={`rounded-full px-4 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
              tab === i ? "bg-forest text-cream" : "border border-forest/25 bg-white text-charcoal"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {tab === 0 && current ? `${current.id}, ${KIND_LABEL[current.kind]} statement, selected` : `${testLabel(headers.tests[test].file)} selected`}
      </p>
      <div id={`${uid}-panel-0`} role="tabpanel" aria-labelledby={`${uid}-tab-0`} hidden={tab !== 0} className="mt-4">
        <ListDetail
          rows={statementRows}
          selected={statement}
          onSelect={setStatement}
          label="Statements in the accepted brief"
          idBase={`${uid}-s`}
          detail={(i) => (doc ? <StatementDetail s={doc.statements[i]} doc={doc} /> : waiting)}
        />
      </div>
      <div id={`${uid}-panel-1`} role="tabpanel" aria-labelledby={`${uid}-tab-1`} hidden={tab !== 1} className="mt-4">
        <p className={`mb-3 rounded-lg border-l-4 border-brass bg-brass-pale/40 px-3 py-2 text-sm leading-6 text-charcoal ${MEASURE}`}>
          These are test cases I wrote to check the validator. They are not mistakes the AI made.
        </p>
        <ListDetail
          rows={testRows}
          selected={test}
          onSelect={setTest}
          label="Test briefs"
          idBase={`${uid}-t`}
          detail={(i) => (doc ? <TestDetail t={doc.tests[i]} /> : waiting)}
        />
      </div>
    </div>
  );
}

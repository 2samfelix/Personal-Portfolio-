#!/usr/bin/env python3
"""Export the "Trace a statement" data for the FP&A Intelligence Engine page.

Offline tool, run by hand whenever the pinned engine commit or the accepted run changes:

    git clone https://github.com/2samfelix/fpa-intelligence-engine /tmp/engine
    git -C /tmp/engine checkout <ENGINE_COMMIT>
    python3 -m venv /tmp/engine-venv && /tmp/engine-venv/bin/pip install -e "/tmp/engine[llm]"
    /tmp/engine-venv/bin/python scripts/export-engine-trace.py --engine /tmp/engine

Keep the clone and the virtualenv outside this repository. The script only reads them.

- The accepted brief comes from fpa-intelligence-engine/accepted-run/c4-run-1.json (see
  PROVENANCE.md there). Its packet is rebuilt from the engine's benchmark at the pinned commit;
  the packet hash must equal the run's.
- Every ID a statement cites is resolved against the benchmark files and the engine's packet;
  a dangling ID stops the export.
- The validator is the engine's own, imported from the clone: the accepted brief is re-validated
  and every test brief in the benchmark's briefs/ folder is run through it now.
- "What the code checked" lists the validator's rules for each statement kind (RULES below, read
  from brief_validator.py). The export stops unless RULES names exactly the error codes the
  validator source contains, so the list cannot invent or omit a rule.

Writes public/engine/trace.json, recording the engine commit and the SHA-256 of every engine file
used; `npm run check:engine-trace` fails if they or the accepted run no longer match.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE_REPO = "2samfelix/fpa-intelligence-engine"
ENGINE_COMMIT = "cd82a3945323009f2c360793459d77f4cccf2159"
BENCHMARK = "fpa_engine/benchmark/cat_q2_2026"
RUN_FILE = "fpa-intelligence-engine/accepted-run/c4-run-1.json"
RUN_SOURCE_SHA256 = "2e28c0fd155e74ec1af166a4de122d3095c5242057afe56b473109fc84ff8f5f"
OUTPUT = "public/engine/trace.json"
FORMAT_VERSION = 1

# Plain-English description of each test brief's defect. The validator output shown beside it is
# not written here: it comes from running the validator on the file.
TEST_BRIEFS = {
    "invalid_01_unknown_fact_id.json": "Cites a fact ID that does not exist in the evidence packet.",
    "invalid_02_unknown_evidence_id.json": "Cites narrative evidence that does not exist in the evidence packet.",
    "invalid_03_unsupported_number.json": "States a sales figure that matches no cited fact or evidence.",
    "invalid_04_arithmetic_in_prose.json":
        "Works out a new number in the sentence (a 15-point acceleration) instead of citing a fact that holds it.",
    "invalid_05_interpretive_as_explicit.json":
        "Presents an interpretation as something management said, resting on an unsourced assumption.",
    "invalid_06_unresolved_as_reconciled.json":
        "Says a profit bridge fully reconciles when the engine found it unresolved, with a residual left unassigned.",
    "invalid_07_na_relationship_additive.json":
        "Adds up figures that are not on a common basis (a growth rate and a dollar build) as if they made up the "
        "sales increase.",
    "invalid_08_stale_343_bps.json":
        "Uses 343 bps, a stale rounding artifact; the disclosed tariff impact is 340 bps.",
    "invalid_09_stale_570_bps.json":
        "Uses 570 bps, a plug that mixes two methods rather than a measured attribution.",
    "invalid_10_missing_r04_limitation.json":
        "States the $703M profit increase without the limitation the brief must carry: its bridge is unresolved.",
    "invalid_11_omitted_disclosure_gap.json":
        "States a directional stocking swing without the limitation for the disclosure gap that applies to it.",
    "invalid_12_missing_premises.json": "Makes an interpretive claim without citing the evidence it rests on.",
    "invalid_13_derived_as_disclosed.json": "Calls a figure the engine derived (the ~$284M tariff drag) disclosed.",
    "invalid_14_unsupported_range_estimate.json":
        "Gives a judgment range ($100–150M) that cannot be computed from the disclosures.",
    "valid_brief.json": "A correct brief, included to show the validator accepts one.",
}

# The validator's statement-level rules, by statement kind, as fpa_engine/brief_validator.py
# enforces them at ENGINE_COMMIT (validate_statements: _check_references, _check_kind,
# _check_prose, _check_assumptions, _check_voice, _check_numbers, _check_semantics, then
# _check_coverage over the whole brief). Each rule: (error codes, what it requires).
ALL_KINDS = "fact explicit_claim interpretive limitation".split()
RULES: list[tuple[list[str], list[str], str]] = [
    (["UNKNOWN_FACT_ID", "UNKNOWN_EVIDENCE_ID", "UNKNOWN_RECONCILIATION_ID", "UNKNOWN_PREMISE_ID", "UNKNOWN_FLAG_ID",
      "UNKNOWN_ASSERTION_ID", "UNKNOWN_ASSUMPTION_ID", "UNKNOWN_COMPARABILITY_NOTE_ID"], ALL_KINDS,
     "Every ID it cites exists in the evidence packet."),
    (["INTERNAL_PIPELINE_LANGUAGE", "PACKET_ID_IN_PROSE"], ALL_KINDS,
     "The text uses no pipeline vocabulary and no packet IDs."),
    (["FACT_WITHOUT_CITATION"], ["fact"], "It cites at least one fact."),
    (["INTERPRETIVE_AS_FACT"], ["fact"], "None of the evidence it cites is interpretive."),
    (["EXPLICIT_WITHOUT_EVIDENCE"], ["explicit_claim"], "It cites narrative evidence."),
    (["INTERPRETIVE_AS_EXPLICIT"], ["explicit_claim"], "All the evidence it cites is explicit, not interpretive."),
    (["EXPLICIT_WITHOUT_ASSERTION"], ["explicit_claim"], "It lists the source assertions it restates."),
    (["MISSING_PREMISES"], ["interpretive"], "It cites the premises it rests on."),
    (["INTERPRETIVE_MARKER_MISSING"], ["interpretive"],
     "The wording marks it as inference (for example 'suggests'), not as a disclosed fact."),
    (["LIMITATION_WITHOUT_SUBJECT"], ["limitation"], "It cites what it limits."),
    (["HIDDEN_ASSUMPTION"], ["fact", "explicit_claim", "interpretive"],
     "It lists every assumption its cited evidence rests on."),
    (["ASSUMPTION_AS_FACT"], ["fact", "explicit_claim"], "It rests on no assumption allowed only in interpretation."),
    (["MISSING_ASSUMPTION_DISCLOSURE"], ["interpretive"],
     "If it rests on an unsourced or must-disclose assumption, it frames itself as inference."),
    (["ASSERTION_WITHOUT_EVIDENCE", "SOURCE_VOICE_NOT_ATTRIBUTED", "ATTRIBUTION_WITHOUT_EVIDENCE",
      "QUOTE_NOT_VERBATIM", "QUOTE_NOT_ATTRIBUTED"], ALL_KINDS,
     "Cited assertions come with their evidence; the source's own words are attributed to it; attributions rest on "
     "quoted, validated evidence (a limitation that states a negative is exempt from that last test); quotations are "
     "verbatim and attributed."),
    (["UNSUPPORTED_CHARACTERIZATION"], ["fact", "explicit_claim", "interpretive"],
     "Any characterizing term it uses is backed by an assertion it cites."),
    (["FORBIDDEN_VALUE", "FALSE_PRECISION", "APPROXIMATION_MARKER_MISSING", "DERIVED_PRESENTED_AS_DISCLOSED",
      "ARITHMETIC_IN_PROSE", "UNCITED_FACT_VALUE", "UNSUPPORTED_NUMBER"], ALL_KINDS,
     "Every number in the text matches a cited fact or a value of a cited reconciliation (for an explicit claim or a "
     "limitation, also a number in the cited evidence's wording); none is a forbidden value, more precise than its "
     "fact, an unmarked approximation, worked out in the prose, or a derived figure called disclosed."),
    (["NON_COMPARABLE_PRESENTED_AS_PRECISE"], ["fact", "interpretive"],
     "Facts flagged directional or non-comparable are described that way."),
    (["UNRESOLVED_PRESENTED_AS_RECONCILED"], ["fact", "explicit_claim", "interpretive"],
     "It does not describe an unresolved reconciliation as complete."),
    (["NA_RELATIONSHIP_AS_ADDITIVE"], ["fact", "explicit_claim", "interpretive"],
     "It does not add up figures whose relationship is not additive."),
    (["MISSING_FLAG_LIMITATION", "MISSING_RECONCILIATION_LIMITATION", "MISSING_NA_LIMITATION",
      "MISSING_REVIEW_LIMITATION", "MISSING_ASSUMPTION_LIMITATION", "MISSING_DISCLOSURE_GAP"],
     ["fact", "explicit_claim", "interpretive"],
     "Every caveat its facts, reconciliations, evidence and assumptions require is stated by a limitation elsewhere "
     "in the brief."),
]
# Brief-level rules (validate_brief, validate_statements, _check_brief_policy, schema_issues).
BRIEF_RULES: list[tuple[list[str], str]] = [
    (["SCHEMA_INVALID", "MISSING_PACKET_HASH"], "The brief is well-formed and names the packet it was written for."),
    (["PACKET_MISMATCH", "PACKET_HASH_MISMATCH"], "It was written for this analysis and this exact packet version."),
    (["EMPTY_BRIEF", "DUPLICATE_STATEMENT_ID"], "It has statements, each with its own ID."),
    (["TITLE_NOT_DETERMINISTIC"], "Its title is the one generated from the packet."),
    (["STATEMENT_COUNT_OUT_OF_RANGE"], "It has an allowed number of statements."),
    (["MISSING_MANDATORY_LIMITATION"], "Limitations cite every item the policy makes mandatory."),
    (["MISSING_REQUIRED_COVERAGE"], "Every required role is covered by a statement of an allowed kind."),
]


def fail(message: str) -> None:
    print(f"export-engine-trace: ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def engine_files(engine: Path) -> list[Path]:
    """The engine code and benchmark files the export reads, directly or through the engine."""
    files = sorted((engine / "fpa_engine").glob("*.py")) + sorted((engine / BENCHMARK).rglob("*.json"))
    return [p for p in files if p.is_file()]


def check_rules(engine: Path) -> None:
    source = (engine / "fpa_engine/brief_validator.py").read_text(encoding="utf-8")
    in_source = set(re.findall(r'_issue\(\s*"([A-Z_]+)"', source)) | set(re.findall(r'code\s*=\s*"([A-Z_]+)"', source))
    in_source |= set(re.findall(r'\("([A-Z_]+)"\s+if\s', source)) | set(re.findall(r'else\s+"([A-Z_]+)"\)', source))
    in_source |= set(re.findall(r'report\(\s*"([A-Z_]+)"', source))
    listed = {c for codes, _, _ in RULES for c in codes} | {c for codes, _ in BRIEF_RULES for c in codes}
    if listed != in_source:
        fail(f"rule table out of step with brief_validator.py: missing {sorted(in_source - listed)}, "
             f"not in the validator {sorted(listed - in_source)}")


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--engine", type=Path, required=True, help="clone of the engine at ENGINE_COMMIT")
    args = parser.parse_args(argv)
    engine = args.engine.resolve()
    if engine == ROOT or ROOT in engine.parents:
        fail("keep the engine clone outside this repository")
    head = subprocess.run(["git", "-C", str(engine), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    if head != ENGINE_COMMIT:
        fail(f"engine clone is at {head or 'an unknown commit'}, expected {ENGINE_COMMIT}")
    # Tracked files only: an editable install adds an untracked *.egg-info folder.
    dirty = subprocess.run(["git", "-C", str(engine), "status", "--porcelain", "--untracked-files=no"],
                           capture_output=True, text=True).stdout
    if dirty.strip():
        fail("engine clone has local changes; use a clean checkout of the pinned commit")

    try:
        import fpa_engine
        from fpa_engine import brief_validator as bv
        from fpa_engine.brief import build_brief_packet
        from fpa_engine.loader import load_benchmark
    except ImportError as exc:
        fail(f"cannot import the engine ({exc}); run with the virtualenv the clone is installed in")
    if Path(fpa_engine.__file__).resolve().parent != engine / "fpa_engine":
        fail(f"the importable engine is {fpa_engine.__file__}, not the clone at {engine}")
    check_rules(engine)

    bench = engine / BENCHMARK
    raw = {name: json.loads((bench / f"{name}.json").read_text(encoding="utf-8"))
           for name in ["facts", "bridges", "narratives", "assertions", "sources"]}
    raw_facts = {f["id"]: f for f in raw["facts"]["sourced"] + raw["facts"]["derived"]}
    sources = {s["id"]: s for s in raw["sources"]}
    run_path = ROOT / RUN_FILE
    run = json.loads(run_path.read_text(encoding="utf-8"))

    packet = build_brief_packet(load_benchmark())
    if packet.packet_hash != run["packet_hash"] or run["brief"]["validation_metadata"]["packet_hash"] != packet.packet_hash:
        fail(f"packet hash {packet.packet_hash} at {ENGINE_COMMIT[:12]} does not match the run's {run['packet_hash']}")
    ctx = bv._Context(packet)
    by_id = lambda xs: {x.id: x for x in xs}  # noqa: E731
    packet_flags, packet_notes = by_id(packet.open_flags), by_id(packet.comparability_notes)
    packet_assumptions = by_id(packet.assumptions)
    accepted = bv.validate_brief_payload(packet, run["brief"])
    if not accepted.valid:
        fail(f"the accepted brief no longer validates: {[e.code for e in accepted.errors]}")

    def dec(v) -> str | None:
        return None if v is None else format(Decimal(str(v)).normalize(), "f")

    items: dict[str, dict] = {k: {} for k in ["facts", "sources", "reconciliations", "narratives", "assertions",
                                                 "flags", "notes", "assumptions"]}

    def add_source(sid: str) -> None:
        s = sources.get(sid)
        if s is None:
            fail(f"source {sid} is not in sources.json")
        items["sources"][sid] = {k: s[k] for k in ["id", "publisher", "document", "section", "excerpt", "url",
                                                   "accession_number", "verification_method"] if s.get(k)}

    def add_fact(fid: str) -> None:
        f, pf = raw_facts.get(fid), ctx.facts.get(fid)
        if f is None or pf is None:
            fail(f"fact {fid} is cited but not in facts.json and the packet")
        # Sourced facts carry their value; derived facts carry a formula the engine evaluates.
        if "value" in f and Decimal(f["value"]) != pf.value:
            fail(f"fact {fid}: benchmark value {f['value']} differs from the packet's {pf.value}")
        if "value" not in f and f.get("origin") != "derived":
            fail(f"fact {fid} has no value in facts.json")
        for sid in f.get("source_ids", []):
            add_source(sid)
        items["facts"][fid] = {
            "id": fid, "metric": f["metric"], "value": dec(f.get("value", pf.value)), "unit": f["unit"],
            "value_from": "facts.json" if "value" in f else "computed by the engine from its inputs",
            "inputs": f.get("inputs"), "display": pf.display,
            "period": f["period"], "scope": f["scope"], "origin": f["origin"],
            "disclosure_status": f.get("disclosure_status"), "benchmark_cell": f.get("benchmark_cell"),
            "source_ids": f.get("source_ids", []), "derived_from": list(pf.derived_from), "formula": f.get("formula"),
            "flags": list(pf.flags),
        }

    def add_rec(rid: str) -> None:
        r = ctx.recs.get(rid)
        if r is None:
            fail(f"reconciliation {rid} is cited but not in the packet")
        items["reconciliations"][rid] = {
            "id": rid, "name": r.name, "period": r.period, "scope": r.scope, "status": r.status.value,
            "bridge_type": r.bridge_type.value, "starting_value": dec(r.starting_value),
            "ending_value": dec(r.ending_value), "reported_change": dec(r.reported_change),
            "identified_change": dec(r.identified_change), "residual": dec(r.residual), "allowed": dec(r.allowed),
            "unquantified_components": list(r.unquantified_components), "reason": r.reason,
        }

    def add_narrative(nid: str) -> None:
        n = ctx.narratives.get(nid)
        if n is None:
            fail(f"narrative evidence {nid} is cited but not in the packet")
        for sid in n.source_ids:
            add_source(sid)
        items["narratives"][nid] = {
            "id": nid, "claim": n.claim, "evidence_type": n.evidence_type.value, "verbatim_quote": n.verbatim_quote,
            "period": n.period, "scope": n.scope, "review_status": n.review_status.value,
            "source_ids": list(n.source_ids), "assertion_ids": list(n.assertion_ids),
        }

    def add_assertion(xid: str) -> None:
        a = ctx.assertions.get(xid)
        if a is None:
            fail(f"assertion {xid} is cited but not in the packet")
        items["assertions"][xid] = {"id": xid, "narrative_id": a.narrative_id, "text": a.text, "voice": a.voice.value,
                                    "quote": a.quote}

    def add_flag(gid: str) -> None:
        g = packet_flags.get(gid)
        if g is None:
            fail(f"flag {gid} is cited but not in the packet")
        items["flags"][gid] = {"id": gid, "kind": g.kind.value, "message": g.message, "related_ids": list(g.related_ids)}

    def add_note(cid: str) -> None:
        c = packet_notes.get(cid)
        if c is None:
            fail(f"comparability note {cid} is cited but not in the packet")
        items["notes"][cid] = {"id": cid, "text": c.text, "subject_ids": list(c.subject_ids)}

    def add_assumption(aid: str) -> None:
        a = packet_assumptions.get(aid)
        if a is None:
            fail(f"assumption {aid} is cited but not in the packet")
        items["assumptions"][aid] = {"id": aid, "text": a.text, "sourcing": a.sourcing.value}

    def number_trace(s) -> list[dict]:
        """Each number the validator reads in the text, and what it matched, using the engine's own functions."""
        tokens, _ = bv.extract_numbers(s.text)
        cited = bv._cited_facts(s, ctx)
        rec_values = [(rid, field, v) for rid in s.reconciliation_ids for field, v in (
            ("residual", ctx.recs[rid].residual), ("allowed", ctx.recs[rid].allowed),
            ("reported change", ctx.recs[rid].reported_change), ("identified change", ctx.recs[rid].identified_change),
            ("starting value", ctx.recs[rid].starting_value), ("ending value", ctx.recs[rid].ending_value))
            if v is not None]
        quotes = []
        if s.kind.value in ("explicit_claim", "limitation"):
            for nid in s.evidence_ids:
                n = ctx.narratives[nid]
                quotes += [(nid, q) for q in bv.extract_numbers(" ".join(filter(None, [n.verbatim_quote, n.claim])))[0]]
        out = []
        for t in tokens:
            fact = next((f for f in cited if bv.matches_fact(t, f)), None)
            if fact:
                out.append({"text": t.raw, "matches": "fact", "id": fact.id, "value": fact.display})
                continue
            rec = next(((rid, field, v) for rid, field, v in rec_values if bv._unit_ok(t.unit, "usd_m") and bv._close(t, v)), None)
            if rec:
                out.append({"text": t.raw, "matches": "reconciliation", "id": rec[0], "field": rec[1], "value": dec(rec[2])})
                continue
            quote = next((nid for nid, q in quotes if q.value == t.value and (t.unit is None or q.unit in (None, t.unit))), None)
            if quote:
                out.append({"text": t.raw, "matches": "evidence", "id": quote})
                continue
            fail(f"{s.id}: '{t.raw}' matched nothing, yet the brief validated")
        return out

    from fpa_engine.brief import ExecutiveBrief
    brief = ExecutiveBrief.model_validate(run["brief"])
    statements = []
    for s in brief.statements:
        for fid in s.fact_ids:
            add_fact(fid)
        for rid in s.reconciliation_ids:
            add_rec(rid)
        for nid in s.evidence_ids:
            add_narrative(nid)
        for xid in s.assertion_ids:
            add_assertion(xid)
        premises = []
        for pid in s.premise_ids:
            if pid in ctx.facts:
                add_fact(pid)
                premises.append({"type": "fact", "id": pid})
            elif pid in ctx.narratives:
                add_narrative(pid)
                premises.append({"type": "narrative", "id": pid})
            else:
                fail(f"{s.id}: premise {pid} is not in the packet")
        for gid in s.flag_ids:
            add_flag(gid)
        for cid in s.comparability_note_ids:
            add_note(cid)
        for aid in s.assumption_ids:
            add_assumption(aid)
        kind = s.kind.value
        statements.append({
            "id": s.id, "kind": kind, "severity": s.severity.value, "text": s.text,
            "facts": list(s.fact_ids), "reconciliations": list(s.reconciliation_ids),
            "narratives": list(s.evidence_ids), "assertions": list(s.assertion_ids), "premises": premises,
            "flags": list(s.flag_ids), "notes": list(s.comparability_note_ids), "assumptions": list(s.assumption_ids),
            "numbers": number_trace(s),
            "rules": [{"codes": codes, "check": text} for codes, kinds, text in RULES if kind in kinds],
        })

    tests = []
    folder = bench / "briefs"
    names = sorted(p.name for p in folder.glob("*.json"))
    if names != sorted(TEST_BRIEFS):
        fail(f"test briefs changed: {sorted(set(names) ^ set(TEST_BRIEFS))}")
    for name in names:
        payload = json.loads((folder / name).read_text(encoding="utf-8"))
        result = bv.validate_brief_payload(packet, payload)
        by_id = {st["id"]: st for st in payload["statements"]}
        offending = list(dict.fromkeys(e.statement_id for e in result.errors if e.statement_id))
        tests.append({
            "file": name, "description": TEST_BRIEFS[name], "status": result.status,
            "statements": [{"id": i, "kind": by_id[i]["kind"], "text": by_id[i]["text"]} for i in offending],
            "errors": [{"code": e.code, "statement_id": e.statement_id, "subject_id": e.subject_id, "message": e.message}
                       for e in result.errors],
        })
    if any(t["status"] != "REJECTED" for t in tests if t["file"].startswith("invalid_")) or \
            next(t for t in tests if t["file"] == "valid_brief.json")["status"] != "VALID":
        fail("a test brief did not get its expected verdict")

    doc = {
        "version": FORMAT_VERSION,
        "engine": {"repo": ENGINE_REPO, "commit": ENGINE_COMMIT,
                   "files": {str(p.relative_to(engine)): sha256(p) for p in engine_files(engine)}},
        "run": {
            "file": RUN_FILE, "sha256": sha256(run_path), "source_run_file_sha256": RUN_SOURCE_SHA256,
            "run": run["run"], "of_runs": 5, "evaluation": "C4", "prompt_version": run["prompt_version"],
            "configured_model": run["configured_model"], "served_model": run["served_model"],
            "packet_hash": run["packet_hash"], "attempt_1_status": run["attempt_1_status"],
            "retry_used": run["retry_used"], "final_status": run["final_status"],
            "statement_count": run["statement_count"], "forbidden_value_count": run["forbidden_value_count"],
            "unsupported_number_count": run["unsupported_number_count"],
            "revalidated_at_commit": accepted.status, "title": run["brief"]["title"],
        },
        "brief_rules": [{"codes": codes, "check": text} for codes, text in BRIEF_RULES],
        "statements": statements,
        "items": items,
        "tests": tests,
    }
    out = ROOT / OUTPUT
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT}: {len(statements)} statements, {sum(len(v) for v in items.values())} linked items, "
          f"{len(tests)} test briefs, {len(doc['engine']['files'])} engine files hashed, {out.stat().st_size} bytes")


if __name__ == "__main__":
    main(sys.argv[1:])

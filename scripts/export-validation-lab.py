#!/usr/bin/env python3
"""Export the validation lab for the FP&A Intelligence Engine page.

Offline tool, run by hand whenever the pinned engine commit or the cases change. No API key, no
LLM call and no network: every case goes through the engine's own acceptance path with the
engine's scripted mock client.

    git clone https://github.com/2samfelix/fpa-intelligence-engine /tmp/engine
    git -C /tmp/engine checkout <ENGINE_COMMIT>
    python3 -m venv /tmp/engine-venv && /tmp/engine-venv/bin/pip install -e /tmp/engine
    /tmp/engine-venv/bin/python scripts/export-validation-lab.py --engine /tmp/engine

Keep the clone and the virtualenv outside this repository. The script only reads them.

- The base brief is the accepted brief of the recorded run (fpa-intelligence-engine/accepted-run/
  c4-run-1.json), read and never modified. That run was made against the earlier packet, so the
  only change made to it here is its validation_metadata.packet_hash, set to the current packet's;
  the base brief must then be accepted, or the export stops.
- Each case changes one statement (text, references or severity) or drops one reference, then runs
  synthesizer.synthesize(packet, MockLLMClient([payload]), max_attempts=1): the same parsing,
  schema, citation resolution, packet and validator a live brief goes through, minus the model.
- Every case states its expected outcome and error codes before it runs. Actual outcomes are
  recorded as they are; a case whose result differs from its expectation, and every faulty
  statement the validator accepts, stays in the output.
- The stage that fired is the validator function that emits each error code, read from
  brief_validator.py at the pinned commit.

Writes public/engine/validation-lab.json. Its SHA-256 is pinned in src/lib/validationLab.ts (the
build fails if they differ), and `npm run check:validation-lab` re-checks the engine files at the
pinned commit.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import platform
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE_REPO = "2samfelix/fpa-intelligence-engine"
ENGINE_COMMIT = "c91e254dbb4a99c01d894bd51a4b73528f0e8911"
PACKET_HASH = "5eeb00d3342b281452f30eb9cef8f8026d4fa96b1b73a385e9d82c01e574291d"
BENCHMARK = "fpa_engine/benchmark/cat_q2_2026"
RUN_FILE = "fpa-intelligence-engine/accepted-run/c4-run-1.json"
OUTPUT = "public/engine/validation-lab.json"
FORMAT_VERSION = 1
# The packet's build timestamp is excluded from its hash; fixed so the export is reproducible.
GENERATED_AT = datetime(2026, 10, 12, tzinfo=timezone.utc)
VERSIONED_FILES = ["fpa_engine/brief_validator.py", "fpa_engine/brief.py", "fpa_engine/synthesizer.py",
                   "fpa_engine/llm.py", "fpa_engine/schemas.py"]

TOPICS = [
    ("numbers", "Wrong or invented numbers"),
    ("rounding", "Rounding and precision"),
    ("units", "Units"),
    ("arithmetic", "Arithmetic"),
    ("references", "Evidence references"),
    ("quotes", "Quotations and attribution"),
    ("classification", "Statement kind and wording"),
    ("limitations", "Required limitations and forbidden values"),
    ("context", "Period, direction and segment"),
    ("causal", "Causal claims"),
]
GROUPS = {
    "control": "Valid control: must be accepted",
    "reliable": "Reliably caught",
    "conditional": "Caught only under conditions",
    "not_established": "Cannot be established by the engine",
}

SALES = "Construction Industries sales rose to $8,346M in Q2 2026 from $6,190M a year earlier."
B1_REST = (" The company's sales bridge reconciles, with sales volume contributing $1,755M and price realization"
           " $309M.")


B4_HEAD = "CI segment profit rose to $1,947M in Q2 2026 from $1,244M a year earlier"
B4_REST = " The Q2 2026 release said the increase was primarily due to the profit impact of higher sales volume."


def b4(first_sentence: str, **refs) -> dict:
    """B4 with its first sentence replaced (the attributed second sentence kept)."""
    return {"text": first_sentence + B4_REST, **refs}


def b1(first_sentence: str, **refs) -> dict:
    """B1 with its first sentence replaced (the bridge sentence kept)."""
    return {"text": first_sentence + B1_REST, **refs}


# (id, topic, group, faulty, what the case does, statement, change, expected outcome, expected codes)
# change: a dict of statement fields to replace; {"drop": {field: [ids]}} removes references.
CASES = [
    # ---- valid controls
    ("C01", "numbers", "control", False, "The accepted brief, unchanged", None, None, "ACCEPT", []),
    ("C02", "numbers", "control", False, "B1 reworded, same figures and citations", "B1",
     b1("In Q2 2026, Construction Industries sales were $8,346M, up from $6,190M a year earlier."), "ACCEPT", []),
    ("C03", "numbers", "control", False, "B2 figures written as $1.5 billion and $400 million", "B2",
     {"text": "The disclosed CI dealer-inventory build fell from $1.5 billion in Q1 2026 to $400 million in Q2 2026. "
              "Over the same quarters, price-neutral CI retail sales growth rose from 7% to 22%."}, "ACCEPT", []),
    ("C05", "arithmetic", "control", False, "The $2,156M sales change, held by the cited sales bridge (R01)", "B1",
     b1("Construction Industries sales rose $2,156M to $8,346M in Q2 2026 from $6,190M a year earlier."), "ACCEPT", []),
    ("C04", "classification", "control", False, "B5 with a different inference marker ('indicates')", "B5",
     {"text": "Taken together, a smaller disclosed dealer build alongside faster price-neutral retail growth indicates "
              "that Q2 2026 CI growth leaned less on dealer restocking and more on end-user demand than in Q1 2026."},
     "ACCEPT", []),

    # ---- reliably caught
    ("N01", "numbers", "reliable", True, "Transposed digits: $8,436M for $8,346M", "B1",
     b1(SALES.replace("8,346", "8,436")), "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("N02", "numbers", "reliable", True, "A real but uncited figure: Q1 sales ($7,161M) given as Q2 sales", "B1",
     b1(SALES.replace("8,346", "7,161")), "REJECT", ["UNCITED_FACT_VALUE"]),
    ("N03", "numbers", "reliable", True, "An invented volume contribution ($1,800M)", "B1",
     {"text": SALES + B1_REST.replace("$1,755M", "$1,800M")}, "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("E01", "references", "reliable", True, "A fabricated evidence ID (N99) on the explicit claim", "B3",
     {"evidence_ids": ["N99"]}, "REJECT", ["UNKNOWN_EVIDENCE_ID"]),
    ("E02", "references", "reliable", True, "A fabricated fact ID (S99) added to B1", "B1",
     {"fact_ids": ["S01", "S02", "S03", "S04", "S99"]}, "REJECT", ["UNKNOWN_FACT_ID"]),
    ("E03", "references", "reliable", True, "A fabricated assertion ID (N02-A99) on the explicit claim", "B3",
     {"assertion_ids": ["N02-A99"]}, "REJECT", ["UNKNOWN_ASSERTION_ID"]),
    ("A01", "arithmetic", "reliable", True, "A wrong difference ($2,100M) worked out from the cited figures", "B1",
     b1("Construction Industries sales rose $2,100M to $8,346M in Q2 2026 from $6,190M a year earlier."),
     "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("Q01", "quotes", "reliable", True, "Quoted management words altered ('dealers' for 'end users')", "B3",
     {"text": 'The Q2 2026 release said "Higher sales volume was mainly driven by higher sales of equipment to '
              'dealers".'}, "REJECT", ["QUOTE_NOT_VERBATIM"]),
    ("Q02", "quotes", "reliable", True, "Source wording quoted without saying who said it", "B3",
     {"text": 'Higher sales volume was "mainly driven by higher sales of equipment to end users".'},
     "REJECT", ["QUOTE_NOT_ATTRIBUTED", "SOURCE_VOICE_NOT_ATTRIBUTED"]),
    ("U01", "units", "reliable", True, "Wrong scale suffix: $8,346B for $8,346M", "B1",
     b1(SALES.replace("$8,346M", "$8,346B")), "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("U02", "units", "reliable", True, "Wrong unit suffix: a 23.3% margin written as 23.3 bps", "B4",
     b4(B4_HEAD + ", and segment margin rose to 23.3 bps from 20.1%."), "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("F01", "limitations", "reliable", True, "A forbidden value: the stale 343 bps tariff figure", "B7",
     {"text": "Prior-year CI segment profit and margin come from the original release versions and have not been "
              "tested for later restatement. The tariff margin impact was 343 bps."}, "REJECT", ["FORBIDDEN_VALUE"]),
    ("P01", "rounding", "reliable", True, "False precision: $8,346.0M (finer than the $1M display step)", "B1",
     b1(SALES.replace("$8,346M", "$8,346.0M")), "REJECT", ["FALSE_PRECISION"]),
    ("P02", "rounding", "reliable", True, "False precision: 23.30% (finer than the 0.1-point step)", "B4",
     b4(B4_HEAD + ", and segment margin rose to 23.30% from 20.1%."), "REJECT", ["FALSE_PRECISION"]),
    ("K01", "classification", "reliable", True, "A derived figure called disclosed ($703M is computed)", "B6",
     {"text": "Caterpillar disclosed a $703M increase in Q2 2026 CI segment profit, and its drivers remain "
              "unresolved."}, "REJECT", ["DERIVED_PRESENTED_AS_DISCLOSED"]),
    ("K02", "classification", "reliable", True, "Interpretive evidence (N15) cited by a fact statement", "B2",
     {"evidence_ids": ["N15"]}, "REJECT", ["ASSUMPTION_AS_FACT", "HIDDEN_ASSUMPTION", "INTERPRETIVE_AS_FACT",
                                          "MISSING_ASSUMPTION_LIMITATION", "MISSING_REVIEW_LIMITATION"]),
    ("K03", "classification", "reliable", True, "An inference written as fact (no inference marker)", "B5",
     {"text": "Taken together, a smaller disclosed dealer build alongside faster price-neutral retail growth shows "
              "that Q2 2026 CI growth leaned less on dealer restocking and more on end-user demand than in Q1 2026."},
     "REJECT", ["INTERPRETIVE_MARKER_MISSING"]),
    ("K04", "classification", "reliable", True, "An unresolved bridge described as fully reconciled", "B4",
     b4(B4_HEAD + ", and the $703M increase fully reconciles.", fact_ids=["S13", "S14", "S17", "S18", "D11"]),
     "REJECT", ["UNRESOLVED_PRESENTED_AS_RECONCILED"]),
    ("K05", "classification", "reliable", True, "A listed judgement word without support ('strong')", "B1",
     b1("Construction Industries sales were strong, rising to $8,346M in Q2 2026 from $6,190M a year earlier."),
     "REJECT", ["UNSUPPORTED_CHARACTERIZATION"]),
    ("L01", "limitations", "reliable", True, "The unresolved profit bridge (R04) dropped from the limitation", "B6",
     {"drop": {"reconciliation_ids": ["R04"]}}, "REJECT",
     ["MISSING_MANDATORY_LIMITATION", "MISSING_REQUIRED_COVERAGE"]),
    ("L02", "limitations", "reliable", True, "A mandatory disclosure gap (G04) dropped from the limitation", "B6",
     {"drop": {"flag_ids": ["G04"]}}, "REJECT", ["MISSING_MANDATORY_LIMITATION"]),

    # ---- caught only under conditions
    ("T01", "rounding", "conditional", False, "Rounded within half a written unit: $8.3 billion for $8,346M", "B1",
     b1(SALES.replace("$8,346M", "$8.3 billion")), "ACCEPT", []),
    ("T02", "rounding", "conditional", True, "Mis-rounded by more than half a unit: $8.4 billion", "B1",
     b1(SALES.replace("$8,346M", "$8.4 billion")), "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("T03", "rounding", "conditional", False, "Coarse rounding with a marker: about $8 billion", "B1",
     b1(SALES.replace("$8,346M", "about $8 billion")), "ACCEPT", []),
    ("T04", "rounding", "conditional", True, "Off by $4M at $1M precision: $8,350M", "B1",
     b1(SALES.replace("8,346", "8,350")), "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("T05", "rounding", "conditional", False, "A margin rounded to the whole point: 23% for 23.3%", "B4",
     b4(B4_HEAD + ", and segment margin rose to 23% from 20.1%."), "ACCEPT", []),
    ("Q03", "quotes", "conditional", True, "The Q01 alteration without quotation marks", "B3",
     {"text": "The Q2 2026 release said higher sales volume was mainly driven by higher sales of equipment to "
              "dealers."}, "ACCEPT", []),
    ("Q04", "quotes", "conditional", True, "An ellipsis quote that drops the end-user driver", "B3",
     {"text": 'The Q2 2026 release said "Higher sales volume was mainly driven by ... the impact from changes in '
              'dealer inventories".'}, "ACCEPT", []),
    ("A02", "arithmetic", "conditional", True, "A correct pairwise difference worked out in prose ($703M)", "B4",
     b4("CI segment profit rose $703M to $1,947M in Q2 2026 from $1,244M a year earlier, and segment margin rose to "
        "23.3% from 20.1%."), "REJECT", ["ARITHMETIC_IN_PROSE"]),
    ("A03", "arithmetic", "conditional", True, "A correct pairwise growth rate worked out in prose (35%)", "B1",
     b1("Construction Industries sales rose 35% to $8,346M in Q2 2026 from $6,190M a year earlier."),
     "REJECT", ["ARITHMETIC_IN_PROSE"]),
    ("A04", "arithmetic", "conditional", True, "A correct three-term sum ($2,138M): rejected, but not as arithmetic",
     "B1", {"text": SALES + " Sales volume, price realization and currency together contributed $2,138M."},
     "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("U03", "units", "conditional", False, "A registered conversion: 340 bps written as 3.4 percentage points", "B4",
     b4(B4_HEAD + ". Management put the tariff impact on CI segment margin at 3.4 percentage points.",
        fact_ids=["S13", "S14", "S17", "S18", "S29"]), "ACCEPT", []),
    ("U04", "units", "conditional", True, "340 bps written as 3.4% (recognized suffix, wrong unit)", "B4",
     b4(B4_HEAD + ". The tariff impact on CI segment margin was 3.4%.", fact_ids=["S13", "S14", "S17", "S18", "S29"]),
     "REJECT", ["UNSUPPORTED_NUMBER"]),
    ("U05", "units", "conditional", True, "A figure with no unit at all (8,346)", "B1",
     b1(SALES.replace("$8,346M", "8,346")), "ACCEPT", []),

    # ---- cannot be established
    ("X01", "context", "not_established", True, "Wrong fiscal period: the Q2 2026 figure labelled Q1 2026", "B1",
     b1(SALES.replace("in Q2 2026", "in Q1 2026")), "ACCEPT", []),
    ("X02", "context", "not_established", True, "Wrong comparison year: 'in Q2 2024'", "B1",
     b1("Construction Industries sales rose to $8,346M in Q2 2026 from $6,190M in Q2 2024."), "ACCEPT", []),
    ("X03", "context", "not_established", True, "Wrong direction: 'fell' for 'rose'", "B1",
     b1(SALES.replace("rose", "fell")), "ACCEPT", []),
    ("X04", "context", "not_established", True, "Wrong sign: the $703M increase written as -$703M", "B6",
     {"text": "The drivers of the -$703M change in Q2 2026 CI segment profit remain unresolved."}, "ACCEPT", []),
    ("X05", "context", "not_established", True, "Wrong segment: Resource Industries for Construction Industries", "B1",
     b1(SALES.replace("Construction Industries", "Resource Industries")), "ACCEPT", []),
    ("X06", "references", "not_established", True, "A real but irrelevant citation (S30, IEEPA recoveries) on B1",
     "B1", {"fact_ids": ["S01", "S02", "S03", "S04", "S30"]}, "ACCEPT", []),
    ("X07", "numbers", "not_established", True, "A wrong figure spelled out: 'about nine billion dollars'", "B1",
     b1(SALES.replace("$8,346M", "about nine billion dollars")), "ACCEPT", []),
    ("X08", "arithmetic", "not_established", True, "Arithmetic in words: Q2 build 'roughly half' of Q1 (true: ~27%)",
     "B2", {"text": "The disclosed CI dealer-inventory build of $400M in Q2 2026 was roughly half of the $1,500M Q1 "
                    "2026 build. Over the same quarters, price-neutral CI retail sales growth rose from 7% to 22%."},
     "ACCEPT", []),
    ("X09", "quotes", "not_established", True, "A misattributed paraphrase: N02 cited for a tariff claim", "B3",
     {"text": "The Q2 2026 release said tariffs were the main drag on Construction Industries."}, "ACCEPT", []),
    ("X10", "causal", "not_established", True, "An unsupported cause: 'because of higher prices'", "B1",
     b1(SALES.replace(" a year earlier.", " a year earlier, because of higher prices.")), "ACCEPT", []),
    ("X11", "causal", "not_established", True, "A false causal ranking: price ($309M) as the main driver", "B1",
     {"text": SALES + " The increase was driven mainly by price realization of $309M."}, "ACCEPT", []),
    ("X12", "causal", "not_established", True, "A cause given for the unresolved profit increase", "B6",
     {"text": "The $703M increase in Q2 2026 CI segment profit was caused by lower manufacturing costs, and the "
              "profit bridge remains unresolved."}, "ACCEPT", []),
    ("X13", "classification", "not_established", True, "Opinion stated as fact, without a listed judgement word",
     "B1", b1("Construction Industries demand is clearly accelerating, with sales of $8,346M in Q2 2026 against "
              "$6,190M a year earlier."), "ACCEPT", []),
    ("X14", "classification", "not_established", True, "An unlisted judgement word ('exceptionally')", "B1",
     b1("Construction Industries sales were exceptionally high at $8,346M in Q2 2026, against $6,190M a year "
        "earlier."), "ACCEPT", []),
    ("X15", "units", "not_established", True, "An unrecognized unit: '$8,346 thousand'", "B1",
     b1(SALES.replace("$8,346M", "$8,346 thousand")), "ACCEPT", []),
    ("X16", "limitations", "not_established", True, "A mandatory limitation marked severity 'info'", "B6",
     {"severity": "info"}, "ACCEPT", []),
]


def fail(message: str) -> None:
    print(f"export-validation-lab: ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def engine_files(engine: Path) -> list[Path]:
    """The engine code and benchmark files the export reads, directly or through the engine."""
    files = sorted((engine / "fpa_engine").glob("*.py")) + sorted((engine / BENCHMARK).rglob("*.json"))
    return [p for p in files if p.is_file()]


def code_stages(engine: Path) -> dict[str, str]:
    """Error code -> the brief_validator.py function that emits it, read from the source."""
    source = (engine / "fpa_engine/brief_validator.py").read_text(encoding="utf-8")
    stages: dict[str, str] = {}
    for match in re.finditer(r"^def (\w+)\(.*?(?=^def |\Z)", source, re.S | re.M):
        name, body = match.group(1), match.group(0)
        codes = set(re.findall(r'_issue\(\s*"([A-Z_]+)"', body)) | set(re.findall(r'code\s*=\s*"([A-Z_]+)"', body))
        codes |= set(re.findall(r'\("([A-Z_]+)"\s+if\s', body)) | set(re.findall(r'else\s+"([A-Z_]+)"\)', body))
        codes |= set(re.findall(r'report\(\s*"([A-Z_]+)"', body))
        for code in codes:
            stages.setdefault(code, name)
    return stages


def apply_change(statement: dict, change: dict) -> dict:
    out = copy.deepcopy(statement)
    for field, value in change.items():
        if field == "drop":
            for ref_field, ids in value.items():
                out[ref_field] = [i for i in out.get(ref_field, []) if i not in ids]
        else:
            out[field] = value
    return out


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--engine", type=Path, required=True, help="clean clone of the engine at ENGINE_COMMIT")
    args = parser.parse_args(argv)
    engine = args.engine.resolve()
    if engine == ROOT or ROOT in engine.parents:
        fail("keep the engine clone outside this repository")
    head = subprocess.run(["git", "-C", str(engine), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    if head != ENGINE_COMMIT:
        fail(f"engine clone is at {head or 'an unknown commit'}, expected {ENGINE_COMMIT}")
    dirty = subprocess.run(["git", "-C", str(engine), "status", "--porcelain", "--untracked-files=no"],
                           capture_output=True, text=True).stdout
    if dirty.strip():
        fail("engine clone has local changes; use a clean checkout of the pinned commit")

    try:
        import fpa_engine
        import pydantic
        from fpa_engine.brief import build_brief_packet
        from fpa_engine.llm import MockLLMClient
        from fpa_engine.synthesizer import PROMPT_VERSION, SynthesisStatus, synthesize
    except ImportError as exc:
        fail(f"cannot import the engine ({exc}); run with the virtualenv the clone is installed in")
    if Path(fpa_engine.__file__).resolve().parent != engine / "fpa_engine":
        fail(f"the importable engine is {fpa_engine.__file__}, not the clone at {engine}")

    packet = build_brief_packet(generated_at=GENERATED_AT)
    if packet.packet_hash != PACKET_HASH:
        fail(f"packet hash {packet.packet_hash} at {ENGINE_COMMIT[:12]} is not the pinned {PACKET_HASH}")
    stages = code_stages(engine)

    run_path = ROOT / RUN_FILE
    run = json.loads(run_path.read_text(encoding="utf-8"))
    brief = run["brief"]
    base = {"statements": brief["statements"],
            "validation_metadata": {**brief["validation_metadata"], "packet_hash": packet.packet_hash}}
    by_id = {s["id"]: s for s in base["statements"]}

    def run_case(payload: dict):
        result = synthesize(packet, MockLLMClient([payload]), max_attempts=1, now=lambda: GENERATED_AT)
        codes = sorted({e.code for e in result.errors})
        return ("ACCEPT" if result.status is SynthesisStatus.ACCEPTED else "REJECT"), codes, result

    outcome, codes, _ = run_case(copy.deepcopy(base))
    if outcome != "ACCEPT":
        fail(f"the base brief is not accepted against the current packet: {codes}")

    ids = [c[0] for c in CASES]
    if len(ids) != len(set(ids)):
        fail("duplicate case IDs")
    topic_ids = {t for t, _ in TOPICS}
    cases = []
    for cid, topic, group, faulty, what, sid, change, exp_outcome, exp_codes in CASES:
        if topic not in topic_ids or group not in GROUPS:
            fail(f"{cid}: unknown topic or group")
        payload = copy.deepcopy(base)
        statement = None
        if sid:
            payload["statements"] = [apply_change(s, change) if s["id"] == sid else s for s in payload["statements"]]
            statement = next(s for s in payload["statements"] if s["id"] == sid)
            if statement == by_id[sid]:
                fail(f"{cid}: the change leaves {sid} unchanged")
        actual, actual_codes, result = run_case(payload)
        unmapped = [c for c in actual_codes if c not in stages]
        if unmapped:
            fail(f"{cid}: codes not found in brief_validator.py: {unmapped}")
        matches = actual == exp_outcome and (actual == "ACCEPT" or actual_codes == sorted(exp_codes))
        cases.append({
            "id": cid, "topic": topic, "group": group, "faulty": faulty, "description": what,
            "statement": None if statement is None else {
                "id": sid, "kind": statement["kind"], "severity": statement.get("severity"), "text": statement["text"],
                "refs": {k: v for k, v in statement.items() if k.endswith("_ids") and v},
                "changed": sorted(k for k in change if k != "drop") + sorted(f"{k} (removed {', '.join(v)})"
                                                                         for k, v in change.get("drop", {}).items()),
            },
            "expected": {"outcome": exp_outcome, "codes": sorted(exp_codes)},
            "actual": {"outcome": actual, "codes": actual_codes, "status": result.status.value},
            "matches_expectation": matches,
            "missed": faulty and actual == "ACCEPT",
            "stages": sorted({stages[c] for c in actual_codes}) or ["no rule fired"],
        })

    doc = {
        "version": FORMAT_VERSION,
        "engine": {"repo": ENGINE_REPO, "commit": ENGINE_COMMIT,
                   "files": {str(p.relative_to(engine)): sha256(p) for p in engine_files(engine)}},
        "validator": {
            "prompt_version": PROMPT_VERSION, "packet_hash": packet.packet_hash, "packet_version": packet.packet_version,
            "files": {f: sha256(engine / f) for f in VERSIONED_FILES},
            "python": platform.python_version(), "pydantic": pydantic.VERSION,
            "entry_point": "fpa_engine.synthesizer.synthesize(packet, MockLLMClient([payload]), max_attempts=1)",
        },
        "base": {"file": RUN_FILE, "sha256": sha256(run_path),
                 "note": "The recorded run's accepted brief, with validation_metadata.packet_hash set to the current "
                         "packet. Each case changes one statement."},
        "topics": [{"id": t, "label": label} for t, label in TOPICS],
        "groups": [{"id": g, "label": label} for g, label in GROUPS.items()],
        "cases": cases,
    }
    out = ROOT / OUTPUT
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    faulty = [c for c in cases if c["faulty"]]
    print(f"wrote {OUTPUT}: {len(cases)} cases; {sum(c['matches_expectation'] for c in cases)} as expected; "
          f"{sum(c['missed'] for c in cases)} faulty statements accepted; "
          f"{sum(not c['matches_expectation'] for c in cases)} differ from expectation")
    print(f"sha256 {sha256(out)}")


if __name__ == "__main__":
    main(sys.argv[1:])

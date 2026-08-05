"""Phase 2 -- per-question explanations.

Merges the authored batch files in tools/questions/explanations/ into
src/data/questions/explanations.json, and refuses to write unless every
record is sound. Same contract as tag.py: a mistake is an error here, not
something a child discovers on the learning page.

    python tools/questions/build_explanations.py           # validate + write
    python tools/questions/build_explanations.py --check    # validate only
    python tools/questions/build_explanations.py --status   # coverage report
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BATCH_DIR = Path(__file__).resolve().parent / "explanations"
QUESTIONS = ROOT / "src" / "data" / "questions" / "questions.json"
OUT = ROOT / "src" / "data" / "questions" / "explanations.json"

# An explanation shorter than this is a stub, not an explanation. Long enough
# to catch "Wrong." and placeholder text; short enough not to nag real answers.
MIN_LEN = 25

LETTERS = "ABCDE"


def load_questions() -> dict[str, dict]:
    with QUESTIONS.open(encoding="utf-8") as fh:
        return {q["id"]: q for q in json.load(fh)}


def load_batches() -> tuple[list[dict], list[str]]:
    """Every record across every batch file, plus errors for malformed files."""
    records: list[dict] = []
    errors: list[str] = []
    for path in sorted(BATCH_DIR.glob("*.json")):
        try:
            with path.open(encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as exc:
            errors.append(f"{path.name}: not valid JSON -- {exc}")
            continue
        if not isinstance(data, list):
            errors.append(f"{path.name}: expected a list of records")
            continue
        for rec in data:
            if not isinstance(rec, dict) or "id" not in rec:
                errors.append(f"{path.name}: a record has no id")
                continue
            rec["_file"] = path.name
            records.append(rec)
    return records, errors


def validate(records: list[dict], questions: dict[str, dict]) -> list[str]:
    errors: list[str] = []
    seen: dict[str, str] = {}

    for rec in records:
        qid = rec["id"]
        where = f"{rec['_file']} [{qid}]"

        if qid in seen:
            errors.append(f"{where}: already explained in {seen[qid]}")
            continue
        seen[qid] = rec["_file"]

        q = questions.get(qid)
        if q is None:
            errors.append(f"{where}: no such question")
            continue

        # A shredded question must never be explained -- the options on screen
        # would not be the options the child sat.
        if q.get("needs_review"):
            errors.append(f"{where}: question carries needs_review; retype its options first")
            continue

        if not isinstance(rec.get("approved"), bool):
            errors.append(f"{where}: 'approved' must be present and boolean")

        graced = q.get("answer") is None
        n = len(q["options"])
        correct = q["answer"]

        why_correct = rec.get("why_correct")
        if graced:
            # No option was correct, so there is nothing to justify. What the
            # child needs is why the question was thrown out.
            if why_correct:
                errors.append(f"{where}: question was graced; use 'why_graced', not 'why_correct'")
            if not isinstance(rec.get("why_graced"), str) or len(rec.get("why_graced", "")) < MIN_LEN:
                errors.append(f"{where}: graced question needs a 'why_graced' of at least {MIN_LEN} chars")
        else:
            if not isinstance(why_correct, str) or len(why_correct) < MIN_LEN:
                errors.append(f"{where}: 'why_correct' missing or shorter than {MIN_LEN} chars")

        why_wrong = rec.get("why_wrong")
        if not isinstance(why_wrong, dict):
            errors.append(f"{where}: 'why_wrong' must be an object keyed by option index")
            continue

        # Every distractor, and only the distractors. A missing one is the
        # single most likely authoring slip, and it is exactly the option some
        # child chose.
        expected = {str(i) for i in range(n) if graced or i != correct}
        got = set(why_wrong)
        for missing in sorted(expected - got, key=int):
            errors.append(f"{where}: no explanation for option {LETTERS[int(missing)]}")
        for extra in sorted(got - expected, key=lambda k: (not k.isdigit(), k)):
            if not extra.isdigit() or int(extra) >= n:
                errors.append(f"{where}: 'why_wrong' key {extra!r} is not an option of this question")
            else:
                errors.append(f"{where}: option {LETTERS[int(extra)]} is the correct answer, not a distractor")

        for key in sorted(expected & got, key=int):
            text = why_wrong[key]
            if not isinstance(text, str) or len(text) < MIN_LEN:
                errors.append(f"{where}: option {LETTERS[int(key)]} explanation is missing or too short")

    return errors


def build(records: list[dict], questions: dict[str, dict]) -> list[dict]:
    out = []
    for rec in sorted(records, key=lambda r: list(questions).index(r["id"])):
        clean = {k: v for k, v in rec.items() if not k.startswith("_")}
        out.append(clean)
    return out


def report_status(records: list[dict], questions: dict[str, dict]) -> None:
    by_id = {r["id"]: r for r in records}
    buckets: dict[tuple, list[str]] = {}
    for qid, q in questions.items():
        key = (q["class"], q["stream"], q.get("section") or q["subject"])
        buckets.setdefault(key, []).append(qid)

    total = done = approved = 0
    for key, ids in buckets.items():
        eligible = [i for i in ids if not questions[i].get("needs_review")]
        d = [i for i in eligible if i in by_id]
        a = [i for i in d if by_id[i].get("approved")]
        total += len(eligible)
        done += len(d)
        approved += len(a)
        if d:
            print(f"  {'|'.join(key):44s} {len(d):3d}/{len(eligible):3d} written, {len(a):3d} approved")
    print(f"\n  {'TOTAL':44s} {done:3d}/{total:3d} written, {approved:3d} approved")


def main() -> int:
    args = set(sys.argv[1:])
    questions = load_questions()
    records, errors = load_batches()
    errors += validate(records, questions)

    if errors:
        print(f"{len(errors)} problem(s) -- nothing written:\n")
        for err in errors:
            print(f"  {err}")
        return 1

    if "--status" in args:
        print(f"{len(records)} explanations, all valid.\n")
        report_status(records, questions)
        return 0

    print(f"{len(records)} explanations, all valid.")
    if "--check" in args:
        return 0

    OUT.write_text(
        json.dumps(build(records, questions), ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

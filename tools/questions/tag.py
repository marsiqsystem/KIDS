"""
Expand tags.json into one chapter per question, and refuse to do it if the
mapping is not airtight.

Four things must hold before anything is written, because a wrong tag here shows
a child the wrong remedial video:

  * every question is tagged exactly once -- none missed, none tagged twice;
  * every chapter name used exists in chapters.json for that same bucket, so a
    typo becomes an error rather than a new one-question chapter;
  * every chapter catches at least one question -- an empty chapter means the
    vocabulary is wrong, not that the paper skipped a topic;
  * no tag refers to a question number the paper does not have.

Run:  python tools/questions/tag.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parents[1] / "src" / "data" / "questions"


def main() -> int:
    questions = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    chapters = {k: v for k, v in
                json.loads((HERE / "chapters.json").read_text(encoding="utf-8")).items()
                if not k.startswith("_")}
    tags = {k: v for k, v in
            json.loads((HERE / "tags.json").read_text(encoding="utf-8")).items()
            if not k.startswith("_")}

    by_bucket: dict[str, set[int]] = defaultdict(set)
    for q in questions:
        by_bucket[f"{q['class']}|{q['stream']}|{q['section']}"].add(q["q_no"])

    errors: list[str] = []
    assigned: dict[tuple[str, int], str] = {}

    for b in sorted(by_bucket):
        if b not in tags:
            errors.append(f"{b}: no tags at all")
            continue
        legal = set(chapters.get(b, []))
        seen: Counter[int] = Counter()

        for chapter, qnos in tags[b].items():
            if chapter not in legal:
                errors.append(f"{b}: chapter {chapter!r} is not in chapters.json")
            if not qnos:
                errors.append(f"{b}: chapter {chapter!r} has no questions")
            for n in qnos:
                if n not in by_bucket[b]:
                    errors.append(f"{b}: tagged q{n}, which is not in this section")
                    continue
                seen[n] += 1
                assigned[(b, n)] = chapter

        for n in sorted(by_bucket[b] - set(seen)):
            errors.append(f"{b}: q{n} is untagged")
        for n, c in sorted(seen.items()):
            if c > 1:
                errors.append(f"{b}: q{n} tagged {c} times")
        for chapter in sorted(legal - set(tags[b])):
            errors.append(f"{b}: chapter {chapter!r} caught no questions")

    for b in sorted(set(tags) - set(by_bucket)):
        errors.append(f"{b}: tags for a section with no questions")

    if errors:
        print(f"{len(errors)} PROBLEM(S) — nothing written:\n")
        for e in errors[:60]:
            print("  " + e)
        if len(errors) > 60:
            print(f"  ... and {len(errors) - 60} more")
        return 1

    rows = []
    for q in questions:
        b = f"{q['class']}|{q['stream']}|{q['section']}"
        rows.append({"id": q["id"], "class": q["class"], "stream": q["stream"],
                     "section": q["section"], "q_no": q["q_no"],
                     "chapter": assigned[(b, q["q_no"])]})
    rows.sort(key=lambda r: (r["class"], r["stream"], r["section"], r["q_no"]))
    (DATA / "question-chapters.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

    per = Counter(r["chapter"] for r in rows)
    print(f"tagged        : {len(rows)} questions")
    print(f"chapters used : {len(per)}")
    print(f"largest       : {per.most_common(1)[0][1]} questions "
          f"({per.most_common(1)[0][0]})")
    print(f"singletons    : {sum(1 for c in per.values() if c == 1)} chapters "
          f"with only one question")
    print(f"\nwrote {DATA / 'question-chapters.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

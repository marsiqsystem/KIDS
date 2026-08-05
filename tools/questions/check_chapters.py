"""
Check the proposed chapter vocabulary against the extracted questions.

Phase 1 runs in two steps: agree the vocabulary, then tag against it. This script
guards the first step -- it proves every bucket of questions has a chapter list
and that no chapter list exists for a bucket that has no questions. Once tagging
starts it also reports how far it has got.

Run:  python tools/questions/check_chapters.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parents[1] / "src" / "data" / "questions"


def bucket(q: dict) -> str:
    """The unit a chapter list is written for.

    Stream matters: XI Arts Economics and XI Commerce Economics are different
    papers with different syllabuses, and the key workbook says so in writing.
    """
    return f"{q['class']}|{q['stream']}|{q['section']}"


def main() -> int:
    questions = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    chapters = json.loads((HERE / "chapters.json").read_text(encoding="utf-8"))
    chapters = {k: v for k, v in chapters.items() if not k.startswith("_")}

    counts = Counter(bucket(q) for q in questions)
    problems: list[str] = []

    for b in sorted(counts):
        if b not in chapters:
            problems.append(f"no chapter list for {b} ({counts[b]} questions)")
    for b in sorted(chapters):
        if b not in counts:
            problems.append(f"chapter list for {b}, which has no questions")
        elif not chapters[b]:
            problems.append(f"empty chapter list for {b}")

    seen: set[str] = set()
    for b, names in chapters.items():
        if len(set(names)) != len(names):
            problems.append(f"duplicate chapter name within {b}")
        seen.update(names)

    print(f"buckets of questions : {len(counts)}")
    print(f"buckets with a list  : {len(chapters)}")
    print(f"distinct chapters    : {len(seen)}")
    print(f"questions covered    : {sum(counts[b] for b in counts if b in chapters)}"
          f" of {len(questions)}")

    ratio = [(len(chapters.get(b, [])), counts[b], b) for b in counts]
    heavy = [r for r in ratio if r[0] and r[1] / r[0] > 6]
    if heavy:
        print("\nbuckets averaging more than 6 questions per chapter "
              "(may want splitting):")
        for n, q, b in sorted(heavy, key=lambda r: -r[1] / r[0]):
            print(f"   {q:3d} questions / {n:2d} chapters   {b}")

    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print("   " + p)
        return 1
    print("\nEvery bucket has a chapter list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

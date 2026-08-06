"""Phase 3 -- per-chapter assets: the trick, the video, the interactive.

Merges the authored batch files in tools/questions/assets/ into
src/data/questions/chapter-assets.json, and refuses to write unless every
record is sound. Same contract as tag.py and build_explanations.py.

    python tools/questions/build_assets.py            # validate + write
    python tools/questions/build_assets.py --check     # validate only
    python tools/questions/build_assets.py --status    # coverage per bucket

The video rule is the one that matters most. A model must never emit a
YouTube URL, so an authored record carries a search *query* and a null
video_id; a video_id may only appear once a human has approved it. Anything
URL-shaped anywhere in the video block is an error, not something to clean up.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BATCH_DIR = HERE / "assets"
CHAPTERS = HERE / "chapters.json"
TEMPLATES = HERE / "templates.json"
OUT = ROOT / "src" / "data" / "questions" / "chapter-assets.json"

MIN_TRICK = 40          # shorter than this is a label, not a memory hook
MIN_QUERY = 10
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
URL_ISH = re.compile(r"https?://|www\.|youtu\.?be|youtube\.com|/watch\?", re.I)


def load_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def load_chapters() -> dict[str, list[str]]:
    return {k: v for k, v in load_json(CHAPTERS).items() if k != "_readme"}


def load_templates() -> dict[str, dict]:
    return {k: v for k, v in load_json(TEMPLATES).items() if k != "_readme"}


def load_batches() -> tuple[list[dict], list[str]]:
    records: list[dict] = []
    errors: list[str] = []
    if not BATCH_DIR.exists():
        return records, [f"{BATCH_DIR.relative_to(ROOT)} does not exist"]
    for path in sorted(BATCH_DIR.glob("*.json")):
        try:
            data = load_json(path)
        except json.JSONDecodeError as exc:
            errors.append(f"{path.name}: not valid JSON -- {exc}")
            continue
        if not isinstance(data, list):
            errors.append(f"{path.name}: expected a list of records")
            continue
        for rec in data:
            if not isinstance(rec, dict) or "bucket" not in rec or "chapter" not in rec:
                errors.append(f"{path.name}: a record has no bucket/chapter")
                continue
            rec["_file"] = path.name
            records.append(rec)
    return records, errors


# --- small helpers so the per-template checks stay readable -------------------

def _str(val, where: str, field: str, errors: list[str], minlen: int = 1) -> bool:
    if not isinstance(val, str) or len(val.strip()) < minlen:
        errors.append(f"{where}: {field} must be a string of at least {minlen} chars")
        return False
    return True


def _list(val, where: str, field: str, errors: list[str], lo: int, hi: int) -> bool:
    if not isinstance(val, list) or not (lo <= len(val) <= hi):
        errors.append(f"{where}: {field} must be a list of {lo} to {hi} items")
        return False
    return True


def _fields(item, where: str, field: str, errors: list[str], required: dict, optional=()) -> bool:
    """required maps name -> python type. Rejects unknown keys outright."""
    if not isinstance(item, dict):
        errors.append(f"{where}: {field} must be an object")
        return False
    ok = True
    for name, typ in required.items():
        if not isinstance(item.get(name), typ):
            shown = typ.__name__ if isinstance(typ, type) else "/".join(t.__name__ for t in typ)
            errors.append(f"{where}: {field} needs {name!r} of type {shown}")
            ok = False
    for name in item:
        if name not in required and name not in optional:
            errors.append(f"{where}: {field} has unexpected key {name!r}")
            ok = False
    return ok


# --- one checker per template -------------------------------------------------

def check_match_pairs(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    if _list(d.get("pairs"), where, "pairs", errors, 2, 8):
        seen = set()
        for i, p in enumerate(d["pairs"]):
            if _fields(p, where, f"pairs[{i}]", errors, {"left": str, "right": str}):
                if p["left"] in seen:
                    errors.append(f"{where}: pairs[{i}] repeats the left item {p['left']!r}")
                seen.add(p["left"])


def check_timeline_order(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    if _list(d.get("items"), where, "items", errors, 3, 8):
        for i, it in enumerate(d["items"]):
            _fields(it, where, f"items[{i}]", errors, {"label": str}, optional=("note",))


def check_sort_bins(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    bins_ok = _list(d.get("bins"), where, "bins", errors, 2, 4)
    if bins_ok and not all(isinstance(b, str) and b.strip() for b in d["bins"]):
        errors.append(f"{where}: every bin must be a non-empty string")
        bins_ok = False
    if _list(d.get("items"), where, "items", errors, 4, 12) and bins_ok:
        used = set()
        for i, it in enumerate(d["items"]):
            if _fields(it, where, f"items[{i}]", errors, {"label": str, "bin": str}):
                if it["bin"] not in d["bins"]:
                    errors.append(f"{where}: items[{i}] names bin {it['bin']!r}, which is not in bins")
                else:
                    used.add(it["bin"])
        # An empty bin is a broken game: nothing ever goes there.
        for b in d["bins"]:
            if b not in used:
                errors.append(f"{where}: bin {b!r} catches no item")


def check_odd_one_out(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    _str(d.get("because"), where, "because", errors, 15)
    if _list(d.get("items"), where, "items", errors, 3, 6):
        if not all(isinstance(x, str) and x.strip() for x in d["items"]):
            errors.append(f"{where}: every item must be a non-empty string")
        odd = d.get("odd")
        if not isinstance(odd, int) or isinstance(odd, bool) or not (0 <= odd < len(d["items"])):
            errors.append(f"{where}: 'odd' must be an index into items")


def check_fill_blank(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    if not _str(d.get("text"), where, "text", errors, 20):
        return
    if not _list(d.get("answers"), where, "answers", errors, 1, 8):
        return
    gaps = sorted(int(n) for n in re.findall(r"\{(\d+)\}", d["text"]))
    if gaps != list(range(1, len(d["answers"]) + 1)):
        errors.append(
            f"{where}: text has gaps {gaps or 'none'} but {len(d['answers'])} answers; "
            "gaps must run 1..n with no repeats or holes"
        )
    bank = d.get("bank")
    if not isinstance(bank, list) or not all(isinstance(b, str) for b in bank):
        errors.append(f"{where}: 'bank' must be a list of strings")
        return
    for a in d["answers"]:
        if a not in bank:
            errors.append(f"{where}: answer {a!r} is not in the word bank")
    if len(set(bank)) != len(bank):
        errors.append(f"{where}: the word bank repeats an entry")


def check_transform(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    _str(d.get("rule"), where, "rule", errors, 10)
    if _list(d.get("items"), where, "items", errors, 2, 8):
        for i, it in enumerate(d["items"]):
            if _fields(it, where, f"items[{i}]", errors, {"from": str, "to": str}, optional=("hint",)):
                if it["from"].strip() == it["to"].strip():
                    errors.append(f"{where}: items[{i}] is unchanged by the transformation")


def check_label_diagram(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    svg = d.get("svg")
    if _str(svg, where, "svg", errors, 30):
        if not svg.strip().startswith("<svg") or "viewBox" not in svg:
            errors.append(f"{where}: svg must be an inline <svg> element carrying a viewBox")
        if URL_ISH.search(svg) or "<image" in svg or "xlink:href" in svg:
            errors.append(f"{where}: svg must be self-contained -- no external images or links")
    if _list(d.get("labels"), where, "labels", errors, 2, 8):
        for i, lb in enumerate(d["labels"]):
            if _fields(lb, where, f"labels[{i}]", errors, {"label": str, "x": (int, float), "y": (int, float)}):
                for axis in ("x", "y"):
                    if not 0 <= lb[axis] <= 100:
                        errors.append(f"{where}: labels[{i}].{axis} must lie in 0..100 (the viewBox)")


def check_formula_pick(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    if _list(d.get("items"), where, "items", errors, 2, 6):
        for i, it in enumerate(d["items"]):
            if _fields(it, where, f"items[{i}]", errors,
                       {"ask": str, "correct": str, "wrong": list, "why": str}):
                if not 1 <= len(it["wrong"]) <= 3 or not all(isinstance(w, str) for w in it["wrong"]):
                    errors.append(f"{where}: items[{i}].wrong must be 1 to 3 strings")
                elif it["correct"] in it["wrong"]:
                    errors.append(f"{where}: items[{i}] lists the correct formula among the wrong ones")


def check_step_solve(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    _str(d.get("problem"), where, "problem", errors, 15)
    _str(d.get("answer"), where, "answer", errors, 1)
    if _list(d.get("steps"), where, "steps", errors, 2, 6):
        for i, st in enumerate(d["steps"]):
            if _fields(st, where, f"steps[{i}]", errors,
                       {"ask": str, "options": list, "correct": int, "why": str}):
                opts = st["options"]
                if not 2 <= len(opts) <= 4 or not all(isinstance(o, str) for o in opts):
                    errors.append(f"{where}: steps[{i}].options must be 2 to 4 strings")
                elif isinstance(st["correct"], bool) or not (0 <= st["correct"] < len(opts)):
                    errors.append(f"{where}: steps[{i}].correct must index its own options")


def check_true_false(d, where, errors):
    _str(d.get("prompt"), where, "prompt", errors, 10)
    if _list(d.get("items"), where, "items", errors, 3, 8):
        for i, it in enumerate(d["items"]):
            _fields(it, where, f"items[{i}]", errors,
                    {"statement": str, "is_true": bool, "why": str})
        # All-true or all-false is a quiz with a giveaway pattern.
        flags = {it.get("is_true") for it in d["items"] if isinstance(it, dict)}
        if flags in ({True}, {False}):
            errors.append(f"{where}: every statement has the same truth value; mix them")


CHECKERS = {
    "match-pairs": check_match_pairs,
    "timeline-order": check_timeline_order,
    "sort-bins": check_sort_bins,
    "odd-one-out": check_odd_one_out,
    "fill-blank": check_fill_blank,
    "transform": check_transform,
    "label-diagram": check_label_diagram,
    "formula-pick": check_formula_pick,
    "step-solve": check_step_solve,
    "true-false": check_true_false,
}


def check_video(video, where: str, errors: list[str]) -> None:
    """A model may write a query. Only a human may write a video_id."""
    if not isinstance(video, dict):
        errors.append(f"{where}: 'video' must be an object")
        return
    for name in video:
        if name not in {"query", "video_id", "approved", "title",
                        "language", "duration", "start"}:
            errors.append(f"{where}: video has unexpected key {name!r}")

    # The written content is English-medium, but video was never covered by that
    # ruling, so a page carrying a Bengali or Hindi video must say so up front.
    lang = video.get("language")
    if lang is not None and lang not in {"ENGLISH", "BENGALI", "HINDI"}:
        errors.append(f"{where}: video.language must be ENGLISH, BENGALI or HINDI, not {lang!r}")
    for field in ("duration", "start"):
        if field in video and not isinstance(video[field], str):
            errors.append(f"{where}: video.{field} must be a string such as '12 min' or '07:16'")
    if video.get("start") and not video.get("video_id"):
        errors.append(f"{where}: video.start is set but there is no video to start")

    _str(video.get("query"), where, "video.query", errors, MIN_QUERY)
    for field in ("query", "title"):
        val = video.get(field)
        if isinstance(val, str) and URL_ISH.search(val):
            errors.append(
                f"{where}: video.{field} looks like a URL. Store a search query and a "
                "video id, never a link -- see the whitelist rule in the README."
            )

    if not isinstance(video.get("approved"), bool):
        errors.append(f"{where}: video.approved must be present and boolean")

    vid = video.get("video_id")
    if vid is None:
        if video.get("approved"):
            errors.append(f"{where}: video is approved but carries no video_id")
    elif not isinstance(vid, str) or not VIDEO_ID.match(vid):
        errors.append(f"{where}: video.video_id must be null or an 11-character YouTube id")
    elif not video.get("approved"):
        errors.append(
            f"{where}: video_id is set but not approved. A video id may only be written "
            "once a human has watched and approved it."
        )


def validate(records, chapters, templates) -> list[str]:
    errors: list[str] = []
    seen: dict[tuple[str, str], str] = {}

    for rec in records:
        bucket, chapter = rec["bucket"], rec["chapter"]
        where = f"{rec['_file']} [{bucket} :: {chapter}]"

        key = (bucket, chapter)
        if key in seen:
            errors.append(f"{where}: already authored in {seen[key]}")
            continue
        seen[key] = rec["_file"]

        if bucket not in chapters:
            errors.append(f"{where}: no such bucket in chapters.json")
            continue
        if chapter not in chapters[bucket]:
            errors.append(f"{where}: not a chapter of this bucket -- check the spelling against chapters.json")
            continue

        for name in rec:
            if name not in {"bucket", "chapter", "trick", "video", "interactive", "approved", "_file"}:
                errors.append(f"{where}: unexpected key {name!r}")

        if not isinstance(rec.get("approved"), bool):
            errors.append(f"{where}: 'approved' must be present and boolean")

        _str(rec.get("trick"), where, "trick", errors, MIN_TRICK)
        check_video(rec.get("video"), where, errors)

        inter = rec.get("interactive")
        if not isinstance(inter, dict):
            errors.append(f"{where}: 'interactive' must be an object")
            continue
        for name in inter:
            if name not in {"template", "data"}:
                errors.append(f"{where}: interactive has unexpected key {name!r}")
        tmpl = inter.get("template")
        if tmpl not in templates:
            errors.append(f"{where}: unknown template {tmpl!r}; must be one of {', '.join(sorted(templates))}")
            continue
        data = inter.get("data")
        if not isinstance(data, dict):
            errors.append(f"{where}: interactive.data must be an object")
            continue
        CHECKERS[tmpl](data, f"{where} {tmpl}", errors)

    return errors


def build(records, chapters) -> list[dict]:
    ordered = sorted(records, key=lambda r: (list(chapters).index(r["bucket"]),
                                             chapters[r["bucket"]].index(r["chapter"])))
    return [{k: v for k, v in r.items() if not k.startswith("_")} for r in ordered]


def report_status(records, chapters, templates) -> None:
    done = {(r["bucket"], r["chapter"]) for r in records}
    approved = {(r["bucket"], r["chapter"]) for r in records if r.get("approved")}
    total = written = ok = 0
    for bucket, names in chapters.items():
        d = [n for n in names if (bucket, n) in done]
        a = [n for n in names if (bucket, n) in approved]
        total += len(names)
        written += len(d)
        ok += len(a)
        if d:
            print(f"  {bucket:44s} {len(d):3d}/{len(names):3d} written, {len(a):3d} approved")
    print(f"\n  {'TOTAL':44s} {written:3d}/{total:3d} written, {ok:3d} approved")

    used: dict[str, int] = {}
    for r in records:
        t = r.get("interactive", {}).get("template")
        if t:
            used[t] = used.get(t, 0) + 1
    if used:
        print("\n  templates in use:")
        for t in sorted(templates):
            print(f"    {t:18s} {used.get(t, 0):3d}")

    pending = [r for r in records if not r.get("video", {}).get("approved")]
    if pending:
        print(f"\n  {len(pending)} chapters await a video: search, watch, then store the id.")


def main() -> int:
    args = set(sys.argv[1:])
    chapters = load_chapters()
    templates = load_templates()
    records, errors = load_batches()
    errors += validate(records, chapters, templates)

    if errors:
        print(f"{len(errors)} problem(s) -- nothing written:\n")
        for err in errors:
            print(f"  {err}")
        return 1

    if "--status" in args:
        print(f"{len(records)} chapter assets, all valid.\n")
        report_status(records, chapters, templates)
        return 0

    print(f"{len(records)} chapter assets, all valid.")
    if "--check" in args:
        return 0

    OUT.write_text(
        json.dumps(build(records, chapters), ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

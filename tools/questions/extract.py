"""
SET 2026 offline paper extractor — Phase 0.

Turns the eight "Combined" question-paper PDFs plus SET_2026-27_Answer_Keys.xlsx
into one canonical questions.json, and reconciles the two against each other.

Why this is not a ten-line regex script: the PDFs were assembled from several
teachers' Word files, so a single paper mixes marker styles freely --

    1. stem        (1) stem
    A) opt   A. opt   (A) opt   (a) opt   a) opt   a. opt

...and a bare "(a)" can just as easily be part of a sentence. So no marker is
ever trusted on its own. A line only starts question 24 if 23 has been closed,
and only opens option (c) if (b) is already open. That sequential expectation is
what makes the parse deterministic instead of a pile of special cases.

The answer key is the validator, not an afterthought: every question must join to
exactly one key row and every key row to exactly one question. Anything that does
not is written to review.json rather than silently dropped.

Run:  python tools/questions/extract.py
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF
import openpyxl

SRC = Path(r"C:\Users\GADZET ZONE\Desktop\Offline question papers")
OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "questions"

# Which paper file covers which (class, stream). Arts carries seven optional
# subjects; a student sits English & G.K. plus any three of them.
PAPERS = [
    ("IX", "All", "KIDS SET Class IX Eng Medium Combined.pdf"),
    ("X", "All", "KIDS SET Class X Eng Medium Combined.pdf"),
    ("XI", "Science", "KIDS SET Class XI Science Eng Medium Combined 2.pdf"),
    ("XI", "Commerce", "KIDS SET Class XI Commerce Eng Medium Combined.pdf"),
    ("XI", "Arts", "KIDS SET Class XI Arts Eng Medium Combined.pdf"),
    ("XII", "Science", "KIDS SET Class XII Science Eng Medium Combined.pdf"),
    ("XII", "Commerce", "KIDS SET Class XII Commerce Eng Medium Combined 2.pdf"),
    ("XII", "Arts", "KIDS SET Class XII Arts Eng Medium Combined.pdf"),
]

# Section headings as they appear in the papers -> the key's subject name.
# The papers shout them ("ACCOUNTANCY"), abbreviate them ("Political Sc.") and
# occasionally spell them out; the key is the canonical spelling.
SUBJECT_ALIASES = {
    "english & general knowledge": "English & General Knowledge",
    "english and general knowledge": "English & General Knowledge",
    "english & g.k.": "English & General Knowledge",
    "english & gk": "English & General Knowledge",
    "physics": "Physics",
    "chemistry": "Chemistry",
    "biology": "Biology",
    "mathematics": "Mathematics",
    "maths": "Mathematics",
    "accountancy": "Accountancy",
    "business studies": "Business Studies",
    "cost & taxation": "Cost & Taxation",
    "cost and taxation": "Cost & Taxation",
    "economics": "Economics",
    "history": "History",
    "geography": "Geography",
    "political science": "Political Science",
    "political sc.": "Political Science",
    "political sc": "Political Science",
    "education": "Education",
    # The papers head this section "ENVIRONMENTAL SCIENCE", the key workbook
    # calls it "Environmental Studies". Umar's ruling: go with the paper, since
    # that is the name the students actually sat under.
    "environmental science": "Environmental Science",
    "environmental studies": "Environmental Science",
    "env. studies": "Environmental Science",
    "env studies": "Environmental Science",
    "evs": "Environmental Science",
    "philosophy": "Philosophy",
}

# IX and X are one undivided 100-question paper.
SINGLE_PAPER_SUBJECT = "General Paper"

# ...but it is only undivided in its numbering. Both papers run the same seven
# blocks in the same order, with no printed headings to mark them -- the subject
# changes mid-run and you only see it in the content. Derived by reading all 200
# stems and confirming each boundary (IX 85 is a dibasic acid, 86 is Euclid;
# X 85 is thermal conductivity, 86 is odd integers).
#
# This is also the mapping the OMR evaluator needs for its `sections`, so that a
# marksheet can say "Life Science 11/15" instead of one flat score out of 100.
GENERAL_PAPER_SECTIONS = [
    (1, 15, "English"),
    (16, 25, "General Knowledge"),
    (26, 40, "History"),
    (41, 55, "Geography"),
    (56, 70, "Life Science"),
    (71, 85, "Physical Science"),
    (86, 100, "Mathematics"),
]


def section_for(cls: str, subject: str, q_no: int) -> str:
    """The real subject of a question, as a student would name it.

    For XI/XII that is just the printed section heading. For IX/X the paper says
    only "General Paper", so the block ranges above supply it.
    """
    if subject != SINGLE_PAPER_SUBJECT:
        return subject
    for lo, hi, name in GENERAL_PAPER_SECTIONS:
        if lo <= q_no <= hi:
            return name
    raise ValueError(f"{cls} q{q_no} falls outside every General Paper section")

Q_MARKER = re.compile(r"^\(?(\d{1,3})\s*[\.\)]\s*(.*)$", re.DOTALL)
# Nearly every question offers four options. Exactly one in the 2026 papers --
# XII Arts Education 15 -- offers a fifth, "(E) All of the Above", and the key
# answers it "E". So the count is a range, not a constant.
OPT_LETTERS = "abcde"
MIN_OPTIONS = 4


def marker_at(line: str, letter: str, start: int = 0, midline: bool = False) -> re.Match | None:
    """Find the option marker for `letter` -- "(a)", "a)" or "a." -- from `start`.

    The lookbehind is what keeps this safe on the maths paper: in "n(A) = 115"
    the "(A)" is preceded by a letter, so it is not mistaken for option A.

    `midline` drops the bare "a." form, which is only safe at the start of a
    line. Mid-line it collides with initials -- "(B) C.A./M.A. × 100" would
    otherwise be torn in half at the "C." of Chronological Age.
    """
    forms = [r"\(\s*%s\s*\)" % letter, r"%s\s*\)" % letter]
    if not midline:
        forms.append(r"%s\s*\." % letter)
    pat = re.compile("|".join(r"(?<![A-Za-z0-9])" + f for f in forms), re.I)
    return pat.search(line, start)


def split_inline_options(line: str, next_opt: int) -> list[str]:
    """Split a line that packs several options onto one row.

    Half of the IX/X paper and all of maths lay options out as
        (a) England    (b) Turkey    (c) Russia (d) France
    sometimes two per row, sometimes four, sometimes with the bracket missing
    ("c)   France") or the space missing ("(a)Egypt"). Markers are only accepted
    in ascending order starting from the one actually due, and the first must
    open the line -- otherwise a stem mentioning "(b)" would be torn apart.
    """
    first = marker_at(line, OPT_LETTERS[next_opt])
    if not first:
        return []
    # Stacked fractions put their numerator in a frame of its own, which sorts
    # ahead of the marker ("1 (b) x²" for b = x^1/2). Tolerate a short prefix
    # with no letters in it; anything longer is prose, not a stray glyph.
    prefix = line[:first.start()].strip()
    if prefix and (len(prefix) > 4 or re.search(r"[A-Za-z]", prefix)):
        return []

    cuts: list[tuple[int, int]] = [(first.start(), first.end())]
    i = next_opt + 1
    pos = first.end()
    while i < len(OPT_LETTERS):
        m = marker_at(line, OPT_LETTERS[i], pos, midline=True)
        if not m:
            break
        cuts.append((m.start(), m.end()))
        pos = m.end()
        i += 1

    segs = []
    for n, (_s, e) in enumerate(cuts):
        end = cuts[n + 1][0] if n + 1 < len(cuts) else len(line)
        segs.append(line[e:end].strip())
    if prefix:
        segs[0] = f"{prefix} {segs[0]}".strip()
    return segs


def clean(s: str) -> str:
    """Normalise a line of PDF text without destroying real content.

    The papers carry cp1252 smart quotes that came through as U+FFFD, non-break
    spaces inside numbers, and soft hyphens. Science papers carry genuine Greek
    and math symbols (beta, degree, division sign) which must survive untouched,
    so this deliberately does not strip to ASCII.
    """
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("\u00a0", " ").replace("\u00ad", "")
    s = s.replace("\ufffd", "'")  # lost smart quote/apostrophe
    s = re.sub(r"[\u2018\u2019]", "'", s)
    s = re.sub(r"[\u201c\u201d]", '"', s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def page_lines(page: fitz.Page) -> list[str]:
    """Assemble visual lines, honouring column order.

    Plain get_text() interleaves the two-column option tables that the Arts
    papers use for match-the-column questions. Reading spans by (y, x) keeps
    "(i) Malla--- (a) Hastinapur" on one line instead of splitting it into two
    fragments that land in different questions.
    """
    d = page.get_text("dict")
    rows: list[tuple[float, float, str]] = []
    for block in d["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            text = "".join(sp["text"] for sp in line["spans"])
            if not text.strip():
                continue
            x0, y0 = line["bbox"][0], line["bbox"][1]
            rows.append((y0, x0, text))
    rows.sort(key=lambda r: (round(r[0], 1), r[1]))

    merged: list[str] = []
    last_y: float | None = None
    for y, _x, text in rows:
        if last_y is not None and abs(y - last_y) < 3.0:
            merged[-1] += " " + text
        else:
            merged.append(text)
        last_y = y
    return [x for x in (repair_trailing_number(clean(m)) for m in merged) if x]


# A stem whose Word list-number ended up in its own frame, sorting to the end of
# the row: "Name the autobiography of Hitler. 40." Guarded so a genuine option
# ending in a year ("(d) 1926.") is never rotated -- it carries an option marker.
TRAILING_NUM = re.compile(r"^(?P<body>.*[\.\?\:])\s+(?P<num>\d{1,3})[\.\)]$")


def repair_trailing_number(line: str) -> str:
    m = TRAILING_NUM.match(line)
    if not m:
        return line
    body = m.group("body")
    if any(marker_at(body, c) for c in OPT_LETTERS) or Q_MARKER.match(body):
        return line
    return f"{m.group('num')}. {body}"


@dataclass
class Q:
    cls: str
    stream: str
    subject: str
    q_no: int
    stem: str
    options: list[str] = field(default_factory=list)
    context: str | None = None
    page: int = 0

    def key(self) -> tuple:
        return (self.cls, self.stream, self.subject, self.q_no)


def norm(s: str) -> str:
    """Comparison key: case, punctuation and filler words removed."""
    s = re.sub(r"^(the poem|the story|in the poem|in the story)\s+", "", s.strip(), flags=re.I)
    return re.sub(r"[^a-z0-9]", "", s.lower())


def looks_like_heading(line: str) -> str | None:
    """Return the canonical subject if this line is a section heading."""
    s = line.strip().rstrip(":").strip()
    s = re.sub(r"^(subject|section|part)\s*[-:]\s*", "", s, flags=re.I)
    if len(s) > 40:
        return None
    return SUBJECT_ALIASES.get(s.lower())


def is_boilerplate(line: str) -> bool:
    low = line.lower()
    return (
        "kabitirtha" in low
        or "students evaluation test" in low
        or low.startswith("class")
        or "maximum marks" in low
        or "encircle" in low
        or "to modify the answer" in low
        or low.startswith("answer blank")
        or set(line) <= set("-x ")
    )


def parse_paper(cls: str, stream: str, path: Path, expected: dict) -> tuple[list[Q], list[dict]]:
    """Parse one PDF into questions, using `expected` (from the key) as the guide.

    `expected` maps subject -> count of questions the key says exist. For IX/X
    there is a single subject and numbering runs 1..100; for XI/XII each subject
    restarts at 1 and runs to 25.
    """
    doc = fitz.open(path)
    single = SINGLE_PAPER_SUBJECT in expected

    subject = SINGLE_PAPER_SUBJECT if single else None
    questions: list[Q] = []
    problems: list[dict] = []
    cur: Q | None = None
    next_q = 1
    next_opt = 0  # index into OPT_LETTERS
    pending_context: list[str] = []
    recovered_opts: list[str] = []

    def close():
        nonlocal cur, next_opt
        if cur is not None:
            questions.append(cur)
        cur = None
        next_opt = 0

    for pno in range(len(doc)):
        for raw in page_lines(doc[pno]):
            if is_boilerplate(raw):
                continue

            head = looks_like_heading(raw)
            if head and not single and head in expected:
                close()
                subject = head
                next_q = 1
                pending_context = []
                recovered_opts = []
                continue

            # Options -- one per line, or several packed onto this one. Only
            # accepted starting from the letter actually due.
            if cur is not None and next_opt < len(OPT_LETTERS):
                segs = split_inline_options(raw, next_opt)
                if segs:
                    for s in segs:
                        cur.options.append(s)
                        next_opt += 1
                    continue

            # A question, but only if it is the very next number due and we are
            # not mid-way through collecting options.
            m = Q_MARKER.match(raw)

            # A question number can be pushed off the front of the line by stray
            # notation that sorts ahead of it -- the IX maths section yields
            # "4 3 89. The value of ..." where "4 3" are radical indices in their
            # own frames. Accept the number if it is the one due and the junk in
            # front of it is short and carries no letters.
            if m is None:
                look = re.search(r"(?<!\d)(%d)\s*[\.\)]\s*" % next_q, raw[:14])
                if look and not re.search(r"[A-Za-z]", raw[:look.start()]):
                    raw = raw[look.end():] + (" " + raw[:look.start()].strip()).rstrip()
                    m = Q_MARKER.match(f"{next_q}. {raw}")

            # XI Commerce Economics opens with an unnumbered question 1: the
            # heading is followed straight by the stem. When the number due is
            # still 1 and the number that actually arrives is 2, the text held
            # back as "context" is that missing question -- adopt it rather than
            # lose the whole section to a numbering cascade.
            if (m and cur is None and next_q == 1 and int(m.group(1)) == 2
                    and pending_context and subject is not None):
                questions.append(Q(cls, stream, subject, 1, " ".join(pending_context),
                                   options=list(recovered_opts), page=pno + 1))
                problems.append({"file": path.name, "page": pno + 1, "subject": subject,
                                 "issue": "question 1 had no number in the paper; recovered",
                                 "line": " ".join(pending_context)[:90]})
                pending_context = []
                recovered_opts = []
                next_q = 2

            if m and int(m.group(1)) == next_q and (cur is None or next_opt == 0 or next_opt >= MIN_OPTIONS):
                close()
                if subject is None:
                    problems.append({"file": path.name, "page": pno + 1,
                                     "issue": "question before any subject heading", "line": raw})
                    continue
                cur = Q(cls, stream, subject, next_q, m.group(2).strip(), page=pno + 1,
                        context=" ".join(pending_context) or None)
                pending_context = []
                next_q += 1
                continue

            # Continuation of whatever is open: a wrapped option, a wrapped stem,
            # or -- if nothing is open -- a passage that later questions hang off.
            if cur is not None and next_opt >= MIN_OPTIONS:
                # All four options are in, but maths wraps a trailing glyph onto
                # the next row ("(d) tan β + tan" / "γ."). Take a short tail as
                # part of option D; anything longer is the next passage, so the
                # question is done.
                if len(raw) <= 30:
                    cur.options[-1] += " " + raw
                else:
                    close()
                    pending_context.append(raw)
            elif cur is not None and next_opt > 0:
                cur.options[-1] += " " + raw
            elif cur is not None:
                cur.stem += " " + raw
            elif pending_context and len(recovered_opts) < MIN_OPTIONS and \
                    split_inline_options(raw, len(recovered_opts)):
                # Options belonging to a question whose number never printed.
                recovered_opts.extend(split_inline_options(raw, len(recovered_opts)))
            else:
                pending_context.append(raw)

    close()
    return questions, problems


def apply_overrides(rows: list[dict], problems: list[dict]) -> None:
    """Apply rulings that correct the answer-key workbook.

    The workbook stays the authority and is never edited; every deviation from it
    lives in key-overrides.json with a reason and who ruled, so the marks a child
    is given can always be traced back to a decision.

    Two actions:
      correct -- the key names the wrong option; use this one instead.
      grace   -- the correct answer is not on the paper at all, so no candidate
                 could have picked it. `answer` becomes null and every candidate
                 is awarded the mark, whatever they wrote (including a blank).

    A stale override -- one naming a question that no longer exists, or one that
    would change nothing -- is an error, not a no-op. Silently ignoring it is how
    a correction gets quietly lost between runs.
    """
    path = Path(__file__).with_name("key-overrides.json")
    if not path.exists():
        return
    overrides = json.loads(path.read_text(encoding="utf-8"))
    by_id = {r["id"]: r for r in rows}

    for ov in overrides:
        row = by_id.get(ov["id"])
        if row is None:
            problems.append({"q": ov["id"].split("|"),
                             "issue": "override names a question that does not exist",
                             "line": ov.get("reason", "")[:90]})
            continue

        was = "ABCDE"[row["answer"]] if row["answer"] is not None else None
        if ov.get("was") and ov["was"] != was:
            problems.append({"q": ov["id"].split("|"),
                             "issue": f"override expected the key to say {ov['was']!r}, "
                                      f"but it says {was!r} — the workbook changed",
                             "line": ov.get("reason", "")[:90]})
            continue

        if ov["action"] == "grace":
            row["answer"] = None
            row["grace"] = {"reason": ov["reason"], "ruled_by": ov["ruled_by"],
                            "ruled_on": ov["ruled_on"]}
        elif ov["action"] == "correct":
            row["answer"] = "ABCDE".index(ov["to"])
            row["key_corrected"] = {"from": was, "reason": ov["reason"],
                                    "ruled_by": ov["ruled_by"], "ruled_on": ov["ruled_on"]}
        else:
            problems.append({"q": ov["id"].split("|"),
                             "issue": f"unknown override action {ov['action']!r}"})


def apply_text_overrides(rows: list[dict], problems: list[dict]) -> None:
    """Restore question text that the parser could not recover from the PDF.

    Some questions cannot be parsed correctly no matter how careful the splitter
    is -- match-the-column options whose "(i-d)" reads as an option marker, and
    stacked radicals that the PDF never encoded as such. The only fix is for a
    human to read the printed paper and type the text in.

    Hand-editing questions.json does not survive the next run of this script, so
    retyped text lives in text-overrides.json instead, with who typed it and
    from what. Applying one clears the question's needs_review flag: that flag
    exists precisely to say "the options on screen are not the options the child
    sat", and once they are, it no longer applies.

    A stale override -- naming a question that does not exist, or one whose text
    already matches -- is an error, exactly as for the key overrides.
    """
    path = Path(__file__).with_name("text-overrides.json")
    if not path.exists():
        return
    overrides = json.loads(path.read_text(encoding="utf-8"))
    by_id = {r["id"]: r for r in rows}

    for ov in overrides:
        row = by_id.get(ov["id"])
        if row is None:
            problems.append({"q": ov["id"].split("|"),
                             "issue": "text override names a question that does not exist",
                             "line": ov.get("note", "")[:90]})
            continue

        opts = ov.get("options")
        if opts is not None:
            if not isinstance(opts, list) or not 2 <= len(opts) <= 5 \
                    or not all(isinstance(o, str) and o.strip() for o in opts):
                problems.append({"q": ov["id"].split("|"),
                                 "issue": "text override options must be 2 to 5 non-empty strings"})
                continue
            # The key is an index into these options, so a retype that drops one
            # would silently point the answer at the wrong line.
            if row["answer"] is not None and row["answer"] >= len(opts):
                problems.append({"q": ov["id"].split("|"),
                                 "issue": f"text override leaves only {len(opts)} options but the "
                                          f"key points at option {'ABCDE'[row['answer']]}"})
                continue
            if opts == row["options"]:
                problems.append({"q": ov["id"].split("|"),
                                 "issue": "text override changes nothing; the parser already "
                                          "reads these options correctly"})
                continue
            row["options"] = opts

        stem = ov.get("stem")
        if stem:
            row["stem"] = stem

        row["text_retyped"] = {"typed_by": ov["typed_by"], "typed_on": ov["typed_on"],
                               "source": ov["source"]}
        # The options on screen are now the options the child sat.
        row.pop("needs_review", None)


def load_key() -> tuple[dict, list[str]]:
    wb = openpyxl.load_workbook(SRC / "SET_2026-27_Answer_Keys.xlsx")
    ws = wb["Master Key"]
    key: dict[tuple, str] = {}
    dupes: list[str] = []
    for row in ws.iter_rows(min_row=5, values_only=True):
        cls, stream, subject, q_no, ans = row[:5]
        if cls is None or q_no is None:
            continue
        stream = "All" if str(stream).strip() in ("All", "All Streams") else str(stream).strip()
        # Run the workbook's subject through the same alias table as the papers,
        # so "Environmental Studies" here and "ENVIRONMENTAL SCIENCE" there meet
        # on one canonical name and the join holds.
        subject = str(subject).strip()
        subject = SUBJECT_ALIASES.get(subject.lower(), subject)
        k = (str(cls).strip(), stream, subject, int(q_no))
        if k in key:
            dupes.append(f"duplicate key row {k}")
        key[k] = str(ans).strip().upper()
    return key, dupes


def main() -> int:
    key, problems_key = load_key()

    # English & G.K. is one shared paper sat by all three streams, so the key
    # files it under "All". Each stream's PDF reprints it; we parse it once.
    expected_by_paper: dict[tuple[str, str], dict[str, int]] = defaultdict(dict)
    for (cls, stream, subject, _q), _a in key.items():
        for c, s, _f in PAPERS:
            if c != cls:
                continue
            if stream in ("All", s):
                expected_by_paper[(c, s)][subject] = expected_by_paper[(c, s)].get(subject, 0) + 1

    all_q: list[Q] = []
    problems: list[dict] = [{"issue": p} for p in problems_key]
    seen: dict[tuple, Q] = {}

    for cls, stream, fname in PAPERS:
        path = SRC / fname
        exp = expected_by_paper[(cls, stream)]
        qs, probs = parse_paper(cls, stream, path, exp)
        problems.extend(probs)

        for q in qs:
            # English & G.K. lives under stream "All" in the key.
            if q.subject == "English & General Knowledge":
                q.stream = "All"
            k = q.key()
            if k in seen:
                # English & G.K. is reprinted in all three stream papers. They
                # differ only cosmetically (a trailing colon, a "The poem"
                # prefix), so compare on normalised text -- and only shout if
                # the substance actually diverges, which would mean one stream
                # sat a different paper from the key.
                prev = seen[k]
                if (norm(prev.stem) != norm(q.stem)
                        or [norm(o) for o in prev.options] != [norm(o) for o in q.options]):
                    problems.append({"file": fname, "page": q.page, "q": list(k),
                                     "issue": "same key, different text in two papers",
                                     "line": f"{prev.stem[:60]!r} vs {q.stem[:60]!r}"})
                continue
            seen[k] = q
            all_q.append(q)

        got = Counter(q.subject for q in qs)
        for subject, n in sorted(exp.items()):
            if got.get(subject, 0) != n:
                problems.append({"file": fname, "subject": subject,
                                 "issue": f"expected {n} questions, parsed {got.get(subject, 0)}"})

    # Join to the key, both directions.
    rows = []
    for q in sorted(all_q, key=lambda q: (q.cls, q.stream, q.subject, q.q_no)):
        k = q.key()
        ans = key.get(k)
        bad = []
        if ans is None:
            bad.append("no key row")
        if not MIN_OPTIONS <= len(q.options) <= len(OPT_LETTERS):
            bad.append(f"{len(q.options)} options")
        if not q.stem:
            bad.append("empty stem")
        if ans and ans not in "ABCDE"[:len(q.options)]:
            bad.append(f"key answer {ans!r} not among this question's options")
        if bad:
            problems.append({"q": list(k), "page": q.page, "issue": "; ".join(bad),
                             "line": q.stem[:90]})
            continue
        rows.append({
            "id": f"{q.cls}|{q.stream}|{q.subject}|{q.q_no}",
            "class": q.cls, "stream": q.stream, "subject": q.subject,
            "section": section_for(q.cls, q.subject, q.q_no), "q_no": q.q_no,
            "context": q.context, "stem": q.stem, "options": q.options,
            "answer": "ABCDE".index(ans), "source_page": q.page,
        })

    apply_overrides(rows, problems)

    # Content quality: things that parsed cleanly but are wrong on the paper
    # itself. These do not block anything -- they are for Umar to rule on.
    for r in rows:
        # Light normalisation only. norm() strips symbols, which would call
        # "(b²-a²)/b" and "√b²−a²/b" the same option -- and would flatten
        # alpha/beta/gamma particles into three identical "rays".
        opts = [re.sub(r"\s+", " ", o.strip().lower()) for o in r["options"]]
        if len(set(opts)) < len(opts):
            dupes_at = [i for i, o in enumerate(opts) if opts.count(o) > 1]
            problems.append({
                "q": r["id"].split("|"), "page": r["source_page"],
                "issue": "paper prints the same option twice ("
                         + "/".join("ABCDE"[i] for i in dupes_at) + ")",
                "line": r["stem"][:90]})
        if any(not o.strip() for o in r["options"]):
            problems.append({"q": r["id"].split("|"), "page": r["source_page"],
                             "issue": "blank option text", "line": r["stem"][:90]})

        # Match-the-column answers ("(i-d), (ii-c), (iii-a), (iv-b)") defeat the
        # splitter: the "d)" inside (i-d) reads as an option marker, so the four
        # choices get shredded. The stems and the key are right, only the option
        # text is unusable -- these need typing in by hand.
        if any(re.match(r"^[,\.\)]", o.strip()) or re.search(r"\(\s*[ivx]+\s*-", o)
               or re.search(r"\(\s*[a-d]\s*\)", o) for o in r["options"]):
            problems.append({"q": r["id"].split("|"), "page": r["source_page"],
                             "issue": "match-the-column options shredded; retype by hand",
                             "line": r["stem"][:90]})
            # Carried in the data too, so nothing downstream can render these
            # broken options to a student before someone has retyped them.
            r["needs_review"] = "options unreliable — retype from the paper"

    # Runs after the shredded-option check above, because a retyped question is
    # exactly one that should no longer carry needs_review.
    apply_text_overrides(rows, problems)

    parsed_keys = {tuple(r["id"].split("|")[:3]) + (int(r["id"].split("|")[3]),) for r in rows}
    for k in sorted(key):
        if k not in parsed_keys:
            problems.append({"q": list(k), "issue": "key row has no parsed question"})

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "questions.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "review.json").write_text(
        json.dumps(problems, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"key rows        : {len(key)}")
    print(f"questions clean : {len(rows)}")
    print(f"needs review    : {len(problems)}")
    by = Counter(p["issue"].split(";")[0][:52] for p in problems)
    for issue, n in by.most_common(20):
        print(f"   {n:4d}  {issue}")
    print(f"\nwrote {OUT / 'questions.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

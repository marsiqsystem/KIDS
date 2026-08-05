# Offline paper extraction (Phase 0)

Turns the eight SET 2026 offline question papers and the answer-key workbook into
one canonical dataset that both the OMR scorer and the learning content build on.

```
python tools/questions/extract.py        # papers + key  -> questions.json
python tools/questions/check_chapters.py # every section has a chapter list
python tools/questions/tag.py            # tags.json     -> question-chapters.json
python tools/questions/chapters_page.py out.html   # the reviewable chapter map
python tools/questions/build_explanations.py --status   # Phase 2 coverage
```

Reads from `Desktop\Offline question papers\` (PDFs stay outside the repo).
Writes two files into `src/data/questions/`:

| file | what it is |
| --- | --- |
| `questions.json` | 1000 questions — stem, options, correct answer, source page |
| `review.json` | every exception, so nothing is silently dropped |
| `question-chapters.json` | one chapter per question (written by `tag.py`) |

## Record shape

```json
{
  "id": "XII|Science|Physics|7",
  "class": "XII", "stream": "Science", "subject": "Physics", "q_no": 7,
  "context": null,
  "stem": "The root mean square (rms) value of ...",
  "options": ["...", "...", "...", "..."],
  "answer": 1,
  "source_page": 4
}
```

`answer` is a 0-based index into `options`. Almost every question has four
options; `XII|Arts|Education|15` has five ("(E) All of the Above"), so never
assume a length of four downstream. `id` is stable and is the join key for
everything downstream (concept tags, explanations, per-question stats).

A record may also carry `needs_review` — see "Known gaps" below. Anything with
that field must not be rendered to a student until someone has retyped it.

**`answer` can be `null`.** That means the question was graced: see below. Any
scoring or marksheet code must handle it explicitly rather than indexing blind.

## Key overrides and grace marks

The answer-key workbook is the authority and is **never edited**. Every deviation
from it lives in `key-overrides.json`, with a reason and who ruled it, so the mark
a child is given can always be traced back to a decision:

```json
{ "id": "XII|Arts|Education|13", "action": "grace", "was": "B",
  "reason": "...", "ruled_by": "Umar Iqbal", "ruled_on": "2026-08-05" }
```

- `correct` — the key names the wrong option; `to` gives the right one. The record
  gains `key_corrected`.
- `grace` — the correct answer is not on the paper at all, so no candidate could
  have picked it. `answer` becomes `null` and the record gains `grace`.
  **Scoring must award the mark to every candidate, whatever they wrote, including
  a blank.** The response-analysis grid must not draw a "correct answer" for these;
  say the question was graced and why.

A stale override — naming a question that no longer exists, or whose `was` no
longer matches the workbook — is reported as an error, not silently ignored. That
is what stops a correction getting quietly lost when the workbook is reissued.

Currently one override is in force: `XII|Arts|Education|13`.

## Coverage

1000 key rows, 1000 questions extracted and reconciled — complete. Every section
matches the count the key expects:

- IX and X — 100 questions each, one undivided paper
- XI and XII — English & G.K. (25, common to all three streams) plus 25 per
  subject: 4 Science, 4 Commerce, 7 Arts

Note `stream` is `All` for English & G.K., because that paper is shared. Arts
students sit English plus any three of the seven Arts subjects.

## Why the parser looks the way it does

The PDFs are "Combined" files assembled from several teachers' Word documents, so
one paper mixes marker styles freely — `1.` and `(1)`, `A)` and `A.` and `(A)` and
`(a)` and `a)`. A bare `(a)` is also just ordinary prose punctuation.

So no marker is ever trusted on its own. A line only opens question 24 if 23 has
been closed, and only opens option (c) if (b) is already open. That sequential
expectation is what makes the parse deterministic. Everything else in the file is
a narrow, commented repair for one real defect in the source PDFs:

- options packed several to a row (`(a) England (b) Turkey (c) Russia (d) France`)
- Word list numbers in their own text frame, sorting to the end of the row
  (`Name the autobiography of Hitler. 40.`)
- stacked fractions and radical indices sorting ahead of the marker (`4 3 89.`)
- a mid-line `C.` in "C.A./M.A." that is an initial, not option C
- maths wrapping a trailing glyph onto the next row (`(d) tan β + tan` / `γ.`)
- XI Commerce Economics, whose question 1 has no number printed at all

The answer key is the validator, not an afterthought: every question must join to
exactly one key row and every key row to exactly one question.

## Known gaps — need a human

Four match-the-column questions have unusable **option text**. Their answers like
`(i-d), (ii-c), (iii-a), (iv-b)` contain `d)` and `(a)`, which the splitter reads
as option markers and shreds. Stems and answers are correct; only the four choices
need retyping from the paper:

- `XI|Arts|History|5`, `XI|Arts|History|14`, `XI|Arts|History|24`
- `XII|Arts|History|24`

These carry `needs_review` in `questions.json`.

## Phase 1 — the chapter map

`chapters.json` holds the chapter vocabulary (approved 5 Aug 2026); `tags.json`
says which questions belong to each chapter, written as chapter -> question
numbers because that reads far better than a thousand separate lines. `tag.py`
expands the two into `question-chapters.json` and **refuses to write anything**
unless the mapping is airtight:

* every question tagged exactly once — none missed, none tagged twice;
* every chapter name used exists in `chapters.json` for that same bucket, so a
  typo is an error rather than a silent new one-question chapter;
* every chapter catches at least one question — an empty chapter means the
  vocabulary is wrong, not that the paper skipped a topic;
* no tag names a question number the paper does not have.

**1,000 questions across 323 distinct chapters.** The bucket a chapter list is
written for is `class|stream|section` — stream is in the key because XI/XII Arts
and Commerce Economics are genuinely different papers.

Nine chapters were renamed, dropped or added during tagging, each because the
questions said so: IX has no French Revolution question (the block opens at
Vienna), the GK sections range wider than "Solar System", Class X needs
Pythagoras for a rhombus question, and XII Commerce Economics asks about the
central problem and about demand. Those edits are in the git history of
`chapters.json`.

57 chapters hold a single question. That is expected on a 25-question paper
sampling a whole year's syllabus, but they are the first place to look if the
vocabulary ever needs tightening.

## Phase 2 — per-question explanations

Every question gets a short piece of teaching: why the right answer is right,
and **why each distractor is wrong**. The distractor lines are the part that
teaches, so each one names the thing the student was probably thinking of —
Vande Mataram against Jana Gana Mana, national bird against national animal,
the complement of an angle against the angle — rather than just saying no.

Explanations are **authored by hand into batch files** under
`explanations/`, one file per class and section, and merged by
`build_explanations.py` into `src/data/questions/explanations.json`. Like
`tag.py`, it writes nothing unless every record is sound:

* every id names a real question, and no question is explained twice;
* `why_wrong` covers **every distractor and only the distractors** — a missing
  one is exactly the option some child chose;
* a graced question has `why_graced` instead of `why_correct`, since no option
  was correct;
* nothing is written for a question carrying `needs_review`, because the
  options on screen would not be the options the child sat;
* `approved` is present and boolean on every record.

**`approved` is false on everything until Umar reads it.** No explanation may
render to a student while it is false. That flag is the whole safety mechanism,
so the front end must filter on it rather than assume.

```json
{ "id": "IX|All|General Paper|24", "approved": false,
  "why_correct": "The Godavari is called Dakshina Ganga ...",
  "why_wrong": { "0": "The Krishna is ...", "1": "The Kaveri is ..." } }
```

Keys of `why_wrong` are option indices as strings, matching `questions.json`.
A record may also carry `cloned_from`, which means the same question appears on
two papers and the explanation was copied — see the IX/X Geography block.

**Status: Class IX and X written, 194 of 200.** The six not written are
defective questions, each documented with a recommendation in
`explanations/HELD-BACK.md`. XI and XII are not started.

Once the OMR scans exist, the review queue should be **ordered by how many
students got each question wrong**, so review time goes to the questions that
hurt most.

## Findings for Umar

1. **`XI|Arts|Education|14` prints the same option twice** — B and D are both
   "C.A./M.A. × 100". The key says C ("M.A./C.A. × 100"), the correct IQ formula,
   so no student was mismarked. Cosmetic, but worth fixing before the question is
   republished as learning content.
2. **Subject naming settled** — the papers head the section "ENVIRONMENTAL
   SCIENCE", the key workbook says "Environmental Studies". Umar's ruling is to
   follow the paper, so **Environmental Science** is canonical here and the
   workbook's name is aliased onto it at load time.
3. **`XII|Arts|Education|13` — settled, graced.** The Delors Commission was formed
   in **1993**, and the paper offers only 1998/1994/1996/1992, so the correct
   answer was never on the page. Umar's ruling (5 Aug 2026): **grace marks — every
   candidate gets the mark.** Implemented via `key-overrides.json`; the workbook's
   "B" is left untouched.
4. **Answer positions are heavily skewed** — across all 1000: A 159, B 405,
   C 347, D 88, E 1. Spot-checking against externally verifiable facts (Jupiter,
   Gandhi, UNESCO, Nylon-6,6, n(A∪B)=373) confirms the key itself is *correct*,
   so this is authoring bias, not misalignment. But it means a student who
   blind-guesses "B" every time scores about 40%. Maths and the Arts subjects
   have a uniform spread; the rest cluster on B/C. Worth fixing at paper-setting
   time next year.
5. Chemistry and physics formulas are typed as plain text in the source
   (`H2O`, `BF3`, `ML2T-3`) — the subscripts were never in the PDF, so they
   cannot be recovered here. Fine for scoring; if the learning pages should show
   `H₂O`, that is a separate formatting pass.

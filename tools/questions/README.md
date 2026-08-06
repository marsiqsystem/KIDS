# Offline paper extraction (Phase 0)

Turns the eight SET 2026 offline question papers and the answer-key workbook into
one canonical dataset that both the OMR scorer and the learning content build on.

```
python tools/questions/extract.py        # papers + key  -> questions.json
python tools/questions/check_chapters.py # every section has a chapter list
python tools/questions/tag.py            # tags.json     -> question-chapters.json
python tools/questions/chapters_page.py out.html   # the reviewable chapter map
python tools/questions/build_explanations.py --status   # Phase 2 coverage
python tools/questions/build_assets.py --status         # Phase 3 coverage
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

## Retyped text — `text-overrides.json`

Some questions cannot be parsed correctly however careful the splitter is.
Match-the-column answers like `(i-d), (ii-c), (iii-a), (iv-b)` contain `d)` and
`(a)`, which read as option markers and shred the four choices; stacked radicals
and fractional exponents were never encoded as such in the PDF at all. The only
repair is for a human to read the printed paper and type the text in.

Hand-editing `questions.json` does not survive the next run of `extract.py`, so
retyped text lives in `text-overrides.json`, alongside `key-overrides.json` and
under the same discipline — provenance on every entry, and a stale or no-op
override is an error rather than something silently skipped:

```json
{ "id": "XI|Arts|History|5",
  "options": ["(i-d), (ii-c), (iii-a), (iv-b)", "..."],
  "typed_by": "Umar Iqbal", "typed_on": "2026-08-07",
  "source": "photograph of the printed paper", "note": "..." }
```

Applying an override **clears `needs_review`** — that flag says "the options on
screen are not the options the child sat", and once they are, it no longer
holds. The builder also refuses a retype that leaves fewer options than the
answer key points at, which is how a dropped line would otherwise aim the key
at the wrong choice.

**Settled 7 Aug 2026:** all four match-the-column questions
(`XI|Arts|History` 5, 14, 24 and `XII|Arts|History|24`) were retyped from
photographs of the paper, and all four keys were worked independently and
found correct. Nothing now carries `needs_review`, and the explanation bank is
1000/1000.

`IX|89` is retyped too. Its stem came out as `√√x2 is: 4 3`, the radical
indices having sorted to the end of the row, and its options as `1 x2` for
x^(1/2). It now reads ⁴√(³√(x²)) with choices x, x^(1/2), x^(1/3), x^(1/6),
and the key (d) is correct: ³√(x²) = x^(2/3), and the fourth root of that is
x^(2/12) = x^(1/6).

**Never call a question defective from the extracted text alone.** `IX|89` was
filed as defective on the strength of the garbled extract and was nothing of
the sort — the printed page is perfectly clear. Look at the paper first.

**Nothing in the dataset carries `needs_review` any longer.** `review.json`
still lists the five parse defects, and should: it is the record of why each
override exists, not a queue.

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

**Status: COMPLETE — 996 of 996 written and approved.** The only questions
without an explanation are the four match-the-column ones carrying
`needs_review`; the builder refuses to explain those, and `--status` leaves
them out of the denominator, so 996 is the whole eligible set.

`HELD-BACK.md` remains as the record of why 29 marks moved and why four
contested keys were allowed to stand. It is history now, not a queue.

**Note on the approval flag.** Umar approved all 996 in one go on 7 Aug 2026
without a per-item review. The flag therefore records *his authorisation to
publish*, not that a subject teacher has read the text. If a teacher ever does
review, the defensible-distractor cases are where to start.

Once the OMR scans exist, the review queue should be **ordered by how many
students got each question wrong**, so review time goes to the questions that
hurt most.

## Phase 3 — per-chapter assets

Explanations teach one question. Assets teach the **chapter**, and there are
342 chapter entries across 46 buckets against 1,000 questions, so this is the
layer where the effort actually pays off. Each chapter gets three things:

- **the trick** — the one hook that makes the chapter stick (four minutes per
  degree of longitude; February removed the Tsar, October brought the
  Bolsheviks; work needs movement, so holding a bag still is no work at all);
- **the video** — see the rule below;
- **the interactive** — a `template` name plus the `data` that fills it.

```
python tools/questions/build_assets.py --status
```

Authored by hand into `assets/`, one file per bucket, merged into
`src/data/questions/chapter-assets.json`.

### Ten templates, no bespoke games

`templates.json` holds the vocabulary: `match-pairs`, `timeline-order`,
`sort-bins`, `odd-one-out`, `fill-blank`, `transform`, `label-diagram`,
`formula-pick`, `step-solve`, `true-false`. A chapter declares one of the ten
and supplies its data; nobody builds a game for a single chapter. Every new
template is a new front-end component to build and maintain, so if a chapter
fits none of the ten, the honest move is usually to simplify the content, not
to add an eleventh.

`build_assets.py` validates each chapter's data **against the shape its
template declares** and writes nothing if anything is off. Beyond the obvious
type checks it refuses a `sort-bins` with a bin nothing goes into, a
`fill-blank` whose gaps do not run 1..n or whose answer is missing from the
word bank, a `true-false` where every statement has the same truth value, a
`formula-pick` listing the correct formula among the wrong ones, a `transform`
whose sentence is unchanged, and a `label-diagram` whose SVG is not
self-contained or whose labels fall outside the viewBox. Diagram SVGs carry no
`xmlns` on purpose — inline SVG does not need one, and leaving it out lets the
URL check stay strict.

### The video rule — the important one

**A model must never emit a YouTube URL.** The flow is: whitelist → API search
→ Umar approves → store the id. So an authored record carries a search *query*
and a null `video_id`:

```json
"video": { "query": "Heron's formula area of triangle class 9 maths",
           "video_id": null, "approved": false }
```

The validator rejects anything URL-shaped in the video block outright, rejects
a `video_id` that is not an 11-character id, and — the part that matters —
**rejects a `video_id` that is not accompanied by `approved: true`.** A video
id may only be written once a human has watched the video. `--status` prints
how many chapters are still waiting on one.

**Status: 35 of 342 written** — all of Class IX, exercising all ten templates.
No video approved yet, so nothing may render a video.

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

# Questions held back from Phase 2 — need Umar's ruling

Six of the 200 Class IX and X questions have no explanation written, because
writing one would mean teaching a child something untrue. Each is listed with
what is wrong and what the options are. Nothing here changes any mark until a
ruling is recorded — the mechanism is `key-overrides.json`, and the offline
IX/X papers are not yet scored, so a ruling is still cheap to apply.

None of this affects the online exam, which was scored and published on
different papers.

---

## 1. `IX|All|General Paper|62` — the question contradicts itself

> Which of the following is **not** a **non-renewable** natural resource?
> (a) Solar energy (b) Wind energy (c) Coal and Petroleum (d) Forest Timber
> **Key: (c)**

The double negative is a typo. Coal and petroleum *are* non-renewable, so as
printed the correct answers are (a), (b) and (d) — three of them. The intended
question was almost certainly "which **is** non-renewable", for which (c) is
right.

**Recommendation: grace.** No child could reason their way to a single answer
from what was printed. A `correct` override cannot fix it, because the defect
is in the stem, not the key.

## 2. `IX|All|General Paper|71` — disputed chemistry

> Which gas gives Ring Test?
> (a) SO2 (b) NO2 (c) H2O (d) NO
> **Key: (b) NO2**

In the brown ring test for nitrates, the ring is the nitrosyl complex
[Fe(H2O)5NO]2+, and the gas that forms it is **nitric oxide, NO** — option (d).
Some Indian school texts do print NO2, so a student taught from those would
have answered as the key expects.

**Needs a subject-teacher ruling.** Either confirm (b) as the taught answer for
this syllabus and leave it alone, or correct to (d), or grace it. This one
changes marks, so it should be settled before the OMR sheets are scored.

## 3. `IX|All|General Paper|77` — all four options are colloids

> ______ is an example of colloid.
> (a) Blood (b) cheese (c) Milk (d) Paint
> **Key: (c) Milk**

Milk is the standard textbook emulsion and is clearly the intended answer. But
blood is a colloid, cheese is a gel, and paint is a sol — every option is a
genuine colloid. There is no way to write "why (a) is wrong" without stating a
falsehood.

**Recommendation: keep the key, do not publish an explanation.** The mark is
defensible; the teaching content is not. Flag for rewriting before this
question is ever reused.

## 4. `IX|All|General Paper|87` — a missing condition

> If a point C lies between two points A and B, then:
> (a) AC=AB (b) AC= ½ AB (c) AB=½AC (d) AC= ⅓ AB
> **Key: (b)**

"Between" does not mean "midway". The NCERT original reads "such that
AC = BC", and that clause is missing from the paper. Without it, (b) does not
follow, and no option is derivable.

**Recommendation: grace**, for the same reason as item 1 — the defect is in the
stem.

## 5. `IX|All|General Paper|89` — option text is unreadable

> The value of √√x2 is: 4 3
> (a) x (b) 1 x2 (c) 1 x3 (d) 1 x6
> **Key: (d)**

The stacked radical indices (4 and 3) sorted to the end of the stem, and the
fractional exponents lost their formatting: "1 x2" is x^(1/2), "1 x6" is
x^(1/6). The mathematics is recoverable — the fourth root of the cube root of
x² is x^(1/6), so the key is **correct** — but no child can read the options as
printed.

**Recommendation: retype the stem and options by hand**, then the explanation
can be written normally. This is the same class of problem as the four
match-the-column History questions already carrying `needs_review`, and it
should probably carry that flag too.

## 6. `X|All|General Paper|31` — key error, contradicted by Q30

> Name the first Bengali daily newspaper.
> (a) Bengal Gazettee (b) Digdarshan (c) Samachar Darpan (d) Sambad Prabhakar
> **Key: (b) Digdarshan**

Digdarshan was the first Bengali **monthly** (1818) — which the very same paper
states in question 30, where it is called "the first monthly periodical".
Samachar Darpan (1818) was the first Bengali **weekly**. The first Bengali
**daily** was **Sambad Prabhakar**, which became a daily in 1839 under
Iswar Chandra Gupta.

**Recommendation: correct the key to (d).** This is unambiguous and is
self-evident from question 30 on the same page.

---

## Not held back, but worth noting

- `X|All|General Paper|26` — the stem prints the book title as "Eighteen
  **Fifteen** Seven". It is *Eighteen Fifty Seven*, by Surendra Nath Sen. The
  key is right and the typo misleads nobody, but it should be fixed before the
  question is republished as learning content.
- `IX` and `X` questions 41–55 are the **same fifteen Geography questions**,
  identical in options and key (Q50 differs by one article). The X explanations
  are clones and carry `cloned_from`. That block cannot discriminate between
  the two classes.

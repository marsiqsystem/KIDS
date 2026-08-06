# Questions held back from Phase 2 — ALL RULED, 6 August 2026

**This file is now a record, not a queue.** Every question in it has been ruled
on and every ruling is applied. What follows is the evidence behind each one —
keep it, because it is the only place the reasoning is written down, and someone
will eventually ask why a child's mark changed.

None of this affects the online exam, which was scored and published on
different papers.

---

## Status — 6 August 2026: APPLIED

The 33 held-back questions resolved as follows.

**29 went to the institution** as a formal correction letter — 6 for grace, 23
for a change of key — and **the institution approved all 29**. They are now in
`key-overrides.json` and applied to `src/data/questions/questions.json`:

- **6 graced** (`answer` is now `null`): `IX|62`, `IX|77`, `IX|87`,
  `XI Chemistry 14`, `XI Maths 15`, `XI Philosophy 10`. Plus
  `XII|Arts|Education|13` (Delors), graced earlier — **7 graced records in
  total.** Scoring must award the mark to every candidate, blanks included.
- **23 keys corrected**, each carrying `key_corrected` with the old letter, the
  reason, and who ruled.

Re-running `extract.py` changed exactly 29 records and nothing else — verified
against the previous `questions.json`.

**Explanations can now be written for all 29.** They were held back only because
the key was wrong; with the key right, there is nothing untrue left to teach.
The 6 graced ones need `why_graced` and a `why_wrong` covering **every** option,
not `why_correct` — the build enforces this.

**4 needed no letter, because no mark moves** — ruled by Umar Iqbal, key stands
unchanged in all four. Marked **RULED** below:

| item | question | ruling |
| --- | --- | --- |
| 5 | `IX\|89` | key (d) confirmed correct — and the paper was never defective; the garbling is `extract.py`'s, not the printed page's |
| 9 | `XI Chemistry 12` | key (c) confirmed; "trigonal pyramidal" is the precise term and is preferred when both appear |
| 16 | `XI Education 22` | key (a) Buddha confirmed as the taught answer |
| 30 | `XII History 20` | key (b) confirmed |

Explanations have now been written for all four.

A caution this file has to carry: item 5 was listed here on the strength of the
extracted text alone, and the printed page turned out to be perfectly legible.
**Check the paper before calling a question defective** — `extract.py` loses
stacked radicals, fractional exponents and subscripts, and none of that is the
paper's fault.

---

# Part 1 — Classes IX and X (6 of 200)

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

## 5. `IX|All|General Paper|89` — extraction damage, not a paper defect — **RULED: key stands**

> The value of √√x2 is: 4 3
> (a) x (b) 1 x2 (c) 1 x3 (d) 1 x6
> **Key: (d)**

The stacked radical indices (4 and 3) sorted to the end of the stem, and the
fractional exponents lost their formatting: "1 x2" is x^(1/2), "1 x6" is
x^(1/6). The mathematics is recoverable — the fourth root of the cube root of
x² is x^(1/6), so the key is **correct** — but no child can read the options as
printed.

**Ruled 6 Aug 2026 (Umar Iqbal): the key (d) is correct — no override, no mark
moves. This was never a defective question.** Umar produced the printed page:
it sets the stem as ⁴√(³√(x²)) and the options as x, x^(1/2), x^(1/3), x^(1/6),
all typeset correctly. The candidates read it without difficulty. Everything
above describes damage done by `extract.py` to text that was fine on paper, and
the entry was wrong to file it as a paper defect at all.

**Explanation written**, naming the options by their true values. Not listed as
held back any more.

**Outstanding, and it is a tooling job:** `questions.json` still carries the
mangled option text, so any page rendering from the data — the learning page,
the response grid — shows "1 x2" where the paper shows x^(1/2). Retyping it by
hand does not survive, because `questions.json` is regenerated by `extract.py`
from the PDFs. Correct option text needs somewhere to live that the extractor
reapplies, the way `key-overrides.json` is reapplied to keys. **Not built —
Umar's call.** The four match-the-column History questions carrying
`needs_review` need the same thing.

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

# Part 2 — Class XI (13 of 400; all 16 subjects done)

## 7. `XI|Science|Physics|6` — key error, contradicted by Q14

> The slope of a displacement-time graph represents:
> (a) Displacement (b) Acceleration (c) Velocity (d) Time
> **Key: (b) Acceleration**

The slope of a displacement-time graph is **velocity**, option (c).
Acceleration is the slope of a *velocity*-time graph. **Question 14 on the same
paper** asks the identical thing about a position-time graph and keys it
correctly as velocity.

**Recommendation: correct the key to (c).** Same situation as `X|31`.

## 8. `XI|Science|Physics|19` — key error, wrong axis

> The radius of gyration (k) of a uniform thin ring of radius R about its
> central axis passing perpendicular to its plane is:
> (a) R/2 (b) R/√2 (c) R (d) 2R
> **Key: (b) R/√2**

About the axis **perpendicular to its plane**, a thin ring has I = MR², so
k = √(I/M) = **R**, option (c). R/√2 is the radius of gyration about a
**diameter**, where I = ½MR². The key has answered for the wrong axis.

**Recommendation: correct the key to (c).**

## 9. `XI|Science|Chemistry|12` — two options name the same shape — **RULED: key stands**

> NH3 and NF3 are:
> (a) Pyramidal (b) Tetrahedral (c) Trigonal pyramidal (d) Linear
> **Key: (c)**

"Pyramidal" and "trigonal pyramidal" are the same shape, and every textbook
describes NH₃ as pyramidal. Option (a) cannot be called wrong.

**Recommendation: keep the key, publish no explanation.** Rewrite before reuse.

**Ruled 6 Aug 2026 (Umar Iqbal): key (c) stands.** "Pyramidal" is the shortened
form chemists use in speech; "trigonal pyramidal" is the molecular geometry as
NCERT, CBSE and ISC name it, and when both are on the page the precise term is
the one to pick. Explanation written on that footing — it says plainly that (a)
is the same shape said loosely, rather than pretending it is wrong.

## 10. `XI|Science|Chemistry|14` — the keyed value is not the right number

> The frequency of yellow light having a wavelength of 5800 Å is:
> (a) 3 × 10¹⁵ Hz (b) 5.08 × 10¹⁴ Hz (c) 50.08 × 10¹⁴ Hz (d) None of the above
> **Key: (b)**

c/λ = 3×10⁸ / 5.8×10⁻⁷ = **5.17 × 10¹⁴ Hz**, not 5.08. The keyed option is
almost certainly a typo for 5.17. As printed, a student who calculated
correctly finds no matching option and can justifiably choose (d).

**Recommendation: accept (b) and (d), or grace.** The dispute is real: the
better the student, the more likely they picked (d).

## 11. `XI|Science|Mathematics|8` — key error

> If α + β = π/2 and β + γ = α then tan α equals
> (a) 2tanβ + 2tanγ (b) tanβ + 2tanγ (c) 2tanβ + tanγ (d) tanβ + tanγ
> **Key: (d)**

From the two conditions, α = π/2 − β and γ = π/2 − 2β, so tan α = cot β and
tan γ = cot 2β. Then tanβ + 2tanγ = t + (1−t²)/t = 1/t = cot β = tan α, where
t = tan β. So the answer is **(b)**.

Numerical check with β = 30°: α = 60°, γ = 30°, and β + γ = 60° = α ✓.
tan α = 1.732. Option (b) gives 0.577 + 1.155 = **1.732** ✓. Option (d) gives
0.577 + 0.577 = 1.155 ✗.

**Recommendation: correct the key to (b).**

## 12. `XI|Science|Mathematics|15` — no option is correct

> If 2x − 5 ≤ 5x + 4 < 19 where x ∈ I then the value of x is
> (a) −2 ≤ x ≤ 3 (b) −2 ≤ x < 23 (c) −3 ≤ x ≤ 4 (d) −3 ≤ x ≤ 3
> **Key: (d)**

The left inequality gives x ≥ −3 and the right gives x < 3 **strictly**, since
at x = 3 we get 19 < 19, which is false. So the answer is −3 ≤ x < 3, and no
option says that. Option (d) has the right lower bound and the wrong
inclusivity at the top.

**Recommendation: grace**, or reprint with `< 3`.

## 13. `XI|Science|Mathematics|21` — key error, plain formula

> The number of diagonals that can be drawn by joining the vertices of a
> heptagon is
> (a) 7 (b) 21 (c) 14 (d) 13
> **Key: (d) 13**

Diagonals = n(n−3)/2 = 7 × 4 / 2 = **14**, option (c). (21 is the number of
*lines* joining vertices, 7C2, of which 7 are sides.) 13 is not the answer to
any reading of the question.

**Recommendation: correct the key to (c).**

## 14. `XI|Science|Mathematics|25` — key error, reciprocal

> The value of lim(x→0) (e^(x²) − cos x) / x² is
> (a) 1/4 (b) 2/3 (c) 3/2 (d) 1
> **Key: (b) 2/3**

e^(x²) = 1 + x² + …, cos x = 1 − x²/2 + …, so the numerator is
x² + x²/2 = (3/2)x², and the limit is **3/2**, option (c). The key is the
reciprocal of the right answer.

**Recommendation: correct the key to (c).**

## 15. `XI|Arts|Education|2` — three defensible answers

> Education means: (a) To nourish (b) To bring up (c) To lead out (d) To put in
> **Key: (a)**

*Educare* means to bring up or nourish; *educere* means to lead out. So (a),
(b) and (c) are all standard glosses of the word's roots, and every textbook
gives at least two of them. Only (d) is clearly wrong.

**Recommendation: keep the key, publish no explanation.** Rewrite as "which
root means…" before reuse.

## 16. `XI|Arts|Education|22` — disputed priority — **RULED: key stands**

> The first to challenge the caste system was:
> (a) Buddha (b) B.G. Tilak (c) Mahatma Gandhi (d) Mahavira
> **Key: (a) Buddha**

Mahavira is traditionally dated earlier than Buddha (599–527 BCE against
563–483 BCE), and Jainism rejected caste just as firmly. Indian school texts
conventionally credit Buddha, but a well-read student can defend (d).

**Recommendation: a teacher's ruling.** Either confirm (a) as the taught
answer, or accept both.

**Ruled 6 Aug 2026 (Umar Iqbal): key (a) Buddha stands.** The chronology above
is right — Mahavira is traditionally dated earlier and both belonged to the
Sramana movement — but "the first to challenge the caste system" is not a
precise historical claim, and in this syllabus the expected answer is Buddha,
whose Sangha was the first order to admit every caste by rule. The explanation
says so openly and credits Mahavira rather than calling him wrong.

## 17. `XI|Arts|Philosophy|10` — both religions have five

> Which philosophy believes in the five principles of conduct?
> (a) Buddhism (b) Vedic (c) Jainism (d) Islamic
> **Key: (c) Jainism**

Jainism has the five vows (*pancha mahavrata*) and Buddhism has the five
precepts (*pancasila*). Both are literally five principles of conduct, so (a)
cannot be called wrong.

**Recommendation: keep the key, publish no explanation.** Naming the term —
*mahavrata* — would make the question sound.

## 18. `XI|Arts|Philosophy|18` — the "All of These" is defensible

> Self, according to Samkara, is:
> (a) Brahman (b) Eternal (c) Transcendent (d) All of These
> **Key: (a) Brahman**

For Shankara the Self *is* Brahman — and Brahman is eternal and transcendent.
So (b) and (c) are also true of the Self, which makes (d) at least as good an
answer as (a), and arguably better.

**Recommendation: correct the key to (d), or rewrite.** Unlike the three above,
this one has a defensible case for the key actually being wrong.

## 19. `XI|Arts|History|2` — key error, off by six centuries

> The oldest inscription found in India was
> (a) Ashokan Inscription (b) Allahabad Inscription
> (c) Mehrauli Iron Inscription (d) Aihole Inscription
> **Key: (c) Mehrauli Iron Inscription**

The Mehrauli iron pillar inscription dates to about **400 CE**, in the reign of
Chandragupta II. The **Ashokan edicts are c. 250 BCE** — roughly six and a half
centuries older, and universally described as the oldest deciphered
inscriptions in India. The Allahabad pillar inscription of Samudragupta
(c. 350 CE) and the Aihole inscription of Pulakeshin II (634 CE) are later
still, so the keyed option is not even the second oldest of the four.

**Recommendation: correct the key to (a).**

---

# Part 3 — Class XII (14 of 399; all 16 subjects done)

## 20. `XII|Science|Physics|16` — key error, that is an ammeter

> To convert a galvanometer into a voltmeter, we connect a —
> (a) High resistance in series (b) Low resistance in parallel
> (c) High resistance in parallel (d) Low resistance in series
> **Key: (b) Low resistance in parallel**

A voltmeter must draw almost no current and is placed across a component, so it
needs a **high resistance in series** — option (a). A **low resistance in
parallel** is the shunt that converts a galvanometer into an **ammeter**. The
key has answered the opposite question.

**Recommendation: correct the key to (a).**

## 21. `XII|Science|Chemistry|12` — key error, both give a positive test

> Which reagent helps to differentiate between glucose and fructose?
> (a) Br2/H2O (b) Cl2/KOH (c) Tollen's reagent (d) Fehling's reagent
> **Key: (c) Tollen's reagent**

Fructose is a ketose, but in the alkaline conditions of Tollens' and Fehling's
it isomerises to glucose and mannose, so it gives a **positive** test with both.
That is precisely why neither distinguishes them. **Bromine water** — option (a)
— is mildly acidic, causes no isomerisation, and oxidises the aldose glucose
while leaving fructose untouched.

**Recommendation: correct the key to (a).** Note that (d) is wrong for the same
reason as the keyed (c), so a student who reasoned it out had no right answer
unless they picked (a).

## 22. `XII|Science|Chemistry|13` — key error, tertiary alcohol

> Which one of the following gives a yellow precipitate with iodine and alkali?
> (a) 2-Methyl-propan-2-ol (b) Propan-2-ol (c) Propanol (d) Methanol
> **Key: (a) 2-Methyl-propan-2-ol**

The iodoform test needs a CH₃CH(OH)– or CH₃CO– group. 2-Methylpropan-2-ol is
(CH₃)₃C–OH, a **tertiary** alcohol with no hydrogen on the carbinol carbon, so
it gives **no** iodoform. **Propan-2-ol**, CH₃CH(OH)CH₃, is the one that does —
option (b). Propan-1-ol and methanol also fail, so (b) is the only positive.

**Recommendation: correct the key to (b).**

## 23. `XII|Science|Chemistry|15` — the process is the reverse of coagulation

> Which of the following involves coagulation?
> (a) Peptization (b) Sublimation (c) Condensation (d) Ozonation
> **Key: (a) Peptization**

Peptization is the **opposite** of coagulation: it disperses a precipitate back
into a colloidal sol. The other three options are unrelated to colloids
entirely, so (a) is the only option in the right area — but a student who knows
the definition properly will reject it for exactly the right reason.

**Recommendation: keep the key, publish no explanation.** Reword as "which is
the reverse of coagulation" before reuse.

## 24. `XII|Science|Mathematics|13` — key error, sign

> If f(2) = 4 and f'(2) = 4 then lim(x→2) [x·f(2) − 2·f(x)] / (x − 2) equals
> (a) 2 (b) −2 (c) 4 (d) −4
> **Key: (c) 4**

The numerator is 0 at x = 2, so by L'Hôpital the limit is
f(2) − 2f′(2) = 4 − 8 = **−4**, option (d).

Concrete check with f(x) = 4x − 4, which satisfies f(2) = 4 and f′(2) = 4:
[4x − 2(4x−4)] / (x−2) = (−4x + 8)/(x − 2) = **−4** exactly, for every x ≠ 2.

**Recommendation: correct the key to (d).**

## 25. `XII|Science|Biology|17` — key error, one stage too early

> Human embryo implantation usually occurs at which stage?
> (a) Zygote (b) Morula (c) Blastocyst (d) Gastrula
> **Key: (b) Morula**

The morula is what travels down the fallopian tube and reaches the uterus, but
it does not implant. It first becomes a **blastocyst**, whose trophoblast
attaches to and invades the endometrium — that is implantation, option (c).
NCERT states it explicitly: "the blastocyst becomes embedded in the
endometrium."

**Recommendation: correct the key to (c).**

## 26. `XII|Arts|Education|25` — key error, wrong commencement date

> The Right to Education (RTE) Act, 2009 came into effect from:
> (a) 01.04.2010 (b) 01.01.2010 (c) 01.01.2009 (d) 31.01.2009
> **Key: (b) 01.01.2010**

The Right of Children to Free and Compulsory Education Act was passed in 2009
and **came into force on 1 April 2010** — option (a). 1 January 2010 is not a
date of any significance to the Act.

**Recommendation: correct the key to (a).** Note that question 14 on the same
paper correctly keys the year of *passing* as 2009, so the paper is testing the
passed/commenced distinction deliberately — and then gets the second half wrong.

## 27. `XII|Arts|Geography|21` — the key is out of date

> The largest producer of coal in India is:
> (a) Odisha (b) Chhattisgarh (c) Jharkhand (d) West Bengal
> **Key: (c) Jharkhand**

Jharkhand holds India's **largest coal reserves**, and that is what most
textbooks say. But it has not been the largest **producer** for years —
Chhattisgarh and Odisha have both out-produced it, each mining well over
200 million tonnes a year against Jharkhand's ~130.

**Recommendation: a teacher's ruling.** If the WB text says Jharkhand, keep the
key — students answered what they were taught. But reserves and production are
different things and the question should say which it means.

## 28. `XII|Arts|Geography|23` — the key contradicts NCERT

> Which mode of transport carries the highest volume of freight in India?
> (a) Air (b) Water (c) Road (d) Rail
> **Key: (d) Rail Transport**

NCERT Class 12 Geography states plainly that **roads carry about 70 per cent of
freight traffic** (and 85 per cent of passenger traffic). Road overtook rail
decades ago; rail now carries roughly 30 per cent. The keyed answer was true of
an earlier India.

**Recommendation: correct the key to (c)**, unless the prescribed text says
otherwise — in which case keep the mark and rewrite the question.

## 29. `XII|Arts|History|15` — key error, and it inverts the history

> What was the main objective of Jim Crow Law?
> (a) To promote the cause of Black American.
> (b) To put an end to racial discrimination in America.
> (c) To put the White and Black people of America on the same footing.
> (d) To segregate and discriminate against Black Americans.
> **Key: (c)**

Jim Crow laws did the **opposite** of putting Black and White Americans on the
same footing. They enforced racial segregation in schools, transport, housing
and voting across the American South from the 1870s until the Civil Rights Act
of 1964. Option **(d)** states their purpose exactly.

**This is the most important correction in this file.** The other wrong keys
cost a mark; this one, if published as learning content, would teach children
that segregation laws promoted equality.

**Recommendation: correct the key to (d), and treat as urgent.**

## 30. `XII|Arts|History|20` — two options say the same thing — **RULED: key stands**

> The Depression of 1929 brought a change in the attitude of imperial power.
> (a) The days of free trade were gone.
> (b) Protectionism became the new catchword. …
> **Key: (b)**

(a) and (b) describe the same historical shift in different words, and (a) is
plainly true — Britain abandoned free trade after 1929, through the Import
Duties Act of 1932 and the Ottawa agreements.

**Recommendation: keep the key, publish no explanation.** Rewrite before reuse.

**Ruled 6 Aug 2026 (Umar Iqbal): key (b) stands.** Explanation written: (a) is
acknowledged as true, and the reason (b) is the answer is that the question
asks for the policy that replaced free trade, which protectionism names and (a)
does not.

## 31. `XII|Arts|Philosophy|2` — key error, contradicted by Q6

> Which philosopher considered the cause–effect relation as a form of intellect?
> (a) Locke (b) Hume (c) Ewing (d) Kant
> **Key: (b) Hume**

Treating causality as a **form of the intellect** — an a priori category of the
understanding — is **Kant's** position, option (d). Hume's is the opposite: he
denied any necessary connection and reduced it to psychological habit.
**Question 6 on the same paper** keys Hume correctly for the *psychological*
view, so the paper assigns two contradictory positions to the same man.

**Recommendation: correct the key to (d).**

## 32. `XII|Arts|Philosophy|5` — key error, that is Ramanuja

> The Vedanta philosophy of Shankara is called:
> (a) Kevaladvaitavada (b) Vishishtadvaitavada (c) Dvaitadvaitavada
> (d) Dvaitavada
> **Key: (b) Vishishtadvaitavada**

**Vishishtadvaita** — qualified non-dualism — is **Ramanuja's** system.
Shankara's is **Kevaladvaita**, absolute non-dualism, option (a). Dvaita is
Madhva's and Dvaitadvaita is Nimbarka's, so the keyed option names the wrong
philosopher of the four schools this question is built from.

**Recommendation: correct the key to (a).**

## 33. `XII|Arts|Philosophy|11` — key error, the option is meaningless

> Human exploitation of nature has reached such a level that many countries are
> facing the problem of:
> (a) Individual crisis (b) Environmental crisis (c) Moral crisis
> (d) Habitation crisis
> **Key: (a) Individual crisis**

Exploitation of nature produces an **environmental crisis**, option (b). An
"individual crisis" is not a consequence of environmental damage in any sense
the question could intend, and is not a term used in this chapter.

**Recommendation: correct the key to (b).**

---

## Not held back, but worth noting

- `X|All|General Paper|26` — the stem prints the book title as "Eighteen
  **Fifteen** Seven". It is *Eighteen Fifty Seven*, by Surendra Nath Sen. The
  key is right and the typo misleads nobody, but it should be fixed before the
  question is republished as learning content.
- `XII|Arts|Geography|10` — ocean salinity is 35 **parts per thousand**, but every
  option is printed as a percentage. The number 35 is right and the relative
  answer is unambiguous, so the explanation states the correct unit rather than
  repeating the paper's. Fix the symbol before reuse.
- `XI|Science|Mathematics|19` — "greater than 1000" is strict, so 1000 itself
  should be excluded and the true count is 374, not the keyed 375. Every
  standard textbook prints 375, and 374 is not on offer, so no student is
  misled into a wrong pick. Explanation written; worth tightening at
  paper-setting.
- `XI|Science|Mathematics|18` — the quadratic has **two** roots, n = 6 and
  n = 7. Only 6 is offered, so the key is answerable, but a student who found 7
  first would be stuck. Explanation written.
- `IX` and `X` questions 41–55 are the **same fifteen Geography questions**,
  identical in options and key (Q50 differs by one article). The X explanations
  are clones and carry `cloned_from`. That block cannot discriminate between
  the two classes.

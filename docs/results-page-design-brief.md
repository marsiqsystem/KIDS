# Design brief — public results & analysis page (`/results`)

Paste this into Claude Design. Everything below is real: every figure is the
actual SET 2026 Phase 1 result, queried from the live database on 1 Aug 2026.
Design against these numbers, not placeholders — if a panel cannot be filled
from the data listed here, it cannot be built.

---

## Who this is for

**KIDS (Kabitirtha Institute of Development & Studies)**, Kolkata — a 22-year-old
education charity working with vernacular-medium schools across West Bengal.
Every year it runs the **Students Evaluation Test (SET)**, a free talent test for
classes IX–XII, under **Project UDAAN**.

The audience for this page is **not** the student checking their own marks — they
have a private result page for that. This page is for:

- **Head teachers and partner schools** wanting to see how their school did
- **Parents and the wider community** reading "how did the district do?"
- **Donors, partners and government** judging whether SET is worth supporting
- **Local press** looking for a figure to quote

So it is a **public report on the exam as a whole** — an honest, readable piece of
statistics with a civic, institutional tone. Think *annual report* or *census
summary*, not *dashboard*. It should feel like something KIDS would be proud to
print.

## The KIDS design system

A KIDS design system already exists in this Claude Design project — maroon
`#7B1E2B` primary, gold `#C9A24B` accent, teal `#1E9E8C` secondary, warm cream
surfaces, Playfair Display for display type and Inter for body and figures.
**Use it.** Tabular figures everywhere numbers are compared.

⚠️ **Important:** the live `/results` page currently runs the *older* site palette
(`#570000` maroon, `#7b5805` gold) — different from the design system. Design in
the **design-system** palette; the developer will handle reconciling it.

---

## What this page replaces

The current `/results` page is **entirely fabricated placeholder content** left
over from a template — invented student names ("Arpan Mondal 98%"), invented
school awards, a "Subject Toppers" table with made-up mentoring faculty, and a
section of "Unsung Heroes". **All of it must go.** None of it is real and none of
it can be sourced.

---

## Hard constraints — read before designing

**1. This is Phase 1 (online) only.**
Students sat two papers on 19 July 2026: a 50-question online paper on their
phones, and a 100-question written OMR paper at the centre. **Only the online
paper has been marked.** The written paper is still being marked by hand and has
no publication date. The page must be clearly and repeatedly scoped as *first
phase / online* — never imply it covers the whole exam.

**2. There is no subject-wise data. At all.**
The online paper is one mixed 50-question paper per class — no subject
divisions. Subjects (English, Mathematics, Physical Science, Life Science) exist
**only in the unpublished written paper**. So: no subject toppers, no subject
averages, no per-subject charts. Do not design any.

**3. There is no teacher, faculty or mentor data.** None is collected.

**4. Classes are never compared with each other.**
IX, X, XI and XII sat four *different* papers. A mark on one is not a mark on
another. Any chart placing the four classes on a shared scale must be visibly
framed as "four separate papers", never as a ranking of classes.

**5. Nothing that shames.**
Show best-performing schools and centres. **Never** a worst-performing list, a
bottom table, or anything that identifies a school as failing. These are
under-resourced vernacular-medium schools; the page exists to encourage them.

**6. Marking scheme:** one mark per correct answer, no negative marking, 50
marks total, 30 minutes.

---

## Privacy — the one open decision

The old page listed individual students by name with their marks. That is a
**decision for KIDS to make, not a design default.** These are minors.

Please design the merit/toppers section **in two variants** so it can be chosen
later:

- **Variant A — named:** top performers listed by name, class and school
- **Variant B — anonymous:** "64 students scored full marks", broken down by
  class and school, with no individual named

Everything else on the page is aggregate and carries no personal data. School
and exam-centre names are institutions and are fine to show.

---

## The real data

### Headline

| | |
|---|---|
| Registered | **9,637** students |
| Sat the online paper | **6,778** |
| Did not sit | **2,859** |
| Average score | **26.26 / 50** |
| Scored full marks | **64** |
| Exam centres | **21** |
| Schools represented | **112** |
| Date | Sunday, 19 July 2026 |
| Paper | 50 questions · 30 minutes · classes IX–XII |
| Media | Bengali · Hindi · Urdu |

### By class — four separate papers

| Class | Registered | Sat | Average | Median | Highest | Full marks |
|---|---|---|---|---|---|---|
| IX | 2,510 | 1,782 | 25.48 | 25.0 | 50 | 8 |
| X | 2,769 | 1,973 | 23.55 | 21.0 | 50 | 15 |
| XI | 2,481 | 1,577 | 28.30 | 28.0 | 50 | 7 |
| XII | 1,877 | 1,446 | 28.74 | 27.0 | 50 | 34 |

*Note the story here: Class X has the lowest average (23.55) and its median (21)
sits well below its mean — a long tail of low scores. Class XII has the highest
average and more than half of all full marks.*

### Score distribution (all classes, 6,775 ranked students)

| Band | Students |
|---|---|
| 0–4 | 223 |
| 5–9 | 81 |
| 10–14 | 493 |
| 15–19 | 1,228 |
| 20–24 | 1,262 |
| 25–29 | 1,079 |
| 30–34 | 812 |
| 35–39 | 596 |
| 40–44 | 400 |
| 45–49 | 537 |
| 50 | 64 |

*A broad peak at 15–29 with a real second cluster at 45–50. The 223 at 0–4 are
mostly students who opened the paper and answered almost nothing.*

### How the half hour was used

- **5,370** submitted by hand; **1,408** were auto-submitted when the window closed at 11:00
- Average time taken: **22.0 minutes** of 30
- Median: **23.6 minutes**

### Top schools by average (minimum 25 students sat)

| School | Sat | Average |
|---|---|---|
| Raniganj Sri Durga Vidyalaya Girls' High School (H.S.) | 26 | 36.08 |
| Belgachia Muslim High School (H.S.) | 107 | 34.20 |
| G. R. Mudialy Boy's High School (H.S.) | 89 | 34.03 |
| Islamia High School (H.S.) | 79 | 33.86 |
| Raniganj Marwari Sanatan Vidyalaya | 120 | 33.79 |
| Raniganj Urdu High School | 89 | 32.73 |
| Md. Jan High School (H.S.) | 208 | 32.50 |
| Kulti Millat Urdu Girl's High School (H.S.) | 42 | 32.19 |

### Turnout by exam centre (top 8 of 21)

| Centre | Registered | Sat | Turnout | Average |
|---|---|---|---|---|
| Jay Kay Nagar High School (H.S) | 220 | 196 | 89.1% | 23.05 |
| Aulad Hussain Islamic Academy | 386 | 344 | 89.1% | 28.55 |
| Rahmatnagar Iqbal Academy High School (H.S.) | 107 | 90 | 84.1% | 25.81 |
| Dhankheti High School (H.S.) | 295 | 248 | 84.1% | 28.00 |
| Maulana Hasrat Mohani Memorial Girls' High School (H.S.) | 474 | 395 | 83.3% | 26.02 |
| Madrasah Islamia High Madrasah (H.S.) | 342 | 282 | 82.5% | 20.71 |
| Raniganj Anjuman Urdu Girls' High School (H.S.) | 727 | 590 | 81.2% | 26.95 |
| Belgachia Urdu High School (Co.Ed) | 286 | 227 | 79.4% | 32.49 |

### Question difficulty

Every question has a "% of the class who got it right" figure.

- **Hardest:** Class IX Q25 — only **19.1%** correct
- **Easiest:** Class XII Q23 — **92.2%** correct
- Range across all four papers: roughly 19% to 92%

Question *text* is available and can be shown.

---

## Suggested structure

Treat this as a starting point, not a specification.

1. **Header** — "SET 2026–27 · First Phase Results", date, and a clear line that
   these are the online paper results and the written paper follows
2. **Headline figures** — 9,637 registered / 6,778 sat / 26.26 average / 64 full
   marks. The one screenful a journalist would screenshot
3. **Score distribution** — the shape of the whole cohort. Probably the visual
   centrepiece
4. **Class by class** — four papers side by side, explicitly *not* a ranking
5. **Merit / full marks** — variants A and B above
6. **Schools** — a celebration, honestly labelled ("average of students who sat")
7. **Centres & turnout** — 21 centres; the 2,859 who did not sit is a real,
   honest number and should not be hidden
8. **Question difficulty** — hardest and easiest, a nice human detail
9. **What comes next** — written paper still being marked; Project UDAAN
   felicitation to follow
10. **Footer** — students check their own result on their personal portal
    (link to `/set`)

---

## Deliverables — please provide BOTH

**Design the laptop layout and the phone layout together, in one file, with a
media-query breakpoint.** A previous handoff arrived phone-only and the desktop
had to be retro-fitted afterwards. Specifically:

- **Phone** (~412px): single column
- **Laptop** (≥900px): multi-column, wider container (~1180px), charts given real
  horizontal room. Tables must scroll horizontally inside their own container
  rather than making the page scroll

Charts should be plain SVG/CSS — the target codebase has no charting library and
inlining one for this page is not wanted.

---

## Tone

Warm, plain, factual, and proud without being boastful. Short sentences. Explain
what a number means rather than assuming statistical literacy — many readers are
parents for whom this is their child's first public examination. Avoid league-table
language. The page should read as *"here is what happened, honestly"*.

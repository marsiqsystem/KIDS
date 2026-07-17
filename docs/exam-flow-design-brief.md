# Design brief — the SET 2026 exam-flow screens

Companion to `portal-design-brief.md`. That brief covered the **portal** (countdown, your-exam,
centre, tips). This one covers the **three screens the student sees around the exam itself** — the
ones the portal hands off to at 10:30 and hands back from at 11:00. A working but visually poor
version exists; treat it as a content inventory, **not** a design to refine.

You are redesigning **three screens** (really two designs — the last one is one design used in two
places). Produce full visual designs, **mobile-first** (this is sat on a phone) but also correct on
a laptop.

---

## Who is looking at this, and why it matters

**~9,500 students, aged 14–18**, across 100+ schools in West Bengal — Bengali, Hindi and Urdu
medium, many first-generation exam-takers, most on **cheap Android phones on mobile data**, some on
shared or borrowed devices. For most of them **this is the first online exam of their life**.

These three screens are the highest-stakes moments in the whole system:

- The **Start screen** is the last thing between a nervous child and a one-shot, 30-minute exam.
- The **Submitted screen** is the exhale — it must make "I have finished, and my answers are safe"
  unmistakable, because a student who isn't sure will keep tapping, or panic.

Tone: **official and trustworthy** (a real examination body) yet **warm and calming** (a scared
fifteen-year-old). Never corporate, never childish, never intimidating. Meaning must survive being
read by someone whose third language is English — short sentences, plain words, structure and icons
carrying as much as the text.

---

## The design system to use (do not invent a new one)

These screens live inside `.portal` and must look like they belong to kidskolkata.org. Tokens:

```
--maroon:#7b1e2b  --maroon-deep:#3d0a10  --maroon-light:#9a3340  --maroon-tint:#e8c9cc
--gold:#c9a24b    --gold-light:#e5be7a   --star-gold:#f4c12a
--teal:#1e9e8c    --teal-dark:#0c2a2e    --teal-ink:#0d5248
--cream:#fdfbf7   --cream-surface:#fbf7ef --cream-muted:#f2e9da
--ink:#2b1a1c     --ink-muted:#6b5b5d
```

- **Fonts:** display = **Playfair Display** (serif, headings only); body = **Montserrat**; the
  countdown digits and the Unique ID = a **system monospace** stack with `tabular-nums` so figures
  don't jitter as they tick. No new web fonts — every extra download hurts a phone on 3G.
- **The "night sky" hero**: a deep teal→green vertical gradient (`#0c2a2e → #123a3b → #1e7e78`)
  with a scatter of faint gold/white stars, echoing the KIDS logo. It has three moods that the
  design already uses and you should keep:
  - `sky` — calm teal (default)
  - `sky-dawn` — warmer, hours before the exam
  - `sky-urgent` — maroon→amber (`#3d0a10 → #7b1e2b → #9a5a2a`), for the final hour
- Cards on cream: `--cream-surface` fill, `--cream-muted` hairline border, 16px radius, a soft
  two-layer shadow. Uppercase micro-labels: 0.64rem, letter-spacing 0.08em, `--ink-muted`.
- **Touch targets ≥ 44px.** Strong daylight contrast. Real focus states. Works at 200% text.
- **Motion is a cost.** The only motion that earns its place is the countdown ticking and a brief
  scan/submit spinner. Everything must respect `prefers-reduced-motion`. Nothing decorative that
  costs a slow phone a frame.

---

## Screen 1 — Waiting room → Start ("Ready when you are")  *(screenshot #4)*

One screen, two consecutive states on the **night-sky** background. This is where the portal sends
the student from ~15 minutes before their start time until they open the paper.

**1a · Waiting room** (before the start time)
- The student's paper label, e.g. `SET 2026 · Class XII`.
- A **large live countdown** to the start, `MM:SS`, monospace/tabular so it doesn't jump. Caption
  `minutes · seconds`.
- A reassurance panel: **"Nearly time. Stay on this page. When the clock reaches zero, a Start
  button will appear right here — press it and your paper opens."**
- The countdown is server-driven; the digits only appear after the page mounts (the server can't
  know how wrong the phone's clock is). Design a graceful `--:--` placeholder for that first instant.
- At zero it must become 1b **in place, with no reload** — a child staring at the screen must not
  have to know to refresh.

**1b · Start screen** (paper is open)
- Eyebrow: **YOUR PAPER IS OPEN**.
- Headline: **"Ready when you are"** — or, if they're resuming a paper they already started,
  **"Carry on with your test"**.
- Sub-line: **"The clock is already running and ends for everyone at the same time — so start now."**
  (fairness is the reassurance here) — or, resuming: **"Your answers are still here. Press the
  button to go back to your paper."**
- One **large gold primary button**, the only real action on screen:
  `Start my test` / `Back to my test` (resuming) / `Opening your paper…` (busy, with spinner) /
  `Try again` (after an error).
- Footnote: **"Once you start, the paper stays open until the time is up — even if your signal
  drops."**
- **Error state** (couldn't reach the exam / paper failed to open): a calm, legible message panel
  above the button — reassuring, never a raw red error box — with the button reading `Try again`.

Keep intact, whatever the visual: the single unmistakable primary action; the "ends for everyone at
the same time" fairness note; the resume wording; the busy and error states; the offline-safety
footnote. Do **not** add a second competing button or any way to leave this screen sideways.

---

## Screen 2 — Submitted / Exam closed  *(screenshots #5 and #6 — unify them)*

Right now there are **two different submitted screens** and they disagree:

- **#5** (shown when a finished student re-opens the portal): has the portal **header + footer**,
  says *"Well done, Umar — the online part is complete,"* and shows **two** cards — *Now: the
  written test* and *Results, later*.
- **#6** (shown the instant they press Submit, inside the exam): **no** header/footer, says
  *"Well done. The online part is complete and your answers are safely with us,"* shows **one** card
  — *Now: the written test* — and a **Back to my portal** button.

**Design ONE submitted screen** and use it in both places. Differences to preserve, not multiply:

- **Header/footer**: present when reached via the portal, absent in the bare in-exam moment — so
  design the centre block to stand on its own and also sit correctly inside the portal shell.
- **Copy variants** (same layout, swap the line):
  - *just submitted*: "Well done — the online part is complete and your answers are safely with us."
  - *auto-submitted at 11:00* (time ran out): "Time is up, and your answers were submitted for you —
    exactly as promised. Nothing is lost." This is a **promise being kept**, so it should feel calm
    and reassuring, not like a failure.

Required content:
- A clear **success mark** (the gold check) and headline **"Your test is submitted"** on the
  night-sky hero.
- Card **"Now: the written test"** — *The offline written test begins at **11:30 AM**. Hand your
  phone in when asked, go to your room, an invigilator will guide you.*
- Card **"Results, later"** — *Your result will be published on this same page. You can safely close
  it now and come back.*  (Include this in both uses — a finished student wants to know when results
  come, whether they got here by submitting or by re-opening.)
- The student's **name · ID** for reassurance/identification.
- A quiet **"Back to my portal"** action **only** in the in-exam use (in the portal use they're
  already home). Make it clearly secondary — a finished exam has no urgent action left.

Anti-goals for this screen: no score or answers (results are published later, deliberately — do not
imply an instant result); no "retake" (one attempt only); no dead end.

---

## Also in scope — the "Submitting…" moment

A brief full-screen overlay between pressing Submit and the submitted screen: a spinner, **"Handing
in your paper…"**, **"Do not close this page."** Keep it, make it feel safe and quick, not alarming.

---

## Facts you may use (and none beyond these)

19 July 2026 · report by 10:00 · online exam 10:30–11:00 · **50 questions · 30 minutes · one attempt
only** · offline written exam from 11:30. Per student you have `name`, 9-digit `uid`, and `class`
(IX/X/XI/XII). **Invent nothing else** — no negative marking, no room/seat numbers, no phone number,
no score. A confident wrong instruction is worse than a missing one.

## Anti-goals (all three screens)

- ❌ Anything childish — they are teenagers sitting a serious exam.
- ❌ A second competing action on the Start screen, or any sideways exit from it.
- ❌ Implying an instant result or a possible retake on the Submitted screen.
- ❌ Raw error boxes — an error a panicking student sees deserves real, calm design.
- ❌ Decorative motion, heavy images or new web fonts a 3G phone can't spare.

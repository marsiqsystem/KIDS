# Design brief — the SET 2026 Student Portal (`/portal`)

You are designing **one page**: the page a schoolchild lands on when they scan the QR code printed
on their admit card. Please produce a full visual design (desktop + mobile) using the KIDS design
system you already have. A working but visually poor version exists; treat it as a content
inventory, not as a design to refine.

---

## 1. Who is looking at this, and why it matters

**9,440 students, aged roughly 14–18**, across 107 schools in West Bengal — Bengali, Hindi and
Urdu medium. Many are first-generation exam-takers. A large share are on **cheap Android phones on
mobile data**, some on shared or borrowed devices. A minority will open it on a school computer.

On **Sunday 19 July 2026** they sit the *Students Evaluation Test (SET)*: a **30-minute, 50-question
online exam from 10:30 to 11:00 AM**, taken on their own phone by scanning their admit card. Phones
are then collected and a written offline exam begins at 11:30.

For most of them, **this is the first online exam of their life**. The emotional job of this page is
therefore as important as the informational one:

> *"You are in the right place. You know what will happen. You will not be caught out."*

It must feel **official and trustworthy** (this is a real examination body) while being **warm and
calming** (this is a nervous fifteen-year-old). Not corporate, not childish, not intimidating.

**A student may open this page many times** between today and exam day — the countdown, the practice
test and the readiness check are all reasons to come back. Design for repeat visits, not a
one-time landing.

---

## 2. The single biggest problem to fix

The current version is a **narrow single column (max-width ~672px)** centred in a dark maroon field.
On a laptop it looks like a phone screenshot pasted onto a wall. It is embarrassing.

**Design desktop and mobile as first-class, distinct layouts.** On desktop, use the width: a genuine
multi-column composition, a sticky "at a glance" rail, real hierarchy. On mobile, a single flowing
column with big tap targets. Not one squeezed into the other.

---

## 3. Page states — the same URL, four different pages

The page must be designed for **all four**, because it is the same link all week.

| State | When | Character |
|---|---|---|
| **A. Countdown** | now → 19 Jul 10:00 | The main design. Preparation, reassurance, practice. |
| **B. Waiting room** | 19 Jul 10:00 → 10:30 | Stripped back. One live countdown to 10:30. Paper is silently preloading. Nothing else should compete. |
| **C. Live exam** | 10:30 → 11:00 | *(a separate screen — not in this brief, but design the hand-off into it)* |
| **D. Closed** | after 11:00 | Calm, final. "Your exam is submitted. The offline exam begins at 11:30." No dead ends. |

Plus **four error screens** (these are the ones a panicking student sees, so they deserve real design,
not a red box):

1. **Incomplete link** — they opened `/portal` with no code.
2. **Signature failed** — a photographed/forged QR. Firm but not accusatory.
3. **Not on the register** — the ID is unknown.
4. **Missing class** — we hold their record but not their class, so we cannot give them a paper.
   They must show the screen to their coordinator. Show the Unique ID prominently for that.

Each error must offer **a next step**, never just a refusal.

---

## 4. The data we actually have (design only with this)

Per student, from a verified database lookup:

- `name` (as registered — often ALL CAPS or all lowercase; we soften it for the greeting only)
- `uid` — the 9-digit Unique ID, also printed on the card
- `class` — IX, X, XI or XII
- `stream` — Arts / Commerce / Science, **or null** (~39 students). *Only relevant to the offline
  exam; the online paper is class-wise.* Show it, but never make it load-bearing.
- `school_name` — their own school
- `dob` — **1,005 students have none.** Never design anything that requires it.

Per centre (all 21):

- `code` (CTR-01…21), `name`, full `address`, `district`
- A **verified Google Maps destination string** → directions + map links
- The **list of schools** allocated to that centre

> **Do NOT design a "call your centre coordinator" feature.** We hold those phone numbers, but they
> are personal mobiles. Publishing one on a page 9,440 students can open would invite spam from day
> one, and on exam morning it would bury the one person holding the centre together — they are
> collecting papers, directing students to rooms, briefing invigilators and managing OMR sheets, and
> cannot also field 400 phone calls. This is pending a decision by the General Secretary. Leave it out.

Exam constants: 19 July 2026 · report by 10:00 · online 10:30–11:00 · 50 questions · 30 minutes ·
offline exam from 11:30 · one attempt only.

**Do not invent facts.** No negative marking, no calculator rules, no room numbers, no seat numbers —
we don't have them, and a confident wrong instruction is worse than a missing one.

---

## 5. Sections to design

### 5.1 Hero — "Hi Ayan!"
Greeting by first name (honorifics like *Md.* / *Sk.* are stripped; caps softened). Reassure in one
line: they are verified, they are enrolled, the date is X. A visible **"admit card verified"** trust
mark — this is the moment they learn the system knows who they are.

### 5.2 Live countdown
Currently a flat "6 days to go" box. Make it a **presence** — the emotional anchor of the page.
Days / hours / minutes, ticking. It should change character as it shrinks (days out = calm; hours
out = focused; minutes out = the waiting room).

### 5.3 Your exam
Unique ID (monospace — they will read it aloud to a teacher), class, the 10:30–11:00 window,
50 questions / 30 minutes, report-by 10:00, their school. And the one line that must land:
**your paper unlocks at 10:30 sharp, and can be taken once only.**

### 5.4 Your exam centre
Their *own* centre, resolved from their ID: code, district, name, full address, **Get Google
Directions** (routes from the student's live location) and **View on map**. Plus: *19 July is a
Sunday — buses and trains run a different timetable, so plan the journey in advance.*

### 5.5 What happens on exam day
A 4-step timeline: report by 10:00 → online exam 10:30–11:00 → **auto-submitted at 11:00 even if you
don't press Submit**, phones collected → offline written exam 11:30.

Call out prominently, because it is the #1 anxiety: **you can change any answer right up until you
submit. Nothing is locked in.**

### 5.6 Tips
Charge the phone. Data *or* Wi-Fi — and the exam keeps working if the signal drops. ~35 seconds per
question, so skip and return. Attempt everything.

---

## 6. New ideas to design in

These are the reason this page is worth designing properly. **Ideas 1 and 2 are the important ones** —
they turn exam-day disasters into problems solved today.

### Idea 1 — "Is my phone ready?" · a one-tap device check ⭐
A button that runs entirely in the browser and reports back in plain language:

- Is this browser modern enough to run the exam?
- **Is local storage writable?** ← *the killer check.* Private/incognito mode blocks it, and that is
  precisely what keeps a student's answers safe if their phone dies. If this fails they must be told
  **now**, not at 10:47.
- Are they online right now, and roughly how fast?
- Is the screen big enough to read a question comfortably?
- Battery level, where the browser exposes it — "charge before you leave home".

Design: a **card that transforms on tap** — from an invitation, to a brief scan, to a result. Design
all three states, plus the two outcomes: **all clear** (green, celebratory, a real moment of relief)
and **a problem found** (calm, specific, tells them exactly what to change). This is the single most
valuable thing on the page and should feel like it.

### Idea 2 — Practice test ⭐
Five sample questions, in **exactly the UI of the real exam** — same question card, same option
buttons, same timer, same submit flow. Unlimited attempts, nothing recorded, no score kept.

Its purpose is not revision. It is so that at 10:30 on exam day, **not one thing on the screen is new
to them.** Design the entry point (an inviting card, "Try a practice test — takes 2 minutes") and
the completion state ("You've seen it now. The real one works exactly like this.")

### Idea 3 — Add to your calendar
One tap → a calendar event with alarms the evening before and at 8:00 AM on the day. Google Calendar
and `.ics` for everything else.

### Idea 4 — Where to get help
A nervous child travelling somewhere unfamiliar needs to know who to turn to. But **not a phone
number** (see §4): route them to their **Head of School** and the **KIDS office**, and make clear
that on the day there will be a coordinator at the centre to help them. Design this as a calm,
confident "you will not be stranded" block — not a support-ticket form.

### Idea 5 — Exam-day checklist
Tickable, and it **remembers the ticks** (stored on their phone) so it persists between visits:
printed admit card · photo ID · phone charged · black or blue pen · I know my route.

### Idea 6 — Send my details to a parent
One tap to share centre name, address, date and reporting time via WhatsApp — the parent is usually
the one dropping them off, and they are not the one holding the admit card.

### Idea 7 — Save this page
Encourage "Add to Home Screen" so they can reopen the portal on exam morning **without hunting for
the card** — a one-tap icon on their phone. Design a subtle, dismissible prompt, not a nag.

### Idea 8 — FAQ
Quiet, collapsed by default, at the bottom. *What if my phone dies? What if my internet drops? What
if I can't scan the code? Can I use someone else's phone? What if I'm late?*

---

## 7. Constraints

- **Next.js 16 · React 19 · Tailwind v4 · TypeScript.** Use the existing KIDS design tokens
  (`primary`, `on-primary`, `surface`, `on-surface-variant`, `secondary`, `outline-variant`, …) and
  the existing serif/sans pairing. This page must look like it belongs to kidskolkata.org.
- **Performance is a hard requirement, not a nicety.** Cheap Android, 3G, at a school with 1,000
  other students on the same tower. Be extremely careful with heavy animation, large images and web
  fonts. Motion should be purposeful (the countdown, the readiness check) — not decorative
  everywhere.
- **Touch targets ≥ 44px.** Thumbs, in a hurry, possibly standing up.
- **Real accessibility**: strong contrast (this will be read in bright daylight in a school
  courtyard), sensible focus states, works at 200% text size, screen-reader labels.
- Consider **English as a second language** throughout: short sentences, plain words, meaning carried
  by icons and structure as well as by text. *(A Bengali/Hindi/Urdu toggle is a possible future
  addition — leave room for it in the header, but don't design it now.)*
- Deliver **desktop and mobile** for: the countdown state, the waiting room, and at least one error
  screen.

---

## 8. Anti-goals

- ❌ A dashboard. This is not an admin tool.
- ❌ Marketing gloss, stock photography, hero videos.
- ❌ Anything childish. They are teenagers sitting a serious exam.
- ❌ Any invented fact, rule or number (see §4).
- ❌ Decorative motion that costs a slow phone a single frame it can't spare.
- ❌ A narrow column stranded in the middle of a desktop screen. That's the bug we're fixing.

# Claude Design — Turn 8: The Coaching Programme

**For:** Claude Design · **From:** KIDS, Kolkata · **Date:** 7 September 2026

This is a brief for roughly twenty-five screens that do not exist yet. Please
read the premise first; it is not decoration, it is the whole design problem.

---

## 1. The premise: this replaces a residential coaching centre

The best coaching in India is residential. A child leaves home, lives in a
hostel for a year, and what they are actually buying is not better teaching —
it is **a day with a shape, and other people keeping it with them.** Someone
wakes them at 5:30. Someone notices when they don't come down. There is a room
where everyone is working at the same time, so working is the normal thing to be
doing.

KIDS cannot house 65 children. **This app has to do that job instead.**

So this is not a "course app" with a video list and a progress bar. Every screen
should be answerable to one question: *does this make a fifteen-year-old alone in
a room in Kidderpore feel like they are in a place with other people, following a
day that someone else is also following?*

The things a hostel gives that a video library does not:

- **A day with a shape** — wake, wash, meditate, read, class, homework, sleep,
  at hours somebody else decided.
- **Being noticed** — an absence is seen, and by a person.
- **Company** — other people doing the same thing at the same hour.
- **A place** — you go somewhere to study, and the going matters.
- **Ritual** — small repeated acts that are not academic and are not optional.

Design for those five. The teaching is the easy part.

---

## 2. Who this is actually for

- **65 students. 30 boys, 35 girls. Class X only.** They are the top of the SET
  2026 cohort of 7,320 who sat the written paper.
- **It runs 3–4 months**, not a school year. Everything should feel like a
  finite, intense, ending-soon programme. A student should always know how far
  through it they are.
- **They all attend an ordinary school during the day.** This is not full-time.
  It is early morning and evening — which makes the structure harder and more
  important, not less.
- **Vernacular medium.** The cohort is Bengali-, Hindi- and Urdu-medium. See §7.
- **Cheap Android phones on 3G**, often shared with a sibling or a parent.
- Some have never had anything that was theirs alone and exclusive. Being one
  of 65 chosen out of 7,320 matters to them. The design may say so — quietly,
  and never in a way that is cruel to the 7,255.

---

## 3. What already exists — please do not redesign it

The student app is **built and running** from Turns 1–7. Five tabs (settled as
artboard **2d**, Exam permanent), 360×760, and these screens are live code:

| built | what |
|---|---|
| 4a–4c | sign in, claim account, Learn tab, chapter browse |
| 2a–2k | the daily loop: five questions a day, per-option teardown, summary |
| 5a, 5d | My Record — now showing the full result view, both papers, OMR sheet |
| 7a, 7b | Profile, Notices |

**The coaching programme is a sixth thing** that has to live alongside those
without becoming a second app. Part of your job is telling us where it attaches:
a sixth tab, a takeover of the Home tab for the 65, something else. Argue it.

**Reuse rather than invent.** There is already a streak, already a daily set,
already a notices bell, already a chapter browser with videos. A second parallel
streak for "attended coaching" would be a design smell. Show us how the coaching
day absorbs the daily loop rather than competing with it.

---

## 4. Screens we need

### Student — phone, 360×760

**8a · The Day.** The centrepiece. A student's day as a vertical timeline of
blocks with times: wake, meditate, morning revision, school (a long dead zone —
design it honestly), evening study, live class, homework, wind down, sleep.
Blocks tick off. It must read as *today*, not as a settings screen. Show it in at
least three states: **6 a.m. untouched**, **mid-evening with the class about to
start**, and **11 p.m. with two things missed**. The missed state is the hardest
and most important screen in this brief — see §6.

**8b · Today's tasks.** What was assigned, by whom, due when. Distinguish a task
set by a teacher from a ritual set by the programme.

**8c · The ritual card.** Meditate, ten minutes. A non-academic block that must
not feel like homework. Timer? Breathing animation? Audio? Propose something —
this is the block most likely to be skipped and the one most worth keeping.

**8d–8f · The live class, three screens.**
- **Before:** it starts in 12 minutes. Who else has joined. What to have ready.
- **During:** the teacher on video; the student is **audio-off by default**;
  raise hand; chat; a live poll the teacher fires mid-class. See the hard
  constraint in §5 — do **not** draw a 65-person video grid.
- **After:** it ended, here is the recording, here is what was set.

**8g · Raise hand, and being called on.** A small screen with a lot riding on
it: the moment a student is unmuted in front of 64 peers. Design the queue, the
"you're next", and the "you're live now" state so it is not terrifying.

**8h · Homework: do and submit.** They will photograph a page of an exercise
book. Camera, retake, multiple pages, submit, "sent".

**8i · Homework: marked.** The teacher's remark and mark coming back. This
should feel like a person read it, not like a grade appeared.

**8j · Materials.** What the teacher has posted — notes, textbook photographs,
video links, suggestions. Needs to work as a growing pile over 4 months.

**8k · The room / who is here.** Presence. Fourteen others are studying right
now. This is the hostel-corridor feeling and it may be the single highest-value
screen in the brief. It must not become a leaderboard — see §6.

**8l · The programme.** Week 6 of 14. How far through, what is ahead, what
happens at the end.

**8m · Doubt box.** Asking a question outside class hours, and what "answered"
looks like.

**8n · Missed / falling behind.** Two days not opened. This screen decides
whether a child comes back or quietly stops. Not a guilt trip, not a cheerful
lie.

### Teacher — web, laptop, 1280+

Teachers sit at desks and never use the phone app. **This is a different surface
with a different shape — please do not simply widen the phone screens.**

**8o · Teacher dashboard.** Today's class, who has submitted, who has gone quiet.
The "who needs noticing" list is the point of this screen.

**8p · The batch.** 65 students. Attendance, submission and quiet-since at a
glance. Must survive being scanned in ten seconds before a class.

**8q · Publish.** Compose a post: notes, links, textbook images, an assignment
with a due date, to a whole batch.

**8r · Marking.** 65 photographed exercise books, one after another, fast. Mark,
remark, next. Speed is the entire design goal.

**8s · Hosting a class.** Teacher's controls: mute/unmute, the raise-hand queue,
fire a poll, start recording, end.

**8t · Build the day.** The teacher or the office sets the routine in §8a. What
is fixed for everyone, what a student may move.

### Two small ones we owe regardless

**8u · Update available.** The Android app is sideloaded from a link, so it
**never auto-updates**. A student on an old version needs to be told, on launch,
with a link. Small screen, high consequence.

**8v · A teacher clears a password.** The app tells students "your school can
reset your password" and no such screen exists. 1,061 of 9,714 students have no
date of birth on the register and cannot self-serve at all.

---

## 5. Hard constraints — these are technical facts, not preferences

Please design inside these. Each one is settled and expensive to break.

1. **Live video is self-hosted Jitsi, audio-first.** The teacher is on camera;
   students are muted with camera off by default; raise hand → the teacher
   unmutes one person. 65 open cameras is not a class, and it costs about ten
   times the server. **Never draw a video grid of students.**
2. **Recordings play as an embedded video after the fact**, in the app. The app
   already has a click-to-load embed pattern from the Learn tab — reuse it.
3. **No SMS anywhere, ever.** There is no gateway and no budget for one. No
   one-time codes, no text reminders. In-app and web push only.
4. **One account, one phone at a time.** Signing in elsewhere signs the first
   phone out. This is deliberate anti-sharing and may be surfaced.
5. **Screenshots are blocked only during a live exam**, nowhere else. A student
   may photograph their own marksheet.
6. **Notices are computed, never queued.** A notice is a fact about this
   student's own record, worked out when they look. Do not design anything that
   implies a message somebody sends and can un-send.
7. **Homework photos are private.** Do not design public galleries of children's
   work.
8. **They share the phone.** A sibling may open it. Sign-out is a first-class
   action and nothing should assume one child per device.
9. **3G, and a cheap handset.** Heavy animation and autoplaying video will not
   survive contact.

---

## 6. Interaction — what we want, and the two traps

Umar has asked for **maximum interaction**. We agree, with two hard limits.

**Wanted:**

- **Live polls mid-class.** Teacher fires a question, 65 answers arrive, a bar
  appears. Cheap to build, enormously engaging, and it tells the teacher who is
  actually there.
- **Raise hand and be unmuted.** The single most valuable interaction in the
  programme, because it is the one Meet-style broadcast cannot do.
- **Presence.** "Nineteen of your batch are studying now." Ambient, not
  competitive.
- **Reactions during class** — a fast, low-stakes way for 65 silent students to
  respond.
- **Ritual streaks** on the routine, reusing the existing streak, not a new one.
- **A physical anchor.** These children work in paper exercise books. The
  photograph-your-work loop is the bridge between the book and the app, and it
  should feel like handing something in.

**Trap 1 — do not build a leaderboard.** Ranking 65 named children publicly,
every day, in a group where everyone knows everyone, will damage the bottom
twenty and it will not motivate them. This programme already selected them by
rank; that is enough ranking. **Progress may be shown against a student's own
past self, or against an anonymous batch median. Never a named ladder.**

**Trap 2 — the missed-day screen must not lie or scold.** A child who missed two
days is the child most likely to leave. No cheerful "you've got this!", no red
crosses, no lost-streak drama. Design the way a good teacher speaks to a student
who did not come in: notice it, name it plainly, make returning easy.

If you want a third: **absence should be visible to the teacher before it is
visible to the student.** Being noticed by a person is the residential feature.
An automated nudge is not the same thing and should not pretend to be.

---

## 7. What we were short of last time

From Turn 2's review, still outstanding and now required:

- **Not one artboard has ever been in Bengali, Hindi or Urdu**, for a product
  whose entire cohort is vernacular-medium. We need the class screen and the
  task list with real Bengali strings, and at least one Urdu screen proving
  Nastaliq is not squashed.
- **A 320px pass.** Screens are drawn at 360; the cheapest phones are not.
- **Empty, failure and edge states**: no class scheduled, teacher hasn't posted,
  connection dropped mid-class, submission failed, joined late, phone rang.

---

## 8. Numbers — use these, invent nothing

**Real:** 65 students (30 boys, 35 girls), Class X, drawn from 7,320 who sat the
written paper across 112 schools. The programme runs 3–4 months. KIDS =
Kabitirtha Institute of Development & Studies, Kolkata; Reg. No. S/1L/19796;
82A/H/5, Dr. Sudhir Basu Road, Kolkata 700023. SET = Students Evaluation Test.

**Do not invent** an institutional identity, a motto, a founder, a fee, a
"success rate", or a testimonial. Do not name a real school in an example.

**Placeholder digits are fine and will not be corrected.** As ruled in Turn 6:
we read real figures from the codebase at build time and separate what a screen
*says* from the digits it shows. Get the sentence right; the numbers will be
wired.

---

## 9. Please argue these back at us

Where you disagree, present A/B artboards as you did in Turn 2 — that worked
well and the decisions were genuinely Umar's to make.

1. **Where does coaching attach?** Sixth tab, a takeover of Home for the 65, or
   a separate mode? Five tabs are settled and a sixth is a real cost.
2. **What is the shape of the day**, given they are at school 8–3:30? Is this a
   5:30 a.m. programme, a 7 p.m. programme, or both? Draw the one you believe.
3. **How prescriptive is the routine?** Fixed by the teacher for everyone, or a
   template each student adjusts? Argue it.
4. **Does the ritual block survive?** If you think meditation-at-6 a.m. will be
   ignored by 60 of 65, say so and propose what replaces it.
5. **What happens at the end of month four?** The programme stops. Design the
   ending — it is the screen nobody ever designs and every student reaches.

---

## 10. Deliverable

Same as previous turns: `.dc.html` artboards on one canvas, phone screens at
360×760, teacher screens at desktop width, using the existing **KIDS Design
System** file (maroon `#7B1E2B`, gold `#C9A24B`, teal, cream; Playfair Display
for display, Montserrat for body — the built product self-hosts these two and
adding a third family is another download on a 3G connection).

Priority if you cannot do it all: **8a The Day**, **8d–8f the live class**,
**8k the room**, and **8n missing days** first. Those four decide whether this
feels like a hostel or like a website.

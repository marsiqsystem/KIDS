# Design brief — the QR scanner page (`/qr`)

Companion to `portal-design-brief.md` and `exam-flow-design-brief.md`. This one covers a
**single page**: `kidskolkata.org/qr`, the scanner of last resort. A working but visually poor
version exists; treat it as a content inventory, **not** a design to refine.

Deliver a full visual design, **mobile-first** (this is a phone page, in a hand, standing up) with a
correct-but-secondary desktop rendering. It must look like it belongs to the SET portal.

---

## What this page is, and who is on it

`/qr` is the **shortest URL on the site** on purpose: a coordinator reads it aloud across a hall to
four hundred teenagers, and a student types it in. It exists for one reason — **the student's own
phone camera cannot scan a QR code.** Most modern Androids and every iPhone scan from the camera app;
the cheapest handsets can't, and their owners are exactly the students who can least afford to be
locked out on exam morning.

So everyone who reaches this page is **already having trouble** — nervous, possibly late, on the
worst phone in the room, in a noisy centre. That changes the emotional job:

> *"You're not stuck. This will work, or it will tell you clearly what to do next."*

The **error states are the whole point of this page**, not an afterthought — they are what a panicking
student actually sees. Every one of them must end in a **next step**, never a dead end. Tone: calm,
plain, reassuring; official but warm; never a raw error box.

The audience is the portal's: **~9,500 students, 14–18**, Bengali/Hindi/Urdu medium, many
first-generation exam-takers, cheap Android on mobile data. Short sentences, plain words, meaning
carried by icons and structure as much as text.

---

## The one behaviour that must survive the redesign (security)

This is a scanner that **never navigates to the URL it scans.** A scanner that opened whatever it
decoded would be a phishing gadget — tape a poster with a malicious QR to a wall and a child hands
over their session. Instead it pulls the `id` and token out of the code, checks they are the right
shape and that the code is a genuine `kidskolkata.org/portal` link, and only then opens **our own
portal**. Anything else is **refused out loud** (see the "rejected" state).

The design should quietly reinforce this trust: **"Nothing is recorded here — it simply opens your
own portal."** Do not add any feature that captures data, and do not design a generic "open link"
affordance.

---

## The design system to use (don't invent one)

Same tokens as the portal (`.portal` scope). Use them:

```
--maroon:#7b1e2b  --maroon-deep:#3d0a10  --maroon-light:#9a3340  --maroon-tint:#e8c9cc
--gold:#c9a24b    --gold-light:#e5be7a   --star-gold:#f4c12a
--teal:#1e9e8c    --teal-ink:#0d5248
--cream:#fdfbf7   --cream-surface:#fbf7ef --cream-muted:#f2e9da
--ink:#2b1a1c     --ink-muted:#6b5b5d
```

- **Display** = Playfair Display (headings only); **body** = Montserrat. No new web fonts.
- The **night-sky hero** — deep teal→green gradient (`#0c2a2e → #123a3b → #1e7e78`) with faint gold
  stars — caps the page, exactly as the portal's does.
- Body sits on `--cream`. Notices/errors use `--maroon-tint` on `#5e1420` text.
- **Touch targets ≥ 44px.** Strong daylight contrast (this is read in a courtyard). Real focus
  states, works at 200% text, screen-reader labels (the camera prompt and errors use `role="alert"`).
- **Motion is a cost** — a cheap phone is also running its camera here. Keep any scan animation
  minimal, and honour `prefers-reduced-motion`. Nothing decorative.

---

## The page, and its states

A short hero, then the scanner. **Hero:** heading **"Scan your admit card"**, one calming line —
*"For phones that can't scan a QR code on their own. Nothing is recorded here — it simply opens your
own portal."*

The scanner is a **square viewfinder** with a state below it. Design all **seven** states:

| # | State | What the student sees | Notes |
|---|---|---|---|
| 1 | **Idle** | Viewfinder placeholder with a scan icon + "Point your camera at the QR code printed on your admit card." A big primary button: **"Turn on camera"**. | Camera is requested only on tap — deliberate, so it isn't demanding permission before they've read anything. Design the button as the clear single action. |
| 2 | **Starting** | Same frame, "Starting the camera…" with a spinner. | Brief. |
| 3 | **Scanning** | **Live camera fills the square**, with a **gold reticle/frame** marking where to hold the card and the surround dimmed. Below: "Hold the card flat, about 15 cm away, in good light. It will open by itself." | The core state. The reticle is the guidance — make it obvious where the QR should sit. No shutter button; it reads continuously and opens on its own. |
| 4 | **Found** | Brief success: "Card recognised — opening your portal…" with a spinner. | The student barely sees this — it auto-navigates to `/portal`. Design it, but don't over-invest; it's a transition, not a destination. |
| 5 | **Rejected** | A calm notice: **"That is a QR code, but it is not a SET admit card. Scan the code printed on your own card."** The camera stays live so they can try again. | This fires when a real QR is read that isn't an admit-card link — the anti-phishing refusal. Firm, not alarming, not accusatory. |
| 6 | **Denied** | Camera permission was refused: "We could not use the camera. Allow camera access for this page in your settings and try again — or ask your exam coordinator to help you scan." | Give the next step. A "try again" affordance is welcome. |
| 7 | **Unsupported** | This browser can't scan at all: "This browser cannot scan QR codes. Open your phone's camera app and point it at the code on your card, or ask your exam coordinator for help." | The oldest phones land here. The next step must be genuinely usable. |

**Footer, on every state:** *"Can't get it to scan? Tell your exam coordinator straight away — do not
wait until 10:30."* Design it as calm reassurance, not fine print — this is the child's real safety
net (there is deliberately **no phone number** on any student-facing page; see the portal brief).

---

## Facts you may use (and none beyond these)

This page needs almost no data — it is a tool, not a record. It knows nothing about the student until
a card is scanned. Do **not** invent a student name, ID, centre, help-line number, or any status
here. Exam constants if you need them: online test 10:30–11:00 on 19 July 2026; offline from 11:30.

## Anti-goals

- ❌ Navigating to, or even displaying, an arbitrary scanned URL — this page only ever opens our own
  portal (see the security section).
- ❌ Any capture, upload, or "save" affordance — nothing is recorded here, and the design must not
  suggest otherwise.
- ❌ Raw red error boxes. The error states are the most important screens; they deserve real design.
- ❌ A dead end. Every state offers a next step (retry, use the camera app, or the coordinator).
- ❌ Childish styling, heavy imagery, or scan animations a cheap phone (already running its camera)
  can't spare.
- ❌ A phone number anywhere on the page.

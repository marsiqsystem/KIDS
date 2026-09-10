# The live-class server — a checklist

The KIDS coaching programme runs its live classes on **our own Jitsi server**,
not Google Meet. This file is the click-by-click for standing that server up.
Work through it in order; everything here is yours to do, and the app side is
built to meet it.

**Why not Meet:** there is no embed API, no way to mint join tokens and no
programmatic mute. Meet is a destination you send people to, and at that moment
you lose the roster, the exclusivity and the recording. A leaked Meet link *is*
access. A leaked link to our server is worthless — the server refuses anyone
without a signed token, and only the app mints them.

---

## What it costs — and how to know before you pay

**Oracle is out.** The Always Free tier was the plan and it was the right plan —
10 TB of egress a month, free forever. Our signup was refused **twice**, in September
2026, with Oracle's generic "an error occurred while creating your account",
and support never replied. Do not spend another evening on it,
and note that the **Oracle $300 trial is not a fallback** — it needs the same
signup that keeps refusing.

**Nothing else is free either, and it is worth knowing exactly why.** The
blocker is not CPU or memory, it is **egress** — the teacher's video has to be
sent out once per student:

| free tier | egress per month | how far it gets us |
| --- | --- | --- |
| Google Cloud always-free | **1 GB** | about two minutes of one class |
| AWS free tier (12 months) | **15 GB** | a quarter of one class |
| Azure free | credit for 30 days | not a term |
| Oracle always-free | 10 TB | would have been plenty — but refused |
| Jitsi's own hosted **JaaS** | free to **25 monthly users**; we have 66 | next tier ≈ ₹8,700/mo |

So this gets paid for. The good news is that it is small, and that **you can
prove it works for about ₹60 before committing to a single month.**

### Three different jobs — only one of them costs anything

The paid machine is for **65 students at once**. It is not for "having a
server", and most of the work never touches it. Do not pay for a stage you are
not at.

| stage | what it is | what it needs | cost |
| --- | --- | --- | --- |
| **Building the screens** | the join card, the refusals, scheduling, the console, attendance | **no video server at all** | **₹0** |
| **Two people in a room** | a teacher and one student, checking it works and the menus are right | Docker Jitsi on a laptop | **₹0** |
| **A real class** | 65 students, on their own phones, on mobile data | a proper machine in India | ₹620/mo up |

The middle row is the one that answers "do I need to pay to test?" — **no**. Two
people for an hour move about **1 GB**. Sixty-five for ninety minutes move about
**65 GB**. The bill exists because of the second number, and nothing in
development produces it.

The top row is worth noticing too: the app treats the video server as three
environment variables, so with none of them set every class screen still
renders. A teacher can schedule, open, end and cancel a class; a student sees
the card on Home and the honest refusal ("this has not started yet", "you are
not in this batch"). Only the room embed itself needs Jitsi to exist. Most of
what is left to build and check can be built and checked for nothing.

Two limits on the laptop stage, so they are not discovered late: a self-signed
certificate makes phone browsers complain (fine on the laptop itself, awkward on
a handset), and a laptop behind a home router cannot serve a real class. When
real phones over the real internet are needed, take an **hourly** box for that
session and destroy it after — a couple of hours is a few rupees, not a month.

### The three machines worth considering

All three carry far more bandwidth than the ~800 GB a month this needs, so
choose on price, location and **whether they bill by the hour**:

| | spec | price | India? | hourly? |
| --- | --- | --- | --- | --- |
| **Vultr** — Mumbai / Bangalore / Delhi | 4 GB / 2 vCPU | ~$20/mo (**≈₹2.4/hour**) | yes | **yes** |
| **DigitalOcean** — Bangalore | 4 GB / 2 vCPU | ~$24/mo | yes | **yes** |
| **Contabo** — Mumbai | 8 GB / 4 vCPU | ~$7/mo (**≈₹620**) + India location fee | yes | **no, monthly** |

**Contabo is the cheapest to run. Vultr is the cheapest to be sure with.** Take
Vultr for the proof because destroying the instance stops the meter the same
minute; move the whole install to Contabo afterwards if you want the lower bill,
which is an hour's work and no change to the app.

⚠️ Powering an instance *off* does not stop the charge on any of these. Only
**destroying** it does.

### Prove it before you pay for a month

Two stages, in this order. Do not skip to the second.

**Stage one — your own laptop, ₹0, no account, no card.** Docker Jitsi runs
locally:
<https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/>

That is enough to mint a token, join a room and settle the moderator question in
step 6 — the trap most likely to bite us. It is *not* enough to teach on: a
laptop behind a home router cannot serve 65 children. It answers "is the
software right", not "will it hold".

**Stage two — a real machine, for hours not months.** Take the Vultr box, work
through steps 2-7 below, run the whole of step 8, then **destroy it**. A full
day of this costs under ₹60. Only when step 8 passes end to end do you keep a
machine running and start paying by the month.

### What free must NOT mean

**Not `meet.jit.si`.** It is free, but it is 8x8's server with 8x8's auth, and it
will not accept our tokens. That throws away exclusivity, moderator control and
attendance — the entire reason we chose Jitsi over Meet.

---

## 1. Take the machine

**For the proof: Vultr, Mumbai.** <https://www.vultr.com/> — "Cloud Compute",
regular performance, **4 GB / 2 vCPU**, **Ubuntu 24.04 LTS**, Mumbai. Add your
SSH key when it asks, and write down the IP address.

**For the term, once it is proven: Contabo, Mumbai**, 8 GB / 4 vCPU. Same install
from step 2 onwards, at roughly a third of the price. Contabo bills monthly with
no hourly option, which is exactly why it is the second machine and not the
first.

⚠️ Whatever you take, **put the cancellation date in your diary the day you sign
up**, and destroy the proof machine the moment step 8 passes.

Sizing is set by one number: the teacher's video at ~1.5 Mbps out to 65 students
is **~100 Mbps sustained, ~65 GB per 90-minute class**, about 800 GB a month at
three classes a week. Every option in the table above carries at least 3 TB.
Students are **audio-only by default** — 65 open cameras is not a class, and it
costs roughly ten times the server.

## 2. Point the name at it

In the DNS for `kidskolkata.org`, add one record:

```
Type: A     Name: live     Value: <the VPS IP>     TTL: automatic
```

Wait until `ping live.kidskolkata.org` answers with that IP before going on.
The certificate step fails if DNS has not caught up.

## 3. Open the ports

In the provider's firewall, allow inbound:

```
22/tcp    SSH
80/tcp    HTTP   (Let's Encrypt needs it)
443/tcp   HTTPS
10000/udp MEDIA  ← the one everybody forgets. No audio or video without it.
```

## 4. Install Jitsi

Follow the official quick install — it is accurate and short:
<https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart/>

When the installer asks for the hostname, answer **`live.kidskolkata.org`**.
Choose the Let's Encrypt option when offered.

Then add the JWT package:

```bash
sudo apt install jitsi-meet-tokens
```

## 5. Lock it to our tokens

Generate a secret on the server and keep the output — it is the one value the
app and the server must agree on:

```bash
openssl rand -hex 32
```

In `/etc/prosody/conf.d/live.kidskolkata.org.cfg.lua`, under the main
VirtualHost:

```lua
authentication = "token"
app_id = "kids"
app_secret = "<the value from openssl>"
allow_empty_token = false
```

`allow_empty_token = false` is the whole point: no token, no entry.

## 6. Stop the server handing out moderator ⚠️

**Do not skip this.** By default Jitsi will make participants owners regardless
of what our token says — which would give all 65 students the power to mute,
kick and end your class. Two settings, both must be right:

In `/etc/jitsi/jicofo/jicofo.conf`:

```
jicofo {
  conference {
    enable-auto-owner = false
  }
}
```

In the Prosody config, make sure **`muc_allowners` is NOT in `modules_enabled`**.
If the line exists, delete it — that module makes every participant an owner.

And the flag our token sends has to be read by something. Add the plugin that
reads it to the same `modules_enabled` list:

```lua
"token_affiliation";
```

The app signs `context.user.moderator` inside the token — nested there, not as a
top-level claim, which Jitsi ignores silently. `token_affiliation` is what turns
that into actual ownership, and with `enable-auto-owner` off it is the *only*
thing that does.

Then restart all three:

```bash
sudo systemctl restart prosody jicofo jitsi-videobridge2
```

## 7. Tell me the secret

Send me the `app_secret` and I will put it in `.env.local` and in Vercel as
`KIDS_JITSI_SECRET`, alongside `KIDS_JITSI_DOMAIN=live.kidskolkata.org` and
`KIDS_JITSI_APP_ID=kids`. **Do not paste it into the repo** — it is public.

## 8. The test that actually matters

**This is the list that decides whether you pay for a month.** Every line has to
pass. Any one of them failing means the server config is wrong, not the code —
the app side is already verified against the database.

Work down it in order; the cheap ones first, so a failure costs minutes.

1. **The room refuses a stranger.** Open `https://live.kidskolkata.org/<room>`
   directly in a browser, with no token. It must refuse. If any room opens, the
   whole reason we chose Jitsi over Meet is gone.
2. **The room refuses a student before the teacher opens it.** No token is
   minted until "Open the room" is pressed, so joining early must fail.
3. **Two accounts in one room** — you as A-0001, and a student account. Both see
   and hear each other.
4. ⚠️ **The student has no mute-others, no kick, and no "end meeting"** in their
   menu. This is the one that has already been designed around twice; if it
   fails, step 6 did not take.
5. **Audio and video actually flow** — not just "connected". If the picture is
   frozen or silent, **UDP 10000 is closed** somewhere. Check both the provider's
   firewall *and* the machine's own `ufw`/`iptables`; the Ubuntu images block
   everything but 22 by default.
6. **On a real phone, on mobile data** — a ₹8,000 Android handset on 4G, not
   your laptop on wifi. That is what a student has, and it is the only test that
   represents them.
7. **It holds 65.** The only honest way to know is to load it. Jitsi's own tool
   does exactly this without needing 65 children:
   <https://github.com/jitsi/jitsi-meet-torture> ("malleus" runs many fake
   participants against a room). Watch CPU on the videobridge while it runs. If
   4 GB / 2 vCPU strains, this is the moment to find out — before the term, not
   during it.
8. **A rehearsal with real people.** Five or six students from the batch, for
   twenty minutes, on their own phones. Nothing simulated finds what this finds.

Only after 1-8 pass do you keep a machine running and start paying monthly.
Destroy the proof machine as soon as they do.

---

## When it breaks on the day

Do not engineer the outage away — plan for it. Keep an **unadvertised Google
Meet link** as the emergency fallback and give it out only if the server is
down. Losing one class to Meet is cheaper than building failover for a
programme that runs for three months.

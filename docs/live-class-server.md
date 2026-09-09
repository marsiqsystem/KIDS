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

## What it costs — start at zero

**Nothing here has to be paid for today.** The app side is provider-agnostic:
the server is three environment variables, so moving from a free box to a paid
one later is one DNS record and one env var, with no code change and no rework.
Take the free path, and buy only when a real class shows us it is needed.

| item | cost |
| --- | --- |
| Oracle Cloud **Always Free** — 2 OCPU / 12 GB, Mumbai | **₹0** |
| or a trial credit: Oracle $300/30d · DigitalOcean $200/60d · GCP $300/90d | **₹0 for most of the programme** |
| or a paid VPS, 4 GB / 2 vCPU, Mumbai or Bangalore | ₹1,100–2,100 / month |
| `live.kidskolkata.org` | **₹0** — a DNS record on a domain we already own |
| TLS certificate | **₹0** — Let's Encrypt, the installer does it |
| Recording | **₹0** — record locally, post unlisted to YouTube |

Sizing is set by one number: the teacher's video at ~1.5 Mbps out to 65 students
is **~100 Mbps sustained, ~65 GB per 90-minute class**, about 800 GB a month at
three classes a week. Oracle's free tier allows 10 TB of egress a month, so the
load fits inside it with room to spare. Students are **audio-only by default** —
65 open cameras is not a class, and it costs roughly ten times the server.

### What free must NOT mean

**Not `meet.jit.si`.** It is free, but it is 8x8's server with 8x8's auth, and it
will not accept our tokens. That throws away exclusivity, moderator control and
attendance — the entire reason we chose Jitsi over Meet. Managed **JaaS** fails
the same test on price: the free tier is 25 monthly active users and we have 66,
which lands us on the $99/mo tier, about ₹8,700 — four times a paid VPS.

---

## 1. Take the machine

**First choice — Oracle Cloud Always Free.** <https://www.oracle.com/cloud/free/>
Create the account (a card is required for identity, not billing), set the home
region to **Mumbai**, and launch a VM with the **`VM.Standard.A1.Flex`** shape at
**2 OCPU / 12 GB**, Ubuntu 24.04 (arm64 — Jitsi packages exist for it).

Two things to know. The A1 shape is often **"out of host capacity"**; if Mumbai
refuses, try again later in the day rather than switching to a paid box. And
Oracle **reclaims Always Free instances that sit idle**, which a three-classes-a-
week machine could trip — a trivial cron that keeps it busy is enough to avoid it.

**Second choice — a trial credit.** DigitalOcean (Bangalore), Vultr (Mumbai) or
Akamai/Linode (Mumbai), 4 GB / 2 vCPU, Ubuntu 24.04 LTS. ⚠️ Trials auto-convert
to paid — put the cancellation date in your diary the day you sign up.

**Only if both disappoint in a real class**, take the paid VPS at ₹1,100–2,100/mo
and cancel it when the programme ends.

Whichever you take: add your SSH key when it asks, and write down the IP address.

### Before any of that — test it on your own laptop

You do not need a server to prove the important thing works. Docker Jitsi runs
locally, free, no account:
<https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/>

That is enough to mint a token, join a room and run the step-8 moderator test.
It is not enough to teach on — a laptop behind a home router cannot serve 65
children — but it finds the trap in step 6 before any money is involved.

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
If the line exists, delete it.

Then restart all three:

```bash
sudo systemctl restart prosody jicofo jitsi-videobridge2
```

## 7. Tell me the secret

Send me the `app_secret` and I will put it in `.env.local` and in Vercel as
`KIDS_JITSI_SECRET`, alongside `KIDS_JITSI_DOMAIN=live.kidskolkata.org` and
`KIDS_JITSI_APP_ID=kids`. **Do not paste it into the repo** — it is public.

## 8. The test that actually matters

Once the app side is up we join the same room twice: once as you, once as a
student account. The student must have **no mute, no kick and no "end meeting"**
in their menu. If they do, step 6 did not take, and we find that now rather than
in front of 65 children.

---

## When it breaks on the day

Do not engineer the outage away — plan for it. Keep an **unadvertised Google
Meet link** as the emergency fallback and give it out only if the server is
down. Losing one class to Meet is cheaper than building failover for a
programme that runs for three months.

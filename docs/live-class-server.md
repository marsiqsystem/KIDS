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

## What it costs

| item | cost |
| --- | --- |
| VPS, 4 GB / 2 vCPU, Mumbai or Bangalore | **₹1,100–2,100 / month** |
| `live.kidskolkata.org` | **₹0** — a DNS record on a domain we already own |
| TLS certificate | **₹0** — Let's Encrypt, the installer does it |
| Recording | **₹0** — record locally, post unlisted to YouTube |

**₹4,500–8,500 for the whole 3–4 month programme.** Cancel the VPS when it ends.

Sizing is set by one number: the teacher's video at ~1.5 Mbps out to 65 students
is **~100 Mbps sustained, ~65 GB per 90-minute class**, about 800 GB a month at
three classes a week. Any of the providers below include several TB. Students
are **audio-only by default** — 65 open cameras is not a class, and it costs
roughly ten times the server.

---

## 1. Take the VPS

Pick one, region **Mumbai** or **Bangalore** (latency matters; a European
server adds ~150 ms to every exchange with a child in Kolkata):

* DigitalOcean — Bangalore — <https://www.digitalocean.com/pricing/droplets>
* Vultr — Mumbai — <https://www.vultr.com/pricing/>
* Akamai / Linode — Mumbai — <https://www.linode.com/pricing/>

Choose **Ubuntu 24.04 LTS**, **4 GB RAM, 2 vCPU**. Add your SSH key when it asks.
Write down the IP address it gives you.

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

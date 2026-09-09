import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Join tokens for the live class.
 *
 * The coaching programme's classes run on our own Jitsi server, and this file
 * is the reason that was worth doing. Google Meet has no embed API, no way to
 * mint join tokens and no programmatic mute: a Meet link *is* access, so a
 * child who forwards it to a friend has given away a seat we cannot take back.
 *
 * Here the link is worthless on its own. The server is configured with
 * `allow_empty_token = false`, so it refuses anybody who does not present a
 * token signed with a secret that exists only on the server and in this
 * process. A forwarded link admits nobody, and a student who is not in the
 * batch cannot be issued one.
 *
 * Everything about which server is a matter of configuration — three
 * environment variables — so the programme can start on a free machine and
 * move to a paid one without a line of this changing.
 */

/** Where the class is served from, e.g. `live.kidskolkata.org`. */
const DOMAIN = process.env.KIDS_JITSI_DOMAIN ?? "";
/** Must equal `app_id` in the server's Prosody config. */
const APP_ID = process.env.KIDS_JITSI_APP_ID ?? "kids";
/** Must equal `app_secret` there. Never in the repo — the repo is public. */
const SECRET = process.env.KIDS_JITSI_SECRET ?? "";

/**
 * Whether a class can be joined at all.
 *
 * Checked before a teacher is offered a Start button, so the failure is a
 * sentence on a screen rather than a room that will not open with 65 children
 * waiting in it.
 */
export function liveConfigured(): boolean {
  return Boolean(DOMAIN && SECRET);
}

export function liveDomain(): string {
  return DOMAIN;
}

/**
 * A room name nobody can guess.
 *
 * Not the security boundary — the token is — but a room called
 * `kids-class-x-2026-09-12` is one a child can type into any public Jitsi and
 * sit in on their own, or worse, one an outsider can find. There is no reason
 * to publish a name, so we do not.
 */
export function newRoomName(): string {
  return `kids-${randomBytes(9).toString("hex")}`;
}

export interface TokenSubject {
  /** Stable identity for the audit: a student UID or a staff ID. */
  id: string;
  name: string;
  /**
   * Teachers only.
   *
   * ⚠️ This flag is a REQUEST, not a guarantee. Jitsi hands out ownership on
   * its own unless the server is configured not to — `enable-auto-owner` in
   * jicofo and the `muc_allowners` module both do it, regardless of what is
   * signed here. Left alone, every student in the class gets mute, kick and
   * end-meeting over their own teacher. See docs/live-class-server.md §6, and
   * test it with two accounts before a real class.
   */
  moderator: boolean;
}

/**
 * Sign a join token for one person and one room.
 *
 * HS256 by hand rather than a JWT library: it is a header, a payload and one
 * HMAC, and this codebase already signs the QR tokens the same way. One fewer
 * dependency in a public repo is worth more than the convenience.
 */
export function mintToken(room: string, who: TokenSubject, minutes = 180): string {
  if (!liveConfigured()) {
    throw new Error(
      "The live class server is not configured. Set KIDS_JITSI_DOMAIN and KIDS_JITSI_SECRET.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: APP_ID,
    iss: APP_ID,
    sub: DOMAIN,
    room,
    // Long enough to cover a 90-minute class and a late arrival, short enough
    // that a token copied out of a phone is dead by the next one.
    exp: now + minutes * 60,
    // Backdated a little: a handset whose clock is a minute fast is otherwise
    // refused, and the child has no idea why.
    nbf: now - 60,
    context: {
      user: {
        id: who.id,
        name: who.name,
        // The field Prosody's token_affiliation plugin reads. NOT a top-level
        // "moderator" claim, which is silently ignored.
        moderator: who.moderator,
      },
      // Recording and streaming stay with the teacher. Jibri is not installed
      // — the teacher records locally — but a student should not be offered a
      // button that implies otherwise.
      features: {
        recording: who.moderator,
        livestreaming: who.moderator,
        transcription: false,
        "outbound-call": false,
      },
    },
  };

  const b64 = (o: object) => base64url(Buffer.from(JSON.stringify(o)));
  const signed = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  const mac = createHmac("sha256", SECRET).update(signed).digest();

  return `${signed}.${base64url(mac)}`;
}

/**
 * Verify a token we issued.
 *
 * Not needed to join — the Jitsi server does that check itself — but it is how
 * the test in docs/live-class-server.md §8 proves the secret on the server and
 * the secret here are the same one, without waiting for 65 children to find
 * out that they are not.
 */
export function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const expected = createHmac("sha256", SECRET)
    .update(`${parts[0]}.${parts[1]}`)
    .digest();
  const given = Buffer.from(parts[2], "base64url");

  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(given, expected)) return null;

  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as {
    exp?: number;
  };
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload as Record<string, unknown>;
}

function base64url(b: Buffer): string {
  return b.toString("base64url");
}

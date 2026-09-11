import { createSign } from "node:crypto";
import { sql } from "@/lib/exam/db";

/**
 * Push notifications to the Android app, over Firebase Cloud Messaging.
 *
 * ## Why FCM and not web push
 *
 * The obvious answer was a service worker and VAPID, and it does not work here.
 * The app is a Capacitor shell around a WebView, and **Android's System WebView
 * has no Push API** — no service-worker push, and nothing to wake when the app
 * is closed. A web-push subscription simply never exists inside the APK. So a
 * push that reaches the 65 students in a coaching batch has to arrive natively,
 * which on Android means FCM. (The website and an iPhone home-screen PWA are
 * the opposite case and would need web push; neither is built, because neither
 * is where the batch is.)
 *
 * ## What is pushed, and what is not
 *
 * A notice list is computed when a student looks at it — five kinds, four of
 * them facts about their own record (src/lib/app/notices.ts). A push is the
 * opposite: it is a send, and a send needs a moment to fire at. Exactly two
 * moments qualify, and they are the two this module is called from:
 *
 *   * a **post** is written in the control centre, and
 *   * a **class is opened** by its teacher.
 *
 * The other three notices are states, not events. "Your results are published"
 * and "today's set is waiting" have no instant at which something happened to
 * one student, and pushing them would mean a scheduled job deciding on 9,714
 * students' behalf what is new. That job is not here and should not be added
 * without a reason better than symmetry.
 *
 * ## Failure is silent and must stay that way
 *
 * A push is a courtesy. The notice is already in the app and will be there
 * whether or not this works, so nothing here may ever fail the action that
 * called it: a post that was written must be written even if Firebase is down,
 * and a class that was opened must open even if every token is stale. Every
 * entry point returns a count and throws nothing.
 *
 * With `KIDS_FCM_SERVICE_ACCOUNT` unset — which is the state until Firebase
 * exists — every function here no-ops and returns 0. That is deliberate: the
 * whole feature is inert rather than broken before it is configured.
 */

/** What a student's phone is told. Deliberately small: FCM caps a message ~4 KB. */
export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping it should land, as a path under the app. */
  path: string;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/**
 * The Firebase service account, as the whole JSON in one environment variable.
 *
 * One variable rather than three, because the private key is a multi-line PEM
 * and splitting the account across variables is how one of them ends up
 * belonging to a different project. Vercel stores it fine; the newlines inside
 * the key survive JSON.parse.
 */
function serviceAccount(): ServiceAccount | null {
  const raw = process.env.KIDS_FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed as ServiceAccount;
  } catch {
    // A malformed value is a deployment mistake, not a runtime condition. Say
    // so once in the log and behave exactly as if it were unset.
    console.error("KIDS_FCM_SERVICE_ACCOUNT is set but is not valid JSON; push is off.");
    return null;
  }
}

export function pushConfigured(): boolean {
  return serviceAccount() !== null;
}

const base64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * An OAuth2 access token for FCM, minted from the service account.
 *
 * Google's own JWT-bearer flow, done by hand rather than with the Firebase
 * Admin SDK: the SDK is 60 MB of dependency for one signed assertion and one
 * POST, and it pulls gRPC into a serverless function that has no use for it.
 * `createSign` is in node:crypto and the assertion is nine lines.
 */
let cached: { token: string; expires: number } | null = null;

async function accessToken(account: ServiceAccount): Promise<string | null> {
  // A minute of headroom: a token that expires mid-flight fails the send, and
  // the send is not retried.
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput =
    `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claim))}`;

  let assertion: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(signingInput);
    assertion = `${signingInput}.${base64url(signer.sign(account.private_key))}`;
  } catch (err) {
    console.error("Push: could not sign the FCM assertion.", err);
    return null;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    console.error(`Push: FCM refused the assertion (${res.status}).`, await res.text());
    return null;
  }
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;

  cached = {
    token: body.access_token,
    expires: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

/**
 * Remember the token this installation was given.
 *
 * It goes on `app_devices`, the row that already exists for this phone, rather
 * than in a table of its own — a registration token identifies an installation,
 * which is precisely what that row is. It also means the device rule and the
 * push list can never disagree about which phones an account has: a student who
 * moves to a second phone stops being reachable on the first at the moment the
 * account moves, without a second thing to remember to clear.
 *
 * The token is rewritten whenever Firebase issues a new one, which it does on
 * reinstall and occasionally on its own. `push_failed_at` is cleared with it:
 * a fresh token is a fresh chance.
 */
export async function registerPushToken(
  uid: string,
  deviceId: string,
  token: string,
): Promise<void> {
  const clean = token.trim();
  // FCM tokens are long opaque strings. The check is a sanity bound, not a
  // format claim — the format is Google's and has changed before.
  if (clean.length < 32 || clean.length > 4096) return;

  await sql`
    update app_devices
       set push_token = ${clean},
           push_token_at = now(),
           push_failed_at = null
     where uid = ${uid} and device_id = ${deviceId}
  `;
}

/** Stop pushing to a phone — the student turned notifications off. */
export async function forgetPushToken(uid: string, deviceId: string): Promise<void> {
  await sql`
    update app_devices set push_token = null, push_token_at = null
     where uid = ${uid} and device_id = ${deviceId}
  `;
}

interface Target {
  uid: string;
  device_id: string;
  push_token: string;
}

/**
 * The phones to send to, for a set of students.
 *
 * Only the phone the account is currently bound to. An account that has moved
 * to a new handset must not have its notices arriving on the old one — that is
 * the same rule `requireStudent()` enforces on every page, and a push is not
 * allowed to be the one place it does not hold.
 */
async function targetsFor(uids: string[]): Promise<Target[]> {
  if (uids.length === 0) return [];
  return (await sql`
    select d.uid, d.device_id, d.push_token
      from app_devices d
      join app_accounts a on a.uid = d.uid and a.current_device_id = d.device_id
     where d.uid = any(${uids}::char(9)[])
       and d.push_token is not null
       and d.push_failed_at is null
  `) as Target[];
}

/** FCM's answer to a token it no longer knows. These are retired, not retried. */
const DEAD = new Set(["UNREGISTERED", "INVALID_ARGUMENT", "NOT_FOUND", "SENDER_ID_MISMATCH"]);

async function sendOne(
  projectId: string,
  bearer: string,
  target: Target,
  message: PushMessage,
): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token: target.push_token,
          notification: { title: message.title, body: message.body },
          // Read by the app when the student taps the notification, to open the
          // screen it is about rather than wherever they last were.
          data: { path: message.path },
          android: {
            priority: "high",
            notification: {
              // Android 8+ requires a channel; this one is created by the app
              // on first run. Without it the notification is silently dropped.
              channel_id: "kids-notices",
              default_sound: true,
            },
          },
        },
      }),
    },
  );

  if (res.ok) return true;

  const text = await res.text();
  if (DEAD.has(/"status"\s*:\s*"([A-Z_]+)"/.exec(text)?.[1] ?? "") || res.status === 404) {
    // Stamped, not nulled: `push_failed_at` says a token was there and stopped
    // working, which is a different fact from a phone that never registered,
    // and the difference is what tells us whether push is reaching anybody.
    await sql`
      update app_devices set push_failed_at = now()
       where uid = ${target.uid} and device_id = ${target.device_id}
    `;
    return false;
  }

  console.error(`Push: FCM returned ${res.status} for ${target.uid}.`, text);
  return false;
}

/**
 * Send to a list of students. Returns how many phones actually took it.
 *
 * FCM's v1 API sends to one token per request — there is no multicast on the
 * wire; the Admin SDK's `sendEachForMulticast` is a loop in the client. So this
 * is a loop too, in slices, so that 65 students do not open 65 sockets at once
 * against a serverless function with a request budget.
 */
export async function sendToStudents(uids: string[], message: PushMessage): Promise<number> {
  const account = serviceAccount();
  if (!account) return 0;

  const targets = await targetsFor([...new Set(uids)]);
  if (targets.length === 0) return 0;

  const bearer = await accessToken(account);
  if (!bearer) return 0;

  let delivered = 0;
  const SLICE = 10;
  for (let i = 0; i < targets.length; i += SLICE) {
    const results = await Promise.allSettled(
      targets.slice(i, i + SLICE).map((t) => sendOne(account.project_id, bearer, t, message)),
    );
    delivered += results.filter((r) => r.status === "fulfilled" && r.value).length;
  }
  return delivered;
}

/** Everyone currently in a batch. */
export async function sendToBatch(batchId: string, message: PushMessage): Promise<number> {
  if (!pushConfigured()) return 0;
  const rows = (await sql`
    select uid from admin_batch_members
     where batch_id = ${batchId}::bigint and removed_at is null
  `) as { uid: string }[];
  return sendToStudents(rows.map((r) => r.uid), message);
}

/** Every student with a claimed account. Only for a post addressed to all. */
export async function sendToAll(message: PushMessage): Promise<number> {
  if (!pushConfigured()) return 0;
  const rows = (await sql`
    select d.uid from app_devices d
     join app_accounts a on a.uid = d.uid and a.current_device_id = d.device_id
    where d.push_token is not null and d.push_failed_at is null
  `) as { uid: string }[];
  return sendToStudents(rows.map((r) => r.uid), message);
}

/**
 * One line of a notification body, from a post's own words.
 *
 * A post body can be several paragraphs; a notification shows two lines and
 * truncates the rest wherever it likes. Cutting it here, on a word, means the
 * student reads a sentence rather than half of one.
 */
export function oneLine(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

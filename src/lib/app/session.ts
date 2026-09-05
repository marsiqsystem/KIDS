import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The student app's session.
 *
 * Stateless: a signed cookie carrying a User ID and an expiry, and nothing
 * else. No session table, no lookup on every page.
 *
 * That is a cost decision as much as a design one. Neon bills compute hours,
 * the project has no budget, and /admin's 12-second poll once burned 110 CU
 * hours on its own. A session row read on every navigation of a daily-use app
 * is the same mistake with more children attached to it.
 *
 * The consequence, stated plainly because it will matter later: signing out on
 * one phone cannot invalidate a session on another, and changing a password
 * does not kill sessions already issued. Both are acceptable for a study app;
 * neither would be acceptable for the exam, which is why the exam keeps its own
 * per-request gate (src/lib/exam/api-gate.ts) and does not use this at all.
 */

const COOKIE = "kids_app";
const MAX_AGE_DAYS = 60;

/**
 * A long session, on purpose.
 *
 * A student on a shared handset who is signed out every week will stop coming
 * back; the daily loop only works if opening the app costs nothing. Sign-out is
 * therefore a first-class, deliberate action in the Profile tab (design 7a)
 * rather than something that happens to people silently.
 */
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.KIDS_APP_SECRET?.trim();
  if (!value) {
    throw new Error(
      "KIDS_APP_SECRET is not set — student app sessions cannot be signed. " +
        "Generate one with `openssl rand -hex 32` and add it to .env.local and Vercel.",
    );
  }
  return value;
}

/**
 * `<uid>.<expiryMs>.<signature>`.
 *
 * The expiry is inside the signed payload, not just in the cookie's own
 * Max-Age. A cookie's lifetime is enforced by the browser and the browser
 * belongs to the student; the signature's is enforced here.
 */
function sign(payload: string): string {
  return createHmac("sha256", Buffer.from(secret(), "ascii"))
    .update(payload, "ascii")
    .digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload), "ascii");
  const given = Buffer.from(signature, "ascii");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export async function createSession(uid: string): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_MS;
  const payload = `${uid}.${expiresAt}`;
  const store = await cookies();

  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    // Off on localhost, where there is no https and the cookie would be dropped.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** The signed-in student's User ID, or null. Verifies the signature and the expiry. */
export async function sessionUid(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const cut = raw.lastIndexOf(".");
  if (cut < 0) return null;

  const payload = raw.slice(0, cut);
  if (!verify(payload, raw.slice(cut + 1))) return null;

  const [uid, expiresAt] = payload.split(".");
  if (!/^\d{9}$/.test(uid ?? "")) return null;
  if (!Number(expiresAt) || Number(expiresAt) < Date.now()) return null;

  return uid;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

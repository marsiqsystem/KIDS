import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A link to one attached file that works without the app's cookie.
 *
 * Why it exists: inside the Android app, a PDF or a Word file cannot be shown —
 * a WebView has no document viewer — so the app hands the link to the phone
 * (MainActivity's download listener), and whatever opens it there has never
 * seen the student's session. The link therefore carries its own proof:
 * which file, for which student, until when, signed with KIDS_APP_SECRET.
 *
 * It proves nothing more than that. The route still asks, on every request,
 * whether that student may see the post right now — so a link to a post that
 * has since been taken down, or one for a batch the child has left, opens
 * nothing even inside its two hours. A link forwarded to a friend works for
 * those two hours at most, which is the price of the phone's own PDF viewer.
 */

const LIFETIME_MS = 2 * 60 * 60 * 1000;

function key(): Buffer {
  const value = process.env.KIDS_APP_SECRET;
  if (!value || value.length < 32) throw new Error("KIDS_APP_SECRET is not set.");
  return Buffer.from(value, "ascii");
}

function sign(payload: string): string {
  // "file." keeps these signatures from ever being valid as a session cookie,
  // which is signed with the same secret over a different shape.
  return createHmac("sha256", key()).update(`file.${payload}`, "ascii").digest("base64url");
}

/** `/app/files/<id>?t=<uid>.<expiry>.<signature>` */
export function fileHref(fileId: string, uid: string, now = Date.now()): string {
  const payload = `${fileId}.${uid}.${now + LIFETIME_MS}`;
  const token = `${uid}.${now + LIFETIME_MS}.${sign(payload)}`;
  return `/app/files/${fileId}?t=${encodeURIComponent(token)}`;
}

/** The student a link was issued to, if it is genuine, for this file, and in date. */
export function uidFromFileToken(fileId: string, token: string | null): string | null {
  if (!token) return null;
  const [uid, expiry, signature] = token.split(".");
  if (!uid || !expiry || !signature) return null;
  if (!/^\d{9}$/.test(uid) || !(Number(expiry) > Date.now())) return null;

  const expected = Buffer.from(sign(`${fileId}.${uid}.${expiry}`), "ascii");
  const given = Buffer.from(signature, "ascii");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return uid;
}

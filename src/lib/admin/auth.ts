import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The gate for /admin — a single shared key, held in the environment.
 *
 * The raw key NEVER rides in a cookie. The cookie carries only its SHA-256, and
 * every request recomputes that hash from the env key and compares in constant
 * time. So: rotating `KIDS_ADMIN_KEY` invalidates every live session at once,
 * and a stolen cookie cannot be reversed into the key. There are no per-user
 * accounts by design — this is a two-person org watching one exam, not a product.
 */

export const ADMIN_COOKIE = "kids_admin";
/** Twelve hours: long enough to watch a whole exam morning, short enough to expire by evening. */
export const ADMIN_MAX_AGE = 60 * 60 * 12;

function adminKey(): string | null {
  const k = process.env.KIDS_ADMIN_KEY?.trim();
  return k ? k : null;
}

function sha256(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

/** True only if the admin key is configured at all — a bare deployment has no way in. */
export function adminConfigured(): boolean {
  return adminKey() !== null;
}

/** The opaque session value stored in the cookie: the key's hash, hex-encoded. */
export function sessionToken(): string | null {
  const k = adminKey();
  return k ? sha256(k).toString("hex") : null;
}

/** Constant-time check of a submitted key against the configured one. */
export function keyIsValid(given: string): boolean {
  const k = adminKey();
  if (!k) return false;
  return timingSafeEqual(sha256(k), sha256(String(given ?? "")));
}

/** Is the current request carrying a valid admin session cookie? */
export async function isAdmin(): Promise<boolean> {
  const expected = sessionToken();
  if (!expected) return false;
  try {
    const value = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(value, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

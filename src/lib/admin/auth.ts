import { createHash, timingSafeEqual } from "node:crypto";

/**
 * KIDS_ADMIN_KEY — now a bootstrap credential, and nothing else.
 *
 * This file used to be the whole gate for /admin: one shared key in the
 * environment, a cookie carrying its hash, no per-user accounts "by design —
 * this is a two-person org watching one exam, not a product".
 *
 * That reasoning was sound for what /admin was. It watched an exam morning and
 * the worst a stolen key could do was show somebody numbers. The control centre
 * that replaced it creates teacher accounts and moves children between batches,
 * and the question "who did that?" cannot be answered by a key that everybody
 * shares — every audit row would say `admin`. So sign-in moved to named staff
 * accounts (src/lib/admin/staff.ts) with sessions in src/lib/admin/session.ts.
 *
 * One job is left, and it is a real one: a database with no admin in it has no
 * way to make the first admin. The key opens that door once. After the first
 * account exists, hasAnyAdmin() is true and the bootstrap screen is gone.
 *
 * Rotating the key is therefore safe at any time — it signs no sessions and
 * locks nobody out.
 */

function adminKey(): string | null {
  const k = process.env.KIDS_ADMIN_KEY?.trim();
  return k ? k : null;
}

function sha256(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

/** True only if the bootstrap key is configured. A bare deployment cannot bootstrap. */
export function adminConfigured(): boolean {
  return adminKey() !== null;
}

/** Constant-time check of a submitted key against the configured one. */
export function keyIsValid(given: string): boolean {
  const k = adminKey();
  if (!k) return false;
  // Hashed first so both sides are a fixed 32 bytes: timingSafeEqual throws on
  // a length mismatch, and that throw would itself leak the key's length.
  return timingSafeEqual(sha256(k), sha256(String(given ?? "")));
}

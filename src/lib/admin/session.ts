import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findStaff, type Role, type Staff } from "@/lib/admin/staff";

/**
 * The control centre's session.
 *
 * A signed cookie carrying a Staff ID and an expiry, like the student app's —
 * but with one deliberate difference, and it is worth being explicit about why.
 *
 * src/lib/app/session.ts is *stateless on purpose*: it never reads a row, so a
 * daily-use app for 9,714 children costs no Neon compute per navigation, and
 * the price paid is that signing out on one phone cannot invalidate another.
 * For a study app that is an acceptable trade.
 *
 * It is not acceptable here. "Switch off this teacher's account" has to mean
 * today, not within twelve hours, and there are perhaps twenty staff rather
 * than ten thousand children — so one indexed primary-key read per admin page
 * load is a rounding error against the quota, not a repeat of the 12-second
 * poll that once burned 110 CU hours. So: the signature proves who, and the
 * row decides whether they may still come in.
 */

const COOKIE = "kids_staff";

/**
 * Twelve hours, inherited from the shared key's session. An office login that
 * lasts a working day and is gone by morning; nobody has to remember to sign
 * out of a shared desktop.
 */
const MAX_AGE_MS = 60 * 60 * 12 * 1000;

/**
 * Signed with KIDS_APP_SECRET, not KIDS_ADMIN_KEY.
 *
 * The two keys now do different jobs and must not be conflated: KIDS_ADMIN_KEY
 * is a bootstrap credential a person types, and rotating it must not sign
 * every member of staff out. KIDS_APP_SECRET is a signing key nobody types.
 */
function secret(): string {
  const value = process.env.KIDS_APP_SECRET?.trim();
  if (!value) {
    throw new Error(
      "KIDS_APP_SECRET is not set — staff sessions cannot be signed. " +
        "Generate one with `openssl rand -hex 32` and add it to .env.local and Vercel.",
    );
  }
  return value;
}

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

export async function createStaffSession(staffId: string): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_MS;
  const payload = `${staffId}.${expiresAt}`;
  const store = await cookies();

  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    /**
     * Site-wide, not scoped to /admin — because /stage and /api/stage/publish
     * are admin-gated too, and a cookie scoped to /admin is simply not sent to
     * them. Scoping it tighter would silently lock the operator out of the
     * publish screen on the one night it matters.
     */
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroyStaffSession(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/" });
}

/** The Staff ID the cookie asserts, once signature and expiry check out. */
async function claimedStaffId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const cut = raw.lastIndexOf(".");
  if (cut < 0) return null;

  const payload = raw.slice(0, cut);
  if (!verify(payload, raw.slice(cut + 1))) return null;

  const [staffId, expirySegment] = payload.split(".");
  if (!staffId || !/^[AT]-\d{4}$/.test(staffId)) return null;
  if (!Number(expirySegment) || Number(expirySegment) < Date.now()) return null;

  return staffId;
}

/**
 * Who is signed in, or null.
 *
 * The row read is the revocation check: a disabled account is refused on its
 * very next request, however long its cookie has left to run.
 */
export async function currentStaff(): Promise<Staff | null> {
  const staffId = await claimedStaffId();
  if (!staffId) return null;

  const staff = await findStaff(staffId);
  if (!staff || staff.disabled_at) return null;
  return staff;
}

/** True when the signed-in person may change things, not merely look at them. */
export function isAdminRole(staff: Staff | null): boolean {
  return staff?.role === "admin";
}

/**
 * The gate every write in the control centre goes through.
 *
 * Throws rather than returning null: a server action that forgets to check gets
 * an exception, not a silent write performed as `undefined`.
 */
export async function requireStaff(role?: Role): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) throw new Error("Not signed in.");
  if (role && staff.role !== role) throw new Error("You do not have permission to do that.");
  return staff;
}

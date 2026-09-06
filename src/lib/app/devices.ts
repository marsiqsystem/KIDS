import { sql, type Student } from "@/lib/exam/db";
import { logAppEvent } from "@/lib/app/accounts";

/**
 * Which phone is this?
 *
 * Phase 0, and the reason it exists is a specific failure. On 3 August a family
 * disputed a result on the grounds that somebody else had typed their
 * daughter's paper after her portal link was shared. The dispute was
 * unanswerable — `attempts.device_hash` and `attempts.ip` are NULL on all 7,322
 * rows, because nothing had ever written to them. There was no query that could
 * be run. This file is that gap closed on the door, where it costs nothing and
 * catches the sharing before an exam is ever involved.
 *
 * What a device id is, stated plainly so nobody later mistakes it for more:
 * 32 hex characters the phone generates for itself on first run and keeps in
 * its own storage. It identifies an *installation*. It is not a fingerprint, it
 * survives no reinstall, and a student who clears the app's data becomes a new
 * device. It cannot prove who was holding the phone. What it can do — and what
 * NULL could never do — is show that one account was opened on four handsets in
 * a week, and say which one answered a given question.
 *
 * The rule it enforces: an account is bound to one phone at a time. Signing in
 * elsewhere moves the binding and the old phone falls out at its next page
 * load. A password passed round a classroom therefore stops working for the
 * child who gave it away, which is the only deterrent that has ever worked.
 */

/** 32 hex characters. Anything else came from something that is not our client. */
const SHAPE = /^[0-9a-f]{32}$/;

export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && SHAPE.test(value);
}

/**
 * Normalise whatever arrived on the form. Returns null rather than throwing:
 * a missing or malformed device id must never be the reason a child cannot
 * sign in — it degrades to an unbound session, exactly as things were before
 * this file existed, and is recorded as such.
 */
export function readDeviceId(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return isDeviceId(raw) ? raw : null;
}

/**
 * A phrase a fourteen-year-old recognises on the Profile screen.
 *
 * Deliberately coarse. "Android phone" is useful — it is either theirs or it is
 * not. A version string is noise, and a precise model would make this a
 * tracking record rather than a safety one.
 */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "Unknown device";
  if (ua.includes("kids-app")) return "The KIDS app";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("iphone") || ua.includes("ios")) return "iPhone";
  if (ua.includes("android")) return ua.includes("mobile") ? "Android phone" : "Android tablet";
  if (ua.includes("windows")) return "Windows computer";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "Mac";
  if (ua.includes("linux")) return "Linux computer";
  return "Unknown device";
}

export interface DeviceRow {
  device_id: string;
  first_seen_at: Date;
  last_seen_at: Date;
  sign_ins: number;
  label: string | null;
  is_current: boolean;
}

/**
 * Record that this account has just been opened on this phone, and bind it.
 *
 * Returns what changed, because the caller has to tell the student. Being
 * silently signed out on your own phone because a cousin typed your password is
 * precisely the event that has to be visible.
 *
 * Never throws. Device binding is a safety net over the top of the password,
 * and a net that drops people through the floor when the database hiccups is
 * worse than no net. Every failure degrades to "signed in, unbound".
 */
export async function bindDevice(
  uid: string,
  deviceId: string | null,
  userAgent: string | null,
): Promise<{ bound: boolean; displaced: boolean; firstTime: boolean }> {
  if (!deviceId) {
    await logAppEvent(uid, "device_missing");
    return { bound: false, displaced: false, firstTime: false };
  }

  try {
    const previous = (await sql`
      select current_device_id from app_accounts where uid = ${uid}
    `) as { current_device_id: string | null }[];

    const before = previous[0]?.current_device_id ?? null;
    const displaced = before !== null && before !== deviceId;

    const rows = (await sql`
      insert into app_devices (uid, device_id, label, user_agent)
      values (${uid}, ${deviceId}, ${describeDevice(userAgent)}, ${userAgent})
      on conflict (uid, device_id) do update
        set last_seen_at = now(),
            sign_ins     = app_devices.sign_ins + 1,
            label        = excluded.label,
            user_agent   = excluded.user_agent
      returning sign_ins
    `) as { sign_ins: number }[];

    await sql`
      update app_accounts set current_device_id = ${deviceId} where uid = ${uid}
    `;

    const firstTime = (rows[0]?.sign_ins ?? 1) === 1;

    // The event, not the id. app_events is read by people, and a raw device id
    // in a support conversation is noise; the count and the displacement are
    // the facts that answer "did somebody else open my account".
    if (displaced) await logAppEvent(uid, "device_changed", { from: before, to: deviceId });
    else if (firstTime) await logAppEvent(uid, "device_new", { device: deviceId });

    return { bound: true, displaced, firstTime };
  } catch {
    await logAppEvent(uid, "device_error");
    return { bound: false, displaced: false, firstTime: false };
  }
}

/**
 * The student behind a session, together with the phone their account is bound
 * to — in ONE query.
 *
 * This is the whole reason enforcement is affordable. `requireStudent()` was
 * already doing an indexed lookup on `students` for every page; folding
 * `app_accounts.current_device_id` into that same statement as a left join adds
 * a column, not a round trip. Neon bills compute hours and /admin's 12-second
 * poll once cost 110 of them, so a second query per navigation of a daily-use
 * app was never going to be acceptable. See the note in session.ts.
 *
 * A left join, not an inner one: `students` remains the register of who exists,
 * and a student with no `app_accounts` row has simply never claimed.
 */
export async function findStudentForSession(
  uid: string,
): Promise<{ student: Student; boundTo: string | null } | null> {
  const rows = (await sql`
    select s.uid, s.name, s.class, s.stream, s.school_code, s.school_name,
           s.centre_code, s.centre_name, s.dob, s.is_demo,
           coalesce(s.medium, '') as medium,
           a.current_device_id
      from students s
      left join app_accounts a on a.uid = s.uid
     where s.uid = ${uid}
  `) as (Student & { current_device_id: string | null })[];

  const row = rows[0];
  if (!row) return null;

  const { current_device_id, ...student } = row;
  return { student, boundTo: current_device_id };
}

/** Every phone this account has been opened on, most recent first. Profile, design 7a. */
export async function listDevices(uid: string): Promise<DeviceRow[]> {
  return (await sql`
    select d.device_id, d.first_seen_at, d.last_seen_at, d.sign_ins, d.label,
           (d.device_id = a.current_device_id) as is_current
      from app_devices d
      left join app_accounts a on a.uid = d.uid
     where d.uid = ${uid}
     order by d.last_seen_at desc
  `) as DeviceRow[];
}

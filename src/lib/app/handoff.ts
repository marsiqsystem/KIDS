import { randomBytes } from "node:crypto";
import { sql, findStudent } from "@/lib/exam/db";
import { findAccount, logAppEvent } from "@/lib/app/accounts";
import { hashPassword } from "@/lib/app/passwords";

/**
 * The office says yes, and the phone that asked lets itself in.
 *
 * Before this, an approval in the control centre ended in a password: printed on
 * a sheet for a school, or read out from the Students tab to a child on the
 * phone. That is one person passing a secret to another, ten thousand times,
 * and it was the part Umar said could not be done at the size of the register
 * (25 September 2026).
 *
 * So the request remembers the installation that made it -- the same 32-hex id
 * that device binding already uses (src/lib/app/devices.ts) -- and approval is
 * the whole transaction. The next time that phone asks, it is handed a session.
 * Nothing is typed, read out, printed or sent.
 *
 * Two queues feed it, one table each:
 *
 *   app_registrations     a new child the office has put on the register
 *   app_account_requests  a child already on it who cannot get in -- no date of
 *                         birth to claim with, or a forgotten password
 *
 * Three properties it keeps:
 *
 *   1. ONE USE. `opened_at` is set in the same statement that finds the approval,
 *      so two taps, two tabs or a replayed request can open it once. A used
 *      approval is inert.
 *   2. NO KNOWN PASSWORD. The account is given a long random password that is
 *      hashed and thrown away, and `must_change`, so the first screen after the
 *      handoff asks the child to choose their own. Until they do, the phone they
 *      are holding is the only way in -- which is exactly the situation the
 *      approval described.
 *   3. THE PHONE IS BOUND. The session is issued for the requesting device, and
 *      the account is moved to it, so a reset approved for a child's new phone
 *      signs the old one out, as every other sign-in does.
 *
 * What the device id is not: a secret anyone else can see. It lives in the
 * app's own storage and leaves the phone only in our own form posts. Somebody
 * who could read it could already read the session cookie beside it.
 */

export type DoorStatus =
  | { state: "none" }
  /** An approval is waiting to be used on this phone. */
  | { state: "ready"; uid: string }
  | {
      state: "waiting";
      /** Registration waits on its own screen; this covers the other queue. */
      kind: "claim" | "reset";
      uid: string;
      typedName: string;
      requestedAt: Date;
    }
  | { state: "refused"; kind: "claim" | "reset"; uid: string; reason: string | null; decidedAt: Date };

/**
 * What, if anything, this phone is waiting for.
 *
 * Two indexed lookups on device_id. Called when a door screen opens, when the
 * app comes back to the foreground, and every half minute while something is
 * actually pending -- never on a timer when nothing is.
 */
export async function doorStatus(deviceId: string): Promise<DoorStatus> {
  const [reg] = (await sql`
    select r.uid
      from app_registrations r
     where r.device_id = ${deviceId} and r.status = 'approved'
       and r.opened_at is null and r.uid is not null
       and not exists (select 1 from app_accounts a where a.uid = r.uid)
     order by r.decided_at desc
     limit 1
  `) as { uid: string }[];
  if (reg) return { state: "ready", uid: reg.uid };

  const [req] = (await sql`
    select uid, kind, typed_name, status, requested_at, decided_at, reason, opened_at
      from app_account_requests
     where device_id = ${deviceId}
     order by requested_at desc
     limit 1
  `) as {
    uid: string;
    kind: "claim" | "reset";
    typed_name: string;
    status: string;
    requested_at: Date;
    decided_at: Date | null;
    reason: string | null;
    opened_at: Date | null;
  }[];
  if (!req) return { state: "none" };

  if (req.status === "pending") {
    return { state: "waiting", kind: req.kind, uid: req.uid, typedName: req.typed_name, requestedAt: req.requested_at };
  }
  if (req.status === "approved" && !req.opened_at) return { state: "ready", uid: req.uid };
  if (req.status === "rejected" && req.decided_at) {
    return { state: "refused", kind: req.kind, uid: req.uid, reason: req.reason, decidedAt: req.decided_at };
  }
  return { state: "none" };
}

/**
 * Use this phone's approval, if it has one. Returns the UID to issue a session
 * for, or null when there is nothing (or nothing left) to use.
 *
 * The caller -- a server action -- binds the device and sets the cookie. This
 * only decides, once, whether it may.
 */
export async function takeHandoff(deviceId: string): Promise<{ uid: string; via: "registration" | "claim" | "reset" } | null> {
  // Registration first: a phone that registered has no other business here.
  const [reg] = (await sql`
    update app_registrations r
       set opened_at = now()
     where r.id = (
             select id from app_registrations
              where device_id = ${deviceId} and status = 'approved'
                and opened_at is null and uid is not null
              order by decided_at desc
              limit 1
           )
       and r.opened_at is null
       and not exists (select 1 from app_accounts a where a.uid = r.uid)
     returning r.uid
  `) as { uid: string }[];
  if (reg) {
    await openWithUnknownPassword(reg.uid, "registration");
    return { uid: reg.uid, via: "registration" };
  }

  const [req] = (await sql`
    update app_account_requests q
       set opened_at = now()
     where q.id = (
             select id from app_account_requests
              where device_id = ${deviceId} and status = 'approved' and opened_at is null
              order by decided_at desc
              limit 1
           )
       and q.opened_at is null
     returning q.uid, q.kind
  `) as { uid: string; kind: "claim" | "reset" }[];
  if (req) {
    await openWithUnknownPassword(req.uid, req.kind);
    return { uid: req.uid, via: req.kind };
  }

  return null;
}

/**
 * Create the account, or clear a forgotten one, with a password nobody knows.
 *
 * The same upsert resetAppPassword() uses at the office counter, minus the part
 * where somebody is shown the password: here there is nobody to show it to,
 * because the session is the handover.
 */
async function openWithUnknownPassword(uid: string, via: "registration" | "claim" | "reset"): Promise<void> {
  const hash = await hashPassword(randomBytes(24).toString("base64url"));
  await sql`
    insert into app_accounts (uid, password_hash, must_change)
    values (${uid}, ${hash}, true)
    on conflict (uid) do update
      set password_hash   = ${hash},
          password_set_at = now(),
          must_change     = true,
          failed_attempts = 0,
          locked_until    = null
  `;
  await logAppEvent(uid, via === "reset" ? "password_set" : "claim", { via: `approved_${via}` });
}

/* --------------------------------------------------------------- asking --- */

export type Asked =
  | { ok: true }
  | { ok: false; reason: "unknown_id"; uid: string }
  | { ok: false; reason: "no_device" }
  | { ok: false; reason: "name" }
  | { ok: false; reason: "father" };

/**
 * "Ask KIDS to open my account" -- filed from the phone that will use it.
 *
 * Whether it is a claim or a reset is decided here from the database, not asked
 * of the child: a child who cannot remember whether they ever set a password is
 * the ordinary case, not an edge one.
 *
 * A second request from the same phone replaces the first (withdrawn), so a
 * child who mistyped their name can simply send it again.
 */
export async function askToOpen(input: {
  uid: string;
  typedName: string;
  fatherName: string;
  guardianPhone: string | null;
  /** DD-MM-YYYY as typed on the claim screen, when the child came from there. */
  typedDob?: string | null;
  deviceId: string | null;
}): Promise<Asked> {
  if (!input.deviceId) return { ok: false, reason: "no_device" };
  const name = input.typedName.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 120) return { ok: false, reason: "name" };
  const father = input.fatherName.replace(/\s+/g, " ").trim();
  if (father.length < 2 || father.length > 120) return { ok: false, reason: "father" };

  const student = await findStudent(input.uid);
  if (!student) {
    await logAppEvent(input.uid, "unknown_id", { at: "ask" });
    return { ok: false, reason: "unknown_id", uid: input.uid };
  }

  const kind = (await findAccount(input.uid)) ? "reset" : "claim";

  await sql`
    update app_account_requests set status = 'withdrawn'
     where device_id = ${input.deviceId} and status = 'pending'
  `;
  await sql`
    insert into app_account_requests
      (uid, kind, typed_name, father_name, guardian_phone, typed_dob, device_id)
    values
      (${input.uid}, ${kind}, ${name}, ${father}, ${input.guardianPhone?.slice(0, 20) || null},
       ${input.typedDob || null}, ${input.deviceId})
  `;
  await logAppEvent(input.uid, "open_requested", { kind });
  return { ok: true };
}

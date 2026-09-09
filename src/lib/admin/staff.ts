import { randomInt } from "node:crypto";
import { sql } from "@/lib/exam/db";
import { hashPassword, verifyPassword } from "@/lib/app/passwords";

/**
 * The people who run the programme.
 *
 * This replaces the shared KIDS_ADMIN_KEY as the way into /admin. The key
 * itself is not gone — see auth.ts — but it now does exactly one thing:
 * create the first admin on a database that has none. Everything after that is
 * a named person, because the control centre can move a child between batches
 * and "who did that" has to have an answer that is not the word `admin`.
 *
 * Every function here that changes something writes an admin_events row. That
 * is not belt-and-braces: it is the entire reason named accounts exist.
 */

/** Three wrong passwords, then fifteen minutes — the same rule the children get. */
const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

export type Role = "admin" | "teacher";

export interface Staff {
  staff_id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  must_change: boolean;
  failed_attempts: number;
  locked_until: Date | null;
  last_sign_in_at: Date | null;
  created_at: Date;
  created_by: string | null;
  disabled_at: Date | null;
}

/* ------------------------------------------------------------- the audit --- */

export async function logAdminEvent(
  actor: string,
  action: string,
  target?: { kind: "staff" | "batch" | "student"; id: string },
  detail?: Record<string, unknown>,
): Promise<void> {
  await sql`
    insert into admin_events (actor, action, target_kind, target_id, detail)
    values (${actor}, ${action}, ${target?.kind ?? null}, ${target?.id ?? null},
            ${detail ? JSON.stringify(detail) : null})
  `;
}

export interface AuditRow {
  id: string;
  at: Date;
  actor: string;
  actor_name: string | null;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
}

/**
 * The audit trail, newest first.
 *
 * Joined to admin_staff for a readable name, but left-joined and falling back
 * to the raw id: an event must still render after the person who caused it has
 * been disabled, and 'bootstrap' names no row at all.
 */
export async function recentEvents(limit = 100): Promise<AuditRow[]> {
  return (await sql`
    select e.id::text, e.at, e.actor, s.full_name as actor_name,
           e.action, e.target_kind, e.target_id, e.detail
      from admin_events e
      left join admin_staff s on s.staff_id = e.actor
     order by e.at desc
     limit ${limit}
  `) as AuditRow[];
}

/* ------------------------------------------------------------- accounts --- */

/**
 * The next free id for a role: A-0001 for the office, T-0001 for a teacher.
 *
 * Derived from the highest existing number rather than a sequence, so the two
 * roles number independently and a gap left by a disabled account is not
 * reused — reusing T-0004 would silently attach a departed teacher's audit
 * rows to a new person.
 */
export async function nextStaffId(role: Role): Promise<string> {
  const prefix = role === "admin" ? "A" : "T";
  const rows = (await sql`
    select coalesce(max(substring(staff_id from 3)::int), 0) as n
      from admin_staff
     where staff_id like ${prefix + "-%"}
       and substring(staff_id from 3) ~ '^[0-9]+$'
  `) as { n: number }[];
  return `${prefix}-${String((rows[0]?.n ?? 0) + 1).padStart(4, "0")}`;
}

/**
 * A password to read down a phone or write on a slip.
 *
 * Digits and uppercase letters with I, O, 0 and 1 left out, because this gets
 * dictated aloud and "was that an oh or a zero" is the failure that wastes a
 * teacher's afternoon. Ten characters from a 32-symbol alphabet is ~50 bits,
 * which is far beyond guessing for something that must be changed on first use
 * anyway. randomInt, not Math.random — this is a credential.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function oneTimePassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export async function findStaff(staffId: string): Promise<Staff | null> {
  const rows = (await sql`
    select staff_id, full_name, role, phone, must_change, failed_attempts,
           locked_until, last_sign_in_at, created_at, created_by, disabled_at
      from admin_staff
     where staff_id = ${staffId.trim().toUpperCase()}
  `) as Staff[];
  return rows[0] ?? null;
}

export interface StaffListRow extends Staff {
  /** Live batches this person currently takes. Zero for an admin, normally. */
  batch_count: number;
}

export async function listStaff(role?: Role): Promise<StaffListRow[]> {
  return (await sql`
    select s.staff_id, s.full_name, s.role, s.phone, s.must_change,
           s.failed_attempts, s.locked_until, s.last_sign_in_at,
           s.created_at, s.created_by, s.disabled_at,
           (select count(*)::int
              from admin_batch_teachers bt
              join admin_batches b on b.id = bt.batch_id
             where bt.staff_id = s.staff_id
               and bt.removed_at is null
               and b.archived_at is null) as batch_count
      from admin_staff s
     where (${role ?? null}::text is null or s.role = ${role ?? null}::text)
     order by s.disabled_at nulls first, s.role, s.staff_id
  `) as StaffListRow[];
}

/**
 * Create a member of staff and hand back the password to give them.
 *
 * The plaintext is returned to the caller exactly once and stored nowhere. The
 * screen shows it once; if it is lost, an admin resets it and a new one is
 * issued. That is a deliberate refusal to build a "show me their password"
 * feature, which is the thing that makes a password database worth stealing.
 */
export async function createStaff(input: {
  fullName: string;
  role: Role;
  phone?: string | null;
  by: string;
}): Promise<{ staffId: string; password: string }> {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error("A name is required.");

  const staffId = await nextStaffId(input.role);
  const password = oneTimePassword();

  await sql`
    insert into admin_staff (staff_id, full_name, role, password_hash, phone,
                             must_change, created_by)
    values (${staffId}, ${fullName}, ${input.role}, ${await hashPassword(password)},
            ${input.phone?.trim() || null}, true, ${input.by})
  `;

  await logAdminEvent(input.by, "staff_created", { kind: "staff", id: staffId }, {
    role: input.role,
    name: fullName,
  });

  return { staffId, password };
}

/** Issue a fresh one-time password. The old one stops working immediately. */
export async function resetStaffPassword(staffId: string, by: string): Promise<string> {
  const password = oneTimePassword();
  const rows = (await sql`
    update admin_staff
       set password_hash = ${await hashPassword(password)},
           must_change = true,
           failed_attempts = 0,
           locked_until = null
     where staff_id = ${staffId}
    returning staff_id
  `) as { staff_id: string }[];

  if (!rows[0]) throw new Error("No such member of staff.");
  await logAdminEvent(by, "password_reset", { kind: "staff", id: staffId });
  return password;
}

/** The password a person chooses for themselves, replacing a one-time one. */
export async function setOwnPassword(staffId: string, password: string): Promise<void> {
  await sql`
    update admin_staff
       set password_hash = ${await hashPassword(password)},
           must_change = false,
           failed_attempts = 0,
           locked_until = null
     where staff_id = ${staffId}
  `;
  await logAdminEvent(staffId, "password_set", { kind: "staff", id: staffId });
}

/**
 * Disabling, never deleting.
 *
 * A deleted teacher would take their audit rows' meaning with them, and the
 * foreign keys on admin_batches.created_by would refuse the delete anyway. This
 * is the honest version of what the office actually means by "remove".
 */
export async function setStaffDisabled(
  staffId: string,
  disabled: boolean,
  by: string,
): Promise<void> {
  await sql`
    update admin_staff
       set disabled_at = ${disabled ? new Date() : null},
           disabled_by = ${disabled ? by : null},
           failed_attempts = 0,
           locked_until = null
     where staff_id = ${staffId}
  `;
  await logAdminEvent(by, disabled ? "staff_disabled" : "staff_enabled", {
    kind: "staff",
    id: staffId,
  });
}

/* --------------------------------------------------------------- signing in --- */

export type SignInResult =
  | { ok: true; staff: Staff }
  | { ok: false; message: string; field: "staffId" | "password" };

/**
 * Check a staff sign-in.
 *
 * Unlike the student door, a wrong id and a wrong password read the SAME here.
 * That is the opposite of design 4a and it is deliberate: the student rule
 * exists so a child on a shared handset realises they are in their sister's
 * account, and there is no equivalent good reason to confirm to a stranger that
 * T-0006 is a real teacher.
 */
export async function signInStaff(staffId: string, password: string): Promise<SignInResult> {
  const wrong = {
    ok: false as const,
    message: "That Staff ID and password do not match.",
    field: "password" as const,
  };

  const staff = await findStaff(staffId);
  if (!staff) return wrong;

  if (staff.disabled_at) {
    return {
      ok: false,
      message: "This account has been switched off. Ask the KIDS office.",
      field: "staffId",
    };
  }

  if (staff.locked_until && staff.locked_until.getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((staff.locked_until.getTime() - Date.now()) / 60000));
    return {
      ok: false,
      message: `Too many wrong tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      field: "password",
    };
  }

  const rows = (await sql`
    select password_hash from admin_staff where staff_id = ${staff.staff_id}
  `) as { password_hash: string }[];

  if (!(await verifyPassword(password, rows[0]?.password_hash ?? ""))) {
    const attempts = staff.failed_attempts + 1;
    const lock = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;

    await sql`
      update admin_staff
         set failed_attempts = ${lock ? 0 : attempts}, locked_until = ${lock}
       where staff_id = ${staff.staff_id}
    `;
    await logAdminEvent(staff.staff_id, lock ? "locked" : "bad_password", {
      kind: "staff",
      id: staff.staff_id,
    });
    return wrong;
  }

  await sql`
    update admin_staff
       set failed_attempts = 0, locked_until = null, last_sign_in_at = now()
     where staff_id = ${staff.staff_id}
  `;
  await logAdminEvent(staff.staff_id, "signin", { kind: "staff", id: staff.staff_id });

  return { ok: true, staff: { ...staff, failed_attempts: 0, locked_until: null } };
}

/** Is there any admin at all? Decides whether the bootstrap door is open. */
export async function hasAnyAdmin(): Promise<boolean> {
  const rows = (await sql`
    select 1 as there from admin_staff
     where role = 'admin' and disabled_at is null limit 1
  `) as { there: number }[];
  return rows.length > 0;
}

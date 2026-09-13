import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "./staff";

/**
 * Working the applications queue, and minting a UID.
 *
 * This file contains the only code in the project that has ever created a
 * student. Every one of the 9,652 UIDs before it came from build_seed.py and
 * the master workbook, outside this repo. That history is the reason for how
 * carefully the minting below is written.
 */

export interface PendingRow {
  id: string;
  name: string;
  dob: string;
  class: string;
  stream: string | null;
  centre_code: string;
  school_code: string;
  school_name: string;
  guardian_phone: string | null;
  applied_at: Date;
  possible_duplicates: string[];
  /**
   * The existing students the duplicate guard matched, resolved to something a
   * person can judge. A bare UID is no use to the office at 4 pm with thirty
   * applications open; "a name · class X · the same school" decides it at a glance.
   */
  duplicates: { uid: string; name: string; class: string; school_name: string }[];
}

/**
 * The queue, newest school-group first.
 *
 * Grouped by school in the caller rather than here: applications arrive in
 * school-shaped clumps and the office checks them that way, thirty at a time
 * against a list the school sent.
 */
export async function pendingRegistrations(limit = 500): Promise<PendingRow[]> {
  return (await sql`
    select r.id::text, r.name, r.dob, r.class, r.stream, r.centre_code, r.school_code,
           r.school_name, r.guardian_phone, r.applied_at, r.possible_duplicates,
           coalesce((
             select json_agg(json_build_object(
                      'uid', s.uid, 'name', s.name, 'class', s.class,
                      'school_name', s.school_name) order by s.uid)
               from students s
              where s.uid in (select jsonb_array_elements_text(r.possible_duplicates))
           ), '[]'::json) as duplicates
      from app_registrations r
     where r.status = 'pending'
     order by r.centre_code, r.school_code, r.applied_at
     limit ${limit}
  `) as PendingRow[];
}

/**
 * How many applications are waiting.
 *
 * Shown on the tab itself, because an inbox nobody knows has anything in it is
 * an inbox nobody opens. One count against a partial index that holds only the
 * pending rows, so it stays cheap however many thousand have been decided.
 */
export async function pendingCount(): Promise<number> {
  const [r] = (await sql`
    select count(*)::int as n from app_registrations where status = 'pending'
  `) as { n: number }[];
  return r?.n ?? 0;
}

export interface DecidedRow {
  id: string;
  name: string;
  class: string;
  school_name: string;
  status: "approved" | "rejected";
  uid: string | null;
  reason: string | null;
  decided_at: Date;
  decided_by: string | null;
  decided_by_name: string | null;
}

/**
 * What was decided most recently, and by whom.
 *
 * So the office can see what the last click did -- and so a second person
 * sitting down at the queue can see what the first one already approved before
 * wondering where half the list went.
 */
export async function recentDecisions(limit = 25): Promise<DecidedRow[]> {
  return (await sql`
    select r.id::text, r.name, r.class, r.school_name, r.status, r.uid, r.reason,
           r.decided_at, r.decided_by, st.full_name as decided_by_name
      from app_registrations r
      left join admin_staff st on st.staff_id = r.decided_by
     where r.status in ('approved', 'rejected')
     order by r.decided_at desc
     limit ${limit}
  `) as DecidedRow[];
}

/**
 * Mint the next UID for a school.
 *
 * A UID is District(1) + Centre(2) + School(2) + GlobalSeq(4). Only the last
 * four count up, and they count up ACROSS THE WHOLE REGISTER, not within a
 * school.
 *
 * The first five digits are COPIED from a student who already sits at that
 * school rather than rebuilt from the codes. Checked against all 9,652 rows on
 * 13 September 2026: the district digit is constant for every centre, digits
 * 2-3 always equal the last two of `centre_code`, and digits 4-5 are constant
 * for every (centre_code, school_code) pair -- no exceptions anywhere. So
 * copying reproduces build_seed.py's rule exactly, and cannot drift from it the
 * way a second implementation of the rule eventually would.
 *
 * The counter is a row, not `max(right(uid,4)) + 1`. Two approvals a second
 * apart would read the same maximum and mint the same UID; `update … returning`
 * takes a row lock, so the database serialises what two people in an office
 * cannot.
 */
export async function mintUid(centreCode: string, schoolCode: string): Promise<string> {
  const [sibling] = (await sql`
    select left(uid, 5) as prefix from students
     where centre_code = ${centreCode} and school_code = ${schoolCode} and not is_demo
     limit 1
  `) as { prefix: string }[];

  if (!sibling) {
    // A school with no students cannot have its prefix copied, and guessing one
    // would put a child at an address that does not exist. The office adds the
    // school to the master workbook first; that is where schools come from.
    throw new Error(
      `No existing student at ${centreCode}/${schoolCode}, so no UID prefix to follow. ` +
        `Add the school to the master workbook and reseed before approving this application.`,
    );
  }

  const [seq] = (await sql`
    update uid_sequence set next = next + 1, updated_at = now()
     where id = true
     returning next - 1 as issued
  `) as { issued: number }[];

  if (!seq) throw new Error("uid_sequence has no row — cannot mint a UID.");
  if (seq.issued > 9999) throw new Error("UID sequence has run past 9999.");

  return `${sibling.prefix}${String(seq.issued).padStart(4, "0")}`;
}

export type Approval =
  | { ok: true; uid: string }
  | { ok: false; reason: "not_pending" }
  | { ok: false; reason: "no_prefix"; detail: string };

/**
 * Approve an application: mint the UID, write the student, close the row.
 *
 * Deliberately NOT wrapped in one transaction, because the HTTP driver cannot
 * give us one -- so the order is chosen to be safe if it stops half way. The
 * sequence is consumed first, then the student is written, then the application
 * is marked approved. A crash between steps costs at worst one skipped UID
 * number, which is harmless; the alternative ordering risks an approved
 * application with no student behind it, which is not.
 *
 * `students` is otherwise still read-only from /admin. This is the single
 * exception and it only ever INSERTS -- a correction to an existing student
 * still belongs in the master workbook, or the next reseed reverts it.
 */
export async function approveRegistration(id: string, staffId: string): Promise<Approval> {
  const [reg] = (await sql`
    select id::text, name, dob, class, stream, centre_code, school_code, school_name
      from app_registrations
     where id = ${id}::bigint and status = 'pending'
  `) as PendingRow[];
  if (!reg) return { ok: false, reason: "not_pending" };

  let uid: string;
  try {
    uid = await mintUid(reg.centre_code, reg.school_code);
  } catch (e) {
    return { ok: false, reason: "no_prefix", detail: (e as Error).message };
  }

  const [centre] = (await sql`
    select centre_name from students
     where centre_code = ${reg.centre_code} and not is_demo limit 1
  `) as { centre_name: string }[];

  await sql`
    insert into students
      (uid, name, class, stream, school_code, school_name,
       centre_code, centre_name, dob, is_demo)
    values
      (${uid}, ${reg.name}, ${reg.class}, ${reg.stream},
       ${reg.school_code}, ${reg.school_name},
       ${reg.centre_code}, ${centre?.centre_name ?? reg.centre_code},
       ${reg.dob}, false)
    on conflict (uid) do nothing
  `;

  await sql`
    update app_registrations
       set status = 'approved', uid = ${uid}, decided_at = now(), decided_by = ${staffId}
     where id = ${id}::bigint and status = 'pending'
  `;

  await logAdminEvent(staffId, "registration_approved", { kind: "student", id: uid }, {
    registration: id,
    name: reg.name,
    school: reg.school_name,
  });

  return { ok: true, uid };
}

export async function rejectRegistration(
  id: string,
  staffId: string,
  reason: string,
): Promise<boolean> {
  const rows = (await sql`
    update app_registrations
       set status = 'rejected', decided_at = now(), decided_by = ${staffId},
           reason = ${reason || null}
     where id = ${id}::bigint and status = 'pending'
     returning id
  `) as { id: string }[];

  if (rows.length) {
    await logAdminEvent(staffId, "registration_rejected", { kind: "registration", id }, {
      reason: reason || null,
    });
  }
  return rows.length > 0;
}

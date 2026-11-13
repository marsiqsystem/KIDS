import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "./staff";
import { findSchool, possibleDuplicates } from "@/lib/app/registrations";
import { tenDigits } from "./claim-match";

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
  /** 'guest' = staff, a teacher or a core member who chose "Other" for class. */
  kind: "student" | "guest";
  name: string;
  /** Null for a guest: no date of birth is asked. */
  dob: string | null;
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
  /** What the family first typed, when the office has since edited the row. */
  original: ApplicationFields | null;
  edited_at: Date | null;
  edited_by_name: string | null;
}

/** The parts of an application the office may correct before deciding it. */
export interface ApplicationFields {
  name: string;
  dob: string | null;
  class: string;
  stream: string | null;
  centre_code: string;
  school_code: string;
  school_name: string;
  guardian_phone: string | null;
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
    select r.id::text, r.kind, r.name, r.dob, r.class, r.stream, r.centre_code, r.school_code,
           r.school_name, r.guardian_phone, r.applied_at, r.possible_duplicates,
           r.original, r.edited_at, ed.full_name as edited_by_name,
           coalesce((
             select json_agg(json_build_object(
                      'uid', s.uid, 'name', s.name, 'class', s.class,
                      'school_name', s.school_name) order by s.uid)
               from students s
              where s.uid in (select jsonb_array_elements_text(r.possible_duplicates))
           ), '[]'::json) as duplicates
      from app_registrations r
      left join admin_staff ed on ed.staff_id = r.edited_by
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
  kind: "student" | "guest";
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
    select r.id::text, r.kind, r.name, r.class, r.school_name, r.status, r.uid, r.reason,
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
 * A UID is District(1) + Centre(2) + School(2) + Seq(4). build_seed.py counted
 * the last four ACROSS THE WHOLE REGISTER (uid_sequence carried that on); it
 * ran out at 9999 on 13 Nov 2026, so new UIDs now take the lowest number free
 * within their own prefix -- see the end of this function.
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
export async function mintUid(centreCode: string, schoolCode: string, demo = false): Promise<string> {
  // A school nobody sits at yet takes its prefix from extra_schools
  // (src/lib/admin/schema.sql), set when the school was added. A guest copies
  // the prefix of the demo accounts already at that centre's demo school
  // (21399 at CTR-13); the last four still come off the one global counter,
  // exactly as the demo UIDs build_seed.py made did.
  const [sibling] = (await sql`
    select prefix from (
      select left(uid, 5) as prefix, 0 as pick from students
       where centre_code = ${centreCode} and school_code = ${schoolCode} and is_demo = ${demo}
      union all
      select uid_prefix, 1 from extra_schools
       where centre_code = ${centreCode} and school_code = ${schoolCode}
    ) p
     order by pick
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

  // The global counter reached 9999 on 13 November 2026. From then on the last
  // four only need to be unique WITHIN the prefix -- the full nine digits are
  // the UID, and the busiest school held 339 of its 9,999. Take the lowest
  // number at this prefix that no table has ever recorded, so a removed
  // student's UID is never handed to a new child with someone else's account,
  // devices or marks still pointing at it. Two people approving at the same
  // school at once can pick the same number; the insert in approveRegistration
  // refuses the second and it mints again.
  const prefix = sibling.prefix;
  const like = `${prefix}%`;
  const [free] = (await sql`
    select ${prefix} || lpad(n::text, 4, '0') as uid
      from generate_series(1, 9999) n
     where ${prefix} || lpad(n::text, 4, '0') not in (
             select uid from students            where uid like ${like}
       union select uid from app_registrations   where uid like ${like}
       union select uid from app_accounts        where uid like ${like}
       union select uid from app_account_requests where uid like ${like}
       union select uid from app_devices         where uid like ${like}
       union select uid from app_corrections     where uid like ${like}
       union select uid from register_guardians  where uid like ${like}
       union select uid from offline_results     where uid like ${like}
       union select uid from online_results      where uid like ${like}
       union select uid from exam_results        where uid like ${like}
       union select uid from admin_batch_members where uid like ${like}
     )
     order by n
     limit 1
  `) as { uid: string }[];

  if (!free) throw new Error(`Every UID at prefix ${prefix} is taken.`);
  return free.uid;
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
    select id::text, kind, name, dob, class, stream, centre_code, school_code, school_name
      from app_registrations
     where id = ${id}::bigint and status = 'pending'
  `) as PendingRow[];
  if (!reg) return { ok: false, reason: "not_pending" };
  // A guest becomes a demo account, so every count and ranking leaves them out.
  const guest = reg.kind === "guest";

  const [centre] = (await sql`
    select centre_name from (
      select centre_name, 0 as pick from students
       where centre_code = ${reg.centre_code} and not is_demo
      union all
      select centre_name, 1 from extra_schools where centre_code = ${reg.centre_code}
    ) c
     order by pick
     limit 1
  `) as { centre_name: string }[];

  // A clash must never pass silently: `do nothing` alone would mark this
  // application approved under a UID that belongs to another child.
  let uid = "";
  for (let attempt = 0; attempt < 5 && !uid; attempt++) {
    let candidate: string;
    try {
      candidate = await mintUid(reg.centre_code, reg.school_code, guest);
    } catch (e) {
      return { ok: false, reason: "no_prefix", detail: (e as Error).message };
    }
    const inserted = (await sql`
      insert into students
        (uid, name, class, stream, school_code, school_name,
         centre_code, centre_name, dob, is_demo)
      values
        (${candidate}, ${reg.name}, ${reg.class}, ${reg.stream},
         ${reg.school_code}, ${reg.school_name},
         ${reg.centre_code}, ${centre?.centre_name ?? reg.centre_code},
         ${reg.dob}, ${guest})
      on conflict (uid) do nothing
      returning uid
    `) as { uid: string }[];
    if (inserted.length) uid = candidate;
  }
  if (!uid) {
    return { ok: false, reason: "no_prefix", detail: "Could not find a free UID — press Approve again." };
  }

  await sql`
    update app_registrations
       set status = 'approved', uid = ${uid}, decided_at = now(), decided_by = ${staffId}
     where id = ${id}::bigint and status = 'pending'
  `;

  await logAdminEvent(staffId, "registration_approved", { kind: "student", id: uid }, {
    registration: id,
    guest,
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

const CLASSES = new Set(["IX", "X", "XI", "XII"]);
const STREAMS = new Set(["Arts", "Commerce", "Science"]);

/** DD-MM-YYYY naming a real day, the way students.dob holds it. */
export function validDob(raw: string): string | null {
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  if (y < 1995 || y > new Date().getFullYear() - 8) return null;
  return `${String(d).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${y}`;
}

export type Edit = { ok: true; duplicates: number } | { ok: false; message: string; field?: string };

/**
 * Correct an application before it is decided.
 *
 * For the office, after ringing the family: a school's name typed where the
 * child's should be, a date of birth with day and month swapped, the wrong
 * school picked. Only while pending -- an approved application is a student,
 * and a student is corrected on the Corrections tab, not here.
 *
 * The first edit copies what the family typed into `original`; later edits
 * leave it alone. The duplicate guard is run again on the corrected name and
 * date of birth, because the whole reason for most of these edits is that the
 * typed name was not a name -- and a real one may well be on the register
 * already, which means "claim it", not "approve".
 */
export async function editRegistration(
  id: string,
  staffId: string,
  input: { name: string; dob: string; class: string; stream: string; school: string; guardian_phone: string },
): Promise<Edit> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) return { ok: false, message: "Give the child's full name.", field: "name" };

  const [kind] = (await sql`
    select kind from app_registrations where id = ${id}::bigint and status = 'pending'
  `) as { kind: string }[];
  if (!kind) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };
  if (kind.kind === "guest") return editGuest(id, staffId, name, input);

  const dob = validDob(input.dob);
  if (!dob) return { ok: false, message: "Date of birth as DD-MM-YYYY, a real date.", field: "dob" };
  const cls = input.class.trim().toUpperCase();
  if (!CLASSES.has(cls)) return { ok: false, message: "Class is IX, X, XI or XII.", field: "class" };
  const senior = cls === "XI" || cls === "XII";
  const stream = senior ? input.stream.trim() : "";
  if (senior && !STREAMS.has(stream)) return { ok: false, message: "Class XI and XII need a stream.", field: "stream" };
  const [centre, code] = input.school.split("|");
  const school = centre && code ? await findSchool(centre, code) : null;
  if (!school) return { ok: false, message: "Pick the school from the list.", field: "school" };
  let phone: string | null = null;
  if (input.guardian_phone.trim()) {
    phone = tenDigits(input.guardian_phone);
    if (!phone) return { ok: false, message: "A ten-digit phone number, or leave it empty.", field: "guardian_phone" };
  }

  const [before] = (await sql`
    select name, dob, class, stream, centre_code, school_code, school_name, guardian_phone
      from app_registrations where id = ${id}::bigint and status = 'pending'
  `) as ApplicationFields[];
  if (!before) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };

  const duplicates = await possibleDuplicates(name, dob);

  const rows = (await sql`
    update app_registrations
       set original = coalesce(original, jsonb_build_object(
             'name', name, 'dob', dob, 'class', class, 'stream', stream,
             'centre_code', centre_code, 'school_code', school_code,
             'school_name', school_name, 'guardian_phone', guardian_phone)),
           name = ${name}, dob = ${dob}, class = ${cls}, stream = ${stream || null},
           centre_code = ${school.centre_code}, school_code = ${school.school_code},
           school_name = ${school.school_name}, guardian_phone = ${phone},
           possible_duplicates = ${JSON.stringify(duplicates.map((d) => d.uid))}::jsonb,
           edited_at = now(), edited_by = ${staffId}
     where id = ${id}::bigint and status = 'pending'
     returning id
  `) as { id: string }[];
  if (!rows.length) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };

  await logAdminEvent(staffId, "registration_edited", { kind: "registration", id }, {
    before,
    after: { name, dob, class: cls, stream: stream || null, centre_code: school.centre_code,
             school_code: school.school_code, school_name: school.school_name, guardian_phone: phone },
  });
  return { ok: true, duplicates: duplicates.length };
}

/**
 * Correct a guest application: name, phone and the class they see the app as.
 * No date of birth and no school -- a guest has neither -- and no duplicate
 * guard, which runs on name plus date of birth.
 */
async function editGuest(
  id: string,
  staffId: string,
  name: string,
  input: { class: string; stream: string; guardian_phone: string },
): Promise<Edit> {
  const cls = input.class.trim().toUpperCase();
  if (!CLASSES.has(cls)) return { ok: false, message: "Class is IX, X, XI or XII.", field: "class" };
  const senior = cls === "XI" || cls === "XII";
  const stream = senior ? input.stream.trim() : "";
  if (senior && !STREAMS.has(stream)) return { ok: false, message: "Class XI and XII need a stream.", field: "stream" };
  const phone = tenDigits(input.guardian_phone);
  if (!phone) return { ok: false, message: "A ten-digit phone number.", field: "guardian_phone" };

  const [before] = (await sql`
    select name, class, stream, guardian_phone
      from app_registrations where id = ${id}::bigint and status = 'pending'
  `) as { name: string; class: string; stream: string | null; guardian_phone: string | null }[];
  if (!before) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };

  const rows = (await sql`
    update app_registrations
       set original = coalesce(original, jsonb_build_object(
             'name', name, 'dob', dob, 'class', class, 'stream', stream,
             'centre_code', centre_code, 'school_code', school_code,
             'school_name', school_name, 'guardian_phone', guardian_phone)),
           name = ${name}, class = ${cls}, stream = ${stream || null}, guardian_phone = ${phone},
           edited_at = now(), edited_by = ${staffId}
     where id = ${id}::bigint and status = 'pending'
     returning id
  `) as { id: string }[];
  if (!rows.length) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };

  await logAdminEvent(staffId, "registration_edited", { kind: "registration", id }, {
    before,
    after: { name, class: cls, stream: stream || null, guardian_phone: phone },
  });
  return { ok: true, duplicates: 0 };
}

export type OfficeAdd =
  | { ok: true; uid: string }
  | { ok: false; message: string; field?: string; duplicates?: PendingRow["duplicates"] };

/**
 * The office puts a child on the register directly, without the family
 * applying from the app (Umar, 10 Nov 2026) -- a school's list brought to the
 * office, a family that rang instead.
 *
 * It is filed as an application from source 'office' and approved at once by
 * approveRegistration, so a UID is minted in exactly one place and every child
 * added this way is in the decided list and the audit log like any other.
 * The duplicate guard runs first; a match stops the add until the office ticks
 * that it has checked, because a second UID can never be reconciled with the
 * first.
 */
export async function officeAddStudent(
  staffId: string,
  input: { name: string; dob: string; class: string; stream: string; school: string; guardian_phone: string; confirmed: boolean },
): Promise<OfficeAdd> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) return { ok: false, message: "Give the child's full name.", field: "name" };
  const dob = validDob(input.dob);
  if (!dob) return { ok: false, message: "Date of birth as DD-MM-YYYY, a real date.", field: "dob" };
  const cls = input.class.trim().toUpperCase();
  if (!CLASSES.has(cls)) return { ok: false, message: "Class is IX, X, XI or XII.", field: "class" };
  const senior = cls === "XI" || cls === "XII";
  const stream = senior ? input.stream.trim() : "";
  if (senior && !STREAMS.has(stream)) return { ok: false, message: "Class XI and XII need a stream.", field: "stream" };
  const [centre, code] = input.school.split("|");
  const school = centre && code ? await findSchool(centre, code) : null;
  if (!school) return { ok: false, message: "Pick the school from the list.", field: "school" };
  let phone: string | null = null;
  if (input.guardian_phone.trim()) {
    phone = tenDigits(input.guardian_phone);
    if (!phone) return { ok: false, message: "A ten-digit phone number, or leave it empty.", field: "guardian_phone" };
  }

  const duplicates = await possibleDuplicates(name, dob);
  if (duplicates.length && !input.confirmed) {
    return {
      ok: false,
      field: "confirm",
      message: "Somebody with this name and date of birth is already on the register. Check it is not the same child, then tick the box and add again.",
      duplicates: duplicates.map(({ uid, name, class: c, school_name }) => ({ uid, name, class: c, school_name })),
    };
  }

  const [row] = (await sql`
    insert into app_registrations
      (name, dob, class, stream, centre_code, school_code, school_name,
       guardian_phone, source, possible_duplicates)
    values
      (${name}, ${dob}, ${cls}, ${stream || null},
       ${school.centre_code}, ${school.school_code}, ${school.school_name},
       ${phone}, 'office', ${JSON.stringify(duplicates.map((d) => d.uid))}::jsonb)
    returning id::text
  `) as { id: string }[];

  const approved = await approveRegistration(row.id, staffId);
  if (!approved.ok) {
    return {
      ok: false,
      message: approved.reason === "no_prefix"
        ? approved.detail
        : "It was filed but could not be approved. It is waiting on the Applications tab.",
    };
  }
  return { ok: true, uid: approved.uid };
}

import { findSchool } from "@/lib/app/registrations";
import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "./staff";
import { validDob } from "./registrations";

/**
 * Deciding a student's correction, and making it stick.
 *
 * Every correction made only in the database before this was reverted by the
 * next reseed from the master workbook -- more than once, and silently. Approval
 * therefore does three things, not one: it changes `students`, it keeps the
 * approved row so scripts/seed-students.ts can re-apply it after any reseed,
 * and it can be exported so the workbook itself is brought into line.
 */

export interface PendingCorrection {
  id: string;
  uid: string;
  student_name: string;
  class: string;
  school_name: string;
  field: "name" | "dob" | "class" | "stream" | "school";
  old_value: string | null;
  new_value: string;
  /** For a school change: the NAMES, since 'CTR-13|SC-04' decides nothing. */
  old_label: string | null;
  new_label: string | null;
  note: string | null;
  requested_at: Date;
}

export async function pendingCorrections(limit = 300): Promise<PendingCorrection[]> {
  return (await sql`
    select c.id::text, c.uid, s.name as student_name, s.class, s.school_name,
           c.field, c.old_value, c.new_value, c.note, c.requested_at,
           case when c.field = 'school' then (
             select school_name from students x
              where x.centre_code || '|' || x.school_code = c.old_value and not x.is_demo limit 1)
           end as old_label,
           case when c.field = 'school' then (
             select school_name from students x
              where x.centre_code || '|' || x.school_code = c.new_value and not x.is_demo limit 1)
           end as new_label
      from app_corrections c
      join students s on s.uid = c.uid
     where c.status = 'pending'
     order by c.uid, c.requested_at
     limit ${limit}
  `) as PendingCorrection[];
}

export async function pendingCorrectionCount(): Promise<number> {
  const [r] = (await sql`
    select count(*)::int as n from app_corrections where status = 'pending'
  `) as { n: number }[];
  return r?.n ?? 0;
}

/**
 * Write one approved value onto the register.
 *
 * The same statements scripts/seed-students.ts runs to re-apply corrections
 * after a reseed. Kept in one place in spirit; the script cannot import this
 * file (no path aliases on bare Node), so if a field is ever added, add it
 * THERE too or it will be reverted by the next reseed.
 */
async function applyToRegister(uid: string, field: string, value: string): Promise<void> {
  switch (field) {
    case "name":
      await sql`update students set name = ${value} where uid = ${uid}`;
      return;
    case "dob":
      await sql`update students set dob = ${value} where uid = ${uid}`;
      return;
    case "class":
      // IX and X have no stream; a child moved down from XI keeps none.
      await sql`
        update students set class = ${value},
               stream = case when ${value} in ('IX', 'X') then null else stream end
         where uid = ${uid}`;
      return;
    case "stream":
      await sql`update students set stream = ${value} where uid = ${uid}`;
      return;
    case "school": {
      // Copied from a student already at the new school, so the names match the
      // register exactly. The UID is NOT changed: it is who the child is, and
      // every mark they have is filed under it.
      // Or from extra_schools, for a school nobody sits at yet.
      const [centre, school] = value.split("|");
      const x = centre && school ? await findSchool(centre, school) : null;
      if (!x) throw new Error("That school is no longer on the register.");
      await sql`
        update students set centre_code = ${x.centre_code}, centre_name = ${x.centre_name},
               school_code = ${x.school_code}, school_name = ${x.school_name}
         where uid = ${uid}`;
      return;
    }
  }
}

export async function approveCorrection(id: string, staffId: string): Promise<boolean> {
  const [c] = (await sql`
    select uid, field, old_value, new_value from app_corrections
     where id = ${id}::bigint and status = 'pending'
  `) as { uid: string; field: string; old_value: string | null; new_value: string }[];
  if (!c) return false;

  await applyToRegister(c.uid, c.field, c.new_value);
  await sql`
    update app_corrections set status = 'approved', decided_at = now(), decided_by = ${staffId}
     where id = ${id}::bigint
  `;
  await logAdminEvent(staffId, "correction_approved", { kind: "student", id: c.uid }, {
    field: c.field,
    from: c.old_value,
    to: c.new_value,
  });
  return true;
}

export async function rejectCorrection(id: string, staffId: string, reason: string): Promise<boolean> {
  const rows = (await sql`
    update app_corrections
       set status = 'rejected', decided_at = now(), decided_by = ${staffId}, reason = ${reason || null}
     where id = ${id}::bigint and status = 'pending'
     returning uid, field
  `) as { uid: string; field: string }[];
  if (!rows[0]) return false;
  await logAdminEvent(staffId, "correction_rejected", { kind: "student", id: rows[0].uid }, {
    field: rows[0].field,
    reason: reason || null,
  });
  return true;
}

export interface ExportRow {
  uid: string;
  field: string;
  old_value: string | null;
  new_value: string;
  new_label: string | null;
  decided_at: Date;
  decided_by: string | null;
}

/** Every approved correction, oldest first, for bringing the workbook into line. */
export async function approvedCorrections(): Promise<ExportRow[]> {
  return (await sql`
    select c.uid, c.field, c.old_value, c.new_value, c.decided_at, c.decided_by,
           case when c.field = 'school' then (
             select school_name from students x
              where x.centre_code || '|' || x.school_code = c.new_value and not x.is_demo limit 1)
           end as new_label
      from app_corrections c
     where c.status = 'approved'
     order by c.decided_at
  `) as ExportRow[];
}

export type StudentEdit =
  | { ok: true; changed: string[] }
  | { ok: false; message: string; field?: string };

/**
 * The office corrects a student already on the register, directly.
 *
 * For after a phone call: a misspelt name, a date of birth with day and month
 * swapped, a child in the wrong class or school. Each changed field is written
 * as an APPROVED row in app_corrections -- exactly what approving a student's
 * own request leaves behind -- so scripts/seed-students.ts re-applies it after
 * any reseed from the master workbook, and the Corrections export carries it
 * back to the workbook. Writing `students` alone would be reverted silently by
 * the next reseed; that has happened before (see this file's header).
 *
 * The UID never changes, whatever else does: it is who the child is, and every
 * mark is filed under it. A field with a student's own request still open is
 * refused, so the office decides that request rather than racing it.
 */
export async function officeEditStudent(
  uid: string,
  staffId: string,
  input: { name: string; dob: string; class: string; stream: string; school: string; note: string },
): Promise<StudentEdit> {
  const [s] = (await sql`
    select name, dob, class, stream, centre_code, school_code, is_demo
      from students where uid = ${uid}
  `) as { name: string; dob: string | null; class: string; stream: string | null;
          centre_code: string; school_code: string; is_demo: boolean }[];
  if (!s) return { ok: false, message: "No student has that User ID." };

  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) return { ok: false, message: "Give the child's full name.", field: "name" };
  let dob: string | null = s.dob;
  if (input.dob.trim()) {
    dob = validDob(input.dob);
    if (!dob) return { ok: false, message: "Date of birth as DD-MM-YYYY, a real date.", field: "dob" };
  } else if (s.dob) {
    return { ok: false, message: "A date of birth cannot be removed, only corrected.", field: "dob" };
  }
  const cls = input.class.trim().toUpperCase();
  if (!["IX", "X", "XI", "XII"].includes(cls)) return { ok: false, message: "Class is IX, X, XI or XII.", field: "class" };
  const senior = cls === "XI" || cls === "XII";
  const stream = senior ? input.stream.trim() : "";
  if (senior && !["Arts", "Commerce", "Science"].includes(stream)) {
    return { ok: false, message: "Class XI and XII need a stream.", field: "stream" };
  }
  const [centre, code] = input.school.split("|");
  const school = centre && code ? await findSchool(centre, code) : null;
  if (!school) return { ok: false, message: "Pick the school from the list.", field: "school" };
  const note = input.note.trim().slice(0, 300) || null;

  // Class before stream: applying a class of IX or X clears the stream.
  const changes: { field: string; from: string | null; to: string }[] = [];
  if (name !== s.name) changes.push({ field: "name", from: s.name, to: name });
  if (dob && dob !== s.dob) changes.push({ field: "dob", from: s.dob, to: dob });
  if (cls !== s.class) changes.push({ field: "class", from: s.class, to: cls });
  if (senior && stream !== (s.stream ?? "")) changes.push({ field: "stream", from: s.stream, to: stream });
  const pair = `${school.centre_code}|${school.school_code}`;
  if (pair !== `${s.centre_code}|${s.school_code}`) {
    changes.push({ field: "school", from: `${s.centre_code}|${s.school_code}`, to: pair });
  }
  if (changes.length === 0) return { ok: false, message: "Nothing was changed." };

  const open = (await sql`
    select field from app_corrections
     where uid = ${uid} and status = 'pending'
       and field = any(${changes.map((c) => c.field)})
  `) as { field: string }[];
  if (open.length) {
    return {
      ok: false,
      message: `The student has asked for a change to their ${open.map((o) => o.field).join(" and ")} — decide that on the Corrections tab first.`,
    };
  }

  for (const c of changes) {
    await applyToRegister(uid, c.field, c.to);
    await sql`
      insert into app_corrections
        (uid, field, old_value, new_value, note, status, decided_at, decided_by)
      values
        (${uid}, ${c.field}, ${c.from}, ${c.to}, ${note ?? "Edited by the office"}, 'approved', now(), ${staffId})
    `;
  }
  await logAdminEvent(staffId, "student_edited", { kind: "student", id: uid }, { changes, note });
  return { ok: true, changed: changes.map((c) => c.field) };
}

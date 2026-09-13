import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "./staff";

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
      const [x] = (await sql`
        select centre_code, centre_name, school_code, school_name from students
         where centre_code || '|' || school_code = ${value} and not is_demo limit 1
      `) as { centre_code: string; centre_name: string; school_code: string; school_name: string }[];
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

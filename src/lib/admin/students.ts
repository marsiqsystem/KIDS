import { sql } from "@/lib/exam/db";

/**
 * The student register, as the office needs to see it.
 *
 * Read-only, and that is a rule rather than an omission. `students` is the
 * single register of who exists, built from the master workbook by
 * build_seed.py; a name or a class corrected here and not there is reverted by
 * the next reseed, which has already happened once. Corrections go into the
 * workbook. This module looks, and never writes.
 *
 * Demo records are excluded from every count by default. UID 213999417 is the
 * KIDS Team demo student, and counting it has already produced a "112 schools"
 * figure where the register says 110.
 */

export interface Overview {
  students: number;
  claimed: number;
  batches: number;
  inABatch: number;
  teachers: number;
  admins: number;
}

/**
 * The six numbers on the front of the control centre.
 *
 * One round trip, not six. This runs on every load of the page, and the poll
 * that used to sit on this screen is exactly why that matters.
 */
export async function overview(): Promise<Overview> {
  const rows = (await sql`
    select
      (select count(*)::int from students where not is_demo)                     as students,
      (select count(*)::int from app_accounts a
         join students s on s.uid = a.uid where not s.is_demo)                   as claimed,
      (select count(*)::int from admin_batches where archived_at is null)        as batches,
      (select count(distinct m.uid)::int from admin_batch_members m
        where m.removed_at is null)                                              as in_a_batch,
      (select count(*)::int from admin_staff
        where role = 'teacher' and disabled_at is null)                          as teachers,
      (select count(*)::int from admin_staff
        where role = 'admin' and disabled_at is null)                            as admins
  `) as Record<string, number>[];

  const r = rows[0] ?? {};
  return {
    students: r.students ?? 0,
    claimed: r.claimed ?? 0,
    batches: r.batches ?? 0,
    inABatch: r.in_a_batch ?? 0,
    teachers: r.teachers ?? 0,
    admins: r.admins ?? 0,
  };
}

export interface StudentRow {
  uid: string;
  name: string;
  class: string;
  stream: string | null;
  school_name: string;
  medium: string | null;
  claimed: boolean;
  /** True while an office-issued password is still standing, unused. */
  must_change: boolean;
  /**
   * Whether the three-wrong-guesses lockout is running RIGHT NOW, decided by
   * the database's clock. Not a timestamp for the component to compare against
   * its own — "is this locked" is a fact about the server, and asking it during
   * render would be both the wrong clock and an impure call.
   */
  locked_out: boolean;
  batches: string | null;
}

/**
 * Find students by User ID, name or school.
 *
 * Capped at 100 rows and never listing the whole register: 9,714 names is not
 * a page, it is a download, and the point of this screen is to find one child
 * and see which batch they are in.
 *
 * A nine-digit query is treated as a UID and matched exactly — a prefix search
 * on a number that long only ever returns the same one row more slowly.
 *
 * Demo records are hidden from a name or school search, and findable by their
 * exact UID. They are excluded from every COUNT for the reason this file's
 * header gives; but somebody who has typed all nine digits already knows the
 * record exists, and the office has to be able to act on 213999417 — it is the
 * account the programme is rehearsed on.
 */
export async function searchStudents(query: string, limit = 100): Promise<StudentRow[]> {
  const q = query.trim();
  if (!q) return [];

  const isUid = /^\d{9}$/.test(q);
  const like = `%${q.toLowerCase()}%`;

  return (await sql`
    select s.uid, s.name, s.class, s.stream, s.school_name, s.medium,
           (a.uid is not null) as claimed,
           coalesce(a.must_change, false) as must_change,
           coalesce(a.locked_until > now(), false) as locked_out,
           (select string_agg(b.name, ', ' order by b.name)
              from admin_batch_members m
              join admin_batches b on b.id = m.batch_id
             where m.uid = s.uid and m.removed_at is null
               and b.archived_at is null) as batches
      from students s
      left join app_accounts a on a.uid = s.uid
     where (not s.is_demo or ${isUid})
       and case when ${isUid}
                then s.uid = ${q}
                else lower(s.name) like ${like} or lower(s.school_name) like ${like}
           end
     order by s.name
     limit ${limit}
  `) as StudentRow[];
}

/** Which live batches one child is in. Used to keep the roster screens honest. */
export async function batchesForStudent(uid: string): Promise<{ id: string; name: string }[]> {
  return (await sql`
    select b.id::text, b.name
      from admin_batch_members m
      join admin_batches b on b.id = m.batch_id
     where m.uid = ${uid} and m.removed_at is null and b.archived_at is null
     order by b.name
  `) as { id: string; name: string }[];
}

import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "@/lib/admin/staff";

/**
 * Batches and rosters.
 *
 * The whole point of this module is that none of it is in code. A batch is a
 * row, its members are rows, its teachers are rows; creating one is an INSERT
 * the office performs from a screen, not a literal somebody edits and deploys.
 *
 * That is a direct response to a bug that has already cost a rebuild:
 * export_for_web.py and make_results_xlsx.py each name their batches in a
 * Python list, and a batch present in one but missing from the other drops out
 * of the results silently, with no error anywhere. Nothing in the control
 * centre may work that way.
 *
 * Removal is always `removed_at`, never a delete. "Who was in the morning batch
 * in October" is a question that gets asked in January.
 */

export interface Batch {
  id: string;
  name: string;
  class_label: string | null;
  medium: string | null;
  notes: string | null;
  created_at: Date;
  created_by: string;
  archived_at: Date | null;
  student_count: number;
  teacher_count: number;
}

export async function listBatches(includeArchived = false): Promise<Batch[]> {
  return (await sql`
    select b.id::text, b.name, b.class_label, b.medium, b.notes,
           b.created_at, b.created_by, b.archived_at,
           (select count(*)::int from admin_batch_members m
             where m.batch_id = b.id and m.removed_at is null) as student_count,
           (select count(*)::int from admin_batch_teachers t
             where t.batch_id = b.id and t.removed_at is null) as teacher_count
      from admin_batches b
     where ${includeArchived} or b.archived_at is null
     order by b.archived_at nulls first, b.name
  `) as Batch[];
}

export async function createBatch(input: {
  name: string;
  classLabel?: string | null;
  medium?: string | null;
  notes?: string | null;
  by: string;
}): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("A batch needs a name.");

  const rows = (await sql`
    insert into admin_batches (name, class_label, medium, notes, created_by)
    values (${name}, ${input.classLabel?.trim() || null}, ${input.medium?.trim() || null},
            ${input.notes?.trim() || null}, ${input.by})
    returning id::text
  `) as { id: string }[];

  const id = rows[0]!.id;
  await logAdminEvent(input.by, "batch_created", { kind: "batch", id }, { name });
  return id;
}

export async function setBatchArchived(
  batchId: string,
  archived: boolean,
  by: string,
): Promise<void> {
  await sql`
    update admin_batches
       set archived_at = ${archived ? new Date() : null}
     where id = ${batchId}::bigint
  `;
  await logAdminEvent(by, archived ? "batch_archived" : "batch_reopened", {
    kind: "batch",
    id: batchId,
  });
}

/* ------------------------------------------------------------ the roster --- */

export interface MemberRow {
  uid: string;
  name: string;
  class: string;
  school_name: string;
  medium: string | null;
  added_at: Date;
}

export async function batchMembers(batchId: string): Promise<MemberRow[]> {
  return (await sql`
    select s.uid, s.name, s.class, s.school_name, s.medium, m.added_at
      from admin_batch_members m
      join students s on s.uid = m.uid
     where m.batch_id = ${batchId}::bigint and m.removed_at is null
     order by s.name
  `) as MemberRow[];
}

/**
 * Put a child in a batch.
 *
 * `on conflict do nothing` against the partial unique index, so adding somebody
 * twice is quiet rather than an error — the office pasting a list of UIDs
 * should not have to care whether one of them was already there. The returned
 * flag says whether a row was actually written, which is what decides if an
 * audit event is worth recording.
 */
export async function addMember(batchId: string, uid: string, by: string): Promise<boolean> {
  const rows = (await sql`
    insert into admin_batch_members (batch_id, uid, added_by)
    values (${batchId}::bigint, ${uid}, ${by})
    on conflict do nothing
    returning id
  `) as { id: string }[];

  if (!rows[0]) return false;
  await logAdminEvent(by, "member_added", { kind: "batch", id: batchId }, { uid });
  return true;
}

export async function removeMember(batchId: string, uid: string, by: string): Promise<void> {
  await sql`
    update admin_batch_members
       set removed_at = now(), removed_by = ${by}
     where batch_id = ${batchId}::bigint and uid = ${uid} and removed_at is null
  `;
  await logAdminEvent(by, "member_removed", { kind: "batch", id: batchId }, { uid });
}

/**
 * Add many at once, reporting what happened to each.
 *
 * The office works from a list on paper, and a paste of forty UIDs where one is
 * mistyped must not become forty failures. Unknown IDs are named back rather
 * than silently dropped — a UID that matches nobody is exactly the thing a
 * typo produces, and it has to be visible.
 */
export async function addMembers(
  batchId: string,
  uids: string[],
  by: string,
): Promise<{ added: string[]; already: string[]; unknown: string[] }> {
  const added: string[] = [];
  const already: string[] = [];
  const unknown: string[] = [];

  for (const raw of uids) {
    const uid = raw.trim();
    if (!/^\d{9}$/.test(uid)) {
      unknown.push(uid);
      continue;
    }
    const exists = (await sql`select 1 as there from students where uid = ${uid}`) as unknown[];
    if (exists.length === 0) {
      unknown.push(uid);
      continue;
    }
    ((await addMember(batchId, uid, by)) ? added : already).push(uid);
  }

  return { added, already, unknown };
}

/* ---------------------------------------------------------- the teachers --- */

export interface BatchTeacher {
  staff_id: string;
  full_name: string;
  subject: string | null;
  assigned_at: Date;
}

export async function batchTeachers(batchId: string): Promise<BatchTeacher[]> {
  return (await sql`
    select t.staff_id, s.full_name, t.subject, t.assigned_at
      from admin_batch_teachers t
      join admin_staff s on s.staff_id = t.staff_id
     where t.batch_id = ${batchId}::bigint and t.removed_at is null
     order by s.full_name
  `) as BatchTeacher[];
}

export async function assignTeacher(
  batchId: string,
  staffId: string,
  subject: string | null,
  by: string,
): Promise<void> {
  await sql`
    insert into admin_batch_teachers (batch_id, staff_id, subject, assigned_by)
    values (${batchId}::bigint, ${staffId}, ${subject?.trim() || null}, ${by})
    on conflict do nothing
  `;
  await logAdminEvent(by, "teacher_assigned", { kind: "batch", id: batchId }, {
    staffId,
    subject: subject?.trim() || null,
  });
}

export async function unassignTeacher(
  batchId: string,
  staffId: string,
  by: string,
): Promise<void> {
  await sql`
    update admin_batch_teachers
       set removed_at = now(), removed_by = ${by}
     where batch_id = ${batchId}::bigint and staff_id = ${staffId} and removed_at is null
  `;
  await logAdminEvent(by, "teacher_unassigned", { kind: "batch", id: batchId }, { staffId });
}

/** The live batches a teacher takes — the whole of what a teacher may see. */
export async function batchesForTeacher(staffId: string): Promise<Batch[]> {
  return (await sql`
    select b.id::text, b.name, b.class_label, b.medium, b.notes,
           b.created_at, b.created_by, b.archived_at,
           (select count(*)::int from admin_batch_members m
             where m.batch_id = b.id and m.removed_at is null) as student_count,
           (select count(*)::int from admin_batch_teachers t2
             where t2.batch_id = b.id and t2.removed_at is null) as teacher_count
      from admin_batches b
      join admin_batch_teachers t on t.batch_id = b.id and t.removed_at is null
     where t.staff_id = ${staffId} and b.archived_at is null
     order by b.name
  `) as Batch[];
}

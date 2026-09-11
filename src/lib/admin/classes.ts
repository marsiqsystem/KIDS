import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "@/lib/admin/staff";
import { newRoomName } from "@/lib/live/jitsi";
import { sendToBatch } from "@/lib/app/push";

/**
 * Live classes.
 *
 * A class is scheduled ahead of time, opened by the teacher when they are ready
 * to teach, and closed after. Those are three separate facts and the table keeps
 * them apart: `starts_at` is a plan, `started_at` is what happened. A programme
 * run to a timetable will drift from it, and a screen that cannot tell a student
 * "this has not started yet" would be lying to them at 6:01.
 *
 * No student token is minted before `started_at`. That is the whole gate: 65
 * children cannot sit in an empty room rehearsing what they will say when the
 * teacher arrives, because the room does not admit them yet.
 */

export interface LiveClass {
  id: string;
  batch_id: string;
  batch_name: string;
  title: string;
  subject: string | null;
  starts_at: Date;
  minutes: number;
  room: string;
  started_at: Date | null;
  ended_at: Date | null;
  cancelled_at: Date | null;
  recording_url: string | null;
  created_by: string;
  attended: number;
  /**
   * Which list this belongs in on the console, decided by the DATABASE's clock.
   *
   * Not the browser's and not the render's: "has this started" is a fact about
   * the server, and computing it in a component would also be an impure call in
   * render. Only recentClasses() fills it in.
   */
  bucket?: "open" | "ahead" | "past";
}

/** Every class for one batch, newest first. */
export async function classesForBatch(batchId: string): Promise<LiveClass[]> {
  return (await sql`
    select c.id::text, c.batch_id::text, b.name as batch_name, c.title, c.subject,
           c.starts_at, c.minutes, c.room, c.started_at, c.ended_at, c.cancelled_at,
           c.recording_url, c.created_by,
           (select count(*)::int from admin_class_attendance a
             where a.class_id = c.id and a.uid is not null) as attended
      from admin_classes c
      join admin_batches b on b.id = c.batch_id
     where c.batch_id = ${batchId}
     order by c.starts_at desc
  `) as LiveClass[];
}

/**
 * What the console shows: everything still to come, plus the recent past.
 *
 * Deliberately not "all classes". Three to four months of a whole-day programme
 * is several hundred rows, and an office screen that lists them all is one
 * nobody reads.
 */
export async function recentClasses(staffId?: string, limit = 40): Promise<LiveClass[]> {
  if (staffId) {
    return (await sql`
      select c.id::text, c.batch_id::text, b.name as batch_name, c.title, c.subject,
             c.starts_at, c.minutes, c.room, c.started_at, c.ended_at, c.cancelled_at,
             c.recording_url, c.created_by,
             (select count(*)::int from admin_class_attendance a
               where a.class_id = c.id and a.uid is not null) as attended,
             case
               when c.cancelled_at is not null or c.ended_at is not null then 'past'
               when c.started_at is not null then 'open'
               when c.starts_at >= now() - interval '1 hour' then 'ahead'
               else 'past'
             end as bucket
        from admin_classes c
        join admin_batches b on b.id = c.batch_id
        join admin_batch_teachers t on t.batch_id = c.batch_id
       where t.staff_id = ${staffId} and t.removed_at is null
         and c.starts_at > now() - interval '14 days'
       order by c.starts_at
       limit ${limit}
    `) as LiveClass[];
  }

  return (await sql`
    select c.id::text, c.batch_id::text, b.name as batch_name, c.title, c.subject,
           c.starts_at, c.minutes, c.room, c.started_at, c.ended_at, c.cancelled_at,
           c.recording_url, c.created_by,
           (select count(*)::int from admin_class_attendance a
             where a.class_id = c.id and a.uid is not null) as attended,
           case
             when c.cancelled_at is not null or c.ended_at is not null then 'past'
             when c.started_at is not null then 'open'
             when c.starts_at >= now() - interval '1 hour' then 'ahead'
             else 'past'
           end as bucket
      from admin_classes c
      join admin_batches b on b.id = c.batch_id
     where c.starts_at > now() - interval '14 days'
     order by c.starts_at
     limit ${limit}
  `) as LiveClass[];
}

export async function findClass(id: string): Promise<LiveClass | null> {
  const rows = (await sql`
    select c.id::text, c.batch_id::text, b.name as batch_name, c.title, c.subject,
           c.starts_at, c.minutes, c.room, c.started_at, c.ended_at, c.cancelled_at,
           c.recording_url, c.created_by,
           (select count(*)::int from admin_class_attendance a
             where a.class_id = c.id and a.uid is not null) as attended
      from admin_classes c
      join admin_batches b on b.id = c.batch_id
     where c.id = ${id}
  `) as LiveClass[];

  return rows[0] ?? null;
}

/** Whether this member of staff takes this batch. Admins are not checked here. */
export async function teachesBatch(staffId: string, batchId: string): Promise<boolean> {
  const rows = (await sql`
    select 1 from admin_batch_teachers
     where batch_id = ${batchId} and staff_id = ${staffId} and removed_at is null
  `) as unknown[];
  return rows.length > 0;
}

export async function createClass(input: {
  batchId: string;
  title: string;
  subject?: string | null;
  startsAt: Date;
  minutes: number;
  by: string;
}): Promise<string> {
  const room = newRoomName();

  const rows = (await sql`
    insert into admin_classes (batch_id, title, subject, starts_at, minutes, room, created_by)
    values (${input.batchId}, ${input.title}, ${input.subject?.trim() || null},
            ${input.startsAt.toISOString()}, ${input.minutes}, ${room}, ${input.by})
    returning id::text
  `) as { id: string }[];

  await logAdminEvent(input.by, "class_created", { kind: "batch", id: input.batchId }, {
    class_id: rows[0].id,
    title: input.title,
    starts_at: input.startsAt.toISOString(),
  });

  return rows[0].id;
}

/**
 * Open the room.
 *
 * Idempotent on purpose: a teacher whose browser reloads, or who taps twice
 * because nothing appeared to happen, must not restart their own class and lose
 * the time it really began.
 */
export async function startClass(id: string, by: string): Promise<void> {
  /**
   * `was_open` is read from a snapshot taken BEFORE the update, in the same
   * statement. It cannot be derived afterwards: `coalesce(started_at, now())`
   * leaves the row looking identical whether this call opened the room or found
   * it already open, and the difference is what decides whether 65 phones ring.
   */
  const rows = (await sql`
    with before as (
      select id, started_at from admin_classes
       where id = ${id} and cancelled_at is null
    ),
    opened as (
      update admin_classes c
         set started_at = coalesce(c.started_at, now()),
             started_by = coalesce(c.started_by, ${by})
        from before b
       where c.id = b.id
      returning c.id::text as id, c.batch_id::text as batch_id, c.title,
                (b.started_at is not null) as was_open
    )
    select * from opened
  `) as { id: string; batch_id: string; title: string; was_open: boolean }[];

  const row = rows[0];
  if (!row) throw new Error("That class was cancelled.");
  await logAdminEvent(by, "class_started", { kind: "batch", id }, { class_id: id });

  /**
   * Tell the batch their room is open — the second of the two moments worth a
   * push (src/lib/app/push.ts explains why there are only two).
   *
   * Guarded by `was_open` because the update is idempotent: a teacher whose
   * browser reloads calls this again, and 65 children must not get a second
   * notification saying the class has started. Only the call that actually
   * moved `started_at` sends.
   *
   * Awaited but never allowed to throw. A class that was opened is open
   * whether or not Firebase answered, and a teacher standing in front of a
   * room must never see an error because a notification did not go out.
   */
  if (!row.was_open) {
    try {
      await sendToBatch(row.batch_id, {
        title: "Your class has started",
        body: `${row.title} — the room is open now.`,
        path: `/app/class/${id}`,
      });
    } catch (err) {
      console.error(`Push: could not announce class ${id}.`, err);
    }
  }
}

export async function endClass(id: string, by: string): Promise<void> {
  await sql`
    update admin_classes set ended_at = now()
     where id = ${id} and ended_at is null
  `;
  await logAdminEvent(by, "class_ended", { kind: "batch", id }, { class_id: id });
}

export async function cancelClass(id: string, by: string): Promise<void> {
  await sql`
    update admin_classes set cancelled_at = now(), cancelled_by = ${by}
     where id = ${id} and cancelled_at is null
  `;
  await logAdminEvent(by, "class_cancelled", { kind: "batch", id }, { class_id: id });
}

/** The unlisted YouTube link, pasted in after the class. */
export async function setRecording(id: string, url: string, by: string): Promise<void> {
  await sql`
    update admin_classes set recording_url = ${url.trim() || null}
     where id = ${id}
  `;
  await logAdminEvent(by, "class_recording_set", { kind: "batch", id }, { class_id: id });
}

/**
 * Whether a class is open to a given student, and why not if it is not.
 *
 * One function, so that the student's screen and the thing that signs the token
 * cannot disagree: the screen may offer Join only where the signer would sign.
 */
export type JoinRefusal = "not-found" | "cancelled" | "not-started" | "ended" | "not-in-batch";

export async function canStudentJoin(
  classId: string,
  uid: string,
): Promise<{ ok: true; live: LiveClass } | { ok: false; why: JoinRefusal }> {
  const live = await findClass(classId);
  if (!live) return { ok: false, why: "not-found" };
  if (live.cancelled_at) return { ok: false, why: "cancelled" };

  const member = (await sql`
    select 1 from admin_batch_members
     where batch_id = ${live.batch_id} and uid = ${uid} and removed_at is null
  `) as unknown[];

  // Checked before "has it started", because a child who is not in the batch
  // should be told so plainly rather than left waiting for a class that is
  // never going to admit them.
  if (member.length === 0) return { ok: false, why: "not-in-batch" };

  if (!live.started_at) return { ok: false, why: "not-started" };
  if (live.ended_at) return { ok: false, why: "ended" };

  return { ok: true, live };
}

/**
 * The next class a student can expect, for the card on Home.
 *
 * Any batch they are in, anything not cancelled, from an hour ago onwards — an
 * hour back because a class that started late is still the one they want.
 */
export async function nextClassFor(uid: string): Promise<LiveClass | null> {
  const rows = (await sql`
    select c.id::text, c.batch_id::text, b.name as batch_name, c.title, c.subject,
           c.starts_at, c.minutes, c.room, c.started_at, c.ended_at, c.cancelled_at,
           c.recording_url, c.created_by, 0 as attended
      from admin_classes c
      join admin_batches b on b.id = c.batch_id
      join admin_batch_members m on m.batch_id = c.batch_id
     where m.uid = ${uid} and m.removed_at is null
       and c.cancelled_at is null and c.ended_at is null
       and (
             -- OPEN: on the student's Home for as long as it could still be
             -- running — its own length plus half an hour for overrunning.
             -- "Started within the last hour" could not do this job: classes
             -- are 90 minutes, so it took the card off every phone half way
             -- through the lesson, and a child who joined late or whose app
             -- reloaded had no way back in.
             --
             -- Bounded rather than "until ended", because ending a class is a
             -- button a teacher forgets. One left open yesterday would
             -- otherwise sit on sixty-five phones for ever.
             (c.started_at is not null
              and c.started_at + make_interval(mins => c.minutes + 30) > now())
             -- NOT YET OPENED: the one coming, plus an hour's grace for a
             -- teacher running late. Yesterday's class is not today's news.
             or (c.started_at is null and c.starts_at > now() - interval '1 hour')
           )
     order by c.starts_at
     limit 1
  `) as LiveClass[];

  return rows[0] ?? null;
}

/**
 * Note that we signed somebody a token.
 *
 * Not presence. See the comment on the table: a row here means they tapped
 * Join, and every count taken off it is a floor.
 */
export async function noteTokenIssued(
  classId: string,
  who: { uid?: string; staffId?: string; moderator: boolean },
): Promise<void> {
  if (who.staffId) {
    await sql`
      insert into admin_class_attendance (class_id, staff_id, moderator)
      values (${classId}, ${who.staffId}, ${who.moderator})
      on conflict (class_id, staff_id) where staff_id is not null
      do update set last_at = now(), tokens = admin_class_attendance.tokens + 1
    `;
    return;
  }

  await sql`
    insert into admin_class_attendance (class_id, uid, moderator)
    values (${classId}, ${who.uid}, false)
    on conflict (class_id, uid) where uid is not null
    do update set last_at = now(), tokens = admin_class_attendance.tokens + 1
  `;
}

export interface RegisterRow {
  uid: string;
  name: string;
  first_at: Date;
  tokens: number;
}

/** Who was issued a token for this class — the floor, not the truth. */
export async function classRegister(classId: string): Promise<RegisterRow[]> {
  return (await sql`
    select a.uid, s.name, a.first_at, a.tokens
      from admin_class_attendance a
      join students s on s.uid = a.uid
     where a.class_id = ${classId} and a.uid is not null
     order by a.first_at
  `) as RegisterRow[];
}

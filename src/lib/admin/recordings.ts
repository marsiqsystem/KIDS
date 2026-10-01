import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "@/lib/admin/staff";
import { sendToBatch, pushConfigured } from "@/lib/app/push";
import {
  fileInfo,
  openUpload,
  recordingsFolderId,
  shareForViewing,
  unshare,
} from "@/lib/drive";

/**
 * Class recordings — every live class, kept in the KIDS Google Drive and
 * watchable in the app by the class's own batch.
 *
 * Nobody presses anything. The teacher's room starts the recorder when they
 * join (JitsiRoom, `record`), Jibri on the class server writes the video, and
 * its finalize script (scripts/live/kids-finalize.sh) does two calls to
 * /api/live/recording:
 *
 *   1. "start"  — names the room and the file size; gets back a one-off Drive
 *                 upload address and sends the video straight to Google. The
 *                 class server never holds the Drive token, only the Jitsi
 *                 secret it already has.
 *   2. "done"   — names the Drive file it made; this file shares it for
 *                 Google's player and puts it on the batch's screens.
 *
 * Who watches is the batch as it is NOW, the same rule as posts: a child added
 * next week can catch up on last week's classes.
 */

export interface Recording {
  id: string;
  class_id: string;
  drive_id: string;
  name: string;
  bytes: number;
  added_at: Date;
  hidden_at: Date | null;
}

export interface StudentRecording extends Recording {
  title: string;
  subject: string | null;
  starts_at: Date;
  minutes: number;
}

/** The class a Jitsi room belongs to. Room names are random and unique per class. */
export async function classForRoom(
  room: string,
): Promise<{ id: string; batch_id: string; title: string } | null> {
  if (!/^[\w-]{1,80}$/.test(room)) return null;
  const rows = (await sql`
    select id::text, batch_id::text, title from admin_classes where room = ${room}
  `) as { id: string; batch_id: string; title: string }[];
  return rows[0] ?? null;
}

/**
 * Step 1: an upload address for one recording.
 *
 * The file is named for people, not for Jitsi — "Physics · 2 Oct 2026 · 18:00"
 * — because the Drive folder is somewhere the office will actually look.
 */
export async function openRecordingUpload(input: {
  room: string;
  bytes: number;
}): Promise<{ url: string; classId: string } | null> {
  const live = await classForRoom(input.room);
  if (!live) return null;

  const rows = (await sql`
    select c.title, c.starts_at, b.name as batch_name
      from admin_classes c join admin_batches b on b.id = c.batch_id
     where c.id = ${live.id}::bigint
  `) as { title: string; starts_at: Date; batch_name: string }[];
  const c = rows[0]!;

  const when = new Date(c.starts_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // "18.00" rather than "18:00" — a colon is not allowed in every place this
  // file may be saved to, and a dot still reads as a time.
  const name = `${c.title} · ${c.batch_name} · ${when}.mp4`
    .replace(/:/g, ".")
    .replace(/[\\/*?"<>|]+/g, "-");

  const url = await openUpload({
    name,
    mime: "video/mp4",
    bytes: input.bytes,
    staffId: "jibri",
    folder: recordingsFolderId(),
    props: { kids: "recording", class: live.id },
  });
  return { url, classId: live.id };
}

/**
 * Step 2: the recorder says the upload finished.
 *
 * Believes nothing it is told except the Drive id: the class comes from the
 * file's own appProperties, which this server wrote in step 1. Idempotent — a
 * finalize script that retries after a timeout gets the same answer, not a
 * second row.
 */
export async function recordingUploaded(driveId: string): Promise<
  { ok: true; classId: string; already: boolean } | { ok: false; why: string }
> {
  const existing = (await sql`
    select class_id::text from admin_class_recordings where drive_id = ${driveId}
  `) as { class_id: string }[];
  if (existing[0]) return { ok: true, classId: existing[0].class_id, already: true };

  const f = await fileInfo(driveId);
  if (!f) return { ok: false, why: "Drive does not have that file." };
  if (f.props.kids !== "recording" || !f.props.class) {
    return { ok: false, why: "That file was not opened as a class recording." };
  }
  if (!f.parents.includes(recordingsFolderId())) {
    return { ok: false, why: "That file is not in the recordings folder." };
  }
  if (f.size <= 0) return { ok: false, why: "The file is empty." };

  // Shared before it is listed: a row pointing at a video the player cannot
  // open would put a broken box on 65 screens.
  await shareForViewing(f.id);

  const inserted = (await sql`
    insert into admin_class_recordings (class_id, drive_id, name, bytes)
    values (${f.props.class}::bigint, ${f.id}, ${f.name}, ${f.size})
    on conflict (drive_id) do nothing
    returning id::text
  `) as { id: string }[];
  if (!inserted[0]) return { ok: true, classId: f.props.class, already: true };

  await logAdminEvent("system", "recording_added", { kind: "recording", id: inserted[0].id }, {
    class_id: f.props.class,
    bytes: f.size,
  });

  /**
   * One push to the batch, the first time a class gains a recording. Never
   * allowed to throw: the recording is saved whether or not a phone heard.
   */
  try {
    const count = (await sql`
      select count(*)::int as n from admin_class_recordings
       where class_id = ${f.props.class}::bigint
    `) as { n: number }[];
    if (pushConfigured() && count[0]!.n === 1) {
      const c = (await sql`
        select batch_id::text, title from admin_classes where id = ${f.props.class}::bigint
      `) as { batch_id: string; title: string }[];
      if (c[0]) {
        await sendToBatch(c[0].batch_id, {
          title: "Class recording ready",
          body: `${c[0].title} — watch it again in Recordings.`,
          path: `/app/class/${f.props.class}`,
        });
      }
    }
  } catch (err) {
    console.error(`Push: recording ${inserted[0].id} not announced.`, err);
  }

  return { ok: true, classId: f.props.class, already: false };
}

/** A class's recordings, oldest first, as the class page plays them in order. */
export async function recordingsForClass(classId: string, includeHidden = false): Promise<Recording[]> {
  if (!/^\d{1,18}$/.test(classId)) return [];
  return (await sql`
    select id::text, class_id::text, drive_id, name, bytes::float8 as bytes, added_at, hidden_at
      from admin_class_recordings
     where class_id = ${classId}::bigint
       and (${includeHidden} or hidden_at is null)
     order by added_at, id
  `) as Recording[];
}

/**
 * Every recording a student may watch, newest class first: classes of a batch
 * they are in right now, not cancelled, not hidden.
 */
export async function recordingsForStudent(uid: string, limit = 100): Promise<StudentRecording[]> {
  return (await sql`
    select r.id::text, r.class_id::text, r.drive_id, r.name, r.bytes::float8 as bytes,
           r.added_at, r.hidden_at, c.title, c.subject, c.starts_at, c.minutes
      from admin_class_recordings r
      join admin_classes c on c.id = r.class_id
     where r.hidden_at is null
       and c.cancelled_at is null
       and exists (
             select 1 from admin_batch_members m
              where m.batch_id = c.batch_id and m.uid = ${uid} and m.removed_at is null
           )
     order by c.starts_at desc, r.added_at
     limit ${limit}
  `) as StudentRecording[];
}

/**
 * Take a recording off students' screens. The row stays; the Drive file stays
 * in the folder but stops being shared, so a link already copied out stops
 * playing too.
 */
export async function hideRecording(id: string, by: string): Promise<void> {
  const rows = (await sql`
    update admin_class_recordings set hidden_at = now(), hidden_by = ${by}
     where id = ${id}::bigint and hidden_at is null
    returning drive_id
  `) as { drive_id: string }[];
  if (!rows[0]) return;

  await unshare(rows[0].drive_id);
  await logAdminEvent(by, "recording_hidden", { kind: "recording", id });
}

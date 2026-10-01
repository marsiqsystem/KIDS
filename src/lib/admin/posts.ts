import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "@/lib/admin/staff";
import { sendToAll, sendToBatch, oneLine, pushConfigured } from "@/lib/app/push";

/**
 * Posts — the one notice somebody has to type.
 *
 * The other four kinds in a student's list are facts about their own record,
 * computed when they look (src/lib/app/notices.ts). "No class on Thursday" is
 * not one of those, so it is written down here — but it is written ONCE, and
 * every student who should see it still computes that at the moment they look.
 * Nothing is fanned out, so there is no queue to write, retry or repair, and a
 * child added to a batch tomorrow simply has this week's posts.
 *
 * Two rules the rest of the control centre keeps, kept here too:
 *
 *   - A post to a batch names the BATCH, never a list of children. A child moved
 *     between batches is moved once, in one place.
 *   - Retracted, never deleted. The audit row says a post was taken down; only
 *     this table still has the words it said.
 */

/** How far back a student's notice list reaches. */
const STUDENT_WINDOW_DAYS = 90;

export interface Post {
  id: string;
  title: string;
  body: string;
  audience: "all" | "batch";
  batch_id: string | null;
  batch_name: string | null;
  posted_at: Date;
  posted_by: string;
  posted_by_name: string | null;
  retracted_at: Date | null;
  files: PostFile[];
}

/** A note, photo or paper attached to a post. The bytes are in Google Drive. */
export interface PostFile {
  id: string;
  post_id: string;
  name: string;
  mime: string;
  bytes: number;
}

/** One query for the files of many posts, rather than one per post. */
async function withFiles<T extends { id: string }>(posts: T[]): Promise<(T & { files: PostFile[] })[]> {
  if (posts.length === 0) return [];
  const rows = (await sql`
    select id::text, post_id::text, name, mime, bytes::int as bytes
      from admin_post_files
     where post_id = any(${posts.map((p) => p.id)}::bigint[])
     order by post_id, position, id
  `) as PostFile[];
  return posts.map((p) => ({ ...p, files: rows.filter((f) => f.post_id === p.id) }));
}

/**
 * What the console shows.
 *
 * An admin sees everything. A teacher sees what their own students can see —
 * the posts to the batches they take, plus anything sent to everybody — because
 * a teacher asked "what were they told?" should not have to ask the office.
 */
export async function listPosts(staffId?: string, limit = 60): Promise<Post[]> {
  if (staffId) {
    const rows = (await sql`
      select p.id::text, p.title, p.body, p.audience, p.batch_id::text, b.name as batch_name,
             p.posted_at, p.posted_by, s.full_name as posted_by_name, p.retracted_at
        from admin_posts p
        left join admin_batches b on b.id = p.batch_id
        left join admin_staff s on s.staff_id = p.posted_by
       where p.audience = 'all'
          or exists (
               select 1 from admin_batch_teachers t
                where t.batch_id = p.batch_id and t.staff_id = ${staffId}
                  and t.removed_at is null
             )
       order by p.posted_at desc
       limit ${limit}
    `) as Post[];
    return withFiles(rows);
  }

  const rows = (await sql`
    select p.id::text, p.title, p.body, p.audience, p.batch_id::text, b.name as batch_name,
           p.posted_at, p.posted_by, s.full_name as posted_by_name, p.retracted_at
      from admin_posts p
      left join admin_batches b on b.id = p.batch_id
      left join admin_staff s on s.staff_id = p.posted_by
     order by p.posted_at desc
     limit ${limit}
  `) as Post[];
  return withFiles(rows);
}

export async function findPost(id: string): Promise<Post | null> {
  const rows = (await sql`
    select p.id::text, p.title, p.body, p.audience, p.batch_id::text, b.name as batch_name,
           p.posted_at, p.posted_by, s.full_name as posted_by_name, p.retracted_at
      from admin_posts p
      left join admin_batches b on b.id = p.batch_id
      left join admin_staff s on s.staff_id = p.posted_by
     where p.id = ${id}
  `) as Post[];
  return (await withFiles(rows))[0] ?? null;
}

export async function createPost(input: {
  title: string;
  body: string;
  batchId: string | null;
  by: string;
  /** Already in Drive and already checked by the caller (src/app/admin/actions.ts). */
  files?: { driveId: string; name: string; mime: string; bytes: number }[];
}): Promise<string> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("A post needs a heading.");
  if (!body) throw new Error("A post needs something to say.");

  const audience = input.batchId ? "batch" : "all";

  const rows = (await sql`
    insert into admin_posts (title, body, audience, batch_id, posted_by)
    values (${title}, ${body}, ${audience},
            ${input.batchId ? input.batchId : null}, ${input.by})
    returning id::text
  `) as { id: string }[];

  const id = rows[0]!.id;

  const files = input.files ?? [];
  for (const [position, f] of files.entries()) {
    await sql`
      insert into admin_post_files (post_id, drive_id, name, mime, bytes, position, uploaded_by)
      values (${id}::bigint, ${f.driveId}, ${f.name}, ${f.mime}, ${f.bytes}, ${position}, ${input.by})
    `;
  }

  // The heading, not the body: an audit trail is a record of what was done, and
  // the words themselves are one join away in admin_posts.
  await logAdminEvent(input.by, "post_written", { kind: "post", id }, {
    title,
    audience,
    batchId: input.batchId,
    files: files.length,
  });

  /**
   * Push it, to whoever has the app and a token.
   *
   * This is the one notice a person types, so it is the one with a real moment
   * of sending - the other four are states of a student's own record and have
   * no instant to fire at (src/lib/app/push.ts). The audience is still
   * computed, not fanned out: sendToBatch and sendToAll read the membership now
   * and the student's notice list will read it again when they look, so a child
   * added to the batch tomorrow sees the post without ever having been sent it.
   *
   * Never allowed to throw. The post is written; a notification that did not
   * leave must not make it look as though it was not.
   *
   * The audit row is written even when the count is zero, and only when push is
   * actually configured. That makes the three states tell themselves apart: no
   * row means push is off, a row saying 0 means it is on and nobody was
   * reachable, and a row with a number means phones took it. A row written only
   * on success would collapse the first two, which are the two worth telling
   * apart when somebody asks why nothing arrived.
   */
  try {
    if (pushConfigured()) {
      const message = { title, body: oneLine(body), path: "/app/notices" };
      const phones = input.batchId
        ? await sendToBatch(input.batchId, message)
        : await sendToAll(message);
      await logAdminEvent(input.by, "post_pushed", { kind: "post", id }, { phones });
    }
  } catch (err) {
    console.error(`Push: could not send post ${id}.`, err);
  }

  return id;
}

/**
 * Take a post down.
 *
 * It stops appearing for every student at once — including anybody who had
 * already read it, which is the point: a wrong date corrected is worse than
 * useless if the wrong one is still on the screen.
 */
export async function retractPost(id: string, by: string): Promise<void> {
  await sql`
    update admin_posts
       set retracted_at = now(), retracted_by = ${by}
     where id = ${id}::bigint and retracted_at is null
  `;
  await logAdminEvent(by, "post_retracted", { kind: "post", id });
}

export interface StudentPost {
  id: string;
  title: string;
  body: string;
  posted_at: Date;
  files: PostFile[];
}

/**
 * The live posts one student can see, newest first.
 *
 * Two audiences in one query: everybody, or the batches this child is in RIGHT
 * NOW. Membership is read at the moment they look rather than captured when the
 * post was written, so joining a batch brings its recent posts with it and
 * leaving takes them away — which is what a batch notice means.
 *
 * Bounded by a window and a limit on purpose. A student who has been in the
 * programme four months should not open Notices to two hundred rows, and the
 * list is not an archive.
 */
export async function postsFor(uid: string, limit = 20): Promise<StudentPost[]> {
  const rows = (await sql`
    select p.id::text, p.title, p.body, p.posted_at
      from admin_posts p
     where p.retracted_at is null
       and p.posted_at > now() - (${STUDENT_WINDOW_DAYS} || ' days')::interval
       and (
             p.audience = 'all'
          or exists (
               select 1 from admin_batch_members m
                where m.batch_id = p.batch_id and m.uid = ${uid} and m.removed_at is null
             )
       )
     order by p.posted_at desc
     limit ${limit}
  `) as Omit<StudentPost, "files">[];
  return withFiles(rows);
}

/**
 * One attached file, if this student may open it right now.
 *
 * The same three conditions as postsFor, asked of one file: its post is not
 * taken down, it is inside the 90-day window, and it went to everybody or to a
 * batch this child is in at this moment. A link copied out of the app is worth
 * nothing to anybody who could not already see the post.
 */
export async function fileForStudent(
  fileId: string,
  uid: string,
): Promise<(PostFile & { drive_id: string }) | null> {
  if (!/^\d{1,18}$/.test(fileId)) return null;
  const rows = (await sql`
    select f.id::text, f.post_id::text, f.name, f.mime, f.bytes::int as bytes, f.drive_id
      from admin_post_files f
      join admin_posts p on p.id = f.post_id
     where f.id = ${fileId}::bigint
       and p.retracted_at is null
       and p.posted_at > now() - (${STUDENT_WINDOW_DAYS} || ' days')::interval
       and (
             p.audience = 'all'
          or exists (
               select 1 from admin_batch_members m
                where m.batch_id = p.batch_id and m.uid = ${uid} and m.removed_at is null
             )
       )
  `) as (PostFile & { drive_id: string })[];
  return rows[0] ?? null;
}

/**
 * One attached file for somebody in the console.
 *
 * An admin may open any. A teacher may open what their own students can see,
 * the same rule as listPosts: posts to everybody, and posts to a batch they
 * take. Taken-down posts stay openable here — the office asking "what did we
 * send them?" needs the file as much as the words.
 */
export async function fileForStaff(
  fileId: string,
  staffId: string,
  isAdmin: boolean,
): Promise<(PostFile & { drive_id: string }) | null> {
  if (!/^\d{1,18}$/.test(fileId)) return null;
  const rows = (await sql`
    select f.id::text, f.post_id::text, f.name, f.mime, f.bytes::int as bytes, f.drive_id
      from admin_post_files f
      join admin_posts p on p.id = f.post_id
     where f.id = ${fileId}::bigint
       and (
             ${isAdmin}
          or p.audience = 'all'
          or exists (
               select 1 from admin_batch_teachers t
                where t.batch_id = p.batch_id and t.staff_id = ${staffId}
                  and t.removed_at is null
             )
       )
  `) as (PostFile & { drive_id: string })[];
  return rows[0] ?? null;
}

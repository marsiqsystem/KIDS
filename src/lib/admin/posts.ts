import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "@/lib/admin/staff";

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
    return (await sql`
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
  }

  return (await sql`
    select p.id::text, p.title, p.body, p.audience, p.batch_id::text, b.name as batch_name,
           p.posted_at, p.posted_by, s.full_name as posted_by_name, p.retracted_at
      from admin_posts p
      left join admin_batches b on b.id = p.batch_id
      left join admin_staff s on s.staff_id = p.posted_by
     order by p.posted_at desc
     limit ${limit}
  `) as Post[];
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
  return rows[0] ?? null;
}

export async function createPost(input: {
  title: string;
  body: string;
  batchId: string | null;
  by: string;
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
  // The heading, not the body: an audit trail is a record of what was done, and
  // the words themselves are one join away in admin_posts.
  await logAdminEvent(input.by, "post_written", { kind: "post", id }, {
    title,
    audience,
    batchId: input.batchId,
  });
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
  return (await sql`
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
  `) as StudentPost[];
}

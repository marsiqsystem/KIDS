import { sql } from "@/lib/exam/db";

/**
 * The room — Design 8k, "presence without a ladder".
 *
 * 65 squares, one per student, and **nobody is named** — not even the student
 * looking at it, so there is nothing on the screen to compare yourself against.
 * The bars say what the room is *doing*, never who. A child can see that the
 * corridor is full without being able to check on any one person in it.
 *
 * ## What it costs
 *
 * Nothing continuous. Presence is a single upsert when the app opens and a
 * single count when the room is looked at — no socket, no poll, no push. That
 * is Design's constraint and it is also the only thing a WebView on 3G with a
 * battery at 12% can honestly promise.
 *
 * ## What it will not say
 *
 * `doing` is only ever what the app can actually observe. There is no
 * "Homework" bar because homework is not built; a bar for it would be a number
 * invented about children, on the one screen whose entire premise is that the
 * numbers are real.
 *
 * And it never says a number lower than one. At 5:40 in the morning the answer
 * is "you are the first one here", which is true, quietly flattering, and does
 * not read as an empty room.
 */

/** How recently the app must have been open to count as here. */
const HERE_MINUTES = 20;

export type Doing = "here" | "practising" | "watching" | "class" | "sitting";

export interface Room {
  /** Everyone on the programme, which is how many squares there are. */
  total: number;
  /** How many of them are here now, including the student looking. */
  present: number;
  /** Whether the student looking is one of them. Their square is not marked. */
  youAreHere: boolean;
  /** What the room is doing — only the things that can be observed. */
  doing: { doing: Doing; n: number }[];
  /** Minutes left of this student's own study hour, if one is running. */
  sittingFor: number | null;
}

/**
 * Say this student is here.
 *
 * Called from the app shell, so it happens once per page load and never on the
 * website. Deliberately cheap: one upsert on a primary key, no read first.
 *
 * A `doing` of "here" never overwrites a more specific one that is still
 * running — a student whose study hour has forty minutes left and who wanders
 * to the Learn tab is still sitting with the room.
 */
export async function touchPresence(uid: string, doing: Doing = "here"): Promise<void> {
  await sql`
    insert into coaching_presence (uid, seen_at, doing)
    values (${uid}, now(), ${doing})
    on conflict (uid) do update
       set seen_at = now(),
           doing = case
                     when coaching_presence.until is not null
                      and coaching_presence.until > now()
                      and ${doing} = 'here'
                     then coaching_presence.doing
                     else ${doing}
                   end
  `;
}

/** Start a silent hour. The going matters more than what you do when you arrive. */
export async function startStudyHour(uid: string, minutes = 60): Promise<void> {
  await sql`
    insert into coaching_presence (uid, seen_at, doing, until)
    values (${uid}, now(), 'sitting', now() + make_interval(mins => ${minutes}))
    on conflict (uid) do update
       set seen_at = now(), doing = 'sitting',
           until = now() + make_interval(mins => ${minutes})
  `;
}

export async function endStudyHour(uid: string): Promise<void> {
  await sql`
    update coaching_presence set doing = 'here', until = null
     where uid = ${uid}
  `;
}

export async function roomFor(uid: string): Promise<Room | null> {
  const rows = (await sql`
    with batch as (
      select p.batch_id
        from coaching_programmes p
        join admin_batch_members m
          on m.batch_id = p.batch_id and m.uid = ${uid} and m.removed_at is null
       where p.archived_at is null
       limit 1
    ),
    members as (
      select m.uid from admin_batch_members m, batch b
       where m.batch_id = b.batch_id and m.removed_at is null
    ),
    here as (
      select pr.uid,
             /* A study hour outlives the app being open: the phone locks, the
                hour does not stop. Anything else has to have been seen. */
             case when pr.until is not null and pr.until > now() then 'sitting' else pr.doing end
               as doing
        from coaching_presence pr
        join members mm on mm.uid = pr.uid
       where pr.seen_at > now() - make_interval(mins => ${HERE_MINUTES})
          or (pr.until is not null and pr.until > now())
    )
    select
      (select count(*)::int from members) as total,
      (select count(*)::int from here) as present,
      (select count(*)::int from here where uid = ${uid}) as you,
      (select coalesce(
                json_agg(json_build_object('doing', doing, 'n', n) order by n desc),
                '[]'::json)
         from (select doing, count(*)::int as n from here
                where doing <> 'here' group by doing) d) as doing,
      (select greatest(0, ceil(extract(epoch from (until - now())) / 60))::int
         from coaching_presence where uid = ${uid} and until > now()) as sitting_for
  `) as {
    total: number;
    present: number;
    you: number;
    doing: { doing: Doing; n: number }[];
    sitting_for: number | null;
  }[];

  const r = rows[0];
  // No programme, so no room. Not an empty one — there is no such place.
  if (!r || r.total === 0) return null;

  return {
    total: r.total,
    present: r.present,
    youAreHere: r.you > 0,
    doing: r.doing ?? [],
    sittingFor: r.sitting_for,
  };
}

/** "Practising", "Watching back" — what a bar is called on the screen. */
export const DOING_LABEL: Record<Doing, string> = {
  here: "Here",
  practising: "Practising",
  watching: "Watching back",
  class: "In the class",
  sitting: "Sitting with the room",
};

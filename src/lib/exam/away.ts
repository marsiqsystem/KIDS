import { sql } from "@/lib/exam/db";

/**
 * Leaving the paper — the record of every time a child's exam went out of view.
 *
 * Umar's ask, 2 Oct 2026: a student who keeps switching to another app during
 * the paper is looking something up, and the invigilator should be able to see
 * it while it is happening. The phone reports each period (LiveExam's away
 * watch); the desk lists who has left, how often and for how long.
 *
 * What it can and cannot see, stated so nobody over-trusts it:
 *
 *   - It sees the paper leave the screen: another app, the home screen, the
 *     recent-apps view, a phone call, the camera, the notification shade.
 *   - It cannot see a SECOND device. A child reading answers off a friend's
 *     phone never leaves the paper at all. That is what the invigilator's eyes
 *     are for, and why the paper is sat in a hall.
 *   - A floating chat bubble or split screen leaves the paper on screen; those
 *     show as "unfocused" only where Android takes the focus away.
 */

export type AwayHow = "hidden" | "unfocused";

export interface AwayPeriod {
  from: string;
  to: string | null;
  how: AwayHow;
}

/** A day either side of now: the phone's clock is not trusted, but it is not ignored. */
const SANE_MS = 24 * 60 * 60 * 1000;
const MAX_PER_CALL = 100;

/** Only what parses, what is plausible, and no more than a phone could produce. */
export function cleanAway(input: unknown, now = Date.now()): AwayPeriod[] {
  if (!Array.isArray(input)) return [];
  const out: AwayPeriod[] = [];
  for (const raw of input.slice(0, MAX_PER_CALL)) {
    const r = raw as { from?: unknown; to?: unknown; how?: unknown };
    const from = Date.parse(String(r?.from ?? ""));
    if (!Number.isFinite(from) || Math.abs(from - now) > SANE_MS) continue;
    const toRaw = r?.to === null || r?.to === undefined ? null : Date.parse(String(r.to));
    if (toRaw !== null && (!Number.isFinite(toRaw) || toRaw < from || toRaw - now > SANE_MS)) continue;
    const how = r?.how === "unfocused" ? "unfocused" : "hidden";
    out.push({
      from: new Date(from).toISOString(),
      to: toRaw === null ? null : new Date(toRaw).toISOString(),
      how,
    });
  }
  return out;
}

/**
 * Store what the phone reported. Idempotent: the same period sent twice is one
 * row, and a period first sent open ("away now") is closed by its second send.
 * A later send can never re-open a closed period.
 */
export async function recordAway(uid: string, examPaperId: string, periods: AwayPeriod[]): Promise<number> {
  if (periods.length === 0) return 0;
  const rows = (await sql`
    insert into exam_away (uid, exam_paper_id, left_at, back_at, how)
    select ${uid}, ${examPaperId}::bigint, x.f, x.t, x.h
      from unnest(${periods.map((p) => p.from)}::timestamptz[],
                  ${periods.map((p) => p.to)}::timestamptz[],
                  ${periods.map((p) => p.how)}::text[]) as x(f, t, h)
    on conflict (uid, exam_paper_id, left_at) do update
       set back_at  = coalesce(exam_away.back_at, excluded.back_at),
           heard_at = now()
    returning 1
  `) as unknown[];
  return rows.length;
}

export interface AwayRow {
  uid: string;
  name: string;
  class: string;
  /** Times the paper left the screen entirely. */
  left: number;
  /** Times something else took the focus while the paper stayed on screen. */
  unfocused: number;
  /** Total seconds away, both kinds, up to now or the paper's close. */
  seconds: number;
  /** Away at this moment, with the paper still running. */
  away_now: boolean;
  last_at: Date;
  status: "in_progress" | "submitted" | null;
}

/**
 * Who has left the paper at this desk, most often first.
 *
 * Under a second does not count — a notification sliding past or a mis-tap
 * on the edge of the screen is not a child looking something up, and a list
 * full of them teaches the invigilator to ignore the list. Demo accounts are
 * included, like the desk search, so a rehearsal can be watched.
 */
export async function deskAwayList(examPaperId: string, centre: string, limit = 60): Promise<AwayRow[]> {
  return (await sql`
    with p as (select ends_at from exam_papers where id = ${examPaperId}::bigint),
    w as (
      select w.*, coalesce(w.back_at, least(now(), coalesce((select ends_at from p), now()))) as until
        from exam_away w
        join exam_checkins c on c.uid = w.uid and c.exam_paper_id = w.exam_paper_id
       where w.exam_paper_id = ${examPaperId}::bigint and c.centre_code = ${centre}
    )
    select s.uid, s.name, s.class,
           count(*) filter (where w.how = 'hidden')::int as "left",
           count(*) filter (where w.how = 'unfocused')::int as unfocused,
           coalesce(sum(extract(epoch from (w.until - w.left_at))), 0)::int as seconds,
           coalesce(bool_or(w.back_at is null and a.status = 'in_progress'), false) as away_now,
           max(w.left_at) as last_at,
           max(a.status) as status
      from w
      join students s on s.uid = w.uid
      left join attempts a on a.uid = w.uid and a.exam_paper_id = w.exam_paper_id
     where w.back_at is null or w.back_at - w.left_at >= interval '1 second'
     group by s.uid, s.name, s.class
     order by bool_or(w.back_at is null and a.status = 'in_progress') desc,
              count(*) desc, sum(extract(epoch from (w.until - w.left_at))) desc
     limit ${limit}
  `) as AwayRow[];
}

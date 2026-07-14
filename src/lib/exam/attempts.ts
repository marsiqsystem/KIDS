import { sql } from "./db";

/**
 * An attempt: one student, one paper, one shot.
 *
 * The one-attempt rule is not enforced in this file — it is enforced by the
 * primary key on `attempts.uid`. Two phones racing to start the same student's
 * exam at 10:30:00 both run the same INSERT; Postgres picks a winner and the
 * loser's `on conflict do nothing` leaves the winner's row untouched. Both then
 * read back the SAME row, with the same deadline. There is no window in which a
 * second attempt can exist, because there is no second row.
 */

export type AttemptStatus = "in_progress" | "submitted";

export interface Attempt {
  uid: string;
  paper_id: string;
  status: AttemptStatus;
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  /** { "0": 2, "3": 1 } — question index → chosen option. Absent means unanswered. */
  answers: Record<string, number>;
  score: number | null;
}

type EventKind = "scan" | "start" | "sync" | "submit" | "autosubmit" | "reset" | "blur";

/** Append-only. The story of what happened, for when someone disputes a result. */
export async function logEvent(uid: string, kind: EventKind, detail?: unknown): Promise<void> {
  await sql`
    insert into exam_events (uid, kind, detail)
    values (${uid}, ${kind}, ${detail === undefined ? null : JSON.stringify(detail)}::jsonb)
  `;
}

/**
 * Begin — or resume — this student's attempt.
 *
 * Resuming is the same call as starting, deliberately. A student whose phone
 * died at 10:47 scans their card again and lands here, and must come back to
 * their answers and their ORIGINAL deadline. If this issued a fresh deadline on
 * every call, a student could farm extra time by pulling the battery.
 */
export async function startOrResume(
  uid: string,
  paperId: string,
  deadline: Date,
): Promise<Attempt> {
  const rows = (await sql`
    with attempted as (
      insert into attempts (uid, paper_id, deadline_at)
      values (${uid}, ${paperId}, ${deadline.toISOString()})
      on conflict (uid) do nothing
      returning *
    )
    select * from attempted
    union all
    select * from attempts where uid = ${uid} and not exists (select 1 from attempted)
  `) as Attempt[];

  return rows[0];
}

/**
 * Save a draft.
 *
 * The whole answer sheet, every time, rather than a delta: a student on a train
 * with two bars of signal will miss syncs, and a delta that never arrives leaves
 * a hole in the sheet forever. A snapshot that arrives late is still correct.
 *
 * Refuses after the deadline, so a phone that wakes up at 11:04 and flushes a
 * queued draft cannot overwrite a submitted paper.
 */
export async function saveDraft(uid: string, answers: Record<string, number>): Promise<boolean> {
  const rows = (await sql`
    update attempts
       set answers = ${JSON.stringify(answers)}::jsonb,
           last_sync_at = now()
     where uid = ${uid}
       and status = 'in_progress'
       and now() < deadline_at
    returning uid
  `) as { uid: string }[];

  return rows.length > 0;
}

/**
 * Submit, and mark.
 *
 * `status = 'in_progress'` in the WHERE clause is what makes this idempotent: a
 * double-tap on Submit, or a retry after a timeout the phone never saw the
 * answer to, updates nothing the second time and cannot re-mark or re-time a
 * paper that is already in.
 *
 * The deadline is enforced here, but with two minutes of slack. A student who
 * taps Submit at 10:59:59 may not reach the server until 11:00:01, and no
 * paper is being thrown away over network latency.
 *
 * The slack is bounded rather than open-ended for a reason: without it, a
 * student could switch to airplane mode at 10:50, answer at leisure with no
 * clock running, and submit at 11:20. Past the slack their paper is whatever
 * draft we last banked, which is what `finalise()` takes.
 */
export async function submit(
  uid: string,
  answers: Record<string, number>,
  score: number,
): Promise<boolean> {
  const rows = (await sql`
    update attempts
       set answers = ${JSON.stringify(answers)}::jsonb,
           status = 'submitted',
           submitted_at = now(),
           score = ${score}
     where uid = ${uid}
       and status = 'in_progress'
       and now() < deadline_at + interval '2 minutes'
    returning uid
  `) as { uid: string }[];

  return rows.length > 0;
}

/**
 * The auto-submit at 11:00.
 *
 * There is no cron job, and that is on purpose — a cron that does not fire is a
 * silent failure, and we would find out weeks later. Instead an expired attempt
 * is finalised the next time anybody looks at it, from whatever draft was last
 * synced. `sweepExpired()` then catches the rest.
 *
 * This is the promise the portal makes in writing — "auto-submitted at 11:00
 * even if you don't press Submit" — so a student who loses their phone at 10:58
 * still has a marked paper.
 */
export async function finalise(uid: string, score: (answers: Record<string, number>) => number) {
  const rows = (await sql`
    select answers from attempts
     where uid = ${uid} and status = 'in_progress' and now() >= deadline_at
  `) as { answers: Record<string, number> }[];

  if (!rows.length) return false;

  const answers = rows[0].answers ?? {};
  await sql`
    update attempts
       set status = 'submitted',
           submitted_at = deadline_at,
           score = ${score(answers)}
     where uid = ${uid} and status = 'in_progress'
  `;
  await logEvent(uid, "autosubmit", { answered: Object.keys(answers).length });
  return true;
}

export async function findAttempt(uid: string): Promise<Attempt | null> {
  const rows = (await sql`select * from attempts where uid = ${uid}`) as Attempt[];
  return rows[0] ?? null;
}

import { sql } from "./db";

/**
 * Which paper are we talking about?
 *
 * Until September 2026 there was only ever one answer, so nothing had to ask.
 * `attempts`, `online_results` and `offline_results` were keyed on the student
 * alone and the window was a constant in config.ts. SET 2026 Phase 2 in
 * December ends that, and this file is where the question is answered instead.
 *
 * See src/lib/exam/schema.sql for the three tables and why there are three:
 * series (the cycle a child is awarded on), phase (a sitting), paper (what was
 * actually sat and marked).
 *
 * The codes are stable and are what the rest of the codebase names:
 *
 *   P1-OFFLINE   19 July 2026, the OMR paper, /100 — counts for the award
 *   P1-ONLINE    19 July 2026, in the app, /50
 *   P2-ONLINE    December 2026, in the app at a centre, /100
 */

export interface ExamPaper {
  id: string;
  code: string;
  name: string;
  phase_code: string;
  phase_name: string;
  series_code: string;
  mode: "online" | "offline";
  kind: "live" | "mock";
  max_marks: number;
  question_count: number | null;
  scan_opens_at: Date | null;
  starts_at: Date | null;
  ends_at: Date | null;
  duration_minutes: number | null;
  requires_checkin: boolean;
  published: boolean;
  publish_at: Date | null;
}

const SELECT = `
  select pa.id::text, pa.code, pa.name, pa.mode, pa.kind, pa.max_marks,
         pa.question_count, pa.scan_opens_at, pa.starts_at, pa.ends_at,
         pa.duration_minutes, pa.requires_checkin, pa.published, pa.publish_at,
         ph.code as phase_code, ph.name as phase_name, se.code as series_code
    from exam_papers pa
    join exam_phases ph on ph.id = pa.phase_id
    join exam_series se on se.id = ph.series_id
   where pa.archived_at is null
`;

/**
 * One paper, by its code.
 *
 * Throws rather than returning null, and that is deliberate: every caller of
 * this function is about to write marks or open a paper, and a silent null
 * there means writing a student's result against no paper at all. A script that
 * stops with "no paper P2-ONLINE" is a far better outcome than one that
 * quietly stores 9,000 orphaned rows.
 */
export async function paperByCode(code: string): Promise<ExamPaper> {
  const rows = (await sql.query(`${SELECT} and pa.code = $1`, [code])) as ExamPaper[];
  if (!rows[0]) {
    throw new Error(
      `No exam paper "${code}". Run: node --env-file=.env.local scripts/migrate-exam-phases.ts --status`,
    );
  }
  return rows[0];
}

export async function listPapers(): Promise<ExamPaper[]> {
  return (await sql.query(`${SELECT} order by ph.ordinal, pa.code`)) as ExamPaper[];
}

/**
 * The paper a student would be sitting right now, if any.
 *
 * Replaces the hardcoded `EXAM` constant in config.ts, which could only ever
 * describe 19 July. A paper with no `starts_at` is unscheduled and is never
 * returned — which is how December reads as "no paper is open" on every screen
 * until the office fixes the date.
 *
 * Mocks are included on purpose: a rehearsal that behaved differently from the
 * real thing would not be a rehearsal.
 */
export async function openPaperNow(now: Date = new Date()): Promise<ExamPaper | null> {
  const rows = (await sql.query(
    `${SELECT}
       and pa.mode = 'online'
       and pa.starts_at is not null
       and pa.scan_opens_at <= $1
       and pa.ends_at > $1
     order by pa.starts_at
     limit 1`,
    [now.toISOString()],
  )) as ExamPaper[];
  return rows[0] ?? null;
}

/**
 * The next online paper that has been scheduled, open or not.
 *
 * What the Exam tab shows when nothing is live: a date to look forward to,
 * rather than the flat "no paper is open" that was all config.ts could say.
 */
export async function nextScheduledPaper(now: Date = new Date()): Promise<ExamPaper | null> {
  const rows = (await sql.query(
    `${SELECT}
       and pa.mode = 'online'
       and pa.starts_at is not null
       and pa.ends_at > $1
     order by pa.starts_at
     limit 1`,
    [now.toISOString()],
  )) as ExamPaper[];
  return rows[0] ?? null;
}

export type Phase = "before" | "scanning" | "live" | "over";

/**
 * Where in its window a paper is.
 *
 * Kept identical in meaning to the old `phaseOf` in schedule.ts so that every
 * screen reading it behaves exactly as it did in July. Times are the server's;
 * a phone's clock is whatever its owner set it to and is never consulted.
 */
export function phaseOfPaper(paper: ExamPaper, now: Date = new Date()): Phase {
  if (!paper.starts_at || !paper.ends_at) return "before";
  if (paper.scan_opens_at && now < paper.scan_opens_at) return "before";
  if (now < paper.starts_at) return "scanning";
  if (now < paper.ends_at) return "live";
  return "over";
}

/**
 * Is this paper's result visible to a student yet?
 *
 * Two conditions, exactly as `results_meta` had it: the office has authorised
 * the marks, AND the moment they open has passed. Authorising early and opening
 * to the second is the whole point of the pair.
 */
export function resultVisible(paper: ExamPaper, now: Date = new Date()): boolean {
  if (!paper.published) return false;
  if (paper.publish_at && now < paper.publish_at) return false;
  return true;
}

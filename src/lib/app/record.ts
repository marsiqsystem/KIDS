/**
 * My Record — design 5a and 5d, assembled for the student app.
 *
 * ⚠️ SERVER ONLY. Reaches `src/lib/exam/results.ts`, which holds the answer
 * keys, and `offline-results.ts`, which holds the marked sheets.
 *
 * Almost nothing is computed here. The two papers were marked and ranked by
 * `scripts/publish-results.ts` and `scripts/import-offline-results.ts`, and this
 * is a plain read of both snapshots through the libraries the portal already
 * uses. Building a second reader for the same rows is how a student comes to
 * see one rank in the app and a different one on the site.
 *
 * The one thing this file does compute is the practice line, which belongs to
 * the app and exists nowhere else.
 *
 * The two papers never meet. There is no combined total anywhere in this module
 * and there must never be one: they were sat separately, marked separately and
 * ranked against different cohorts — 7,322 sat the written paper and 46 fewer
 * sat the online one, so even the ranks are not on the same scale.
 */
import { sql } from "@/lib/exam/db";
import type { Student } from "@/lib/exam/db";
import { publicationState, findOnlineMarksheet, type OnlineMarksheet } from "@/lib/exam/results";
import {
  offlinePublicationState,
  findOfflineMarksheet,
  type OfflineMarksheet,
} from "@/lib/exam/offline-results";

/**
 * What the app can say about one paper.
 *
 * `pending` and `absent` are not the same thing and must never be drawn the
 * same way. Pending is "wait"; absent is "you did not sit this one", which is
 * an absence and not a zero — design 5a is explicit that it is grey, never red,
 * because a parent reading it as a failure is the whole risk.
 */
export type PaperState = "ready" | "pending" | "absent";

export interface WrittenPaper {
  state: PaperState;
  publishedOn: string;
  sheet: OfflineMarksheet | null;
}

export interface OnlinePaper {
  state: PaperState;
  publishedOn: string;
  sheet: OnlineMarksheet | null;
}

/**
 * The practice line — this student's own record since the exam, not a rank.
 *
 * `app_answers` holds one row per question, updated in place: there is no
 * per-attempt history to draw a true accuracy-over-time curve from, and
 * inventing one from `times_correct` would attribute later attempts to the week
 * a question was first met.
 *
 * So the line measures the one thing the table can answer honestly: of the
 * questions first put in front of you in a given week, how many you got right
 * at first sight. `lapsed` is the flag for "has ever been wrong", so its
 * negation is exactly "right the first time". The caption on the screen says
 * this in those words — a chart whose axis has to be explained in a footnote is
 * a chart that is lying about something.
 */
export interface PracticeWeek {
  /** Monday of that week, IST, as YYYY-MM-DD. */
  week: string;
  /** "18 Aug" — the label under the point. */
  label: string;
  /** Questions first seen that week. */
  seen: number;
  /** How many of them were right at first sight. */
  right: number;
  /** right / seen as a whole percentage. */
  pct: number;
}

export interface Practice {
  /** Distinct questions this student has ever been shown. */
  answered: number;
  /** How many of those they got right at first sight. */
  right: number;
  /** right / answered as a whole percentage, or null when nothing is answered. */
  accuracy: number | null;
  /** Up to the last six weeks that have any questions in them. */
  weeks: PracticeWeek[];
}

export interface RecordState {
  written: WrittenPaper;
  online: OnlinePaper;
  practice: Practice;
}

const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short",
  }).format(new Date(`${iso}T06:00:00Z`));

/**
 * The written paper for this student.
 *
 * The gate is asked with the student in hand, not cohort-wide: a school on the
 * withhold list reads as "not published yet" for its own pupils while the rest
 * of the cohort is open. Same call, same words and same fallback as
 * `/portal` — see writtenHalf() there.
 */
export async function writtenPaper(student: Student): Promise<WrittenPaper> {
  const { published, publishedOn } = await offlinePublicationState(student);
  if (!published) return { state: "pending", publishedOn: "", sheet: null };

  const sheet = await findOfflineMarksheet(student);
  // No row is not a zero. The 28 children whose sheets never reached the
  // scanner are in exactly this state and their record must say so in words.
  if (!sheet) return { state: "absent", publishedOn, sheet: null };

  return { state: "ready", publishedOn, sheet };
}

export async function onlinePaper(student: Student): Promise<OnlinePaper> {
  const { published, publishedOn } = await publicationState();
  if (!published) return { state: "pending", publishedOn: "", sheet: null };

  const sheet = await findOnlineMarksheet(student);
  if (!sheet) return { state: "absent", publishedOn, sheet: null };

  return { state: "ready", publishedOn, sheet };
}

interface WeekRow {
  week: string;
  seen: number;
  /** Not `right`: RIGHT is a reserved word in Postgres and cannot be a bare alias. */
  right_first: number;
}

export async function practiceLine(uid: string): Promise<Practice> {
  let rows: WeekRow[] = [];
  try {
    // Bucketed in IST, because a question first met at 11 p.m. in Kolkata
    // belongs to that evening's week and not to the next one.
    rows = (await sql`
      select to_char(date_trunc('week', first_seen_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as week,
             count(*)::int                             as seen,
             count(*) filter (where not lapsed)::int    as right_first
        from app_answers
       where uid = ${uid}
       group by 1
       order by 1
    `) as unknown as WeekRow[];
  } catch {
    // A student who has never practised, or a table not yet applied. Either
    // way the record still has two papers on it and must render.
    rows = [];
  }

  const answered = rows.reduce((n, r) => n + r.seen, 0);
  const right = rows.reduce((n, r) => n + r.right_first, 0);

  return {
    answered,
    right,
    accuracy: answered ? Math.round((right / answered) * 100) : null,
    weeks: rows.slice(-6).map((r) => ({
      week: r.week,
      label: dayMonth(r.week),
      seen: r.seen,
      right: r.right_first,
      pct: r.seen ? Math.round((r.right_first / r.seen) * 100) : 0,
    })),
  };
}

export async function recordState(student: Student): Promise<RecordState> {
  const [written, online, practice] = await Promise.all([
    writtenPaper(student),
    onlinePaper(student),
    practiceLine(student.uid),
  ]);
  return { written, online, practice };
}

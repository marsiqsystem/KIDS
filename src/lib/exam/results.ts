/**
 * Reading a published result.
 *
 * ⚠️ SERVER ONLY. This module imports `papers.ts`, which holds the answer keys.
 *
 * That was a hanging offence before 11:00 on 19 July and is simply how the
 * marksheet works now: the exam is over, and a student is entitled to see which
 * option was correct. The gate is `isPublished()` — until that is true, no page
 * built on this module renders at all, and no key reaches a phone.
 *
 * Everything here is a plain read of the snapshot written by
 * scripts/publish-results.ts. Nothing is computed per request, so two students
 * opening their result at different moments are shown the same numbers.
 */
import { sql } from "./db";
import { getPaper } from "./papers";
import { EXAM } from "./config";
import type { Student } from "./db";

export type QuestionStatus = "correct" | "wrong" | "blank";

/** One question, as it was put to this student and as they answered it. */
export interface MarkedQuestion {
  n: number;
  q: string;
  context?: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** What they chose, or null if they left it blank. */
  picked: number | null;
  status: QuestionStatus;
  /** Share of their class who got this right, to one decimal. */
  classPct: number;
}

export interface Ranks {
  classRank: number;
  percentile: number | null;
  centreRank: number;
  schoolRank: number;
  classSat: number;
  centreSat: number;
  schoolSat: number;
}

export interface Cohort {
  enrolled: number;
  sat: number;
  absent: number;
  average: number;
  fullMarks: number;
}

export interface OnlineMarksheet {
  marks: number;
  total: number;
  percent: number;
  correct: number;
  wrong: number;
  blank: number;
  answered: number;
  /** "10:54 AM", IST — the only timezone this exam ever happened in. */
  submittedAt: string | null;
  minutesTaken: number | null;
  minutesLeft: number | null;
  timedOut: boolean;
  isFullMarks: boolean;
  /**
   * False for the three CTR-12 students who sat another class's paper. Their
   * marks are shown in full; every comparison against classmates is withheld,
   * because those classmates answered different questions.
   */
  ranked: boolean;
  ranks: Ranks | null;
  classAvg: number;
  classHigh: number;
  questions: MarkedQuestion[];
  /** Correct answers their class found hardest — up to 3, hardest first. */
  shone: MarkedQuestion[];
  /** Missed answers their class found easiest — up to 3, easiest first. */
  revise: MarkedQuestion[];
  cohort: Cohort;
}

interface ResultRow {
  uid: string;
  marks: number;
  correct: number;
  wrong: number;
  blank: number;
  class_rank: number | null;
  centre_rank: number | null;
  school_rank: number | null;
  percentile: string | null;
  class_sat: number;
  centre_sat: number;
  school_sat: number;
  class_avg: string;
  class_high: number;
  started_at: string | null;
  submitted_at: string | null;
  minutes_taken: string | null;
  timed_out: boolean;
  ranked: boolean;
  answers: Record<string, number>;
  paper_id: string;
}

/**
 * Is the result published, and when was it?
 *
 * Deliberately a database flag rather than an environment variable: publishing
 * is an act, with a time, that can be undone in one statement without a deploy.
 * A missing table means "no" — a portal that cannot reach the results tables
 * must fall back to the pre-publication page, never show a student an error.
 */
const istDate = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

export interface Publication {
  /** Should the result page be shown at all? */
  published: boolean;
  publishedOn: string;
}

/**
 * Is the result out, and when was it?
 *
 * Two conditions, both required: the office has authorised the marks
 * (`published`), and the announced moment has arrived (`publish_at`). The
 * second is compared against the DATABASE clock, not the web server's and
 * certainly not the phone's — same discipline as the exam window itself.
 *
 * A missing table means "no": a portal that cannot reach the results tables
 * must fall back to the pre-publication page, never show a student an error.
 */
export async function publicationState(): Promise<Publication> {
  // Local-only escape hatch for development. NEVER set this in Vercel — it
  // ignores both the authorisation and the clock. .env.local and nowhere else.
  if (process.env.KIDS_RESULTS_PREVIEW === "1") {
    return { published: true, publishedOn: istDate(new Date()) };
  }

  try {
    const rows = (await sql`
      select published_at,
             publish_at,
             (published and publish_at is not null and now() >= publish_at) as is_open
        from results_meta where id
    `) as {
      published_at: string | null;
      publish_at: string | null;
      is_open: boolean;
    }[];

    const row = rows[0];
    if (!row?.is_open) return { published: false, publishedOn: "" };

    const stamp = row.publish_at ?? row.published_at;
    return { published: true, publishedOn: stamp ? istDate(new Date(stamp)) : "" };
  } catch {
    return { published: false, publishedOn: "" };
  }
}

/** Numbers about the whole cohort, quoted in prose on the page. */
async function cohortTotals(): Promise<Cohort> {
  const rows = (await sql`select totals from results_meta where id`) as {
    totals: Partial<Cohort>;
  }[];
  const t = rows[0]?.totals ?? {};
  return {
    enrolled: t.enrolled ?? 0,
    sat: t.sat ?? 0,
    absent: t.absent ?? 0,
    average: t.average ?? 0,
    fullMarks: t.fullMarks ?? 0,
  };
}

/** 24-hour ISO instant → "10:54 AM" in IST. */
function istTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date(iso))
    .toUpperCase();
}

/**
 * This student's published online marksheet, or null if they did not sit.
 *
 * Null is the honest answer for a student with no attempt: they were absent,
 * and the page says so in words rather than showing them a zero they did not
 * earn. A zero — a paper genuinely sat and genuinely scoring nothing — is a
 * row like any other and is NOT null.
 */
export async function findOnlineMarksheet(student: Student): Promise<OnlineMarksheet | null> {
  const rows = (await sql`
    select * from online_results where uid = ${student.uid}
  `) as ResultRow[];

  const r = rows[0];
  if (!r) return null;

  const paper = getPaper(r.paper_id);
  if (!paper) return null;

  const stats = (await sql`
    select n, correct_pct from online_question_stats
     where paper_id = ${r.paper_id}
     order by n
  `) as { n: number; correct_pct: string }[];

  const pctByN = new Map(stats.map((s) => [s.n, Number(s.correct_pct)]));

  const questions: MarkedQuestion[] = paper.questions.map((q, i) => {
    const picked = r.answers[String(i)];
    const answer = paper.key[i];
    const has = picked !== undefined && picked !== null;
    return {
      n: i + 1,
      q: q.q,
      context: q.context,
      options: q.options,
      answer,
      picked: has ? picked : null,
      status: !has ? "blank" : picked === answer ? "correct" : "wrong",
      classPct: pctByN.get(i + 1) ?? 0,
    };
  });

  // "You did well here" is the correct answers fewest of their class managed;
  // "worth going back to" is the misses most of their class landed. Both are
  // read off the same per-question difficulty, from opposite ends.
  const shone = questions
    .filter((q) => q.status === "correct")
    .sort((a, b) => a.classPct - b.classPct)
    .slice(0, 3);
  const revise = questions
    .filter((q) => q.status !== "correct")
    .sort((a, b) => b.classPct - a.classPct)
    .slice(0, 3);

  const minutesTaken = r.minutes_taken === null ? null : Number(r.minutes_taken);

  return {
    marks: r.marks,
    total: EXAM.questionCount,
    percent: Math.round((r.marks / EXAM.questionCount) * 100),
    correct: r.correct,
    wrong: r.wrong,
    blank: r.blank,
    answered: r.correct + r.wrong,
    submittedAt: istTime(r.submitted_at),
    minutesTaken,
    minutesLeft:
      minutesTaken === null ? null : Math.max(0, Math.round(EXAM.durationMinutes - minutesTaken)),
    timedOut: r.timed_out,
    isFullMarks: r.marks === EXAM.questionCount,
    ranked: r.ranked && r.class_rank !== null,
    ranks:
      r.ranked && r.class_rank !== null
        ? {
            classRank: r.class_rank,
            percentile: r.percentile === null ? null : Number(r.percentile),
            centreRank: r.centre_rank ?? 0,
            schoolRank: r.school_rank ?? 0,
            classSat: r.class_sat,
            centreSat: r.centre_sat,
            schoolSat: r.school_sat,
          }
        : null,
    classAvg: Number(r.class_avg),
    classHigh: r.class_high,
    questions,
    shone,
    revise,
    cohort: await cohortTotals(),
  };
}

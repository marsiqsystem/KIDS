/**
 * The public report on the first phase — every figure behind /results.
 *
 * ⚠️ SERVER ONLY.
 *
 * /results is the *cohort's* page: head teachers, parents, donors and press
 * reading "how did the district do?". A student's own marks live on their portal
 * and are not here. Everything below is an aggregate, with one exception the
 * office chose deliberately: the sixty-four students who scored 50 out of 50 are
 * listed by name.
 *
 * Nothing is invented and nothing is rounded twice. Every number is read from
 * the snapshot written by scripts/publish-results.ts — the same rows the
 * students' own marksheets are drawn from — so a school checking a figure here
 * against a pupil's result page will find they agree.
 *
 * Demo accounts (the KIDS team's own IDs) are excluded from every count. A
 * parent reading "6,778 of 9,637 sat it" is being told about children, not about
 * the people who ran the exam.
 *
 * The three CTR-12 students who re-sat on a demo account's admit card and were
 * handed another class's paper are counted as having SAT — they did — but are
 * left out of the distribution, which is a comparison between students who
 * answered the same questions. That is why the histogram totals 6,775 and the
 * headline says 6,778.
 */
import { sql } from "./db";
import { PAPERS } from "./config";

export interface Headline {
  enrolled: number;
  sat: number;
  absent: number;
  /** Marks out of 50, as published in results_meta. */
  average: number;
  fullMarks: number;
  centres: number;
  schools: number;
  /** Students in the distribution: those who sat a paper written for their class. */
  ranked: number;
}

export interface ClassRow {
  cls: string;
  registered: number;
  sat: number;
  average: number;
  median: number;
  highest: number;
  fullMarks: number;
}

/** One five-mark band of the score distribution; the last one is 50 alone. */
export interface Band {
  label: string;
  from: number;
  students: number;
}

/** "3,488 students scored 25 or more." */
export interface Threshold {
  mark: number;
  students: number;
  share: number;
}

export interface Timing {
  byHand: number;
  autoSubmitted: number;
  averageMinutes: number;
  medianMinutes: number;
}

export interface SchoolRow {
  school: string;
  sat: number;
  average: number;
}

export interface CentreRow {
  centre: string;
  registered: number;
  sat: number;
  turnout: number;
  average: number;
}

export interface QuestionExtreme {
  cls: string;
  n: number;
  correctPct: number;
}

export interface FullMarkStudent {
  name: string;
  cls: string;
  school: string;
}

export interface FirstPhaseReport {
  headline: Headline;
  classes: ClassRow[];
  bands: Band[];
  thresholds: Threshold[];
  timing: Timing;
  schools: SchoolRow[];
  /** The eight centres with the highest turnout, of twenty-one. */
  centres: CentreRow[];
  hardest: QuestionExtreme;
  easiest: QuestionExtreme;
  fullMarkStudents: FullMarkStudent[];
}

/** Only schools with this many students sitting are listed: small groups swing wildly. */
const SCHOOL_MINIMUM = 25;
const TOP_SCHOOLS = 8;
const TOP_CENTRES = 8;
const TOTAL_MARKS = 50;

const n = (v: unknown) => Number(v ?? 0);

/**
 * A name set for print.
 *
 * The register was typed by many hands across 112 schools, so it holds "MD ASIF",
 * "sumit yadav" and "MD.sahid" side by side. A merit list that shouts one child's
 * name and whispers the next reads as carelessness about both. The stored name is
 * never altered — this is presentation, and it changes case only.
 */
function forPrint(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split(".")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(". "),
    )
    .join(" ");
}

/** "SET2026-IX" → "IX" */
function classOfPaper(paperId: string): string {
  return paperId.replace(/^SET2026-/, "");
}

const byClass = <T extends { cls: string }>(rows: T[]) =>
  [...rows].sort(
    (a, b) =>
      (PAPERS as readonly string[]).indexOf(a.cls) - (PAPERS as readonly string[]).indexOf(b.cls),
  );

/**
 * Everything the page shows, in one round of queries.
 *
 * Read at build time and re-read on the page's revalidation interval, never per
 * visitor: the underlying tables are a frozen snapshot, so a report computed
 * once an hour and a report computed per request are the same report.
 */
export async function firstPhaseReport(): Promise<FirstPhaseReport> {
  const [
    totalsRows,
    scopeRows,
    classRows,
    bandRows,
    timingRows,
    schoolRows,
    centreRows,
    questionRows,
    fullMarkRows,
  ] = await Promise.all([
    sql`select totals from results_meta where id`,

    sql`
      select count(distinct centre_code) as centres,
             count(distinct school_name) as schools
        from students where not is_demo
    `,

    sql`
      select s.class as cls,
             count(*)                                        as registered,
             count(r.uid)                                    as sat,
             round(avg(r.marks)::numeric, 2)                 as average,
             percentile_cont(0.5) within group (order by r.marks) as median,
             max(r.marks)                                    as highest,
             count(*) filter (where r.marks = ${TOTAL_MARKS}) as full_marks
        from students s left join online_results r using (uid)
       where not s.is_demo
       group by s.class
    `,

    // Five-mark bands, 0–4 up to 45–49, with 50 standing alone as band 10.
    sql`
      select least(r.marks / 5, 10) as band, count(*) as students
        from online_results r join students s using (uid)
       where not s.is_demo and r.ranked
       group by 1 order by 1
    `,

    sql`
      select count(*) filter (where not r.timed_out) as by_hand,
             count(*) filter (where r.timed_out)     as auto_submitted,
             round(avg(r.minutes_taken)::numeric, 1) as average_minutes,
             round(percentile_cont(0.5) within group (order by r.minutes_taken)::numeric, 1)
               as median_minutes
        from online_results r join students s using (uid)
       where not s.is_demo
    `,

    sql`
      select s.school_name as school,
             count(*) as sat,
             round(avg(r.marks)::numeric, 2) as average
        from online_results r join students s using (uid)
       where not s.is_demo
       group by s.school_name
      having count(*) >= ${SCHOOL_MINIMUM}
       order by average desc, sat desc
       limit ${TOP_SCHOOLS}
    `,

    sql`
      select s.centre_name as centre,
             count(*)      as registered,
             count(r.uid)  as sat,
             round(100.0 * count(r.uid) / count(*), 1) as turnout,
             round(avg(r.marks)::numeric, 2)           as average
        from students s left join online_results r using (uid)
       where not s.is_demo
       group by s.centre_name
       order by turnout desc, sat desc
       limit ${TOP_CENTRES}
    `,

    // The two ends of the difficulty range, across all four papers.
    sql`
      (select paper_id, n, correct_pct from online_question_stats order by correct_pct asc limit 1)
      union all
      (select paper_id, n, correct_pct from online_question_stats order by correct_pct desc limit 1)
    `,

    // Grouped by class, alphabetical within it. All sixty-four scored the same
    // 50 / 50, so there is no order to find — only one to choose.
    sql`
      select s.name, s.class as cls, s.school_name as school
        from online_results r join students s using (uid)
       where not s.is_demo and r.marks = ${TOTAL_MARKS}
       order by array_position(array['IX','X','XI','XII'], s.class), lower(s.name)
    `,
  ]);

  const totals = (totalsRows[0]?.totals ?? {}) as Record<string, number>;

  const bands: Band[] = Array.from({ length: 11 }, (_, i) => {
    const row = bandRows.find((b) => n(b.band) === i);
    return {
      label: i === 10 ? "50" : `${i * 5}–${i * 5 + 4}`,
      from: i * 5,
      students: n(row?.students),
    };
  });

  const ranked = bands.reduce((sum, b) => sum + b.students, 0);

  // "45 or more" is bands 9 and 10 added up — the same students the histogram
  // shows, counted from the top down.
  const thresholds: Threshold[] = [15, 20, 25, 30, 35, 40, 45, 50].map((mark) => {
    const students = bands
      .filter((b) => b.from >= mark)
      .reduce((sum, b) => sum + b.students, 0);
    return {
      mark,
      students,
      share: ranked === 0 ? 0 : Math.round((students / ranked) * 1000) / 10,
    };
  });

  const timing = timingRows[0] ?? {};
  const questions = questionRows.map((q) => ({
    cls: classOfPaper(String(q.paper_id)),
    n: n(q.n),
    correctPct: n(q.correct_pct),
  }));

  return {
    headline: {
      enrolled: n(totals.enrolled),
      sat: n(totals.sat),
      absent: n(totals.absent),
      average: n(totals.average),
      fullMarks: n(totals.fullMarks),
      centres: n(scopeRows[0]?.centres),
      schools: n(scopeRows[0]?.schools),
      ranked,
    },
    classes: byClass(
      classRows.map((r) => ({
        cls: String(r.cls),
        registered: n(r.registered),
        sat: n(r.sat),
        average: n(r.average),
        median: n(r.median),
        highest: n(r.highest),
        fullMarks: n(r.full_marks),
      })),
    ),
    bands,
    thresholds,
    timing: {
      byHand: n(timing.by_hand),
      autoSubmitted: n(timing.auto_submitted),
      averageMinutes: n(timing.average_minutes),
      medianMinutes: n(timing.median_minutes),
    },
    schools: schoolRows.map((r) => ({
      school: String(r.school),
      sat: n(r.sat),
      average: n(r.average),
    })),
    centres: centreRows.map((r) => ({
      centre: String(r.centre),
      registered: n(r.registered),
      sat: n(r.sat),
      turnout: n(r.turnout),
      average: n(r.average),
    })),
    hardest: questions[0],
    easiest: questions[1],
    fullMarkStudents: fullMarkRows.map((r) => ({
      name: forPrint(String(r.name)),
      cls: String(r.cls),
      school: String(r.school),
    })),
  };
}

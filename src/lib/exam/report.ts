/**
 * The public report on SET 2026–27 — every figure behind /results.
 *
 * ⚠️ SERVER ONLY.
 *
 * /results is the *cohort's* page: head teachers, parents, donors and press
 * reading "how did the district do?". A student's own marks live on their portal
 * and are not here. Everything below is an aggregate. Nobody is named — not the
 * sixty-four who scored full marks online, not the one student who answered all
 * hundred written questions correctly. They see their own result on their own
 * page, which is where a child's name belongs.
 *
 * Nothing is invented and nothing is rounded twice. Every number is read from
 * the snapshots written by scripts/publish-results.ts and
 * scripts/import-offline-results.ts — the same rows the students' own marksheets
 * are drawn from — so a school checking a figure here against a pupil's result
 * page will find they agree.
 *
 * Demo accounts (the KIDS team's own IDs) are excluded from every count. A
 * parent reading "6,778 of 9,637 sat it" is being told about children, not about
 * the people who ran the exam.
 *
 * TWO PAPERS, NEVER ADDED TOGETHER
 * --------------------------------
 * Students sat a 50-question online paper and a 100-question written paper on
 * the same morning. They are marked, ranked and published separately, they have
 * different rosters, and no figure here sums them. Where they appear side by
 * side it is on a shared 0–100 *percentage* scale, and the page says so.
 *
 * The written half is returned only when the written paper is published; until
 * then `written` is null and the page reports the online paper alone, exactly as
 * it did between 1 and 27 August.
 *
 * The three CTR-12 students who re-sat on a demo account's admit card and were
 * handed another class's paper are counted as having SAT the online paper — they
 * did — but are left out of its distribution, which is a comparison between
 * students who answered the same questions. That is why the histogram totals
 * 6,775 and the headline says 6,778.
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

/** One five-mark band of the online score distribution; the last one is 50 alone. */
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

/* ─────────────────────────────────────────────────── the written paper ─── */

export interface WrittenHeadline {
  /** The written roster, which is larger than the online one: a few candidates
   *  were admitted after the online exam had already been sat. */
  enrolled: number;
  sat: number;
  absent: number;
  turnout: number;
  /** Marks out of 100. */
  average: number;
  median: number;
  highest: number;
  /** Students who scored 100 out of 100. */
  perfect: number;
}

export interface WrittenClassRow {
  cls: string;
  registered: number;
  sat: number;
  average: number;
  median: number;
  highest: number;
}

export interface WrittenZone {
  zone: string;
  sat: number;
  average: number;
}

/** One of the seven sections of the Class IX and X paper, in both years. */
export interface SectionRow {
  section: string;
  ix: number;
  x: number;
  /** Set on the two sections Class X answered least well relative to Class IX. */
  fell: boolean;
}

/** One subject, Class XI beside Class XII, as a share of that subject correct. */
export interface SubjectRow {
  subject: string;
  xi: number | null;
  xii: number | null;
}

export interface StreamGroup {
  stream: string;
  subjects: SubjectRow[];
  /** English & General Knowledge, which every stream sits, reported separately. */
  english: SubjectRow;
}

export interface WrittenReport {
  headline: WrittenHeadline;
  classes: WrittenClassRow[];
  /** 50 / 75 / 90 / 100 or more, out of a hundred. */
  thresholds: Threshold[];
  zones: WrittenZone[];
  sections: SectionRow[];
  streams: StreamGroup[];
  /** The highest of any class other than the one that produced the top mark. */
  classHighs: { cls: string; highest: number }[];
}

/** The two papers held side by side, on the students who sat both. */
export interface BothPapers {
  sat: number;
  /** Average as a percentage of each paper's own total. */
  onlinePct: number;
  writtenPct: number;
  correlation: number;
}

export interface ExamReport {
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
  /** Null until the written paper is published. */
  written: WrittenReport | null;
  /** Null until the written paper is published. */
  both: BothPapers | null;
}

/** Only schools with this many students sitting are listed: small groups swing wildly. */
const SCHOOL_MINIMUM = 25;
const TOP_SCHOOLS = 8;
const TOP_CENTRES = 8;
const TOTAL_MARKS = 50;
const WRITTEN_TOTAL = 100;

/**
 * A written subject figure is published only if this many candidates sat it.
 *
 * Below thirty an average is noise — and worse, it can identify the children it
 * is built on. Six students sat Accountancy in Class XI Arts; their average is
 * nobody's business but theirs. The rule silently drops the stray rows the
 * export carries for a single miskeyed panel, too.
 */
const SUBJECT_MINIMUM = 30;

/** Sat by every stream, so it is pulled out of the stream tables and shown once. */
const ENGLISH = "English & General Knowledge";

const STREAM_ORDER = ["Commerce", "Science", "Arts"];

const n = (v: unknown) => Number(v ?? 0);
const share = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

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
 *
 * @param withWritten false while the written paper is unpublished — the online
 *   half is returned alone and the written queries are never run.
 */
export async function examReport(withWritten: boolean): Promise<ExamReport> {
  const [
    totalsRows,
    scopeRows,
    classRows,
    bandRows,
    timingRows,
    schoolRows,
    centreRows,
    questionRows,
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
    return { mark, students, share: share(students, ranked) };
  });

  const timing = timingRows[0] ?? {};
  const questions = questionRows.map((q) => ({
    cls: classOfPaper(String(q.paper_id)),
    n: n(q.n),
    correctPct: n(q.correct_pct),
  }));

  const { written, both } = withWritten
    ? await writtenHalf()
    : { written: null, both: null };

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
    written,
    both,
  };
}

/**
 * The written half of the report.
 *
 * Withheld schools are counted here exactly as the schema intends: withholding
 * closes a child's own door, it does not remove them from a cohort figure. They
 * sat the same paper as everyone else.
 */
async function writtenHalf(): Promise<{ written: WrittenReport; both: BothPapers }> {
  const [headRows, classRows, thresholdRows, zoneRows, sectionRows, bothRows] = await Promise.all([
    sql`
      select count(*)      as enrolled,
             count(o.uid)  as sat,
             round(100.0 * count(o.uid) / count(*), 1)           as turnout,
             round(avg(o.marks)::numeric, 2)                     as average,
             percentile_cont(0.5) within group (order by o.marks) as median,
             max(o.marks)                                        as highest,
             count(*) filter (where o.marks = ${WRITTEN_TOTAL})  as perfect
        from students s left join offline_results o using (uid)
       where not s.is_demo
    `,

    // Grouped by the class whose PAPER was marked, not the class on the
    // register: for 46 students the workbook's two class columns disagree, and
    // offline_results.class is the one that decided the answer key.
    sql`
      select coalesce(o.class, s.class) as cls,
             count(*)     as registered,
             count(o.uid) as sat,
             round(avg(o.marks)::numeric, 2)                      as average,
             percentile_cont(0.5) within group (order by o.marks) as median,
             max(o.marks)                                         as highest
        from students s left join offline_results o using (uid)
       where not s.is_demo
       group by 1
    `,

    sql`
      select count(*) filter (where o.marks >= 50)  as ge50,
             count(*) filter (where o.marks >= 75)  as ge75,
             count(*) filter (where o.marks >= 90)  as ge90,
             count(*) filter (where o.marks = 100)  as ge100,
             count(*)                               as total
        from offline_results o join students s using (uid)
       where not s.is_demo
    `,

    // CTR-01..11 Kolkata, 12..15 Suburb, 16..21 Asansol — the register's own
    // split, the same one the stage screen and the topper boards use.
    sql`
      select case when split_part(s.centre_code, '-', 2)::int <= 11 then 'Kolkata'
                  when split_part(s.centre_code, '-', 2)::int <= 15 then 'Kolkata Suburb'
                  else 'Asansol' end as zone,
             count(*) as sat,
             round(avg(o.marks)::numeric, 2) as average
        from offline_results o join students s using (uid)
       where not s.is_demo
       group by 1 order by 3 desc
    `,

    sql`select class, stream, section, total, sat, avg from offline_section_stats`,

    // The students who sat BOTH papers, which is the only cohort on which the
    // two can honestly be compared. Correlation is scale-free, so it does not
    // care that one paper is out of 50 and the other out of 100.
    sql`
      select count(*)                                as sat,
             round(avg(r.marks * 100.0 / ${TOTAL_MARKS})::numeric, 1)   as online_pct,
             round(avg(o.marks * 100.0 / ${WRITTEN_TOTAL})::numeric, 1) as written_pct,
             round(corr(r.marks, o.marks)::numeric, 2)                  as correlation
        from students s
        join online_results  r using (uid)
        join offline_results o using (uid)
       where not s.is_demo
    `,
  ]);

  const head = headRows[0] ?? {};
  const t = thresholdRows[0] ?? {};
  const total = n(t.total);

  const classes = byClass(
    classRows
      .filter((r) => (PAPERS as readonly string[]).includes(String(r.cls)))
      .map((r) => ({
        cls: String(r.cls),
        registered: n(r.registered),
        sat: n(r.sat),
        average: n(r.average),
        median: n(r.median),
        highest: n(r.highest),
      })),
  );

  const stats = sectionRows.map((r) => ({
    cls: String(r.class),
    stream: String(r.stream ?? ""),
    section: String(r.section),
    pct: n(r.total) === 0 ? 0 : Math.round((1000 * n(r.avg)) / n(r.total)) / 10,
    sat: n(r.sat),
  }));

  return {
    written: {
      headline: {
        enrolled: n(head.enrolled),
        sat: n(head.sat),
        absent: n(head.enrolled) - n(head.sat),
        turnout: n(head.turnout),
        average: n(head.average),
        median: n(head.median),
        highest: n(head.highest),
        perfect: n(head.perfect),
      },
      classes,
      thresholds: [
        { mark: 50, students: n(t.ge50), share: share(n(t.ge50), total) },
        { mark: 75, students: n(t.ge75), share: share(n(t.ge75), total) },
        { mark: 90, students: n(t.ge90), share: share(n(t.ge90), total) },
        { mark: 100, students: n(t.ge100), share: share(n(t.ge100), total) },
      ],
      zones: zoneRows.map((r) => ({
        zone: String(r.zone),
        sat: n(r.sat),
        average: n(r.average),
      })),
      sections: schoolSections(stats),
      streams: streamGroups(stats),
      classHighs: classes.map((c) => ({ cls: c.cls, highest: c.highest })),
    },
    both: {
      sat: n(bothRows[0]?.sat),
      onlinePct: n(bothRows[0]?.online_pct),
      writtenPct: n(bothRows[0]?.written_pct),
      correlation: n(bothRows[0]?.correlation),
    },
  };
}

type SectionStat = { cls: string; stream: string; section: string; pct: number; sat: number };

/**
 * The seven sections of the Class IX and X paper, in both years.
 *
 * Every student in those two years sat all seven, so the years genuinely can be
 * compared section by section — the one place on this page where two classes are
 * held against each other, and it is honest because it is the same seven
 * sections either side.
 *
 * `fell` marks the two sections where Class X answered *least* well relative to
 * Class IX. It is a claim about a fall that happened, computed from the two
 * figures beside it — not a judgement about which subjects matter.
 */
function schoolSections(stats: SectionStat[]): SectionRow[] {
  const names = [...new Set(stats.filter((s) => s.cls === "IX" || s.cls === "X").map((s) => s.section))];

  const rows = names
    .map((section) => ({
      section,
      ix: stats.find((s) => s.cls === "IX" && s.section === section)?.pct ?? 0,
      x: stats.find((s) => s.cls === "X" && s.section === section)?.pct ?? 0,
      fell: false,
    }))
    .filter((r) => r.ix > 0 && r.x > 0)
    .sort((a, b) => (b.ix + b.x) / 2 - (a.ix + a.x) / 2);

  for (const r of [...rows].sort((a, b) => a.x - a.ix - (b.x - b.ix)).slice(0, 2)) {
    r.fell = true;
  }
  return rows;
}

/**
 * Classes XI and XII by subject, within each stream.
 *
 * Twenty-five questions per subject, so a percentage is the only figure that
 * travels between a student who chose Physics and one who chose History. Each
 * subject sits under the stream whose students actually sat it — Environmental
 * Science under Arts, where its two hundred and fifty candidates are, not under
 * Science, where one candidate mis-keyed a panel.
 *
 * A subject appears in two streams when two streams genuinely sit it, and its
 * figures differ between them, which is the point of showing it twice.
 */
function streamGroups(stats: SectionStat[]): StreamGroup[] {
  const eligible = stats.filter(
    (s) =>
      (s.cls === "XI" || s.cls === "XII") &&
      STREAM_ORDER.includes(s.stream) &&
      s.sat >= SUBJECT_MINIMUM &&
      !/^Optional Subject/.test(s.section),
  );

  return STREAM_ORDER.flatMap((stream) => {
    const mine = eligible.filter((s) => s.stream === stream);
    const pick = (cls: string, section: string) =>
      mine.find((s) => s.cls === cls && s.section === section)?.pct ?? null;

    const english: SubjectRow = {
      subject: stream,
      xi: pick("XI", ENGLISH),
      xii: pick("XII", ENGLISH),
    };
    if (english.xi === null && english.xii === null) return [];

    const subjects = [...new Set(mine.map((s) => s.section))]
      .filter((section) => section !== ENGLISH)
      .map((subject) => ({ subject, xi: pick("XI", subject), xii: pick("XII", subject) }))
      .sort((a, b) => Math.max(b.xi ?? 0, b.xii ?? 0) - Math.max(a.xi ?? 0, a.xii ?? 0));

    return [{ stream, subjects, english }];
  });
}

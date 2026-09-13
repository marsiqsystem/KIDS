import { sql } from "./db";
import { getPaper, scoreAnswers } from "./papers";
import { loadQuestionSets } from "./question-sets";
import { finalise } from "./attempts";
import { percentileOf, rank, rankAll, type Ranks } from "./ranking";

/**
 * Marking a paper after July, and the SET 2026 award.
 *
 * Both are snapshots, the rule July's publishing ran on (scripts/publish-
 * results.ts): computed once, every mark RE-MARKED from the answer sheet and the
 * loaded key rather than trusted from `attempts.score`, and the whole run
 * refused if the two ever disagree. Publishing a number that cannot be
 * reproduced is the one thing this must never do.
 */

export type Computed =
  | { ok: true; totals: PaperTotals }
  | { ok: false; message: string };

export interface PaperTotals {
  sat: number;
  finalised: number;
  average: number | null;
  highest: number | null;
  cohorts: { cohort: string; sat: number; average: number; highest: number }[];
}

/**
 * Who a student is ranked against, read off the set they were handed.
 *
 * P2-ONLINE-XI-SCIENCE-BENGALI -> "XI SCIENCE". The medium is dropped: a
 * Bengali set is the same paper in another language and ranks with its class,
 * as the July OMR paper did. The stream is kept only when the set itself was
 * split by stream, because then Science and Arts sat different papers and a
 * rank across them would compare two different exams.
 */
export function cohortOf(setCode: string, examPaperCode: string): string {
  const rest = setCode.startsWith(`${examPaperCode}-`) ? setCode.slice(examPaperCode.length + 1) : setCode;
  const [cls, maybeStream] = rest.split("-");
  return maybeStream && ["SCIENCE", "COMMERCE", "ARTS"].includes(maybeStream) ? `${cls} ${maybeStream}` : cls;
}

export async function computePaperResults(examPaperId: string): Promise<Computed> {
  const [paper] = (await sql`
    select id::text, code, name, mode, ends_at, published,
           (published and (publish_at is null or now() >= publish_at)) as visible
      from exam_papers where id = ${examPaperId}::bigint and archived_at is null
  `) as { id: string; code: string; name: string; mode: string; ends_at: Date | null; published: boolean; visible: boolean }[];

  if (!paper) return { ok: false, message: "That paper does not exist." };
  if (paper.code === "P1-ONLINE" || paper.code === "P1-OFFLINE") {
    return { ok: false, message: "Phase 1 was marked in August and is published. It is not recomputed here." };
  }
  if (paper.mode !== "online") return { ok: false, message: "Only a paper sat in the app is marked here." };
  if (!paper.ends_at || new Date(paper.ends_at) > new Date()) {
    return { ok: false, message: "This paper has not closed yet. Marking starts once every student's time is up." };
  }
  // The July rule, kept: never recompute what students can see. Withdraw first.
  if (paper.published) {
    return { ok: false, message: "These results are published. Withdraw them before marking again." };
  }

  await loadQuestionSets(true);

  // 1. Close every paper still open past its deadline -- the auto-submit that
  //    happens when nobody opened the paper again after closing time.
  const expired = (await sql`
    select uid, paper_id from attempts
     where exam_paper_id = ${examPaperId}::bigint and status = 'in_progress' and now() >= deadline_at
  `) as { uid: string; paper_id: string }[];
  // Closing these is right even if the run below is refused: it is exactly what
  // would happen the next time anybody looked at the paper. So the figure the
  // office is shown is not "how many this run closed" -- that would read 0 on
  // a second run -- but how many papers timed out, counted from the rows.
  for (const e of expired) {
    const set = getPaper(e.paper_id);
    if (!set) return { ok: false, message: `The question set ${e.paper_id} is not loaded, so ${e.uid}'s paper cannot be marked.` };
    await finalise(e.uid, (a) => scoreAnswers(set, a), examPaperId);
  }

  // 2. Everyone who handed a paper in.
  const rows = (await sql`
    select a.uid, a.paper_id, a.answers, a.score, a.receipt, a.submitted_at, a.deadline_at,
           s.class, s.stream, s.centre_code, s.school_code, s.is_demo
      from attempts a join students s on s.uid = a.uid
     where a.exam_paper_id = ${examPaperId}::bigint and a.status = 'submitted'
  `) as {
    uid: string; paper_id: string; answers: Record<string, number>; score: number | null;
    receipt: string | null; submitted_at: Date | null; deadline_at: Date;
    class: string; stream: string | null; centre_code: string; school_code: string; is_demo: boolean;
  }[];

  type Row = (typeof rows)[number] & Ranks & {
    marks: number; count: number; correct: number; answered: number; cohort: string;
    /** The real class, kept because rankAll() needs `class` to hold the cohort. */
    realClass: string;
    // rankAll() groups by `class`; for us that is the cohort.
    score: number | null;
  };

  const mismatches: string[] = [];
  const marked: Row[] = [];
  for (const r of rows) {
    const set = getPaper(r.paper_id);
    if (!set) return { ok: false, message: `The question set ${r.paper_id} is not loaded. Nothing was marked.` };
    const correct = scoreAnswers(set, r.answers ?? {});
    if (r.score !== null && r.score !== correct) mismatches.push(`${r.uid}: stored ${r.score}, re-marked ${correct}`);
    const cohort = cohortOf(r.paper_id, paper.code);
    marked.push({
      ...r,
      marks: correct,
      count: set.questions.length,
      correct,
      answered: Object.keys(r.answers ?? {}).length,
      cohort,
      realClass: r.class,
      score: correct,
      class: cohort,
      classRank: null, centreRank: null, schoolRank: null, percentile: null,
    });
  }

  if (mismatches.length) {
    return {
      ok: false,
      message:
        `Refused: ${mismatches.length} stored mark${mismatches.length === 1 ? "" : "s"} could not be reproduced ` +
        `from the answer sheet (${mismatches.slice(0, 3).join("; ")}${mismatches.length > 3 ? "; …" : ""}). ` +
        `Was a question set replaced after students sat it? Nothing was published.`,
    };
  }

  // 3. Rank: within the cohort, the centre and the school; demo accounts in a
  //    pool of their own, so none of them ever pushes a child down a place.
  rankAll(marked, (r) => r);

  const byCohort = new Map<string, Row[]>();
  for (const r of marked.filter((m) => !m.is_demo)) byCohort.set(r.cohort, [...(byCohort.get(r.cohort) ?? []), r]);
  const cohortStats = new Map(
    [...byCohort.entries()].map(([k, list]) => [
      k,
      {
        sat: list.length,
        avg: Math.round((list.reduce((a, r) => a + r.marks, 0) / list.length) * 100) / 100,
        high: Math.max(...list.map((r) => r.marks)),
      },
    ]),
  );

  // At or past the deadline means the paper submitted itself -- July's rule.
  const timedOut = (r: Row) => Boolean(r.submitted_at && new Date(r.submitted_at) >= new Date(r.deadline_at));

  // 4. Write the snapshot.
  await sql`delete from exam_results where exam_paper_id = ${examPaperId}::bigint`;
  const COLS = [
    "uid", "exam_paper_id", "set_code", "class", "stream", "cohort", "centre_code", "school_code",
    "marks", "question_count", "percent", "correct", "wrong", "blank",
    "cohort_rank", "centre_rank", "school_rank", "percentile", "cohort_sat", "cohort_avg", "cohort_high",
    "ranked", "receipt", "submitted_at", "timed_out",
  ];
  const BATCH = 300;
  for (let i = 0; i < marked.length; i += BATCH) {
    const params: unknown[] = [];
    const tuples = marked.slice(i, i + BATCH).map((r) => {
      const st = r.is_demo ? null : cohortStats.get(r.cohort)!;
      const values = [
        r.uid, examPaperId, r.paper_id, r.realClass, r.stream, r.cohort,
        r.centre_code, r.school_code,
        r.marks, r.count, Math.round((r.marks / r.count) * 10000) / 100, r.correct,
        r.answered - r.correct, r.count - r.answered,
        r.classRank, r.centreRank, r.schoolRank,
        r.is_demo ? null : percentileOf(r.classRank, st!.sat),
        st?.sat ?? 1, st?.avg ?? null, st?.high ?? null,
        !r.is_demo, r.receipt, r.submitted_at,
        timedOut(r),
      ];
      return `(${values.map((v) => { params.push(v); return `$${params.length}`; }).join(",")})`;
    });
    await sql.query(`insert into exam_results (${COLS.join(",")}) values ${tuples.join(",")}`, params);
  }

  const real = marked.filter((m) => !m.is_demo);
  const totals: PaperTotals = {
    sat: real.length,
    finalised: real.filter(timedOut).length,
    average: real.length ? Math.round((real.reduce((a, r) => a + r.marks, 0) / real.length) * 100) / 100 : null,
    highest: real.length ? Math.max(...real.map((r) => r.marks)) : null,
    cohorts: [...cohortStats.entries()]
      .map(([cohort, s]) => ({ cohort, sat: s.sat, average: s.avg, highest: s.high }))
      .sort((a, b) => a.cohort.localeCompare(b.cohort, "en", { numeric: true })),
  };

  await sql`
    update exam_papers set computed_at = now(), totals = ${JSON.stringify(totals)}::jsonb
     where id = ${examPaperId}::bigint
  `;
  return { ok: true, totals };
}

/* --------------------------------------------------------------- the award --- */

export interface AwardComparison {
  cohort: string;
  bothPhases: number;
  onePhase: number;
  /** Under "rank everyone in one list": how many of the top 30 sat only one phase. */
  onePhaseInTop30: number;
  /** The 30th-best award among students who sat both phases, for scale. */
  top30Cutoff: number | null;
}

export type AwardComputed =
  | { ok: true; students: number; comparison: AwardComparison[] }
  | { ok: false; message: string };

/**
 * The SET 2026 award: each student's phases, averaged as percentages.
 *
 * Reads each phase's award paper from the table that holds it -- Phase 1's OMR
 * paper from `offline_results`, anything later from `exam_results` -- because
 * those are the two places the marks were published from, and nothing is
 * re-derived here that a student has not already been shown.
 *
 * The rule for a student with one phase is read from exam_series.incomplete, and
 * the comparison returned is computed under the "one list" rule regardless, so
 * the office can see what that rule does to the top of each list before choosing.
 */
export async function computeAward(seriesId: string): Promise<AwardComputed> {
  const [series] = (await sql`
    select id::text, code, award_rule, incomplete, award_published from exam_series where id = ${seriesId}::bigint
  `) as { id: string; code: string; award_rule: string; incomplete: "alone" | "separate"; award_published: boolean }[];
  if (!series) return { ok: false, message: "That series does not exist." };
  if (series.award_published) return { ok: false, message: "The award is published. Withdraw it before computing again." };

  const phases = (await sql`
    select ph.code, ph.ordinal, pa.id::text as paper_id, pa.code as paper_code, pa.mode, pa.computed_at
      from exam_phases ph join exam_papers pa on pa.id = ph.award_paper_id
     where ph.series_id = ${seriesId}::bigint
     order by ph.ordinal
  `) as { code: string; ordinal: number; paper_id: string; paper_code: string; mode: string; computed_at: Date | null }[];

  if (phases.length < 2) return { ok: false, message: "The award needs both phases' papers set." };
  const later = phases.filter((p) => p.paper_code !== "P1-OFFLINE" && p.paper_code !== "P1-ONLINE");
  const unmarked = later.find((p) => !p.computed_at);
  if (unmarked) return { ok: false, message: `${unmarked.paper_code} has not been marked yet. Mark it first.` };

  // Each phase as a percentage, per student.
  const pct = new Map<string, Map<string, number>>(); // phase code -> uid -> percent
  for (const ph of phases) {
    const rows = ph.paper_code === "P1-OFFLINE"
      ? ((await sql`
          select uid, (marks::numeric * 100 / nullif(total_q, 0)) as p from offline_results
           where exam_paper_id = ${ph.paper_id}::bigint`) as { uid: string; p: string }[])
      : ph.paper_code === "P1-ONLINE"
        ? ((await sql`
            select uid, (marks::numeric * 2) as p from online_results
             where exam_paper_id = ${ph.paper_id}::bigint`) as { uid: string; p: string }[])
        : ((await sql`
            select uid, percent as p from exam_results where exam_paper_id = ${ph.paper_id}::bigint`) as { uid: string; p: string }[]);
    pct.set(ph.code, new Map(rows.map((r) => [r.uid, Number(r.p)])));
  }

  const students = (await sql`
    select uid, class, stream, is_demo from students
  `) as { uid: string; class: string; stream: string | null; is_demo: boolean }[];

  type A = {
    uid: string; class: string; stream: string | null; cohort: string; is_demo: boolean;
    p: (number | null)[]; phases: number; award: number; list: "all" | "both" | "one";
    score: number | null; rank: number | null; allRank: number | null;
  };

  const rule = series.award_rule;
  const combine = (vals: number[]): number => {
    if (rule === "best") return Math.max(...vals);
    if (rule === "latest") return vals[vals.length - 1];
    if (rule === "sum") return vals.reduce((a, b) => a + b, 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length; // average
  };

  const awards: A[] = [];
  for (const s of students) {
    const p = phases.map((ph) => pct.get(ph.code)!.get(s.uid) ?? null);
    const have = p.filter((x): x is number => x !== null);
    if (!have.length) continue;
    // Cohort as the OMR paper had it: IX and X by class, XI and XII by stream.
    const cohort = (s.class === "XI" || s.class === "XII") && s.stream ? `${s.class} ${s.stream.toUpperCase()}` : s.class;
    const award = Math.round(combine(have) * 100) / 100;
    awards.push({
      uid: s.uid, class: s.class, stream: s.stream, cohort, is_demo: s.is_demo,
      p, phases: have.length, award,
      list: series.incomplete === "separate" ? (have.length === phases.length ? "both" : "one") : "all",
      score: award, rank: null, allRank: null,
    });
  }

  // Rank under the chosen rule, real students only, within cohort (and list).
  const groups = new Map<string, A[]>();
  for (const a of awards.filter((x) => !x.is_demo)) {
    const k = `${a.cohort}|${a.list}`;
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  for (const g of groups.values()) rank(g, (a, n) => (a.rank = n));

  // The comparison: what ONE LIST would do, whatever the rule is.
  const allGroups = new Map<string, A[]>();
  for (const a of awards.filter((x) => !x.is_demo)) allGroups.set(a.cohort, [...(allGroups.get(a.cohort) ?? []), a]);
  const comparison: AwardComparison[] = [];
  for (const [cohort, g] of allGroups) {
    rank(g, (a, n) => (a.allRank = n));
    const top = g.filter((a) => a.allRank !== null && a.allRank <= 30);
    const bothSorted = g.filter((a) => a.phases === phases.length).map((a) => a.award).sort((x, y) => y - x);
    comparison.push({
      cohort,
      bothPhases: g.filter((a) => a.phases === phases.length).length,
      onePhase: g.filter((a) => a.phases < phases.length).length,
      onePhaseInTop30: top.filter((a) => a.phases < phases.length).length,
      top30Cutoff: bothSorted.length >= 30 ? bothSorted[29] : null,
    });
  }
  comparison.sort((a, b) => a.cohort.localeCompare(b.cohort, "en", { numeric: true }));

  await sql`delete from exam_awards where series_id = ${seriesId}::bigint`;
  const COLS = ["series_id", "uid", "class", "stream", "cohort", "phase1_percent", "phase2_percent",
    "phases", "award_percent", "list", "rank", "ranked"];
  for (let i = 0; i < awards.length; i += 400) {
    const params: unknown[] = [];
    const tuples = awards.slice(i, i + 400).map((a) => {
      const v = [seriesId, a.uid, a.class, a.stream, a.cohort, a.p[0], a.p[1] ?? null,
        a.phases, a.award, a.list, a.is_demo ? null : a.rank, !a.is_demo];
      return `(${v.map((x) => { params.push(x); return `$${params.length}`; }).join(",")})`;
    });
    await sql.query(`insert into exam_awards (${COLS.join(",")}) values ${tuples.join(",")}`, params);
  }

  await sql`
    update exam_series
       set award_computed_at = now(),
           award_rule_used = ${`${rule}/${series.incomplete}`},
           award_comparison = ${JSON.stringify(comparison)}::jsonb
     where id = ${seriesId}::bigint
  `;
  return { ok: true, students: awards.filter((a) => !a.is_demo).length, comparison };
}

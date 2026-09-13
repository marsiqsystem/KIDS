import { sql } from "./db";
import type { Student } from "./db";

/**
 * What a student may see of every paper after July, and of the award.
 *
 * Only what is published AND past its opening moment, compared on the database
 * clock -- the same two conditions July's results opened on. A result computed
 * and not yet published does not exist as far as a phone is concerned.
 */

export interface LaterResult {
  paper_name: string;
  kind: "live" | "mock";
  cohort: string;
  marks: number;
  question_count: number;
  percent: number;
  correct: number;
  wrong: number;
  blank: number;
  cohort_rank: number | null;
  cohort_sat: number;
  cohort_avg: number | null;
  cohort_high: number | null;
  percentile: number | null;
  ranked: boolean;
  receipt: string | null;
  timed_out: boolean;
}

export async function laterResultsFor(student: Student): Promise<LaterResult[]> {
  return (await sql`
    select p.name as paper_name, p.kind, r.cohort, r.marks, r.question_count, r.percent::float as percent,
           r.correct, r.wrong, r.blank, r.cohort_rank, r.cohort_sat, r.cohort_avg::float as cohort_avg,
           r.cohort_high, r.percentile::float as percentile, r.ranked, r.receipt, r.timed_out
      from exam_results r
      join exam_papers p on p.id = r.exam_paper_id
     where r.uid = ${student.uid}
       and p.published and (p.publish_at is null or now() >= p.publish_at)
     order by p.starts_at desc nulls last
  `.catch(() => [])) as LaterResult[];
}

export interface AwardResult {
  series_name: string;
  phase1_percent: number | null;
  phase2_percent: number | null;
  phases: number;
  award_percent: number;
  list: "all" | "both" | "one";
  cohort: string;
  rank: number | null;
  ranked: boolean;
  cohort_size: number;
}

export async function awardFor(student: Student): Promise<AwardResult | null> {
  const rows = (await sql`
    select se.name as series_name, a.phase1_percent::float as phase1_percent,
           a.phase2_percent::float as phase2_percent, a.phases, a.award_percent::float as award_percent,
           a.list, a.cohort, a.rank, a.ranked,
           (select count(*)::int from exam_awards x
             where x.series_id = a.series_id and x.cohort = a.cohort and x.list = a.list and x.ranked) as cohort_size
      from exam_awards a
      join exam_series se on se.id = a.series_id
     where a.uid = ${student.uid}
       and se.award_published and (se.award_publish_at is null or now() >= se.award_publish_at)
     order by se.id desc
     limit 1
  `.catch(() => [])) as AwardResult[];
  return rows[0] ?? null;
}

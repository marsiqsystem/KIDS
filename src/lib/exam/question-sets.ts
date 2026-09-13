import { sql } from "./db";
import { registerLoadedPapers, type Paper } from "./papers";

/**
 * Question sets loaded into the database, made available to getPaper().
 *
 * July's papers are a file in the repository; every later paper is a row in
 * `exam_question_sets`, because the repository is public and a paper committed
 * before its exam is a paper everybody has read. See the table's comment in
 * schema.sql and scripts/load-question-set.ts.
 *
 * getPaper() is synchronous and called from inside the exam's hot path, so the
 * rows are read into memory here and handed to papers.ts. Anything that is
 * about to ask for a paper awaits `loadQuestionSets()` first. One query a
 * minute per server instance at most -- and on exam morning the paper does not
 * change, so a minute's staleness costs nothing. A set loaded the evening before
 * reaches every server well before anyone scans in.
 *
 * If the load fails, whatever was loaded last stays. A student who is already
 * mid-paper must never lose their paper to a database blip.
 */

const TTL_MS = 60_000;
let loadedAt = 0;
let inflight: Promise<void> | null = null;

export async function loadQuestionSets(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const rows = (await sql`
        select code, questions, answer_key from exam_question_sets
      `) as { code: string; questions: Paper["questions"]; answer_key: number[] }[];
      registerLoadedPapers(
        new Map(rows.map((r) => [r.code, { id: r.code, questions: r.questions, key: r.answer_key }])),
      );
      loadedAt = Date.now();
    } catch {
      // Keep the last good copy. See above.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

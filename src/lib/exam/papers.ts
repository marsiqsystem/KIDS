// Explicit .ts specifier so scripts/finalise-attempts.ts can import this module
// on bare Node, which does not do extensionless resolution. See tsconfig.
import { PRACTICE_QUESTIONS } from "./practice-questions.ts";
import type { Question } from "./question";

/**
 * The papers.
 *
 * ⚠️ SERVER ONLY. This module holds the answer keys. Import it from a Client
 * Component and every key ships to every phone, and the exam is over before it
 * begins. Route handlers and Server Components only — the client is given
 * `publicQuestions()`, which cannot carry a key because the type has no room
 * for one.
 */

export type Paper = {
  id: string;
  /** Index of the correct option, per question. Never leaves the server. */
  key: number[];
  questions: Question[];
};

export const REHEARSAL_PAPER_ID = "SET2026-REHEARSAL";

/**
 * The rehearsal paper — the five practice questions, with a key bolted on.
 *
 * It exists so the machinery (start, save, resume, auto-submit, score) can be
 * driven end to end by a real person on a real phone before 9,378 children do it
 * at once. It is NOT a real paper and must never be handed to a real student:
 * `windowFor()` will only schedule it against an `is_demo` record.
 */
const REHEARSAL: Paper = {
  id: REHEARSAL_PAPER_ID,
  questions: PRACTICE_QUESTIONS,
  // Mango (a fruit among flowers) · 30 · 40 km/h · 0.7 · Kolkata
  key: [2, 1, 1, 0, 1],
};

/**
 * The four real papers — SET2026-IX, -X, -XI, -XII — DO NOT EXIST YET.
 *
 * Nobody has written them. Returning null here rather than inventing questions
 * is deliberate: on 19 July a missing paper must fail loudly, in advance, and
 * not quietly hand a child fifty questions that no examiner ever approved.
 */
export function getPaper(paperId: string): Paper | null {
  if (paperId === REHEARSAL_PAPER_ID) return REHEARSAL;
  return null;
}

/** The paper, stripped of its key, safe to send to a phone. */
export function publicQuestions(paper: Paper): Question[] {
  return paper.questions.map(({ q, context, options }) => ({ q, context, options }));
}

/**
 * Mark an answer sheet.
 *
 * Answers arrive as { "0": 2, "3": 1 } — question index to chosen option. An
 * unanswered question is simply absent. No negative marking: nobody has told us
 * there is any, and inventing one would change every student's result.
 */
export function scoreAnswers(paper: Paper, answers: Record<string, number>): number {
  return paper.key.reduce(
    (score, correct, i) => (answers[String(i)] === correct ? score + 1 : score),
    0,
  );
}

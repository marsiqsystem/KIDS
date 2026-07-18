// Explicit .ts specifier so scripts/finalise-attempts.ts can import this module
// on bare Node, which does not do extensionless resolution. See tsconfig.
import { SET2026_PAPERS } from "./set2026-papers.ts";
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

/**
 * The paper for a class id: SET2026-IX, -X, -XI or -XII.
 *
 * The real questions live in set2026-papers.ts; this is the one lookup the rest
 * of the exam goes through. An unknown id returns null so a caller can fail
 * loudly rather than hand a child an empty paper — but for the four real ids it
 * now returns the real, examiner-approved 50-question papers.
 */
export function getPaper(paperId: string): Paper | null {
  return SET2026_PAPERS[paperId] ?? null;
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

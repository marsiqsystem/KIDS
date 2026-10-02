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
  /**
   * For a set that offers a choice of subjects (XI and XII): which subjects are
   * optional, by their questions' `section`, and how many a student takes.
   * Absent on every paper where everybody answers everything.
   */
  choice?: { optional: string[]; choose: number };
};

/**
 * The paper one student actually sits: the compulsory questions plus the
 * subjects they chose, in the set's own order, with the key cut to match.
 *
 * Everything downstream -- the questions sent to the phone, the answers saved
 * by question number, the mark -- works on THIS paper, so question 26 of a
 * Physics student and question 26 of a History student are different questions
 * and nothing gets confused, because each is only ever compared with its own
 * student's paper.
 *
 * A set with no choice comes back unchanged. One with a choice but no subjects
 * yet (the student has not chosen) comes back as its compulsory part only; no
 * phone is sent questions before the choice is made, so that only matters to a
 * paper that timed out unchosen, which is marked on what was answered: nothing.
 */
export function paperFor(paper: Paper, subjects: string[] | null | undefined): Paper {
  if (!paper.choice) return paper;
  const optional = new Set(paper.choice.optional);
  const chosen = new Set(subjects ?? []);
  const keep = paper.questions
    .map((_, i) => i)
    .filter((i) => {
      const subject = paper.questions[i].section ?? "";
      return !optional.has(subject) || chosen.has(subject);
    });
  return {
    id: paper.id,
    questions: keep.map((i) => paper.questions[i]),
    key: keep.map((i) => paper.key[i]),
  };
}

/** Is this a valid choice of subjects for this paper? */
export function validChoice(paper: Paper, subjects: unknown): subjects is string[] {
  if (!paper.choice) return false;
  if (!Array.isArray(subjects) || subjects.length !== paper.choice.choose) return false;
  if (new Set(subjects).size !== subjects.length) return false;
  return subjects.every((s) => typeof s === "string" && paper.choice!.optional.includes(s));
}

/**
 * The paper for a class id: SET2026-IX, -X, -XI or -XII.
 *
 * The real questions live in set2026-papers.ts; this is the one lookup the rest
 * of the exam goes through. An unknown id returns null so a caller can fail
 * loudly rather than hand a child an empty paper — but for the four real ids it
 * now returns the real, examiner-approved 50-question papers.
 */
/**
 * Papers loaded from the database -- everything after July. Filled by
 * src/lib/exam/question-sets.ts, which cannot be imported from here: this file
 * is also loaded by scripts on bare Node, and it must not drag a database client
 * in with it. So the loader pushes rows in, and this file only reads them.
 */
let loaded = new Map<string, Paper>();

export function registerLoadedPapers(papers: Map<string, Paper>): void {
  loaded = papers;
}

/**
 * A paper by its set code.
 *
 * The July file first, and it always wins: those four papers are what 6,780
 * students were marked on, and nothing loaded later may replace one of them
 * under the same code.
 */
export function getPaper(paperId: string): Paper | null {
  return SET2026_PAPERS[paperId] ?? loaded.get(paperId) ?? null;
}

/** The paper, stripped of its key, safe to send to a phone. */
export function publicQuestions(paper: Paper): Question[] {
  return paper.questions.map(({ q, context, options, section, image, optionImages }) => ({
    q,
    context,
    options,
    ...(section ? { section } : {}),
    ...(image ? { image } : {}),
    ...(optionImages?.some(Boolean) ? { optionImages } : {}),
  }));
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

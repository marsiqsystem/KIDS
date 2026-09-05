"use server";

import { requireStudent } from "@/lib/app/gate";
import { writtenPaper } from "@/lib/app/record";
import { reviewQuestions } from "@/lib/exam/offline-review";

/**
 * The explanation behind one question of this student's written paper.
 *
 * Fetched on tap rather than shipped with the sheet. The 100 explanations are
 * several times the weight of the sheet itself, and a student on a school's 3G
 * pays for every one of them at page load whether or not they open a single
 * question. The sheet carries the stems and options — enough to answer "what
 * was this question, what did I mark, what was the key" without a round trip —
 * and only the "why" costs a request.
 *
 * The gate is re-checked here, and so is publication: an action is a public
 * endpoint, and the fact that a page rendered a minute ago is not a reason to
 * answer. A student can only ever ask about their OWN paper, because the sheet
 * is looked up from their session and never from an argument.
 */
export interface Explanation {
  n: number;
  whyCorrect: string | null;
  whyWrong: string | null;
  whyOthers: { index: number; text: string }[];
  chapter: string;
}

export async function explainQuestion(n: number): Promise<Explanation | null> {
  const student = await requireStudent();
  const paper = await writtenPaper(student);
  if (paper.state !== "ready" || !paper.sheet) return null;

  const q = reviewQuestions(paper.sheet, student.medium).find((x) => x.n === n);
  if (!q) return null;

  return {
    n: q.n,
    whyCorrect: q.whyCorrect,
    whyWrong: q.whyWrong,
    whyOthers: q.whyOthers,
    chapter: q.chapter,
  };
}

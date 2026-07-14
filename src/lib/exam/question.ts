/**
 * A question, as a student sees it.
 *
 * This type lives on its own, away from `papers.ts`, because the client must be
 * able to name the shape of a question without importing the module that holds
 * the answer keys. There is deliberately nowhere in here to put a correct
 * answer.
 */
export type Question = {
  q: string;
  /** The passage a question hangs off, when it has one. Rendered above the stem. */
  context?: string;
  options: string[];
};

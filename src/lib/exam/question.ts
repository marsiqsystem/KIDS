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
  /**
   * The section a question sits in ("Life Science"), when the paper names them.
   * Only drawn — a heading in the app's question list. July's papers have none.
   */
  section?: string;
  /**
   * A diagram for the question, by image id -- drawn under the stem. Only
   * papers written in the control centre have them; July's have none. The
   * bytes are served by /api/exam-image/<id>, and only once the paper opens.
   */
  image?: string;
  /** A picture per option, by image id, where an option is (or has) a figure. */
  optionImages?: (string | null)[];
};

/** Where a question image is fetched from. */
export function examImageUrl(id: string): string {
  return `/api/exam-image/${id}`;
}

/** An image id: 32 lowercase hex characters, minted at upload. */
export const IMAGE_ID = /^[0-9a-f]{32}$/;

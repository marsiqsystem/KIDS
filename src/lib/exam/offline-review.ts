/**
 * The written paper, question by question.
 *
 * ⚠️ SERVER ONLY. This imports the question bank, which holds the answer keys.
 * That was a hanging offence before 11:00 on 19 July; it is simply how a
 * marksheet works now. The gate is `offlinePublicationState()` — no page built
 * on this module renders until the result is out.
 *
 * `offline_results` stores what the scanner read off the paper: the bubble
 * filled and the bubble the key wanted, as characters. It does not store the
 * questions, because the questions were on paper in the child's hands. This
 * module puts the two back together.
 *
 * The join is arithmetic, not a lookup table. A question id is
 * `<class>|<stream>|<subject>|<n>`, and every part is derivable:
 *
 *   IX and X sit one paper, filed under the stream "All" and the subject
 *     "General Paper", numbered 1..100 straight through.
 *   XI and XII answer four blocks of 25. English & General Knowledge is common
 *     to the whole class so it too is filed under "All"; the three chosen
 *     subjects are filed under the student's own stream. `n` restarts at 1 in
 *     each block, which is why the stored section carries its first question.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { OfflineMarksheet, OfflineQuestion, OfflineStatus } from "./offline-results";

interface BankQuestion {
  id: string;
  stem: string;
  context: string | null;
  options: string[];
  /** 0-based index into `options`. */
  answer: number;
}
interface ChapterRow { id: string; section: string; chapter: string }
interface Explanation {
  id: string;
  why_correct: string;
  why_wrong: Record<string, string>;
}

/**
 * Read once per server process, not per request. These three files are ~3 MB
 * together and never change between deploys; parsing them on every result view
 * would be the single slowest thing on the page.
 */
function load<T>(file: string): T {
  const p = path.join(process.cwd(), "src", "data", "questions", file);
  return JSON.parse(readFileSync(p, "utf8")) as T;
}
let cache: {
  bank: Map<string, BankQuestion>;
  chapter: Map<string, ChapterRow>;
  why: Map<string, Explanation>;
} | null = null;

/**
 * The `-bn` files hold ONLY the questions that differ between the two mediums —
 * Class IX History Q26-40 and Class X Geography Q41-55, 30 in all. Everything
 * else is a straight translation and shares one entry, so they are merged over
 * the default bank under ids suffixed `|BN` and looked up first for a
 * Bengali-medium candidate. A question with no `|BN` entry simply falls through
 * to the shared one, which is why only those 30 are here.
 */
function bank() {
  if (!cache) {
    const merge = <T extends { id: string }>(base: string, bn: string) =>
      new Map([...load<T[]>(base), ...load<T[]>(bn)].map((x) => [x.id, x]));
    cache = {
      bank: merge<BankQuestion>("questions.json", "questions-bn.json"),
      chapter: merge<ChapterRow>("question-chapters.json", "question-chapters-bn.json"),
      why: merge<Explanation>("explanations.json", "explanations-bn.json"),
    };
  }
  return cache;
}

/** One question of the written paper, with everything a student can be told. */
export interface ReviewedQuestion extends OfflineQuestion {
  /** The id in the question bank, for anything that wants to join further. */
  id: string;
  stem: string;
  context: string | null;
  options: string[];
  /** Index of the correct option, or null where the question was withdrawn. */
  answerIndex: number | null;
  /** Index of what they marked, or null. */
  pickedIndex: number | null;
  chapter: string;
  whyCorrect: string | null;
  /** Why the option they chose was wrong — only when they chose a wrong one. */
  whyWrong: string | null;
  /**
   * Why each of the OTHER wrong options is wrong, keyed by option index.
   * The design shows these too: a student who guessed right still deserves to
   * know why the others fail, and one who guessed wrong learns more from the
   * three they did not pick than from the one they did.
   */
  whyOthers: { index: number; text: string }[];
}

export interface ChapterScore {
  chapter: string;
  section: string;
  total: number;
  correct: number;
  lost: number;
}

const LETTERS = ["a", "b", "c", "d", "e"];

/** The question-bank id for question `n` of this student's paper. */
function idFor(sheet: OfflineMarksheet, q: OfflineQuestion): string | null {
  const sec = sheet.sections.find((s) => q.n >= s.first && q.n <= s.last);
  if (!sec) return null;
  // A panel the student left blank and never named has no subject and so no
  // questions to show. It is a real 0 out of 25, not a gap in the data.
  if (/not attempted/i.test(sec.name)) return null;

  if (sheet.class === "IX" || sheet.class === "X") {
    return `${sheet.class}|All|General Paper|${q.n}`;
  }
  const local = q.n - sec.first + 1;
  const stream = sec.name === "English & General Knowledge" ? "All" : (sheet.stream ?? "All");
  return `${sheet.class}|${stream}|${sec.name}|${local}`;
}

/**
 * Every question of this student's paper, joined to the bank.
 *
 * A question the bank does not know is returned with empty text rather than
 * dropped: the student sat 100 questions and the sheet must show 100 rows, even
 * if one of them can only say what they marked.
 */
export function reviewQuestions(
  sheet: OfflineMarksheet,
  medium = "",
): ReviewedQuestion[] {
  const { bank: qs, chapter: chs, why: whys } = bank();
  // A candidate who sat another medium's paper is shown that paper's question
  // and explanation where the two differ. Falling back to the shared entry is
  // what keeps this to the 30 questions that actually differ.
  const suffix = medium ? `|${medium.trim().toUpperCase()}` : "";
  const pick = <T>(m: Map<string, T>, id: string | null) =>
    id ? (suffix ? m.get(id + suffix) ?? m.get(id) : m.get(id)) : undefined;

  return sheet.questions.map((q) => {
    const base = idFor(sheet, q);
    const id = base && suffix && qs.has(base + suffix) ? base + suffix : base;
    const b = pick(qs, base);
    const ch = pick(chs, base);
    const w = pick(whys, base);

    const pickedIndex = q.marked ? LETTERS.indexOf(q.marked) : -1;
    const answerIndex = b && q.status !== "grace" ? b.answer : -1;

    return {
      ...q,
      id: id ?? "",
      stem: b?.stem ?? "",
      context: b?.context ?? null,
      options: b?.options ?? [],
      answerIndex: answerIndex >= 0 ? answerIndex : null,
      pickedIndex: pickedIndex >= 0 ? pickedIndex : null,
      chapter: ch?.chapter ?? "",
      whyCorrect: w?.why_correct ?? null,
      whyWrong:
        w && pickedIndex >= 0 && q.status === "wrong"
          ? w.why_wrong?.[String(pickedIndex)] ?? null
          : null,
      whyOthers: Object.entries(w?.why_wrong ?? {})
        // A double mark has no pick to hold back: nobody knows which of the two
        // bubbles was meant, so every wrong option is still worth explaining.
        .filter(([k]) => q.status === "double" || Number(k) !== pickedIndex)
        .map(([k, text]) => ({ index: Number(k), text }))
        .sort((a, b) => a.index - b.index),
    };
  });
}

/**
 * Where the marks went, by chapter — the list that decides what to revise.
 *
 * Worked out from the chapters the questions came from, not from single
 * questions, so one unlucky guess never sends a child back over a whole
 * chapter they already know.
 */
export function chapterScores(reviewed: ReviewedQuestion[]): ChapterScore[] {
  const byChapter = new Map<string, ChapterScore>();
  for (const q of reviewed) {
    if (!q.chapter) continue;
    const row = byChapter.get(q.chapter) ?? {
      chapter: q.chapter, section: q.section, total: 0, correct: 0, lost: 0,
    };
    row.total += 1;
    if (q.status === "correct" || q.status === "grace") row.correct += 1;
    else row.lost += 1;
    byChapter.set(q.chapter, row);
  }
  return [...byChapter.values()].sort(
    (a, b) => b.lost - a.lost || a.chapter.localeCompare(b.chapter),
  );
}

/** Human wording for a status, used in more than one place. */
export const STATUS_WORD: Record<OfflineStatus, string> = {
  correct: "Correct",
  wrong: "Wrong",
  blank: "Left blank",
  double: "Two bubbles filled",
  grace: "Withdrawn — awarded to everyone",
};

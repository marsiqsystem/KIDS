import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The question bank, as the daily loop needs to see it.
 *
 * ⚠️ SERVER ONLY. This holds the answer keys.
 *
 * The exam's own reader is src/lib/exam/offline-review.ts, which joins the same
 * three files to a marked OMR sheet. This one indexes them the other way round
 * — by class, stream and section, so a pool can be drawn — and deliberately
 * does not import that module: the marksheet has been serving children since
 * August and is not worth disturbing for a shared cache. If a third reader ever
 * appears, hoist the loader out of both.
 *
 * Everything here is read from `src/data/questions/` at run time. Not one count
 * in this app is a literal typed by hand — that is the standing ruling about
 * the design's placeholder digits.
 */

export interface BankQuestion {
  id: string;
  class: string;
  stream: string;
  section: string;
  q_no: number;
  context: string | null;
  stem: string;
  options: string[];
  /** 0-based index into `options`. */
  answer: number;
}

export interface ChapterRow {
  id: string;
  section: string;
  chapter: string;
}

export interface Explanation {
  id: string;
  approved?: boolean;
  why_correct: string;
  /** Keyed by option index, as a string. Only the wrong ones appear. */
  why_wrong: Record<string, string>;
}

function load<T>(file: string): T {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "src", "data", "questions", file), "utf8"),
  ) as T;
}

let cache: {
  questions: Map<string, BankQuestion>;
  chapters: Map<string, ChapterRow>;
  why: Map<string, Explanation>;
} | null = null;

/**
 * Read once per server process. ~1.3 MB of JSON that never changes between
 * deploys; parsing it per request would be the slowest thing in the app.
 *
 * The `-bn` files hold ONLY the 30 questions that differ between mediums (Class
 * IX History Q26-40, Class X Geography Q41-55). They merge OVER the base under
 * ids suffixed with the medium — `|BENGALI`, exactly equal to `students.medium`
 * uppercased. A suffix that does not equal that column matches nothing and
 * every Bengali-medium child silently gets the English paper, which is a bug
 * this codebase has already had once.
 */
function bank() {
  if (!cache) {
    const merge = <T extends { id: string }>(base: string, bn: string) =>
      new Map([...load<T[]>(base), ...load<T[]>(bn)].map((row) => [row.id, row]));

    cache = {
      questions: merge<BankQuestion>("questions.json", "questions-bn.json"),
      chapters: merge<ChapterRow>("question-chapters.json", "question-chapters-bn.json"),
      why: merge<Explanation>("explanations.json", "explanations-bn.json"),
    };
  }
  return cache;
}

/** The stream a question is filed under for this student. */
function streamFor(cls: string, stream: string | null, section: string): string {
  // IX and X sit one common paper; so does English & General Knowledge for XI
  // and XII. Both are filed under "All", as in the bank and in offline-review.
  if (cls === "IX" || cls === "X") return "All";
  if (section === "English & General Knowledge") return "All";
  return stream ?? "All";
}

/**
 * Which sections exist for this student's class and stream, with how many
 * questions and chapters each holds.
 *
 * This is what the subject chooser lists, and the numbers on it are these — not
 * the design's mock ones.
 */
export interface SectionInfo {
  section: string;
  questions: number;
  chapters: number;
  /** Chapters in this section with an approved video. Design 4b puts this on
   *  every row, because the question count and the video count are what the
   *  choice actually buys. */
  videos: number;
}

export function sectionsFor(cls: string, stream: string | null): SectionInfo[] {
  const { questions, chapters } = bank();
  const counts = new Map<string, { q: number; ch: Set<string> }>();

  for (const q of questions.values()) {
    if (q.class !== cls) continue;
    if (q.stream !== streamFor(cls, stream, q.section)) continue;
    // The medium variants are substitutions for questions already counted here,
    // not extra ones. Counting them would inflate every section they touch.
    if (isMediumVariant(q.id)) continue;

    const row = counts.get(q.section) ?? { q: 0, ch: new Set<string>() };
    row.q += 1;
    const chapter = chapters.get(q.id)?.chapter;
    if (chapter) row.ch.add(chapter);
    counts.set(q.section, row);
  }

  const videos = videoCounts(cls, stream);
  return [...counts.entries()]
    .map(([section, row]) => ({
      section,
      questions: row.q,
      chapters: row.ch.size,
      videos: videos.get(section) ?? 0,
    }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

/** `X|All|General Paper|41|BENGALI` has five parts; the base id has four. */
function isMediumVariant(id: string): boolean {
  return id.split("|").length > 4;
}

/**
 * Every question id this student may be asked, in their own medium.
 *
 * The order is the paper's order, which is also chapter order — so a pool
 * walked from the front teaches a subject in the sequence it was written.
 */
export function poolFor(
  cls: string,
  stream: string | null,
  medium: string,
  sections: string[],
): string[] {
  const { questions } = bank();
  const wanted = new Set(sections);
  const suffix = medium ? `|${medium.trim().toUpperCase()}` : "";
  const ids: { id: string; section: string; q_no: number }[] = [];

  for (const q of questions.values()) {
    if (q.class !== cls) continue;
    if (!wanted.has(q.section)) continue;
    if (q.stream !== streamFor(cls, stream, q.section)) continue;
    if (isMediumVariant(q.id)) continue;

    // If this student's medium has its own version of the question, that IS
    // their question — same number, same paper, different words.
    const own = suffix && questions.has(q.id + suffix) ? q.id + suffix : q.id;
    ids.push({ id: own, section: q.section, q_no: q.q_no });
  }

  ids.sort((a, b) => a.section.localeCompare(b.section) || a.q_no - b.q_no);
  return ids.map((x) => x.id);
}

/** One question, ready to render: stem, options, chapter, and the teardown. */
export interface LoadedQuestion extends BankQuestion {
  chapter: string | null;
  whyCorrect: string | null;
  /** Why each wrong option is wrong, keyed by option index. */
  whyWrong: Record<number, string>;
}

export function questionById(id: string): LoadedQuestion | null {
  const { questions, chapters, why } = bank();
  const q = questions.get(id);
  if (!q) return null;

  const explanation = why.get(id);
  // `approved` is a human sign-off. An unreviewed explanation is withheld
  // rather than shown — the same rule chapter-assets.ts applies to a trick.
  const usable = explanation && explanation.approved !== false ? explanation : null;

  const whyWrong: Record<number, string> = {};
  for (const [index, text] of Object.entries(usable?.why_wrong ?? {})) {
    whyWrong[Number(index)] = text;
  }

  return {
    ...q,
    chapter: chapters.get(id)?.chapter ?? null,
    whyCorrect: usable?.why_correct ?? null,
    whyWrong,
  };
}

/** The chapter a question belongs to, for grouping a summary. */
export function chapterOf(id: string): string | null {
  return bank().chapters.get(id)?.chapter ?? null;
}

export function sectionOf(id: string): string | null {
  return bank().questions.get(id)?.section ?? null;
}

// ------------------------------------------------------------- the chapters --

/**
 * A chapter as the Learn tab lists it: its real size, and whether it has a
 * video that a human has approved.
 *
 * "Real size" is the point. A chapter here is a sitting, not a course — the
 * median is 3 questions and the largest is 11 — and the browse list says so
 * before a student taps into one expecting a syllabus.
 */
export interface ChapterInfo {
  /** base64url of `bucket|chapter`, safe in a URL however the chapter is named. */
  key: string;
  bucket: string;
  section: string;
  chapter: string;
  questionIds: string[];
  video: { id: string; language: string | null; duration: string | null; start: number | null } | null;
  trick: string | null;
}

export interface ChapterAssetRow {
  bucket: string;
  chapter: string;
  approved: boolean;
  trick: string;
  video?: { query: string; video_id: string | null; approved?: boolean; language?: string; duration?: string; start?: number };
}

let assetCache: Map<string, ChapterAssetRow> | null = null;

function assets(): Map<string, ChapterAssetRow> {
  if (!assetCache) {
    // The -bn file adds the chapters only the Bengali paper covers. They sit in
    // the SAME buckets and are told apart by chapter name, so the two merge
    // without colliding. Same arrangement as src/lib/exam/chapter-assets.ts.
    assetCache = new Map(
      [...load<ChapterAssetRow[]>("chapter-assets.json"), ...load<ChapterAssetRow[]>("chapter-assets-bn.json")]
        .map((r) => [`${r.bucket}|${r.chapter}`, r]),
    );
  }
  return assetCache;
}

export const chapterKey = (bucket: string, chapter: string) =>
  Buffer.from(`${bucket}|${chapter}`, "utf8").toString("base64url");

/** Every chapter of this student's class and stream, in paper order. */
export function chaptersFor(
  cls: string,
  stream: string | null,
  medium: string,
  sections?: string[],
): ChapterInfo[] {
  const { questions, chapters } = bank();
  const suffix = medium ? `|${medium.trim().toUpperCase()}` : "";
  const wanted = sections ? new Set(sections) : null;
  const out = new Map<string, ChapterInfo>();

  for (const q of questions.values()) {
    if (q.class !== cls) continue;
    if (q.stream !== streamFor(cls, stream, q.section)) continue;
    if (isMediumVariant(q.id)) continue;
    if (wanted && !wanted.has(q.section)) continue;

    const chapter = chapters.get(q.id)?.chapter;
    if (!chapter) continue;

    const bucket = `${cls}|${streamFor(cls, stream, q.section)}|${q.section}`;
    const mapKey = `${bucket}|${chapter}`;
    let row = out.get(mapKey);

    if (!row) {
      const asset = assets().get(mapKey);
      // `approved` is a human sign-off on the teaching content. Unapproved
      // material is withheld rather than shown, the same rule the marksheet's
      // reader applies.
      const usable = asset && asset.approved ? asset : null;
      const video =
        usable?.video?.video_id && usable.video.approved !== false
          ? {
              id: usable.video.video_id,
              language: usable.video.language ?? null,
              // Only 54 of 316 videos carry a duration, and it is free text
              // ("12 min"), not a clock. Shown when present, never invented.
              duration: usable.video.duration ?? null,
              start: usable.video.start ?? null,
            }
          : null;

      row = {
        key: chapterKey(bucket, chapter),
        bucket,
        section: q.section,
        chapter,
        questionIds: [],
        video,
        trick: usable?.trick ?? null,
      };
      out.set(mapKey, row);
    }

    row.questionIds.push(suffix && questions.has(q.id + suffix) ? q.id + suffix : q.id);
  }

  return [...out.values()].sort(
    (a, b) => a.section.localeCompare(b.section) || a.chapter.localeCompare(b.chapter),
  );
}

/** One chapter, found by the key in the URL. Null if it is not this student's. */
export function chapterByKey(
  cls: string,
  stream: string | null,
  medium: string,
  key: string,
): ChapterInfo | null {
  return chaptersFor(cls, stream, medium).find((c) => c.key === key) ?? null;
}

/** How many chapters of a section have an approved video. */
export function videoCounts(cls: string, stream: string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const chapter of chaptersFor(cls, stream, "")) {
    if (!chapter.video) continue;
    counts.set(chapter.section, (counts.get(chapter.section) ?? 0) + 1);
  }
  return counts;
}

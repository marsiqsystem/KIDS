/**
 * The teaching content for one chapter: the trick, the activity, the video.
 *
 * SERVER ONLY, like the question bank it sits beside.
 *
 * A chapter asset is keyed by (bucket, chapter) where bucket is
 * `<class>|<stream>|<subject>` — the same shape the question bank uses, and the
 * same shape `question-chapters.json` records. The lookup here is therefore a
 * plain join and not a fuzzy title match, which matters: two Class XII Arts
 * chapters share a title with two others in different subjects, and a title-only
 * lookup files one of them under the wrong subject. That already happened once
 * when importing videos.
 *
 * `approved` is a human sign-off on the teaching content. Anything not approved
 * is not returned, so an unreviewed trick cannot reach a child even if it is
 * sitting in the file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type InteractiveTemplate =
  | "match-pairs" | "sort-bins" | "true-false" | "odd-one-out"
  | "timeline-order" | "fill-blank" | "step-solve" | "formula-pick"
  | "label-diagram" | "transform";

export interface ChapterAsset {
  bucket: string;
  chapter: string;
  approved: boolean;
  trick: string;
  video: { query: string; video_id: string | null; approved?: boolean; language?: string };
  interactive: { template: InteractiveTemplate; data: Record<string, unknown> };
}

let cache: Map<string, ChapterAsset> | null = null;

function all(): Map<string, ChapterAsset> {
  if (!cache) {
    const p = path.join(process.cwd(), "src", "data", "questions", "chapter-assets.json");
    const rows = JSON.parse(readFileSync(p, "utf8")) as ChapterAsset[];
    cache = new Map(rows.map((r) => [`${r.bucket}|${r.chapter}`, r]));
  }
  return cache;
}

/**
 * The asset for one chapter of one student's paper, or null.
 *
 * `section` is the subject as the scorer named it, which is exactly the last
 * part of the bucket. English & General Knowledge is common to a whole class
 * and so is filed under the stream "All", as it is in the question bank.
 */
export function chapterAsset(
  cls: string, stream: string | null, section: string, chapter: string,
): ChapterAsset | null {
  const streamPart =
    cls === "IX" || cls === "X" || section === "English & General Knowledge"
      ? "All"
      : stream ?? "All";
  const hit = all().get(`${cls}|${streamPart}|${section}|${chapter}`);
  if (!hit || !hit.approved) return null;
  return hit;
}

/** Which templates the page can actually play, as opposed to only show. */
export const PLAYABLE = new Set<InteractiveTemplate>([
  "match-pairs", "sort-bins", "true-false", "odd-one-out",
]);

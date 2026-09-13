import { chaptersFor } from "@/lib/app/bank";
import { loadVideoOverrides, videoOverride } from "@/lib/content/video-overrides";

/**
 * The chapters of one class and stream, as the Content tab lists them.
 *
 * Read through the same `chaptersFor` the Learn tab uses, so what the office
 * sees here is what a student in that class sees -- with one addition: whether
 * the video on each chapter is the reviewed file's or one the office changed.
 */

export interface ContentChapter {
  bucket: string;
  section: string;
  chapter: string;
  questions: number;
  videoId: string | null;
  source: "file" | "changed" | "removed" | "none";
}

export async function contentChapters(cls: string, stream: string | null): Promise<ContentChapter[]> {
  // Forced: the office has just changed something and must see it now, not in a
  // minute. Students take the cached copy.
  await loadVideoOverrides(true);

  return chaptersFor(cls, cls === "XI" || cls === "XII" ? stream : null, "").map((c) => {
    const o = videoOverride(c.bucket, c.chapter);
    return {
      bucket: c.bucket,
      section: c.section,
      chapter: c.chapter,
      questions: c.questionIds.length,
      videoId: c.video?.id ?? null,
      source: o ? (o.videoId ? "changed" : "removed") : c.video ? "file" : "none",
    };
  });
}

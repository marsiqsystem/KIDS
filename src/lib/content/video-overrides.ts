import { sql } from "@/lib/exam/db";

/**
 * Videos the office has changed, laid over the reviewed JSON files.
 *
 * The chapter content is read synchronously from files by two readers --
 * src/lib/app/bank.ts for the Learn tab and src/lib/exam/chapter-assets.ts for
 * the result page -- and both are called from inside plain loops on many
 * screens. Turning all of that async to consult a table would ripple through
 * the Learn tab for the sake of one field.
 *
 * So the table is read once into memory and both readers consult the copy
 * synchronously. The pages that show a video call `loadVideoOverrides()` before
 * they read content, and that call hits the database at most once a minute per
 * server instance. A change made in the control centre therefore reaches every
 * phone within about a minute, which the Content tab says out loud.
 *
 * If the load fails or was never called, the overrides are simply absent and
 * the file's video shows -- the video that was there before anybody changed
 * anything. That is the safe direction for this to fail in.
 */

export interface VideoOverride {
  /** Null means the office took the video down. */
  videoId: string | null;
  language: string | null;
  start: number | null;
}

const TTL_MS = 60_000;

let current = new Map<string, VideoOverride>();
let loadedAt = 0;
let inflight: Promise<void> | null = null;

export async function loadVideoOverrides(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < TTL_MS) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const rows = (await sql`
        select bucket, chapter, video_id, language, start_at from content_video_overrides
      `) as { bucket: string; chapter: string; video_id: string | null; language: string | null; start_at: number | null }[];
      current = new Map(
        rows.map((r) => [
          `${r.bucket}|${r.chapter}`,
          { videoId: r.video_id, language: r.language, start: r.start_at },
        ]),
      );
      loadedAt = Date.now();
    } catch {
      // Keep whatever was loaded last. A content table that cannot be reached
      // is never a reason for a chapter page to fail.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** The override for a chapter, if the office has set one. Synchronous. */
export function videoOverride(bucket: string, chapter: string): VideoOverride | undefined {
  return current.get(`${bucket}|${chapter}`);
}

/**
 * An 11-character YouTube id out of whatever the office pasted.
 *
 * They will paste a watch link, a youtu.be link, a Shorts link, an embed link,
 * or the id alone, and every one of those is the same video.
 */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([\w-]{11})/) ??
    s.match(/youtu\.be\/([\w-]{11})/) ??
    s.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/);
  return m ? m[1] : null;
}

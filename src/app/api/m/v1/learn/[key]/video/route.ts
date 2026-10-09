import { json, mobileStudent } from "@/lib/app/mobile-api";
import { chapterByKey } from "@/lib/app/bank";
import { logAppEvent } from "@/lib/app/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Ask for a video" — the website's requestVideoAction, for a chapter with no
 * explainer filmed. Recorded in app_events as `video_wanted`, the same row the
 * website writes, so both are counted with one query.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const { key } = await params;

  const chapter = chapterByKey(student.class, student.stream, student.medium, key);
  if (!chapter) return json({ ok: false, message: "That chapter is not on your paper." }, 404);

  await logAppEvent(student.uid, "video_wanted", { bucket: chapter.bucket, chapter: chapter.chapter });
  return json({ ok: true });
}

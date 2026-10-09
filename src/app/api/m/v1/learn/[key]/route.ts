import { json, mobileStudent } from "@/lib/app/mobile-api";
import { loadVideoOverrides } from "@/lib/content/video-overrides";
import { chapterByKey, questionById } from "@/lib/app/bank";
import { answersFor } from "@/lib/app/loop";
import { subjectHue } from "@/lib/app/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One chapter, for the native app — the website's /app/learn/[key] (board 07,
 * 2C): the trick, the video, and this student's history with each question.
 * Stems only; no options and no key — those come one at a time from practice.
 */
const onDay = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(date);

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const { key } = await params;

  await loadVideoOverrides();
  const chapter = chapterByKey(student.class, student.stream, student.medium, key);
  if (!chapter) return json({ ok: false, message: "That chapter is not on your paper." }, 404);

  const answers = await answersFor(student.uid);
  const questions = chapter.questionIds
    .map((id) => ({ id, row: answers.get(id) ?? null, q: questionById(id) }))
    .filter((x) => x.q)
    .map(({ id, row, q }) => ({
      id,
      stem: q!.stem,
      state: !row ? "new" : row.was_correct ? "right" : "again",
      on: row ? onDay(row.last_answered_at) : null,
    }));

  const seen = questions.filter((q) => q.state !== "new").length;
  const right = questions.filter((q) => q.state === "right").length;

  return json({
    ok: true,
    key: chapter.key,
    section: chapter.section,
    hue: subjectHue(chapter.section),
    chapter: chapter.chapter,
    video: chapter.video,
    trick: chapter.trick,
    total: chapter.questionIds.length,
    seen,
    right,
    toRevise: seen - right,
    questions,
  });
}

import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { chapterByKey } from "@/lib/app/bank";
import { playCards } from "@/lib/app/loop";
import { answerChapter } from "@/lib/app/answer";
import { subjectHue } from "@/lib/app/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One chapter's questions, played on demand — the website's
 * /app/learn/[key]/practice.
 *
 * GET                  → { cards } without their answers.
 * POST { id, chosen }  → { ok: true, verdict }, recorded exactly as the daily
 *                        set records (see answerChapter for why), or
 *                        { ok: false, message }.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const { key } = await params;

  const chapter = chapterByKey(student.class, student.stream, student.medium, key);
  if (!chapter) return json({ ok: false, message: "That chapter is not on your paper." }, 404);

  const cards = (await playCards(student, chapter.questionIds)).map((c) => ({ ...c, hue: subjectHue(c.section) }));
  return json({ ok: true, chapter: chapter.chapter, cards });
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  try {
    const verdict = await answerChapter(student, String(body?.id ?? ""), Number(body?.chosen));
    return json({ ok: true, verdict });
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : "That answer was not taken." });
  }
}

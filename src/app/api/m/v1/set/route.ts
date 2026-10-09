import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { loopState, playCards } from "@/lib/app/loop";
import { answerDaily } from "@/lib/app/answer";
import { subjectHue } from "@/lib/app/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Today's five, for the native app — the website's /app/set.
 *
 * GET                  → { state: "play", cards, startAt } — the cards WITHOUT
 *                        their answers (PlayCard carries none), resumed where
 *                        the student left off; or { state } naming where to go
 *                        instead: "subjects" | "none" | "done".
 * POST { id, chosen }  → { ok: true, verdict } — written down before it is
 *                        told, by the same answerDaily the website calls;
 *                        { ok: false, message } when refused.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const state = await loopState(student);
  if (state.needsSubjects) return json({ ok: true, state: "subjects" });
  if (!state.set) return json({ ok: true, state: "none" });
  if (state.set.answered >= state.set.questionIds.length) return json({ ok: true, state: "done" });

  const cards = (await playCards(student, state.set.questionIds)).map((c) => ({ ...c, hue: subjectHue(c.section) }));
  return json({ ok: true, state: "play", cards, startAt: state.set.answered });
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  try {
    const verdict = await answerDaily(student, String(body?.id ?? ""), Number(body?.chosen));
    return json({ ok: true, verdict });
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : "That answer was not taken." });
  }
}

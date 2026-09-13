import { NextResponse } from "next/server";
import { appGate, bindPaperToPhone, OTHER_PHONE } from "@/lib/exam/app-gate";
import { deadlineFor } from "@/lib/exam/schedule";
import { publicQuestions, scoreAnswers } from "@/lib/exam/papers";
import { startOrResume, finalise, logEvent, findAttempt } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open the paper in the app -- or resume it.
 *
 * July's start endpoint, with the three things the app gate adds: a signed-in
 * student, checked in at a centre, on the phone the paper is running on. The
 * rest is deliberately identical, because July's was proven on 6,780 students:
 * one deadline for the whole hall, the original deadline on resume, the draft
 * finalised the moment the window closes, and no question sent a second early.
 */
export async function POST() {
  const gated = await appGate({ requireCheckin: true });
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, window, paper, phase, deviceId } = gated.ctx;

  if (phase === "before" || phase === "scanning") {
    return NextResponse.json({
      ok: true,
      state: "waiting",
      startsAt: window.startsAt.toISOString(),
      serverNow: new Date().toISOString(),
    });
  }

  if (phase === "over") {
    await finalise(student.uid, (answers) => scoreAnswers(paper, answers), window.examPaperId);
    const done = await findAttempt(student.uid, window.examPaperId);
    return NextResponse.json({ ok: true, state: "over", receipt: done?.receipt ?? null });
  }

  const attempt = await startOrResume(student.uid, paper.id, deadlineFor(window), window.examPaperId);

  if (attempt.status === "submitted") {
    return NextResponse.json({ ok: true, state: "submitted", receipt: attempt.receipt ?? null });
  }

  if (!(await bindPaperToPhone(student.uid, window.examPaperId, deviceId))) {
    await logEvent(student.uid, "blur", { paper: window.examPaperId, refused: "other_phone" });
    return NextResponse.json(OTHER_PHONE, { status: 409 });
  }

  if (new Date(attempt.deadline_at) <= new Date()) {
    await finalise(student.uid, (answers) => scoreAnswers(paper, answers), window.examPaperId);
    const done = await findAttempt(student.uid, window.examPaperId);
    return NextResponse.json({ ok: true, state: "over", receipt: done?.receipt ?? null });
  }

  const resumed = Object.keys(attempt.answers ?? {}).length > 0;
  await logEvent(student.uid, "start", { paper: paper.id, resumed, via: "app" });

  return NextResponse.json(
    {
      ok: true,
      state: "live",
      questions: publicQuestions(paper),
      answers: attempt.answers ?? {},
      deadlineAt: attempt.deadline_at,
      serverNow: new Date().toISOString(),
      resumed,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

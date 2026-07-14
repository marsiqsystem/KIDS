import { NextRequest, NextResponse } from "next/server";
import { gate } from "@/lib/exam/api-gate";
import { deadlineFor } from "@/lib/exam/schedule";
import { publicQuestions, scoreAnswers } from "@/lib/exam/papers";
import { startOrResume, finalise, logEvent } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open the paper.
 *
 * Also the RESUME endpoint: a phone that died at 10:47 scans the card again,
 * arrives here, and is handed back the same deadline and the last answers we
 * banked. Starting and resuming are one code path so that the rare one cannot
 * rot while the common one is exercised.
 *
 * The questions do not exist anywhere the client can reach before this returns
 * them, and this refuses to return them before `startsAt`. That is the only
 * thing standing between a curious student and next Sunday's paper.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await gate(body?.id, body?.t);
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, window, paper, phase } = gated.ctx;

  if (phase === "before" || phase === "scanning") {
    return NextResponse.json({
      ok: true,
      state: "waiting",
      startsAt: window.startsAt.toISOString(),
      serverNow: new Date().toISOString(),
    });
  }

  // Window has closed. If they were mid-attempt and never pressed Submit, that
  // draft becomes their paper now — this is the "auto-submitted at 11:00" promise.
  if (phase === "over") {
    await finalise(student.uid, (answers) => scoreAnswers(paper, answers));
    return NextResponse.json({ ok: true, state: "over" });
  }

  const attempt = await startOrResume(student.uid, paper.id, deadlineFor(window));

  if (attempt.status === "submitted") {
    // One attempt only. They have already sat it.
    return NextResponse.json({ ok: true, state: "submitted" });
  }

  // The deadline that counts is the one written on THIS STUDENT'S attempt, not
  // the one implied by the window. The two are normally the same moment — but
  // nothing enforces that, and if they ever drift (a rescheduled window, a
  // reissued config) the student's own deadline is the one they were promised.
  // Trusting the window instead would hand out a paper whose time is already up.
  if (new Date(attempt.deadline_at) <= new Date()) {
    await finalise(student.uid, (answers) => scoreAnswers(paper, answers));
    return NextResponse.json({ ok: true, state: "over" });
  }

  const resumed = Object.keys(attempt.answers ?? {}).length > 0;
  await logEvent(student.uid, "start", { paper: paper.id, resumed });

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
    // A paper is not a cacheable document.
    { headers: { "Cache-Control": "no-store" } },
  );
}

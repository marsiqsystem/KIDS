import { NextRequest, NextResponse } from "next/server";
import { appGate, bindPaperToPhone, OTHER_PHONE } from "@/lib/exam/app-gate";
import { cleanAnswers } from "@/lib/exam/api-gate";
import { scoreAnswers } from "@/lib/exam/papers";
import { submit, logEvent, findAttempt } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Submit. Answered with the receipt, because the receipt is what a student keeps.
 *
 * A retry after a timeout the phone never saw updates nothing the second time,
 * and is still answered with the same receipt -- so a child whose first tap
 * went through on bad data is shown their number rather than an error.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await appGate({ requireCheckin: true });
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, paper, window, deviceId } = gated.ctx;

  if (!(await bindPaperToPhone(student.uid, window.examPaperId, deviceId))) {
    return NextResponse.json(OTHER_PHONE, { status: 409 });
  }

  const answers = cleanAnswers(body?.answers, paper);
  const accepted = await submit(student.uid, answers, scoreAnswers(paper, answers), window.examPaperId);
  if (accepted) {
    await logEvent(student.uid, "submit", { answered: Object.keys(answers).length, via: "app" });
  }

  const attempt = await findAttempt(student.uid, window.examPaperId);
  return NextResponse.json(
    {
      ok: true,
      state: attempt?.status === "submitted" ? "submitted" : "not_accepted",
      receipt: attempt?.receipt ?? null,
      submittedAt: attempt?.submitted_at ?? null,
      answered: Object.keys(attempt?.answers ?? {}).length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { gate, cleanAnswers } from "@/lib/exam/api-gate";
import { scoreAnswers } from "@/lib/exam/papers";
import { submit, logEvent } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hand the paper in.
 *
 * Idempotent, because the network is not: a phone that submits, times out, and
 * retries must not be told it has already sat the exam — it must be told, again,
 * that it is submitted. `submit()` updates nothing the second time and we report
 * success either way.
 *
 * Marked here and now, while we hold the answers. No result is returned: 9,440
 * students learning their score at 11:00, in a hall, before the written paper at
 * 11:30, is not a thing anybody wants.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await gate(body?.id, body?.t);
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, paper } = gated.ctx;
  const answers = cleanAnswers(body?.answers, paper);

  const accepted = await submit(student.uid, answers, scoreAnswers(paper, answers));
  if (accepted) {
    await logEvent(student.uid, "submit", { answered: Object.keys(answers).length });
  }

  return NextResponse.json(
    { ok: true, state: "submitted" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

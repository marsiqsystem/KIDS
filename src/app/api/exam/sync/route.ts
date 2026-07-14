import { NextRequest, NextResponse } from "next/server";
import { gate, cleanAnswers } from "@/lib/exam/api-gate";
import { saveDraft } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bank a draft.
 *
 * Called about every 60 seconds, and again whenever a phone comes back from a
 * dead spot — so roughly 120 times per student, ~10,000 students, inside half an
 * hour. It does exactly one UPDATE of one row found by primary key, and returns
 * almost nothing. Keep it that way.
 *
 * A refusal here is not an error the student should ever see: their answers are
 * already safe on their own phone. It means the attempt is finished or the
 * deadline has passed, and the paper they are looking at is no longer the paper
 * of record.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await gate(body?.id, body?.t);
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, paper } = gated.ctx;

  const saved = await saveDraft(student.uid, cleanAnswers(body?.answers, paper));

  return NextResponse.json(
    { ok: true, saved, savedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

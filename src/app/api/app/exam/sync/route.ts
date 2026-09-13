import { NextRequest, NextResponse } from "next/server";
import { appGate, bindPaperToPhone, OTHER_PHONE } from "@/lib/exam/app-gate";
import { cleanAnswers } from "@/lib/exam/api-gate";
import { saveDraft } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Save the whole answer sheet. See saveDraft() for why it is a snapshot, not a delta. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await appGate({ requireCheckin: true });
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, paper, window, deviceId } = gated.ctx;

  if (!(await bindPaperToPhone(student.uid, window.examPaperId, deviceId))) {
    return NextResponse.json(OTHER_PHONE, { status: 409 });
  }

  const saved = await saveDraft(student.uid, cleanAnswers(body?.answers, paper), window.examPaperId);
  return NextResponse.json(
    { ok: true, saved, savedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

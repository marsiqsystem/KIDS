import { NextRequest, NextResponse } from "next/server";
import { appGate } from "@/lib/exam/app-gate";
import { recordCheckin, verifyCheckin } from "@/lib/exam/checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Check in: the student's phone sends what it scanned off the invigilator's
 * screen, or the six digits under it.
 *
 * Only while check-in is actually open -- from the paper's scan time until it
 * closes. A code scanned the evening before, or after the paper has ended,
 * checks nobody in.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await appGate({ requireCheckin: false });
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, window, phase, deviceId, checkin } = gated.ctx;

  if (!window.requiresCheckin) {
    return NextResponse.json({ ok: true, state: "not_needed" });
  }
  if (checkin) {
    return NextResponse.json({ ok: true, state: "checked_in", centre: checkin.centre_code });
  }
  if (phase === "before") {
    return NextResponse.json(
      { ok: false, reason: "too_early", message: "Check-in has not opened yet. The code works once your invigilator starts the desk." },
      { status: 409 },
    );
  }
  if (phase === "over") {
    return NextResponse.json(
      { ok: false, reason: "over", message: "This paper has closed." },
      { status: 409 },
    );
  }

  const verified = await verifyCheckin(window.examPaperId, String(body?.input ?? ""));
  if (!verified.ok) {
    return NextResponse.json({ ok: false, reason: "bad_code", message: verified.reason }, { status: 400 });
  }

  const row = await recordCheckin(student.uid, window.examPaperId, verified.centre, verified.method, deviceId);

  return NextResponse.json(
    {
      ok: true,
      state: "checked_in",
      centre: row.centre_code,
      // Said, not refused: see exam_checkins in schema.sql.
      elsewhere: row.centre_code !== student.centre_code,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

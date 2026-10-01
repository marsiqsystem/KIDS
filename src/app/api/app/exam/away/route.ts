import { NextRequest, NextResponse } from "next/server";
import { appGate } from "@/lib/exam/app-gate";
import { cleanAway, recordAway } from "@/lib/exam/away";
import { findAttempt } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The phone reporting that the paper left its screen, and when it came back.
 * See src/lib/exam/away.ts.
 *
 * Same gate as saving an answer — signed in, checked in, a paper open — but
 * deliberately NOT the one-phone binding: a report from the phone that was
 * just replaced is still true about what happened on it, and refusing it would
 * hide exactly the moment that matters. It records only against a paper this
 * student has actually started.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await appGate({ requireCheckin: true });
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, window } = gated.ctx;
  const attempt = await findAttempt(student.uid, window.examPaperId);
  if (!attempt) return NextResponse.json({ ok: false, message: "No paper started." }, { status: 409 });

  const stored = await recordAway(student.uid, window.examPaperId, cleanAway(body?.away));
  return NextResponse.json({ ok: true, stored }, { headers: { "Cache-Control": "no-store" } });
}

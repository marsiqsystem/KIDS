import { NextRequest, NextResponse } from "next/server";
import { appGate, bindPaperToPhone, OTHER_PHONE } from "@/lib/exam/app-gate";
import { validChoice } from "@/lib/exam/papers";
import { sql } from "@/lib/exam/db";
import { logEvent } from "@/lib/exam/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A student's choice of optional subjects, for a set that offers one.
 *
 * Made once, in the paper's first minute, and then fixed -- as the three panel
 * codes were on July's answer sheet. Fixed on the server, in the update itself
 * (`where subjects is null`), so a second tap, a second phone or a retried
 * request can never swap History for Geography after the student has seen
 * the History questions.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const gated = await appGate({ requireCheckin: true });
  if (!gated.ok) return NextResponse.json(gated.body, { status: gated.status });

  const { student, window, set, phase, deviceId } = gated.ctx;

  if (!set.choice) {
    return NextResponse.json({ ok: false, reason: "no_choice", message: "This paper has no subjects to choose." }, { status: 409 });
  }
  if (phase !== "live") {
    return NextResponse.json({ ok: false, reason: "not_live", message: "The paper is not open." }, { status: 409 });
  }
  if (!(await bindPaperToPhone(student.uid, window.examPaperId, deviceId))) {
    return NextResponse.json(OTHER_PHONE, { status: 409 });
  }

  const subjects = body?.subjects;
  if (!validChoice(set, subjects)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "bad_choice",
        message: `Choose exactly ${set.choice.choose} of: ${set.choice.optional.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const saved = (await sql`
    update attempts set subjects = ${JSON.stringify(subjects)}::jsonb
     where uid = ${student.uid} and exam_paper_id = ${window.examPaperId}::bigint
       and status = 'in_progress' and subjects is null
    returning subjects
  `) as { subjects: string[] }[];

  if (saved.length) {
    await logEvent(student.uid, "subjects", { paper: window.examPaperId, subjects });
    return NextResponse.json({ ok: true, subjects: saved[0].subjects }, { headers: { "Cache-Control": "no-store" } });
  }

  // Nothing written: either the choice was already made (then say what it is,
  // and the phone carries on with it) or there is no paper in progress.
  const [row] = (await sql`
    select subjects, status from attempts where uid = ${student.uid} and exam_paper_id = ${window.examPaperId}::bigint
  `) as { subjects: string[] | null; status: string }[];
  if (row?.subjects) {
    return NextResponse.json({ ok: true, subjects: row.subjects, already: true }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { ok: false, reason: "no_attempt", message: "Open the paper first." },
    { status: 409 },
  );
}

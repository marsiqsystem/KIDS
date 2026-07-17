import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/exam/db";
import { isAdmin } from "@/lib/admin/auth";
import { EXAM } from "@/lib/exam/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One student, in full: status, timings, the answer sheet as a grid, and the mark. */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const uid = (new URL(request.url).searchParams.get("uid") ?? "").replace(/\D/g, "");
  if (uid.length !== 9) return NextResponse.json({ ok: false, message: "bad uid" }, { status: 400 });

  const rows = (await sql`
    select
      s.uid, s.name, s.class, s.stream, s.school_name, s.centre_code, s.dob,
      a.status, a.score, a.paper_id,
      a.started_at, a.submitted_at, a.deadline_at, a.last_sync_at, a.answers
    from students s
    left join attempts a on a.uid = s.uid
    where s.uid = ${uid}
  `) as Record<string, unknown>[];

  if (!rows.length) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  const r = rows[0];

  const answers = (r.answers as Record<string, number> | null) ?? {};
  const total = EXAM.questionCount;
  const filled = Array.from({ length: total }, (_, i) => String(i) in answers);
  const answered = filled.filter(Boolean).length;

  return NextResponse.json({
    ok: true,
    student: {
      uid: String(r.uid),
      name: String(r.name),
      class: String(r.class),
      stream: r.stream ? String(r.stream) : null,
      schoolName: String(r.school_name),
      centreCode: String(r.centre_code),
      dob: r.dob ? String(r.dob) : null,
    },
    attempt: {
      status: (r.status as string) ?? "not_started",
      paperId: r.paper_id ? String(r.paper_id) : null,
      score: r.score === null || r.score === undefined ? null : Number(r.score),
      total,
      answered,
      filled,
      startedAt: r.started_at ? new Date(r.started_at as string).toISOString() : null,
      submittedAt: r.submitted_at ? new Date(r.submitted_at as string).toISOString() : null,
      deadlineAt: r.deadline_at ? new Date(r.deadline_at as string).toISOString() : null,
      lastSyncAt: r.last_sync_at ? new Date(r.last_sync_at as string).toISOString() : null,
    },
  });
}

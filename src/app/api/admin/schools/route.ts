import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/exam/db";
import { isAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The schools that sit at one centre, with their counts. Drill level 2. */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const centre = params.get("centre") ?? "";
  const demo = params.get("demo") === "1";
  if (!centre) return NextResponse.json({ ok: false, message: "centre required" }, { status: 400 });

  const rows = (await sql`
    select
      s.school_code                                        as school_code,
      s.school_name                                        as school_name,
      count(*)                                             as enrolled,
      count(a.uid)                                         as started,
      count(a.uid) filter (where a.status = 'submitted')   as submitted,
      count(a.uid) filter (where a.status = 'in_progress') as in_progress
    from students s
    left join attempts a on a.uid = s.uid
    where s.centre_code = ${centre} and (${demo} or not s.is_demo)
    group by s.school_code, s.school_name
    order by s.school_name
  `) as Record<string, number | string>[];

  const schools = rows.map((r) => {
    const enrolled = Number(r.enrolled);
    const started = Number(r.started);
    return {
      schoolCode: String(r.school_code),
      schoolName: String(r.school_name),
      enrolled,
      started,
      submitted: Number(r.submitted),
      inProgress: Number(r.in_progress),
      notStarted: enrolled - started,
    };
  });

  return NextResponse.json({ ok: true, centre, schools });
}

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/exam/db";
import { isAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every student at one school, with what we hold for each: whether they started,
 * how many they answered, and — once submitted — their mark. Drill level 3.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const centre = params.get("centre") ?? "";
  const school = params.get("school") ?? "";
  const demo = params.get("demo") === "1";
  if (!centre || !school) {
    return NextResponse.json({ ok: false, message: "centre and school required" }, { status: 400 });
  }

  const rows = (await sql`
    select
      s.uid                                                             as uid,
      s.name                                                            as name,
      s.class                                                           as class,
      s.stream                                                          as stream,
      a.status                                                          as status,
      a.score                                                           as score,
      a.submitted_at                                                    as submitted_at,
      (select count(*) from jsonb_object_keys(coalesce(a.answers, '{}'::jsonb))) as answered
    from students s
    left join attempts a on a.uid = s.uid
    where s.centre_code = ${centre} and s.school_code = ${school} and (${demo} or not s.is_demo)
    order by s.name
  `) as Record<string, unknown>[];

  const students = rows.map((r) => ({
    uid: String(r.uid),
    name: String(r.name),
    class: String(r.class),
    stream: r.stream ? String(r.stream) : null,
    status: (r.status as string) ?? "not_started",
    answered: Number(r.answered ?? 0),
    score: r.score === null || r.score === undefined ? null : Number(r.score),
    submittedAt: r.submitted_at ? new Date(r.submitted_at as string).toISOString() : null,
  }));

  return NextResponse.json({ ok: true, centre, school, students });
}

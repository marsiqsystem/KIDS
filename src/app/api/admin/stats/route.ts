import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/exam/db";
import { isAdmin } from "@/lib/admin/auth";
import { CENTRES } from "@/lib/centres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The numbers behind /admin, all as aggregates so this stays cheap at 9,588 rows
 * even polled every few seconds by an anxious organiser on exam morning.
 *
 * `?demo=1` folds in the KIDS Team demo records, so the dashboard can be watched
 * working before there is a single real attempt. Off, it is the real exam only.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const demo = new URL(request.url).searchParams.get("demo") === "1";

  const [overviewRows, centreRows, classRows, activityRows] = await Promise.all([
    sql`
      select
        count(*)                                                     as enrolled,
        count(a.uid)                                                 as started,
        count(a.uid) filter (where a.status = 'submitted')           as submitted,
        count(a.uid) filter (where a.status = 'in_progress')         as in_progress,
        count(a.uid) filter (
          where a.status = 'in_progress'
            and a.last_sync_at > now() - interval '2 minutes'
        )                                                            as active_now,
        coalesce(round(
          avg((select count(*) from jsonb_object_keys(a.answers)))
            filter (where a.status = 'submitted')
        , 1), 0)                                                     as avg_answered
      from students s
      left join attempts a on a.uid = s.uid
      where (${demo} or not s.is_demo)
    `,
    sql`
      select
        s.centre_code                                        as centre_code,
        count(*)                                             as enrolled,
        count(a.uid)                                         as started,
        count(a.uid) filter (where a.status = 'submitted')   as submitted,
        count(a.uid) filter (where a.status = 'in_progress') as in_progress
      from students s
      left join attempts a on a.uid = s.uid
      where (${demo} or not s.is_demo)
      group by s.centre_code
      order by s.centre_code
    `,
    sql`
      select
        s.class                                              as class,
        count(*)                                             as enrolled,
        count(a.uid)                                         as started,
        count(a.uid) filter (where a.status = 'submitted')   as submitted,
        count(a.uid) filter (where a.status = 'in_progress') as in_progress
      from students s
      left join attempts a on a.uid = s.uid
      where (${demo} or not s.is_demo)
      group by s.class
      order by s.class
    `,
    sql`
      select e.uid, e.kind, e.at, s.name, s.class, s.centre_code
      from exam_events e
      join students s on s.uid = e.uid
      where (${demo} or not s.is_demo)
      order by e.at desc
      limit 40
    `,
  ]);

  const o = overviewRows[0] as Record<string, number>;
  const enrolled = Number(o.enrolled);
  const started = Number(o.started);

  const overview = {
    enrolled,
    started,
    notStarted: enrolled - started,
    inProgress: Number(o.in_progress),
    submitted: Number(o.submitted),
    activeNow: Number(o.active_now),
    avgAnswered: Number(o.avg_answered),
  };

  const centreName = (code: string) => CENTRES[code.slice(-2)]?.name ?? code;

  const centres = (centreRows as Record<string, number | string>[]).map((r) => {
    const enr = Number(r.enrolled);
    const start = Number(r.started);
    return {
      code: String(r.centre_code),
      name: centreName(String(r.centre_code)),
      enrolled: enr,
      started: start,
      submitted: Number(r.submitted),
      inProgress: Number(r.in_progress),
      notStarted: enr - start,
    };
  });

  const classes = (classRows as Record<string, number | string>[]).map((r) => {
    const enr = Number(r.enrolled);
    const start = Number(r.started);
    return {
      class: String(r.class),
      enrolled: enr,
      started: start,
      submitted: Number(r.submitted),
      inProgress: Number(r.in_progress),
      notStarted: enr - start,
    };
  });

  const activity = (activityRows as Record<string, unknown>[]).map((r) => ({
    uid: String(r.uid),
    kind: String(r.kind),
    at: new Date(r.at as string).toISOString(),
    name: String(r.name),
    class: String(r.class),
    centreCode: String(r.centre_code),
  }));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    demo,
    overview,
    centres,
    classes,
    activity,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { currentStaff } from "@/lib/admin/session";
import { logAdminEvent } from "@/lib/admin/staff";
import { deskCode, deskCounts, deskSearch, mayRunDesk, releasePaper } from "@/lib/exam/checkin";
import { sql } from "@/lib/exam/db";
import { qrSvg } from "@/lib/qr-svg";
import { deskAwayDetail, deskAwayList } from "@/lib/exam/away";
import { changeStars, deskStarList } from "@/lib/exam/stars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The invigilator's desk.
 *
 * GET  ?paper=&centre=            the code to show now, and the centre's counts
 * POST { paper, centre, q }       find a student
 * POST { paper, centre, release } let a student's paper carry on on another phone
 * POST { paper, centre, detail }  one student: school, stars, each time they left
 * POST { paper, centre, star, by } give (by 1) or take back (by -1) a star
 *
 * The screen asks for a new code once every thirty seconds, on the step
 * boundary, and every eight seconds while the paper itself is running, so the
 * "Watch these students" list is current -- about 900 requests a desk across a
 * two-hour paper, each one a signature and a handful of counts, while the
 * database is awake anyway with every student's answers being saved. It is the
 * one screen in the control centre that refreshes by itself, and it does so
 * only while a paper's check-in is actually open: outside that window it
 * returns no code and the screen stops asking. A desk left open on a laptop
 * overnight costs nothing.
 *
 * Every request re-checks that this member of staff may run THIS desk.
 */

async function authorise(paper: string, centre: string) {
  const staff = await currentStaff();
  if (!staff || staff.must_change) return { error: NextResponse.json({ ok: false, message: "Sign in to the control centre." }, { status: 401 }) };
  if (!/^\d+$/.test(paper) || !/^CTR-\d{2}$/.test(centre)) {
    return { error: NextResponse.json({ ok: false, message: "No desk was named." }, { status: 400 }) };
  }
  if (!(await mayRunDesk(staff.staff_id, staff.role === "admin", paper, centre))) {
    return { error: NextResponse.json({ ok: false, message: "You are not assigned to this desk." }, { status: 403 }) };
  }
  return { staff };
}

/** Drawn on the server, so the desk screen is a picture and a timer and nothing more. */
function withSvg(c: ReturnType<typeof deskCode>) {
  return { ...c, svg: qrSvg(c.payload, "desk-qr") };
}

export async function GET(request: NextRequest) {
  const paper = request.nextUrl.searchParams.get("paper") ?? "";
  const centre = request.nextUrl.searchParams.get("centre") ?? "";
  const auth = await authorise(paper, centre);
  if (auth.error) return auth.error;

  const [p] = (await sql`
    select name, scan_opens_at, starts_at, ends_at, requires_checkin
      from exam_papers where id = ${paper}::bigint and archived_at is null
  `) as { name: string; scan_opens_at: Date | null; starts_at: Date | null; ends_at: Date | null; requires_checkin: boolean }[];
  if (!p) return NextResponse.json({ ok: false, message: "That paper does not exist." }, { status: 404 });

  const now = Date.now();
  const open =
    p.requires_checkin && p.scan_opens_at && p.ends_at &&
    now >= new Date(p.scan_opens_at).getTime() && now < new Date(p.ends_at).getTime();

  return NextResponse.json(
    {
      ok: true,
      paper: { name: p.name, scanOpensAt: p.scan_opens_at, startsAt: p.starts_at, endsAt: p.ends_at },
      open,
      // No code outside the window: nothing to photograph the evening before.
      code: open ? withSvg(deskCode(paper, centre, now)) : null,
      counts: await deskCounts(paper, centre),
      // Who has left the paper for another app, refreshed with the code every
      // 30 s while it runs. See src/lib/exam/away.ts.
      away: await deskAwayList(paper, centre),
      stars: await deskStarList(paper, centre),
      serverNow: now,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const paper = String(body?.paper ?? "");
  const centre = String(body?.centre ?? "");
  const auth = await authorise(paper, centre);
  if (auth.error) return auth.error;

  if (typeof body?.release === "string") {
    const uid = body.release;
    if (!/^\d{9}$/.test(uid)) return NextResponse.json({ ok: false, message: "No student was named." }, { status: 400 });
    const released = await releasePaper(uid, paper, auth.staff.staff_id);
    if (!released) {
      return NextResponse.json({
        ok: false,
        message: "Nothing to move: this student has no paper running, or it has already closed.",
      });
    }
    await logAdminEvent(auth.staff.staff_id, "paper_released", { kind: "student", id: uid }, { paper, centre });
    return NextResponse.json({
      ok: true,
      message: "Released. Tell the student to open the paper on the other phone — same answers, same time left.",
    });
  }

  if (typeof body?.detail === "string") {
    if (!/^\d{9}$/.test(body.detail)) return NextResponse.json({ ok: false, message: "No student was named." }, { status: 400 });
    const student = await deskAwayDetail(body.detail, paper, centre);
    if (!student) return NextResponse.json({ ok: false, message: "That student is not at this desk." });
    return NextResponse.json({ ok: true, student }, { headers: { "Cache-Control": "no-store" } });
  }

  if (typeof body?.star === "string") {
    const uid = body.star;
    const by = body?.by === -1 ? -1 : body?.by === 1 ? 1 : 0;
    if (!/^\d{9}$/.test(uid) || by === 0) return NextResponse.json({ ok: false, message: "No student was named." }, { status: 400 });
    const stars = await changeStars(uid, paper, centre, by, auth.staff.staff_id);
    if (stars === null) return NextResponse.json({ ok: false, message: "That student is not at this desk." });
    await logAdminEvent(auth.staff.staff_id, by === 1 ? "star_given" : "star_taken", { kind: "student", id: uid }, { paper, centre, stars });
    return NextResponse.json({ ok: true, stars });
  }

  return NextResponse.json(
    { ok: true, students: await deskSearch(paper, centre, String(body?.q ?? "")) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

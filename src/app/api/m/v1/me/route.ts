import { NextResponse } from "next/server";
import { checkStudent } from "@/lib/app/gate";
import { firstName } from "@/lib/exam/portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who is signed in, for the native app. The first call the app makes on
 * launch: 200 with the student, or 401 with why — "signed_out" (no token, or
 * one that has expired or been tampered with) or "moved" (this account has
 * since been opened on another phone; the app says so, as the website does).
 */
export async function GET() {
  const check = await checkStudent();
  if (!check.ok) {
    return NextResponse.json({ ok: false, reason: check.reason }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const s = check.student;
  return NextResponse.json(
    {
      ok: true,
      student: {
        uid: s.uid,
        name: s.name,
        firstName: firstName(s.name),
        class: s.class,
        stream: s.stream,
        school: s.school_name,
        centre: s.centre_code,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

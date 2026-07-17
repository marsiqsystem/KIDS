import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, adminConfigured, keyIsValid, sessionToken } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exchange the admin key for a session cookie. Wrong key → 401, in constant time. */
export async function POST(request: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Admin access is not configured on this deployment." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  if (!keyIsValid(body?.key ?? "")) {
    return NextResponse.json({ ok: false, message: "That key is not correct." }, { status: 401 });
  }

  const token = sessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}

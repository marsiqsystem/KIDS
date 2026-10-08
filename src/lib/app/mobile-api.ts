import { NextResponse } from "next/server";
import { checkStudent } from "@/lib/app/gate";
import type { Student } from "@/lib/exam/db";

/**
 * Shared plumbing for the native app's API (src/app/api/m/v1).
 *
 * Every endpoint there is a thin JSON face on the same functions the website's
 * pages call, so a number on the phone and the same number on the web are one
 * computation, never two. What differs is only the shape: JSON, never a
 * redirect, and a way out named by screen rather than by web address.
 */

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** The signed-in student, or the 401 to send back instead. */
export async function mobileStudent(): Promise<{ student: Student; refuse?: never } | { student?: never; refuse: NextResponse }> {
  const check = await checkStudent();
  if (!check.ok) return { refuse: json({ ok: false, reason: check.reason }, 401) };
  return { student: check.student };
}

/** "Good morning" by the clock in Kolkata, not the server's. */
export function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

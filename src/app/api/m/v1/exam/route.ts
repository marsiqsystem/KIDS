import { json, mobileStudent } from "@/lib/app/mobile-api";
import { examTabFor } from "@/lib/exam/exam-tab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Exam tab, for the native app — the same examTabFor the website's Exam
 * tab draws from, returned as a model. Everything after this (check in, start,
 * choose subjects, sync, submit, away) the app does through the website's own
 * exam endpoints, /api/app/exam/*, which read the app's bearer token exactly
 * as they read the website's cookie: one exam, gated one way, for both.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  return json({ ok: true, ...(await examTabFor(student)) });
}

import { json, mobileStudent } from "@/lib/app/mobile-api";
import { setSummary } from "@/lib/app/answer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Today's set, scored — the website's /app/set/summary (board 02, 2E), from
 * the same setSummary. `summary` is null when there is no set today.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  return json({ ok: true, summary: await setSummary(student) });
}

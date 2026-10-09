import { json, mobileStudent } from "@/lib/app/mobile-api";
import { recordingsForStudent } from "@/lib/admin/recordings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every recorded class this student may watch again — the website's
 * /app/recordings. The batch as it is now decides, like posts. One row per
 * class however many parts the recorder left; the class screen plays them.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const all = await recordingsForStudent(student.uid);
  const classes = new Map<string, (typeof all)[number]>();
  for (const r of all) if (!classes.has(r.class_id)) classes.set(r.class_id, r);

  return json({
    ok: true,
    classes: [...classes.values()].map((r) => ({
      id: r.class_id,
      title: r.title,
      subject: r.subject,
      startsAt: new Date(r.starts_at).toISOString(),
      minutes: r.minutes,
    })),
  });
}

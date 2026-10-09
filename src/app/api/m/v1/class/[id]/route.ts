import { json, mobileStudent } from "@/lib/app/mobile-api";
import { canStudentJoin, findClass, noteTokenIssued } from "@/lib/admin/classes";
import { recordingsForClass } from "@/lib/admin/recordings";
import { drivePlayerUrl } from "@/lib/drive";
import { liveConfigured, liveDomain, mintToken } from "@/lib/live/jitsi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A class, for the native app — the website's /app/class/[id], decided the
 * same way by canStudentJoin.
 *
 *   refused       { why } — not-found | cancelled | not-started | not-in-batch
 *   recorded      a finished class: its parts, as Drive player addresses
 *   unconfigured  the class is on but the class server is not set up
 *   live          { domain, room, jwt, name } — the token minted here, for
 *                 this child and this room, exactly as the website mints it,
 *                 and handed to the app's own room screen. It is never in an
 *                 address anyone could forward.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const { id } = await params;

  const verdict = await canStudentJoin(id, student.uid);

  // "ended" is only ever said to a member of the batch.
  if (!verdict.ok && verdict.why === "ended") {
    const [live, parts] = await Promise.all([findClass(id), recordingsForClass(id)]);
    if (!live) return json({ ok: true, state: "refused", why: "not-found" });
    return json({
      ok: true,
      state: "recorded",
      title: live.title,
      subject: live.subject,
      startsAt: new Date(live.starts_at).toISOString(),
      parts: parts.map((r) => ({ id: r.id, url: drivePlayerUrl(r.drive_id) })),
    });
  }
  if (!verdict.ok) return json({ ok: true, state: "refused", why: verdict.why });

  const live = verdict.live;
  if (!liveConfigured()) return json({ ok: true, state: "unconfigured", title: live.title });

  const jwt = mintToken(live.room, { id: student.uid, name: student.name, moderator: false });
  await noteTokenIssued(live.id, { uid: student.uid, moderator: false });

  return json({
    ok: true,
    state: "live",
    title: live.title,
    subject: live.subject,
    domain: liveDomain(),
    room: live.room,
    jwt,
    name: student.name,
  });
}

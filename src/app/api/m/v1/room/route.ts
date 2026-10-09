import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { roomFor, startStudyHour, endStudyHour, DOING_LABEL } from "@/lib/app/room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The room (design 8k) — presence without a ladder, for the native app.
 *
 * GET               → { total, present, doing: [{label, n}], sittingFor } or
 *                     { room: null } for a student on no programme.
 * POST { sit: bool } → start or stop this student's silent study hour, as the
 *                     website's sitWithTheRoom / leaveTheRoom do. roomFor being
 *                     null is the check, the same one the screen uses.
 */
async function model(uid: string) {
  const room = await roomFor(uid);
  if (!room) return { ok: true, room: null };
  return {
    ok: true,
    room: {
      total: room.total,
      present: room.present,
      doing: room.doing.map((d) => ({ label: DOING_LABEL[d.doing], n: d.n })),
      sittingFor: room.sittingFor,
    },
  };
}

export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  return json(await model(student.uid));
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  if (body?.sit === true) {
    if (await roomFor(student.uid)) await startStudyHour(student.uid);
  } else {
    await endStudyHour(student.uid);
  }
  return json(await model(student.uid));
}

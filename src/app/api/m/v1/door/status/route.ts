import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { doorStatus } from "@/lib/app/handoff";
import { applicationForDevice } from "@/lib/app/registrations";
import { readDeviceId } from "@/lib/app/devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What this phone is waiting on — the website's doorStatusAction and
 * registrationStatusAction in one call, keyed on the installation id.
 *
 * POST { deviceId } → { door: DoorStatus, application: PendingApplication | null }
 *
 * `door.state === "ready"` means an approval is waiting for THIS phone; the
 * app then calls /door/open, which uses it exactly once.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = readDeviceId(body?.deviceId ?? null);
  if (!id) return json({ ok: true, door: { state: "none" }, application: null });
  const [door, application] = await Promise.all([doorStatus(id), applicationForDevice(id)]);
  return json({ ok: true, door, application });
}

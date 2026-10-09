import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { takeHandoff } from "@/lib/app/handoff";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { issueToken } from "@/lib/app/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Approved — sign this phone in, with nothing typed. The website's
 * openApprovedAction, for the native app.
 *
 * POST { deviceId } → { ok: true, token, expiresAt, mustChange: true, uid }
 *                   | { ok: false } when there was nothing to open
 *
 * takeHandoff uses the approval once (src/lib/app/handoff.ts) and opens the
 * account with a password nobody knows, so the first screen asks the child to
 * choose their own.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = readDeviceId(body?.deviceId ?? null);
  const handed = id ? await takeHandoff(id) : null;
  if (!handed || !id) return json({ ok: false });

  await bindDevice(handed.uid, id, request.headers.get("user-agent"));
  const { token, expiresAt } = issueToken(handed.uid, id);
  return json({ ok: true, token, expiresAt, mustChange: true, uid: handed.uid });
}

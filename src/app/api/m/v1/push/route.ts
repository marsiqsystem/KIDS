import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { sessionClaims } from "@/lib/app/session";
import { registerPushToken, forgetPushToken } from "@/lib/app/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the native app hands in its push token — the website's registerPush /
 * unregisterPush. The account and the phone come from the signed session,
 * never from the body: a client that could name its own device could point
 * somebody else's notifications at itself.
 *
 * POST { token, platform } → stored on this phone's app_devices row.
 * POST { token: null }     → forgotten (notifications turned off).
 *
 * Android only, for now. The sender (src/lib/app/push.ts) speaks Firebase, and
 * an Android token IS a Firebase token. An iPhone's token is Apple's (APNs);
 * sent through Firebase it would simply be marked failed. iPhone push waits for
 * the APNs key, which exists only once IQ Systems and Research Pvt. Ltd. is
 * enrolled with Apple.
 */
export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const claims = await sessionClaims();
  if (!claims?.deviceId) return json({ ok: false, message: "This session has no phone." });

  const body = await request.json().catch(() => ({}));
  if (body?.token === null) {
    await forgetPushToken(student.uid, claims.deviceId);
    return json({ ok: true, stored: false });
  }
  if (body?.platform !== "android" || typeof body?.token !== "string") {
    return json({ ok: true, stored: false, reason: "platform" });
  }
  await registerPushToken(student.uid, claims.deviceId, body.token);
  return json({ ok: true, stored: true });
}

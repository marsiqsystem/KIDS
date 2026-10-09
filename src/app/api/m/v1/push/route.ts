import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { sessionClaims } from "@/lib/app/session";
import { registerPushToken, forgetPushToken } from "@/lib/app/push";
import { APNS_PREFIX } from "@/lib/app/apns";

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
 * An Android token is a Firebase token and is stored as it is. An iPhone's is
 * Apple's (64 hex characters) and is stored as `apns:<token>`, so the sender
 * (src/lib/app/push.ts) sends it through Apple (src/lib/app/apns.ts) — which
 * stays switched off until the APNs key of IQ Systems and Research Pvt. Ltd.
 * is configured.
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
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (body?.platform === "android" && token) {
    await registerPushToken(student.uid, claims.deviceId, token);
    return json({ ok: true, stored: true });
  }
  if (body?.platform === "ios" && /^[0-9a-f]{64,200}$/i.test(token)) {
    await registerPushToken(student.uid, claims.deviceId, `${APNS_PREFIX}${token.toLowerCase()}`);
    return json({ ok: true, stored: true });
  }
  return json({ ok: true, stored: false, reason: "platform" });
}

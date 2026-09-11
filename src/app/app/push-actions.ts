"use server";

import { requireStudent } from "@/lib/app/gate";
import { sessionClaims } from "@/lib/app/session";
import { registerPushToken, forgetPushToken } from "@/lib/app/push";

/**
 * Where a phone hands in its Firebase registration token.
 *
 * The token arrives from the client, because only the phone can be given one.
 * The *account* and the *device* do not: both are read from the signed session
 * here on the server. A client that could name its own uid or device id could
 * point somebody else's notifications at itself, and the session already knows
 * both without being asked.
 *
 * Returns nothing. There is no failure a student could act on — a token that
 * did not save means notifications do not arrive, and the notices are still in
 * the app either way.
 */
export async function registerPush(token: string): Promise<void> {
  const student = await requireStudent();
  const claims = await sessionClaims();
  if (!claims?.deviceId) return;
  await registerPushToken(student.uid, claims.deviceId, token);
}

/** The student turned notifications off in Android's settings, or signed out. */
export async function unregisterPush(): Promise<void> {
  const student = await requireStudent();
  const claims = await sessionClaims();
  if (!claims?.deviceId) return;
  await forgetPushToken(student.uid, claims.deviceId);
}

import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/app/accounts";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { issueToken } from "@/lib/app/session";
import { signInRefusal, type DoorWayOut } from "@/lib/app/door-sentences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sign in, for the native app (mobile/).
 *
 * POST { uid, password, deviceId } → { ok: true, token, expiresAt, mustChange }
 *                                  | { ok: false, field, message, next? }
 *
 * The same check and the same sentences as the website's front door
 * (signInAction in src/app/app/actions.ts); the difference is that the session
 * comes back as a token for the phone's secure storage instead of a cookie,
 * and a way out is named by the screen it leads to, not a web address.
 * Signing out needs no call: the token is stateless, and the app forgets it.
 */
const refuse = (field: "uid" | "password", message: string, next?: DoorWayOut) =>
  NextResponse.json({ ok: false, field, message, ...(next ? { next } : {}) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid ?? "").replace(/\D/g, "");
  const password = String(body?.password ?? "");

  if (uid.length !== 9) return refuse("uid", "Type the 9 digits on your KIDS card.");
  if (!password) return refuse("password", "Type your password.");

  const result = await signIn(uid, password);
  if (!result.ok) {
    // The same sentences as the website: src/lib/app/door-sentences.ts.
    const r = signInRefusal(result);
    return refuse(r.field, r.message, r.next);
  }

  const deviceId = readDeviceId(body?.deviceId ?? null);
  await bindDevice(uid, deviceId, request.headers.get("user-agent"));
  const { token, expiresAt } = issueToken(uid, deviceId);
  return NextResponse.json(
    { ok: true, token, expiresAt, mustChange: result.mustChange },
    { headers: { "Cache-Control": "no-store" } },
  );
}

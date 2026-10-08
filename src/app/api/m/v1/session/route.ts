import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/app/accounts";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { issueToken } from "@/lib/app/session";
import { firstName } from "@/lib/exam/portal-auth";

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
type Next = { label: string; to: "claim" | "reset" };
const refuse = (field: "uid" | "password", message: string, next?: Next) =>
  NextResponse.json({ ok: false, field, message, ...(next ? { next } : {}) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid ?? "").replace(/\D/g, "");
  const password = String(body?.password ?? "");

  if (uid.length !== 9) return refuse("uid", "Type the 9 digits on your KIDS card.");
  if (!password) return refuse("password", "Type your password.");

  const result = await signIn(uid, password);
  if (!result.ok) {
    switch (result.reason) {
      case "unknown_id":
        // Names nobody: a stranger typing nine digits must not learn whether
        // they guessed a real child.
        return refuse("uid", "No student with that number. Check the 9 digits on your KIDS card.", {
          label: "Ask the office",
          to: "reset",
        });
      case "unclaimed":
        return refuse("password", `${firstName(result.student.name)}, this account has no password yet. Claim it first.`, {
          label: "Claim your account",
          to: "claim",
        });
      case "locked":
        return refuse(
          "password",
          `Three wrong tries. The app rests for ${result.minutes} ${result.minutes === 1 ? "minute" : "minutes"} — or ask the office.`,
          { label: "Show the office my details", to: "reset" },
        );
      case "bad_password":
        return refuse(
          "password",
          `That password is not right for ${firstName(result.student.name)}. ` +
            (result.triesLeft > 0
              ? `${result.triesLeft} ${result.triesLeft === 1 ? "try" : "tries"} left before the app rests for 15 minutes.`
              : `The app now rests for 15 minutes.`),
          { label: "Forgot password", to: "reset" },
        );
      default:
        return refuse("uid", "Check your User ID and password.");
    }
  }

  const deviceId = readDeviceId(body?.deviceId ?? null);
  await bindDevice(uid, deviceId, request.headers.get("user-agent"));
  const { token, expiresAt } = issueToken(uid, deviceId);
  return NextResponse.json(
    { ok: true, token, expiresAt, mustChange: result.mustChange },
    { headers: { "Cache-Control": "no-store" } },
  );
}

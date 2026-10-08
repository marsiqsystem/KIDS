import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { changePassword, findAccount } from "@/lib/app/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Change my password, for the native app — the website's changePasswordAction
 * (src/app/app/profile-actions.ts) with the same checks in the same order and
 * the same sentences.
 *
 * POST { current, next, again } → { ok: true } | { ok: false, field, message }
 *
 * `current` is not asked of an account the office has just issued a one-time
 * password to (must_change): that password is a key, not a standing password.
 */
const refuse = (field: "current" | "next", message: string) => json({ ok: false, field, message });

export async function POST(request: NextRequest) {
  const { student, refuse: out } = await mobileStudent();
  if (out) return out;

  const body = await request.json().catch(() => ({}));
  const current = String(body?.current ?? "");
  const next = String(body?.next ?? "");
  const again = String(body?.again ?? "");

  if (!current && !(await findAccount(student.uid))?.must_change) {
    return refuse("current", "Type the password you use now.");
  }
  if (!next) return refuse("next", "Type the new password you want.");
  // Before the current password, so a child who mistyped the new one twice is
  // not also told their old one is wrong.
  if (next !== again) {
    return refuse("next", "The two new passwords are not the same. Tap Show and read them both.");
  }

  const result = await changePassword(student.uid, current, next);
  if (result.ok) return json({ ok: true });

  switch (result.reason) {
    case "wrong_current":
      return refuse(
        "current",
        "That is not the password you use now. Nothing has changed — your old password still works.",
      );
    case "bad_new":
      return refuse("next", result.message);
    case "same":
      return refuse("next", "That is the password you already have. Choose a different one.");
    default:
      return refuse(
        "current",
        "This account has no password set on it yet, so there is nothing to change. " +
          "Your school or the KIDS office can set one.",
      );
  }
}

import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { claimAccount } from "@/lib/app/accounts";
import { passwordProblem } from "@/lib/app/passwords";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { issueToken } from "@/lib/app/session";
import { claimRefusal } from "@/lib/app/door-sentences";
import { tenDigits } from "@/lib/admin/claim-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claim my account, for the native app — the website's claimAction: the date
 * of birth on the register is the proof, the student chooses a password, and
 * the account opens on THIS phone.
 *
 * POST { uid, day, month, year, guardianPhone, password, deviceId }
 *   → { ok: true, token, expiresAt } | { ok: false, field, message, next? }
 *
 * The family phone is required (12 Nov 2026) -- but only from builds that send
 * the field at all. An installed app from before the question has no box to
 * type it in, and refusing it would leave that child unable to claim until the
 * update arrives.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid ?? "").replace(/\D/g, "");
  const day = String(body?.day ?? "").trim();
  const month = String(body?.month ?? "").trim();
  const year = String(body?.year ?? "").trim();
  const password = String(body?.password ?? "");
  const asked = body && typeof body === "object" && "guardianPhone" in body;
  const phone = tenDigits(String(body?.guardianPhone ?? ""));

  if (uid.length !== 9) return json({ ok: false, field: "uid", message: "Type the 9 digits on your KIDS card." });
  if (!day || !month || !year) return json({ ok: false, field: "dob", message: "Type your date of birth as day, month and year." });
  if (asked && !phone) return json({ ok: false, field: "phone", message: "Type your family's 10-digit mobile number, so the office can call if something is wrong." });
  const problem = passwordProblem(password, uid);
  if (problem) return json({ ok: false, field: "password", message: problem });

  const result = await claimAccount(uid, `${day}-${month}-${year}`, password, phone);
  if (!result.ok) return json({ ok: false, ...claimRefusal(result) });

  const deviceId = readDeviceId(body?.deviceId ?? null);
  await bindDevice(uid, deviceId, request.headers.get("user-agent"));
  const { token, expiresAt } = issueToken(uid, deviceId);
  return json({ ok: true, token, expiresAt });
}

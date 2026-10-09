import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { claimAccount } from "@/lib/app/accounts";
import { passwordProblem } from "@/lib/app/passwords";
import { bindDevice, readDeviceId } from "@/lib/app/devices";
import { issueToken } from "@/lib/app/session";
import { claimRefusal } from "@/lib/app/door-sentences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claim my account, for the native app — the website's claimAction: the date
 * of birth on the register is the proof, the student chooses a password, and
 * the account opens on THIS phone.
 *
 * POST { uid, day, month, year, password, deviceId }
 *   → { ok: true, token, expiresAt } | { ok: false, field, message, next? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid ?? "").replace(/\D/g, "");
  const day = String(body?.day ?? "").trim();
  const month = String(body?.month ?? "").trim();
  const year = String(body?.year ?? "").trim();
  const password = String(body?.password ?? "");

  if (uid.length !== 9) return json({ ok: false, field: "uid", message: "Type the 9 digits on your KIDS card." });
  if (!day || !month || !year) return json({ ok: false, field: "dob", message: "Type your date of birth as day, month and year." });
  const problem = passwordProblem(password, uid);
  if (problem) return json({ ok: false, field: "password", message: problem });

  const result = await claimAccount(uid, `${day}-${month}-${year}`, password);
  if (!result.ok) return json({ ok: false, ...claimRefusal(result) });

  const deviceId = readDeviceId(body?.deviceId ?? null);
  await bindDevice(uid, deviceId, request.headers.get("user-agent"));
  const { token, expiresAt } = issueToken(uid, deviceId);
  return json({ ok: true, token, expiresAt });
}

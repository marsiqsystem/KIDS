import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { askToOpen } from "@/lib/app/handoff";
import { readDeviceId } from "@/lib/app/devices";
import { tenDigits } from "@/lib/admin/claim-match";
import { askRefusal } from "@/lib/app/door-sentences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Ask KIDS to open my account", for the native app — the website's
 * askOfficeAction: for a child on the register with no date of birth, a wrong
 * one, or a forgotten password. Filed from the phone that will use it; the
 * office approves in the Claims tab and this phone signs itself in.
 *
 * POST { uid, name, father, guardianPhone, day?, month?, year?, deviceId }
 *   → { ok: true } | { ok: false, field, message }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const uid = String(body?.uid ?? "").replace(/\D/g, "");
  const phone = tenDigits(String(body?.guardianPhone ?? ""));
  const d = String(body?.day ?? "").trim().padStart(2, "0");
  const m = String(body?.month ?? "").trim().padStart(2, "0");
  const y = String(body?.year ?? "").trim();
  const dob = `${d}-${m}-${y}`;

  if (uid.length !== 9) return json({ ok: false, field: "uid", message: "Type the 9 digits on your KIDS card." });
  if (!phone) return json({ ok: false, field: "phone", message: "Type your family's 10-digit mobile number." });

  const result = await askToOpen({
    uid,
    typedName: String(body?.name ?? ""),
    fatherName: String(body?.father ?? ""),
    guardianPhone: phone,
    typedDob: /^\d{2}-\d{2}-\d{4}$/.test(dob) ? dob : null,
    deviceId: readDeviceId(body?.deviceId ?? null),
  });
  if (!result.ok) return json({ ok: false, ...askRefusal(result.reason) });
  return json({ ok: true });
}

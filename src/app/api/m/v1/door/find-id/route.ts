import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { findMyUid } from "@/lib/app/registrations";
import { readDeviceId } from "@/lib/app/devices";
import { findIdRefusal, wayForMatch } from "@/lib/app/door-sentences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Find my User ID", for the native app (26 Nov 2026) — see findMyUid.
 *
 * POST { name, day, month, year, school: "CTR-xx|SC-yy", deviceId }
 *   → { ok: true, found: [{ uid, class, school_name, centre_name, next }] }
 *   | { ok: false, field, message }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const day = String(body?.day ?? "").trim().padStart(2, "0");
  const month = String(body?.month ?? "").trim().padStart(2, "0");
  const year = String(body?.year ?? "").trim();
  const [centreCode, schoolCode] = String(body?.school ?? "").split("|");
  const deviceId = readDeviceId(body?.deviceId ?? null);

  if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year) || day === "00" || month === "00") {
    return json({ ok: false, field: "dob", message: "Type your date of birth as day, month and a 4-digit year." });
  }
  if (!deviceId) return json({ ok: false, field: "name", message: "This phone could not be recognised. Close the app and open it again." });

  const result = await findMyUid({
    name: String(body?.name ?? ""),
    dob: `${day}-${month}-${year}`,
    centre_code: centreCode ?? "",
    school_code: schoolCode ?? "",
    device_id: deviceId,
  });
  if (!result.ok) return json({ ok: false, ...findIdRefusal(result.reason) });
  return json({
    ok: true,
    found: result.matches.map((m) => ({
      uid: m.uid,
      class: m.class,
      school_name: m.school_name,
      centre_name: m.centre_name,
      next: wayForMatch(m),
    })),
  });
}

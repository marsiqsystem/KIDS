import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { applyAsGuest, applyToRegister } from "@/lib/app/registrations";
import { readDeviceId } from "@/lib/app/devices";
import { guestRefusal, registerRefusal } from "@/lib/app/door-sentences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "I am new to KIDS", for the native app — the website's registerAction. It
 * creates an APPLICATION, not a student; the office turns it into one, and the
 * phone that applied is signed in by itself on approval (/door/status, /door/open).
 *
 * POST { name, day, month, year, class, stream, school: "CTR-xx|SC-yy",
 *        guardianPhone, deviceId } → { ok: true } | { ok: false, field, message }
 *
 * class "OTHER" is staff, a teacher or a core member (9 Nov 2026): then
 * { name, class: "OTHER", viewAs: "IX".."XII", stream, guardianPhone, deviceId }
 * -- no date of birth, no school, and the phone is required.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const day = String(body?.day ?? "").trim().padStart(2, "0");
  const month = String(body?.month ?? "").trim().padStart(2, "0");
  const year = String(body?.year ?? "").trim();
  const cls = String(body?.class ?? "").trim().toUpperCase();
  const stream = String(body?.stream ?? "").trim();
  const school = String(body?.school ?? "").trim();
  const phone = String(body?.guardianPhone ?? "").trim();
  const deviceId = readDeviceId(body?.deviceId ?? null);

  if (name.length < 2) return json({ ok: false, field: "name", message: "Type your full name, as it is written at school." });
  if (!deviceId) return json({ ok: false, field: "name", message: "This phone could not be recognised. Close the app and open it again." });

  if (cls === "OTHER") {
    const viewAs = String(body?.viewAs ?? "").trim().toUpperCase();
    if (!["IX", "X", "XI", "XII"].includes(viewAs)) {
      return json({ ok: false, field: "class", message: "Choose which class's app you want to see." });
    }
    const guest = await applyAsGuest({ name, view_as: viewAs, stream: stream || null, phone, device_id: deviceId });
    if (!guest.ok && guest.reason !== "already_pending") return json({ ok: false, ...guestRefusal(guest.reason) });
    return json({ ok: true });
  }

  if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
    return json({ ok: false, field: "dob", message: "Type your date of birth as day, month and year." });
  }
  if (!["IX", "X", "XI", "XII"].includes(cls)) return json({ ok: false, field: "class", message: "Choose the class you are in this year." });
  // The pair that identifies a school; school_code alone names twenty-one.
  const [centreCode, schoolCode] = school.split("|");
  if (!centreCode || !schoolCode) return json({ ok: false, field: "school", message: "Choose your school from the list." });

  // Without the phone's id there is nowhere for the approval to arrive (checked above).
  const result = await applyToRegister({
    name,
    dob: `${day}-${month}-${year}`,
    class: cls,
    stream: cls === "XI" || cls === "XII" ? stream || null : null,
    centre_code: centreCode,
    school_code: schoolCode,
    guardian_phone: phone || null,
    device_id: deviceId,
  });
  // Already pending is not an error: they tapped twice, or came back later.
  if (!result.ok && result.reason !== "already_pending") return json({ ok: false, ...registerRefusal(result.reason) });
  return json({ ok: true });
}

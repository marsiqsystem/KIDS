import { verifyUidToken, qrSecret } from "@/lib/qr-token";
import { findStudent, type Student } from "@/lib/exam/db";
import { paperIdFor } from "@/lib/exam/config";

/**
 * The gate every portal page goes through.
 *
 * Shared so that /portal and /portal/practice cannot drift apart: one place
 * decides who is allowed in, and it always checks the signature BEFORE touching
 * the database, so an unsigned request cannot even be used to probe which UIDs
 * exist.
 */
export type PortalGate =
  | { ok: true; student: Student; paperId: string }
  | { ok: false; reason: "incomplete" | "bad_signature" | "not_found" | "no_class"; uid: string };

export async function openPortal(rawId: string, token: string): Promise<PortalGate> {
  const uid = (rawId ?? "").replace(/\D/g, "");

  if (uid.length !== 9 || !token) return { ok: false, reason: "incomplete", uid };
  if (!verifyUidToken(uid, token, qrSecret())) return { ok: false, reason: "bad_signature", uid };

  const student = await findStudent(uid);
  if (!student) return { ok: false, reason: "not_found", uid };

  const paperId = paperIdFor(student.class);
  if (!paperId) return { ok: false, reason: "no_class", uid };

  return { ok: true, student, paperId };
}

/**
 * A friendly first name.
 *
 * The register is shouty and inconsistent -- "MD AYAN RASHID", "shahiba
 * parveen" -- because it was typed by many hands across 107 schools. Greeting a
 * child in capitals reads like a summons. The official name is never altered;
 * only this greeting is.
 */
export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const honorifics = new Set(["MD", "MD.", "MOHD", "MOHD.", "SK", "SK.", "DR", "DR."]);
  const pick = honorifics.has((parts[0] ?? "").toUpperCase()) && parts[1] ? parts[1] : parts[0] ?? "";
  return pick.charAt(0).toUpperCase() + pick.slice(1).toLowerCase();
}

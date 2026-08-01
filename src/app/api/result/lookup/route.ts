import { NextRequest, NextResponse } from "next/server";
import ENROLLED from "@/data/enrolled-ids.json";
import { findStudent } from "@/lib/exam/db";
import { signUid, qrSecret } from "@/lib/qr-token";
import { logEvent } from "@/lib/exam/attempts";

/**
 * Turn a Unique ID into that student's portal link.
 *
 * The printed admit-card QR is the normal way in. This is the way in for a
 * student who has lost the card, or whose phone will not scan: they type the
 * 9-digit number from memory or from a school list, and we hand back the same
 * signed URL the QR encodes.
 *
 * ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * The signature in a portal URL is the ONLY thing that keeps one student's
 * result from being readable by another. This endpoint mints that signature
 * from the Unique ID alone, and Unique IDs are consecutive — 104010001,
 * 104010002, 104010003 — so anyone holding one valid ID can walk the register
 * and open every student's result: name, school, centre, marks, rank, and the
 * full answer sheet.
 *
 * That is understood and intended. Umar's call, 1 Aug 2026, made twice and in
 * full knowledge of the consequence: every student must be able to reach their
 * result with nothing but their Unique ID, and no second factor may stand in
 * the way of that. This comment exists so that nobody later "fixes" the
 * missing check and locks 6,778 students out on results evening, and so that
 * nobody assumes the privacy note on the result page ("this link is yours
 * alone") still holds against a determined reader. It does not.
 *
 * If that trade is ever revisited, `students.dob` is the second factor to
 * reach for: 8,652 of 9,637 students have one on file.
 *
 * POST, not GET, so the ID does not end up in browser history, proxy logs or a
 * Referer header on the way to somebody else's server.
 */

// ~9.4k issued IDs, built once per cold start. A cheap pre-filter so a typo or
// a script pointed at this endpoint never reaches the database at all.
const ISSUED = new Set<string>(ENROLLED as string[]);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let raw = "";
  try {
    const body = await request.json();
    raw = String(body?.id ?? "");
  } catch {
    raw = "";
  }

  const uid = raw.replace(/\D/g, "");

  if (uid.length !== 9) {
    return NextResponse.json(
      {
        ok: false,
        reason: "format",
        message: "A Unique ID is 9 digits. Please enter all of them, exactly as printed on your admit card.",
      },
      { status: 400 },
    );
  }

  // The register is the authority, not the bundled list: four IDs in that list
  // were later pruned, and handing one of them a signed link would produce a
  // portal that then refuses them — a worse answer than a plain "not found".
  if (!ISSUED.has(uid) || !(await findStudent(uid))) {
    return NextResponse.json(
      {
        ok: false,
        reason: "not_found",
        message:
          "That Unique ID is not on the SET 2026 register. Please re-check the number on your admit card, or contact your Head of School or the KIDS office.",
      },
      { status: 404 },
    );
  }

  // Append-only, and never allowed to fail the lookup. This is the only record
  // that a result was opened without the card, and the only way to notice
  // afterwards if somebody walked the register.
  void logEvent(uid, "lookup", { via: "set-page" }).catch(() => {});

  return NextResponse.json(
    { ok: true, url: `/portal?id=${uid}&t=${encodeURIComponent(signUid(uid, qrSecret()))}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { CENTRES } from "@/lib/centres";
import ENROLLED from "@/data/enrolled-ids.json";

/**
 * Answers one question: is this 9-digit Unique ID on the register, and if so
 * which centre key does it belong to?
 *
 * The ID is checked against the enrolled register, not merely decoded: digits
 * 2-3 of ANY well-formed number decode to a centre, so a single mistyped digit
 * would otherwise return a real-looking centre for a student who is not
 * enrolled there. We answer only for IDs that were actually issued.
 *
 * We return the centre *key*, not the centre object. The client already bundles
 * the centre table, so it renders from data that shipped in the same deploy as
 * its own code. Sending the object invites version skew: a browser holding a
 * cached response from an older deploy once produced a destination of
 * "undefined", which Google cheerfully geocoded to Canada.
 *
 * Deliberately never returns the student's name, so the endpoint cannot be
 * walked to harvest personal data.
 */

// Built once per cold start; ~9.4k entries, membership test is O(1).
const ISSUED = new Set<string>(ENROLLED as string[]);

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("id") ?? "";
  const id = raw.replace(/\D/g, "");

  if (id.length !== 9) {
    return NextResponse.json(
      { ok: false, reason: "format", message: "Please enter all 9 digits of your Unique ID." },
      { status: 400 },
    );
  }

  const centreKey = id.slice(1, 3);

  if (!ISSUED.has(id) || !CENTRES[centreKey]) {
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

  return NextResponse.json(
    { ok: true, centreKey },
    {
      headers: {
        // The edge may cache (allocation is fixed), but the browser must
        // revalidate: a stale body served after a deploy is how we shipped a
        // literal "undefined" as a Google Maps destination.
        "Cache-Control": "public, max-age=0, must-revalidate, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

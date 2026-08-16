import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/exam/db";
import { signUid, qrSecret } from "@/lib/qr-token";
import { logEvent } from "@/lib/exam/attempts";

/**
 * The way in for a student who has lost the Unique ID as well as the card.
 *
 * They type the first four letters of their name followed by their date of
 * birth — `moha28032004` — and we hand back the same signed portal URL the QR
 * encodes.
 *
 * ⚠️ WHY THIS IS ACCEPTABLE HERE, AND ONLY HERE.
 *
 * This is a weaker key than the Unique ID, not a stronger one: names and birth
 * dates are guessable in a way a 9-digit register number is not. It adds no new
 * exposure only because `/api/result/lookup` already mints a signed link from
 * the Unique ID alone, and Unique IDs are consecutive — the register is already
 * walkable by anyone who wants to. Umar's call, 1 Aug 2026. See the long note
 * in that route before touching either of them.
 *
 * ⚠️ AND WHY IT REFUSES ON A TIE.
 *
 * Measured against the live register on 16 Aug 2026: 9,700 students, 8,653 with
 * a date of birth on file, of which 70 keys are shared by exactly two students
 * (140 students, 1.6%). For those, and for the 1,047 with no date of birth,
 * this route must say so plainly and send them to their school. It must NEVER
 * offer a list to choose from: "did you mean this student at that school?" is a
 * disclosure of somebody else's enrolment to a stranger who guessed a name.
 *
 * POST, not GET, so a name and birth date never land in browser history, proxy
 * logs, or a Referer header on the way to another server.
 */
export const runtime = "nodejs";

const BAD = (message: string, reason: string, status: number) =>
  NextResponse.json({ ok: false, reason, message }, { status });

export async function POST(request: NextRequest) {
  let raw = "";
  try {
    raw = String((await request.json())?.key ?? "");
  } catch {
    raw = "";
  }

  // Accept what a tired parent will actually type: spaces, slashes, dashes,
  // capitals. `moha 28/03/2004` and `MOHA28032004` are the same request.
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const letters = cleaned.slice(0, 4);
  const digits = cleaned.slice(4);

  if (!/^[a-z]{4}$/.test(letters) || !/^\d{8}$/.test(digits)) {
    return BAD(
      "Type the first four letters of your name and then your date of birth as eight digits — day, month, year. For example, Mohammad born on 28 March 2004 would type moha28032004.",
      "format",
      400,
    );
  }

  const dd = digits.slice(0, 2), mm = digits.slice(2, 4), yyyy = digits.slice(4);
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12 || +yyyy < 1990 || +yyyy > 2020) {
    return BAD(
      "That does not look like a date of birth. Please type it as day, month and year — for example 28032004 for 28 March 2004.",
      "format",
      400,
    );
  }

  // The register stores the date as DD-MM-YYYY text, exactly as it was typed
  // into the enrolment workbook. Compared as digits so a stray space or a
  // different separator in one row cannot lose a student their result.
  const rows = (await sql`
    select uid from students
    where left(lower(regexp_replace(name, '[^A-Za-z]', '', 'g')), 4) = ${letters}
      and regexp_replace(coalesce(dob, ''), '[^0-9]', '', 'g') = ${digits}
  `) as unknown as { uid: string }[];

  if (rows.length === 0) {
    return BAD(
      "We could not find a student with that name and date of birth. Check the spelling of your name as it appears on the admit card, and that the date is day-month-year. If it still does not work, your Head of School can look up your Unique ID for you.",
      "not_found",
      404,
    );
  }

  if (rows.length > 1) {
    return BAD(
      "More than one student shares those first four letters and that date of birth, so we cannot tell which result is yours. Please ask your Head of School or the KIDS office for your Unique ID and use the box above.",
      "ambiguous",
      409,
    );
  }

  const uid = rows[0].uid.trim();
  void logEvent(uid, "lookup", { via: "set-page-name-dob" }).catch(() => {});

  return NextResponse.json(
    { ok: true, url: `/portal?id=${uid}&t=${encodeURIComponent(signUid(uid, qrSecret()))}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}

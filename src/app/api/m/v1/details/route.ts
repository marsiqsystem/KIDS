import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { correctionsFor, dobFromParts, fileCorrections, FIELD_LABEL } from "@/lib/app/corrections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "My details are wrong", for the native app — the website's
 * /app/profile/details page and requestCorrectionsAction, as JSON.
 *
 * Until this existed the app opened that page in Chrome, where the website
 * asked the child to sign in again, landed them on its own Home, and -- because
 * a browser is a second phone -- moved the account off the app ("Your account
 * is on another phone"). Filmed 7 Nov 2026. Now the app asks here, with its
 * own session, and nothing moves.
 *
 * GET  → { ok, current: { name, dob, class, stream, school }, asked: [...] }
 * POST { name, day, month, year, class, stream, school, note }
 *      → { ok, message, filed }   (fileCorrections: the website's sentences)
 *
 * `school` is "CENTRE|SCHOOL", the same pair the register screen sends; the
 * list comes from /door/schools.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const asked = await correctionsFor(student.uid);
  return json({
    ok: true,
    current: {
      name: student.name,
      dob: student.dob ?? "",
      class: student.class,
      stream: student.stream ?? "",
      school: `${student.centre_code}|${student.school_code}`,
      schoolName: student.school_name,
    },
    // Waiting first, then decided, as on the website.
    asked: [...asked.filter((c) => c.status === "pending"), ...asked.filter((c) => c.status !== "pending")].map((c) => ({
      id: c.id,
      label: FIELD_LABEL[c.field],
      status: c.status,
      reason: c.status === "rejected" ? c.reason : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  const note = String(body?.note ?? "").trim().slice(0, 300) || null;
  const r = await fileCorrections(
    student.uid,
    {
      name: String(body?.name ?? ""),
      dob: dobFromParts(body?.day, body?.month, body?.year),
      class: String(body?.class ?? ""),
      stream: String(body?.stream ?? ""),
      school: String(body?.school ?? ""),
    },
    note,
  );
  return json(r);
}

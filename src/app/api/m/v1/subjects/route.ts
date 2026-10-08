import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { chosenSections, offerSections, setSections, NEW_PER_DAY } from "@/lib/app/loop";
import { subjectHue, subjectInitials, subjectShort } from "@/lib/app/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * My subjects, for the native app — what the chooser offers and what is chosen.
 *
 * GET                   → { offer, chosen, perDay, noStream }
 * POST { sections: [] } → replaces the choice. Only subjects this student is
 *                         actually offered are kept; an empty choice is refused,
 *                         as the website's chooser refuses it.
 */
function offerFor(student: Parameters<typeof offerSections>[0]) {
  return offerSections(student).map((s) => ({
    section: s.section,
    short: subjectShort(s.section),
    initials: subjectInitials(s.section),
    hue: subjectHue(s.section),
    questions: s.questions,
    chapters: s.chapters,
    videos: s.videos,
  }));
}

export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const noStream = (student.class === "XI" || student.class === "XII") && !student.stream;
  return json({
    ok: true,
    noStream,
    perDay: NEW_PER_DAY,
    offer: noStream ? [] : offerFor(student),
    chosen: await chosenSections(student.uid),
  });
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  const offered = new Set(offerSections(student).map((s) => s.section));
  const sections: string[] = Array.isArray(body?.sections)
    ? [...new Set<string>(body.sections.map(String))].filter((s) => offered.has(s))
    : [];
  if (sections.length === 0) return json({ ok: false, message: "Choose at least one subject." });

  await setSections(student.uid, sections);
  return json({ ok: true, chosen: sections });
}

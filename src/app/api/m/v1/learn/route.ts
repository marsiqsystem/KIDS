import { json, mobileStudent } from "@/lib/app/mobile-api";
import { loadVideoOverrides } from "@/lib/content/video-overrides";
import { chaptersFor } from "@/lib/app/bank";
import { chosenSections, answersFor } from "@/lib/app/loop";
import { subjectHue, subjectInitials } from "@/lib/app/subjects";
import { recordingsForStudent } from "@/lib/admin/recordings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Learn, for the native app — the website's /app/learn (design 4c, board 07).
 *
 * Every chapter of this student's class and stream, not only the subjects they
 * practise, because browsing is how a student decides to add one. Search and
 * filters run on the phone over this list; a round trip per keystroke on 3G
 * would be far worse.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  if ((student.class === "XI" || student.class === "XII") && !student.stream) {
    return json({ ok: true, noStream: true, chapters: [], recordedClasses: 0 });
  }

  const [mine, answers, recordings] = await Promise.all([
    chosenSections(student.uid),
    answersFor(student.uid),
    // Never the thing that breaks Learn: no recordings is the usual answer.
    recordingsForStudent(student.uid).catch(() => []),
  ]);

  const chosen = new Set(mine);
  await loadVideoOverrides();
  const chapters = chaptersFor(student.class, student.stream, student.medium).map((c) => {
    const seen = c.questionIds.filter((id) => answers.has(id));
    return {
      key: c.key,
      section: c.section,
      hue: subjectHue(c.section),
      initials: subjectInitials(c.section),
      chapter: c.chapter,
      total: c.questionIds.length,
      seen: seen.length,
      wrong: seen.filter((id) => !answers.get(id)!.was_correct).length,
      hasVideo: !!c.video,
      mine: chosen.has(c.section),
    };
  });

  return json({
    ok: true,
    noStream: false,
    chapters,
    recordedClasses: new Set(recordings.map((r) => r.class_id)).size,
  });
}

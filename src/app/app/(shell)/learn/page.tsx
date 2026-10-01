import { loadVideoOverrides } from "@/lib/content/video-overrides";
import { requireStudent } from "@/lib/app/gate";
import { chaptersFor } from "@/lib/app/bank";
import { chosenSections, answersFor } from "@/lib/app/loop";
import ChapterBrowse, { type BrowseChapter } from "@/components/app/ChapterBrowse";
import NoStream from "@/components/app/NoStream";
import { Head } from "@/components/app/kit";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { recordingsForStudent } from "@/lib/admin/recordings";
import "../class/class.css";

/**
 * Learn. Design 4c.
 *
 * Every chapter of this student's class and stream — not only the subjects they
 * practise, because browsing is how a student decides to add one. The "My
 * subjects" filter narrows it; the list itself does not.
 */
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const student = await requireStudent();

  if ((student.class === "XI" || student.class === "XII") && !student.stream) {
    return <NoStream cls={student.class} />;
  }

  const [mine, answers, recordings] = await Promise.all([
    chosenSections(student.uid),
    answersFor(student.uid),
    // Never the thing that breaks Learn: no recordings is the usual answer.
    recordingsForStudent(student.uid).catch(() => []),
  ]);
  const recordedClasses = new Set(recordings.map((r) => r.class_id)).size;

  const chosen = new Set(mine);
  await loadVideoOverrides();
  const chapters: BrowseChapter[] = chaptersFor(
    student.class,
    student.stream,
    student.medium,
  ).map((c) => {
    const seen = c.questionIds.filter((id) => answers.has(id));
    return {
      key: c.key,
      section: c.section,
      chapter: c.chapter,
      total: c.questionIds.length,
      seen: seen.length,
      wrong: seen.filter((id) => !answers.get(id)!.was_correct).length,
      hasVideo: !!c.video,
      mine: chosen.has(c.section),
    };
  });

  const withVideo = chapters.filter((c) => c.hasVideo).length;

  return (
    <>
      <Head title="Learn" aside={`${withVideo} videos`} />
      {/* Only for a child whose batch has had a recorded class. Everybody else
          would be shown an empty promise. */}
      {recordedClasses > 0 ? (
        <Link href="/app/recordings" className="rec-item" style={{ marginBottom: 14 }}>
          <span className="rec-item__icon" aria-hidden="true">
            <PlayCircle size={22} />
          </span>
          <span className="rec-item__body">
            <p className="rec-item__title">Class recordings</p>
            <p className="rec-item__meta">
              {recordedClasses} class{recordedClasses === 1 ? "" : "es"} to watch again
            </p>
          </span>
        </Link>
      ) : null}
      <ChapterBrowse chapters={chapters} />
    </>
  );
}

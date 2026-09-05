import { requireStudent } from "@/lib/app/gate";
import { chaptersFor } from "@/lib/app/bank";
import { chosenSections, answersFor } from "@/lib/app/loop";
import ChapterBrowse, { type BrowseChapter } from "@/components/app/ChapterBrowse";
import NoStream from "@/components/app/NoStream";

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

  const [mine, answers] = await Promise.all([
    chosenSections(student.uid),
    answersFor(student.uid),
  ]);

  const chosen = new Set(mine);
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
      <div>
        <h1 className="app-h1">Learn</h1>
        <p className="app-sub">
          {chapters.length} chapters in Class {student.class}
          {student.stream ? ` ${student.stream}` : ""} · {withVideo} have a video
        </p>
      </div>

      <ChapterBrowse chapters={chapters} />
    </>
  );
}

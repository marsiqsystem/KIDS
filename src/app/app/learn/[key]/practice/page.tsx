import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { chapterByKey } from "@/lib/app/bank";
import { playCards } from "@/lib/app/loop";
import QuestionPlayer from "@/components/app/QuestionPlayer";

/**
 * One chapter's questions, played on demand.
 *
 * Outside the (shell) group, like the daily set: the tab bar does not belong
 * under a question. Answers are recorded exactly as they are in the daily set —
 * see answerPractice for why that has to be true.
 */
export const dynamic = "force-dynamic";

export default async function ChapterPracticePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const student = await requireStudent();
  const { key } = await params;
  const chapter = chapterByKey(student.class, student.stream, student.medium, key);

  if (!chapter || chapter.questionIds.length === 0) redirect("/app/learn");

  const cards = await playCards(student, chapter.questionIds);

  return (
    <div className="app-frame">
      <QuestionPlayer
        cards={cards}
        startAt={0}
        mode="practice"
        title={chapter.chapter}
        doneHref={`/app/learn/${key}`}
      />
    </div>
  );
}

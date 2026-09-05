import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { chapterByKey, questionById } from "@/lib/app/bank";
import { answersFor } from "@/lib/app/loop";
import { requestVideoAction } from "@/app/app/loop-actions";
import VideoEmbed from "@/components/app/VideoEmbed";

/**
 * One chapter. Design 4c — the trick, the video, the history.
 *
 * The chapter's real size is stated everywhere it is mentioned: "Practise — 3
 * questions in this chapter", never a bare "Practise". A student must always
 * know what they are tapping into.
 */
export const dynamic = "force-dynamic";

const onDay = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(date);

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ asked?: string }>;
}) {
  const student = await requireStudent();
  const { key } = await params;
  const { asked } = await searchParams;

  const chapter = chapterByKey(student.class, student.stream, student.medium, key);
  if (!chapter) notFound();

  const answers = await answersFor(student.uid);
  const history = chapter.questionIds
    .map((id) => ({ id, row: answers.get(id) ?? null, q: questionById(id) }))
    .filter((x) => x.q);

  const seen = history.filter((h) => h.row);
  const right = seen.filter((h) => h.row!.was_correct).length;
  const total = chapter.questionIds.length;

  return (
    <>
      <div>
        <span className="app-eyebrow">
          {chapter.section} · Class {student.class}
        </span>
        <h1 className="app-h1">{chapter.chapter}</h1>
      </div>

      {chapter.trick && (
        <div className="app-trick">
          <span className="app-trick__label">★ The trick</span>
          <p>{chapter.trick}</p>
        </div>
      )}

      {chapter.video ? (
        <VideoEmbed
          videoId={chapter.video.id}
          language={chapter.video.language}
          duration={chapter.video.duration}
          start={chapter.video.start}
          chapter={chapter.chapter}
        />
      ) : (
        // 30 of the 342 chapters have no explainer filmed. Said plainly, with
        // the reassurance that matters: the written explanations are complete
        // and each one is written to stand on its own.
        <div className="app-card app-card--cream">
          <h3>No video for this chapter yet</h3>
          <p>
            Not every chapter has an explainer filmed. The questions and their full explanations are
            all here, and each explanation is written to stand on its own.
          </p>
          {asked ? (
            <p className="app-asked">
              Thank you — KIDS has your request for this chapter.
            </p>
          ) : (
            <form action={requestVideoAction}>
              <input type="hidden" name="bucket" value={chapter.bucket} />
              <input type="hidden" name="chapter" value={chapter.chapter} />
              <input type="hidden" name="key" value={chapter.key} />
              <button type="submit" className="app-btn app-btn--outline app-btn--small">
                Tell KIDS I want this one filmed
              </button>
            </form>
          )}
        </div>
      )}

      <Link href={`/app/learn/${chapter.key}/practice`} className="app-btn">
        Practise — {total} question{total === 1 ? "" : "s"} in this chapter
      </Link>

      <div className="app-card">
        <div className="app-history__head">
          <h3>Your history here</h3>
          {seen.length > 0 && (
            <span className="app-history__score">
              {right} of {seen.length} right
            </span>
          )}
        </div>

        {seen.length === 0 ? (
          <p>
            You have not answered anything from this chapter yet. It holds {total} question
            {total === 1 ? "" : "s"}.
          </p>
        ) : (
          <>
            {history.map(({ id, row, q }) => (
              <div key={id} className="app-history__row">
                <span
                  className={`app-history__dot${
                    !row ? "" : row.was_correct ? " app-history__dot--right" : " app-history__dot--wrong"
                  }`}
                  aria-hidden="true"
                />
                <span className="app-history__what">{q!.stem}</span>
                <span className="app-history__how">
                  {!row
                    ? "not seen"
                    : `${row.was_correct ? "right" : "wrong"} · ${onDay(row.last_answered_at)}`}
                </span>
              </div>
            ))}
            {seen.length < total && (
              <p>
                {total - seen.length} question{total - seen.length === 1 ? "" : "s"} in this chapter
                you have not met yet.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

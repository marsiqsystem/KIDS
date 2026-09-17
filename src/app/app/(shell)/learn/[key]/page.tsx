import { loadVideoOverrides } from "@/lib/content/video-overrides";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Lightbulb, VideoOff, X } from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { chapterByKey, questionById } from "@/lib/app/bank";
import { answersFor } from "@/lib/app/loop";
import { subjectHue } from "@/lib/app/subjects";
import { requestVideoAction } from "@/app/app/loop-actions";
import VideoEmbed from "@/components/app/VideoEmbed";
import { Empty } from "@/components/app/kit";

/**
 * One chapter. Redesign board 07, 2C — the trick, the video, the questions.
 *
 * The header takes the subject's full colour: the only place in the app a
 * subject owns a header. The chapter's real size is stated wherever it is
 * mentioned — "Practise · 3 questions", never a bare "Practise".
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

  await loadVideoOverrides();
  const chapter = chapterByKey(student.class, student.stream, student.medium, key);
  if (!chapter) notFound();

  const answers = await answersFor(student.uid);
  const history = chapter.questionIds
    .map((id) => ({ id, row: answers.get(id) ?? null, q: questionById(id) }))
    .filter((x) => x.q);

  const seen = history.filter((h) => h.row);
  const right = seen.filter((h) => h.row!.was_correct).length;
  const total = chapter.questionIds.length;
  const toRevise = seen.length - right;

  return (
    <>
      <header className="ch-hero" style={{ "--hue": subjectHue(chapter.section) } as React.CSSProperties}>
        <Link href="/app/learn" className="ch-hero__back" aria-label="Back to Learn">
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <div className="ch-hero__subject">{chapter.section}</div>
        <h1 className="ch-hero__name">{chapter.chapter}</h1>
      </header>

      {chapter.video ? (
        <VideoEmbed
          videoId={chapter.video.id}
          language={chapter.video.language}
          duration={chapter.video.duration}
          start={chapter.video.start}
          chapter={chapter.chapter}
        />
      ) : (
        // 30 of the 342 chapters have no explainer filmed. Said plainly; the
        // written explanations stand on their own.
        <div className="k-card k-card--dashed ch-novideo">
          <Empty title="No video yet" icon={<VideoOff size={30} aria-hidden="true" />}>
            {asked ? (
              <p className="k-line">KIDS has your request for this chapter.</p>
            ) : (
              <form action={requestVideoAction}>
                <input type="hidden" name="bucket" value={chapter.bucket} />
                <input type="hidden" name="chapter" value={chapter.chapter} />
                <input type="hidden" name="key" value={chapter.key} />
                <button type="submit" className="k-btn k-btn--outline k-btn--small">
                  Ask for a video
                </button>
              </form>
            )}
          </Empty>
        </div>
      )}

      {chapter.trick ? (
        <div className="ch-trick">
          <div className="ch-trick__head">
            <Lightbulb size={18} aria-hidden="true" /> The trick
          </div>
          <p>{chapter.trick}</p>
        </div>
      ) : null}

      <div className="ch-stats">
        <div>
          <b>{seen.length}</b>
          <span>seen</span>
        </div>
        <div>
          <b>{right}</b>
          <span>got right</span>
        </div>
        <div>
          <b>{toRevise}</b>
          <span>to revise</span>
        </div>
      </div>

      {total > 0 ? (
        <div className="k-card">
          <div className="k-label">Questions in this chapter</div>
          <ul className="ch-qs">
            {history.map(({ id, row, q }) => (
              <li key={id}>
                <span
                  className={`ch-qs__dot${!row ? "" : row.was_correct ? " ch-qs__dot--right" : " ch-qs__dot--wrong"}`}
                  aria-hidden="true"
                >
                  {!row ? null : row.was_correct ? <Check size={13} /> : <X size={13} />}
                </span>
                <span className="ch-qs__stem">{q!.stem}</span>
                {!row ? (
                  <span className="k-chip k-chip--new">New</span>
                ) : row.was_correct ? (
                  <span className="k-chip k-chip--grey">Right · {onDay(row.last_answered_at)}</span>
                ) : (
                  <span className="k-chip k-chip--again">Again</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="k-card k-card--dashed">
          <Empty title="Nothing here yet" line="This chapter has no questions loaded." />
        </div>
      )}

      {total > 0 ? (
        <>
          <p className="k-line ch-note">Practice here never breaks your streak.</p>
          <Link href={`/app/learn/${chapter.key}/practice`} className="k-btn">
            Practise · {total} question{total === 1 ? "" : "s"}
          </Link>
        </>
      ) : null}
    </>
  );
}

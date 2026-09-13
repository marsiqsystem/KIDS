import { signUid, qrSecret } from "@/lib/qr-token";
import { publicationState, findOnlineMarksheet } from "@/lib/exam/results";
import { offlinePublicationState, findOfflineMarksheet } from "@/lib/exam/offline-results";
import { reviewQuestions, chapterScores } from "@/lib/exam/offline-review";
import { chapterAsset, PLAYABLE } from "@/lib/exam/chapter-assets";
import { loadVideoOverrides } from "@/lib/content/video-overrides";
import type { LearnCard } from "@/components/portal/result/LearnIt";
import type { ResultViewProps } from "@/components/portal/result/ResultView";
import type { Student } from "@/lib/exam/db";

/**
 * Everything `<ResultView>` needs, for one student.
 *
 * Lifted out of `/portal/page.tsx`, where it grew up, because the student app's
 * My Record tab now shows the same component. Two copies of this assembly would
 * be two results — a chapter that qualifies as "worth revising" in one place and
 * not the other, a medium honoured on one screen and not the other — and the
 * two screens are reached by the same child within a minute of each other. The
 * portal and the app must agree because they are the same page.
 *
 * It is a plain read of published snapshots throughout. Nothing here computes a
 * mark; `scripts/publish-results.ts` and `scripts/import-offline-results.ts`
 * did that once, and this only decides what to hand the screen.
 */
export async function resultViewProps(student: Student): Promise<ResultViewProps> {
  // Primes the video overrides that chapterAsset() reads synchronously further
  // down. See src/lib/content/video-overrides.ts. At most one query a minute.
  await loadVideoOverrides();

  const [publication, online, written] = await Promise.all([
    publicationState(),
    findOnlineMarksheet(student),
    writtenHalf(student),
  ]);

  return {
    name: student.name,
    uid: student.uid,
    classLabel: student.class,
    stream: student.stream,
    school: student.school_name,
    centre: student.centre_name,
    publishedOn: publication.publishedOn,
    online,
    ...written,
  };
}

/**
 * The written paper's half of the page.
 *
 * Asked with the student in hand, not cohort-wide: a school on the withhold
 * list reads as "not published yet" for its own pupils while everyone else's is
 * open. Same answer, same words, same fallback view.
 */
async function writtenHalf(student: Student) {
  // The signed marksheet link. The same route and the same QR secret the
  // printed admit card's code resolves to, so a marksheet opened from the app,
  // from the portal, or from a scan is one page and not three.
  const marksheetHref = `/marksheet?id=${student.uid}&t=${signUid(student.uid, qrSecret())}`;

  const empty = {
    offline: null,
    offlineQuestions: [],
    offlineLearn: [] as LearnCard[],
    marksheetHref,
  };

  const { published } = await offlinePublicationState(student);
  if (!published) return { ...empty, offlinePublished: false };

  const sheet = await findOfflineMarksheet(student);
  // No row is not a zero. The 28 children whose sheets never reached the
  // scanner land here, and the screen says so in words.
  if (!sheet) return { ...empty, offlinePublished: true };

  // The written paper differs by medium in 30 places; show this student theirs.
  const questions = reviewQuestions(sheet, student.medium);

  // Only chapters with approved teaching content behind them: a card with a
  // heading and nothing under it is worse than no card.
  const offlineLearn: LearnCard[] = chapterScores(questions)
    .filter((c) => c.lost >= 2)
    .slice(0, 8)
    .map((c) => {
      const a = chapterAsset(sheet.class, sheet.stream, c.section, c.chapter);
      return (
        a && {
          chapter: c.chapter, section: c.section, correct: c.correct, total: c.total,
          trick: a.trick,
          videoId: a.video.video_id ?? null,
          videoLanguage: a.video.language ?? null,
          template: a.interactive.template,
          data: a.interactive.data,
          playable: PLAYABLE.has(a.interactive.template),
        }
      );
    })
    .filter((x): x is LearnCard => Boolean(x));

  return {
    offline: sheet,
    offlinePublished: true,
    offlineQuestions: questions,
    offlineLearn,
    marksheetHref,
  };
}

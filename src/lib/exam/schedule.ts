import { paperIdFor, PAPERS } from "./config";
import { getPaper } from "./papers";
import { openPaperNow, nextScheduledPaper, phaseOfPaper, type ExamPaper } from "./phases";
import type { Student } from "./db";

/**
 * When does THIS student's paper open, and which paper is it?
 *
 * Until September 2026 there was one answer for everybody, hardcoded: 19 July,
 * 10:30-11:00 IST. That was right while there was exactly one exam, and it is
 * wrong the moment there are two -- SET 2026 Phase 2 sits in December, and a
 * November mock has to behave identically to it or it is not a rehearsal.
 *
 * So the window now comes from `exam_papers` (see src/lib/exam/phases.ts). Two
 * properties of the old version are kept deliberately, because they were not
 * accidents:
 *
 *   * ONE window for everyone -- real students and the 62 demo accounts alike.
 *     The rehearsal machinery that once let a demo account sit at a different
 *     time was removed on purpose, and nothing here brings it back: a demo
 *     account goes through the same gate at the same second with the same
 *     deadline as the children.
 *   * NO environment override. The window is not movable by a stray variable.
 *     It is movable only by an office account editing the paper's row, which is
 *     an audited act by a named person.
 *
 * A paper with no `starts_at` is unscheduled and is never returned, which is
 * how December correctly reads as "no paper is open" on every screen until the
 * office fixes the date.
 */

export type Phase = "before" | "scanning" | "live" | "over";

export type ExamWindow = {
  /** The CLASS paper: 'SET2026-IX'. Which questions this child is handed. */
  paperId: string;
  /** The row in `exam_papers`: WHICH SITTING this is. Not the same thing. */
  examPaperId: string;
  examPaperCode: string;
  /** Verification opens and the paper preloads. The paper does NOT open. */
  opensAt: Date;
  /** The paper opens. Not a second earlier. */
  startsAt: Date;
  /** Hard stop, for everyone, however late they started. */
  endsAt: Date;
  durationMinutes: number;
  /** Must they be scanned in at a centre first? False for everything in July. */
  requiresCheckin: boolean;
};

/**
 * Which set of QUESTIONS this child is handed for this sitting.
 *
 * This used to be `paperIdFor(student.class)` and nothing else -- 'SET2026-X' --
 * which was correct while there was one exam and becomes dangerous the moment
 * there are two. Left alone, scheduling Phase 2 or a mock would open the JULY
 * paper, with the July answer key, whose every answer is already public on the
 * result page. So the question set is now named by the sitting AND the class:
 *
 *   P1-ONLINE   -> SET2026-X      the July papers, exactly as they were
 *   anything    -> <code>-X       e.g. P2-ONLINE-X, loaded before December
 *
 * and a sitting whose questions have not been loaded is never opened at all --
 * see toWindow below. There is no fallback to another paper, ever.
 */
export function questionSetFor(examPaperCode: string, cls: string | null): string | null {
  const c = cls?.trim().toUpperCase();
  if (!c || !(PAPERS as readonly string[]).includes(c)) return null;
  return examPaperCode === "P1-ONLINE" ? paperIdFor(c) : `${examPaperCode}-${c}`;
}

function toWindow(student: Student, paper: ExamPaper): ExamWindow | null {
  const paperId = questionSetFor(paper.code, student.class);
  // No class on file, so no paper we could honestly hand them. Six students.
  if (!paperId) return null;
  if (!paper.starts_at || !paper.ends_at) return null;
  // Scheduled, but its questions are not loaded: it does not open, and every
  // screen says "no paper is open" rather than counting down to a paper that
  // would fail -- or worse, to somebody else's.
  if (!getPaper(paperId)) return null;

  return {
    paperId,
    examPaperId: paper.id,
    examPaperCode: paper.code,
    opensAt: paper.scan_opens_at ?? paper.starts_at,
    startsAt: paper.starts_at,
    endsAt: paper.ends_at,
    durationMinutes: paper.duration_minutes ?? 30,
    requiresCheckin: paper.requires_checkin,
  };
}

/**
 * The window this student is in, or the next one they will be.
 *
 * Async now, where it used to be a pure function over a constant. Every caller
 * is already in an async server context; none of them was doing this in a
 * render loop.
 */
export async function windowFor(
  student: Student,
  now: Date = new Date(),
): Promise<ExamWindow | null> {
  const paper = (await openPaperNow(now)) ?? (await nextScheduledPaper(now));
  if (!paper) return null;
  return toWindow(student, paper);
}

export function phaseOf(window: ExamWindow, now: Date = new Date()): Phase {
  return phaseOfPaper(
    {
      scan_opens_at: window.opensAt,
      starts_at: window.startsAt,
      ends_at: window.endsAt,
    } as ExamPaper,
    now,
  );
}

/**
 * The deadline this student's attempt is issued.
 *
 * It is the END OF THE WINDOW, not "start time plus thirty minutes". A student
 * who scans at 10:50 gets ten minutes, not thirty -- the FAQ already tells them
 * so ("the online test still ends at 11:00 for everyone, so arriving late means
 * less time"), and 9,000 papers must close together or the last one never does.
 */
export function deadlineFor(window: ExamWindow): Date {
  return window.endsAt;
}

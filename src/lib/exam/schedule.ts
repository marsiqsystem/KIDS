import { paperIdFor } from "./config";
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

function toWindow(student: Student, paper: ExamPaper): ExamWindow | null {
  const paperId = paperIdFor(student.class);
  // No class on file, so no paper we could honestly hand them. Six students.
  if (!paperId) return null;
  if (!paper.starts_at || !paper.ends_at) return null;

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

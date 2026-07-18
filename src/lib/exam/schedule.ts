import { EXAM, paperIdFor } from "./config";
import type { Student } from "./db";

/**
 * When does THIS student's paper open, and which paper is it?
 *
 * One window, for everyone — real students and the 62 demo/staff accounts alike:
 * 19 July, 10:30–11:00 IST, the paper for their class. The rehearsal machinery
 * that used to let a demo account sit at a different time has been removed now
 * that the real papers are loaded: there is nothing left to rehearse, and the
 * demo accounts must go through the exact same gate, at the exact same second,
 * with the exact same questions and deadline as the children. See config.ts —
 * the window is deliberately not movable by any environment variable.
 */

export type Phase = "before" | "scanning" | "live" | "over";

export type ExamWindow = {
  paperId: string;
  /** Verification opens and the paper preloads. The paper does NOT open. */
  opensAt: Date;
  /** The paper opens. Not a second earlier. */
  startsAt: Date;
  /** Hard stop, for everyone, however late they started. */
  endsAt: Date;
  durationMinutes: number;
};

export function windowFor(student: Student): ExamWindow | null {
  const paperId = paperIdFor(student.class);
  if (!paperId) return null; // no class on file, so no paper we could honestly hand them

  return {
    paperId,
    opensAt: EXAM.scanOpensAt,
    startsAt: EXAM.startsAt,
    endsAt: EXAM.endsAt,
    durationMinutes: EXAM.durationMinutes,
  };
}

export function phaseOf(window: ExamWindow, now: Date = new Date()): Phase {
  if (now < window.opensAt) return "before";
  if (now < window.startsAt) return "scanning";
  if (now < window.endsAt) return "live";
  return "over";
}

/**
 * The deadline this student's attempt is issued.
 *
 * It is the END OF THE WINDOW, not "start time plus thirty minutes". A student
 * who scans at 10:50 gets ten minutes, not thirty — the FAQ already tells them
 * so ("the online test still ends at 11:00 for everyone, so arriving late means
 * less time"), and 9,000 papers must close together or the last one never does.
 */
export function deadlineFor(window: ExamWindow): Date {
  return window.endsAt;
}

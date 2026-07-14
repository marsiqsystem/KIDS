import { EXAM, paperIdFor } from "./config";
import { REHEARSAL_PAPER_ID } from "./papers";
import type { Student } from "./db";

/**
 * When does THIS student's paper open, and which paper is it?
 *
 * The exam used to be one hardcoded window for everybody. It cannot stay that
 * way: we need to run a full rehearsal — a real student, a real phone, a real
 * paper, start to submit — before exam morning, and the only honest rehearsal is
 * one that goes through this exact code.
 *
 * So the window is resolved per student. The rule that matters is the guard in
 * `rehearsalFor()`: a rehearsal window can only ever attach to an `is_demo`
 * record. A fat-fingered environment variable can therefore cost us a test
 * account, and never a real child's exam.
 */

export type Phase = "before" | "scanning" | "live" | "over";

export type ExamWindow = {
  paperId: string;
  isRehearsal: boolean;
  /** Verification opens and the paper preloads. The paper does NOT open. */
  opensAt: Date;
  /** The paper opens. Not a second earlier. */
  startsAt: Date;
  /** Hard stop, for everyone, however late they started. */
  endsAt: Date;
  durationMinutes: number;
};

/** How long before the start the portal lets a student in to verify and wait. */
const SCAN_LEAD_MINUTES = 15;

/**
 * A rehearsal window, from the environment:
 *
 *   KIDS_REHEARSAL_UIDS=213999417,104999444
 *   KIDS_REHEARSAL_START=2026-07-14T22:00:00+05:30
 *   KIDS_REHEARSAL_MINUTES=10
 *
 * Every branch here fails CLOSED — a missing, malformed or nonsensical value
 * yields no rehearsal, never a rehearsal at the wrong time.
 */
function rehearsalFor(student: Student): ExamWindow | null {
  // The guard. Everything else in this file is a convenience; this is the safety.
  if (!student.is_demo) return null;

  const uids = (process.env.KIDS_REHEARSAL_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!uids.includes(student.uid)) return null;

  const raw = process.env.KIDS_REHEARSAL_START?.trim();
  if (!raw) return null;
  const startsAt = new Date(raw);
  if (Number.isNaN(startsAt.getTime())) return null;

  const minutes = Number(process.env.KIDS_REHEARSAL_MINUTES ?? "10");
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  return {
    paperId: REHEARSAL_PAPER_ID,
    isRehearsal: true,
    opensAt: new Date(startsAt.getTime() - SCAN_LEAD_MINUTES * 60_000),
    startsAt,
    endsAt: new Date(startsAt.getTime() + minutes * 60_000),
    durationMinutes: minutes,
  };
}

/** The real thing: 19 July, 10:30–11:00, the paper for their class. */
function setExamFor(student: Student): ExamWindow | null {
  const paperId = paperIdFor(student.class);
  if (!paperId) return null; // no class on file, so no paper we could honestly hand them

  return {
    paperId,
    isRehearsal: false,
    opensAt: EXAM.scanOpensAt,
    startsAt: EXAM.startsAt,
    endsAt: EXAM.endsAt,
    durationMinutes: EXAM.durationMinutes,
  };
}

export function windowFor(student: Student): ExamWindow | null {
  return rehearsalFor(student) ?? setExamFor(student);
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

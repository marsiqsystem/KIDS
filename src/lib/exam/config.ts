/**
 * When the online exam happens. Times are ABSOLUTE and server-side.
 *
 * A phone's clock is whatever its owner set it to, so it is never consulted for
 * anything that matters. The server issues an absolute deadline; the client is
 * only allowed to count down toward it.
 */

/** 19 July 2026, in IST (UTC+05:30). */
export const EXAM = {
  /** Scanning opens: students verify their card and the paper preloads. */
  scanOpensAt: new Date("2026-07-19T09:30:00+05:30"),
  /** The paper unlocks. Not a second earlier. */
  startsAt: new Date("2026-07-19T10:30:00+05:30"),
  /** Hard stop. An attempt past this is submitted, whatever the student does. */
  endsAt: new Date("2026-07-19T11:00:00+05:30"),
  durationMinutes: 30,
  questionCount: 50,
  /** Full snapshot of the answer sheet, so a dead phone costs a minute, not an exam. */
  draftIntervalSeconds: 60,
} as const;

export type ExamPhase = "before" | "scanning" | "live" | "over";

export function examPhase(now: Date = new Date()): ExamPhase {
  if (now < EXAM.scanOpensAt) return "before";
  if (now < EXAM.startsAt) return "scanning";
  if (now < EXAM.endsAt) return "live";
  return "over";
}

/**
 * Which paper a student sits.
 *
 * The ONLINE exam is class-wise only -- four papers, IX / X / XI / XII. Stream
 * does not divide it, even for XI and XII (the printed admit card still shows a
 * stream, because the OFFLINE exam that follows at 11:30 does use it; the two
 * must not be confused). So the 39 XI/XII students with no stream on file can
 * still sit this paper perfectly well.
 *
 * Returns null only when the CLASS is unknown, which is the one thing we cannot
 * work around: 6 students have no class recorded, and there is no paper we could
 * honestly hand them.
 */
export const PAPERS = ["IX", "X", "XI", "XII"] as const;

export function paperIdFor(cls: string | null): string | null {
  const c = cls?.trim().toUpperCase();
  if (!c) return null;
  return (PAPERS as readonly string[]).includes(c) ? `SET2026-${c}` : null;
}

import { forget, readJson, writeJson } from "./store";

/**
 * "A paper is running on this phone", written to the phone itself.
 *
 * The tab bar is hidden and Back is blocked while the Exam tab holds a paper,
 * but both lived in the Exam tab's memory. Swipe the app out of recent apps and
 * open it again, and it came back on Home with every tab one tap away — the
 * paper still running, the desk none the wiser (found 20 Oct 2026 on Umar's
 * phone). So the fact is kept here as well, and a fresh launch reads it before
 * anything else and goes straight back to the paper.
 *
 * It holds only the deadline. Past it the paper is shut for everyone, so the
 * marker is simply stale and is ignored.
 */
const KEY = "kids:exam:sitting";

export function markSitting(deadlineIso: string): void {
  if (deadlineIso) writeJson(KEY, { until: deadlineIso });
}

export function clearSitting(): void {
  forget(KEY);
}

export function isSitting(): boolean {
  const m = readJson<{ until: string }>(KEY);
  if (!m) return false;
  if (new Date(m.until).getTime() > Date.now()) return true;
  forget(KEY);
  return false;
}

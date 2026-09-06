import { sql, type Student } from "@/lib/exam/db";
import { publicationState } from "@/lib/exam/results";
import { offlinePublicationState } from "@/lib/exam/offline-results";
import { windowFor, phaseOf } from "@/lib/exam/schedule";
import { existingSet } from "@/lib/app/loop";

/**
 * Notices from KIDS — design 7b.
 *
 * Four things will ever appear here: results published, a paper opening soon, a
 * paper open now, and today's set waiting. Never another student's marks, never
 * a rank, and never a message for missing a day.
 *
 * Nothing is queued and nothing is sent. A notice is not a row somebody writes
 * — it is a fact about this student's own record, computed when they look. That
 * is deliberate: a fan-out table of 9,714 rows per announcement would need a
 * job to write it, a job to retry it, and a way to repair it when a school is
 * withheld after the fact. The gates that decide whether a result may be seen
 * (`offlinePublicationState`, which honours the withhold list per school) are
 * the same ones the record screen asks, so a notice can never appear for a
 * result the student is not allowed to open.
 *
 * The only thing stored is which notices have been read, keyed by a string that
 * carries the event's identity — so "read" survives a redeploy, and a genuinely
 * new event (tomorrow's set, a second paper) is never mistaken for a read one.
 */

export type NoticeKind = "results" | "paper-soon" | "paper-open" | "daily";

export interface Notice {
  /** Stable across requests and deploys; carries the event's identity. */
  key: string;
  kind: NoticeKind;
  title: string;
  body: string;
  /** When the thing happened, for ordering. Null when only a date is known. */
  at: Date | null;
  /** "today", "2 days ago", "17 August 2026" — whatever is honest for this one. */
  when: string;
  action?: { label: string; href: string };
  read: boolean;
}

const MS_DAY = 86_400_000;

/** IST midnight for a moment, so "today" means the day in Kolkata. */
function istDayStart(d: Date): number {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  return Date.parse(`${iso}T00:00:00+05:30`);
}

/** "today", "yesterday", "4 days ago" — counted in whole days, in Kolkata. */
function agoInDays(at: Date, now: Date): string {
  const days = Math.round((istDayStart(now) - istDayStart(at)) / MS_DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 31) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric",
  }).format(at);
}

/** "in three days", "tomorrow" — the same counting, forwards. */
function inDays(at: Date, now: Date): string {
  const days = Math.round((istDayStart(at) - istDayStart(now)) / MS_DAY);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const clock = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);

/**
 * Which notices this student has read.
 *
 * A missing table reads as "nothing read" rather than throwing. The cost of
 * that failure is a dot that will not clear; the cost of the alternative is a
 * blank screen on results day.
 */
async function readKeys(uid: string): Promise<Set<string>> {
  try {
    const rows = (await sql`
      select notice_key from app_notice_reads where uid = ${uid}
    `) as { notice_key: string }[];
    return new Set(rows.map((r) => r.notice_key));
  } catch {
    return new Set();
  }
}

export async function markNoticesRead(uid: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    for (const key of keys) {
      await sql`
        insert into app_notice_reads (uid, notice_key) values (${uid}, ${key})
        on conflict (uid, notice_key) do nothing
      `;
    }
  } catch {
    // Same reasoning as readKeys: never the thing that breaks the screen.
  }
}

/** Every notice for this student, newest first. */
export async function noticesFor(student: Student, now: Date = new Date()): Promise<Notice[]> {
  const [online, offline, read, set] = await Promise.all([
    publicationState(),
    offlinePublicationState(student),
    readKeys(student.uid),
    // Read-only on purpose: a bell must not be what decides today's five.
    existingSet(student.uid),
  ]);

  const out: Notice[] = [];

  // ---------------------------------------------------------- results out --
  //
  // One notice, not two. Both halves of SET 2026 were published within a
  // fortnight of each other and a child reading "your results are published"
  // twice learns nothing the second time. The key carries both dates, so if a
  // half is published later the notice becomes a new, unread one.
  if (online.published || offline.published) {
    const both = online.published && offline.published;
    const which = both
      ? "both papers"
      : offline.published
        ? "the written paper"
        : "the online paper";
    const on = offline.published ? offline.publishedOn : online.publishedOn;
    // The published date is a formatted string, not a stamp. Parse it for
    // ordering only, and never show the parsed value — `on` is what is shown.
    const parsed = on ? new Date(on) : null;
    const at = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

    out.push({
      key: `results:${online.publishedOn || "-"}|${offline.publishedOn || "-"}`,
      kind: "results",
      title: "Your results are published",
      body: `SET 2026 · ${which}. Your marks, your ranks and your answer sheet are on your record now.`,
      at,
      when: at ? agoInDays(at, now) : on,
      action: { label: "Open my record", href: "/app/record" },
      read: false,
    });
  }

  // -------------------------------------------------------------- a paper --
  const window = windowFor(student);
  if (window) {
    const phase = phaseOf(window, now);

    if (phase === "scanning" || phase === "live") {
      out.push({
        key: `paper-open:${window.paperId}`,
        kind: "paper-open",
        title: "Your paper is open now",
        body:
          `Closes ${clock(window.endsAt)}. Your invigilator will read out the centre PIN — ` +
          `you cannot start without it.`,
        at: window.startsAt,
        when: clock(window.startsAt),
        action: { label: "Go to the paper", href: "/app/exam" },
        read: false,
      });
    }

    // A week's notice, and no earlier: a paper announced a month out is read
    // once and forgotten before it matters.
    const daysAway = Math.round((istDayStart(window.startsAt) - istDayStart(now)) / MS_DAY);
    if (phase === "before" && daysAway <= 7) {
      out.push({
        key: `paper-soon:${window.paperId}`,
        kind: "paper-soon",
        title: `A paper opens ${inDays(window.startsAt, now)}`,
        body:
          `${window.durationMinutes} minutes, one attempt, and it closes at ${clock(window.endsAt)} ` +
          `for everybody however late you start. Read the rules before the morning.`,
        at: window.startsAt,
        when: inDays(window.startsAt, now),
        action: { label: "What happens on the day", href: "/app/exam" },
        read: false,
      });
    }
  }

  // --------------------------------------------------------- today's set --
  //
  // Only while it is still waiting. A finished set produces no notice at all,
  // and neither does a missed day — 7b is explicit that nothing here ever tells
  // a child off.
  if (set && set.answered < set.questionIds.length) {
    const left = set.questionIds.length - set.answered;
    out.push({
      key: `daily:${set.onDate}`,
      kind: "daily",
      title: set.answered > 0 ? "Today's set is half done" : "Today's set is waiting",
      body:
        set.answered > 0
          ? `${left} question${left === 1 ? "" : "s"} left. The ones you did not reach are still unseen.`
          : `${set.questionIds.length} questions, about three minutes.`,
      at: set.builtAt,
      when: agoInDays(set.builtAt, now),
      action: { label: set.answered > 0 ? "Carry on" : "Start", href: "/app/set" },
      read: false,
    });
  }

  for (const n of out) n.read = read.has(n.key);

  // Newest first, and anything without a stamp after the stamped ones.
  return out.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
}

/** For the bell on Home. Counts the same notices the list would show. */
export async function unreadCount(student: Student, now: Date = new Date()): Promise<number> {
  try {
    return (await noticesFor(student, now)).filter((n) => !n.read).length;
  } catch {
    // A bell that cannot be counted shows no dot. It must never be the reason
    // Home fails to render.
    return 0;
  }
}

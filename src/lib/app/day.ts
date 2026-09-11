import { sql } from "@/lib/exam/db";
import type { Student } from "@/lib/exam/db";
import { istToday } from "@/lib/app/loop";

/**
 * The Day — Design turn 8, part one.
 *
 * For a student on the coaching programme, Home stops being a feed and becomes
 * a day: one vertical spine, times down the left, and **exactly one card open**
 * — the block that is now. Everything else is a line of text, so the day reads
 * as a day and not as nine cards competing.
 *
 * ## What this module is not
 *
 * It is not a second copy of anything. Three of the eight blocks have no
 * content of their own and deliberately so:
 *
 *   * `daily` opens the set `src/lib/app/loop.ts` already builds, scored into
 *     the same streak. It is the 7:10 block, not a competing card.
 *   * `class` reads `admin_classes` for this student's batch today, so the
 *     timeline shows the class the teacher actually scheduled, at the time she
 *     scheduled it.
 *   * `school` has nothing to complete at all.
 *
 * ## Time
 *
 * Everything here is IST. A block at 06:00 means six in Kolkata, and a day
 * turns over at midnight there — a child finishing revision at 11 p.m. is
 * still on today. The server's own clock and offset are never used for
 * anything a student reads.
 *
 * ## What is counted, and what is not
 *
 * Nothing inside school hours is ever counted or missed. The app would
 * otherwise be marking a child present at something it cannot see, and a wrong
 * mark on a screen a parent reads aloud is a serious thing.
 */

export type BlockKind =
  | "wake"
  | "ritual"
  | "revision"
  | "daily"
  | "school"
  | "class"
  | "homework"
  | "winddown";

/**
 * Where a block stands right now.
 *
 * `uncounted` is school and only school: not done, not missed, not anything.
 * `ahead` and `missed` are decided by the clock; `now` is the one block the
 * screen opens, and there is never more than one.
 */
export type BlockStatus = "done" | "now" | "ahead" | "missed" | "uncounted";

export interface DayBlock {
  kind: BlockKind;
  label: string;
  subtitle: string | null;
  /** "06:00", in IST, after any personal move. */
  at: string;
  minutes: number | null;
  fixed: boolean;
  status: BlockStatus;
  /** What the student did, when they did it — "up at 5:34". */
  detail: string | null;
  /** Where tapping it goes, when there is anywhere. */
  href: string | null;
  /** The words on the button, when this is the open block. */
  action: string | null;
}

export interface Day {
  programme: { id: string; name: string; week: number; weeks: number; daysLeft: number };
  date: string;
  blocks: DayBlock[];
  /** How many of the counted blocks are done, and how many there are. */
  done: number;
  countable: number;
  /**
   * Which shape the screen takes, decided by the day itself rather than by a
   * clock literal in a component.
   *
   *   `morning` — the full spine, one card open.
   *   `late`    — past the wind-down, and something did not happen. Design 8n:
   *               what you DID, then plainly what you did not, then the fact
   *               that a person already noticed, and only then a way back.
   *   `away`    — not opened for two days or more. Design 8n-ii.
   */
  shape: "morning" | "late" | "away";
  /** Whole programme days before today with nothing marked at all. */
  awayDays: number;
  /**
   * The teacher of this batch, by name.
   *
   * On the screens that say a person noticed, this is that person. Null when
   * nobody is assigned — and then those screens say nothing about anyone
   * noticing, because an invented teacher is worse than none.
   */
  teacher: string | null;
  /** Where a missed class was recorded, when she has posted it. */
  recording: string | null;
}

/** Minutes since midnight in Kolkata. */
function istMinutesNow(now: Date): number {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const toMinutes = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

/** "18:30" from whatever shape the driver hands back for a `time` column. */
const hhmm = (t: unknown) => String(t).slice(0, 5);

interface ProgrammeRow {
  id: string;
  name: string;
  /** `YYYY-MM-DD`, as text. A Date here is built in the SERVER’s zone and
   * `toISOString()` then slides it back a day, which read as the programme
   * having started a day early and one fewer day left in it. */
  starts_on: string;
  weeks: number;
  school_days: number[];
}

/**
 * The programme this student is on, if any.
 *
 * Null for 9,649 of 9,714 students, and that is the common path — it costs one
 * indexed lookup and Home carries on being the feed it was.
 */
export async function programmeFor(uid: string): Promise<ProgrammeRow | null> {
  const rows = (await sql`
    select p.id::text, p.name, p.starts_on::text, p.weeks, p.school_days
      from coaching_programmes p
      join admin_batch_members m
        on m.batch_id = p.batch_id and m.uid = ${uid} and m.removed_at is null
     where p.archived_at is null
     limit 1
  `) as ProgrammeRow[];
  return rows[0] ?? null;
}

/** Whole days between two IST dates. */
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

interface BlockRow {
  kind: BlockKind;
  label: string;
  subtitle: string | null;
  at_time: string;
  minutes: number | null;
  fixed: boolean;
}

interface MarkRow {
  kind: BlockKind;
  done_at: Date;
  detail: Record<string, unknown> | null;
}

interface ClassRow {
  id: string;
  title: string;
  subject: string | null;
  starts_at: Date;
  minutes: number;
  started_at: Date | null;
  ended_at: Date | null;
  cancelled_at: Date | null;
  recording_url: string | null;
}

export async function dayFor(student: Student, now: Date = new Date()): Promise<Day | null> {
  const programme = await programmeFor(student.uid);
  if (!programme) return null;

  const date = istToday(now);
  const startsOn = programme.starts_on.slice(0, 10);
  const elapsed = daysBetween(startsOn, date);

  /**
   * Before the first Monday the programme exists but has not begun. The day is
   * still shown — a child who installs the app on the Friday before should see
   * what is coming rather than an empty feed — with week 1 and nothing missed,
   * which falls out of the clock rules below on a date in the future.
   */
  const week = Math.max(1, Math.floor(elapsed / 7) + 1);
  const daysLeft = Math.max(0, programme.weeks * 7 - elapsed);

  const [blockRows, markRows, classRows] = (await Promise.all([
    sql`
      select kind, label, subtitle, at_time, minutes, fixed
        from coaching_blocks
       where programme_id = ${programme.id}::bigint and removed_at is null
       order by sort
    `,
    sql`
      select kind, done_at, detail from coaching_marks
       where uid = ${student.uid} and on_date = ${date}::date
    `,
    /**
     * Today's class for this student's batch, if the teacher scheduled one.
     * The timeline shows HER time, not the block's default — the block only
     * says where the class sits when there is no class, which is most days of
     * a six-day week with four lessons in it.
     */
    sql`
      select c.id::text, c.title, c.subject, c.starts_at, c.minutes,
             c.started_at, c.ended_at, c.cancelled_at, c.recording_url
        from admin_classes c
        join admin_batch_members m
          on m.batch_id = c.batch_id and m.uid = ${student.uid} and m.removed_at is null
       where (c.starts_at at time zone 'Asia/Kolkata')::date = ${date}::date
       order by c.starts_at
       limit 1
    `,
  ])) as [BlockRow[], MarkRow[], ClassRow[]];

  /**
   * Two more facts the evening needs, fetched only once the programme is known
   * so that 9,649 students never pay for them.
   *
   * `away` counts programme days BEFORE today on which nothing at all was
   * marked, back as far as a fortnight. It stops at the first day that has a
   * mark, so a student who kept Tuesday and missed Wednesday and Thursday is
   * two days away, not three.
   */
  const [teacherRows, keptRows] = (await Promise.all([
    sql`
      select s.full_name
        from admin_batch_teachers t
        join admin_staff s on s.staff_id = t.staff_id
        join admin_batch_members m on m.batch_id = t.batch_id
       where m.uid = ${student.uid} and m.removed_at is null and t.removed_at is null
       order by t.assigned_at
       limit 1
    `,
    sql`
      select distinct on_date::text as on_date from coaching_marks
       where uid = ${student.uid}
         and on_date < ${date}::date
         and on_date >= ${date}::date - 14
    `,
  ])) as [{ full_name: string }[], { on_date: string }[]];

  const kept = new Set(keptRows.map((r) => r.on_date));
  let awayDays = 0;
  for (let back = 1; back <= 14; back += 1) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - back);
    const iso = d.toISOString().slice(0, 10);
    // Days before the programme began are not days the student was away.
    if (iso < startsOn) break;
    if (kept.has(iso)) break;
    awayDays += 1;
  }

  const marks = new Map(markRows.map((m) => [m.kind, m]));
  const live = classRows[0];
  const nowMinutes = istMinutesNow(now);

  const blocks: DayBlock[] = blockRows.map((row) => {
    const isClass = row.kind === "class";
    const at = isClass && live ? istTimeOf(live.starts_at) : hhmm(row.at_time);
    const mark = marks.get(row.kind);

    let status: BlockStatus;
    let detail: string | null = null;
    let href: string | null = null;
    let action: string | null = null;

    if (row.kind === "school") {
      // Never counted, never missed, never open. It is a stretch of the day
      // that exists so the day is continuous.
      status = "uncounted";
    } else if (mark) {
      status = "done";
      detail = describe(row.kind, mark.detail, mark.done_at);
    } else if (toMinutes(at) > nowMinutes) {
      status = "ahead";
    } else {
      status = "now";
    }

    if (isClass) {
      if (!live || live.cancelled_at) {
        // No class today. The block still shows, as a line, so the shape of
        // the day does not move about from one day to the next.
        status = "uncounted";
        detail = live?.cancelled_at ? "Cancelled" : "No class today";
      } else {
        href = `/app/class/${live.id}`;
        if (live.ended_at) {
          status = "done";
          detail = "Finished";
        } else if (live.started_at) {
          status = "now";
          action = "Go in";
        } else if (toMinutes(at) > nowMinutes) {
          status = "ahead";
        } else {
          // Past its time and not opened: the teacher is late, which is a
          // different thing from the student missing it, and the student has
          // not missed anything.
          status = "ahead";
          detail = "Not started yet";
        }
      }
    }

    if (status === "now") {
      switch (row.kind) {
        case "wake":
          action = "I'm up";
          break;
        case "ritual":
          action = "Begin";
          href = "/app/day/sit";
          break;
        case "revision":
          action = "Done";
          break;
        case "daily":
          action = "Start";
          href = "/app/set";
          break;
        case "homework":
          action = action ?? "Open";
          break;
        default:
          break;
      }
    }

    return {
      kind: row.kind,
      label: isClass && live ? live.title : row.label,
      subtitle:
        isClass && live
          ? [live.subject, live.minutes ? `${live.minutes} min` : null].filter(Boolean).join(" · ") ||
            row.subtitle
          : row.subtitle,
      at,
      minutes: row.minutes,
      fixed: row.fixed,
      status,
      detail,
      href,
      action,
    };
  });

  /**
   * Exactly one card is open. Design is explicit about this and it is the
   * whole reason the screen reads as a day: the block that is NOW is the last
   * one whose time has passed and which is not done. Everything earlier that
   * was not done is behind you and is `missed`.
   */
  const openIndex = blocks.map((b) => b.status === "now").lastIndexOf(true);
  blocks.forEach((b, i) => {
    if (b.status === "now" && i !== openIndex) {
      b.status = "missed";
      /**
       * The wake keeps its button even once the day has moved past it.
       *
       * Everything else behind you is behind you. But tapping "I am up" IS the
       * act of starting the day - it is what the streak counts, not a course
       * completion - and a child who surfaces at 6:02 has got up. Taking the
       * button away at 5:31 would mean the only people who can ever claim the
       * block are the ones who were already awake to hear the alarm.
       */
      b.action = b.kind === "wake" ? b.action : null;
    }
  });

  const countable = blocks.filter((b) => b.status !== "uncounted").length;
  const done = blocks.filter((b) => b.status === "done").length;
  const missed = blocks.filter((b) => b.status === "missed").length;

  /**
   * The day is late once it is past the wind-down — the block that says the
   * app goes quiet. Taken from the programme's own spine rather than from a
   * literal hour here, so a teacher who moves the wind-down moves this too.
   */
  const winddown = blocks.find((b) => b.kind === "winddown");
  const isLate = winddown ? nowMinutes >= toMinutes(winddown.at) : nowMinutes >= 21 * 60 + 45;

  const shape =
    awayDays >= 2 ? "away" : isLate && missed > 0 ? "late" : "morning";

  return {
    programme: { id: programme.id, name: programme.name, week, weeks: programme.weeks, daysLeft },
    date,
    blocks,
    done,
    countable,
    shape,
    awayDays,
    teacher: teacherRows[0]?.full_name ?? null,
    recording: live?.recording_url ?? null,
  };
}

/** "18:30" for a timestamp, in Kolkata. */
function istTimeOf(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/**
 * What a finished block says about itself.
 *
 * "Up at 5:34", not "Done" — the day is evidence that it was kept, and the
 * minute a child actually got up is the most convincing thing on the screen.
 */
function describe(
  kind: BlockKind,
  detail: Record<string, unknown> | null,
  doneAt: Date,
): string | null {
  const at = istTimeOf(doneAt);
  switch (kind) {
    case "wake":
      return `Up at ${at}`;
    case "ritual":
      return "Sat still";
    case "revision":
      return typeof detail?.chapter === "string" ? String(detail.chapter) : "Revised";
    case "daily":
      return typeof detail?.score === "string" ? String(detail.score) : "Answered";
    default:
      return null;
  }
}

/**
 * Mark a block done, once, for today.
 *
 * Idempotent by primary key rather than by a check-then-insert: a child tapping
 * "I'm up" twice at 5:34 must not move the minute they got up, and two taps a
 * second apart are the most ordinary thing on a cold morning.
 */
export async function markBlock(
  uid: string,
  kind: BlockKind,
  detail: Record<string, unknown> | null = null,
  now: Date = new Date(),
): Promise<void> {
  if (kind === "school") return;
  await sql`
    insert into coaching_marks (uid, on_date, kind, detail)
    values (${uid}, ${istToday(now)}::date, ${kind}, ${detail ? JSON.stringify(detail) : null})
    on conflict (uid, on_date, kind) do nothing
  `;
}

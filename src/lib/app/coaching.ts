import { sql } from "@/lib/exam/db";
import { programmeFor } from "@/lib/app/day";
import { istToday } from "@/lib/app/loop";

/**
 * "Your coaching" — the three figures at the top of Profile for a student on
 * the programme (redesign board 13, 2D, ruled 16 Sep): the week, the batch
 * size, the start date. Read by the website's CoachingBlock and the native
 * app's Profile alike. No teacher name, no attendance; the bar measures weeks
 * elapsed, nothing about the child. Null for everyone not on a programme.
 */
export interface CoachingSummary {
  name: string;
  started: boolean;
  /** Week of the programme, or null before it starts. */
  week: number | null;
  weeks: number;
  batchSize: number;
  /** "8 Sep", in Kolkata. */
  startsOn: string;
  /** 0–100, weeks elapsed of the programme. */
  progress: number;
}

export async function coachingSummary(uid: string): Promise<CoachingSummary | null> {
  const programme = await programmeFor(uid);
  if (!programme) return null;

  const size = (await sql`
    select count(*)::int as n
      from admin_batch_members m
      join coaching_programmes p on p.batch_id = m.batch_id
     where p.id = ${programme.id}::bigint and m.removed_at is null
  `) as { n: number }[];

  const startsOn = programme.starts_on.slice(0, 10);
  const elapsed = Math.round((Date.parse(`${istToday()}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / 86_400_000);
  const started = elapsed >= 0;
  const week = Math.min(programme.weeks, Math.max(1, Math.floor(elapsed / 7) + 1));

  return {
    name: programme.name,
    started,
    week: started ? week : null,
    weeks: programme.weeks,
    batchSize: size[0]?.n ?? 0,
    startsOn: new Date(`${startsOn}T06:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    progress: started ? Math.round((week / programme.weeks) * 100) : 0,
  };
}

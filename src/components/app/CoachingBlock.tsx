import { sql } from "@/lib/exam/db";
import { programmeFor } from "@/lib/app/day";
import { istToday } from "@/lib/app/loop";

/**
 * "Your coaching" at the top of Profile. Redesign board 13, 2D — ruled 16 Sep:
 * a coaching student sees their batch and week.
 *
 * Three figures only — the week, the batch size, the start date — all counted
 * from the programme and the batch. No teacher name, no attendance, and the bar
 * measures weeks elapsed, nothing about the child. Renders nothing for the
 * 9,587 students who are in no programme.
 */
export default async function CoachingBlock({ uid }: { uid: string }) {
  const programme = await programmeFor(uid);
  if (!programme) return null;

  const size = (await sql`
    select count(*)::int as n
      from admin_batch_members m
      join coaching_programmes p on p.batch_id = m.batch_id
     where p.id = ${programme.id}::bigint and m.removed_at is null
  `) as { n: number }[];

  const startsOn = programme.starts_on.slice(0, 10);
  const elapsed = Math.round(
    (Date.parse(`${istToday()}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / 86_400_000,
  );
  const started = elapsed >= 0;
  const week = Math.min(programme.weeks, Math.max(1, Math.floor(elapsed / 7) + 1));
  const started_on = new Date(`${startsOn}T06:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="pf-coach">
      <div className="k-label pf-coach__label">Your coaching</div>
      <div className="pf-coach__name">{programme.name}</div>
      <div className="pf-coach__figures">
        <div>
          <b>{started ? week : "—"}</b>
          <span>week of {programme.weeks}</span>
        </div>
        <div>
          <b>{size[0]?.n ?? 0}</b>
          <span>in your batch</span>
        </div>
        <div>
          <b>{started_on}</b>
          <span>{started ? "started" : "starts"}</span>
        </div>
      </div>
      <div className="k-bar pf-coach__bar" aria-hidden="true">
        <span style={{ width: `${started ? Math.round((week / programme.weeks) * 100) : 0}%`, "--hue": "var(--gold)" } as React.CSSProperties} />
      </div>
      <p className="k-line">Your teacher and your classes are on Home.</p>
    </div>
  );
}

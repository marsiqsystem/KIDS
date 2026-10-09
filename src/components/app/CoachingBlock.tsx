import { coachingSummary } from "@/lib/app/coaching";

/**
 * "Your coaching" at the top of Profile. Redesign board 13, 2D — ruled 16 Sep:
 * a coaching student sees their batch and week.
 *
 * Three figures only — the week, the batch size, the start date — counted by
 * coachingSummary (src/lib/app/coaching.ts), which the native app's Profile
 * reads too. Renders nothing for students in no programme.
 */
export default async function CoachingBlock({ uid }: { uid: string }) {
  const c = await coachingSummary(uid);
  if (!c) return null;

  return (
    <div className="pf-coach">
      <div className="k-label pf-coach__label">Your coaching</div>
      <div className="pf-coach__name">{c.name}</div>
      <div className="pf-coach__figures">
        <div>
          <b>{c.week ?? "—"}</b>
          <span>week of {c.weeks}</span>
        </div>
        <div>
          <b>{c.batchSize}</b>
          <span>in your batch</span>
        </div>
        <div>
          <b>{c.startsOn}</b>
          <span>{c.started ? "started" : "starts"}</span>
        </div>
      </div>
      <div className="k-bar pf-coach__bar" aria-hidden="true">
        <span style={{ width: `${c.progress}%`, "--hue": "var(--gold)" } as React.CSSProperties} />
      </div>
      <p className="k-line">Your teacher and your classes are on Home.</p>
    </div>
  );
}

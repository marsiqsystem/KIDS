import Link from "next/link";
import type { Practice, PracticeWeek } from "@/lib/app/record";

/**
 * "Practice since the exam" — the daily loop's own line on My Record.
 *
 * Lifted out of the old record page when that screen became the portal's
 * `<ResultView>`. It is the one thing on this tab the portal knows nothing
 * about: the portal is a published exam result, and this is what the child has
 * done since. It stays below the result rather than inside it, because it is
 * not a mark and must never read like one.
 */
const num = (n: number) => n.toLocaleString("en-IN");

export default function PracticeStrip({ practice }: { practice: Practice }) {
  if (practice.answered === 0) {
    return (
      <section className="rec-card rec-card--quiet">
        <div className="rec-head">
          <span className="rec-head__name">Practice since the exam</span>
        </div>
        <p className="rec-absent__foot">
          Nothing yet. Your daily set is five questions; once you have answered a few, your own
          record appears here.
        </p>
        <Link href="/app" className="app-btn app-btn--outline app-btn--small">
          Start today&rsquo;s set
        </Link>
      </section>
    );
  }

  return (
    <section className="rec-card rec-card--quiet">
      <div className="rec-head">
        <span className="rec-head__name">Practice since the exam</span>
        <span className="rec-head__note">{practice.accuracy}% right first time</span>
      </div>

      {practice.weeks.length > 1 && <Spark weeks={practice.weeks} />}

      <p className="rec-absent__foot">
        Of the {num(practice.answered)} questions the app has put in front of you, you were right at
        first sight on {num(practice.right)}. This is your own record, not a rank — nobody else is in
        this line.
      </p>
    </section>
  );
}

/**
 * The practice line.
 *
 * Drawn from the weeks that exist, with no axis invented to fill a gap: a
 * student who has practised for two weeks gets two points, not five.
 */
function Spark({ weeks }: { weeks: PracticeWeek[] }) {
  const w = 300;
  const h = 64;
  const pad = 8;
  const step = weeks.length > 1 ? (w - pad * 2) / (weeks.length - 1) : 0;
  const y = (pct: number) => pad + (1 - pct / 100) * (h - pad * 2);
  const pts = weeks.map((k, i) => `${pad + i * step},${y(k.pct)}`);

  return (
    <div className="rec-spark">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-hidden="true" preserveAspectRatio="none">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--maroon)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {weeks.map((k, i) => (
          <circle key={k.week} cx={pad + i * step} cy={y(k.pct)} r="3" fill="var(--maroon)" />
        ))}
      </svg>
      <div className="rec-spark__axis">
        {weeks.map((k) => (
          <span key={k.week}>
            {k.label}
            <b>{k.pct}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { setSummary } from "@/lib/app/answer";
import { Ring, Streak } from "@/components/app/kit";

/**
 * The summary. Redesign board 02, 2E — the score is the hero.
 *
 * Counted by setSummary (src/lib/app/answer.ts), which the native app's
 * summary reads too.
 */
export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const student = await requireStudent();
  const summary = await setSummary(student);
  if (!summary) {
    return (
      <div className="app-frame">
        <div className="app-body">
          <p className="k-line">No set today.</p>
          <Link href="/app" className="k-btn k-btn--outline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { rows, correct, streak, supply, newToday, today } = summary;

  return (
    <div className="app-frame">
      <header className="sum-hero">
        <div className="sum-hero__score">
          {correct}
          <span> / {rows.length}</span>
        </div>
        <p className="sum-hero__line">right today</p>
        <div className="k-pips k-pips--small k-pips--on-dark sum-hero__pips">
          {rows.map(({ id, right }, i) => (
            <span key={id} className={`k-pip k-pip--${right === null ? "todo" : right ? "right" : "wrong"}`}>
              {right === null ? (
                <Minus size={16} aria-label={`${i + 1}, not reached`} />
              ) : right ? (
                <Check size={19} aria-label={`${i + 1}, right`} />
              ) : (
                <X size={19} aria-label={`${i + 1}, not this time`} />
              )}
            </span>
          ))}
        </div>
      </header>

      <div className="app-body sum-body">
        <Streak
          days={streak.days}
          best={streak.best}
          week={streak.week}
          today={today}
          note={streak.best > streak.days ? `Best ${streak.best}` : undefined}
          showWeek={false}
        />

        <div className="k-card">
          <div className="k-label">Coming back</div>
          <ul className="sum-back">
            {rows.map(({ id, chapter, hue, right, days }) => {
              return (
                <li key={id}>
                  <span className="sum-back__dot" style={{ background: hue }} />
                  <span className="sum-back__name" title={chapter}>
                    {chapter}
                  </span>
                  {right !== null ? (
                    <span className={`k-chip ${right ? "k-chip--grey" : "k-chip--again"}`}>
                      {days} day{days === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="k-chip k-chip--line">Not reached</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {supply.total > 0 ? (
          <div className="k-card home-supply">
            <Ring value={supply.seen} total={supply.total} small />
            <div>
              <p className="k-h">
                Seen {supply.seen} of {supply.total}
              </p>
              {newToday > 0 ? <p className="k-line">+{newToday} today</p> : null}
            </div>
          </div>
        ) : null}

        <div className="sum-acts">
          <Link href="/app/learn" className="k-btn">
            Practise a chapter
          </Link>
          <Link href="/app" className="k-btn k-btn--quiet sum-home">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

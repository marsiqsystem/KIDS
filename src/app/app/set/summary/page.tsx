import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { loopState, answersFor, streakFor, istToday } from "@/lib/app/loop";
import { chapterOf, sectionOf } from "@/lib/app/bank";
import { subjectHue } from "@/lib/app/subjects";
import { Ring, Streak } from "@/components/app/kit";

/**
 * The summary. Redesign board 02, 2E — the score is the hero.
 *
 * "Coming back" is read from the schedule that was actually written when each
 * answer was recorded, not recomputed here. If the two ever disagreed, the
 * student would have been told one thing and the app would do another. A
 * question not reached is not counted against anyone — it is still unseen.
 */
export const dynamic = "force-dynamic";

const istDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

export default async function SummaryPage() {
  const student = await requireStudent();
  const state = await loopState(student);
  if (!state.set) {
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

  const [answers, streak] = await Promise.all([answersFor(student.uid), streakFor(student.uid)]);
  const today = istToday();
  const rows = state.set.questionIds.map((id) => {
    const row = answers.get(id) ?? null;
    return { id, row: row && istDate(row.last_answered_at) === today ? row : null };
  });
  const correct = rows.filter((r) => r.row?.was_correct).length;
  const { supply } = state;
  const newToday = [...answers.values()].filter((a) => istDate(a.first_seen_at) === today).length;

  return (
    <div className="app-frame">
      <header className="sum-hero">
        <div className="sum-hero__score">
          {correct}
          <span> / {rows.length}</span>
        </div>
        <p className="sum-hero__line">right today</p>
        <div className="k-pips k-pips--small k-pips--on-dark sum-hero__pips">
          {rows.map(({ id, row }, i) => (
            <span key={id} className={`k-pip k-pip--${!row ? "todo" : row.was_correct ? "right" : "wrong"}`}>
              {!row ? (
                <Minus size={16} aria-label={`${i + 1}, not reached`} />
              ) : row.was_correct ? (
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
            {rows.map(({ id, row }) => {
              const chapter = chapterOf(id) ?? sectionOf(id) ?? "Question";
              return (
                <li key={id}>
                  <span className="sum-back__dot" style={{ background: subjectHue(sectionOf(id) ?? "") }} />
                  <span className="sum-back__name" title={chapter}>
                    {chapter}
                  </span>
                  {row ? (
                    <span className={`k-chip ${row.was_correct ? "k-chip--grey" : "k-chip--again"}`}>
                      {row.interval_days} day{row.interval_days === 1 ? "" : "s"}
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

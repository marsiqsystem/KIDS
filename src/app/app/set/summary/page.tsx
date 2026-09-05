import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { loopState, answersFor } from "@/lib/app/loop";
import { chapterOf } from "@/lib/app/bank";

/**
 * The summary. Design 3e — score first, then the truth about what is left.
 *
 * The "when these come back" list is read from the schedule that was actually
 * written when each answer was recorded, not recomputed here. If the two ever
 * disagreed, the student would have been told one thing and the app would do
 * another.
 */
export const dynamic = "force-dynamic";

const onDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" }).format(
    new Date(`${iso}T06:00:00Z`),
  );

export default async function SummaryPage() {
  const student = await requireStudent();
  const state = await loopState(student);
  if (!state.set) {
    return (
      <div className="app-frame">
        <div className="app-body">
          <p className="app-hint">There is no set to summarise today.</p>
          <Link href="/app" className="app-btn app-btn--outline">Back to home</Link>
        </div>
      </div>
    );
  }

  const answers = await answersFor(student.uid);
  const rows = state.set.questionIds.map((id) => ({ id, row: answers.get(id) ?? null }));
  const answered = rows.filter((r) => r.row);
  const correct = answered.filter((r) => r.row!.was_correct).length;
  const { supply } = state;

  return (
    <div className="app-frame">
      <div className="app-body">
        <div className="app-summary__head">
          <span className="app-eyebrow">Set finished · {onDay(state.set.onDate)}</span>
          <div className="app-score">
            <span className="app-score__n">{correct}</span>
            <span className="app-score__of">/ {answered.length} correct</span>
          </div>
          <p className="app-sub">
            {state.set.newCount} new, {state.set.questionIds.length - state.set.newCount} revision
          </p>
        </div>

        <div className="app-card">
          <h3>When these come back</h3>
          {rows.map(({ id, row }, i) => (
            <div key={id} className="app-return">
              <span className="app-return__n">{i + 1}</span>
              <span className="app-return__what">
                {chapterOf(id) ?? "This question"}
                <span className="app-return__how">
                  {!row ? "not reached" : row.was_correct ? "right" : "wrong"}
                </span>
              </span>
              <span className="app-return__when">
                {row ? `in ${row.interval_days} days` : "still unseen"}
              </span>
            </div>
          ))}
          <p>
            Questions you did not reach have not been counted against you — they are still unseen.
          </p>
        </div>

        <div className="app-supply">
          <div className="app-supply__head">
            <span>Questions in your subjects</span>
            <span className="app-supply__count">{supply.seen} of {supply.total}</span>
          </div>
          <div className="app-supply__bar">
            <span style={{ width: supply.total ? `${Math.round((supply.seen / supply.total) * 100)}%` : "0%" }} />
          </div>
          <p className="app-supply__note">
            {supply.unseen === 0
              ? `You have seen every question in your subjects. From here the set is revision.`
              : `${supply.unseen} you have never seen.`}
          </p>
        </div>

        <Link href="/app" className="app-btn">Back to home</Link>
      </div>
    </div>
  );
}

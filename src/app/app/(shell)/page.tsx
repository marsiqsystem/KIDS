import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { firstName } from "@/lib/exam/portal-auth";
import { loopState, streakFor, answersFor, istToday } from "@/lib/app/loop";
import { unreadCount } from "@/lib/app/notices";
import NoticeBell from "@/components/app/NoticeBell";
import NextClass from "@/components/app/NextClass";
import "../notices.css";
import "./class/class.css";

/**
 * Home. Design 3b, and 3c's end states.
 *
 * Every number here is counted at request time from the question bank and this
 * student's own answers. There is not a literal on this page — the design's
 * "31 of 45" and "about seven more days" are its arithmetic, not its data.
 */
export const dynamic = "force-dynamic";

/** "Good morning" by the clock in Kolkata, not the server's. */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const dayName = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "narrow" }).format(
    new Date(`${iso}T06:00:00Z`),
  );

const onDay = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" }).format(date);

export default async function HomePage() {
  const student = await requireStudent();
  const state = await loopState(student);
  // After loopState, never beside it: loopState is what mints today's set, and
  // the bell counts a set that exists rather than causing one to.
  const unread = await unreadCount(student);

  // Nothing chosen yet: the chooser is the main thing on this screen — but not
  // the ONLY thing. A class the student is expected at outranks picking
  // practice subjects, and every child starts here: on the first morning of a
  // coaching programme nobody has chosen anything yet, so a card rendered only
  // in the branch below would be invisible to the whole batch on the one day it
  // matters most. NextClass renders nothing when there is no class, so it costs
  // this screen nothing the rest of the time.
  if (state.needsSubjects) {
    return (
      <>
        <div className="not-head">
          <h1 className="app-h1">Hello, {firstName(student.name)}</h1>
          <NoticeBell unread={unread} />
        </div>

        <NextClass uid={student.uid} />

        <div className="app-soon">
          <h2>Choose what to practise</h2>
          <p>
            Your daily set is five questions drawn from the subjects you pick. Choose them once and
            the app takes it from there.
          </p>
          <Link href="/app/subjects" className="app-btn">
            Choose my subjects
          </Link>
        </div>
      </>
    );
  }

  const [streak, answers] = await Promise.all([streakFor(student.uid), answersFor(student.uid)]);
  const { supply, set } = state;

  // "The three you are seeing again were wrong on 12, 18 and 21 August."
  const wrongDates = (set?.questionIds ?? [])
    .map((id) => answers.get(id))
    // Untouched since the set was built, so last_answered_at really is the day
    // they last got it wrong — not five minutes ago.
    .filter((a) => a && !a.was_correct && set && a.last_answered_at.getTime() < set.builtAt.getTime())
    .map((a) => onDay(a!.last_answered_at));

  const done = set ? set.answered >= set.questionIds.length : false;
  const revision = set ? set.questionIds.length - set.newCount : 0;

  // Was this question already familiar when the set was built? Answering it
  // just now must not turn its own chip from New into Again — the set's
  // composition is fixed at build time, and the line above the chips says so.
  const wasRevision = (id: string) => {
    const row = answers.get(id);
    return !!row && !!set && row.first_seen_at.getTime() < set.builtAt.getTime();
  };

  return (
    <>
      <div className="not-head">
        <div>
          <h1 className="app-h1">
            {greeting()}, {firstName(student.name)}
          </h1>
          <p className="app-sub">
            Class {student.class}{" · "}{state.sections.join(", ")}
          </p>
        </div>
        <NoticeBell unread={unread} />
      </div>

      <NextClass uid={student.uid} />

      {streak.days > 0 || streak.week.some((d) => d.done) ? (
        <div className="app-streak">
          <div className="app-streak__count">
            <span className="app-streak__n">{streak.days}</span>
            <span className="app-streak__label">
              day{streak.days === 1 ? "" : "s"} in a row
            </span>
          </div>
          <div className="app-streak__week" aria-label="This week">
            {streak.week.map((d) => (
              <span
                key={d.date}
                className={`app-chip${d.done ? " app-chip--on" : ""}${d.date === istToday() ? " app-chip--today" : ""}`}
                title={d.date}
              >
                {dayName(d.date)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {set ? (
        <div className="app-set">
          <div className="app-set__head">
            <span className="app-set__title">Today&rsquo;s set</span>
            <span className="app-set__meta">{set.questionIds.length} questions</span>
          </div>

          <p className="app-set__line">
            {set.newCount === 0
              ? `${set.questionIds.length} questions, all revision`
              : `${set.questionIds.length} questions — ${set.newCount} new, ${revision} revision`}
          </p>

          <div className="app-set__chips">
            {set.questionIds.map((id, i) => (
              <span
                key={id}
                className={`app-tag${wasRevision(id) ? " app-tag--again" : " app-tag--new"}`}
              >
                {wasRevision(id) ? "Again" : "New"}
                <span className="app-sr">{` question ${i + 1}`}</span>
              </span>
            ))}
          </div>

          {wrongDates.length > 0 && (
            <p className="app-set__note">
              {wrongDates.length === 1
                ? `The one you are seeing again was wrong on ${wrongDates[0]}.`
                : `The ${wrongDates.length} you are seeing again were wrong on ${wrongDates
                    .slice(0, -1)
                    .join(", ")} and ${wrongDates[wrongDates.length - 1]}.`}
            </p>
          )}

          {done ? (
            <>
              <p className="app-set__note">You have finished today&rsquo;s set. Come back tomorrow.</p>
              <Link href="/app/set/summary" className="app-btn app-btn--outline">
                See how it went
              </Link>
            </>
          ) : (
            <Link href="/app/set" className="app-btn">
              {set.answered > 0
                ? `Carry on — ${set.questionIds.length - set.answered} left`
                : "Start"}
            </Link>
          )}
        </div>
      ) : (
        <div className="app-soon">
          <h2>Nothing to practise today</h2>
          <p>
            There are no questions in {state.sections.join(", ")} that the app can put in front of you
            right now. Adding a subject would give it more to work with.
          </p>
          <Link href="/app/subjects" className="app-btn app-btn--outline">
            Add another subject
          </Link>
        </div>
      )}

      <div className="app-supply">
        <div className="app-supply__head">
          <span>Questions in your subjects</span>
          <span className="app-supply__count">
            {supply.seen} of {supply.total}
          </span>
        </div>
        <div className="app-supply__bar">
          <span
            style={{ width: supply.total ? `${Math.round((supply.seen / supply.total) * 100)}%` : "0%" }}
          />
        </div>
        <p className="app-supply__note">
          {supply.unseen === 0 ? (
            <>
              You have now seen all {supply.total} questions in your subjects. From here the set is
              revision — the ones you got wrong come back first, and answering them right pushes them
              further away.
            </>
          ) : (
            <>
              You have seen {supply.seen}. There are <b>{supply.unseen} you have never seen</b>
              {supply.daysOfNew > 0 ? ` — about ${supply.daysOfNew} more day${supply.daysOfNew === 1 ? "" : "s"} of new questions.` : "."}
            </>
          )}
        </p>
        {supply.unseen === 0 && (
          <Link href="/app/subjects" className="app-btn app-btn--outline app-btn--small">
            Add another subject
          </Link>
        )}
      </div>
    </>
  );
}

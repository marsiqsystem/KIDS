import Link from "next/link";
import { Check, CheckCheck, ChevronRight, Lock, RotateCcw, Sparkle, X } from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { firstName } from "@/lib/exam/portal-auth";
import {
  loopState,
  streakFor,
  answersFor,
  istToday,
  offerSections,
  NEW_PER_DAY,
} from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import { unreadCount } from "@/lib/app/notices";
import { subjectShort } from "@/lib/app/subjects";
import NextClass from "@/components/app/NextClass";
import TheDay from "@/components/app/TheDay";
import DayLate from "@/components/app/DayLate";
import DayAway from "@/components/app/DayAway";
import SubjectChooser from "@/components/app/SubjectChooser";
import NoStream from "@/components/app/NoStream";
import Sheet from "@/components/app/Sheet";
import { MidnightCountdown } from "@/components/app/Clock";
import { Hero, Ring, Streak, Celebrate } from "@/components/app/kit";
import { dayFor } from "@/lib/app/day";
import { roomFor } from "@/lib/app/room";
import "../notices.css";
import "./class/class.css";
import "./day.css";

/**
 * Home. Redesign board 02 — five states, one primary action at a time.
 *
 * Every number here is counted at request time from the question bank and this
 * student's own answers. There is not a literal on this page — the board's
 * "12 of 45" and "Best 11" are its arithmetic, not its data.
 *
 * Not drawn here, on purpose: the stars line under "Five done". Stars are a
 * Design proposal awaiting a ruling, and a number that is not ruled is not
 * shown.
 */
export const dynamic = "force-dynamic";

/** "Good morning" by the clock in Kolkata, not the server's. */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const onDay = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" }).format(date);

const istDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

export default async function HomePage() {
  const student = await requireStudent();

  /**
   * For the 65 on the coaching programme, Home IS the day — ruled 11 Sep. One
   * lookup, null for everyone else; everything after it is the ordinary Home.
   */
  const day = await dayFor(student);
  if (day) {
    if (day.shape === "away" || day.shape === "late") {
      const { days } = await streakFor(student.uid);
      return day.shape === "away" ? <DayAway day={day} streak={days} /> : <DayLate day={day} streak={days} />;
    }
    const room = await roomFor(student.uid);
    return (
      <TheDay day={day} name={firstName(student.name)} greeting={greeting()} present={room?.present ?? 0} />
    );
  }

  const state = await loopState(student);
  // After loopState, never beside it: loopState is what mints today's set, and
  // the bell counts a set that exists rather than causing one to.
  const unread = await unreadCount(student);
  const name = firstName(student.name);

  // 1A — nothing chosen. The whole screen is the invitation. A class the
  // student is expected at still outranks it, so NextClass sits on top.
  if (state.needsSubjects) {
    const noStream = (student.class === "XI" || student.class === "XII") && !student.stream;
    const sections = noStream ? [] : offerSections(student);
    const unseenBySection: Record<string, number> = {};
    for (const s of sections) unseenBySection[s.section] = s.questions;

    return (
      <>
        <Hero eyebrow={greeting()} title={name} chips={[{ label: `Class ${student.class}` }]} unread={unread} />
        <NextClass uid={student.uid} />
        {noStream ? (
          <NoStream cls={student.class} />
        ) : (
          <>
            <div className="home-invite">
              <h2 className="home-invite__title">Pick your subjects</h2>
              <p className="k-line">Three is a good number.</p>
            </div>
            <SubjectChooser
              face="tiles"
              sections={sections}
              chosen={[]}
              perDay={NEW_PER_DAY}
              unseenBySection={unseenBySection}
            />
          </>
        )}
      </>
    );
  }

  const [streak, answers] = await Promise.all([streakFor(student.uid), answersFor(student.uid)]);
  const { supply, set } = state;
  const today = istToday();

  const allSeen = supply.total > 0 && supply.unseen === 0;
  const chips = [
    { label: `Class ${student.class}` },
    ...(allSeen
      ? [{ label: "★ All revision", gold: true }]
      : state.sections.length <= 3
        ? state.sections.map((s) => ({ label: subjectShort(s) }))
        : [{ label: `${state.sections.length} subjects` }]),
  ];

  // Was this question already familiar when the set was built? Answering it
  // just now must not turn its pip from New into Again — the set's composition
  // is fixed at build time.
  const wasRevision = (id: string) => {
    const row = answers.get(id);
    return !!row && !!set && row.first_seen_at.getTime() < set.builtAt.getTime();
  };

  // Answered today, and how — the pip carries its verdict once it lands.
  const verdict = (id: string): "right" | "wrong" | null => {
    const row = answers.get(id);
    if (!row || istDate(row.last_answered_at) !== today) return null;
    return row.was_correct ? "right" : "wrong";
  };

  // The ones coming back because they were wrong before, with the day.
  const missed = (set?.questionIds ?? [])
    .map((id) => answers.get(id))
    .filter((a) => a && !a.was_correct && set && a.last_answered_at.getTime() < set.builtAt.getTime())
    .map((a) => onDay(a!.last_answered_at));

  const done = set ? set.answered >= set.questionIds.length : false;
  const started = set ? set.answered > 0 : false;
  const left = set ? set.questionIds.length - set.answered : 0;
  const revision = set ? set.questionIds.length - set.newCount : 0;

  // 1E — what adding a subject would bring, counted from the unchosen ones.
  let adds: { section: string; n: number }[] = [];
  if (allSeen) {
    adds = offerSections(student)
      .filter((s) => !state.sections.includes(s.section))
      .map((s) => ({
        section: s.section,
        n: poolFor(student.class, student.stream, student.medium, [s.section]).filter((id) => !answers.has(id))
          .length,
      }))
      .filter((a) => a.n > 0)
      .slice(0, 2);
  }

  return (
    <>
      <Hero eyebrow={greeting()} title={name} chips={done ? undefined : chips} unread={unread} />

      <NextClass uid={student.uid} />

      {!set ? (
        // Nothing the loop can put in front of them in these subjects.
        <div className="k-card k-card--dashed k-card--center home-more">
          <div className="k-empty__mark k-empty__mark--teal">
            <CheckCheck size={34} strokeWidth={1.9} aria-hidden="true" />
          </div>
          <p className="k-h">Nothing to practise today</p>
          <Link href="/app/subjects" className="k-btn k-btn--outline k-btn--inline">
            Add a subject
          </Link>
        </div>
      ) : done ? (
        <>
          {/* 1D — done. The crest pops once, then stillness. */}
          <div className="k-card k-card--maroon k-card--center home-done">
            <Celebrate />
            <h2 className="home-done__title">Five done</h2>
            <div className="k-pips k-pips--small k-pips--on-dark home-done__pips">
              {set.questionIds.map((id, i) => {
                const v = verdict(id);
                return (
                  <span key={id} className={`k-pip k-pip--${v ?? "todo"}`}>
                    {v === "right" ? (
                      <Check size={18} aria-label={`Question ${i + 1} right`} />
                    ) : v === "wrong" ? (
                      <X size={18} aria-label={`Question ${i + 1} wrong`} />
                    ) : (
                      i + 1
                    )}
                  </span>
                );
              })}
            </div>
            <Link href="/app/set/summary" className="k-btn k-btn--gold">
              See how it went
            </Link>
          </div>

          <Streak days={streak.days} best={streak.best} week={streak.week} today={today} showWeek={false} />

          <div className="k-card k-card--center">
            <div className="home-locked" aria-hidden="true">
              <span>
                <Lock size={15} />
              </span>
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className="k-h">Tomorrow&rsquo;s five</p>
            <div className="home-countdown">
              <MidnightCountdown />
            </div>
            <p className="k-line">Opens at midnight</p>
          </div>

          <Link href="/app/learn" className="k-row">
            <span className="k-row__text">
              <span className="k-row__title">Practise a chapter</span>
            </span>
            <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
          </Link>
        </>
      ) : (
        <>
          {/* 1B / 1C / 1E — today's five. */}
          <div className={`k-card k-card--lead${started ? " k-card--live" : ""}`}>
            <div className="k-card__top">
              <h2 className="k-card__title">{started ? "Carry on" : "Today’s five"}</h2>
              {started ? (
                <span className="k-card__meta k-card__meta--maroon">{left} left</span>
              ) : (
                <span className={`k-card__meta${set.newCount === 0 ? " k-card__meta--maroon" : ""}`}>
                  {set.newCount === 0
                    ? `${set.questionIds.length} again`
                    : revision === 0
                      ? `${set.newCount} new`
                      : `${set.newCount} new · ${revision} again`}
                </span>
              )}
            </div>

            <div className="k-pips" aria-label="Today's questions">
              {set.questionIds.map((id, i) => {
                const v = verdict(id);
                const again = wasRevision(id);
                const here = started && !v && set.questionIds.slice(0, i).every((q) => verdict(q));
                const kind = v ?? (here ? "here" : started ? "todo" : again ? "again" : "new");
                return (
                  <span key={id} className={`k-pip k-pip--${kind}`}>
                    {kind === "right" ? (
                      <Check size={22} aria-label={`${i + 1}, right`} />
                    ) : kind === "wrong" ? (
                      <X size={22} aria-label={`${i + 1}, not this time`} />
                    ) : kind === "new" ? (
                      <Sparkle size={20} aria-label={`${i + 1}, new`} />
                    ) : kind === "again" ? (
                      <RotateCcw size={19} aria-label={`${i + 1}, again`} />
                    ) : (
                      i + 1
                    )}
                  </span>
                );
              })}
            </div>

            {!started && missed.length > 0 ? (
              <Sheet
                trigger={
                  <>
                    {missed.length} you missed before <ChevronRight size={15} aria-hidden="true" />
                  </>
                }
                triggerClass="home-missed"
                title={`${missed.length} coming back`}
              >
                <p className="k-line">Wrong last time, on:</p>
                <ul className="home-dates">
                  {missed.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Sheet>
            ) : (
              <div className="home-gap" />
            )}

            <Link href="/app/set" className="k-btn">
              {started ? "Carry on" : "Start"}
            </Link>
          </div>

          {started ? (
            <Streak
              days={streak.days}
              best={streak.best}
              week={streak.week}
              today={today}
              note="Finish to keep it"
              showWeek={false}
            />
          ) : streak.days > 0 || streak.week.some((d) => d.done) ? (
            <Streak days={streak.days} best={streak.best} week={streak.week} today={today} />
          ) : null}
        </>
      )}

      {/* The supply meter — always on Home. */}
      {supply.total > 0 && !done ? (
        <div className="k-card home-supply">
          <Ring value={supply.seen} total={supply.total} label={`Seen ${supply.seen} of ${supply.total}`} />
          <div>
            <p className="k-h">{allSeen ? "Every one seen" : "Seen so far"}</p>
            <p className="k-line">
              {allSeen ? "Now it is all revision." : `${supply.unseen} you have never seen.`}
            </p>
          </div>
        </div>
      ) : null}

      {allSeen && !done ? (
        <div className="k-card k-card--dashed k-card--center home-more">
          <div className="k-empty__mark k-empty__mark--teal">
            <CheckCheck size={34} strokeWidth={1.9} aria-hidden="true" />
          </div>
          <p className="k-h">Want more new ones?</p>
          <Link href="/app/subjects" className="k-btn k-btn--outline k-btn--inline">
            Add a subject
          </Link>
          {adds.length > 0 ? (
            <p className="k-line">
              {adds.map((a, i) => (
                <span key={a.section}>
                  {i > 0 ? " · " : ""}
                  {subjectShort(a.section)} adds <b>+{a.n}</b>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

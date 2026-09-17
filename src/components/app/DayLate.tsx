import Link from "next/link";
import { Check, Circle } from "lucide-react";
import type { Day } from "@/lib/app/day";

/**
 * Past wind-down, and something did not happen. Redesign board 13, 2A.
 *
 * **Order is the whole design:** what you did, then what you did not, then a way
 * back. Missed blocks are hollow grey circles — no red, no cross, no
 * percentage. "Five of seven" is a fact, not a grade.
 *
 * The board's last line says "Someone at KIDS will notice" and names nobody.
 * The addendum's rule is ours and it is more exact: a batch with a teacher
 * assigned may name that teacher; with nobody assigned, the screen says nothing
 * about anyone noticing. And what the teacher can do is stated as what exists —
 * every class keeps a register — never that a person watched.
 */
export default function DayLate({ day }: { day: Day; streak: number }) {
  const missed = day.blocks.filter((b) => b.status === "missed");
  const kept = day.blocks.filter((b) => b.status === "done");
  const missedClass = missed.some((b) => b.kind === "class");

  return (
    <div className="late">
      <div className="late__head">
        <span className="late__when">
          Week {day.programme.week} of {day.programme.weeks} · {longDate(day.date)}
        </span>
        <h1 className="late__title">Today is done</h1>
      </div>

      {kept.length > 0 ? (
        <section className="late__card">
          <div className="k-label late__label">What you did</div>
          <ul className="late__list">
            {kept.map((b) => (
              <li key={b.kind}>
                <span className="late__tick" aria-hidden="true">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>
                  {b.label}
                  {b.detail ? <span className="late__detail"> · {b.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="late__fact">
            {spell(kept.length)} of {day.countable}.
          </p>
        </section>
      ) : null}

      <section className="late__card late__card--quiet">
        <div className="k-label late__label">What you did not</div>
        <ul className="late__list">
          {missed.map((b) => (
            <li key={b.kind}>
              <Circle size={20} className="late__hollow" aria-hidden="true" />
              <span>{b.label}</span>
            </li>
          ))}
        </ul>
        {missedClass && day.recording ? (
          <a className="k-btn k-btn--outline k-btn--small late__watch" href={day.recording} target="_blank" rel="noreferrer">
            Watch the class back
          </a>
        ) : null}
        <p className="late__fact">That is all. Nothing else was expected today.</p>
      </section>

      <p className="late__tomorrow">
        Tomorrow starts at <strong>5:30</strong>.
        {day.teacher ? ` ${firstTwo(day.teacher)} keeps the class register.` : ""}
      </p>

      <Link href="/app/notices" className="k-btn k-btn--quiet late__more">
        Notices
      </Link>
    </div>
  );
}

const WORDS = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const spell = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/** "Mohammad Iqbal Ansari" → "Mohammad Iqbal". A surname is for a register. */
function firstTwo(name: string): string {
  return name.split(/\s+/).slice(0, 2).join(" ");
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long" }).format(
    new Date(`${iso}T06:00:00Z`),
  );
}

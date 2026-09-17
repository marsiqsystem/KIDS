import Link from "next/link";
import Image from "next/image";
import { Check, Users } from "lucide-react";
import type { Day, DayBlock } from "@/lib/app/day";
import DayAction from "@/components/app/DayAction";

/**
 * The Day. Redesign board 12, 1A.
 *
 * For the 65 on the coaching programme this IS Home — ruled, not a sixth tab.
 * One spine, times down the left, and **exactly one card open**: the block
 * that is now. The time column is the constant that makes it a day rather than
 * a task list. School is dashed and counts nothing. Homework sits on the spine
 * with a Done tap and no hand-in button, because that loop does not exist.
 */
export default function TheDay({
  day,
  name,
  greeting,
  present,
}: {
  day: Day;
  name: string;
  greeting: string;
  /** How many of the batch are in the room now, for the line at the foot. */
  present: number;
}) {
  return (
    <>
      <header className="k-hero day-hero">
        <Image src="/kids-icon.png" alt="" width={112} height={112} className="k-hero__crest" aria-hidden="true" />
        <div className="k-hero__row">
          <div className="k-hero__main">
            <div className="k-hero__eyebrow">
              Week {day.programme.week} of {day.programme.weeks} · {weekday(day.date)}
            </div>
            <h1 className="k-hero__title">
              {greeting}, {name}
            </h1>
          </div>
          <div className="day-count" aria-label={`${day.done} of ${day.countable} done`}>
            <b>
              {day.done}
              <span>/{day.countable}</span>
            </b>
            done
          </div>
        </div>
      </header>

      <ol className="day-spine">
        {day.blocks.map((b) => (
          <li key={b.kind} className={`day-block day-block--${b.status} day-block--${b.kind}`}>
            <span className="day-block__time">{b.at}</span>
            <span className="day-block__dot" aria-hidden="true">
              {b.status === "done" ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <div className="day-block__body">{renderBlock(b)}</div>
          </li>
        ))}
      </ol>

      {/* The one line on the day that mentions anybody else. Hidden when the
          student is alone: a count of one reads as an empty building. */}
      {present > 1 ? (
        <Link href="/app/room" className="k-row day-room">
          <span className="k-row__icon" aria-hidden="true">
            <Users size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-row__title">{present} of your batch are working</span>
            <span className="k-row__line">See the room</span>
          </span>
        </Link>
      ) : (
        <Link href="/app/room" className="day-roomlink">
          The room
        </Link>
      )}
    </>
  );
}

function renderBlock(b: DayBlock) {
  if (b.kind === "school") {
    return (
      <>
        <span className="day-block__label">School</span>
        <span className="day-block__sub">Nothing to do here</span>
      </>
    );
  }

  /* The one open card. */
  if (b.status === "now") {
    return (
      <div className="day-card">
        <span className="day-card__label">{b.label}</span>
        {b.subtitle ? <span className="day-block__sub">{b.subtitle}</span> : null}
        {b.action ? (
          b.href ? (
            <Link href={b.href} className="k-btn">
              {b.action}
            </Link>
          ) : (
            // Homework is marked done like revision — a tap, never a hand-in:
            // the hand-in loop does not exist.
            <DayAction kind={b.kind} label={b.kind === "homework" ? "Done" : b.action} />
          )
        ) : null}
      </div>
    );
  }

  return (
    <>
      <span className="day-block__label">{b.label}</span>
      {b.detail ? <span className="day-block__sub">{b.detail}</span> : b.subtitle ? <span className="day-block__sub">{b.subtitle}</span> : null}
      {/* A late wake keeps its button: tapping "I'm up" IS starting the day. */}
      {b.status === "missed" && b.action ? (
        <div className="day-block__late">
          <DayAction kind={b.kind} label={b.action} small />
        </div>
      ) : null}
    </>
  );
}

/** "Tuesday", by the clock in Kolkata rather than the server's. */
function weekday(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long" }).format(
    new Date(`${iso}T06:00:00Z`),
  );
}

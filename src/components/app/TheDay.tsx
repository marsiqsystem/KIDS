import Link from "next/link";
import type { Day, DayBlock } from "@/lib/app/day";
import DayAction from "@/components/app/DayAction";

/**
 * The Day — Design turn 8, part one, screens 8a-i to 8a-iii.
 *
 * For the 65 on the coaching programme this IS Home. Not a sixth tab: a sixth
 * tab is paid for by all 9,714 students so that 65 can use it, and it would
 * make coaching a place you visit rather than a day you are inside.
 *
 * The shape is the argument. One vertical spine, times down the left, and
 * **exactly one card open** — the block that is now. Everything else is a line
 * of text. Nine cards would be nine things asking to be tapped; a day is one
 * thing you are in the middle of.
 */
export default function TheDay({ day, name, greeting }: { day: Day; name: string; greeting: string }) {
  return (
    <div className="day">
      <div className="day__head">
        <div>
          <span className="day__when">
            {weekday(day.date)} · week {day.programme.week} of {day.programme.weeks}
          </span>
          <h1 className="day__greet">
            {greeting}, {name}
          </h1>
          <p className="day__left">{day.programme.daysLeft} days left</p>
        </div>
      </div>

      <ol className="day__spine">
        {day.blocks.map((b) => (
          <li key={b.kind} className={`day__block day__block--${b.status} day__block--${b.kind}`}>
            <span className="day__dot" aria-hidden />
            <span className="day__time">{b.at}</span>
            <div>{renderBlock(b)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function renderBlock(b: DayBlock) {
  /* School. Carried, never tracked — one thing to read on the way in, and a
     plain sentence saying nothing here is counted. The lunchtime question
     Design drew is not here: Umar's children do not take phones to school. */
  if (b.kind === "school") {
    return (
      <>
        <span className="day__label">School</span>
        <ul className="day__carry">
          <li>One idea to read on the way in</li>
        </ul>
        <p className="day__quiet">Nothing rings during school, and nothing here is counted.</p>
      </>
    );
  }

  /* The one open card. */
  if (b.status === "now") {
    return (
      <div className="day__card">
        <span className="day__label">{b.label}</span>
        {b.subtitle ? <p>{b.subtitle}</p> : null}
        {b.action ? (
          b.href ? (
            <Link href={b.href} className="app-btn">
              {b.action}
            </Link>
          ) : (
            <DayAction kind={b.kind} label={b.action} />
          )
        ) : null}
      </div>
    );
  }

  return (
    <>
      <span className="day__label">{b.label}</span>
      {b.detail ? (
        <>
          {" "}
          <span className="day__said">· {b.detail}</span>
        </>
      ) : null}
      {/* A late wake keeps its button. Tapping "I'm up" IS the act of starting
          the day, so taking it away at 5:31 would mean only the children who
          were already awake to hear the alarm could ever claim it. */}
      {b.status === "missed" && b.action ? (
        <div className="day__late">
          <DayAction kind={b.kind} label={b.action} small />
        </div>
      ) : null}
    </>
  );
}

/** "Monday", by the clock in Kolkata rather than the server's. */
function weekday(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(new Date(`${iso}T06:00:00Z`));
}

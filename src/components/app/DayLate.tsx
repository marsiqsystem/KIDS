import Link from "next/link";
import type { Day } from "@/lib/app/day";

/**
 * Eleven at night, and something did not happen. Design 8n.
 *
 * **The order is the whole design**: what you did, then plainly what you did
 * not, then the fact that a person can see it, and only then a way back.
 *
 * No red. No crosses. No lost streak. No encouragement — a child who missed
 * their class at eleven at night does not need to be told they can do it. The
 * screen is dark because it is night and the screen should know that.
 *
 * ## Where this departs from the drawing, on purpose
 *
 * Design wrote "Sujata Ma'am knows you were not there — she saw it during the
 * class, not from a report afterwards." The second half of that sentence is a
 * promise about a screen that does not exist: the teacher's dashboard with its
 * quiet list is turn 8 PART TWO and is not built. What IS true today is that
 * every class keeps a register of who joined and the teacher can open it.
 *
 * So the screen says that, and not a word more. A child told that a person saw
 * them in the moment, who then finds out nobody did, has been lied to by an
 * app about a relationship — which is the one thing this programme is selling.
 * When the quiet list is built, this paragraph gets its stronger sentence back.
 */
export default function DayLate({ day, streak }: { day: Day; streak: number }) {
  const missed = day.blocks.filter((b) => b.status === "missed");
  const kept = day.blocks.filter((b) => b.status === "done");
  const missedClass = missed.find((b) => b.kind === "class");

  return (
    <div className="day day--late">
      <div className="day__head">
        <div>
          <span className="day__when">{longDate(day.date)}</span>
          <h1 className="day__greet">
            {missed.length === 1
              ? "One thing did not happen today"
              : `${spell(missed.length)} things did not happen today`}
          </h1>
          <p className="day__left">
            {list(missed.map((b) => theName(b.label)))}. Everything else you did.
          </p>
        </div>
      </div>

      {kept.length > 0 ? (
        <section className="late__panel">
          <h2>What you did do</h2>
          <ul className="late__list">
            {kept.map((b) => (
              <li key={b.kind}>
                {b.label}
                {b.detail ? <span className="day__said"> · {b.detail}</span> : null}
              </li>
            ))}
          </ul>
          <p className="late__note">
            {streak > 0 ? (
              <>
                Your {spell(streak)} day{streak === 1 ? "" : "s"} are intact.{" "}
              </>
            ) : null}
            {kept.length} of the {day.countable} blocks is a day, not a failure.
          </p>
        </section>
      ) : null}

      <section className="late__panel">
        <h2>{missed.length === 1 ? "The one that did not" : "The ones that did not"}</h2>
        <ul className="late__list late__list--plain">
          {missed.map((b) => (
            <li key={b.kind}>
              <strong>{b.label}</strong> · {b.at}
              {b.kind === "class" ? (
                <p>
                  {day.recording
                    ? "Your teacher has posted the recording. Watch it tomorrow morning."
                    : "Your teacher records the class and posts it afterwards. It will be here when she does."}
                </p>
              ) : null}
              {b.kind === "homework" ? (
                <p>Still due, and nothing has changed about that.</p>
              ) : null}
            </li>
          ))}
        </ul>
        {missedClass && day.recording ? (
          <a className="app-btn app-btn--outline" href={day.recording} target="_blank" rel="noreferrer">
            Watch the class back
          </a>
        ) : null}
      </section>

      {day.teacher ? (
        <section className="late__panel late__panel--person">
          <h2>{firstTwo(day.teacher)} can see this</h2>
          <p>
            Every class keeps a register of who was in it, and she can open it. If it happens again
            she will ask you why — that is the arrangement, and it is not a punishment.
          </p>
        </section>
      ) : null}

      <p className="late__tomorrow">Tomorrow starts at 5:30 whatever happened today.</p>

      <Link href="/app/notices" className="app-btn app-btn--quiet">
        See what else is waiting
      </Link>
    </div>
  );
}

/** "the class", "the homework" — a block named in a sentence. */
function theName(label: string): string {
  const l = label.toLowerCase();
  return l.startsWith("the ") ? l : `the ${l}`;
}

/** "the class and the homework" */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const WORDS = ["no", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const spell = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/** "Mohammad Iqbal Ansari" → "Mohammad Iqbal". A surname is for a register. */
function firstTwo(name: string): string {
  return name.split(/\s+/).slice(0, 2).join(" ");
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T06:00:00Z`));
}

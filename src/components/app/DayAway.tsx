import Link from "next/link";
import type { Day } from "@/lib/app/day";

/**
 * Two days or more without opening it. Design 8n-ii.
 *
 * "Nothing has been taken away from you" is the sentence the screen exists to
 * say. A child who has been absent for two days is already expecting to be
 * told what they have lost, and being met with an accounting of it is how they
 * decide not to come back on the third.
 *
 * **One way in, not a list of six things to catch up on.**
 *
 * ## Where this departs from the drawing, on purpose
 *
 * Design put a written message from the teacher at the top — "You have not been
 * in since Wednesday. Is everything all right at home?" — and it is the best
 * thing on the artboard. It is also not built: there is no way for a teacher to
 * write to one student, and her quiet list is turn 8 part two. Inventing words
 * she never wrote would be the worst possible thing to do on this particular
 * screen, so she is named and the register is described, and that is all.
 *
 * When the doubt box and the quiet list exist, her real sentence goes here and
 * this note comes out.
 */
export default function DayAway({ day, streak }: { day: Day; streak: number }) {
  const classBlock = day.blocks.find((b) => b.kind === "class");
  const hasClassToday = classBlock?.status !== "uncounted";

  return (
    <div className="day day--late">
      <div className="day__head">
        <div>
          <span className="day__when">
            Week {day.programme.week} of {day.programme.weeks}
          </span>
          <h1 className="day__greet">You have been away {spell(day.awayDays)} days</h1>
          <p className="day__left">Nothing has been taken away from you.</p>
        </div>
      </div>

      {day.teacher ? (
        <section className="late__panel late__panel--person">
          <h2>{firstTwo(day.teacher)} takes your batch</h2>
          <p>
            She can see the register for every class. Come to today&rsquo;s, even if you have not
            done the homework.
          </p>
        </section>
      ) : null}

      <section className="late__panel">
        <h2>What is waiting, and what is gone</h2>
        <ul className="late__list late__list--star">
          <li>The class recordings your teacher has posted are all still there.</li>
          <li>Any homework is late, not gone. It can still be sent.</li>
          <li>
            {streak > 0 ? (
              <>
                Your streak stopped at {streak}. It starts again today at 1, and {streak} stays on
                your record as something you did.
              </>
            ) : (
              <>Your streak starts again today at 1.</>
            )}
          </li>
        </ul>
      </section>

      {/* One way in. Today's class if there is one, otherwise the day itself —
          never a list of everything that has piled up. */}
      {hasClassToday && classBlock?.href ? (
        <Link href={classBlock.href} className="app-btn">
          Start with today&rsquo;s {classBlock.at} class
        </Link>
      ) : (
        <Link href="/app/set" className="app-btn">
          Start with today&rsquo;s five questions
        </Link>
      )}

      <p className="late__tomorrow">The day is still there. It starts at 5:30 tomorrow.</p>
    </div>
  );
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const spell = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

function firstTwo(name: string): string {
  return name.split(/\s+/).slice(0, 2).join(" ");
}

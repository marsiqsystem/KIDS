"use client";

import { useState } from "react";
import { chooseSubjectsAction } from "@/app/app/loop-actions";
import type { SectionInfo } from "@/lib/app/bank";

/**
 * Pick the subjects the daily set draws from. Design 4b.
 *
 * Every number here is counted out of `src/data/questions/`: the questions, the
 * chapters, and how many of those chapters have a video a human has approved.
 * Those last two are what the choice actually buys, so they sit on the row
 * before it is chosen rather than being discovered afterwards.
 *
 * Three is the recommendation, not a rule. One subject is fifteen questions —
 * seven days at two a day — and the footer says so plainly instead of refusing.
 * A hard maximum would also make 3c's "Add another subject instead" a lie.
 */
export default function SubjectChooser({
  sections,
  chosen,
  perDay,
  unseenBySection,
}: {
  sections: SectionInfo[];
  chosen: string[];
  perDay: number;
  /** How many questions in each section this student has never seen. */
  unseenBySection: Record<string, number>;
}) {
  const [picked, setPicked] = useState<string[]>(chosen);

  const toggle = (section: string) =>
    setPicked((was) =>
      was.includes(section) ? was.filter((s) => s !== section) : [...was, section],
    );

  const mine = sections.filter((s) => picked.includes(s.section));
  const questions = mine.reduce((sum, s) => sum + s.questions, 0);
  const chapters = mine.reduce((sum, s) => sum + s.chapters, 0);
  const unseen = mine.reduce((sum, s) => sum + (unseenBySection[s.section] ?? s.questions), 0);
  const days = Math.floor(unseen / perDay);

  return (
    <form action={chooseSubjectsAction} className="app-choose">
      {sections.map((s) => {
        const on = picked.includes(s.section);
        // What adding this one would bring that the student has not already
        // met — not its raw size, which would overstate it for a returning user.
        const wouldAdd = unseenBySection[s.section] ?? s.questions;

        return (
          <label key={s.section} className={`app-choice${on ? " app-choice--on" : ""}`}>
            <input
              type="checkbox"
              name="section"
              value={s.section}
              checked={on}
              onChange={() => toggle(s.section)}
            />
            <span className="app-choice__body">
              <span className="app-choice__name">{s.section}</span>
              <span className="app-choice__meta">
                {s.chapters} chapter{s.chapters === 1 ? "" : "s"} · {s.questions} question
                {s.questions === 1 ? "" : "s"} ·{" "}
                {s.videos === 0
                  ? "no video yet"
                  : `${s.videos} ${s.videos === 1 ? "has" : "have"} a video`}
              </span>
            </span>
            {!on && wouldAdd > 0 && <span className="app-choice__adds">+{wouldAdd} new</span>}
            <span className="app-choice__tick" aria-hidden="true">
              {on ? "✓" : ""}
            </span>
          </label>
        );
      })}

      <div className="app-choose__tally" aria-live="polite">
        {picked.length === 0 ? (
          <p>Choose at least one subject. Three is the usual number.</p>
        ) : (
          <>
            <p className="app-choose__total">
              <span>Your daily set can draw from</span>
              <b>
                {questions} question{questions === 1 ? "" : "s"}
              </b>
            </p>
            <p>
              {chapters} chapter{chapters === 1 ? "" : "s"}
              {days > 0
                ? ` · about ${days} day${days === 1 ? "" : "s"} of new questions at ${perDay} a day`
                : " · every set from here is revision"}
            </p>
          </>
        )}
      </div>

      {/* Design 4b's "too few chosen". A warning, never a block — the student
          may have a reason, and the app is not in a position to overrule it. */}
      {picked.length > 0 && picked.length < 3 && (
        <div className="app-card app-card--gold">
          <h3>
            {picked.length === 1 ? "One subject is" : `Two subjects are`} {questions} questions
          </h3>
          <p>
            At {perDay} new questions a day that is {days} day{days === 1 ? "" : "s"}, and after that
            every set is revision. Three subjects is the smallest choice this bank carries
            comfortably — but you can save this and change it any day.
          </p>
        </div>
      )}

      <button type="submit" className="app-btn" disabled={picked.length === 0}>
        {picked.length > 0 && picked.length < 3
          ? `Save anyway — ${picked.length === 1 ? "just" : "only"} ${mine.map((s) => s.section).join(" and ")}`
          : chosen.length
            ? "Save my subjects"
            : "Start practising"}
      </button>
    </form>
  );
}

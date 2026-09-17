"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { chooseSubjectsAction } from "@/app/app/loop-actions";
import type { SectionInfo } from "@/lib/app/bank";
import { subjectHue, subjectInitials, subjectShort } from "@/lib/app/subjects";

/**
 * Pick the subjects the daily set draws from. Redesign board 02, 1A and 2A.
 *
 * Two faces of one control: `tiles` is Home's first visit, where the whole
 * screen is the invitation; `rows` is the chooser page, with the counts each
 * choice buys. Every number is counted out of `src/data/questions/`.
 *
 * Three is the recommendation, not a rule. Fewer shows a gold line and the
 * button says "Save anyway" — a warning, never a block.
 */
export default function SubjectChooser({
  sections,
  chosen,
  perDay,
  unseenBySection,
  face = "rows",
}: {
  sections: SectionInfo[];
  chosen: string[];
  perDay: number;
  /** How many questions in each section this student has never seen. */
  unseenBySection: Record<string, number>;
  face?: "rows" | "tiles";
}) {
  const [picked, setPicked] = useState<string[]>(chosen);
  // Saved subjects first, in the order the page opened with — the list must
  // not reshuffle under the thumb as tiles are toggled.
  const [order] = useState(() => [
    ...sections.filter((s) => chosen.includes(s.section)),
    ...sections.filter((s) => !chosen.includes(s.section)),
  ]);

  const toggle = (section: string) =>
    setPicked((was) => (was.includes(section) ? was.filter((s) => s !== section) : [...was, section]));

  const mine = sections.filter((s) => picked.includes(s.section));
  const questions = mine.reduce((sum, s) => sum + s.questions, 0);
  const unseen = mine.reduce((sum, s) => sum + (unseenBySection[s.section] ?? s.questions), 0);
  const days = Math.floor(unseen / perDay);
  const few = picked.length > 0 && picked.length < 3;

  return (
    <form action={chooseSubjectsAction} className={`sc sc--${face}`}>
      <div className={face === "tiles" ? "sc__tiles" : "sc__rows"}>
        {order.map((s) => {
          const on = picked.includes(s.section);
          const hue = subjectHue(s.section);
          const wouldAdd = unseenBySection[s.section] ?? s.questions;
          return (
            <label
              key={s.section}
              className={`sc__item${on ? " sc__item--on" : ""}`}
              style={{ "--hue": hue } as React.CSSProperties}
            >
              <input
                type="checkbox"
                name="section"
                value={s.section}
                checked={on}
                onChange={() => toggle(s.section)}
              />
              {face === "tiles" ? (
                <>
                  <span className="sc__tiletop">
                    <span className="k-spine" />
                    {on ? <Check size={18} strokeWidth={2.4} className="sc__tick" aria-hidden="true" /> : null}
                  </span>
                  <span>
                    <span className="sc__name">{subjectShort(s.section)}</span>
                    <span className="sc__meta">
                      {s.chapters} ch · {s.questions} q
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="sc__badge" aria-hidden="true">
                    {on ? <Check size={20} strokeWidth={2.4} /> : subjectInitials(s.section)}
                  </span>
                  <span className="sc__body">
                    <span className="sc__name">{s.section}</span>
                    <span className="sc__meta">
                      {s.chapters} chapter{s.chapters === 1 ? "" : "s"} · {s.questions} question
                      {s.questions === 1 ? "" : "s"} · {s.videos} video{s.videos === 1 ? "" : "s"}
                    </span>
                  </span>
                  {!on && wouldAdd > 0 ? <span className="k-chip k-chip--new">+{wouldAdd} new</span> : null}
                </>
              )}
            </label>
          );
        })}
      </div>

      <div className="sc__foot">
        <p className="sc__tally" aria-live="polite">
          {picked.length === 0 ? (
            "Pick at least one"
          ) : (
            <>
              <span>
                <b>{questions}</b> questions
              </span>
              {face === "rows" ? (
                <span>{days > 0 ? `≈ ${days} day${days === 1 ? "" : "s"} of new` : "All revision"}</span>
              ) : (
                <span> · {picked.length} chosen</span>
              )}
            </>
          )}
        </p>
        {few ? (
          <p className="sc__few">
            Three is a good number. {days > 0 ? `This is ${days} day${days === 1 ? "" : "s"} of new.` : ""}
          </p>
        ) : null}
        <button type="submit" className="k-btn" disabled={picked.length === 0}>
          {few ? "Save anyway" : "Save my subjects"}
        </button>
      </div>
    </form>
  );
}

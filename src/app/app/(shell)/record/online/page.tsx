import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { onlinePaper } from "@/lib/app/record";
import "../../../record.css";

/**
 * The online paper, question by question — the second half of design 5a's
 * "See question by question".
 *
 * There is no OMR here and no map: the online paper was answered on a screen,
 * there is no sheet to redraw, and pretending otherwise would invent a form the
 * student never held. What it has instead is what the exam itself recorded —
 * the question, the four options, what they chose and what the key was.
 *
 * The paper is 50 questions and every one of them is rendered on the server:
 * unlike the written paper there are no stored explanations to hold back, so
 * there is nothing to fetch on tap and no reason for this to be interactive.
 */
export const dynamic = "force-dynamic";

const LETTERS = ["A", "B", "C", "D", "E"];

export default async function OnlinePage() {
  const student = await requireStudent();
  const paper = await onlinePaper(student);

  if (paper.state !== "ready" || !paper.sheet) {
    return (
      <>
        <h1 className="app-h1">The online paper</h1>
        <div className="app-soon">
          <h2>{paper.state === "absent" ? "No online paper on file" : "Not published yet"}</h2>
          <p>
            {paper.state === "absent"
              ? "You did not sit the online paper on 19 July, so there is nothing to show. This is not a zero and it is not counted against you anywhere."
              : "The online paper has not been released yet. Your record will show it the day it is published."}
          </p>
          <Link href="/app/record" className="app-btn app-btn--outline app-btn--small">
            Back to my record
          </Link>
        </div>
      </>
    );
  }

  const s = paper.sheet;

  return (
    <>
      <Link href="/app/record" className="sheet-back">
        ← My record
      </Link>

      <div className="sheet-head">
        <div>
          <h1 className="app-h1">The online paper</h1>
          <p className="app-sub">
            {s.marks} of {s.total}
            {s.submittedAt ? ` · submitted ${s.submittedAt}` : ""}
          </p>
        </div>
      </div>

      <div className="sheet-tally">
        <span className="rec-tally__ok">{s.correct} right</span>
        <span className="rec-tally__no">{s.wrong} wrong</span>
        <span className="rec-tally__sk">{s.blank} blank</span>
      </div>

      <p className="sheet-note">
        Every question you were asked, in the order you were asked it. One mark per correct answer —
        nothing is deducted for a wrong one.
      </p>

      <ol className="online-list">
        {s.questions.map((q) => (
          <li key={q.n} className={`online-q online-q--${q.status}`}>
            <div className="online-q__head">
              <span className="online-q__n">Question {q.n}</span>
              <span className="online-q__word">
                {q.status === "correct" ? "Correct" : q.status === "wrong" ? "Wrong" : "Left blank"}
              </span>
            </div>

            {q.context && <p className="online-q__context">{q.context}</p>}
            <p className="online-q__stem">{q.q}</p>

            <ol className="sheet-panel__options">
              {q.options.map((text, i) => (
                <li
                  key={i}
                  className={
                    "sheet-opt" +
                    (i === q.answer ? " sheet-opt--key" : "") +
                    (i === q.picked && i !== q.answer ? " sheet-opt--marked" : "")
                  }
                >
                  <span className="sheet-opt__letter">{LETTERS[i]}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>

            <p className="online-q__class">
              {q.classPct}% of your class answered this correctly.
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}

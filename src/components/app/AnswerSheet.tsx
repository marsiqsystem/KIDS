"use client";

import { useState } from "react";
import type { OfflineStatus } from "@/lib/exam/offline-results";
import { explainQuestion, type Explanation } from "@/app/app/record-actions";

/**
 * The written paper's answer sheet — design 5d, both drawings.
 *
 * 5d-i, the sheet, is the default: bubbles four across, the way the child
 * filled them in. Its value is recognition and proof — this is my sheet, that
 * is what I marked, that is what the key was.
 *
 * 5d-ii, the map, sits behind the "See it as a map" switch: 100 cells in seven
 * labelled bands, which answers "where did I lose the paper" at a glance
 * instead of over ten screens of counting.
 *
 * Umar's ruling, applied: the sheet opens first because it is what students
 * already know, and the switch changes the drawing and nothing else. Both views
 * share the same bands and the same tap-to-open behaviour.
 */

export interface SheetRow {
  n: number;
  section: string;
  status: OfflineStatus;
  /** The bubble filled, "a".."d", or null. On a double, the first of the two. */
  marked: string | null;
  second: string | null;
  /** What the key wanted, or null on a withdrawn question. */
  key: string | null;
  stem: string;
  options: string[];
}

export interface SheetBand {
  name: string;
  first: number;
  last: number;
  marks: number;
  total: number;
}

const LETTERS = ["A", "B", "C", "D"];

/**
 * The five outcomes, named once.
 *
 * `double` and `grace` are real and a child met them on the day: two bubbles
 * filled scored as wrong, and a withdrawn question awarded to everyone. Folding
 * either into "wrong" would put a mark on the screen that the sheet does not
 * have.
 */
const WORD: Record<OfflineStatus, string> = {
  correct: "Correct",
  wrong: "Wrong",
  blank: "Left blank",
  double: "Two bubbles filled",
  grace: "Withdrawn — awarded to everyone",
};

export default function AnswerSheet({
  rows,
  bands,
  marks,
  total,
  correct,
  wrong,
  blank,
  grace,
  doubles,
}: {
  rows: SheetRow[];
  bands: SheetBand[];
  marks: number;
  total: number;
  /** Counts grace inside it, as it was scored. */
  correct: number;
  /** Counts doubles inside it, as they were scored. */
  wrong: number;
  blank: number;
  grace: number;
  doubles: number;
}) {
  const [asMap, setAsMap] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="sheet-head">
        <div>
          <h1 className="app-h1">Your answer sheet</h1>
          <p className="app-sub">
            Written paper · {marks} of {total}
          </p>
        </div>
        <button type="button" className="app-btn app-btn--quiet app-btn--small" onClick={() => setAsMap(!asMap)}>
          {asMap ? "See it as the sheet" : "See it as a map"}
        </button>
      </div>

      <div className="sheet-tally">
        <span className="rec-tally__ok">{correct} right</span>
        <span className="rec-tally__no">{wrong} wrong</span>
        <span className="rec-tally__sk">{blank} blank</span>
      </div>

      {(grace > 0 || doubles > 0) && (
        <p className="sheet-note">
          {/* The three tallies above add to the paper, and a child who counts
              the rings will not reach them without this. Both of these were
              scored the way the sheet says and are inside the counts, not
              beside them. */}
          {grace > 0 && (
            <>
              {grace === 1 ? "One question was" : `${grace} questions were`} withdrawn and awarded
              to everyone who sat the paper, so {grace === 1 ? "it has" : "they have"} no key marked
              on the sheet. {grace === 1 ? "It is" : "They are"} inside your {correct}.{" "}
            </>
          )}
          {doubles > 0 && (
            <>
              {doubles === 1 ? "One row has" : `${doubles} rows have`} two bubbles filled, which
              scored as wrong. {doubles === 1 ? "It is" : "They are"} inside your {wrong}.
            </>
          )}
        </p>
      )}

      <p className="sheet-note">
        {asMap
          ? "The whole paper on one screen, in the seven bands it was marked in. Tap any question to read it."
          : "A ring around a bubble is the correct answer; a filled bubble is what you marked. One mark per correct answer — nothing is deducted for a wrong one. Tap any row to read the question."}
      </p>

      {bands.map((band) => {
        const qs = rows.filter((q) => q.n >= band.first && q.n <= band.last);
        return (
          <section key={band.name} className="sheet-band">
            <div className="sheet-band__head">
              <span className="sheet-band__name">{band.name}</span>
              <span className="sheet-band__range">
                {band.first}–{band.last}
              </span>
              <span className="sheet-band__score">
                {band.marks} / {band.total}
              </span>
            </div>

            {asMap ? (
              <div className="sheet-map">
                {qs.map((q) => (
                  <button
                    key={q.n}
                    type="button"
                    className={`sheet-cell sheet-cell--${q.status}`}
                    onClick={() => setOpen(q.n)}
                    aria-label={`Question ${q.n} — ${WORD[q.status]}`}
                  >
                    {q.n}
                  </button>
                ))}
              </div>
            ) : (
              <div className="sheet-rows">
                {qs.map((q) => (
                  <button
                    key={q.n}
                    type="button"
                    className={`sheet-row sheet-row--${q.status}`}
                    onClick={() => setOpen(q.n)}
                    aria-label={`Question ${q.n} — ${WORD[q.status]}`}
                  >
                    <span className="sheet-row__n">{q.n}</span>
                    <span className="sheet-row__bubbles">
                      {LETTERS.map((letter) => {
                        const low = letter.toLowerCase();
                        const isKey = q.key === low;
                        const isMarked = q.marked === low || q.second === low;
                        return (
                          <span
                            key={letter}
                            className={
                              "sheet-bub" +
                              (isKey ? " sheet-bub--key" : "") +
                              (isMarked ? " sheet-bub--marked" : "")
                            }
                          >
                            {letter}
                          </span>
                        );
                      })}
                    </span>
                    <span className="sheet-row__word">
                      {q.status === "blank" ? "blank" : q.status === "double" ? "two filled" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {open !== null && (
        <QuestionSheetPanel row={rows.find((q) => q.n === open)!} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- panel --- */

function QuestionSheetPanel({ row, onClose }: { row: SheetRow; onClose: () => void }) {
  const [why, setWhy] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const marked = row.marked ? row.marked.toUpperCase() : null;
  const key = row.key ? row.key.toUpperCase() : null;

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const got = await explainQuestion(row.n);
      if (got) setWhy(got);
      else setFailed(true);
    } catch {
      // Offline, or the paper has since been withheld. Say so rather than
      // spinning: the student already has the question and the key in front of
      // them, and only the "why" is missing.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sheet-panel" role="dialog" aria-modal="true" aria-label={`Question ${row.n}`}>
      <div className="sheet-panel__card">
        <div className="sheet-panel__head">
          <span className="sheet-panel__n">Question {row.n}</span>
          <button type="button" className="sheet-panel__close" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="sheet-panel__verdict">
          {row.status === "blank"
            ? key
              ? `You left this blank. The key is ${key}.`
              : "You left this blank."
            : row.status === "double"
              ? `Two bubbles were filled, so it scored as wrong.${key ? ` The key is ${key}.` : ""}`
              : row.status === "grace"
                ? "This question was withdrawn — the mark was awarded to everyone."
                : row.status === "correct"
                  ? `You marked ${marked}, and that is the key.`
                  : `You marked ${marked}, the key is ${key}.`}
        </p>

        {row.stem ? (
          <>
            <p className="sheet-panel__stem">{row.stem}</p>
            <ol className="sheet-panel__options">
              {row.options.map((text, i) => {
                const letter = LETTERS[i];
                const isKey = key === letter;
                const isMarked = marked === letter;
                return (
                  <li
                    key={letter}
                    className={
                      "sheet-opt" +
                      (isKey ? " sheet-opt--key" : "") +
                      (isMarked && !isKey ? " sheet-opt--marked" : "")
                    }
                  >
                    <span className="sheet-opt__letter">{letter}</span>
                    <span>{text}</span>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className="sheet-panel__stem sheet-panel__stem--gone">
            The question paper for this one is not on file. What you marked and what the key wanted
            are shown above, and the mark is the mark.
          </p>
        )}

        {why ? (
          <div className="sheet-why">
            {why.chapter && <p className="sheet-why__chapter">{why.chapter}</p>}
            {why.whyCorrect && (
              <p>
                <b>Why the key is right.</b> {why.whyCorrect}
              </p>
            )}
            {why.whyWrong && (
              <p>
                <b>Why {marked} is not.</b> {why.whyWrong}
              </p>
            )}
            {why.whyOthers.map((o) => (
              <p key={o.index} className="sheet-why__other">
                <b>{LETTERS[o.index]}.</b> {o.text}
              </p>
            ))}
            {!why.whyCorrect && !why.whyWrong && why.whyOthers.length === 0 && (
              <p>No explanation has been written for this question yet.</p>
            )}
          </div>
        ) : row.stem ? (
          <button
            type="button"
            className="app-btn app-btn--outline app-btn--small"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Loading…" : failed ? "Try again" : "Read the explanation"}
          </button>
        ) : null}

        {failed && !loading && (
          <p className="sheet-why__failed">
            The explanation could not be fetched just now. Your marks are not affected.
          </p>
        )}
      </div>
    </div>
  );
}

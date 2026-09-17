"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, Flag, LayoutGrid, RotateCcw, WifiOff, X } from "lucide-react";
import type { Question } from "@/lib/exam/question";
import { useServerCountdown } from "@/components/portal/Countdown";

/**
 * The live paper, as the app draws it. Redesign board 04, state 5.
 *
 * One question at a time, a navigator grid, a flag, and a review before handing
 * in. Nothing moves but the clock; there is no verdict, no colour of judgement
 * and no celebration anywhere on it.
 *
 * Purely presentational, like the portal's <Paper>: it owns no answers, no clock
 * and no network. Everything that keeps the four promises — answers on the
 * phone first, the server's clock, resume, hand-in at close — stays in
 * LiveExam, untouched. The only things this file keeps for itself are which
 * question is on screen and which are flagged, both on this phone only, so a
 * reopened app returns to "You were on question 34".
 */

const LETTERS = ["A", "B", "C", "D", "E"];

type Save = "saved" | "saving" | "offline";

export default function AppPaper({
  questions,
  answers,
  onChoose,
  onSubmit,
  clock,
  deadlineIso,
  serverNowIso,
  save,
  resumed,
  storageKey,
}: {
  questions: (Question & { section?: string })[];
  answers: (number | null)[];
  onChoose: (question: number, option: number) => void;
  onSubmit: () => void;
  /** The ticking clock face. A slot, so it re-renders itself and not the paper. */
  clock: ReactNode;
  /** For "You still have 47 minutes" on the review, counted on the server's clock. */
  deadlineIso: string;
  serverNowIso: string;
  save: Save;
  resumed: boolean;
  /** Per student and per sitting, like the answer cache. */
  storageKey: string;
}) {
  const total = questions.length;
  const [at, setAt] = useState(() => {
    const n = Number(read(`${storageKey}:at`));
    return Number.isInteger(n) && n >= 0 && n < total ? n : 0;
  });
  const [flags, setFlags] = useState<number[]>(() => {
    try {
      const f = JSON.parse(read(`${storageKey}:flags`) ?? "[]");
      return Array.isArray(f) ? f.filter((x) => Number.isInteger(x)) : [];
    } catch {
      return [];
    }
  });
  const [view, setView] = useState<"question" | "grid" | "review">("question");
  const [welcome, setWelcome] = useState(resumed);
  const [resumedAt] = useState(at);

  useEffect(() => write(`${storageKey}:at`, String(at)), [storageKey, at]);
  useEffect(() => write(`${storageKey}:flags`, JSON.stringify(flags)), [storageKey, flags]);

  const q = questions[at];
  const answered = answers.filter((a) => a !== null).length;
  const blank = total - answered;
  const flagged = flags.length;

  const go = (i: number) => {
    setAt(Math.max(0, Math.min(total - 1, i)));
    setView("question");
    setWelcome(false);
    window.scrollTo(0, 0);
  };

  const toggleFlag = () =>
    setFlags((f) => (f.includes(at) ? f.filter((x) => x !== at) : [...f, at].sort((a, b) => a - b)));

  // Sections, if the paper carries them: consecutive runs of the same name.
  const sections: { name: string | null; from: number; to: number }[] = [];
  questions.forEach((question, i) => {
    const name = question.section ?? null;
    const last = sections[sections.length - 1];
    if (last && last.name === name) last.to = i;
    else sections.push({ name, from: i, to: i });
  });
  const mine = sections.find((s) => at >= s.from && at <= s.to);
  const sectionIndex = mine ? sections.indexOf(mine) + 1 : 0;

  const bar = (
    <header className="xp-bar">
      {view === "review" ? (
        <button type="button" className="xp-bar__icon" onClick={() => setView("question")} aria-label="Back to the paper">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      ) : null}
      <div className="xp-bar__clock">
        {view === "review" ? <span className="xp-bar__title">Before you hand in</span> : null}
        {view !== "review" ? (
          <>
            {/* One of these two shows, decided in CSS from the clock's own class,
                so the whole paper does not re-render every second. */}
            <span className="xp-bar__label xp-bar__label--time">Time left</span>
            <span className="xp-bar__label xp-bar__label--last">Five minutes left</span>
          </>
        ) : null}
        {clock}
      </div>
      {view === "question" ? (
        <div className="xp-bar__where">
          <span>
            Q {at + 1} of {total}
          </span>
          <span className={`xp-save xp-save--${save}`}>
            {save === "offline" ? "Kept on phone" : save === "saving" ? "Sending" : "Saved"}
          </span>
        </div>
      ) : null}
      {view !== "review" ? (
        <button
          type="button"
          className="xp-bar__icon"
          onClick={() => setView(view === "grid" ? "question" : "grid")}
          aria-label={view === "grid" ? "Close the question list" : "All questions"}
        >
          {view === "grid" ? <X size={22} aria-hidden="true" /> : <LayoutGrid size={22} aria-hidden="true" />}
        </button>
      ) : null}
    </header>
  );

  if (view === "review") {
    return (
      <div className="xp">
        {bar}
        <div className="xp-body">
          <div className="xp-review">
            <div className="xp-count">
              <b>{answered}</b>
              <span>answered</span>
            </div>
            <div className="xp-count xp-count--blank">
              <b>{blank}</b>
              <span>left blank</span>
            </div>
            <div className="xp-count xp-count--flag">
              <b>{flagged}</b>
              <span>flagged</span>
            </div>
          </div>
          <p className="xp-warn">
            Once you hand in, <strong>you cannot come back</strong>.{" "}
            <MinutesLeft deadlineIso={deadlineIso} serverNowIso={serverNowIso} />
          </p>
          <div className="xp-acts">
            <button type="button" className="k-btn xp-keep" onClick={() => setView(blank > 0 ? "grid" : "question")}>
              Keep working
            </button>
            <button type="button" className="k-btn" onClick={onSubmit}>
              Hand in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "grid") {
    return (
      <div className="xp">
        {bar}
        <div className="xp-legend">
          <span>
            <i className="xp-key xp-key--done" /> Answered {answered}
          </span>
          <span>
            <i className="xp-key" /> Blank {blank}
          </span>
          <span>
            <i className="xp-key xp-key--flag" /> Flagged {flagged}
          </span>
        </div>
        <div className="xp-body">
          {sections.map((s, n) => (
            <section key={s.from} className="xp-section">
              {s.name ? (
                <h2 className="k-label xp-section__name">
                  Section {n + 1} · {s.name} · {s.to - s.from + 1}
                </h2>
              ) : null}
              <div className="xp-grid">
                {questions.slice(s.from, s.to + 1).map((_, k) => {
                  const i = s.from + k;
                  const kind = flags.includes(i) ? "flag" : answers[i] !== null ? "done" : "blank";
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`xp-cell xp-cell--${kind}${i === at ? " xp-cell--here" : ""}`}
                      onClick={() => go(i)}
                      aria-label={`Question ${i + 1}, ${kind === "flag" ? "flagged" : kind === "done" ? "answered" : "blank"}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="xp-foot">
          <button type="button" className="k-btn k-btn--outline" onClick={() => setView("review")}>
            Hand in the paper
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="xp">
      {bar}
      {mine?.name ? (
        <div className="xp-strip">
          <span className="k-label">
            Section {sectionIndex} · {mine.name}
          </span>
          <span className="xp-strip__n">{mine.to - mine.from + 1} q</span>
        </div>
      ) : null}

      <div className="xp-body">
        {save === "offline" ? (
          <div className="xp-note xp-note--gold" role="status">
            <WifiOff size={18} aria-hidden="true" />
            <div>
              <strong>No signal — answers kept on this phone</strong>
              <span>Keep answering. The server&rsquo;s clock still counts.</span>
            </div>
          </div>
        ) : null}
        {welcome ? (
          <div className="xp-note xp-note--teal" role="status">
            <RotateCcw size={18} aria-hidden="true" />
            <div>
              <strong>Welcome back — your answers are still here</strong>
              <span>
                You were on question {resumedAt + 1}. The clock kept running.
              </span>
            </div>
          </div>
        ) : null}

        {q.context ? <p className="qp__context">{q.context}</p> : null}
        <p className="qp__stem" lang={/[ঀ-৿]/.test(q.q) ? "bn" : undefined}>
          {q.q}
        </p>

        <div className="qp__options" role="group" aria-label={`Question ${at + 1} options`}>
          {q.options.map((option, i) => {
            const picked = answers[at] === i;
            return (
              <button
                key={i}
                type="button"
                className={`qp-opt${picked ? " qp-opt--chosen" : ""}`}
                onClick={() => onChoose(at, i)}
                aria-pressed={picked}
              >
                <span className="qp-opt__mark">{LETTERS[i]}</span>
                <span className="qp-opt__text">{option}</span>
              </button>
            );
          })}
        </div>

        <div className="xp-controls">
          <button
            type="button"
            className={`xp-square${flags.includes(at) ? " xp-square--on" : ""}`}
            onClick={toggleFlag}
            aria-pressed={flags.includes(at)}
            aria-label={flags.includes(at) ? "Remove the flag" : "Flag this question"}
          >
            <Flag size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="xp-square"
            onClick={() => go(at - 1)}
            disabled={at === 0}
            aria-label="Previous question"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          {at === total - 1 ? (
            <button type="button" className="k-btn" onClick={() => setView("review")}>
              Hand in
            </button>
          ) : (
            <button type="button" className="k-btn" onClick={() => go(at + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MinutesLeft({ deadlineIso, serverNowIso }: { deadlineIso: string; serverNowIso: string }) {
  const left = useServerCountdown(deadlineIso, serverNowIso);
  const minutes = Math.max(0, Math.floor(left.total / 60000));
  return (
    <>
      You still have {minutes} minute{minutes === 1 ? "" : "s"}.
    </>
  );
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode. The paper still runs; only "you were on question 34" is lost.
  }
}

/** The hall clock, big and plain. Urgency is a size change, never a flash. */
export function AppClockFace({ seconds }: { seconds: number }) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span role="timer" aria-label="Time left" className={`xp-clock${s <= 300 ? " xp-clock--last" : ""}`}>
      {h > 0 ? `${h}:` : ""}
      {mm}:{ss}
    </span>
  );
}

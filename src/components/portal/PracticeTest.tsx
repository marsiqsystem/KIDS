"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleCheckBig, Clock, Info } from "lucide-react";
import { EXAM } from "@/lib/exam/config";
import { PRACTICE_QUESTIONS } from "@/lib/exam/practice-questions";

/**
 * The practice test.
 *
 * Its purpose is not revision. It is so that at 10:30 on exam day, not one thing
 * on the screen is new: the same scrollable paper, the same question cards, the
 * same lettered options, the same counting-down clock, the same submit, and the
 * same "are you sure — question 3 is blank" sheet. When the real exam UI is
 * built it must match THIS, not the other way round.
 *
 * The whole paper is on one page rather than one question at a time. A student
 * who can scroll back can check their work and can see at a glance what they
 * left blank — on a 50-question paper with 30 minutes to run, that is the
 * difference between finding your two unanswered questions and hunting for them.
 *
 * Nothing is recorded. No score is shown or sent anywhere, because the real
 * paper will not hand back a score at 11:00 either. They may retake it as often
 * as they like — which is the whole point.
 */

const TOTAL = PRACTICE_QUESTIONS.length;

/** The real paper's 30 minutes, so the clock they practise against is the clock they sit. */
const DURATION_SECONDS = EXAM.durationMinutes * 60;

export default function PracticeTest({ backHref }: { backHref: string }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => PRACTICE_QUESTIONS.map(() => null));
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0); // bump to remount the clock

  const cards = useRef<(HTMLElement | null)[]>([]);

  const restart = () => {
    setAnswers(PRACTICE_QUESTIONS.map(() => null));
    setConfirming(false);
    setDone(false);
    setRun((r) => r + 1);
    window.scrollTo({ top: 0 });
  };

  const submit = useCallback(() => setDone(true), []);

  // Changing your mind is the point: an answer is only a draft until submit.
  const choose = (question: number, option: number) =>
    setAnswers((prev) => prev.map((a, i) => (i === question ? option : a)));

  const goTo = useCallback((question: number) => {
    setConfirming(false);
    const card = cards.current[question];
    if (!card) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    card.focus({ preventScroll: true });
  }, []);

  const answered = answers.filter((a) => a !== null).length;
  const blanks = answers.flatMap((a, i) => (a === null ? [i] : []));

  const dismiss = useCallback(() => setConfirming(false), []);

  if (done) return <Completion backHref={backHref} onRestart={restart} />;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cream)]">
      {/* ------------------------------------------------- sticky exam bar --- */}
      <header className="sticky top-0 z-20 bg-[image:var(--gradient-maroon)] px-4 py-3.5 sm:px-10 sm:py-4">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-6 sm:justify-start">
          <span className="shrink-0 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--gold-light)] sm:text-[0.7rem]">
            Practice · nothing saved
          </span>

          <div className="hidden flex-1 sm:block">
            <Progress answered={answered} />
          </div>

          {/* Ticks on its own, so a 50-question paper is not re-rendered twice a second. */}
          <ExamClock key={run} onExpire={submit} />
        </div>

        <div className="mx-auto mt-3 max-w-[760px] sm:hidden">
          <Progress answered={answered} />
        </div>
      </header>

      {/* ------------------------------------------------------- the paper --- */}
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-4.5 sm:px-10 sm:py-8">
        <div className="mb-4 flex items-start gap-2.5 rounded-[11px] bg-[rgb(30_158_140/10%)] px-3.5 py-3 sm:mb-5.5 sm:items-center sm:px-4 sm:py-3.5">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--teal)] sm:mt-0 sm:h-[18px] sm:w-[18px]"
            aria-hidden="true"
          />
          <p className="text-sm leading-snug text-[var(--teal-ink)] sm:text-[0.92rem]">
            Answer all five. Scroll freely and{" "}
            <strong className="font-semibold">change anything until you submit.</strong> Nothing here
            is recorded.
          </p>
        </div>

        <div className="flex flex-col gap-3.5 sm:gap-4.5">
          {PRACTICE_QUESTIONS.map((question, i) => (
            <Question
              key={question.q}
              ref={(el) => {
                cards.current[i] = el;
              }}
              index={i}
              question={question}
              chosen={answers[i]}
              onChoose={(option) => choose(i, option)}
            />
          ))}
        </div>

        {/* submit, at the foot of the paper */}
        <div className="portal-card mt-5 flex flex-col items-center gap-3.5 p-5 sm:mt-7 sm:flex-row sm:justify-between sm:gap-5 sm:p-6">
          <div className="text-center sm:text-left">
            <div className="font-[family-name:var(--font-display)] text-base font-bold sm:text-[1.15rem]">
              You&apos;ve answered{" "}
              <span className="tnum">
                {answered} of {TOTAL}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)] sm:text-sm">
              On exam day this is your last chance to change answers.
            </p>
          </div>
          <button
            onClick={() => setConfirming(true)}
            className="w-full rounded-[11px] bg-[var(--maroon)] px-10 py-3.5 font-semibold text-[var(--cream)] transition hover:brightness-110 sm:w-auto"
          >
            Submit practice test
          </button>
        </div>
      </main>

      {/* --------------------------------------- sticky submit bar (phone) --- */}
      <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-[var(--cream-muted)] bg-[rgb(251_247_239/92%)] px-4 py-3 backdrop-blur-[6px] sm:hidden">
        <div className="flex-1">
          <div className="text-[0.7rem] font-semibold text-[var(--ink-muted)]">
            <span className="tnum">
              {answered} of {TOTAL}
            </span>{" "}
            answered
          </div>
          <Bar answered={answered} className="mt-1.5 bg-[var(--cream-muted)]" />
        </div>
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 rounded-[9px] bg-[var(--maroon)] px-5 py-2.5 text-sm font-semibold text-[var(--cream)]"
        >
          Submit
        </button>
      </div>

      {confirming && (
        <ConfirmSubmit
          answered={answered}
          blanks={blanks}
          onSubmit={submit}
          onBack={blanks.length ? () => goTo(blanks[0]) : dismiss}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- question --- */

function Question({
  ref,
  index,
  question,
  chosen,
  onChoose,
}: {
  ref: (el: HTMLElement | null) => void;
  index: number;
  question: (typeof PRACTICE_QUESTIONS)[number];
  chosen: number | null;
  onChoose: (option: number) => void;
}) {
  const blank = chosen === null;
  const labelId = `q${index}-label`;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={labelId}
      // scroll-mt keeps the sticky bar from covering a card we jump to.
      className={`portal-card scroll-mt-28 p-4.5 focus:outline-none sm:scroll-mt-24 sm:p-6.5 ${
        blank ? "border-[var(--gold)] shadow-[0_0_0_3px_rgb(201_162_75/10%)]" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-3.5">
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.08em] text-[var(--maroon)] sm:text-[0.68rem]">
          Question {index + 1}
        </span>
        {blank ? (
          <span className="text-[0.68rem] font-bold text-[#8a6d1f] sm:text-[0.72rem]">
            Not answered yet
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold text-[var(--teal)] sm:text-[0.72rem]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
            Answered
          </span>
        )}
      </div>

      {question.context && (
        <p className="mb-3.5 rounded-lg border border-[var(--cream-muted)] border-l-[3px] border-l-[var(--gold)] bg-[var(--cream)] px-3.5 py-3 text-sm leading-relaxed sm:px-4 sm:text-[0.95rem]">
          {question.context}
        </p>
      )}

      <h2
        id={labelId}
        className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold leading-snug sm:text-[1.4rem]"
      >
        {question.q}
      </h2>

      <div className="mt-4 grid gap-2.5 sm:mt-4.5 sm:grid-cols-2 sm:gap-3">
        {question.options.map((option, i) => {
          const selected = chosen === i;
          return (
            <button
              key={option}
              onClick={() => onChoose(i)}
              aria-pressed={selected}
              className={`flex items-center gap-3 rounded-[11px] border-[1.5px] px-3.5 py-3.5 text-left transition sm:px-4 sm:py-4 ${
                selected
                  ? "border-[var(--gold)] bg-[#F7EEDA] shadow-[0_0_0_3px_rgb(201_162_75/15%)]"
                  : "border-[var(--cream-muted)] bg-[var(--cream)] hover:border-[var(--maroon-light)]"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] font-bold sm:h-[30px] sm:w-[30px] sm:rounded-lg ${
                  selected
                    ? "bg-[var(--gold)] text-[var(--maroon-deep)]"
                    : "border-[1.5px] border-[var(--cream-muted)] text-[var(--ink-muted)]"
                }`}
              >
                {"ABCD"[i]}
              </span>
              <span className={`flex-1 sm:text-[1.05rem] ${selected ? "font-semibold" : "font-medium"}`}>
                {option}
              </span>
              {selected && (
                <Check
                  className="h-4.5 w-4.5 shrink-0 text-[var(--maroon)]"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- clock --- */

function ExamClock({ onExpire }: { onExpire: () => void }) {
  const [remaining, setRemaining] = useState(DURATION_SECONDS);

  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    // The deadline is fixed here, not in render: Date.now() in a render body is
    // impure. setInterval drifts, so we count down to an absolute moment rather
    // than decrementing a counter — the same reason the real paper's deadline is
    // issued by the server and never by the phone.
    const deadline = Date.now() + DURATION_SECONDS * 1000;

    const id = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      // Time runs out and the paper goes, answered or not — exactly as it will at
      // 11:00. Better they meet that here than for the first time on the day.
      if (left === 0) {
        clearInterval(id);
        expire.current();
      }
    }, 500);

    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
      <Clock className="h-3.5 w-3.5 text-[var(--star-gold)]" aria-hidden="true" />
      <span role="timer" aria-label="Time remaining" className="tnum font-semibold text-[var(--cream)]">
        {mm}:{ss}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- confirm --- */

function ConfirmSubmit({
  answered,
  blanks,
  onSubmit,
  onBack,
  onDismiss,
}: {
  answered: number;
  blanks: number[];
  onSubmit: () => void;
  onBack: () => void;
  onDismiss: () => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);

  // Focus once, on open. Re-running this on every render would drag focus back
  // off the buttons each time the clock ticks.
  useEffect(() => {
    sheet.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[rgb(43_26_28/45%)] sm:items-center sm:p-6">
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        className="portal-card w-full max-w-md rounded-t-3xl px-6 pb-7 pt-5 shadow-[0_-10px_40px_rgb(0_0_0/25%)] focus:outline-none sm:rounded-3xl sm:p-7"
      >
        <div
          className="mx-auto mb-5 h-[5px] w-11 rounded-full bg-[var(--cream-muted)] sm:hidden"
          aria-hidden="true"
        />

        <span className="flex h-13 w-13 items-center justify-center rounded-[13px] bg-[var(--maroon-tint)]">
          <CircleCheckBig className="h-6.5 w-6.5 text-[var(--maroon)]" strokeWidth={1.8} aria-hidden="true" />
        </span>

        <h2 id="confirm-title" className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold">
          Submit your test?
        </h2>
        <p className="mt-2 leading-relaxed text-[var(--ink-muted)]">
          You answered{" "}
          <strong className="tnum font-semibold text-[var(--ink)]">
            {answered} of {TOTAL}
          </strong>
          . {blankSentence(blanks)} On exam day you can&apos;t change answers after you submit.
        </p>

        <div className="mt-5.5 flex flex-col gap-3">
          <button
            onClick={onSubmit}
            className="w-full rounded-[11px] bg-[var(--maroon)] py-3.5 font-semibold text-[var(--cream)] transition hover:brightness-110"
          >
            {blanks.length ? "Submit anyway" : "Submit practice test"}
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-[11px] border-[1.5px] border-[var(--maroon)] py-3.5 font-semibold text-[var(--maroon)] transition hover:bg-[var(--maroon-tint)]"
          >
            {blanks.length === 0 ? "Keep checking" : `Go back to question ${blanks[0] + 1}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- completion --- */

function Completion({ backHref, onRestart }: { backHref: string; onRestart: () => void }) {
  return (
    <div className="sky flex min-h-screen flex-col items-center justify-center px-7 text-center">
      <div className="stars" aria-hidden="true" />
      <div className="relative">
        <span className="inline-flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[var(--gold)] text-3xl shadow-[0_0_0_10px_rgb(201_162_75/18%)]">
          ★
        </span>
        <h1 className="mt-6 text-3xl font-bold leading-tight text-[var(--cream)] sm:text-4xl">
          You&apos;ve seen it now
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-[#d8e6e2]">
          The real test on exam day works <strong className="text-white">exactly</strong> like this —
          same screen, same buttons, same timer.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#9fdccb]">
          Nothing here was recorded. Practise as many times as you like.
        </p>

        <div className="mx-auto mt-9 flex w-full max-w-xs flex-col gap-3">
          <button
            onClick={onRestart}
            className="rounded-[10px] bg-[var(--gold)] py-3.5 font-semibold text-[var(--maroon-deep)] transition hover:brightness-110"
          >
            Try again
          </button>
          <Link
            href={backHref}
            className="rounded-[10px] border-[1.5px] border-[rgb(251_247_239/40%)] py-3.5 font-semibold text-[var(--cream)] transition hover:bg-white/10"
          >
            Back to my portal
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bits --- */

function Progress({ answered }: { answered: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Bar answered={answered} className="bg-white/20" />
      <span
        aria-live="polite"
        className="tnum shrink-0 text-xs font-semibold text-[#f0dcc5] sm:text-[0.76rem]"
      >
        {answered} of {TOTAL}
        <span className="hidden sm:inline"> answered</span>
      </span>
    </div>
  );
}

function Bar({ answered, className = "" }: { answered: number; className?: string }) {
  return (
    <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <div
        className="h-full rounded-full bg-[var(--gold)] transition-[width] duration-300"
        style={{ width: `${(answered / TOTAL) * 100}%` }}
      />
    </div>
  );
}

/** "Question 3 is still blank." — named, because "you missed one" makes them hunt for it. */
function blankSentence(blanks: number[]): string {
  if (blanks.length === 0) return "";
  const numbers = blanks.map((i) => i + 1);
  if (numbers.length === 1) return `Question ${numbers[0]} is still blank.`;
  const last = numbers[numbers.length - 1];
  return `Questions ${numbers.slice(0, -1).join(", ")} and ${last} are still blank.`;
}

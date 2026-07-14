"use client";

import { useRef, type ReactNode } from "react";
import { Check, CircleCheckBig, Info } from "lucide-react";
import type { Question } from "@/lib/exam/question";

/**
 * The paper. One scrollable page, every question on it.
 *
 * Both the practice test and the real exam render THIS. That is the whole
 * promise the portal makes to a fifteen-year-old — "the real test works exactly
 * like this, same screen, same buttons, same timer" — and the only way to keep a
 * promise like that is to make it structurally impossible to break. Two copies
 * of this screen would have drifted apart by exam morning.
 *
 * Purely presentational: it owns no answers, no clock and no network. What
 * differs between practice and the real thing (what submitting MEANS, where the
 * answers go, what the clock counts down to) belongs to the caller.
 */

export type PaperProps = {
  questions: Question[];
  /** One slot per question; null is unanswered. */
  answers: (number | null)[];
  onChoose: (question: number, option: number) => void;
  /** Fired once the student has confirmed, not when they first press Submit. */
  onSubmit: () => void;
  /** Left of the exam bar: "Practice · nothing saved", "SET 2026 · Class XII". */
  label: string;
  /** The ticking clock. A slot, so it re-renders itself and not fifty cards. */
  clock: ReactNode;
  /** The line above the first question. */
  banner: ReactNode;
  /** Saving / offline state. The real exam shows one; practice does not. */
  status?: ReactNode;
};

export default function Paper({
  questions,
  answers,
  onChoose,
  onSubmit,
  label,
  clock,
  banner,
  status,
}: PaperProps) {
  const cards = useRef<(HTMLElement | null)[]>([]);
  const total = questions.length;
  const answered = answers.filter((a) => a !== null).length;
  const blanks = answers.flatMap((a, i) => (a === null ? [i] : []));

  const confirm = useRef<HTMLDialogElement>(null);

  const goTo = (question: number) => {
    confirm.current?.close();
    const card = cards.current[question];
    if (!card) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    card.focus({ preventScroll: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cream)]">
      {/* ------------------------------------------------- sticky exam bar --- */}
      <header className="sticky top-0 z-20 bg-[image:var(--gradient-maroon)] px-4 py-3.5 sm:px-10 sm:py-4">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-6 sm:justify-start">
          <span className="shrink-0 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--gold-light)] sm:text-[0.7rem]">
            {label}
          </span>
          <div className="hidden flex-1 sm:block">
            <Progress answered={answered} total={total} />
          </div>
          {clock}
        </div>

        <div className="mx-auto mt-3 max-w-[760px] sm:hidden">
          <Progress answered={answered} total={total} />
        </div>
      </header>

      {status}

      {/* ------------------------------------------------------- the paper --- */}
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-4.5 sm:px-10 sm:py-8">
        <div className="mb-4 flex items-start gap-2.5 rounded-[11px] bg-[rgb(30_158_140/10%)] px-3.5 py-3 sm:mb-5.5 sm:items-center sm:px-4 sm:py-3.5">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--teal)] sm:mt-0 sm:h-[18px] sm:w-[18px]"
            aria-hidden="true"
          />
          <p className="text-sm leading-snug text-[var(--teal-ink)] sm:text-[0.92rem]">{banner}</p>
        </div>

        <div className="flex flex-col gap-3.5 sm:gap-4.5">
          {questions.map((question, i) => (
            <QuestionCard
              key={i}
              ref={(el) => {
                cards.current[i] = el;
              }}
              index={i}
              question={question}
              chosen={answers[i] ?? null}
              onChoose={(option) => onChoose(i, option)}
            />
          ))}
        </div>

        <div className="portal-card mt-5 flex flex-col items-center gap-3.5 p-5 sm:mt-7 sm:flex-row sm:justify-between sm:gap-5 sm:p-6">
          <div className="text-center sm:text-left">
            <div className="font-[family-name:var(--font-display)] text-base font-bold sm:text-[1.15rem]">
              You&apos;ve answered{" "}
              <span className="tnum">
                {answered} of {total}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)] sm:text-sm">
              This is your last chance to change answers.
            </p>
          </div>
          <button
            onClick={() => confirm.current?.showModal()}
            className="w-full rounded-[11px] bg-[var(--maroon)] px-10 py-3.5 font-semibold text-[var(--cream)] transition hover:brightness-110 sm:w-auto"
          >
            Submit
          </button>
        </div>
      </main>

      {/* --------------------------------------- sticky submit bar (phone) --- */}
      <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-[var(--cream-muted)] bg-[rgb(251_247_239/92%)] px-4 py-3 backdrop-blur-[6px] sm:hidden">
        <div className="flex-1">
          <div className="text-[0.7rem] font-semibold text-[var(--ink-muted)]">
            <span className="tnum">
              {answered} of {total}
            </span>{" "}
            answered
          </div>
          <Bar answered={answered} total={total} className="mt-1.5 bg-[var(--cream-muted)]" />
        </div>
        <button
          onClick={() => confirm.current?.showModal()}
          className="shrink-0 rounded-[9px] bg-[var(--maroon)] px-5 py-2.5 text-sm font-semibold text-[var(--cream)]"
        >
          Submit
        </button>
      </div>

      <ConfirmSubmit
        ref={confirm}
        answered={answered}
        total={total}
        blanks={blanks}
        onSubmit={onSubmit}
        onGoTo={goTo}
      />
    </div>
  );
}

/* --------------------------------------------------------- question card --- */

function QuestionCard({
  ref,
  index,
  question,
  chosen,
  onChoose,
}: {
  ref: (el: HTMLElement | null) => void;
  index: number;
  question: Question;
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
              key={i}
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

/* -------------------------------------------------------------- confirm --- */

/**
 * A native <dialog>, so the browser handles the focus trap, Escape and inertness
 * for us. Hand-rolling those is how a panicking student ends up tabbing into a
 * question behind the sheet.
 */
function ConfirmSubmit({
  ref,
  answered,
  total,
  blanks,
  onSubmit,
  onGoTo,
}: {
  ref: React.RefObject<HTMLDialogElement | null>;
  answered: number;
  total: number;
  blanks: number[];
  onSubmit: () => void;
  onGoTo: (question: number) => void;
}) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      className="portal m-0 mt-auto w-full max-w-md rounded-t-3xl bg-transparent p-0 backdrop:bg-[rgb(43_26_28/45%)] sm:mx-auto sm:my-auto sm:rounded-3xl"
    >
      <div className="portal-card rounded-t-3xl px-6 pb-7 pt-5 sm:rounded-3xl sm:p-7">
        <div
          className="mx-auto mb-5 h-[5px] w-11 rounded-full bg-[var(--cream-muted)] sm:hidden"
          aria-hidden="true"
        />

        <span className="flex h-13 w-13 items-center justify-center rounded-[13px] bg-[var(--maroon-tint)]">
          <CircleCheckBig
            className="h-6.5 w-6.5 text-[var(--maroon)]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>

        <h2
          id="confirm-title"
          className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold"
        >
          Submit your test?
        </h2>
        <p className="mt-2 leading-relaxed text-[var(--ink-muted)]">
          You answered{" "}
          <strong className="tnum font-semibold text-[var(--ink)]">
            {answered} of {total}
          </strong>
          . {blankSentence(blanks)} You cannot change your answers after you submit.
        </p>

        <div className="mt-5.5 flex flex-col gap-3">
          <button
            onClick={onSubmit}
            className="w-full rounded-[11px] bg-[var(--maroon)] py-3.5 font-semibold text-[var(--cream)] transition hover:brightness-110"
          >
            {blanks.length ? "Submit anyway" : "Submit my paper"}
          </button>
          <button
            onClick={() => (blanks.length ? onGoTo(blanks[0]) : ref.current?.close())}
            className="w-full rounded-[11px] border-[1.5px] border-[var(--maroon)] py-3.5 font-semibold text-[var(--maroon)] transition hover:bg-[var(--maroon-tint)]"
          >
            {blanks.length === 0 ? "Keep checking" : `Go back to question ${blanks[0] + 1}`}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------------ bits --- */

export function Progress({ answered, total }: { answered: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Bar answered={answered} total={total} className="bg-white/20" />
      <span
        aria-live="polite"
        className="tnum shrink-0 text-xs font-semibold text-[#f0dcc5] sm:text-[0.76rem]"
      >
        {answered} of {total}
        <span className="hidden sm:inline"> answered</span>
      </span>
    </div>
  );
}

function Bar({
  answered,
  total,
  className = "",
}: {
  answered: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${className}`} aria-hidden="true">
      <div
        className="h-full rounded-full bg-[var(--gold)] transition-[width] duration-300"
        style={{ width: `${total ? (answered / total) * 100 : 0}%` }}
      />
    </div>
  );
}

/** "Question 3 is still blank." — named, because "you missed one" makes them hunt for it. */
function blankSentence(blanks: number[]): string {
  if (blanks.length === 0) return "";
  const numbers = blanks.map((i) => i + 1);
  if (numbers.length === 1) return `Question ${numbers[0]} is still blank.`;
  if (numbers.length > 6) return `${numbers.length} questions are still blank.`;
  const last = numbers[numbers.length - 1];
  return `Questions ${numbers.slice(0, -1).join(", ")} and ${last} are still blank.`;
}

/** mm:ss. Used by every clock that sits in the exam bar. */
export function ClockFace({
  seconds,
  urgent,
  icon,
}: {
  seconds: number;
  urgent: boolean;
  icon: ReactNode;
}) {
  const mm = String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, seconds) % 60).padStart(2, "0");

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
        urgent ? "bg-[rgb(244_193_42/22%)]" : "bg-white/10"
      }`}
    >
      {icon}
      <span
        role="timer"
        aria-label="Time remaining"
        className={`tnum font-semibold ${urgent ? "text-[var(--star-gold)]" : "text-[var(--cream)]"}`}
      >
        {mm}:{ss}
      </span>
    </span>
  );
}

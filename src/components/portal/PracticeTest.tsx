"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { PRACTICE_QUESTIONS } from "@/lib/exam/practice-questions";

/**
 * The practice test.
 *
 * Its purpose is not revision. It is so that at 10:30 on exam day, not one thing
 * on the screen is new: same question card, same lettered options, same running
 * timer, same Skip / Next, same submit. When the real exam UI is built it must
 * match THIS, not the other way round.
 *
 * Nothing is recorded. No score is sent anywhere. The student may retake it as
 * often as they like -- which is the whole point.
 */
export default function PracticeTest({ backHref }: { backHref: string }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => PRACTICE_QUESTIONS.map(() => null),
  );
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0); // bump to restart the clock
  const started = useRef<number | null>(null);

  useEffect(() => {
    if (done) return;
    // Clock starts when the effect runs, not during render: Date.now() in a
    // render body is impure and makes the component non-reusable.
    started.current = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - (started.current ?? Date.now())) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [done, run]);

  const restart = () => {
    setAnswers(PRACTICE_QUESTIONS.map(() => null));
    setIndex(0);
    setDone(false);
    setElapsed(0);
    setRun((r) => r + 1);
  };

  const choose = (option: number) => {
    // Changing your mind is the point: an answer is only a draft until submit.
    setAnswers((prev) => prev.map((a, i) => (i === index ? option : a)));
  };

  const next = () => (index === PRACTICE_QUESTIONS.length - 1 ? setDone(true) : setIndex(index + 1));

  if (done) {
    const correct = answers.filter((a, i) => a === PRACTICE_QUESTIONS[i].answer).length;

    return (
      <div className="sky flex min-h-screen flex-col items-center justify-center px-7 text-center">
        <div className="stars" />
        <div className="relative">
          <span className="inline-flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[var(--gold)] text-3xl shadow-[0_0_0_10px_rgb(201_162_75/18%)]">
            ★
          </span>
          <h1 className="mt-6 text-3xl font-bold leading-tight text-[var(--cream)] sm:text-4xl">
            You&apos;ve seen it now
          </h1>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-[#d8e6e2]">
            The real test on exam day works <strong className="text-white">exactly</strong> like this
            — same screen, same buttons, same timer.
          </p>
          <p className="mt-4 text-sm text-[#9fdccb]">
            You got {correct} of {PRACTICE_QUESTIONS.length}. Nothing here was recorded — practise as
            many times as you like.
          </p>

          <div className="mx-auto mt-9 flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={restart}
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

  const question = PRACTICE_QUESTIONS[index];
  const chosen = answers[index];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cream)]">
      {/* Exam chrome — the real paper will wear exactly this. */}
      <header className="bg-[image:var(--gradient-maroon)] px-5 py-4 sm:px-7">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--gold-light)]">
            Practice · nothing saved
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--star-gold)]" aria-hidden="true" />
            <span className="tnum font-semibold text-[var(--cream)]">
              {mm}:{ss}
            </span>
          </span>
        </div>

        <div className="mx-auto mt-3.5 flex max-w-2xl gap-1.5" aria-hidden="true">
          {PRACTICE_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-[5px] flex-1 rounded-full ${
                answers[i] !== null ? "bg-[var(--gold)]" : i === index ? "bg-white/50" : "bg-white/25"
              }`}
            />
          ))}
        </div>
        <div className="mx-auto mt-2 max-w-2xl text-xs text-[#e7cfc4]">
          Question {index + 1} of {PRACTICE_QUESTIONS.length}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6 sm:px-7 sm:py-8">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-relaxed sm:text-2xl">
          {question.q}
        </h1>

        <div className="mt-6 flex flex-col gap-3">
          {question.options.map((option, i) => {
            const selected = chosen === i;
            return (
              <button
                key={option}
                onClick={() => choose(i)}
                aria-pressed={selected}
                className={`flex items-center gap-3.5 rounded-xl border-[1.5px] px-4 py-3.5 text-left transition ${
                  selected
                    ? "border-[var(--gold)] bg-[#F7EEDA] shadow-[0_0_0_3px_rgb(201_162_75/15%)]"
                    : "border-[var(--cream-muted)] bg-[var(--cream-surface)] hover:border-[var(--maroon-light)]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold ${
                    selected
                      ? "bg-[var(--gold)] text-[var(--maroon-deep)]"
                      : "border-[1.5px] border-[var(--cream-muted)] text-[var(--ink-muted)]"
                  }`}
                >
                  {"ABCD"[i]}
                </span>
                <span className={`flex-1 ${selected ? "font-semibold" : "font-medium"}`}>
                  {option}
                </span>
                {selected && (
                  <Check className="h-5 w-5 text-[var(--maroon)]" strokeWidth={2.4} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex gap-3 pt-8">
          <button
            onClick={next}
            className="flex-1 rounded-[10px] border-[1.5px] border-[var(--cream-muted)] py-3.5 font-semibold text-[var(--ink-muted)] transition hover:border-[var(--maroon-light)]"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="flex-[2] rounded-[10px] bg-[var(--maroon)] py-3.5 font-semibold text-[var(--cream)] transition hover:brightness-110"
          >
            {index === PRACTICE_QUESTIONS.length - 1 ? "Finish" : "Next question"}
          </button>
        </div>
      </main>
    </div>
  );
}

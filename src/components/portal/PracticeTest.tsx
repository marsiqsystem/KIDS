"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { EXAM } from "@/lib/exam/config";
import { PRACTICE_QUESTIONS } from "@/lib/exam/practice-questions";
import Paper, { ClockFace } from "./Paper";

/**
 * The practice test.
 *
 * Its purpose is not revision. It is so that at 10:30 on exam day, not one thing
 * on the screen is new — and it delivers that by rendering the very same <Paper>
 * the real exam does. What differs is only what lies behind it: nothing is
 * recorded, no score is kept, and they may sit it as often as they like.
 */

const DURATION_SECONDS = EXAM.durationMinutes * 60;

export default function PracticeTest({ backHref }: { backHref: string }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => PRACTICE_QUESTIONS.map(() => null));
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0); // bump to remount the clock

  const submit = useCallback(() => setDone(true), []);

  const restart = () => {
    setAnswers(PRACTICE_QUESTIONS.map(() => null));
    setDone(false);
    setRun((r) => r + 1);
    window.scrollTo({ top: 0 });
  };

  // Changing your mind is the point: an answer is only a draft until submit.
  const choose = (question: number, option: number) =>
    setAnswers((prev) => prev.map((a, i) => (i === question ? option : a)));

  if (done) return <Completion backHref={backHref} onRestart={restart} />;

  return (
    <Paper
      questions={PRACTICE_QUESTIONS}
      answers={answers}
      onChoose={choose}
      onSubmit={submit}
      label="Practice · nothing saved"
      clock={<PracticeClock key={run} onExpire={submit} />}
      banner={
        <>
          Answer all five. Scroll freely and{" "}
          <strong className="font-semibold">change anything until you submit.</strong> Nothing here
          is recorded.
        </>
      }
    />
  );
}

/**
 * The practice clock runs the real paper's 30 minutes and, at zero, submits —
 * because the one thing about 11:00 that must not be a surprise is that it does
 * not wait for you.
 */
function PracticeClock({ onExpire }: { onExpire: () => void }) {
  const [remaining, setRemaining] = useState(DURATION_SECONDS);

  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    // Count down to an absolute moment rather than decrementing a counter:
    // setInterval drifts, and a background tab is throttled to a crawl.
    const deadline = Date.now() + DURATION_SECONDS * 1000;

    const id = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        expire.current();
      }
    }, 500);

    return () => clearInterval(id);
  }, []);

  return (
    <ClockFace
      seconds={remaining}
      urgent={remaining <= 300}
      icon={<Clock className="h-3.5 w-3.5 text-[var(--star-gold)]" aria-hidden="true" />}
    />
  );
}

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

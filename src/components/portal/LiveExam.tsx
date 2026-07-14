"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock, CloudOff, Loader2, ClipboardList } from "lucide-react";
import type { Question } from "@/lib/exam/question";
import { EXAM } from "@/lib/exam/config";
import { useServerCountdown } from "./Countdown";
import Paper, { ClockFace } from "./Paper";

/**
 * The real exam.
 *
 * Everything here exists to keep four promises the portal already makes to
 * students in writing, in the FAQ:
 *
 *   "Your answers are saved as you go"        -> every tap is written to this
 *                                                phone at once, and to the server
 *                                                every 60 seconds.
 *   "the test keeps working with no signal"   -> the paper and the answers live
 *                                                in localStorage, so a dead spot,
 *                                                or even a reload in one, costs
 *                                                nothing.
 *   "scan your QR code again ... answers
 *    still there"                             -> resume is the same endpoint as
 *                                                start; a borrowed phone picks up
 *                                                where the dead one stopped.
 *   "auto-submitted at 11:00 even if you
 *    don't press Submit"                      -> the clock submits for them, and
 *                                                if the phone is gone the server
 *                                                finalises the last draft anyway.
 *
 * If you change this file, change the FAQ, or stop making the promise.
 */

type Stage = "waiting" | "starting" | "live" | "submitting" | "submitted" | "over" | "error";

type Cached = { questions: Question[]; answers: Record<string, number>; deadlineAt: string };

type Save = "saved" | "saving" | "offline";

export default function LiveExam({
  uid,
  token,
  label,
  startsAtIso,
  serverNowIso,
  backHref,
}: {
  uid: string;
  token: string;
  label: string;
  startsAtIso: string;
  serverNowIso: string;
  backHref: string;
}) {
  const [stage, setStage] = useState<Stage>("waiting");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [deadlineAt, setDeadlineAt] = useState("");
  const [save, setSave] = useState<Save>("saved");
  const [resumed, setResumed] = useState(false);

  const cacheKey = `kids:exam:${uid}`;

  // The countdown to the start. When it reaches zero the waiting room becomes the
  // Start button on its own — no reload, because a student staring at the screen
  // at 10:30:00 must not have to know to refresh. It is derived from the clock
  // rather than stored, so there is no moment where the two can disagree.
  const toStart = useServerCountdown(startsAtIso, serverNowIso);
  const beforeStart = stage === "waiting" && toStart.total > 0;

  /* ------------------------------------------------------------- storage --- */

  const cache = useCallback(
    (next: Cached) => {
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // Private mode. The exam still runs from memory; the device check warned
        // them about this days ago, which is exactly why it exists.
      }
    },
    [cacheKey],
  );

  const readCache = useCallback((): Cached | null => {
    try {
      const raw = window.localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as Cached) : null;
    } catch {
      return null;
    }
  }, [cacheKey]);

  /* --------------------------------------------------------------- start --- */

  const start = useCallback(async () => {
    setStage("starting");
    setError("");

    // Offline at 10:30 but holding a cached paper from a moment ago? Sit it.
    // Sync will catch up when the signal does.
    const cached = readCache();

    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: uid, t: token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.message ?? "Something went wrong opening your paper.");
        setStage("error");
        return;
      }

      if (data.state === "waiting") return setStage("waiting");
      if (data.state === "submitted") return setStage("submitted");
      if (data.state === "over") return setStage("over");

      // The phone is the source of truth for answers it has not managed to send
      // yet, so local overlays the server's copy rather than the other way round.
      // On a borrowed phone local is empty and the server's copy simply wins.
      const merged = { ...(data.answers ?? {}), ...(cached?.answers ?? {}) };

      setQuestions(data.questions);
      setAnswers(merged);
      setDeadlineAt(data.deadlineAt);
      setResumed(Boolean(data.resumed) || Object.keys(merged).length > 0);
      cache({ questions: data.questions, answers: merged, deadlineAt: data.deadlineAt });
      setStage("live");
    } catch {
      if (cached && new Date(cached.deadlineAt) > new Date()) {
        // No signal, but we have the paper. Carry on — this is the whole point.
        setQuestions(cached.questions);
        setAnswers(cached.answers);
        setDeadlineAt(cached.deadlineAt);
        setResumed(true);
        setSave("offline");
        setStage("live");
        return;
      }
      setError("We could not reach the exam. Check your signal and try again.");
      setStage("error");
    }
  }, [uid, token, readCache, cache]);

  /* ---------------------------------------------------------------- sync --- */

  // Held in a ref so the sync interval never has to be torn down and rebuilt as
  // answers change — a re-armed interval would push the next save further away
  // every time the student taps.
  const latest = useRef({ answers, deadlineAt, questions });
  useEffect(() => {
    latest.current = { answers, deadlineAt, questions };
  }, [answers, deadlineAt, questions]);

  const push = useCallback(
    async (path: "sync" | "submit") => {
      const res = await fetch(`/api/exam/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: uid, t: token, answers: latest.current.answers }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    [uid, token],
  );

  useEffect(() => {
    if (stage !== "live") return;

    const id = setInterval(async () => {
      setSave("saving");
      try {
        await push("sync");
        setSave("saved");
      } catch {
        // Not an error the student needs to see. Their answers are on their phone.
        setSave("offline");
      }
    }, EXAM.draftIntervalSeconds * 1000);

    return () => clearInterval(id);
  }, [stage, push]);

  /* -------------------------------------------------------------- submit --- */

  const submit = useCallback(async () => {
    setStage("submitting");
    try {
      await push("submit");
      setStage("submitted");
      try {
        window.localStorage.removeItem(cacheKey);
      } catch {
        /* nothing to clean up */
      }
    } catch {
      // Keep the paper on screen and let them try again. Their last synced draft
      // is already safe, and the server will finalise it at the deadline whatever
      // happens to this phone.
      setSave("offline");
      setStage("live");
    }
  }, [push, cacheKey]);

  const expire = useRef(submit);
  useEffect(() => {
    expire.current = submit;
  }, [submit]);

  /* -------------------------------------------------------------- answer --- */

  const choose = (question: number, option: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [String(question)]: option };
      // Written to the phone BEFORE it is written to the network, because the
      // phone is the thing that will still be here in a dead spot.
      cache({ questions: latest.current.questions, answers: next, deadlineAt });
      return next;
    });
  };

  /* -------------------------------------------------------------- render --- */

  if (beforeStart) {
    return <WaitingRoom label={label} startsAtIso={startsAtIso} serverNowIso={serverNowIso} />;
  }

  if (stage === "waiting" || stage === "starting" || stage === "error") {
    return (
      <StartScreen stage={stage} error={error} resumable={Boolean(readCache())} onStart={start} />
    );
  }

  if (stage === "submitted" || stage === "over") {
    return <Submitted backHref={backHref} timedOut={stage === "over"} />;
  }

  const list: (number | null)[] = questions.map((_, i) => answers[String(i)] ?? null);

  return (
    <>
      <Paper
        questions={questions}
        answers={list}
        onChoose={choose}
        onSubmit={submit}
        label={label}
        clock={
          <DeadlineClock
            deadlineIso={deadlineAt}
            serverNowIso={serverNowIso}
            onExpire={() => expire.current()}
          />
        }
        banner={
          resumed ? (
            <>
              <strong className="font-semibold">Welcome back — your answers are still here.</strong>{" "}
              Carry on where you left off. You can change any answer until you submit.
            </>
          ) : (
            <>
              Answer all {questions.length}. Scroll freely and{" "}
              <strong className="font-semibold">change anything until you submit.</strong> Your
              answers are saved as you go.
            </>
          )
        }
        status={<SaveState state={save} />}
      />
      {stage === "submitting" && <Submitting />}
    </>
  );
}

/* ---------------------------------------------------------------- clock --- */

function DeadlineClock({
  deadlineIso,
  serverNowIso,
  onExpire,
}: {
  deadlineIso: string;
  serverNowIso: string;
  onExpire: () => void;
}) {
  // Counts down against the SERVER's clock, not the phone's. A phone whose owner
  // set it an hour fast must not close its paper an hour early.
  const left = useServerCountdown(deadlineIso, serverNowIso);
  const fired = useRef(false);

  useEffect(() => {
    if (left.total <= 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
  }, [left.total, onExpire]);

  const seconds = Math.floor(left.total / 1000);

  return (
    <ClockFace
      seconds={seconds}
      urgent={seconds <= 300}
      icon={<Clock className="h-3.5 w-3.5 text-[var(--star-gold)]" aria-hidden="true" />}
    />
  );
}

/* --------------------------------------------------------------- pieces --- */

function SaveState({ state }: { state: Save }) {
  if (state === "offline") {
    return (
      <div className="flex items-center justify-center gap-2 bg-[rgb(201_162_75/18%)] px-4 py-2 text-center text-xs font-medium text-[#6b4e10]">
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        No signal — keep answering. Your answers are safe on this phone and will send themselves.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 bg-[rgb(30_158_140/10%)] px-4 py-1.5 text-xs font-medium text-[var(--teal-ink)]">
      {state === "saving" ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="h-3 w-3 shrink-0" strokeWidth={3} aria-hidden="true" />
      )}
      {state === "saving" ? "Saving…" : "Answers saved"}
    </div>
  );
}

function StartScreen({
  stage,
  error,
  resumable,
  onStart,
}: {
  stage: Stage;
  error: string;
  resumable: boolean;
  onStart: () => void;
}) {
  const busy = stage === "starting";

  return (
    <div className="sky flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="stars" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fdccb]">
          Your paper is open
        </div>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--cream)] sm:text-5xl">
          {resumable ? "Carry on with your test" : "Ready when you are"}
        </h1>
        <p className="mx-auto mt-4 max-w-sm leading-relaxed text-[#d8e6e2]">
          {resumable
            ? "Your answers are still here. Press the button to go back to your paper."
            : "The clock is already running and ends for everyone at the same time — so start now."}
        </p>

        {stage === "error" && (
          <p className="mt-6 rounded-xl border border-[rgb(244_193_42/45%)] bg-[rgb(61_10_16/55%)] px-4 py-3 text-sm leading-relaxed text-[#f6dcc4]">
            {error}
          </p>
        )}

        <button
          onClick={onStart}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--gold)] py-4.5 text-lg font-bold text-[var(--maroon-deep)] shadow-[0_0_0_8px_rgb(201_162_75/18%)] transition hover:brightness-110 disabled:opacity-70"
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {busy
            ? "Opening your paper…"
            : stage === "error"
              ? "Try again"
              : resumable
                ? "Back to my test"
                : "Start my test"}
        </button>

        <p className="mt-5 text-xs leading-relaxed text-[#8fb0aa]">
          Once you start, the paper stays open until the time is up — even if your signal drops.
        </p>
      </div>
    </div>
  );
}

function WaitingRoom({
  label,
  startsAtIso,
  serverNowIso,
}: {
  label: string;
  startsAtIso: string;
  serverNowIso: string;
}) {
  const t = useServerCountdown(startsAtIso, serverNowIso);
  const [mounted, setMounted] = useState(false);
  // Time-derived digits cannot be rendered on the server: it does not know how
  // far this phone's clock is out. Withhold them until mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="sky flex min-h-screen flex-col px-6 py-6">
      <div className="stars" aria-hidden="true" />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#9fdccb]">{label}</div>

        <div
          className="tnum my-3 font-[family-name:var(--font-display)] text-[5.5rem] font-bold leading-none tracking-[0.02em] text-[var(--cream)] sm:text-[9rem]"
          role="timer"
          aria-live="off"
        >
          {mounted ? `${pad(t.totalMinutes)}:${pad(t.seconds)}` : "--:--"}
        </div>

        <div className="text-xs uppercase tracking-[0.24em] text-[#bcd0cc]">minutes · seconds</div>

        <div className="mt-10 w-full max-w-md rounded-2xl border border-[rgb(229_190_122/25%)] bg-[rgb(12_42_46/50%)] px-5 py-4">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#e9d9be]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--star-gold)] shadow-[0_0_0_3px_rgb(244_193_42/25%)]" />
            Nearly time
          </div>
          <p className="text-sm leading-relaxed text-[#a9c3be]">
            Stay on this page. When the clock reaches zero, a{" "}
            <strong className="font-semibold text-[#e9d9be]">Start</strong> button will appear right
            here — press it and your paper opens.
          </p>
        </div>
      </div>
    </div>
  );
}

function Submitting() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[rgb(12_42_46/85%)] px-8 text-center backdrop-blur-sm">
      <Loader2 className="h-9 w-9 animate-spin text-[var(--gold)]" aria-hidden="true" />
      <p className="mt-5 text-lg font-semibold text-[var(--cream)]">Handing in your paper…</p>
      <p className="mt-2 text-sm text-[#a9c3be]">Do not close this page.</p>
    </div>
  );
}

function Submitted({ backHref, timedOut }: { backHref: string; timedOut: boolean }) {
  return (
    <div className="portal flex min-h-screen flex-col">
      <div className="sky flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <div className="stars" aria-hidden="true" />
        <div className="relative w-full max-w-lg">
          <span className="inline-flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[var(--gold)] shadow-[0_0_0_10px_rgb(201_162_75/18%)]">
            <Check className="h-10 w-10 text-[var(--maroon-deep)]" strokeWidth={2.6} aria-hidden="true" />
          </span>

          <h1 className="mt-6 text-3xl font-bold leading-tight text-[var(--cream)] sm:text-[2.7rem]">
            Your test is submitted
          </h1>
          <p className="mt-3 leading-relaxed text-[#d8e6e2] sm:text-lg">
            {timedOut
              ? "Time is up, and your answers were submitted for you — exactly as promised. Nothing is lost."
              : "Well done. The online part is complete and your answers are safely with us."}
          </p>

          <div className="mt-9 rounded-2xl border border-[rgb(229_190_122/25%)] bg-[rgb(12_42_46/50%)] px-5 py-5 text-left">
            <h2 className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--cream)]">
              <ClipboardList className="h-5 w-5 text-[var(--gold-light)]" aria-hidden="true" />
              Now: the written test
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#a9c3be]">
              Hand your phone in when asked. The written test begins at{" "}
              <strong className="tnum font-semibold text-[#e9d9be]">11:30 AM</strong> — go to your
              room and an invigilator will guide you.
            </p>
          </div>

          <Link
            href={backHref}
            className="mt-6 inline-block rounded-[10px] border-[1.5px] border-[rgb(251_247_239/40%)] px-8 py-3 font-semibold text-[var(--cream)] transition hover:bg-white/10"
          >
            Back to my portal
          </Link>
        </div>
      </div>
    </div>
  );
}

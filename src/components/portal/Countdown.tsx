"use client";

import { useEffect, useState } from "react";

/**
 * Time until the exam.
 *
 * The phone's clock is whatever its owner set it to -- a student whose date is a
 * day out would otherwise be told the exam is tomorrow when it is today. So the
 * server sends its own `now` alongside the target, and we work in the OFFSET
 * between the two. The client's clock is used only to measure elapsed time,
 * never to decide what time it is.
 *
 * The clock also changes character as it shrinks (the design's request): calm
 * and roomy days out, tighter and warmer within a day, urgent inside the last
 * hour before reporting.
 */
export type Tone = "calm" | "focused" | "urgent";

export function useServerCountdown(targetIso: string, serverNowIso: string) {
  const target = new Date(targetIso).getTime();
  // Fixed at mount: how far this device's clock is from the server's.
  const [skew] = useState(() => Date.now() - new Date(serverNowIso).getTime());
  const [remaining, setRemaining] = useState(() => target - (Date.now() - skew));

  useEffect(() => {
    // No immediate tick: the initial state above already accounts for skew, so
    // firing one here would only re-render with the same value.
    const id = setInterval(() => setRemaining(target - (Date.now() - skew)), 1000);
    return () => clearInterval(id);
  }, [target, skew]);

  const ms = Math.max(0, remaining);
  return {
    total: ms,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    totalHours: Math.floor(ms / 3_600_000),
    totalMinutes: Math.floor(ms / 60_000),
  };
}

export function toneFor(totalMs: number): Tone {
  if (totalMs > 24 * 3_600_000) return "calm";
  if (totalMs > 3_600_000) return "focused";
  return "urgent";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The hero countdown. `reportByIso` is what the urgent state counts down to. */
export default function Countdown({
  startsAtIso,
  reportByIso,
  serverNowIso,
}: {
  startsAtIso: string;
  reportByIso: string;
  serverNowIso: string;
}) {
  const toStart = useServerCountdown(startsAtIso, serverNowIso);
  const toReport = useServerCountdown(reportByIso, serverNowIso);
  const [mounted, setMounted] = useState(false);
  // The server and this phone disagree about the time, which is the whole point
  // of `skew`. Rendering time-derived digits during SSR therefore guarantees a
  // hydration mismatch, so we withhold them until mounted. This is React's own
  // sanctioned pattern for clock UI; the compiler lint cannot see that the
  // effect runs exactly once.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const tone = toneFor(toStart.total);

  // Until hydration the numbers would be the server's, one render stale. Render
  // the frame but not the digits, so nothing visibly jumps.
  if (!mounted) {
    return <div className="min-h-[168px] rounded-2xl border border-[rgb(229_190_122/30%)] bg-[rgb(12_42_46/42%)]" />;
  }

  if (tone === "urgent") {
    return (
      <div className="rounded-2xl border border-[rgb(244_193_42/45%)] bg-[rgb(61_10_16/55%)] px-5 py-6 text-center backdrop-blur-[2px]">
        <div className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--star-gold)]">
          ★ Head to your centre now
        </div>
        <div className="tnum mt-2 font-[family-name:var(--font-display)] text-5xl font-bold leading-none text-[var(--cream)] sm:text-6xl">
          {toReport.total > 0 ? toReport.totalMinutes : toStart.totalMinutes}
        </div>
        <div className="mt-2 text-[0.6rem] uppercase tracking-[0.12em] text-[#f0d9c8]">
          {toReport.total > 0 ? "minutes to report by 10:00" : "minutes until your paper opens"}
        </div>
      </div>
    );
  }

  const units =
    tone === "focused"
      ? [
          { value: toStart.totalHours, label: "Hours" },
          { value: toStart.minutes, label: "Minutes" },
        ]
      : [
          { value: toStart.days, label: "Days" },
          { value: toStart.hours, label: "Hours" },
          { value: toStart.minutes, label: "Minutes" },
        ];

  return (
    <div className="rounded-2xl border border-[rgb(229_190_122/30%)] bg-[rgb(12_42_46/42%)] px-4 py-4 backdrop-blur-[2px] sm:px-7 sm:py-6">
      <div className="mb-3 flex items-center gap-1.5 sm:mb-4">
        <span className="text-[var(--star-gold)]" aria-hidden="true">
          ★
        </span>
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#e9d9be]">
          {tone === "focused" ? "Tomorrow morning" : "Time until your test"}
        </span>
      </div>

      <div className="flex items-end" role="timer" aria-live="off">
        {units.map((u, i) => (
          <div key={u.label} className="contents">
            {i > 0 && (
              <div
                className="pb-3 text-2xl text-[rgb(229_190_122/50%)] sm:pb-5 sm:text-4xl"
                aria-hidden="true"
              >
                :
              </div>
            )}
            <div className="flex-1 text-center">
              <div className="tnum font-[family-name:var(--font-display)] text-[2.9rem] font-bold leading-none text-[var(--cream)] sm:text-[4.6rem]">
                {tone === "focused" ? pad(u.value) : u.value}
              </div>
              <div className="mt-1.5 text-[0.6rem] uppercase tracking-[0.12em] text-[#bcd0cc] sm:mt-2 sm:text-[0.66rem]">
                {u.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3 text-center text-[0.72rem] text-[#9fb8b3] sm:mt-5 sm:pt-4 sm:text-[0.85rem]">
        Sunday 19 July · report by <span className="tnum">10:00</span> AM
      </div>
    </div>
  );
}

/** The waiting room's single, enormous MM:SS. */
export function WaitingCountdown({
  startsAtIso,
  serverNowIso,
}: {
  startsAtIso: string;
  serverNowIso: string;
}) {
  const t = useServerCountdown(startsAtIso, serverNowIso);
  const [mounted, setMounted] = useState(false);
  // The server and this phone disagree about the time, which is the whole point
  // of `skew`. Rendering time-derived digits during SSR therefore guarantees a
  // hydration mismatch, so we withhold them until mounted. This is React's own
  // sanctioned pattern for clock UI; the compiler lint cannot see that the
  // effect runs exactly once.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="tnum my-3 font-[family-name:var(--font-display)] text-[5.5rem] font-bold leading-none tracking-[0.02em] text-[var(--cream)] sm:text-[9rem]"
      role="timer"
      aria-live="off"
    >
      {mounted ? `${pad(t.totalMinutes)}:${pad(t.seconds)}` : "--:--"}
    </div>
  );
}

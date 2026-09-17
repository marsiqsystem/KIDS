"use client";

import { useSyncExternalStore } from "react";

/**
 * A ticking second, as an external store — the clock is one, and reading it in
 * render or in an effect with setState is what this lint config forbids.
 * The server snapshot is null, so nothing is rendered until the phone's own
 * clock is available.
 */
function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

const now = () => Math.floor(Date.now() / 1000);

export function useSecond(): number | null {
  return useSyncExternalStore(subscribe, now, () => null);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** HH : MM : SS until the next midnight in Kolkata. */
export function MidnightCountdown() {
  const second = useSecond();
  if (second === null) return <span className="k-mono">-- : -- : --</span>;

  // IST is UTC+5:30 all year, so midnight IST is a fixed offset from UTC midnight.
  const IST = 19800;
  const intoDay = (second + IST) % 86400;
  const left = 86400 - intoDay;
  return (
    <span className="k-mono" aria-label="Time until tomorrow's set">
      {pad(Math.floor(left / 3600))} : {pad(Math.floor((left % 3600) / 60))} : {pad(left % 60)}
    </span>
  );
}

/** Minutes and seconds (or hours) until a moment, for the exam and class screens. */
export function Until({ at, done = "now" }: { at: string; done?: string }) {
  const second = useSecond();
  if (second === null) return <span className="k-mono">--:--</span>;
  const left = Math.max(0, Math.floor(new Date(at).getTime() / 1000) - second);
  if (left === 0) return <span>{done}</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return <span className="k-mono">{h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}</span>;
}

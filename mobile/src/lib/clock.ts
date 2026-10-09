import { useEffect, useState } from "react";

/**
 * When each server "now" reached this phone, by the phone's own clock.
 *
 * Every API response carrying `serverNow` is noted here the moment it arrives
 * (src/lib/api.ts). The skew between phone and server is then measured from
 * that moment — not from whenever a countdown happens to appear on screen. The
 * difference matters: a paper clock drawn twenty minutes after the Exam tab
 * loaded, measured from mount, would give a child twenty minutes they do not
 * have.
 */
const seenAt = new Map<string, number>();

export function rememberServerNow(iso: unknown): void {
  if (typeof iso === "string" && !seenAt.has(iso)) seenAt.set(iso, Date.now());
}

/**
 * A countdown to a moment, on the SERVER's clock — the website's
 * useServerCountdown (src/components/portal/Countdown.tsx), natively. A phone
 * whose owner set it an hour fast must not close its paper an hour early.
 */
export function useServerCountdown(targetIso: string, serverNowIso: string) {
  const target = new Date(targetIso).getTime();
  const [skew] = useState(() => (seenAt.get(serverNowIso) ?? Date.now()) - new Date(serverNowIso).getTime());
  const [remaining, setRemaining] = useState(() => target - (Date.now() - skew));

  useEffect(() => {
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
  };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** "11:00 am", in Kolkata. */
export const istClock = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const ist = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...o }).format(new Date(iso));

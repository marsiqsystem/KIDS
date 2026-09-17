"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markDay } from "@/app/app/day-actions";

/**
 * Sit still, ten minutes. Redesign board 14, 2A.
 *
 * The night-to-dawn ground appears here and nowhere else in The Day: the one
 * screen that is rest rather than work. The minutes left, large, and one line.
 * No timer animation, no progress ring, no breathing graphic, no audio — the
 * addendum's rule — so the count moves by the minute, not the second: a seconds
 * display is a thing to watch, and watching a number is the opposite of sitting
 * still.
 *
 * "I'm done" is there from the start. A screen that traps a child for ten
 * minutes is a screen they leave by killing the app.
 */
export default function SitStill({ minutes }: { minutes: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(minutes);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (left <= 0) return;
    const started = Date.now();
    const tick = setInterval(() => {
      const gone = Math.floor((Date.now() - started) / 60_000);
      setLeft(Math.max(0, minutes - gone));
    }, 5_000);
    return () => clearInterval(tick);
  }, [minutes, left]);

  const finish = () =>
    start(async () => {
      await markDay("ritual");
      router.push("/app");
    });

  return (
    <div className="sit">
      <span className="k-label sit__eyebrow">Sit still</span>
      <span className="sit__minutes">{left > 0 ? left : minutes}</span>
      <span className="sit__unit">{left > 0 ? (left === 1 ? "minute left" : "minutes left") : "minutes sat"}</span>
      <p className="sit__line">{left > 0 ? "Breathe out slowly." : "The day starts now."}</p>
      <p className="sit__small">Nothing here is scored. Stop whenever you want.</p>
      <button type="button" className="k-btn sit__done" disabled={pending} onClick={finish}>
        {pending ? "…" : left > 0 ? "I’m done" : "Begin the day"}
      </button>
    </div>
  );
}

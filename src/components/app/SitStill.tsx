"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markDay } from "@/app/app/day-actions";

/**
 * Ten minutes, and almost nothing on the screen.
 *
 * The minutes remaining, in large type, and one sentence. No animation, no
 * progress ring, no audio — Design's constraint and it is the right one: a
 * ₹8,000 handset should not be animating anything at six in the morning, and a
 * sound file is a download every day for four months.
 *
 * ## Two decisions worth stating
 *
 * **The count goes down by the minute, not the second.** A seconds display is
 * a thing to watch, and watching a number is the opposite of sitting still.
 *
 * **"I have finished" is there from the start.** A screen that traps a child
 * for ten minutes is a screen they leave by killing the app, and then the app
 * is the thing that took their morning. If they sit for two minutes and say
 * they are done, the day takes them at their word — the same way it takes
 * their word for having got up.
 */
export default function SitStill({ minutes }: { minutes: number }) {
  const router = useRouter();
  const [left, setLeft] = useState(minutes);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (left <= 0) return;
    // Aligned to the minute rather than a 60s interval from mount: a tab that
    // sleeps and wakes should show the truth, not the count it had when it
    // went away.
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
      <span className="sit__minutes">{left > 0 ? left : "—"}</span>
      <p className="sit__label">
        {left > 0 ? (
          <>
            {left === 1 ? "One minute left" : `${left} minutes left`}. Sit still and count your
            breaths. Nothing else is asked of you.
          </>
        ) : (
          <>That is ten minutes. The day starts now.</>
        )}
      </p>
      <button type="button" className="app-btn sit__done" disabled={pending} onClick={finish}>
        {pending ? "…" : left > 0 ? "I have finished" : "Begin the day"}
      </button>
    </div>
  );
}

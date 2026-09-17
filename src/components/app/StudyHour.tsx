"use client";

import { useTransition } from "react";
import { sitWithTheRoom, leaveTheRoom } from "@/app/app/room-actions";

/**
 * The one button on the room screen.
 *
 * No timer on the page. The hour runs on the server's clock and outlives the
 * app being closed — Design is explicit that the phone locking must not end it,
 * and a ticking number would be a thing to watch, which is the opposite of the
 * point.
 */
export default function StudyHour({ minutesLeft }: { minutesLeft: number | null }) {
  const [pending, start] = useTransition();
  const sitting = minutesLeft !== null && minutesLeft > 0;

  return (
    <>
      {sitting ? (
        <p className="room__sitting">
          You are sitting with them · {minutesLeft} min left
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className={`k-btn${sitting ? " k-btn--outline" : ""}`}
        onClick={() => start(() => void (sitting ? leaveTheRoom() : sitWithTheRoom()))}
      >
        {pending ? "…" : sitting ? "Stop" : "Start a study hour"}
      </button>
    </>
  );
}

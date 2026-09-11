"use client";

import { useTransition } from "react";
import { markDay } from "@/app/app/day-actions";
import type { BlockKind } from "@/lib/app/day";

/**
 * "I'm up", "Done" — a block completed in place.
 *
 * A button rather than a link because nothing else happens: the child is
 * telling the day something, not going anywhere. `useTransition` keeps the
 * screen honest while the server answers, which on 3G at half past five is
 * long enough to tap twice.
 */
export default function DayAction({
  kind,
  label,
  small,
}: {
  kind: BlockKind;
  label: string;
  small?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void markDay(kind))}
      className={`app-btn${small ? " app-btn--outline app-btn--small" : ""}`}
    >
      {pending ? "…" : label}
    </button>
  );
}

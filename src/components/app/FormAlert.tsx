"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import type { FormState } from "@/app/app/actions";

/**
 * What went wrong, and the way out of it.
 *
 * Every refusal on the front door carries a route onward. A dead end on this
 * screen is a child who does not come back. No shake, no red banner across the
 * screen — a maroon-washed card with one sentence and one door.
 *
 * `aria-live="polite"` because the message replaces itself in place.
 */
export default function FormAlert({ state }: { state: FormState }) {
  if (!state.message) return null;

  return (
    <div className="door-alert" role="alert" aria-live="polite">
      <CircleAlert size={20} className="door-alert__icon" aria-hidden="true" />
      <div className="door-alert__text">
        <p>{state.message}</p>
        {state.action ? (
          <Link href={state.action.href} className="door-alert__link">
            {state.action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

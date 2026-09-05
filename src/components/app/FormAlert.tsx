"use client";

import Link from "next/link";
import type { FormState } from "@/app/app/actions";

/**
 * What went wrong, and the way out of it.
 *
 * Every refusal on the front door carries a route onward — a school that can
 * look up an ID, a password that can be reset, a claim that can be started.
 * A dead end on this screen is a child who does not come back.
 *
 * `aria-live="polite"` because the message replaces itself in place: a screen
 * reader that has already moved past the field would otherwise never hear it.
 */
export default function FormAlert({ state }: { state: FormState }) {
  if (!state.message) return null;

  return (
    <div className="app-card" role="alert" aria-live="polite">
      <div className="app-alert">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.7 4.3 2.9 17.6A1.5 1.5 0 0 0 4.2 20h15.6a1.5 1.5 0 0 0 1.3-2.4L13.3 4.3a1.5 1.5 0 0 0-2.6 0z" />
          <path d="M12 9.4v4M12 16.8h.01" />
        </svg>
        <p>{state.message}</p>
      </div>

      {state.action && (
        <Link href={state.action.href} className="app-btn app-btn--outline app-btn--small">
          {state.action.label}
        </Link>
      )}
    </div>
  );
}

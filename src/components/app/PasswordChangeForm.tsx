"use client";

import { useActionState } from "react";
import PasswordField from "./PasswordField";
import { changePasswordAction, type PasswordFormState } from "@/app/app/profile-actions";

/**
 * Change my password. Design 7a: it asks for the one you use now.
 *
 * Three boxes, not two. The confirmation is here because the Show toggle is the
 * only way most of this cohort can check what they typed, and a password set
 * wrong on a borrowed handset is a child locked out of their own record until a
 * teacher can be found.
 */
export default function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState<PasswordFormState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <form action={formAction} className="app-form">
      <div className="app-field">
        <label className="app-label">The password you use now</label>
        <PasswordField name="current" autoComplete="current-password" invalid={state.field === "current"} />
      </div>

      <div className="app-field">
        <label className="app-label">Your new password</label>
        <PasswordField name="next" autoComplete="new-password" invalid={state.field === "next"} />
        <span className="app-hint">
          At least 6 characters, and it cannot be your User ID — anyone holding your admit card
          knows that number.
        </span>
      </div>

      <div className="app-field">
        <label className="app-label">The new password again</label>
        <PasswordField name="again" autoComplete="new-password" invalid={state.field === "next"} />
      </div>

      {state.message && (
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
        </div>
      )}

      <button type="submit" className="app-btn" disabled={pending}>
        {pending ? "Changing…" : "Change my password"}
      </button>

      <p className="app-foot">
        Changing it here does not sign you out anywhere. The next time you sign in, on this phone or
        any other, use the new one.
      </p>
    </form>
  );
}

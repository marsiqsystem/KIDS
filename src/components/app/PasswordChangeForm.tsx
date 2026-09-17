"use client";

import { useActionState } from "react";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
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
    <form action={formAction} className="door-step-body">
      <div className="door-field">
        <label className="k-label">Password you use now</label>
        <PasswordField name="current" autoComplete="current-password" invalid={state.field === "current"} />
      </div>

      <div className="door-field">
        <label className="k-label">New password</label>
        <PasswordField
          name="next"
          autoComplete="new-password"
          invalid={state.field === "next"}
          placeholder="At least 6 characters"
        />
        <PasswordField name="again" autoComplete="new-password" invalid={state.field === "next"} placeholder="Type it again" />
      </div>

      <FormAlert state={{ message: state.message }} />

      <div className="door-bottom">
        <button type="submit" className="k-btn" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </button>
        <p className="door-foot">Use the new one next time you sign in.</p>
      </div>
    </form>
  );
}

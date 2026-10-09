"use client";

import { useActionState } from "react";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import { deleteAccountAction, type DeleteFormState } from "@/app/app/profile-actions";

/**
 * Delete my account. The password (when the child has one of their own) and
 * the word DELETE, because there is no undo: the account goes in one
 * transaction, and the button says exactly that.
 */
export default function DeleteAccountForm({ needsPassword }: { needsPassword: boolean }) {
  const [state, formAction, pending] = useActionState<DeleteFormState, FormData>(deleteAccountAction, {});

  return (
    <form action={formAction} className="door-step-body">
      {needsPassword ? (
        <div className="door-field">
          <label className="k-label">Your password</label>
          <PasswordField name="password" autoComplete="current-password" invalid={state.field === "password"} />
        </div>
      ) : null}

      <div className="door-field">
        <label className="k-label" htmlFor="confirm">
          Type DELETE
        </label>
        <input
          id="confirm"
          name="confirm"
          className={`door-input${state.field === "confirm" ? " door-input--bad" : ""}`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>

      <FormAlert state={{ message: state.message }} />

      <div className="door-bottom">
        <button type="submit" className="k-btn" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </form>
  );
}

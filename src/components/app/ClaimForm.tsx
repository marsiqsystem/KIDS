"use client";

import { useActionState, useState } from "react";
import UidField from "./UidField";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import { claimAction, type FormState } from "@/app/app/actions";

/**
 * "I sat SET 2026 — claim my account."
 *
 * Three things: the ID from the card, the date of birth from the register, and
 * the password the student chooses. The date of birth is typed in three fields
 * rather than picked from a calendar — a native date picker opens on this year
 * and asks a child to scroll back fifteen, which is worse than typing eight
 * digits off the card in front of them.
 */
export default function ClaimForm({ initialUid = "" }: { initialUid?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(claimAction, {});
  const [uid, setUid] = useState(initialUid);

  return (
    <form action={formAction} className="app-body">
      <div className="app-field">
        <label className="app-label">User ID · 9 digits from your admit card</label>
        <UidField value={uid} onChange={setUid} invalid={state.field === "uid"} autoFocus={!initialUid} />
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="dobDay">
          Date of birth · as printed on your admit card
        </label>
        <div className="app-dob">
          <input
            id="dobDay"
            name="dobDay"
            className={`app-input${state.field === "dob" ? " app-input--bad" : ""}`}
            inputMode="numeric"
            maxLength={2}
            placeholder="DD"
            aria-label="Day"
          />
          <input
            name="dobMonth"
            className={`app-input${state.field === "dob" ? " app-input--bad" : ""}`}
            inputMode="numeric"
            maxLength={2}
            placeholder="MM"
            aria-label="Month"
          />
          <input
            name="dobYear"
            className={`app-input app-input--year${state.field === "dob" ? " app-input--bad" : ""}`}
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            aria-label="Year"
          />
        </div>
        <span className="app-hint">
          This is the one check that you are you. It is not stored anywhere new — it is compared
          against the register you were entered on.
        </span>
      </div>

      <div className="app-field">
        <label className="app-label">Choose a password</label>
        <PasswordField autoComplete="new-password" invalid={state.field === "password"} />
        <span className="app-hint">
          At least 6 characters. Choose something you will remember in a month — there is no code by
          SMS to fall back on.
        </span>
      </div>

      <FormAlert state={state} />

      <button type="submit" className="app-btn" disabled={pending}>
        {pending ? "Claiming…" : "Claim my account"}
      </button>
    </form>
  );
}

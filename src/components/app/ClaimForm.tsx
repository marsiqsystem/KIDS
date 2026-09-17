"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import UidField, { groupUid } from "./UidField";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import DeviceField from "./DeviceField";
import { Stepper } from "./door";
import { claimAction, type FormState } from "@/app/app/actions";

/**
 * Claim your account, in two steps. Redesign board 03, 2A–2B.
 *
 * Step 1 asks for two facts KIDS already holds — the User ID and the date of
 * birth. Step 2 chooses a password. Both steps are one form and one server
 * call: step 1 is not checked on its own, because a "does this date of birth
 * match?" endpoint with no password attached would be a free oracle for the
 * one field standing between a guessed ID and a child's account. So the board's
 * "Ruma Halder, Class X · Barisha High School" confirmation is not shown before
 * the password; the UID is. A refusal about the ID or the date returns the child
 * to step 1 with the reason.
 *
 * The date of birth is typed in three boxes rather than picked from a calendar,
 * and focus jumps DD → MM → YYYY as each fills.
 */
export default function ClaimForm({ initialUid = "" }: { initialUid?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(claimAction, {});
  const [uid, setUid] = useState(state.uid ?? initialUid);
  const [dob, setDob] = useState({ d: "", m: "", y: "" });
  const [step, setStep] = useState(0);
  const [handled, setHandled] = useState<FormState | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const month = useRef<HTMLInputElement>(null);
  const year = useRef<HTMLInputElement>(null);

  // A refusal about who you are sends you back to step 1 until you move on again.
  const aboutWho = (state.field === "uid" || state.field === "dob") && handled !== state;
  const at = aboutWho ? 0 : step;
  const ready = uid.length === 9 && dob.d.length > 0 && dob.m.length > 0 && dob.y.length === 4;

  return (
    <>
      <div className="door-bar door-bar--steps">
        <Stepper steps={["Who you are", "Password"]} at={at} />
      </div>
      <form
        action={formAction}
        className="door-body"
        onSubmit={(e) => {
          const data = new FormData(e.currentTarget);
          if (data.get("password") !== data.get("again")) {
            e.preventDefault();
            setMismatch(true);
          }
        }}
      >
        <DeviceField />

        {/* Step 1 stays in the form while step 2 shows, so one submit carries both. */}
        <div className="door-step-body" hidden={at !== 0}>
          <h2 className="door-h2">Let us find you</h2>
          <p className="k-line">You are already on the KIDS register.</p>

          <div className="door-field">
            <label className="k-label">User ID</label>
            <UidField value={uid} onChange={setUid} invalid={state.field === "uid"} autoFocus={!initialUid} />
          </div>

          <div className="door-field">
            <label className="k-label" htmlFor="dobDay">
              Date of birth
            </label>
            <div className="door-dob">
              <label>
                <input
                  id="dobDay"
                  name="dobDay"
                  className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
                  inputMode="numeric"
                  maxLength={2}
                  value={dob.d}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    setDob((x) => ({ ...x, d }));
                    if (d.length === 2) month.current?.focus();
                  }}
                  aria-label="Day"
                />
                <span>DD</span>
              </label>
              <label>
                <input
                  ref={month}
                  name="dobMonth"
                  className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
                  inputMode="numeric"
                  maxLength={2}
                  value={dob.m}
                  onChange={(e) => {
                    const m = e.target.value.replace(/\D/g, "");
                    setDob((x) => ({ ...x, m }));
                    if (m.length === 2) year.current?.focus();
                  }}
                  aria-label="Month"
                />
                <span>MM</span>
              </label>
              <label className="door-dob__year">
                <input
                  ref={year}
                  name="dobYear"
                  className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
                  inputMode="numeric"
                  maxLength={4}
                  value={dob.y}
                  onChange={(e) => setDob((x) => ({ ...x, y: e.target.value.replace(/\D/g, "") }))}
                  aria-label="Year"
                />
                <span>YYYY</span>
              </label>
            </div>
          </div>

          {at === 0 ? <FormAlert state={state} /> : null}

          <div className="door-bottom">
            <button
              type="button"
              className="k-btn"
              disabled={!ready}
              onClick={() => {
                setHandled(state);
                setStep(1);
              }}
            >
              Find me
            </button>
            <p className="door-foot">
              Already claimed? <Link href={uid.length === 9 ? `/app/sign-in?id=${uid}` : "/app/sign-in"}>Sign in</Link>
            </p>
          </div>
        </div>

        <div className="door-step-body" hidden={at !== 1}>
          <div className="door-who">
            <span className="k-label">User ID</span>
            <span className="door-who__uid">{groupUid(uid)}</span>
            <button type="button" className="door-who__change" onClick={() => setStep(0)}>
              Change
            </button>
          </div>

          <div className="door-field">
            <label className="k-label" htmlFor="claim-password">
              Choose a password
            </label>
            <PasswordField
              id="claim-password"
              autoComplete="new-password"
              invalid={state.field === "password"}
              placeholder="At least 6 characters"
            />
            <PasswordField
              name="again"
              autoComplete="new-password"
              invalid={mismatch}
              placeholder="Type it again"
            />
            <span className="door-hint">Something you will remember.</span>
          </div>

          {mismatch ? <FormAlert state={{ message: "The two passwords are not the same. Type them again." }} /> : null}
          {at === 1 && !mismatch ? <FormAlert state={state} /> : null}

          <div className="door-bottom">
            <button type="submit" className="k-btn" disabled={pending} onClick={() => setMismatch(false)}>
              {pending ? "Opening…" : "Open my app"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

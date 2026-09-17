"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ChevronRight, IdCard, UserPlus } from "lucide-react";
import UidField from "./UidField";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import DeviceField from "./DeviceField";
import { signInAction, type FormState } from "@/app/app/actions";

/**
 * Sign in. Redesign board 03, 1B and 1C.
 *
 * The two doors below the form are rows, not links, each with one line saying
 * whose door it is. Claim is emphasised: nearly everyone who opens the app is
 * already on the register.
 */
export default function SignInForm({ initialUid = "" }: { initialUid?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signInAction, {});
  const [uid, setUid] = useState(state.uid ?? initialUid);
  const tried = Boolean(state.message);

  return (
    <form action={formAction} className="door-body">
      <DeviceField />

      <div className="door-field">
        <label className="k-label" htmlFor="uid-entry">
          User ID
        </label>
        <UidField value={uid} onChange={setUid} invalid={state.field === "uid"} autoFocus={!initialUid} />
        <span className="door-hint">The 9-digit number on your KIDS card.</span>
      </div>

      <div className="door-field">
        <label className="k-label">Password</label>
        <PasswordField invalid={state.field === "password"} />
      </div>

      <FormAlert state={state} />

      <button type="submit" className="k-btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <Link
        href={uid.length === 9 ? `/app/reset?id=${uid}` : "/app/reset"}
        className={`door-forgot${tried ? " door-forgot--weight" : ""}`}
      >
        Forgot password
      </Link>

      <div className="door-first">
        <div className="door-rule">
          <span>First time</span>
        </div>
        <Link href={uid.length === 9 ? `/app/claim?id=${uid}` : "/app/claim"} className="k-row door-row--main">
          <IdCard size={22} className="door-row__icon" aria-hidden="true" />
          <span className="k-row__text">
            <span className="k-row__title">Claim your account</span>
            <span className="k-row__line">You already have a KIDS number.</span>
          </span>
          <ChevronRight size={18} className="door-row__chev" aria-hidden="true" />
        </Link>
        <Link href="/app/register" className="k-row">
          <UserPlus size={22} className="k-row__chev" aria-hidden="true" />
          <span className="k-row__text">
            <span className="k-row__title">Register</span>
            <span className="k-row__line">New to KIDS.</span>
          </span>
          <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
        </Link>
      </div>
    </form>
  );
}

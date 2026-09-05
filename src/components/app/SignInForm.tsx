"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import UidField from "./UidField";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import { signInAction, type FormState } from "@/app/app/actions";

export default function SignInForm({ initialUid = "" }: { initialUid?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signInAction, {});
  const [uid, setUid] = useState(initialUid);

  return (
    <form action={formAction} className="app-body">
      <div className="app-field">
        <label className="app-label" htmlFor="uid-entry">
          User ID · 9 digits from your admit card
        </label>
        <UidField value={uid} onChange={setUid} invalid={state.field === "uid"} autoFocus={!initialUid} />
        <span className="app-hint">
          District · Centre · School · You. Grouped the way it is printed, so you can check it a piece
          at a time.
        </span>
      </div>

      <div className="app-field">
        <label className="app-label">Password</label>
        <PasswordField invalid={state.field === "password"} />
      </div>

      <FormAlert state={state} />

      <button type="submit" className="app-btn" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="app-or">
        <span>or</span>
      </div>

      <Link href={uid.length === 9 ? `/app/claim?id=${uid}` : "/app/claim"} className="app-btn app-btn--outline">
        I sat SET 2026 — claim my account
      </Link>

      <Link href="/app/register" className="app-btn app-btn--quiet">
        I am new to KIDS — register
      </Link>

      <p className="app-foot">
        Forgot your password? <Link href={uid.length === 9 ? `/app/reset?id=${uid}` : "/app/reset"}>Your school can reset it</Link>
      </p>
    </form>
  );
}

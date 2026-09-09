"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { signIn } from "@/app/admin/actions";
import { Alert, Field, Submit, SURFACE } from "./ui";

/**
 * The staff door.
 *
 * A wrong ID and a wrong password read the same here. That is the opposite of
 * the student app's rule, and deliberately: design 4a separates them so a child
 * on a shared handset realises they are in their sister's account, and there is
 * no equivalent reason to confirm to a stranger that T-0006 is a real teacher.
 */
export default function StaffSignIn() {
  const [state, action] = useActionState(signIn, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#141010] px-6 py-12">
      <div className={`w-full max-w-sm rounded-lg p-6 ${SURFACE}`}>
        <div className="mb-5 flex items-center gap-2 text-[#8a6f66]">
          <Lock className="h-4 w-4" aria-hidden />
          <h1 className="text-sm font-bold tracking-wide text-[#e8e0dc]">KIDS control centre</h1>
        </div>

        <form action={action} className="space-y-4">
          <Field
            label="Staff ID"
            name="staffId"
            required
            placeholder="T-0001"
            autoComplete="username"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          <Alert state={state} />
          <Submit>Sign in</Submit>
        </form>

        <p className="mt-5 text-xs text-[#6b5c57]">
          Forgotten your password? The KIDS office can issue a new one — it cannot be looked up.
        </p>
      </div>
    </main>
  );
}

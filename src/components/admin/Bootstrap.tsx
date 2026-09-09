"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { bootstrapAdmin } from "@/app/admin/actions";
import { Alert, Field, SecretBox, Submit, SURFACE } from "./ui";

/**
 * The one door KIDS_ADMIN_KEY still opens: making the first admin.
 *
 * Shown only while no admin account exists, so it closes behind itself. After
 * this, the key signs nothing and unlocks nothing, and rotating it costs
 * nobody their session.
 */
export default function Bootstrap({ configured }: { configured: boolean }) {
  const [state, action] = useActionState(bootstrapAdmin, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#141010] px-6 py-12">
      <div className={`w-full max-w-md rounded-lg p-6 ${SURFACE}`}>
        <div className="mb-5 flex items-center gap-2 text-[#8a6f66]">
          <KeyRound className="h-4 w-4" aria-hidden />
          <h1 className="text-sm font-bold tracking-wide text-[#e8e0dc]">
            Set up the control centre
          </h1>
        </div>

        {!configured ? (
          <p className="text-sm text-[#d98b8b]">
            <code>KIDS_ADMIN_KEY</code> is not set on this deployment, so the first admin cannot be
            created. Add it in the Vercel project settings and reload.
          </p>
        ) : state.secret ? (
          <>
            <SecretBox secret={state.secret} />
            <a
              href="/admin"
              className="mt-4 inline-block text-sm font-semibold text-[#8fbfae] underline"
            >
              Sign in now
            </a>
          </>
        ) : (
          <form action={action} className="space-y-4">
            <p className="text-sm text-[#9c8c86]">
              There are no accounts yet. Enter the admin key from the environment to create the
              first named admin — after that, every person who signs in has their own ID and
              everything they change is recorded against it.
            </p>
            <Field
              label="Admin key"
              name="key"
              type="password"
              required
              autoComplete="off"
              hint="The KIDS_ADMIN_KEY value."
            />
            <Field
              label="Name of the first admin"
              name="fullName"
              required
              placeholder="Umar Iqbal"
            />
            <Alert state={state} />
            <Submit>Create the first admin</Submit>
          </form>
        )}
      </div>
    </main>
  );
}

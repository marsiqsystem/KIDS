"use client";

import { useActionState } from "react";
import Image from "next/image";
import { KeyRound } from "lucide-react";
import { bootstrapAdmin } from "@/app/admin/actions";
import { Alert, Field, SecretBox, Submit } from "./ui";

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FBF7EF] px-6 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Image src="/kids-icon.png" alt="" width={44} height={44} />
        <div>
          <div className="font-[family-name:var(--font-newsreader)] text-[26px] leading-none text-[#2B1A1C]">
            KIDS
          </div>
          <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#7B1E2B]">
            Control centre
          </div>
        </div>
      </div>

      <div className="w-full max-w-md rounded-[14px] border border-[#F2E9DA] bg-white p-6">
        <div className="mb-5 flex items-center gap-2 text-[#7B1E2B]">
          <KeyRound className="h-4 w-4" aria-hidden />
          <h1 className="text-sm font-bold tracking-wide text-[#2B1A1C]">
            Set up the control centre
          </h1>
        </div>

        {!configured ? (
          <p className="text-sm text-[#B22234]">
            <code>KIDS_ADMIN_KEY</code> is not set on this deployment, so the first admin cannot be
            created. Add it in the Vercel project settings and reload.
          </p>
        ) : state.secret ? (
          <>
            <SecretBox secret={state.secret} />
            <a
              href="/admin"
              className="mt-4 inline-block text-sm font-semibold text-[#7B1E2B] underline underline-offset-2"
            >
              Sign in now
            </a>
          </>
        ) : (
          <form action={action} className="space-y-4">
            <p className="text-sm text-[#6B5B5D]">
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

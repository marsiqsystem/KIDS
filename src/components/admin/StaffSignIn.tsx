"use client";

import { useActionState } from "react";
import Image from "next/image";
import { signIn } from "@/app/admin/actions";
import { Alert, Field, Submit } from "./ui";

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

      <div className="w-full max-w-sm rounded-[14px] border border-[#F2E9DA] bg-white p-6">
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

        <p className="mt-5 text-xs text-[#6B5B5D]">
          Forgotten your password? The KIDS office can issue a new one — it cannot be looked up.
        </p>
      </div>
    </main>
  );
}

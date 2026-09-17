"use client";

import { useActionState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { changeOwnPassword } from "@/app/admin/actions";
import type { Staff } from "@/lib/admin/staff";
import { Alert, Field, Submit } from "./ui";

/**
 * Replace the issued password before anything else.
 *
 * The whole screen, not a banner on the control centre. A one-time password
 * was read down a phone or written on a slip, and it stops being a secret the
 * moment it is handed over — so it must never become the standing password on
 * an account that can move children between batches.
 */
export default function FirstPassword({ staff }: { staff: Staff }) {
  const [state, action] = useActionState(changeOwnPassword, {});

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
        <div className="mb-4 flex items-center gap-2 text-[#7B1E2B]">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          <h1 className="text-sm font-bold tracking-wide text-[#2B1A1C]">
            Choose your own password
          </h1>
        </div>

        <p className="mb-5 text-sm text-[#6B5B5D]">
          Welcome, {staff.full_name}. You are signed in as{" "}
          <span className="font-mono text-[#4A3A3C]">{staff.staff_id}</span>. The password you were
          given was seen by whoever gave it to you, so please replace it now.
        </p>

        <form action={action} className="space-y-4">
          <Field
            label="New password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <Field
            label="Type it again"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
          />
          <Alert state={state} />
          <Submit>Save and continue</Submit>
        </form>
      </div>
    </main>
  );
}

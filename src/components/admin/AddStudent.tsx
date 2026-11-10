"use client";

import { startTransition, useActionState, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { addStudentAction } from "@/app/admin/actions";
import type { School } from "@/lib/app/registrations";
import { Alert, INPUT } from "./ui";

/**
 * Put a child on the register from the office (10 Nov 2026), for a school's
 * list brought in by hand or a family that rang instead of applying.
 *
 * The same rules as an application from the app, and the same approval mints
 * the User ID. If somebody with this name and date of birth is already on the
 * register, the add stops and names them; the office ticks that it has
 * checked before it can go ahead.
 */
export default function AddStudent({ schools }: { schools: School[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addStudentAction, {});
  const askConfirm = state.field === "confirm";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded bg-[#7B1E2B] px-3 py-1.5 text-xs font-semibold text-[#FDFBF7]"
      >
        <UserPlus className="h-3.5 w-3.5" aria-hidden />
        Add a student
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#2B1A1C]/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div role="dialog" aria-label="Add a student" className="mt-12 w-full max-w-xl rounded bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#2B1A1C]">Add a student</h3>
                <p className="text-xs text-[#6B5B5D]">A User ID is made as soon as you add. Check the details first.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-[#6B5B5D]">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Submitted by hand, not through `action=`, so a refusal (a duplicate,
                a bad date) keeps what was typed; React clears a form after an
                action runs. A new key after each add starts the next one empty. */}
            <form
              key={state.ok ? state.message : "form"}
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                startTransition(() => action(data));
              }}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Full name</span>
                <input name="name" required maxLength={100} className={INPUT} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Date of birth · DD-MM-YYYY</span>
                <input name="dob" required placeholder="e.g. 07-03-2011" className={`${INPUT} font-mono`} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Class</span>
                  <select name="class" required defaultValue="" className={INPUT}>
                    <option value="" disabled>—</option>
                    {["IX", "X", "XI", "XII"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Stream</span>
                  <select name="stream" defaultValue="" className={INPUT}>
                    <option value="">—</option>
                    {["Arts", "Commerce", "Science"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">School</span>
                <select name="school" required defaultValue="" className={INPUT}>
                  <option value="" disabled>Pick the school…</option>
                  {schools.map((x) => (
                    <option key={`${x.centre_code}|${x.school_code}`} value={`${x.centre_code}|${x.school_code}`}>
                      {x.school_name} · {x.centre_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Parent&rsquo;s phone · optional</span>
                <input name="guardian_phone" inputMode="tel" maxLength={20} className={`${INPUT} font-mono`} />
              </label>
              {askConfirm ? (
                <label className="flex items-start gap-2 text-xs text-[#4A3A3C] sm:col-span-2">
                  <input type="checkbox" name="confirm" className="mt-0.5" />
                  I have checked: this is a different child from the one already on the register.
                </label>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded bg-[#7B1E2B] px-3 py-1.5 text-xs font-semibold text-[#FDFBF7] disabled:opacity-50"
                >
                  {pending ? "Adding…" : "Add and make the User ID"}
                </button>
                <span className="text-xs text-[#6B5B5D]">It is logged, and listed under Applications as decided.</span>
              </div>
              <div className="sm:col-span-2">
                <Alert state={state} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { editStudentAction } from "@/app/admin/actions";
import type { StudentRow } from "@/lib/admin/students";
import type { School } from "@/lib/app/registrations";
import { Alert, INPUT } from "./ui";

/**
 * Edit one student on the register -- for the office, after ringing the family.
 *
 * A dialog rather than a row that grows: the register is a table, and a form
 * five fields wide does not fit in a cell. Each saved change is an approved
 * correction (src/lib/admin/corrections.ts), so the master workbook can be
 * brought into line from the Corrections export and a reseed cannot undo it.
 * The User ID is shown and never editable.
 */
export default function StudentEditor({ s, schools }: { s: StudentRow; schools: School[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editStudentAction, {});
  const here = `${s.centre_code}|${s.school_code}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-[#E3D6C4] px-2.5 py-1 text-xs text-[#4A3A3C] hover:bg-[#F6E9E9]"
      >
        Edit
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#2B1A1C]/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div role="dialog" aria-label={`Edit ${s.name}`} className="mt-12 w-full max-w-xl rounded bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#2B1A1C]">Edit {s.name}</h3>
                <p className="font-mono text-xs text-[#6B5B5D]">User ID {s.uid} · does not change</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-[#6B5B5D]">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="uid" value={s.uid} />
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Full name</span>
                <input name="name" defaultValue={s.name} className={INPUT} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Date of birth · DD-MM-YYYY</span>
                <input name="dob" defaultValue={s.dob ?? ""} placeholder="not on file" className={`${INPUT} font-mono`} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Class</span>
                  <select name="class" defaultValue={s.class} className={INPUT}>
                    {["IX", "X", "XI", "XII"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Stream</span>
                  <select name="stream" defaultValue={s.stream ?? ""} className={INPUT}>
                    <option value="">—</option>
                    {["Arts", "Commerce", "Science"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">School</span>
                <select name="school" defaultValue={here} className={INPUT}>
                  {schools.some((x) => `${x.centre_code}|${x.school_code}` === here) ? null : (
                    <option value={here}>{s.school_name}</option>
                  )}
                  {schools.map((x) => (
                    <option key={`${x.centre_code}|${x.school_code}`} value={`${x.centre_code}|${x.school_code}`}>
                      {x.school_name} · {x.centre_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Why · for the record</span>
                <input name="note" maxLength={300} placeholder="e.g. confirmed with the father by phone" className={INPUT} />
              </label>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded bg-[#7B1E2B] px-3 py-1.5 text-xs font-semibold text-[#FDFBF7] disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save changes"}
                </button>
                <span className="text-xs text-[#6B5B5D]">
                  The student sees the change in the app. It is logged, and goes into the Corrections export.
                </span>
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

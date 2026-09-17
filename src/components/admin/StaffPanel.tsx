"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createTeacher, resetPassword, toggleStaffDisabled } from "@/app/admin/actions";
import type { Staff, StaffListRow } from "@/lib/admin/staff";
import { Alert, Field, RowAction, SecretBox, Submit, INPUT, SURFACE } from "./ui";

/**
 * Teachers and admins.
 *
 * Creating an account hands back a Staff ID and a one-time password, shown once
 * and stored nowhere. There is deliberately no way to look a password up later:
 * a system that can tell you somebody's password is a system worth stealing.
 * Losing one costs two clicks to reissue.
 */
export default function StaffPanel({ staff, me }: { staff: StaffListRow[]; me: Staff }) {
  const [state, action] = useActionState(createTeacher, {});

  return (
    <div className="space-y-6">
      <section className={`rounded p-5 ${SURFACE}`}>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#7B1E2B]" aria-hidden />
          <h2 className="text-sm font-bold">Create an account</h2>
        </div>

        {state.secret ? <SecretBox secret={state.secret} /> : null}

        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Full name" name="fullName" required placeholder="Rahima Khatoon" />
          <Field label="Phone (optional)" name="phone" placeholder="9800000000" />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Role</span>
            <select name="role" defaultValue="teacher" className={INPUT}>
              <option value="teacher">Teacher — sees only their own batches</option>
              <option value="admin">Admin — can change everything</option>
            </select>
          </label>
          <div className="flex items-end">
            <Submit>Create</Submit>
          </div>
        </form>

        <div className="mt-3">
          <Alert state={state} />
        </div>
      </section>

      <section className="overflow-x-auto rounded border border-[#F2E9DA] bg-[#FFFFFF]">
        <table className="w-full text-sm">
          <thead className="border-b border-[#F2E9DA] text-xs text-[#6B5B5D]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Staff ID</th>
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold">Role</th>
              <th className="px-3 py-2 text-left font-semibold">Batches</th>
              <th className="px-3 py-2 text-left font-semibold">Last signed in</th>
              <th className="px-3 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2E9DA]">
            {staff.map((s) => {
              const off = Boolean(s.disabled_at);
              return (
                <tr key={s.staff_id} className={off ? "opacity-50" : ""}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{s.staff_id}</td>
                  <td className="px-3 py-2">
                    {s.full_name}
                    {s.staff_id === me.staff_id ? (
                      <span className="ml-2 text-xs text-[#137565]">you</span>
                    ) : null}
                    {s.must_change ? (
                      <span className="ml-2 text-xs text-[#8A6D1F]">password not yet changed</span>
                    ) : null}
                    {s.phone ? (
                      <span className="ml-2 font-mono text-xs text-[#6B5B5D]">{s.phone}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">{s.role === "admin" ? "Admin" : "Teacher"}</td>
                  <td className="px-3 py-2 text-xs">{s.batch_count || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[#6B5B5D]">
                    {s.last_sign_in_at
                      ? new Date(s.last_sign_in_at).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "2-digit",
                          month: "short",
                        })
                      : "never"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <RowAction
                        action={resetPassword}
                        fields={{ staffId: s.staff_id }}
                        confirm={`Issue a new password for ${s.full_name}? Their current one stops working straight away.`}
                      >
                        New password
                      </RowAction>
                      {s.staff_id === me.staff_id ? null : (
                        <RowAction
                          action={toggleStaffDisabled}
                          fields={{ staffId: s.staff_id, disable: off ? "0" : "1" }}
                          danger={!off}
                          confirm={
                            off
                              ? undefined
                              : `Switch off ${s.full_name}? They will be signed out on their next request.`
                          }
                        >
                          {off ? "Switch on" : "Switch off"}
                        </RowAction>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

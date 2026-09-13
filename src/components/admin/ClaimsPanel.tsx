"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Printer } from "lucide-react";
import { openSchoolAccounts, resetStudentPassword } from "@/app/admin/actions";
import type { ClaimTotals, IssuedSheetRow, SchoolClaims, UnclaimedRow } from "@/lib/admin/claims";
import { Alert, RowAction, SURFACE } from "./ui";

const n = (x: number) => x.toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

/**
 * Claims — who is on the app, school by school.
 *
 * Sorted worst first, because the office's job with this list is chasing, and
 * the school at 2% is the one to ring. "Claimed" means the child chose their own
 * password; a password the office issued and nobody has used yet is counted
 * separately, or a school would be told its children are on the app when not
 * one of them has opened it.
 */
export default function ClaimsPanel({
  totals,
  schools,
  open,
}: {
  totals: ClaimTotals;
  schools: SchoolClaims[];
  open: { school: SchoolClaims; unclaimed: UnclaimedRow[] } | null;
}) {
  return (
    <div className="space-y-6">
      <section className={`grid grid-cols-2 gap-px overflow-hidden rounded sm:grid-cols-4 ${SURFACE}`}>
        <Figure label="On the register" value={n(totals.enrolled)} />
        <Figure label="Claimed their account" value={n(totals.claimed)} note={`${pct(totals.claimed, totals.enrolled)} · ${n(totals.claimedThisWeek)} this week`} />
        <Figure label="Office password, not used yet" value={n(totals.issued)} />
        <Figure label="Locked out" value={n(totals.lockedOut)} note="No account and no date of birth" warn />
      </section>

      {open ? <SchoolDetail school={open.school} unclaimed={open.unclaimed} /> : null}

      <section>
        <h2 className="mb-2 text-sm font-bold">By school · lowest first</h2>
        <div className={`overflow-x-auto rounded ${SURFACE}`}>
          <table className="w-full text-left text-xs">
            <thead className="text-[#6b5c57]">
              <tr>
                <th className="px-4 py-2 font-semibold">School</th>
                <th className="px-4 py-2 font-semibold">Centre</th>
                <th className="px-4 py-2 text-right font-semibold">Enrolled</th>
                <th className="px-4 py-2 text-right font-semibold">Claimed</th>
                <th className="px-4 py-2 text-right font-semibold">Office password</th>
                <th className="px-4 py-2 text-right font-semibold">Locked out</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2321] tabular-nums">
              {schools.map((s) => (
                <tr key={`${s.centre_code}|${s.school_code}`}>
                  <td className="px-4 py-2 text-[#e8e0dc]">{s.school_name}</td>
                  <td className="px-4 py-2 font-mono text-[#6b5c57]">{s.centre_code}</td>
                  <td className="px-4 py-2 text-right text-[#9c8c86]">{n(s.enrolled)}</td>
                  <td className="px-4 py-2 text-right text-[#e8e0dc]">
                    {n(s.claimed)} <span className="text-[#6b5c57]">· {pct(s.claimed, s.enrolled)}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-[#9c8c86]">{s.issued ? n(s.issued) : "—"}</td>
                  <td className={`px-4 py-2 text-right ${s.locked_out ? "text-[#d9b877]" : "text-[#6b5c57]"}`}>
                    {s.locked_out ? n(s.locked_out) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin?tab=claims&school=${encodeURIComponent(`${s.centre_code}|${s.school_code}`)}`}
                      className="text-[#c9b8b2] underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Figure({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className="bg-[#1a1514] p-4">
      <p className={`font-mono text-xl tabular-nums ${warn ? "text-[#d9b877]" : "text-[#e8e0dc]"}`}>{value}</p>
      <p className="mt-1 text-xs text-[#9c8c86]">{label}</p>
      {note ? <p className="text-xs text-[#6b5c57]">{note}</p> : null}
    </div>
  );
}

function SchoolDetail({ school, unclaimed }: { school: SchoolClaims; unclaimed: UnclaimedRow[] }) {
  const [state, action, pending] = useActionState(openSchoolAccounts, {});
  const lockedOut = unclaimed.filter((u) => !u.has_dob).length;

  return (
    <section className={`rounded ${SURFACE}`}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#2a2321] px-5 py-3">
        <div>
          <h3 className="text-sm font-bold">{school.school_name}</h3>
          <p className="text-xs text-[#6b5c57]">
            {n(unclaimed.length)} not yet on the app · {n(lockedOut)} locked out
          </p>
        </div>
        <Link href="/admin?tab=claims" className="ml-auto text-xs text-[#6b5c57] hover:text-[#c9b8b2]">
          Close
        </Link>
      </header>

      {state.sheet ? (
        <Sheet school={school.school_name} rows={state.sheet} message={state.message} />
      ) : (
        <div className="space-y-3 px-5 py-4">
          {lockedOut > 0 ? (
            <form
              action={action}
              onSubmit={(e) => {
                if (!window.confirm(
                  `Issue one-time passwords to ${Math.min(lockedOut, 60)} students at ${school.school_name}?\n\n` +
                  `You will be shown a sheet to print. The passwords are not stored and cannot be shown again.`,
                )) e.preventDefault();
              }}
            >
              <input type="hidden" name="centreCode" value={school.centre_code} />
              <input type="hidden" name="schoolCode" value={school.school_code} />
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-[#8a6f66] px-4 py-2 text-sm font-semibold text-[#141010] disabled:opacity-50"
              >
                {pending ? "Issuing…" : `Open ${Math.min(lockedOut, 60)} locked-out accounts and print a sheet`}
              </button>
              <p className="mt-2 text-xs text-[#6b5c57]">
                These children have no date of birth on the register, so they cannot claim by
                themselves. The sheet goes to the class teacher; each child must choose their own
                password the first time they sign in.
                {lockedOut > 60 ? " Sixty at a time — press again for the next sixty." : ""}
              </p>
              <Alert state={state} />
            </form>
          ) : null}

          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-[#2a2321]">
              {unclaimed.map((u) => (
                <tr key={u.uid}>
                  <td className="py-1.5 font-mono text-[#c9b8b2]">{u.uid}</td>
                  <td className="py-1.5 text-[#e8e0dc]">{u.name}</td>
                  <td className="py-1.5 text-[#9c8c86]">{u.stream ? `${u.class} · ${u.stream}` : u.class}</td>
                  <td className="py-1.5 text-[#6b5c57]">{u.has_dob ? "Can claim with date of birth" : "Locked out"}</td>
                  <td className="py-1.5 text-right">
                    <RowAction action={resetStudentPassword} fields={{ uid: u.uid }}>
                      One password
                    </RowAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * The printable sheet.
 *
 * Printed from the browser, because a download link is one more place a list of
 * children's passwords can end up. The print stylesheet strips the control
 * centre down to the table on white paper.
 */
function Sheet({ school, rows, message }: { school: string; rows: IssuedSheetRow[]; message?: string }) {
  return (
    <div className="kids-print-sheet space-y-3 px-5 py-4">
      {/* Only the sheet reaches the paper: the dark control centre around it is
          hidden, and the sheet prints black on white from the top of the page. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .kids-print-sheet, .kids-print-sheet * { visibility: visible !important; }
          .kids-print-sheet { position: absolute; inset: 0 auto auto 0; width: 100%;
                              background: #fff !important; color: #000 !important; }
        }
      `}</style>
      <p className="text-sm text-[#d9b877] print:hidden">{message}</p>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded bg-[#8a6f66] px-4 py-2 text-sm font-semibold text-[#141010] print:hidden"
      >
        <Printer className="h-4 w-4" aria-hidden />
        Print this sheet
      </button>

      <div>
        <h3 className="text-sm font-bold print:text-black">KIDS · SET app sign-in · {school}</h3>
        <p className="text-xs text-[#9c8c86] print:text-black">
          Open the SET app, choose Sign in, and type the User ID and password below. The app will ask
          each student to choose their own password straight away. Keep this sheet private.
        </p>
      </div>
      <table className="w-full border-collapse text-left text-sm print:text-black">
        <thead>
          <tr className="border-b border-[#3a2f2c] print:border-black">
            <th className="py-1.5 pr-4 font-semibold">User ID</th>
            <th className="py-1.5 pr-4 font-semibold">Name</th>
            <th className="py-1.5 pr-4 font-semibold">Class</th>
            <th className="py-1.5 font-semibold">Password</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.uid} className="border-b border-[#2a2321] print:border-gray-400">
              <td className="py-1.5 pr-4 font-mono">{r.uid}</td>
              <td className="py-1.5 pr-4">{r.name}</td>
              <td className="py-1.5 pr-4">{r.class}</td>
              <td className="py-1.5 font-mono tracking-wider">{r.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

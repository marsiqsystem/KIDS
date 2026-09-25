"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Minus, X } from "lucide-react";
import {
  approveAccountRequestAction,
  approveMatchingRequestsAction,
  rejectAccountRequestAction,
} from "@/app/admin/actions";
import type { AccountRequestRow } from "@/lib/admin/account-requests";
import type { FieldMatch } from "@/lib/admin/claim-match";
import { Alert, INPUT, RowAction, SURFACE } from "./ui";

const when = (d: Date) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

/**
 * Children asking to be let in -- the top of the Claims tab.
 *
 * Mostly the children with no date of birth on the register: the claim screen
 * asks them for their father's or guardian's name and a family phone instead,
 * and each request is checked against the master workbook (claim-match.ts):
 *
 *   Matched       the name matches, and the father or the phone does too
 *   Not matched   anything else, including "nothing on file to check against"
 *
 * Approving opens the account on the phone that asked, by itself; turning one
 * down shows the child the reason. Nothing to print, nothing to read out. See
 * src/lib/app/handoff.ts.
 */
export default function AccountRequestsPanel({ rows }: { rows: AccountRequestRow[] }) {
  const matched = rows.filter((r) => r.verdict === "matched");
  const notMatched = rows.filter((r) => r.verdict === "not_matched");
  const bulk = matched.filter((r) => r.kind === "claim" && r.rivals === 0).length;
  const [state, action, pending] = useActionState(approveMatchingRequestsAction, {});

  return (
    <div className="space-y-4">
      <section className={`rounded p-5 ${SURFACE}`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h2 className="text-sm font-bold">
            {rows.length === 0
              ? "Nobody is waiting to be let in"
              : `${rows.length.toLocaleString("en-IN")} waiting to be let in`}
          </h2>
          {rows.length > 0 ? (
            <span className="text-xs text-[#6B5B5D]">
              <span className="text-[#137565]">{matched.length} matched</span> ·{" "}
              <span className="text-[#8A6D1F]">{notMatched.length} not matched</span>
            </span>
          ) : null}
          {bulk > 0 ? (
            <form
              action={action}
              className="ml-auto"
              onSubmit={(e) => {
                if (!window.confirm(
                  `Approve ${Math.min(bulk, 60)} matched requests?\n\nEach phone that asked opens its account by itself.`,
                )) e.preventDefault();
              }}
            >
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-[#7B1E2B] px-3 py-1.5 text-xs font-semibold text-[#FDFBF7] disabled:opacity-50"
              >
                {pending ? "Approving…" : `Approve ${Math.min(bulk, 60)} matched`}
              </button>
            </form>
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#6B5B5D]">
          Checked against the master workbook. <b>Matched</b>: the name matches, and the father’s name or the phone
          number does too. Approving opens the account on the child’s phone by itself; they choose their own
          password inside. Forgotten-password requests are never approved in bulk.
        </p>
        {state.message ? (
          <div className="mt-3">
            <Alert state={state} />
          </div>
        ) : null}
      </section>

      {rows.length > 0 ? (
        <>
          <Group title="Matched" tone="ok" rows={matched} />
          <Group title="Not matched" tone="warn" rows={notMatched} />
        </>
      ) : null}
    </div>
  );
}

function Group({ title, tone, rows }: { title: string; tone: "ok" | "warn"; rows: AccountRequestRow[] }) {
  return (
    <section className={`rounded ${SURFACE}`}>
      <header className="flex items-center gap-3 border-b border-[#F2E9DA] px-5 py-3">
        <h3 className={`text-sm font-bold ${tone === "ok" ? "text-[#137565]" : "text-[#8A6D1F]"}`}>{title}</h3>
        <span className="text-xs text-[#6B5B5D]">{rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-3 text-xs text-[#6B5B5D]">None.</p>
      ) : (
        <ul className="divide-y divide-[#F2E9DA]">
          {rows.map((r) => (
            <Request key={r.id} r={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Request({ r }: { r: AccountRequestRow }) {
  const matched = r.verdict === "matched";

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#2B1A1C]">
            <span className="font-mono">{r.uid}</span> · <span className="font-semibold">{r.name}</span>{" "}
            <span className="text-[#6B5B5D]">
              · {r.stream ? `${r.class} · ${r.stream}` : r.class} · {r.school_name}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-[#6B5B5D]">
            {r.kind === "reset" ? "Forgot password" : "Open my account"} · sent {when(r.requested_at)}
            {r.typed_dob ? (
              <>
                {" "}· date of birth typed <span className="font-mono text-[#4A3A3C]">{r.typed_dob}</span>
              </>
            ) : null}
          </p>

          <table className="mt-2 text-xs">
            <thead className="text-[#6B5B5D]">
              <tr>
                <th className="pr-4 text-left font-semibold" />
                <th className="pr-4 text-left font-semibold">Typed on the phone</th>
                <th className="pr-4 text-left font-semibold">On file</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <Line k="Name" typed={r.typed_name} file={r.name} m={r.match.name} />
              <Line k="Father / guardian" typed={r.father_name} file={r.file_father} m={r.match.father} />
              <Line k="Phone" typed={r.guardian_phone} file={r.file_phone} m={r.match.phone} mono />
            </tbody>
          </table>
        </div>

        <RowAction
          action={approveAccountRequestAction}
          fields={{ requestId: r.id }}
          primary={matched && r.kind === "claim" && r.rivals === 0}
          confirm={
            r.kind === "reset"
              ? `${r.name} already has an account${r.last_sign_in_at ? `, last signed in ${when(r.last_sign_in_at)}` : ""}.\n\n` +
                `Approving moves it to the phone that asked and signs any other phone out. Approve?`
              : !matched
                ? `This request does not match the school's records.\n\nApprove anyway and open ${r.name}'s account on that phone?`
                : undefined
          }
        >
          Approve
        </RowAction>
      </div>

      {r.rivals > 0 || r.kind === "reset" ? (
        <div className="mt-3 rounded border border-[#E5BE7A] bg-[#FAF1DC] p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#8A6D1F]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Look before approving
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-[#4A3A3C]">
            {r.rivals > 0 ? (
              <li>
                {r.rivals} other {r.rivals === 1 ? "phone is" : "phones are"} asking for this User ID too. Approving
                one turns the others down.
              </li>
            ) : null}
            {r.kind === "reset" ? (
              <li>This account is already open. Approving signs it in on the phone that asked, and out everywhere else.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <Reject id={r.id} />
    </li>
  );
}

function Line({
  k,
  typed,
  file,
  m,
  mono,
}: {
  k: string;
  typed: string | null;
  file: string | null;
  m: FieldMatch;
  mono?: boolean;
}) {
  return (
    <tr>
      <td className="pr-4 text-[#6B5B5D]">{k}</td>
      <td className={`pr-4 text-[#2B1A1C] ${mono ? "font-mono" : ""}`}>{typed ?? "—"}</td>
      <td className={`pr-4 text-[#4A3A3C] ${mono ? "font-mono" : ""}`}>{file ?? "not on file"}</td>
      <td>
        {m === "match" ? (
          <span className="inline-flex items-center gap-1 text-[#137565]">
            <Check className="h-3.5 w-3.5" aria-hidden /> matches
          </span>
        ) : m === "differs" ? (
          <span className="inline-flex items-center gap-1 text-[#B22234]">
            <X className="h-3.5 w-3.5" aria-hidden /> differs
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[#6B5B5D]">
            <Minus className="h-3.5 w-3.5" aria-hidden /> nothing to check
          </span>
        )}
      </td>
    </tr>
  );
}

function Reject({ id }: { id: string }) {
  const [state, action] = useActionState(rejectAccountRequestAction, {});
  return (
    <details className="mt-3">
      <summary className="cursor-pointer select-none text-xs text-[#6B5B5D] hover:text-[#4A3A3C]">
        Turn down…
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="requestId" value={id} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">
            Reason · the child reads this, word for word
          </span>
          <textarea
            name="reason"
            rows={2}
            maxLength={300}
            className={INPUT}
            placeholder="Optional. Without one, they are told to call the office."
          />
        </label>
        <button
          type="submit"
          className="rounded border border-[#E8C9CC] px-2.5 py-1 text-xs text-[#B22234] hover:bg-[#FBE9EA]"
        >
          Turn this request down
        </button>
        <Alert state={state} />
      </form>
    </details>
  );
}

"use client";

import { useActionState } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { approveApplication, approveSchool, rejectApplication } from "@/app/admin/actions";
import type { DecidedRow, PendingRow } from "@/lib/admin/registrations";
import { Alert, INPUT, RowAction, SURFACE } from "./ui";

/**
 * Applications — children asking to be put on the register.
 *
 * Every row here is somebody's evening: a family filled a form in the app and
 * the phone is now waiting on this screen. Approving mints a UID and opens the
 * account on that phone by itself; turning one down shows the family the reason
 * word for word. Nothing here is undoable from this screen, and it says so.
 *
 * Grouped by school because that is how applications arrive and how they are
 * checked -- against the list a class teacher sent. A school's clean
 * applications can be approved together; anything the duplicate guard flagged
 * cannot, and is held back for a person to open.
 */
export default function ApplicationsPanel({
  pending,
  decided,
}: {
  pending: PendingRow[];
  decided: DecidedRow[];
}) {
  const groups = new Map<string, PendingRow[]>();
  for (const r of pending) {
    const key = `${r.centre_code}|${r.school_code}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const flagged = pending.filter((r) => r.duplicates.length > 0).length;

  return (
    <div className="space-y-6">
      <section className={`rounded p-5 ${SURFACE}`}>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <h2 className="text-sm font-bold">
            {pending.length === 0
              ? "Nobody is waiting"
              : `${pending.length.toLocaleString("en-IN")} waiting`}
          </h2>
          {pending.length > 0 ? (
            <span className="text-xs text-[#9c8c86]">
              across {groups.size} {groups.size === 1 ? "school" : "schools"}
              {flagged ? ` · ${flagged} flagged as a possible duplicate` : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#6b5c57]">
          Approving puts the child on the register with a new User ID, and their app opens the
          account by itself — they do not sign in. It cannot be undone from here. A child who already
          sat SET 2026 should never be approved: they have a User ID and should claim it instead.
        </p>
      </section>

      {pending.length === 0 ? (
        <p className={`flex items-center gap-2 rounded p-4 text-sm text-[#9c8c86] ${SURFACE}`}>
          <Inbox className="h-4 w-4" aria-hidden />
          New registrations from the app arrive here.
        </p>
      ) : (
        [...groups.entries()].map(([key, rows]) => <SchoolGroup key={key} rows={rows} />)
      )}

      {decided.length > 0 ? <Decided rows={decided} /> : null}
    </div>
  );
}

function SchoolGroup({ rows }: { rows: PendingRow[] }) {
  const first = rows[0];
  const clean = rows.filter((r) => r.duplicates.length === 0).length;

  return (
    <section className={`rounded ${SURFACE}`}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#2a2321] px-5 py-3">
        <div>
          <h3 className="text-sm font-bold">{first.school_name}</h3>
          <p className="font-mono text-xs text-[#6b5c57]">
            {first.centre_code} · {first.school_code}
          </p>
        </div>
        <span className="text-xs text-[#9c8c86]">
          {rows.length} {rows.length === 1 ? "application" : "applications"}
        </span>
        {clean > 1 ? (
          <div className="ml-auto">
            <RowAction
              action={approveSchool}
              fields={{ centreCode: first.centre_code, schoolCode: first.school_code }}
              confirm={
                `Approve ${clean} applications from ${first.school_name}?\n\n` +
                `Each gets a new User ID. This cannot be undone from the control centre.` +
                (clean < rows.length
                  ? `\n\n${rows.length - clean} flagged as a possible duplicate will be left for you.`
                  : "")
              }
              primary
            >
              Approve all {clean} clean
            </RowAction>
          </div>
        ) : null}
      </header>

      <ul className="divide-y divide-[#2a2321]">
        {rows.map((r) => (
          <Application key={r.id} r={r} />
        ))}
      </ul>
    </section>
  );
}

function Application({ r }: { r: PendingRow }) {
  const dup = r.duplicates.length > 0;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#e8e0dc]">{r.name}</p>
          <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#9c8c86]">
            <Pair k="Class" v={r.stream ? `${r.class} · ${r.stream}` : r.class} />
            <Pair k="Born" v={r.dob} mono />
            {r.guardian_phone ? <Pair k="Parent" v={r.guardian_phone} mono /> : null}
            <Pair
              k="Applied"
              v={new Date(r.applied_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })}
            />
          </dl>
        </div>

        <div className="flex items-center gap-2">
          <RowAction
            action={approveApplication}
            fields={{ registrationId: r.id }}
            primary={!dup}
            confirm={
              dup
                ? `${r.name} matches ${r.duplicates.length === 1 ? "a student" : "students"} already on the register by name and date of birth.\n\nApprove anyway and give them a SECOND User ID?`
                : undefined
            }
          >
            {dup ? "Approve anyway" : "Approve"}
          </RowAction>
        </div>
      </div>

      {dup ? (
        <div className="mt-3 rounded border border-[#6b5a3a] bg-[#221c12] p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#d9b877]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Already on the register? Same name and date of birth as:
          </p>
          <ul className="mt-2 space-y-1">
            {r.duplicates.map((d) => (
              <li key={d.uid} className="text-xs text-[#c9b8b2]">
                <span className="font-mono text-[#e8e0dc]">{d.uid}</span> · {d.name} · Class {d.class}{" "}
                · {d.school_name}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[#9c8c86]">
            If this is the same child, turn the application down and tell them to claim{" "}
            {r.duplicates.length === 1 ? (
              <span className="font-mono">{r.duplicates[0].uid}</span>
            ) : (
              "their existing account"
            )}{" "}
            instead.
          </p>
        </div>
      ) : null}

      <Reject r={r} />
    </li>
  );
}

/**
 * Turn down, behind a disclosure.
 *
 * A native <details> rather than state: it costs no JavaScript, and it keeps the
 * reason box out of the way of the thirty approvals that do not need one.
 */
function Reject({ r }: { r: PendingRow }) {
  const [state, action] = useActionState(rejectApplication, {});
  const suggested =
    r.duplicates.length === 1
      ? `You are already on the register as ${r.duplicates[0].uid}. Claim that account in the app instead of registering again.`
      : "";

  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer select-none text-xs text-[#6b5c57] hover:text-[#c9b8b2]">
        Turn down…
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="registrationId" value={r.id} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">
            Reason · the family reads this, word for word
          </span>
          <textarea
            name="reason"
            rows={2}
            maxLength={300}
            defaultValue={suggested}
            className={INPUT}
            placeholder="Optional. Without one, they are told to contact the office."
          />
        </label>
        <button
          type="submit"
          className="rounded border border-[#6b3f3f] px-2.5 py-1 text-xs text-[#d98b8b] hover:bg-[#2a1c1c]"
        >
          Turn this application down
        </button>
        <Alert state={state} />
      </form>
    </details>
  );
}

function Decided({ rows }: { rows: DecidedRow[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-[#9c8c86]">Decided recently</h2>
      <div className={`overflow-x-auto rounded ${SURFACE}`}>
        <table className="w-full text-left text-xs">
          <thead className="text-[#6b5c57]">
            <tr>
              <th className="px-4 py-2 font-semibold">When</th>
              <th className="px-4 py-2 font-semibold">Child</th>
              <th className="px-4 py-2 font-semibold">School</th>
              <th className="px-4 py-2 font-semibold">Decision</th>
              <th className="px-4 py-2 font-semibold">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2321]">
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="whitespace-nowrap px-4 py-2 text-[#9c8c86]">
                  {new Date(d.decided_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  })}
                </td>
                <td className="px-4 py-2 text-[#e8e0dc]">
                  {d.name} <span className="text-[#6b5c57]">· {d.class}</span>
                </td>
                <td className="px-4 py-2 text-[#9c8c86]">{d.school_name}</td>
                <td className="px-4 py-2">
                  {d.status === "approved" ? (
                    <span className="text-[#8fbfae]">
                      Approved · <span className="font-mono">{d.uid}</span>
                    </span>
                  ) : (
                    <span className="text-[#d98b8b]" title={d.reason ?? undefined}>
                      Turned down{d.reason ? " · with reason" : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-[#9c8c86]">{d.decided_by_name ?? d.decided_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pair({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    // A <div>, not a <span>: it is the only element permitted to wrap a dt/dd
    // pair inside a <dl>.
    <div className="inline-block">
      <dt className="inline text-[#6b5c57]">{k} </dt>
      <dd className={`inline text-[#c9b8b2] ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}

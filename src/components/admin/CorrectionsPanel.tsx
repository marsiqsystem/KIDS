"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import {
  approveCorrectionAction,
  approveCorrectionsAction,
  rejectCorrectionAction,
  rejectCorrectionsAction,
} from "@/app/admin/actions";
import type { PendingCorrection } from "@/lib/admin/corrections";
import {
  Alert,
  BulkAction,
  BulkBar,
  BulkReject,
  INPUT,
  RowAction,
  SURFACE,
  Tick,
  TickAll,
  useSelection,
  type Selection,
} from "./ui";

const LABEL: Record<PendingCorrection["field"], string> = {
  name: "Name",
  dob: "Date of birth",
  class: "Class",
  stream: "Stream",
  school: "School",
};

/**
 * Corrections — students saying a detail on their record is wrong.
 *
 * Shown as what the register says against what the student says, one field at a
 * time, because a request to change a name and a class is two questions and the
 * office may be sure of only one. Approving changes the register immediately and
 * is re-applied after every reseed; the export at the top is how the master
 * workbook is brought into line so the two stop disagreeing.
 *
 * Fields can be ticked -- one, a student's, or all -- and changed or left
 * together.
 */
export default function CorrectionsPanel({ pending }: { pending: PendingCorrection[] }) {
  const byStudent = new Map<string, PendingCorrection[]>();
  for (const c of pending) byStudent.set(c.uid, [...(byStudent.get(c.uid) ?? []), c]);
  const sel = useSelection(pending.map((c) => c.id));
  const n = sel.selected.length;

  return (
    <div className="space-y-6">
      <section className={`flex flex-wrap items-center gap-4 rounded p-5 ${SURFACE}`}>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">
            {pending.length === 0 ? "Nothing waiting" : `${pending.length} waiting from ${byStudent.size} ${byStudent.size === 1 ? "student" : "students"}`}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#6B5B5D]">
            Approving changes the register at once, and survives a reseed. The master workbook does
            not change by itself: export the approved corrections and apply them there, or the two
            will disagree about these children.
          </p>
        </div>
        <a
          href="/admin/export/corrections"
          className="inline-flex items-center gap-2 rounded border border-[#E3D6C4] px-3 py-2 text-xs text-[#4A3A3C] hover:bg-[#F6E9E9]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export approved corrections (CSV)
        </a>
      </section>

      {pending.length > 0 ? (
        <div className="flex flex-wrap items-center gap-4 px-1">
          <TickAll sel={sel} ids={pending.map((c) => c.id)} label={`Select all ${pending.length}`} />
          <div className="ml-auto">
            <BulkAction
              action={approveCorrectionsAction}
              ids={pending.map((c) => c.id)}
              confirm={
                `Change the register for all ${pending.length} waiting corrections?` +
                (pending.length > 60 ? `\n\nSixty are changed per press; press it again for the rest.` : "")
              }
            >
              Change all {pending.length}
            </BulkAction>
          </div>
        </div>
      ) : null}

      <BulkBar sel={sel} noun={["correction", "corrections"]}>
        <BulkAction
          action={approveCorrectionsAction}
          ids={sel.selected}
          primary
          confirm={`Change the register for ${n} selected ${n === 1 ? "correction" : "corrections"}?`}
        >
          Change {n}
        </BulkAction>
        <BulkReject action={rejectCorrectionsAction} ids={sel.selected} noun="corrections" reader="the students" />
      </BulkBar>

      {[...byStudent.entries()].map(([uid, rows]) => (
        <section key={uid} className={`rounded ${SURFACE}`}>
          <header className="flex items-start gap-3 border-b border-[#F2E9DA] px-5 py-3">
            <TickAll sel={sel} ids={rows.map((c) => c.id)} label="" />
            <div>
              <h3 className="text-sm font-bold">
                {rows[0].student_name} <span className="font-mono text-xs font-normal text-[#6B5B5D]">{uid}</span>
              </h3>
              <p className="text-xs text-[#6B5B5D]">
                Class {rows[0].class} · {rows[0].school_name}
              </p>
            </div>
          </header>
          <ul className="divide-y divide-[#F2E9DA]">
            {rows.map((c) => (
              <Row key={c.id} c={c} sel={sel} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ c, sel }: { c: PendingCorrection; sel: Selection }) {
  const [state, reject] = useActionState(rejectCorrectionAction, {});
  const was = c.field === "school" ? (c.old_label ?? c.old_value) : c.old_value;
  const now = c.field === "school" ? (c.new_label ?? c.new_value) : c.new_value;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <Tick sel={sel} id={c.id} label={`Select ${LABEL[c.field]} for ${c.student_name}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#6B5B5D]">{LABEL[c.field]}</p>
          <p className="mt-1 text-sm">
            <span className="text-[#6B5B5D] line-through decoration-[#E8C9CC]">{was || "— not on the register —"}</span>
            <span className="mx-2 text-[#6B5B5D]">→</span>
            <span className="font-semibold text-[#2B1A1C]">{now}</span>
          </p>
          {c.field === "class" ? (
            <p className="mt-1 text-xs text-[#8A6D1F]">
              Changes which Phase 2 paper they are given. Their Phase 1 marks stay against the paper they sat.
            </p>
          ) : null}
          {c.note ? <p className="mt-2 text-xs italic text-[#6B5B5D]">&ldquo;{c.note}&rdquo;</p> : null}
        </div>
        <RowAction action={approveCorrectionAction} fields={{ correctionId: c.id }} primary>
          Change it
        </RowAction>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-xs text-[#6B5B5D] hover:text-[#4A3A3C]">Leave as it is…</summary>
        <form action={reject} className="mt-2 space-y-2">
          <input type="hidden" name="correctionId" value={c.id} />
          <textarea name="reason" rows={2} maxLength={300} className={INPUT} placeholder="Reason · the student reads this" />
          <button type="submit" className="rounded border border-[#E8C9CC] px-2.5 py-1 text-xs text-[#B22234] hover:bg-[#FBE9EA]">
            Leave the register as it is
          </button>
          <Alert state={state} />
        </form>
      </details>
    </li>
  );
}

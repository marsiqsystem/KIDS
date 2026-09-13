"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { approveCorrectionAction, rejectCorrectionAction } from "@/app/admin/actions";
import type { PendingCorrection } from "@/lib/admin/corrections";
import { Alert, INPUT, RowAction, SURFACE } from "./ui";

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
 */
export default function CorrectionsPanel({ pending }: { pending: PendingCorrection[] }) {
  const byStudent = new Map<string, PendingCorrection[]>();
  for (const c of pending) byStudent.set(c.uid, [...(byStudent.get(c.uid) ?? []), c]);

  return (
    <div className="space-y-6">
      <section className={`flex flex-wrap items-center gap-4 rounded p-5 ${SURFACE}`}>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">
            {pending.length === 0 ? "Nothing waiting" : `${pending.length} waiting from ${byStudent.size} ${byStudent.size === 1 ? "student" : "students"}`}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#6b5c57]">
            Approving changes the register at once, and survives a reseed. The master workbook does
            not change by itself: export the approved corrections and apply them there, or the two
            will disagree about these children.
          </p>
        </div>
        <a
          href="/admin/export/corrections"
          className="inline-flex items-center gap-2 rounded border border-[#3a2f2c] px-3 py-2 text-xs text-[#c9b8b2] hover:bg-[#241c1a]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export approved corrections (CSV)
        </a>
      </section>

      {[...byStudent.entries()].map(([uid, rows]) => (
        <section key={uid} className={`rounded ${SURFACE}`}>
          <header className="border-b border-[#2a2321] px-5 py-3">
            <h3 className="text-sm font-bold">
              {rows[0].student_name} <span className="font-mono text-xs font-normal text-[#6b5c57]">{uid}</span>
            </h3>
            <p className="text-xs text-[#6b5c57]">
              Class {rows[0].class} · {rows[0].school_name}
            </p>
          </header>
          <ul className="divide-y divide-[#2a2321]">
            {rows.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ c }: { c: PendingCorrection }) {
  const [state, reject] = useActionState(rejectCorrectionAction, {});
  const was = c.field === "school" ? (c.old_label ?? c.old_value) : c.old_value;
  const now = c.field === "school" ? (c.new_label ?? c.new_value) : c.new_value;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#9c8c86]">{LABEL[c.field]}</p>
          <p className="mt-1 text-sm">
            <span className="text-[#9c8c86] line-through decoration-[#6b3f3f]">{was || "— not on the register —"}</span>
            <span className="mx-2 text-[#6b5c57]">→</span>
            <span className="font-semibold text-[#e8e0dc]">{now}</span>
          </p>
          {c.field === "class" ? (
            <p className="mt-1 text-xs text-[#d9b877]">
              Changes which Phase 2 paper they are given. Their Phase 1 marks stay against the paper they sat.
            </p>
          ) : null}
          {c.note ? <p className="mt-2 text-xs italic text-[#9c8c86]">&ldquo;{c.note}&rdquo;</p> : null}
        </div>
        <RowAction action={approveCorrectionAction} fields={{ correctionId: c.id }} primary>
          Change it
        </RowAction>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer select-none text-xs text-[#6b5c57] hover:text-[#c9b8b2]">Leave as it is…</summary>
        <form action={reject} className="mt-2 space-y-2">
          <input type="hidden" name="correctionId" value={c.id} />
          <textarea name="reason" rows={2} maxLength={300} className={INPUT} placeholder="Reason · the student reads this" />
          <button type="submit" className="rounded border border-[#6b3f3f] px-2.5 py-1 text-xs text-[#d98b8b] hover:bg-[#2a1c1c]">
            Leave the register as it is
          </button>
          <Alert state={state} />
        </form>
      </details>
    </li>
  );
}

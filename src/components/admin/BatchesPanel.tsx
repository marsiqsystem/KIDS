"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderPlus, UsersRound } from "lucide-react";
import {
  addToBatch,
  archiveBatch,
  assignToBatch,
  newBatch,
  removeFromBatch,
  unassignFromBatch,
} from "@/app/admin/actions";
import type { StaffListRow } from "@/lib/admin/staff";
import type { Batch } from "@/lib/admin/batches";
import type { OpenBatch } from "./ControlCentre";
import { Alert, Field, RowAction, Submit, INPUT, SURFACE } from "./ui";

const n = (x: number) => x.toLocaleString("en-IN");

/**
 * Batches and their rosters.
 *
 * Everything on this screen is rows in the database. There is no list of
 * batches in the source, and creating one deploys nothing — which is the whole
 * point. export_for_web.py and make_results_xlsx.py each hardcode their batch
 * names, and a batch added to one but not the other vanishes from the results
 * with no error at all. That trap does not get rebuilt here.
 */
export default function BatchesPanel({
  batches,
  open,
  teachers,
  canEdit,
}: {
  batches: Batch[];
  open: OpenBatch | null;
  teachers: StaffListRow[];
  canEdit: boolean;
}) {
  if (open) return <BatchDetail open={open} teachers={teachers} canEdit={canEdit} />;

  const live = batches.filter((b) => !b.archived_at);
  const retired = batches.filter((b) => b.archived_at);

  return (
    <div className="space-y-6">
      {canEdit ? <CreateBatch /> : null}

      <BatchList title="Live batches" batches={live} empty="No batches yet." canEdit={canEdit} />
      {retired.length > 0 ? (
        <BatchList title="Retired" batches={retired} empty="" canEdit={canEdit} />
      ) : null}
    </div>
  );
}

function CreateBatch() {
  const [state, action] = useActionState(newBatch, {});

  return (
    <section className={`rounded p-5 ${SURFACE}`}>
      <div className="mb-4 flex items-center gap-2">
        <FolderPlus className="h-4 w-4 text-[#7B1E2B]" aria-hidden />
        <h2 className="text-sm font-bold">Create a batch</h2>
      </div>

      <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Name" name="name" required placeholder="Class X — Morning" />
        <Field label="Class (optional)" name="classLabel" placeholder="X" />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Medium (optional)</span>
          <select name="medium" defaultValue="" className={INPUT}>
            <option value="">Any / mixed</option>
            <option value="HINDI">Hindi</option>
            <option value="BENGALI">Bengali</option>
            <option value="URDU">Urdu</option>
          </select>
        </label>
        <Field label="Note (optional)" name="notes" placeholder="Mon/Wed/Fri, 6 pm" />
        <div className="flex items-end">
          <Submit>Create</Submit>
        </div>
      </form>

      <div className="mt-3">
        <Alert state={state} />
      </div>
    </section>
  );
}

function BatchList({
  title,
  batches,
  empty,
  canEdit,
}: {
  title: string;
  batches: Batch[];
  empty: string;
  canEdit: boolean;
}) {
  return (
    <section className="rounded border border-[#F2E9DA] bg-[#FFFFFF]">
      <h2 className="border-b border-[#F2E9DA] px-4 py-3 text-sm font-bold">{title}</h2>
      {batches.length === 0 ? (
        <p className="px-4 py-4 text-sm text-[#6B5B5D]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#F2E9DA]">
          {batches.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <Link
                href={`/admin?tab=batches&batch=${b.id}`}
                className="text-sm font-semibold underline"
              >
                {b.name}
              </Link>
              <span className="text-xs text-[#6B5B5D]">
                {b.class_label ? `Class ${b.class_label} · ` : ""}
                {b.medium ? `${b.medium.toLowerCase()} · ` : ""}
                {n(b.student_count)} student{b.student_count === 1 ? "" : "s"} ·{" "}
                {n(b.teacher_count)} teacher{b.teacher_count === 1 ? "" : "s"}
                {b.notes ? ` · ${b.notes}` : ""}
              </span>
              {canEdit ? (
                <span className="ml-auto">
                  <RowAction
                    action={archiveBatch}
                    fields={{ batchId: b.id, archive: b.archived_at ? "0" : "1" }}
                    confirm={
                      b.archived_at
                        ? undefined
                        : `Retire “${b.name}”? Its roster is kept, and it stops appearing as a live batch.`
                    }
                  >
                    {b.archived_at ? "Reopen" : "Retire"}
                  </RowAction>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- detail --- */

function BatchDetail({
  open,
  teachers,
  canEdit,
}: {
  open: OpenBatch;
  teachers: StaffListRow[];
  canEdit: boolean;
}) {
  const { batch, members, teachers: assigned } = open;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin?tab=batches"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B5B5D] hover:text-[#4A3A3C]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          All batches
        </Link>
        <h2 className="mt-2 text-lg font-bold">{batch.name}</h2>
        <p className="text-xs text-[#6B5B5D]">
          {batch.class_label ? `Class ${batch.class_label} · ` : ""}
          {batch.medium ? `${batch.medium.toLowerCase()} · ` : ""}
          {n(members.length)} student{members.length === 1 ? "" : "s"}
          {batch.notes ? ` · ${batch.notes}` : ""}
          {batch.archived_at ? " · retired" : ""}
        </p>
      </div>

      <TeachersOnBatch batch={batch} assigned={assigned} teachers={teachers} canEdit={canEdit} />
      {canEdit ? <AddStudents batchId={batch.id} /> : null}

      <section className="overflow-x-auto rounded border border-[#F2E9DA] bg-[#FFFFFF]">
        <h3 className="flex items-center gap-2 border-b border-[#F2E9DA] px-4 py-3 text-sm font-bold">
          <UsersRound className="h-4 w-4 text-[#7B1E2B]" aria-hidden />
          Roster
        </h3>
        {members.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[#6B5B5D]">Nobody in this batch yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#F2E9DA] text-xs text-[#6B5B5D]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">User ID</th>
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Class</th>
                <th className="px-3 py-2 text-left font-semibold">School</th>
                {canEdit ? <th className="px-3 py-2 text-left font-semibold" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9DA]">
              {members.map((m) => (
                <tr key={m.uid}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{m.uid}</td>
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2 text-xs">{m.class}</td>
                  <td className="px-3 py-2 text-xs text-[#6B5B5D]">{m.school_name}</td>
                  {canEdit ? (
                    <td className="px-3 py-2">
                      <RowAction
                        action={removeFromBatch}
                        fields={{ batchId: batch.id, uid: m.uid }}
                        danger
                        confirm={`Take ${m.name} out of ${batch.name}?`}
                      >
                        Remove
                      </RowAction>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function TeachersOnBatch({
  batch,
  assigned,
  teachers,
  canEdit,
}: {
  batch: Batch;
  assigned: OpenBatch["teachers"];
  teachers: StaffListRow[];
  canEdit: boolean;
}) {
  const [state, action] = useActionState(assignToBatch, {});
  const free = teachers.filter((t) => !assigned.some((a) => a.staff_id === t.staff_id));

  return (
    <section className={`rounded p-5 ${SURFACE}`}>
      <h3 className="mb-3 text-sm font-bold">Teachers</h3>

      {assigned.length === 0 ? (
        <p className="text-sm text-[#6B5B5D]">Nobody is assigned to this batch yet.</p>
      ) : (
        <ul className="space-y-2">
          {assigned.map((t) => (
            <li key={`${t.staff_id}-${t.subject ?? ""}`} className="flex items-center gap-3 text-sm">
              <span>{t.full_name}</span>
              <span className="font-mono text-xs text-[#6B5B5D]">{t.staff_id}</span>
              {t.subject ? <span className="text-xs text-[#6B5B5D]">{t.subject}</span> : null}
              {canEdit ? (
                <span className="ml-auto">
                  <RowAction
                    action={unassignFromBatch}
                    fields={{ batchId: batch.id, staffId: t.staff_id }}
                  >
                    Remove
                  </RowAction>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit && free.length > 0 ? (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="batchId" value={batch.id} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Assign a teacher</span>
            <select name="staffId" defaultValue="" className={INPUT}>
              <option value="">Choose…</option>
              {free.map((t) => (
                <option key={t.staff_id} value={t.staff_id}>
                  {t.full_name} ({t.staff_id})
                </option>
              ))}
            </select>
          </label>
          <Field label="Subject (optional)" name="subject" placeholder="Mathematics" />
          <Submit>Assign</Submit>
        </form>
      ) : null}

      <div className="mt-3">
        <Alert state={state} />
      </div>
    </section>
  );
}

/**
 * Add students by pasting their User IDs.
 *
 * The office works off a printout or a WhatsApp message, so anything that is
 * not a digit is treated as a separator. Unknown IDs are named back rather than
 * dropped — a nine-digit number matching nobody is exactly what a typo makes,
 * and it has to be visible.
 */
function AddStudents({ batchId }: { batchId: string }) {
  const [state, action] = useActionState(addToBatch, {});

  return (
    <section className={`rounded p-5 ${SURFACE}`}>
      <h3 className="mb-3 text-sm font-bold">Add students</h3>
      <form action={action} className="space-y-3">
        <input type="hidden" name="batchId" value={batchId} />
        <textarea
          name="uids"
          rows={3}
          placeholder="Paste User IDs — commas, spaces or new lines all work"
          className="w-full rounded border border-[#E3D6C4] bg-[#FDFBF7] px-3 py-2 font-mono text-sm
                     text-[#2B1A1C] outline-none placeholder:font-sans placeholder:text-[#6B5B5D]
                     focus:border-[#7B1E2B]"
        />
        <Submit>Add to batch</Submit>
        <Alert state={state} />
      </form>
    </section>
  );
}

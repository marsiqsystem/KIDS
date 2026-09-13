"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  assignInvigilatorAction,
  createMockAction,
  unassignInvigilatorAction,
  schedulePaperAction,
  setResultsAction,
  unschedulePaperAction,
} from "@/app/admin/actions";
import type { AdminPaper, CentreRow } from "@/lib/admin/exams";
import { Alert, Field, INPUT, RowAction, Submit, SURFACE } from "./ui";

const n = (x: number) => x.toLocaleString("en-IN");
const CLASSES = ["IX", "X", "XI", "XII"];

function ist(d: Date | null, withDate = true): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    ...(withDate ? { day: "numeric", month: "short", year: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/* ------------------------------------------------------------------ Exams --- */

/**
 * Exams — the sittings, and when each one opens.
 *
 * Phase 1 is shown and cannot be touched: it is the record of 19 July. Phase 2
 * and every mock can be scheduled, and each says plainly whether its questions
 * are loaded -- because a paper with a date and no questions does not open, and
 * the office should find that out here rather than at a centre in December.
 */
export function ExamsPanel({
  papers,
  staff,
  centres,
}: {
  papers: AdminPaper[];
  staff: { staff_id: string; full_name: string }[];
  centres: { centre_code: string; centre_name: string }[];
}) {
  const phase1 = papers.filter((p) => p.phase_code === "P1");
  const later = papers.filter((p) => p.phase_code !== "P1");

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">Phase 2 and mocks</h2>
          <Link href="/admin/desk" className="text-xs text-[#c9b8b2] underline-offset-2 hover:underline">
            Open the exam desks →
          </Link>
        </div>
        <div className="space-y-3">
          {later.map((p) => (
            <PaperCard key={p.id} p={p} staff={staff} centres={centres} />
          ))}
        </div>
      </section>

      <NewMock />

      <section>
        <h2 className="mb-2 text-sm font-bold text-[#9c8c86]">Phase 1 · sat 19 July 2026</h2>
        <div className={`overflow-x-auto rounded ${SURFACE}`}>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-[#2a2321] tabular-nums">
              {phase1.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-[#e8e0dc]">{p.name}</td>
                  <td className="px-4 py-2 text-[#9c8c86]">/{p.max_marks}</td>
                  <td className="px-4 py-2 text-[#9c8c86]">{n(p.results)} marked</td>
                  <td className="px-4 py-2 text-[#6b5c57]">{p.counts_for_award ? "Counts for the award" : "Not in the award"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PaperCard({
  p,
  staff,
  centres,
}: {
  p: AdminPaper;
  staff: { staff_id: string; full_name: string }[];
  centres: { centre_code: string; centre_name: string }[];
}) {
  const [state, action] = useActionState(schedulePaperAction, {});
  const scheduled = Boolean(p.starts_at);
  const allLoaded = p.loaded.length === CLASSES.length;
  const locked = p.attempts > 0;

  const startIst = p.starts_at
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(p.starts_at))
    : "";
  const timeIst = p.starts_at
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(p.starts_at))
    : "10:30";
  const lead = p.starts_at && p.scan_opens_at
    ? Math.round((new Date(p.starts_at).getTime() - new Date(p.scan_opens_at).getTime()) / 60000)
    : 60;

  return (
    <article className={`rounded ${SURFACE}`}>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[#2a2321] px-5 py-3">
        <h3 className="text-sm font-bold">{p.name}</h3>
        <span className="font-mono text-xs text-[#6b5c57]">{p.code}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.kind === "mock" ? "bg-[#23262e] text-[#9fb0d9]" : "bg-[#2a2220] text-[#c9b8b2]"}`}>
          {p.kind === "mock" ? "Mock · counts nowhere" : p.counts_for_award ? "Live · counts for the award" : "Live"}
        </span>
        <span className="ml-auto text-xs text-[#9c8c86]">
          {scheduled ? `Opens ${ist(p.starts_at)} · ${p.duration_minutes} min` : "Not scheduled"}
        </span>
      </header>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#6b5c57]">Questions loaded:</span>
          {CLASSES.map((c) => (
            <span
              key={c}
              className={`rounded px-1.5 py-0.5 font-mono ${p.loaded.includes(c) ? "bg-[#1c2a24] text-[#8fbfae]" : "bg-[#2a1c1c] text-[#d98b8b]"}`}
            >
              {c}
            </span>
          ))}
          {!allLoaded ? (
            <span className="text-[#d9b877]">
              A class without questions sees &ldquo;no paper is open&rdquo;, whatever the date says.
            </span>
          ) : null}
        </div>
        {p.sets.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9c8c86]">
            {p.sets.map((x) => (
              <li key={x.code}>
                <span className="font-mono text-[#c9b8b2]">{x.code}</span> · {x.question_count} questions
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#6b5c57]">
            Questions are loaded from a file on the office laptop, never from GitHub:{" "}
            <span className="font-mono">scripts/load-question-set.ts</span>.
          </p>
        )}

        {locked ? (
          <p className="text-xs text-[#9c8c86]">{n(p.attempts)} students have started this paper, so its window can no longer move.</p>
        ) : (
          <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <input type="hidden" name="paperId" value={p.id} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Date</span>
              <input type="date" name="date" defaultValue={startIst} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Paper opens (IST)</span>
              <input type="time" name="time" defaultValue={timeIst} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Minutes</span>
              <input type="number" name="duration" min={5} max={240} defaultValue={p.duration_minutes ?? 60} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Check-in opens (min before)</span>
              <input type="number" name="lead" min={0} max={180} defaultValue={lead} className={INPUT} />
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs text-[#c9b8b2]">
              <input type="checkbox" name="checkin" defaultChecked={p.requires_checkin} />
              Scan in at a centre first
            </label>
            <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-5">
              <Submit>{scheduled ? "Move the window" : "Schedule"}</Submit>
              {scheduled ? (
                <RowAction action={unschedulePaperAction} fields={{ paperId: p.id }} confirm="Take this paper off the calendar?">
                  Unschedule
                </RowAction>
              ) : null}
              <Alert state={state} />
            </div>
          </form>
        )}

        {p.requires_checkin ? <Invigilators p={p} staff={staff} centres={centres} /> : null}
      </div>
    </article>
  );
}

function Invigilators({
  p,
  staff,
  centres,
}: {
  p: AdminPaper;
  staff: { staff_id: string; full_name: string }[];
  centres: { centre_code: string; centre_name: string }[];
}) {
  const [state, action] = useActionState(assignInvigilatorAction, {});
  const staffed = new Set(p.invigilators.map((i) => i.centre_code));
  const unstaffed = centres.filter((c) => !staffed.has(c.centre_code));

  return (
    <div className="border-t border-[#2a2321] pt-4">
      <h4 className="text-xs font-semibold text-[#9c8c86]">
        Desks · {staffed.size} of {centres.length} centres have an invigilator
      </h4>
      {unstaffed.length > 0 && unstaffed.length < centres.length ? (
        <p className="mt-1 text-xs text-[#d9b877]">
          No one yet at {unstaffed.map((c) => c.centre_code).join(", ")}. An admin can run any desk meanwhile.
        </p>
      ) : null}

      {p.invigilators.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {p.invigilators.map((i) => (
            <li key={`${i.centre_code}|${i.staff_id}`} className="flex items-center gap-1 rounded border border-[#3a2f2c] px-2 py-1 text-xs">
              <span className="font-mono text-[#6b5c57]">{i.centre_code}</span>
              <span className="text-[#c9b8b2]">{i.full_name}</span>
              <RowAction
                action={unassignInvigilatorAction}
                fields={{ paperId: p.id, centre: i.centre_code, staffId: i.staff_id }}
              >
                ×
              </RowAction>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="paperId" value={p.id} />
        <select name="centre" className={`${INPUT} max-w-[14rem]`} defaultValue="">
          <option value="">Centre…</option>
          {centres.map((c) => (
            <option key={c.centre_code} value={c.centre_code}>
              {c.centre_code} · {c.centre_name}
            </option>
          ))}
        </select>
        <select name="staffId" className={`${INPUT} max-w-[14rem]`} defaultValue="">
          <option value="">Invigilator…</option>
          {staff.map((s) => (
            <option key={s.staff_id} value={s.staff_id}>
              {s.full_name} · {s.staff_id}
            </option>
          ))}
        </select>
        <Submit>Assign</Submit>
        <Alert state={state} />
      </form>
    </div>
  );
}

function NewMock() {
  const [state, action] = useActionState(createMockAction, {});
  return (
    <section className={`rounded p-5 ${SURFACE}`}>
      <h2 className="text-sm font-bold">New mock test</h2>
      <p className="mt-1 max-w-3xl text-xs text-[#6b5c57]">
        Sat, marked and shown to the student exactly like the real paper, and counted in no award and
        no total. The November full-size rehearsal is one of these.
      </p>
      <form action={action} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <Field label="Name students will see" name="name" placeholder="Phase 2 rehearsal" />
        <Field label="Marks" name="maxMarks" type="number" defaultValue="100" />
        <label className="flex items-end gap-2 pb-2 text-xs text-[#c9b8b2]">
          <input type="checkbox" name="checkin" defaultChecked />
          Scan in at a centre
        </label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <Submit>Create the mock</Submit>
          <Alert state={state} />
        </div>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- Results --- */

/**
 * Results — whether students can see each paper's marks.
 *
 * Reads and writes exactly what the result pages read, which for Phase 1 is
 * still `results_meta`. Withdrawing hides every child's result for that paper at
 * once, including on the public lookup, so the button asks first.
 */
export function ResultsPanel({ papers }: { papers: AdminPaper[] }) {
  return (
    <div className="space-y-3">
      {papers.map((p) => {
        const p1 = p.phase_code === "P1";
        return (
          <article key={p.id} className={`flex flex-wrap items-center gap-x-6 gap-y-3 rounded px-5 py-4 ${SURFACE}`}>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold">{p.name}</h3>
              <p className="text-xs text-[#6b5c57]">
                {n(p.results)} marked{p.kind === "mock" ? " · mock" : ""}
              </p>
            </div>
            <span className={`text-xs font-semibold ${p.visible ? "text-[#8fbfae]" : "text-[#9c8c86]"}`}>
              {p.visible ? "Students can see these" : "Not published"}
            </span>
            {p1 ? (
              p.visible ? (
                <RowAction
                  action={setResultsAction}
                  fields={{ paperId: p.id, visible: "0" }}
                  danger
                  confirm={`Withdraw ${p.name}?\n\n${n(p.results)} students will see "results are not published" instead of their marks — on the app, the portal and the public lookup — until it is published again.`}
                >
                  Withdraw
                </RowAction>
              ) : (
                <RowAction
                  action={setResultsAction}
                  fields={{ paperId: p.id, visible: "1" }}
                  primary
                  confirm={`Publish ${p.name} to ${n(p.results)} students now?`}
                >
                  Publish now
                </RowAction>
              )
            ) : (
              <span className="max-w-xs text-xs text-[#6b5c57]">
                {p.results === 0 ? "No marks yet." : ""} Publishing this paper arrives with Phase 2 marking.
              </span>
            )}
          </article>
        );
      })}
      <p className="pt-2 text-xs text-[#6b5c57]">
        For a ceremony, the hold-to-publish stage screen at <span className="font-mono">/stage</span> still works.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Centres --- */

/**
 * Centres — a planning sheet for December.
 *
 * Seats from enrolment, turnout from July, and who can sit a paper in the app
 * from claims, side by side. Which invigilator runs which room, and the live
 * attendance board for the desk QR, belong with the check-in itself and are not
 * on this screen yet.
 */
export function CentresPanel({ centres }: { centres: CentreRow[] }) {
  const sum = (k: keyof CentreRow) => centres.reduce((a, c) => a + (c[k] as number), 0);
  return (
    <div className="space-y-4">
      <div className={`overflow-x-auto rounded ${SURFACE}`}>
        <table className="w-full text-left text-xs">
          <thead className="text-[#6b5c57]">
            <tr>
              <th className="px-4 py-2 font-semibold">Centre</th>
              <th className="px-3 py-2 text-right font-semibold">Schools</th>
              <th className="px-3 py-2 text-right font-semibold">IX</th>
              <th className="px-3 py-2 text-right font-semibold">X</th>
              <th className="px-3 py-2 text-right font-semibold">XI</th>
              <th className="px-3 py-2 text-right font-semibold">XII</th>
              <th className="px-3 py-2 text-right font-semibold">Enrolled</th>
              <th className="px-3 py-2 text-right font-semibold">Sat in July</th>
              <th className="px-3 py-2 text-right font-semibold">On the app</th>
              <th className="px-4 py-2 text-right font-semibold">Applying</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2321] tabular-nums">
            {centres.map((c) => (
              <tr key={c.centre_code}>
                <td className="px-4 py-2">
                  <span className="font-mono text-[#6b5c57]">{c.centre_code}</span>{" "}
                  <span className="text-[#e8e0dc]">{c.centre_name}</span>
                </td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{c.schools}</td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{n(c.ix)}</td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{n(c.x)}</td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{n(c.xi)}</td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{n(c.xii)}</td>
                <td className="px-3 py-2 text-right text-[#e8e0dc]">{n(c.enrolled)}</td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{n(c.sat_phase1)}</td>
                <td className="px-3 py-2 text-right text-[#9c8c86]">{n(c.claimed)}</td>
                <td className="px-4 py-2 text-right text-[#9c8c86]">{c.applications ? n(c.applications) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-[#3a2f2c] font-semibold tabular-nums">
            <tr>
              <td className="px-4 py-2 text-[#c9b8b2]">All {centres.length} centres</td>
              <td className="px-3 py-2 text-right">{sum("schools")}</td>
              <td className="px-3 py-2 text-right">{n(sum("ix"))}</td>
              <td className="px-3 py-2 text-right">{n(sum("x"))}</td>
              <td className="px-3 py-2 text-right">{n(sum("xi"))}</td>
              <td className="px-3 py-2 text-right">{n(sum("xii"))}</td>
              <td className="px-3 py-2 text-right">{n(sum("enrolled"))}</td>
              <td className="px-3 py-2 text-right">{n(sum("sat_phase1"))}</td>
              <td className="px-3 py-2 text-right">{n(sum("claimed"))}</td>
              <td className="px-4 py-2 text-right">{n(sum("applications"))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-[#6b5c57]">
        Invigilators, rooms and the live attendance board arrive with the desk QR check-in.
      </p>
    </div>
  );
}

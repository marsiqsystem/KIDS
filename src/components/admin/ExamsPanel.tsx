"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  assignInvigilatorAction,
  computeAwardAction,
  createMockAction,
  markPaperAction,
  setAwardRuleAction,
  setAwardVisibleAction,
  unassignInvigilatorAction,
  schedulePaperAction,
  setResultsAction,
  unschedulePaperAction,
} from "@/app/admin/actions";
import type { AdminPaper, AwardState, CentreRow } from "@/lib/admin/exams";
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
          <Link href="/admin/desk" className="text-xs text-[#4A3A3C] underline-offset-2 hover:underline">
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
        <h2 className="mb-2 text-sm font-bold text-[#6B5B5D]">Phase 1 · sat 19 July 2026</h2>
        <div className={`overflow-x-auto rounded ${SURFACE}`}>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-[#F2E9DA] tabular-nums">
              {phase1.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-[#2B1A1C]">{p.name}</td>
                  <td className="px-4 py-2 text-[#6B5B5D]">/{p.max_marks}</td>
                  <td className="px-4 py-2 text-[#6B5B5D]">{n(p.results)} marked</td>
                  <td className="px-4 py-2 text-[#6B5B5D]">{p.counts_for_award ? "Counts for the award" : "Not in the award"}</td>
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
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[#F2E9DA] px-5 py-3">
        <h3 className="text-sm font-bold">{p.name}</h3>
        <span className="font-mono text-xs text-[#6B5B5D]">{p.code}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.kind === "mock" ? "bg-[#E9EEF8] text-[#1E4DA1]" : "bg-[#FBF7EF] text-[#4A3A3C]"}`}>
          {p.kind === "mock" ? "Mock · counts nowhere" : p.counts_for_award ? "Live · counts for the award" : "Live"}
        </span>
        <span className="ml-auto text-xs text-[#6B5B5D]">
          {scheduled ? `Opens ${ist(p.starts_at)} · ${p.duration_minutes} min` : "Not scheduled"}
        </span>
      </header>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#6B5B5D]">Questions loaded:</span>
          {CLASSES.map((c) => (
            <span
              key={c}
              className={`rounded px-1.5 py-0.5 font-mono ${p.loaded.includes(c) ? "bg-[#E6F5F2] text-[#137565]" : "bg-[#FBE9EA] text-[#B22234]"}`}
            >
              {c}
            </span>
          ))}
          {!allLoaded ? (
            <span className="text-[#8A6D1F]">
              A class without questions sees &ldquo;no paper is open&rdquo;, whatever the date says.
            </span>
          ) : null}
        </div>
        {p.sets.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B5B5D]">
            {p.sets.map((x) => (
              <li key={x.code}>
                <span className="font-mono text-[#4A3A3C]">{x.code}</span> · {x.question_count} questions
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#6B5B5D]">
            Questions are loaded from a file on the office laptop, never from GitHub:{" "}
            <span className="font-mono">scripts/load-question-set.ts</span>.
          </p>
        )}

        {locked ? (
          <p className="text-xs text-[#6B5B5D]">{n(p.attempts)} students have started this paper, so its window can no longer move.</p>
        ) : (
          <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <input type="hidden" name="paperId" value={p.id} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Date</span>
              <input type="date" name="date" defaultValue={startIst} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Paper opens (IST)</span>
              <input type="time" name="time" defaultValue={timeIst} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Minutes</span>
              <input type="number" name="duration" min={5} max={240} defaultValue={p.duration_minutes ?? 60} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Check-in opens (min before)</span>
              <input type="number" name="lead" min={0} max={180} defaultValue={lead} className={INPUT} />
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs text-[#4A3A3C]">
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
    <div className="border-t border-[#F2E9DA] pt-4">
      <h4 className="text-xs font-semibold text-[#6B5B5D]">
        Desks · {staffed.size} of {centres.length} centres have an invigilator
      </h4>
      {unstaffed.length > 0 && unstaffed.length < centres.length ? (
        <p className="mt-1 text-xs text-[#8A6D1F]">
          No one yet at {unstaffed.map((c) => c.centre_code).join(", ")}. An admin can run any desk meanwhile.
        </p>
      ) : null}

      {p.invigilators.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {p.invigilators.map((i) => (
            <li key={`${i.centre_code}|${i.staff_id}`} className="flex items-center gap-1 rounded border border-[#E3D6C4] px-2 py-1 text-xs">
              <span className="font-mono text-[#6B5B5D]">{i.centre_code}</span>
              <span className="text-[#4A3A3C]">{i.full_name}</span>
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
      <p className="mt-1 max-w-3xl text-xs text-[#6B5B5D]">
        Sat, marked and shown to the student exactly like the real paper, and counted in no award and
        no total. The November full-size rehearsal is one of these.
      </p>
      <form action={action} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <Field label="Name students will see" name="name" placeholder="Phase 2 rehearsal" />
        <Field label="Marks" name="maxMarks" type="number" defaultValue="100" />
        <label className="flex items-end gap-2 pb-2 text-xs text-[#4A3A3C]">
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
 * Results — mark, check, publish. And the award.
 *
 * Three steps for every paper after July, never merged into one button:
 * marking computes results that nobody can see; the office reads what they came
 * to; publishing opens them. Phase 1 is shown with the one control it still
 * needs, and writes the columns July's result pages actually read.
 *
 * The award has one decision left in it — what to do with a student who sat
 * only one phase — and this is where it is made, looking at what each rule does
 * to the top of every list rather than at an argument about it.
 */
export function ResultsPanel({ papers, award }: { papers: AdminPaper[]; award: AwardState | null }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        {papers.map((p) => (
          <PaperResults key={p.id} p={p} />
        ))}
        <p className="pt-1 text-xs text-[#6B5B5D]">
          For a ceremony, the hold-to-publish stage screen at <span className="font-mono">/stage</span> still works for Phase 1.
        </p>
      </section>

      {award ? <AwardSection a={award} papers={papers} /> : null}
    </div>
  );
}

function PaperResults({ p }: { p: AdminPaper }) {
  const [state, mark, marking] = useActionState(markPaperAction, {});
  const p1 = p.phase_code === "P1";
  const closed = p.closed;

  return (
    <article className={`rounded px-5 py-4 ${SURFACE}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">{p.name}</h3>
          <p className="text-xs text-[#6B5B5D]">
            {p1
              ? `${n(p.results)} marked in August`
              : p.computed_at
                ? `Marked ${ist(p.computed_at)} · ${n(p.totals?.sat ?? 0)} papers`
                : p.starts_at
                  ? closed ? "Closed · not marked yet" : `Closes ${ist(p.ends_at)}`
                  : "Not scheduled"}
            {p.kind === "mock" ? " · mock" : ""}
          </p>
        </div>

        <span className={`text-xs font-semibold ${p.visible ? "text-[#137565]" : "text-[#6B5B5D]"}`}>
          {p.visible ? "Students can see these" : "Not published"}
        </span>

        {!p1 && !p.visible && closed ? (
          <form action={mark}>
            <input type="hidden" name="paperId" value={p.id} />
            <button
              type="submit"
              disabled={marking}
              className="rounded border border-[#E3D6C4] px-3 py-1.5 text-xs text-[#4A3A3C] hover:bg-[#F6E9E9] disabled:opacity-50"
            >
              {marking ? "Marking…" : p.computed_at ? "Mark again" : "Mark and rank"}
            </button>
          </form>
        ) : null}

        {p.visible ? (
          <RowAction
            action={setResultsAction}
            fields={{ paperId: p.id, visible: "0" }}
            danger
            confirm={`Withdraw ${p.name}?\n\nEvery student who sat it will see "results are not published" instead of their marks until it is published again.`}
          >
            Withdraw
          </RowAction>
        ) : p1 || p.computed_at ? (
          <RowAction
            action={setResultsAction}
            fields={{ paperId: p.id, visible: "1" }}
            primary
            confirm={`Publish ${p.name} now?\n\nEvery student who sat it sees their marks and rank the next time they open the app.`}
          >
            Publish now
          </RowAction>
        ) : null}
      </div>

      <Alert state={state} />

      {!p1 && p.totals ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="text-[#6B5B5D]">
              <tr>
                <th className="py-1 pr-4 font-semibold">Class</th>
                <th className="py-1 pr-4 text-right font-semibold">Sat</th>
                <th className="py-1 pr-4 text-right font-semibold">Average</th>
                <th className="py-1 text-right font-semibold">Highest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9DA] text-[#4A3A3C]">
              {p.totals.cohorts.map((c) => (
                <tr key={c.cohort}>
                  <td className="py-1 pr-4">{c.cohort}</td>
                  <td className="py-1 pr-4 text-right">{n(c.sat)}</td>
                  <td className="py-1 pr-4 text-right">{c.average}</td>
                  <td className="py-1 text-right">{c.highest}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.totals.finalised ? (
            <p className="mt-2 text-xs text-[#6B5B5D]">
              {n(p.totals.finalised)} papers were submitted automatically when time ran out, from the last answers saved.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AwardSection({ a, papers }: { a: AwardState; papers: AdminPaper[] }) {
  const [ruleState, setRule] = useActionState(setAwardRuleAction, {});
  const [computeState, compute, computing] = useActionState(computeAwardAction, {});
  const current = `${a.award_rule}/${a.incomplete}`;
  const stale = Boolean(a.award_computed_at) && a.award_rule_used !== current;
  const p2 = papers.find((p) => p.code === "P2-ONLINE");

  return (
    <section className={`space-y-4 rounded p-5 ${SURFACE}`}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h2 className="text-sm font-bold">{a.name} award</h2>
        <span className={`text-xs font-semibold ${a.visible ? "text-[#137565]" : "text-[#6B5B5D]"}`}>
          {a.visible ? "Published" : "Not published"}
        </span>
      </div>
      <p className="max-w-3xl text-xs leading-relaxed text-[#6B5B5D]">
        The average of each student&rsquo;s Phase 1 written mark and Phase 2 mark, both as marks out of 100.
        {p2?.computed_at ? "" : " Phase 2 must be marked before the award can be computed."}
      </p>

      <div className="rounded border border-[#E5BE7A] bg-[#FAF1DC] p-4">
        <h3 className="text-xs font-semibold text-[#8A6D1F]">A student who sat only one phase</h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#6B5B5D]">
          In September the online format scored about 8 points higher than the written paper for the same students on
          the same morning. Ranking a one-phase average beside a two-phase one can therefore put students who sat once
          above students who sat twice. The table below shows how often that happens in the real marks.
        </p>
        <form action={setRule} className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#4A3A3C]">
          <input type="hidden" name="seriesId" value={a.series_id} />
          <label className="flex items-center gap-2">
            <input type="radio" name="rule" value="alone" defaultChecked={a.incomplete === "alone"} disabled={a.award_published} />
            One list for everyone
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="rule" value="separate" defaultChecked={a.incomplete === "separate"} disabled={a.award_published} />
            Two lists: both phases, and one phase
          </label>
          {!a.award_published ? <Submit>Use this rule</Submit> : null}
          <Alert state={ruleState} />
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!a.award_published ? (
          <form action={compute}>
            <input type="hidden" name="seriesId" value={a.series_id} />
            <button
              type="submit"
              disabled={computing || !p2?.computed_at}
              className="rounded border border-[#E3D6C4] px-3 py-1.5 text-xs text-[#4A3A3C] hover:bg-[#F6E9E9] disabled:opacity-40"
            >
              {computing ? "Computing…" : a.award_computed_at ? "Compute again" : "Compute the award"}
            </button>
          </form>
        ) : null}
        {a.award_published ? (
          <RowAction action={setAwardVisibleAction} fields={{ seriesId: a.series_id, visible: "0" }} danger
            confirm="Withdraw the award? Students stop seeing their award mark and rank.">
            Withdraw the award
          </RowAction>
        ) : a.award_computed_at && !stale ? (
          <RowAction action={setAwardVisibleAction} fields={{ seriesId: a.series_id, visible: "1" }} primary
            confirm={`Publish the award to ${n(a.students)} students now?`}>
            Publish the award
          </RowAction>
        ) : null}
        <span className="text-xs text-[#6B5B5D]">
          {a.award_computed_at
            ? stale
              ? "The rule has changed since it was computed — compute again before publishing."
              : `Computed ${ist(a.award_computed_at)} for ${n(a.students)} students, as ${a.incomplete === "alone" ? "one list" : "two lists"}.`
            : "Not computed yet."}
        </span>
        <Alert state={computeState} />
      </div>

      {a.comparison?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="text-[#6B5B5D]">
              <tr>
                <th className="py-1 pr-4 font-semibold">Class</th>
                <th className="py-1 pr-4 text-right font-semibold">Sat both</th>
                <th className="py-1 pr-4 text-right font-semibold">Sat one</th>
                <th className="py-1 pr-4 text-right font-semibold">One-phase students in the top 30, if one list</th>
                <th className="py-1 text-right font-semibold">30th best two-phase mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9DA] text-[#4A3A3C]">
              {a.comparison.map((c) => (
                <tr key={c.cohort}>
                  <td className="py-1 pr-4">{c.cohort}</td>
                  <td className="py-1 pr-4 text-right">{n(c.bothPhases)}</td>
                  <td className="py-1 pr-4 text-right">{n(c.onePhase)}</td>
                  <td className={`py-1 pr-4 text-right ${c.onePhaseInTop30 > 0 ? "font-semibold text-[#8A6D1F]" : ""}`}>
                    {c.onePhaseInTop30}
                  </td>
                  <td className="py-1 text-right">{c.top30Cutoff ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
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
          <thead className="text-[#6B5B5D]">
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
          <tbody className="divide-y divide-[#F2E9DA] tabular-nums">
            {centres.map((c) => (
              <tr key={c.centre_code}>
                <td className="px-4 py-2">
                  <span className="font-mono text-[#6B5B5D]">{c.centre_code}</span>{" "}
                  <span className="text-[#2B1A1C]">{c.centre_name}</span>
                </td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{c.schools}</td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{n(c.ix)}</td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{n(c.x)}</td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{n(c.xi)}</td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{n(c.xii)}</td>
                <td className="px-3 py-2 text-right text-[#2B1A1C]">{n(c.enrolled)}</td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{n(c.sat_phase1)}</td>
                <td className="px-3 py-2 text-right text-[#6B5B5D]">{n(c.claimed)}</td>
                <td className="px-4 py-2 text-right text-[#6B5B5D]">{c.applications ? n(c.applications) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-[#E3D6C4] font-semibold tabular-nums">
            <tr>
              <td className="px-4 py-2 text-[#4A3A3C]">All {centres.length} centres</td>
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
      <p className="text-xs text-[#6B5B5D]">
        Invigilators, rooms and the live attendance board arrive with the desk QR check-in.
      </p>
    </div>
  );
}

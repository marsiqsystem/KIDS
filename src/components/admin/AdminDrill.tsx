"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2, X, ArrowLeft } from "lucide-react";

/* colours: one meaning everywhere, shared with the dashboard */
const C = { submitted: "#1e9e8c", inProgress: "#d9a441", notStarted: "#5b6b6e" };

type School = {
  schoolCode: string;
  schoolName: string;
  enrolled: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
};
type StudentRow = {
  uid: string;
  name: string;
  class: string;
  stream: string | null;
  status: string;
  answered: number;
  score: number | null;
  submittedAt: string | null;
};
type Detail = {
  student: {
    uid: string;
    name: string;
    class: string;
    stream: string | null;
    schoolName: string;
    centreCode: string;
    dob: string | null;
  };
  attempt: {
    status: string;
    paperId: string | null;
    score: number | null;
    total: number;
    answered: number;
    filled: boolean[];
    startedAt: string | null;
    submittedAt: string | null;
    deadlineAt: string | null;
    lastSyncAt: string | null;
  };
};

const n = (x: number) => x.toLocaleString("en-IN");
function istClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
function minutesBetween(a: string, b: string): string {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function statusMeta(status: string) {
  if (status === "submitted") return { label: "Submitted", color: C.submitted };
  if (status === "in_progress") return { label: "In progress", color: C.inProgress };
  return { label: "Not started", color: C.notStarted };
}

export default function AdminDrill({
  centre,
  demo,
  onClose,
}: {
  centre: { code: string; name: string };
  demo: boolean;
  onClose: () => void;
}) {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [school, setSchool] = useState<{ code: string; name: string } | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const d = demo ? "1" : "0";

  // schools for this centre
  useEffect(() => {
    setSchools(null);
    fetch(`/api/admin/schools?centre=${encodeURIComponent(centre.code)}&demo=${d}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => setSchools(j.ok ? j.schools : []))
      .catch(() => setSchools([]));
  }, [centre.code, d]);

  // students for the chosen school
  useEffect(() => {
    if (!school) return;
    setStudents(null);
    fetch(
      `/api/admin/students?centre=${encodeURIComponent(centre.code)}&school=${encodeURIComponent(
        school.code,
      )}&demo=${d}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((j) => setStudents(j.ok ? j.students : []))
      .catch(() => setStudents([]));
  }, [school, centre.code, d]);

  const openStudent = useCallback((uid: string) => {
    setDetail(null);
    setDetailLoading(true);
    fetch(`/api/admin/student?uid=${uid}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setDetail(j.ok ? j : null))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, []);

  return (
    <div>
      {/* breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[#c9b8b1] hover:text-[#ece3d8]">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All centres
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#5b4f4b]" aria-hidden="true" />
        <button
          onClick={() => setSchool(null)}
          className={school ? "text-[#c9b8b1] hover:text-[#ece3d8]" : "font-semibold text-[#ece3d8]"}
        >
          {centre.code}
        </button>
        {school && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-[#5b4f4b]" aria-hidden="true" />
            <span className="max-w-[280px] truncate font-semibold text-[#ece3d8]">{school.name}</span>
          </>
        )}
      </div>

      {/* level 2: schools */}
      {!school && (
        <section className="rounded-xl border border-[#2a2321] bg-[#181312]">
          <h2 className="border-b border-[#2a2321] px-4 py-3 text-sm font-bold">
            {centre.name}
            <span className="ml-2 font-normal text-[#8b7d78]">· tap a school</span>
          </h2>
          {!schools ? (
            <Loading />
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <Thead cols={["School", "Enrolled", "Subm.", "In prog.", "Not started"]} />
                <tbody>
                  {schools.map((s) => (
                    <tr
                      key={s.schoolCode}
                      onClick={() => setSchool({ code: s.schoolCode, name: s.schoolName })}
                      className="cursor-pointer border-t border-[#241d1b] hover:bg-[#1e1817]"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#ece3d8]">{s.schoolName}</span>
                        </div>
                        <div className="text-[0.68rem] text-[#8b7d78]">{s.schoolCode}</div>
                      </td>
                      <Num v={s.enrolled} />
                      <Num v={s.submitted} color={C.submitted} bold />
                      <Num v={s.inProgress} color={s.inProgress ? C.inProgress : "#6b5f5b"} />
                      <Num v={s.notStarted} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* level 3: students */}
      {school && (
        <section className="rounded-xl border border-[#2a2321] bg-[#181312]">
          <h2 className="border-b border-[#2a2321] px-4 py-3 text-sm font-bold">
            {school.name}
            <span className="ml-2 font-normal text-[#8b7d78]">· tap a student for detail</span>
          </h2>
          {!students ? (
            <Loading />
          ) : (
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full text-sm">
                <Thead cols={["Student", "Class", "Status", "Attempted", "Marks"]} />
                <tbody>
                  {students.map((st) => {
                    const meta = statusMeta(st.status);
                    return (
                      <tr
                        key={st.uid}
                        onClick={() => openStudent(st.uid)}
                        className="cursor-pointer border-t border-[#241d1b] hover:bg-[#1e1817]"
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-[#ece3d8]">{st.name}</div>
                          <div className="text-[0.68rem] text-[#8b7d78]">{st.uid}</div>
                        </td>
                        <td className="px-2 py-2.5 text-[#c9b8b1]">
                          {st.class}
                          {st.stream ? <span className="text-[#8b7d78]"> · {st.stream}</span> : null}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            className="rounded px-1.5 py-0.5 text-[0.66rem] font-semibold"
                            style={{ color: meta.color, background: `${meta.color}1a` }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 tabular-nums text-[#c9b8b1]">
                          {st.status === "not_started" ? "—" : `${st.answered}/50`}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold">
                          {st.score === null ? (
                            <span className="text-[#6b5f5b]">
                              {st.status === "in_progress" ? "pending" : "—"}
                            </span>
                          ) : (
                            <span style={{ color: C.submitted }}>{st.score}/50</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {(detail || detailLoading) && (
        <StudentDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setDetail(null);
            setDetailLoading(false);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------- student drawer --- */

function StudentDetail({
  detail,
  loading,
  onClose,
}: {
  detail: Detail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const a = detail?.attempt;
  const meta = a ? statusMeta(a.status) : null;

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/60 p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2321] bg-[#181312] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#2a2321] px-5 py-4">
          <div>
            <div className="text-base font-bold text-[#ece3d8]">
              {detail ? detail.student.name : "Loading…"}
            </div>
            {detail && (
              <div className="mt-0.5 text-xs text-[#8b7d78]">
                Class {detail.student.class}
                {detail.student.stream ? ` · ${detail.student.stream}` : ""} · {detail.student.centreCode}{" "}
                · {detail.student.uid}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-[#9c8c86] hover:text-[#ece3d8]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading || !detail || !a || !meta ? (
          <Loading />
        ) : (
          <div className="p-5">
            {/* headline marks */}
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Status" value={meta.label} color={meta.color} />
              <Stat
                label="Attempted"
                value={a.status === "not_started" ? "—" : `${a.answered}/${a.total}`}
              />
              <Stat
                label="Marks"
                value={a.score === null ? (a.status === "in_progress" ? "pending" : "—") : `${a.score}/${a.total}`}
                color={a.score === null ? undefined : C.submitted}
              />
            </div>

            {/* timings */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Line label="Started" value={a.startedAt ? `${istClock(a.startedAt)} IST` : "—"} />
              <Line label="Submitted" value={a.submittedAt ? `${istClock(a.submittedAt)} IST` : "—"} />
              <Line
                label="Time taken"
                value={a.startedAt && a.submittedAt ? minutesBetween(a.startedAt, a.submittedAt) : "—"}
              />
              <Line label="Paper" value={a.paperId ?? "—"} />
            </div>

            {/* the sheet */}
            {a.status !== "not_started" && (
              <div className="mt-5">
                <div className="mb-2 text-[0.66rem] font-semibold uppercase tracking-wide text-[#9c8c86]">
                  Answer sheet — {a.answered} answered, {a.total - a.answered} blank
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {a.filled.map((on, i) => (
                    <span
                      key={i}
                      title={`Q${i + 1} ${on ? "answered" : "blank"}`}
                      className="aspect-square rounded-[3px]"
                      style={{ background: on ? "#7b1e2b" : "#2a2321" }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex gap-4 text-[0.68rem] text-[#8b7d78]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#7b1e2b]" /> Answered
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#2a2321]" /> Blank
                  </span>
                </div>
                <p className="mt-3 text-[0.68rem] text-[#6b5f5b]">
                  The sheet shows which questions were answered, not which were correct — the mark is
                  the score above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- pieces --- */

function Loading() {
  return (
    <div className="flex items-center gap-2 px-5 py-10 text-sm text-[#8b7d78]">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
    </div>
  );
}

function Thead({ cols }: { cols: string[] }) {
  return (
    <thead className="sticky top-0 bg-[#1c1613] text-[0.66rem] uppercase tracking-wide text-[#9c8c86]">
      <tr>
        {cols.map((c, i) => (
          <th
            key={c}
            className={`py-2 font-semibold ${i === 0 ? "px-4 text-left" : "px-2 text-right"} ${
              i === cols.length - 1 ? "px-4" : ""
            }`}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Num({ v, color, bold }: { v: number; color?: string; bold?: boolean }) {
  return (
    <td
      className={`px-2 py-2.5 text-right tabular-nums ${bold ? "font-semibold" : ""}`}
      style={{ color: color ?? "#c9b8b1" }}
    >
      {n(v)}
    </td>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[#241d1b] bg-[#1c1613] p-3">
      <div className="text-[0.62rem] font-semibold uppercase tracking-wide text-[#9c8c86]">{label}</div>
      <div className="mt-1 text-lg font-bold" style={{ color: color ?? "#f3ece2" }}>
        {value}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[#8b7d78]">{label}: </span>
      <span className="tabular-nums text-[#ece3d8]">{value}</span>
    </div>
  );
}

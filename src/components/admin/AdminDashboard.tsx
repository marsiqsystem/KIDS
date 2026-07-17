"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, LogOut, Circle } from "lucide-react";
import AdminDrill from "./AdminDrill";

/* ----------------------------------------------------------------- types --- */

type Overview = {
  enrolled: number;
  started: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  activeNow: number;
  avgAnswered: number;
};
type Row = {
  code?: string;
  name?: string;
  class?: string;
  enrolled: number;
  started: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
};
type Activity = {
  uid: string;
  kind: string;
  at: string;
  name: string;
  class: string;
  centreCode: string;
};
type Stats = {
  generatedAt: string;
  demo: boolean;
  overview: Overview;
  centres: Row[];
  classes: Row[];
  activity: Activity[];
};

/* status colours — one meaning, one colour, everywhere on this page */
const C = {
  submitted: "#1e9e8c",
  inProgress: "#d9a441",
  notStarted: "#5b6b6e",
  active: "#4ade80",
};

const POLL_MS = 12_000;

/* --------------------------------------------------------------- helpers --- */

const n = (x: number) => x.toLocaleString("en-IN");
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function istClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const KIND_COLOR: Record<string, string> = {
  scan: "#8fbfae",
  start: C.inProgress,
  sync: "#7c8b8e",
  submit: C.submitted,
  autosubmit: "#c98b3d",
  blur: "#b06a6a",
  reset: "#9c8c86",
};

/* ----------------------------------------------------------------- view --- */

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // When set, we're drilled into a centre (schools → students → one student).
  const [openCentre, setOpenCentre] = useState<{ code: string; name: string } | null>(null);
  const demoRef = useRef(demo);
  demoRef.current = demo;

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/stats?demo=${demoRef.current ? "1" : "0"}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.reload(); // session expired → back to the key prompt
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStats((await res.json()) as Stats);
      setError("");
    } catch {
      setError("Could not refresh. Retrying…");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Reload immediately when the demo toggle flips.
  useEffect(() => {
    load();
  }, [demo, load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const o = stats?.overview;

  return (
    <div
      style={{ fontFamily: "var(--font-body, system-ui)" }}
      className="min-h-screen bg-[#12100f] text-[#ece3d8]"
    >
      {/* header */}
      <header className="sticky top-0 z-10 border-b border-[#2a2321] bg-[#181312]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3d0a10] text-sm font-bold text-[#e5be7a]">
              K
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">SET 2026 · Control room</div>
              <div className="text-[0.68rem] text-[#9c8c86]">
                {stats ? (
                  <>Updated {istClock(stats.generatedAt)} IST</>
                ) : (
                  "Connecting…"
                )}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[0.7rem] text-[#9fb8b3]">
              <Circle
                className="h-2 w-2 fill-current text-[#4ade80]"
                style={{ opacity: refreshing ? 0.4 : 1 }}
                aria-hidden="true"
              />
              live
            </span>

            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#3a2f2b] px-2.5 py-1.5 text-[0.72rem] text-[#c9b8b1]">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
                className="accent-[#c9a24b]"
              />
              Include demo
            </label>

            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg border border-[#3a2f2b] px-2.5 py-1.5 text-[0.72rem] text-[#c9b8b1] hover:bg-[#241d1b]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-[#3a2f2b] px-2.5 py-1.5 text-[0.72rem] text-[#c9b8b1] hover:bg-[#241d1b]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-6">
        {!stats ? (
          <div className="flex items-center gap-2 py-24 text-[#9c8c86]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading the exam…
          </div>
        ) : openCentre ? (
          <AdminDrill centre={openCentre} demo={demo} onClose={() => setOpenCentre(null)} />
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-[#5a2a12] bg-[#2a1710] px-3 py-2 text-xs text-[#f0c9a8]">
                {error}
              </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Enrolled" value={n(o!.enrolled)} sub={`${n(o!.started)} started`} />
              <Tile
                label="Submitted"
                value={n(o!.submitted)}
                sub={`${pct(o!.submitted, o!.enrolled)}% of enrolled`}
                color={C.submitted}
              />
              <Tile label="In progress" value={n(o!.inProgress)} sub="taking it now" color={C.inProgress} />
              <Tile
                label="Not started"
                value={n(o!.notStarted)}
                sub="no attempt yet"
                color={C.notStarted}
              />
              <Tile
                label="Active now"
                value={n(o!.activeNow)}
                sub="synced < 2 min ago"
                color={C.active}
              />
              <Tile label="Avg answered" value={`${o!.avgAnswered}`} sub="of 50, submitted" />
            </div>

            {/* progress bar */}
            <div className="mt-4 rounded-xl border border-[#2a2321] bg-[#181312] p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[#9c8c86]">
                <span>Progress across all {n(o!.enrolled)} enrolled</span>
                <span>{pct(o!.submitted, o!.enrolled)}% submitted</span>
              </div>
              <StackedBar overview={o!} />
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#c9b8b1]">
                <Legend color={C.submitted} label={`Submitted ${n(o!.submitted)}`} />
                <Legend color={C.inProgress} label={`In progress ${n(o!.inProgress)}`} />
                <Legend color={C.notStarted} label={`Not started ${n(o!.notStarted)}`} />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
              {/* centres */}
              <section className="rounded-xl border border-[#2a2321] bg-[#181312]">
                <h2 className="border-b border-[#2a2321] px-4 py-3 text-sm font-bold">
                  By centre <span className="ml-1 font-normal text-[#8b7d78]">· tap to drill in</span>
                </h2>
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#1c1613] text-[0.66rem] uppercase tracking-wide text-[#9c8c86]">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Centre</th>
                        <th className="px-2 py-2 text-right font-semibold">Enrolled</th>
                        <th className="px-2 py-2 text-right font-semibold">Subm.</th>
                        <th className="px-2 py-2 text-right font-semibold">In prog.</th>
                        <th className="px-2 py-2 text-right font-semibold">Not started</th>
                        <th className="px-4 py-2 text-right font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.centres.map((r) => (
                        <tr
                          key={r.code}
                          onClick={() => setOpenCentre({ code: r.code!, name: r.name! })}
                          className="cursor-pointer border-t border-[#241d1b] hover:bg-[#1e1817]"
                        >
                          <td className="px-4 py-2">
                            <div className="font-medium text-[#ece3d8]">{r.code}</div>
                            <div className="max-w-[240px] truncate text-[0.7rem] text-[#8b7d78]">
                              {r.name}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-[#c9b8b1]">
                            {n(r.enrolled)}
                          </td>
                          <td
                            className="px-2 py-2 text-right font-semibold tabular-nums"
                            style={{ color: C.submitted }}
                          >
                            {n(r.submitted)}
                          </td>
                          <td
                            className="px-2 py-2 text-right tabular-nums"
                            style={{ color: r.inProgress ? C.inProgress : "#6b5f5b" }}
                          >
                            {n(r.inProgress)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-[#9c8c86]">
                            {n(r.notStarted)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-[#c9b8b1]">
                            {pct(r.submitted, r.enrolled)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* right column: classes + activity */}
              <div className="flex flex-col gap-4">
                <section className="rounded-xl border border-[#2a2321] bg-[#181312] p-4">
                  <h2 className="mb-3 text-sm font-bold">By class</h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {stats.classes.map((r) => (
                      <div key={r.class} className="rounded-lg border border-[#241d1b] bg-[#1c1613] p-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-bold">Class {r.class}</span>
                          <span className="text-[0.68rem] text-[#9c8c86]">{n(r.enrolled)} enrolled</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2a2321]">
                          <div
                            className="h-full"
                            style={{
                              width: `${pct(r.submitted, r.enrolled)}%`,
                              background: C.submitted,
                            }}
                          />
                        </div>
                        <div className="mt-1.5 flex justify-between text-[0.68rem] text-[#c9b8b1]">
                          <span style={{ color: C.submitted }}>{n(r.submitted)} submitted</span>
                          <span style={{ color: C.inProgress }}>{n(r.inProgress)} live</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-[#2a2321] bg-[#181312]">
                  <h2 className="border-b border-[#2a2321] px-4 py-3 text-sm font-bold">
                    Recent activity
                  </h2>
                  <div className="max-h-[360px] overflow-auto">
                    {stats.activity.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-[#8b7d78]">
                        No events yet{stats.demo ? "" : " — turn on “Include demo” to see the test run"}.
                      </p>
                    ) : (
                      <ul>
                        {stats.activity.map((e, i) => (
                          <li
                            key={`${e.uid}-${e.at}-${i}`}
                            className="flex items-center gap-3 border-t border-[#241d1b] px-4 py-2 first:border-t-0"
                          >
                            <span
                              className="rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase"
                              style={{
                                color: KIND_COLOR[e.kind] ?? "#c9b8b1",
                                background: `${KIND_COLOR[e.kind] ?? "#c9b8b1"}1a`,
                              }}
                            >
                              {e.kind}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[0.8rem]">{e.name}</div>
                              <div className="text-[0.66rem] text-[#8b7d78]">
                                Class {e.class} · {e.centreCode} · {e.uid}
                              </div>
                            </div>
                            <span className="tabular-nums text-[0.66rem] text-[#9c8c86]">
                              {istClock(e.at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <p className="mt-5 text-center text-[0.68rem] text-[#6b5f5b]">
              {stats.demo ? "Including KIDS Team demo records." : "Real students only."} Auto-refreshing
              every {POLL_MS / 1000}s.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

/* --------------------------------------------------------------- pieces --- */

function Tile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[#2a2321] bg-[#181312] p-3.5">
      <div className="text-[0.66rem] font-semibold uppercase tracking-wide text-[#9c8c86]">{label}</div>
      <div
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: color ?? "#f3ece2" }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[0.68rem] text-[#8b7d78]">{sub}</div>
    </div>
  );
}

function StackedBar({ overview }: { overview: Overview }) {
  const total = Math.max(1, overview.enrolled);
  const seg = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#2a2321]">
      <div style={{ width: seg(overview.submitted), background: C.submitted }} />
      <div style={{ width: seg(overview.inProgress), background: C.inProgress }} />
      <div style={{ width: seg(overview.notStarted), background: C.notStarted }} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

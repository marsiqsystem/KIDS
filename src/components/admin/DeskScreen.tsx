"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Counts = { expected: number; checkedIn: number; fromElsewhere: number; started: number; submitted: number };
type DeskState = {
  ok: boolean;
  message?: string;
  open?: boolean;
  paper?: { name: string; scanOpensAt: string | null; startsAt: string | null; endsAt: string | null };
  code?: { payload: string; code: string; refreshAt: number; svg: string } | null;
  counts?: Counts;
  serverNow?: number;
  /** Worked out when the response lands, so the render never reads a clock. */
  beforeOpen?: boolean;
};
type Student = {
  uid: string;
  name: string;
  class: string;
  home_centre: string;
  checked_in_at: string | null;
  status: "in_progress" | "submitted" | null;
  answered: number;
  released: boolean;
};

const n = (x: number) => x.toLocaleString("en-IN");
const ist = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
    : "—";

/**
 * The invigilator's screen: one big code, and the room's numbers.
 *
 * Built to be read from a desk by a queue of students holding phones up to it,
 * so the code fills the screen and nothing else competes with it. It asks for a
 * fresh code exactly on each thirty-second boundary, using the SERVER's clock
 * (the laptop's may be wrong); before check-in opens it waits for the opening
 * time instead of asking, and after the paper closes it stops asking at all.
 */
export default function DeskScreen({
  paperId,
  centre,
  centreName,
}: {
  paperId: string;
  centre: string;
  centreName: string;
}) {
  const [state, setState] = useState<DeskState | null>(null);
  const [left, setLeft] = useState(30);
  const skew = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The next load is scheduled from inside the current one, through a ref, so
  // the timer always calls the latest function rather than the one it closed over.
  const loadRef = useRef<() => void>(() => {});
  const again = (ms: number) => {
    timer.current = setTimeout(() => loadRef.current(), ms);
  };

  const load = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await fetch(`/api/desk?paper=${paperId}&centre=${centre}`, { cache: "no-store" });
      const data = (await res.json()) as DeskState;
      if (!data.ok) return setState(data); // signed out or not assigned: say so and stop.

      if (data.serverNow) skew.current = data.serverNow - Date.now();
      const serverNow = Date.now() + skew.current;
      data.beforeOpen = Boolean(data.paper?.scanOpensAt && new Date(data.paper.scanOpensAt).getTime() > serverNow);
      setState(data);

      if (data.open && data.code) {
        // A few hundred ms past the boundary, so the new step has begun on the server.
        again(Math.max(500, data.code.refreshAt - serverNow + 400));
      } else if (data.beforeOpen && data.paper?.scanOpensAt) {
        again(Math.min(new Date(data.paper.scanOpensAt).getTime() - serverNow + 400, 5 * 60_000));
      }
      // Closed: no timer. The counts stay on screen; Refresh reloads them.
    } catch {
      setState((s) => ({ ...(s ?? { ok: false }), message: "No connection. Retrying…" }));
      again(5000);
    }
  }, [paperId, centre]);

  useEffect(() => {
    loadRef.current = load;
    // Through the timer like every later load, not called inline: one path, and
    // no state set synchronously inside the effect.
    again(0);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  // The countdown under the code, so the invigilator can tell a queue "wait".
  useEffect(() => {
    const t = setInterval(() => {
      if (!state?.code) return;
      setLeft(Math.max(0, Math.ceil((state.code.refreshAt - (Date.now() + skew.current)) / 1000)));
    }, 250);
    return () => clearInterval(t);
  }, [state?.code]);

  const c = state?.counts;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex flex-col items-center rounded border border-[#2a2321] bg-[#1a1514] px-6 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9c8c86]">
          {centre} · {centreName}
        </p>
        <h2 className="mt-1 text-lg font-bold">{state?.paper?.name ?? "…"}</h2>

        {!state ? (
          <p className="mt-16 text-sm text-[#9c8c86]">Loading…</p>
        ) : !state.ok ? (
          <p className="mt-16 max-w-sm text-sm text-[#d98b8b]">{state.message}</p>
        ) : state.open && state.code ? (
          <>
            {/* White ground and a quiet zone: a dark-theme QR scans badly on a cheap camera. */}
            <div
              className="mt-6 w-full max-w-[26rem] rounded-lg bg-white p-4 [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: state.code.svg }}
              aria-label="Check-in code"
            />
            <p className="mt-5 font-mono text-5xl font-semibold tracking-[0.18em] text-[#e8e0dc] tabular-nums">
              {state.code.code.slice(0, 3)} {state.code.code.slice(3)}
            </p>
            <p className="mt-3 text-sm text-[#9c8c86]">
              Scan with the SET app · the code changes in <span className="font-mono text-[#e8e0dc]">{left}s</span>
            </p>
            {/* The camera is the fast path and the typed code is the one that has
                actually been tested end to end. An invigilator facing a student
                whose camera will not focus should not have to work that out. */}
            <p className="mt-1 text-sm text-[#9c8c86]">
              If the camera will not read it, they can type the six digits instead.
            </p>
            {state.message ? <p className="mt-2 text-xs text-[#d9b877]">{state.message}</p> : null}
          </>
        ) : (
          <div className="mt-12 max-w-sm space-y-2 text-sm text-[#9c8c86]">
            {state.beforeOpen && state.paper?.scanOpensAt ? (
              <>
                <p className="text-[#e8e0dc]">Check-in opens at {ist(state.paper.scanOpensAt)}.</p>
                <p>Leave this screen open. The code appears by itself at that time.</p>
              </>
            ) : state.paper?.scanOpensAt ? (
              <p>This paper has closed. No more students can check in.</p>
            ) : (
              <p>This paper has not been scheduled yet.</p>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="rounded border border-[#2a2321] bg-[#1a1514] p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold">This room</h3>
            <button type="button" onClick={load} className="text-xs text-[#9c8c86] hover:text-[#e8e0dc]">
              Refresh
            </button>
          </div>
          {c ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 tabular-nums">
              <Stat k="Expected here" v={n(c.expected)} />
              <Stat k="Checked in" v={n(c.checkedIn)} strong />
              <Stat k="Started" v={n(c.started)} />
              <Stat k="Submitted" v={n(c.submitted)} />
            </dl>
          ) : null}
          {c && c.fromElsewhere > 0 ? (
            <p className="mt-3 text-xs text-[#d9b877]">
              {n(c.fromElsewhere)} checked in here are registered at another centre.
            </p>
          ) : null}
        </section>

        <FindStudent paperId={paperId} centre={centre} />
      </aside>
    </div>
  );
}

function Stat({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-[#6b5c57]">{k}</dt>
      <dd className={`font-mono text-xl ${strong ? "text-[#8fbfae]" : "text-[#e8e0dc]"}`}>{v}</dd>
    </div>
  );
}

/**
 * Find one student -- the one whose phone just died -- and let their paper
 * carry on on another phone.
 */
function FindStudent({ paperId, centre }: { paperId: string; centre: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Student[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const res = await fetch("/api/desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper: paperId, centre, q }),
    });
    const data = await res.json();
    setRows(data.ok ? data.students : []);
    if (!data.ok) setNote({ ok: false, text: data.message });
  }

  async function release(s: Student) {
    if (!window.confirm(`Move ${s.name}'s paper to another phone?\n\nThey keep every answer and the same time. The phone it was on can no longer save.`)) return;
    const res = await fetch("/api/desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper: paperId, centre, release: s.uid }),
    });
    const data = await res.json();
    setNote({ ok: data.ok, text: data.message });
    if (data.ok) search();
  }

  return (
    <section className="rounded border border-[#2a2321] bg-[#1a1514] p-4">
      <h3 className="text-sm font-bold">A phone has died</h3>
      <p className="mt-1 text-xs text-[#6b5c57]">
        Find the student, move their paper, then have them sign in on the other phone and open the paper.
      </p>
      <form onSubmit={search} className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or User ID"
          className="w-full rounded border border-[#3a2f2c] bg-[#141010] px-3 py-2 text-sm text-[#e8e0dc] outline-none focus:border-[#8a6f66]"
        />
        <button type="submit" className="rounded border border-[#3a2f2c] px-3 text-sm text-[#c9b8b2] hover:bg-[#241c1a]">
          Find
        </button>
      </form>
      {note ? <p className={`mt-2 text-xs ${note.ok ? "text-[#8fbfae]" : "text-[#d98b8b]"}`}>{note.text}</p> : null}
      {rows ? (
        rows.length === 0 ? (
          <p className="mt-3 text-xs text-[#6b5c57]">Nobody by that name at this centre.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#2a2321]">
            {rows.map((s) => (
              <li key={s.uid} className="py-2 text-xs">
                <p className="text-sm text-[#e8e0dc]">
                  {s.name} <span className="font-mono text-[#6b5c57]">{s.uid}</span>
                </p>
                <p className="text-[#9c8c86]">
                  Class {s.class}
                  {s.home_centre !== centre ? ` · registered at ${s.home_centre}` : ""} ·{" "}
                  {!s.checked_in_at
                    ? "not checked in"
                    : s.status === "submitted"
                      ? "submitted"
                      : s.status === "in_progress"
                        ? `writing · ${s.answered} answered${s.released ? " · released, waiting for the new phone" : ""}`
                        : "checked in, not started"}
                </p>
                {s.status === "in_progress" && !s.released ? (
                  <button
                    type="button"
                    onClick={() => release(s)}
                    className="mt-1 rounded border border-[#3a2f2c] px-2 py-0.5 text-[#c9b8b2] hover:bg-[#241c1a]"
                  >
                    Move to another phone
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}

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
  away?: Away[];
  stars?: Starred[];
  serverNow?: number;
  /** Worked out when the response lands, so the render never reads a clock. */
  beforeOpen?: boolean;
  /** The paper itself is running: between its start and its end. */
  running?: boolean;
};
type Away = {
  uid: string;
  name: string;
  class: string;
  left: number;
  unfocused: number;
  seconds: number;
  away_now: boolean;
  last_at: string;
  status: "in_progress" | "submitted" | null;
  stars: number;
};
type Starred = { uid: string; name: string; class: string; stars: number; updated_at: string };
type Detail = {
  uid: string;
  name: string;
  class: string;
  school_name: string;
  home_centre: string;
  checked_in_at: string | null;
  stars: number;
  periods: { left_at: string; back_at: string | null; how: "hidden" | "unfocused" }[];
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
  stars: number;
};
/** What every part of the desk needs to talk to the server and redraw. */
type Desk = { paperId: string; centre: string; refresh: () => void };

/** A student moves to "Watch these students" at 3 exits or 2 minutes away (ruled 8 Oct 2026). */
const WATCH_EXITS = 3;
const WATCH_SECONDS = 120;
/** While the paper runs the lists refresh this often; otherwise on the code's 30 s step. */
const RUNNING_POLL_MS = 8000;
const MAX_STARS = 3;

const n = (x: number) => x.toLocaleString("en-IN");
const ist = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
    : "—";
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
const mmss = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

async function post(desk: Desk, body: Record<string, unknown>) {
  const res = await fetch("/api/desk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper: desk.paperId, centre: desk.centre, ...body }),
  });
  return res.json();
}

/**
 * The invigilator's screen: one big code, and the room's numbers.
 *
 * Built to be read from a desk by a queue of students holding phones up to it,
 * so the code fills the screen and nothing else competes with it. It asks for a
 * fresh code exactly on each thirty-second boundary, using the SERVER's clock
 * (the laptop's may be wrong); before check-in opens it waits for the opening
 * time instead of asking, and after the paper closes it stops asking at all.
 *
 * Once the paper itself starts, the job changes: the queue has sat down, and
 * what the invigilator needs is whom to go and look at. The code folds away
 * (one press brings it back for a latecomer) and "Watch these students" takes
 * its place, refreshed every eight seconds.
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
  const [showCode, setShowCode] = useState(false);
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
      data.running = Boolean(
        data.paper?.startsAt &&
          data.paper?.endsAt &&
          new Date(data.paper.startsAt).getTime() <= serverNow &&
          serverNow < new Date(data.paper.endsAt).getTime(),
      );
      setState(data);

      if (data.open && data.code) {
        // A few hundred ms past the boundary, so the new step has begun on the server.
        const toNextCode = Math.max(500, data.code.refreshAt - serverNow + 400);
        again(data.running ? Math.min(toNextCode, RUNNING_POLL_MS) : toNextCode);
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
  const desk: Desk = { paperId, centre, refresh: load };
  const watching = Boolean(state?.ok && state.running && !showCode);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {watching ? (
        <section className="rounded border border-[#2a2321] bg-[#1a1514] p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#9c8c86]">
                {centre} · {centreName}
              </p>
              <h2 className="mt-1 text-lg font-bold">{state?.paper?.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCode(true)}
              className="rounded border border-[#3a2f2c] px-3 py-1.5 text-xs text-[#c9b8b2] hover:bg-[#241c1a]"
            >
              Show check-in code
            </button>
          </div>
          {state?.message ? <p className="mt-2 text-xs text-[#d9b877]">{state.message}</p> : null}
          <div className="mt-4">
            <LeftThePaper rows={state?.away ?? []} desk={desk} />
          </div>
        </section>
      ) : (
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
              {state.running ? (
                <button
                  type="button"
                  onClick={() => setShowCode(false)}
                  className="mt-5 rounded border border-[#3a2f2c] px-3 py-1.5 text-xs text-[#c9b8b2] hover:bg-[#241c1a]"
                >
                  Back to the students to watch
                </button>
              ) : null}
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
      )}

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

        {state?.stars ? <StarList rows={state.stars} desk={desk} /> : null}

        {state?.away && !watching ? (
          <section className="rounded border border-[#2a2321] bg-[#1a1514] p-4">
            <LeftThePaper rows={state.away} desk={desk} />
          </section>
        ) : null}

        <FindStudent desk={desk} />
      </aside>
    </div>
  );
}

/**
 * Who has left the paper on their phone — another app, the home screen, a
 * call — in two parts: the students to watch (3 exits, 2 minutes away in all,
 * or away right now; ruled 8 Oct 2026) and below them, smaller, the ones who
 * left once or twice. Tap a name for the school, the stars and each time.
 *
 * A fact for the person in the room, not a verdict: a call from home looks
 * exactly like a search. It says what the phone saw and leaves the judging to
 * the invigilator, who can walk over and look. The student was told before the
 * paper that this is recorded.
 */
function LeftThePaper({ rows, desk }: { rows: Away[]; desk: Desk }) {
  const watch = rows.filter((r) => r.away_now || r.left >= WATCH_EXITS || r.seconds >= WATCH_SECONDS);
  const rest = rows.filter((r) => !watch.includes(r));
  return (
    <>
      <h3 className="text-sm font-bold">
        Watch these students <span className="font-mono font-normal text-[#9c8c86]">{watch.length}</span>
      </h3>
      {watch.length === 0 ? (
        <p className="mt-2 text-xs text-[#9c8c86]">
          Nobody yet. A student appears here after leaving the paper {WATCH_EXITS} times, after{" "}
          {WATCH_SECONDS / 60} minutes away in all, or while they are away right now.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {watch.map((r) => (
            <StudentLine
              key={r.uid}
              uid={r.uid}
              desk={desk}
              tone={r.away_now || r.stars >= MAX_STARS ? "red" : "amber"}
              head={<AwayHead r={r} />}
            />
          ))}
        </ul>
      )}

      {rest.length > 0 ? (
        <>
          <h3 className="mt-5 text-xs font-bold text-[#9c8c86]">
            Left once or twice <span className="font-mono font-normal">{rest.length}</span>
          </h3>
          <ul className="mt-2 space-y-1.5">
            {rest.map((r) => (
              <StudentLine
                key={r.uid}
                uid={r.uid}
                desk={desk}
                tone={r.stars >= MAX_STARS ? "red" : "plain"}
                head={<AwayHead r={r} />}
              />
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-[#9c8c86]">
        Counts every time the paper left the phone&rsquo;s screen. It cannot see a second phone —
        that is for your eyes. A call from home looks the same as a search, so go and look before you
        decide anything.
      </p>
    </>
  );
}

function AwayHead({ r }: { r: Away }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold text-[#e8e0dc]">
          {r.name}
          <Stars count={r.stars} />
        </span>
        <span className="shrink-0 font-mono text-[#9c8c86]">{r.uid}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[#c9bcb6] tabular-nums">
        {r.away_now ? <span className="font-bold text-[#ff8a8a]">AWAY NOW</span> : null}
        <span>
          Left {r.left} time{r.left === 1 ? "" : "s"}
        </span>
        {r.unfocused > 0 ? <span>covered {r.unfocused}×</span> : null}
        <span>{mmss(r.seconds)} away</span>
        <span>Class {r.class}</span>
        {r.status === "submitted" ? <span className="text-[#9c8c86]">handed in</span> : null}
      </div>
    </>
  );
}

/** ★★☆ — nothing at all when there are none, so a clean row stays clean. */
function Stars({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 whitespace-nowrap text-[#f0b94a]" aria-label={`${count} of ${MAX_STARS} stars`}>
      {"★".repeat(count)}
      <span className="text-[#4a3f3b]">{"★".repeat(Math.max(0, MAX_STARS - count))}</span>
    </span>
  );
}

/**
 * A star is a warning given in the room: the invigilator has spoken to the
 * student and records it, up to three. What three leads to is not decided yet
 * (8 Oct 2026); the count is kept and audited, and nothing acts on it.
 */
function StarButtons({
  uid,
  stars,
  desk,
  onChange,
}: {
  uid: string;
  stars: number;
  desk: Desk;
  onChange: (stars: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function change(by: 1 | -1) {
    setBusy(true);
    setNote(null);
    try {
      const data = await post(desk, { star: uid, by });
      if (data.ok) {
        onChange(data.stars);
        desk.refresh();
      } else setNote(data.message);
    } catch {
      setNote("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || stars >= MAX_STARS}
          onClick={() => change(1)}
          className="rounded border border-[#8a6a2a] px-2 py-1 text-[#f0b94a] hover:bg-[#2a2216] disabled:opacity-40"
        >
          ★ Give a star
        </button>
        <button
          type="button"
          disabled={busy || stars <= 0}
          onClick={() => change(-1)}
          className="rounded border border-[#3a2f2c] px-2 py-1 text-[#c9b8b2] hover:bg-[#241c1a] disabled:opacity-40"
        >
          Take one back
        </button>
        <span className="text-[#9c8c86]">
          {stars === 0 ? "No stars" : `${stars} of ${MAX_STARS}`}
          {stars >= MAX_STARS ? " — the most" : ""}
        </span>
      </div>
      {note ? <p className="mt-1 text-[#d98b8b]">{note}</p> : null}
    </div>
  );
}

/**
 * One student in a desk list. A tap opens who they are, their stars, and each
 * time the paper left their screen — fetched on the tap, not with the list.
 */
function StudentLine({
  uid,
  desk,
  tone,
  head,
}: {
  uid: string;
  desk: Desk;
  tone: "red" | "amber" | "plain";
  head: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    setNote(null);
    try {
      const data = await post(desk, { detail: uid });
      if (data.ok) setDetail(data.student);
      else setNote(data.message);
    } catch {
      setNote("No connection. Try again.");
    }
  }

  const border =
    tone === "red"
      ? "border-[#b23a3a] bg-[#3a1a1a]"
      : tone === "amber"
        ? "border-[#8a6a2a] bg-[#2a2216]"
        : "border-[#2a2321]";

  return (
    <li className={`rounded border text-xs ${border}`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="block w-full px-3 py-2 text-left">
        {head}
      </button>
      {open ? (
        <div className="border-t border-[#2a2321] px-3 py-2 text-[#c9bcb6]">
          {note ? (
            <p className="text-[#d98b8b]">{note}</p>
          ) : !detail ? (
            <p className="text-[#9c8c86]">Loading…</p>
          ) : (
            <>
              <p>
                Class {detail.class} · {detail.school_name}
              </p>
              <p className="text-[#9c8c86]">
                {detail.home_centre !== desk.centre ? `Registered at ${detail.home_centre} · ` : ""}
                {detail.checked_in_at ? `checked in ${clock(detail.checked_in_at)}` : "not checked in"}
              </p>
              <StarButtons
                uid={uid}
                stars={detail.stars}
                desk={desk}
                onChange={(stars) => setDetail({ ...detail, stars })}
              />
              {detail.periods.length > 0 ? (
                <ol className="mt-2 space-y-0.5 font-mono tabular-nums text-[#9c8c86]">
                  {detail.periods.map((p) => (
                    <li key={p.left_at}>
                      Left {clock(p.left_at)} → {p.back_at ? `back ${clock(p.back_at)}` : <span className="text-[#ff8a8a]">not back</span>}
                      {p.how === "unfocused" ? " · covered" : ""}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-[#9c8c86]">Has not left the paper.</p>
              )}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** Everyone the invigilator has given a star on this paper, most first. */
function StarList({ rows, desk }: { rows: Starred[]; desk: Desk }) {
  return (
    <section className="rounded border border-[#2a2321] bg-[#1a1514] p-4">
      <h3 className="text-sm font-bold">
        Stars <span className="font-mono font-normal text-[#9c8c86]">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-[#9c8c86]">
          Nobody has a star. After warning a student, tap their name — in a list here, or with Find a
          student below — and give one. Up to {MAX_STARS}.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <StudentLine
              key={r.uid}
              uid={r.uid}
              desk={desk}
              tone={r.stars >= MAX_STARS ? "red" : "amber"}
              head={
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-[#e8e0dc]">
                    {r.name}
                    <Stars count={r.stars} />
                  </span>
                  <span className="shrink-0 font-mono text-[#9c8c86]">{r.uid}</span>
                </div>
              }
            />
          ))}
        </ul>
      )}
    </section>
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
 * Find one student -- the one whose phone just died, or the one just warned --
 * to let their paper carry on on another phone, or to give them a star.
 */
function FindStudent({ desk }: { desk: Desk }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Student[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const data = await post(desk, { q });
    setRows(data.ok ? data.students : []);
    if (!data.ok) setNote({ ok: false, text: data.message });
  }

  async function release(s: Student) {
    if (!window.confirm(`Move ${s.name}'s paper to another phone?\n\nThey keep every answer and the same time. The phone it was on can no longer save.`)) return;
    const data = await post(desk, { release: s.uid });
    setNote({ ok: data.ok, text: data.message });
    if (data.ok) search();
  }

  return (
    <section className="rounded border border-[#2a2321] bg-[#1a1514] p-4">
      <h3 className="text-sm font-bold">Find a student</h3>
      <p className="mt-1 text-xs text-[#6b5c57]">
        To give a star, or when a phone has died: find the student, move their paper, then have them sign
        in on the other phone and open the paper.
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
                  {s.name}
                  <Stars count={s.stars} /> <span className="font-mono text-[#6b5c57]">{s.uid}</span>
                </p>
                <p className="text-[#9c8c86]">
                  Class {s.class}
                  {s.home_centre !== desk.centre ? ` · registered at ${s.home_centre}` : ""} ·{" "}
                  {!s.checked_in_at
                    ? "not checked in"
                    : s.status === "submitted"
                      ? "submitted"
                      : s.status === "in_progress"
                        ? `writing · ${s.answered} answered${s.released ? " · released, waiting for the new phone" : ""}`
                        : "checked in, not started"}
                </p>
                <StarButtons
                  uid={s.uid}
                  stars={s.stars}
                  desk={desk}
                  onChange={(stars) => setRows((rs) => rs?.map((x) => (x.uid === s.uid ? { ...x, stars } : x)) ?? null)}
                />
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

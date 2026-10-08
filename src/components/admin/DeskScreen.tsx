"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Lock, QrCode, Search, WifiOff } from "lucide-react";
import { signOut } from "@/app/admin/actions";

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
  /** The paper's end has passed. */
  closed?: boolean;
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
type Strength = "strong" | "watch" | "quiet";
type Tab = "watch" | "stars" | "find";

/** A student moves to "Watch these students" at 3 exits or 2 minutes away (ruled 8 Oct 2026). */
const WATCH_EXITS = 3;
const WATCH_SECONDS = 120;
/** While the paper runs the lists refresh this often; otherwise on the code's 30 s step. */
const RUNNING_POLL_MS = 8000;
const MAX_STARS = 3;

const IST = "Asia/Kolkata";
const clock = (ms: number | string) =>
  new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: IST });
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: IST });
const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`);
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

const isWatched = (r: Away) => r.away_now || r.left >= WATCH_EXITS || r.seconds >= WATCH_SECONDS;
const strengthOf = (r: { away_now?: boolean; stars: number }, watched: boolean): Strength =>
  r.away_now || r.stars >= MAX_STARS ? "strong" : watched ? "watch" : "quiet";

/** "Left 5 times · covered 1× · 1 min 40 s away · Class X"; the quiet line drops "away" and the class. */
function awayMeta(r: Away, full: boolean): string {
  const parts = [r.left > 0 ? `Left ${times(r.left)}` : `Covered ${r.unfocused}×`];
  if (r.left > 0 && r.unfocused > 0) parts.push(`covered ${r.unfocused}×`);
  parts.push(full ? `${duration(r.seconds)} away` : duration(r.seconds));
  if (full) parts.push(`Class ${r.class}`);
  if (r.status === "submitted") parts.push("handed in");
  return parts.join(" · ");
}

async function post(desk: Desk, body: Record<string, unknown>) {
  const res = await fetch("/api/desk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paper: desk.paperId, centre: desk.centre, ...body }),
  });
  return res.json();
}

const DISPLAY = "font-[family-name:var(--font-newsreader)]";
const LABEL = "text-[12px] font-bold uppercase tracking-[0.12em] text-[#CDBFB6]";

/**
 * The invigilator's desk, in the hall — Claude Design's board 18 (8 Oct 2026).
 *
 * Two jobs on one screen. Before the paper it is a code that a queue scans from
 * two metres; it asks for a fresh code exactly on each thirty-second boundary,
 * by the SERVER's clock. Once the paper starts, the code folds away and the
 * screen shows whom to go and look at, refreshed every eight seconds. On a
 * phone a bottom bar (Watch · Stars · Find · Check-in code) keeps every action
 * in reach of a thumb; on a laptop those sit in a side column.
 *
 * Dark on purpose: a white QR on a dark ground scans faster, and a phone
 * carried between desks should not light up a silent hall.
 */
export default function DeskScreen({
  paperId,
  centre,
  staffId,
}: {
  paperId: string;
  centre: string;
  staffId: string;
}) {
  const [state, setState] = useState<DeskState | null>(null);
  const [offline, setOffline] = useState(false);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [tab, setTab] = useState<Tab>("watch");
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
      setOffline(false);
      if (!data.ok) return setState(data); // signed out or not assigned: say so and stop.

      if (data.serverNow) skew.current = data.serverNow - Date.now();
      const serverNow = Date.now() + skew.current;
      const at = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null);
      const [opens, starts, ends] = [at(data.paper?.scanOpensAt), at(data.paper?.startsAt), at(data.paper?.endsAt)];
      data.beforeOpen = opens !== null && opens > serverNow;
      data.running = starts !== null && ends !== null && starts <= serverNow && serverNow < ends;
      data.closed = ends !== null && serverNow >= ends;
      setState(data);
      setLastOk(serverNow);

      if (data.open && data.code) {
        // A few hundred ms past the boundary, so the new step has begun on the server.
        const toNextCode = Math.max(500, data.code.refreshAt - serverNow + 400);
        again(data.running ? Math.min(toNextCode, RUNNING_POLL_MS) : toNextCode);
      } else if (data.beforeOpen && opens !== null) {
        again(Math.min(opens - serverNow + 400, 5 * 60_000));
      }
      // Closed: no timer. The lists stay on screen, no longer updating.
    } catch {
      setOffline(true);
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

  // The header clock and the code's countdown, both on the server's time.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew.current), 250);
    return () => clearInterval(t);
  }, []);

  const desk: Desk = { paperId, centre, refresh: load };
  const s = state;
  const ok = Boolean(s?.ok);
  const watching = ok && Boolean(s?.running || (s?.closed && s?.paper?.scanOpensAt));
  const codeView = ok && Boolean(s?.open && s?.code) && (!s?.running || showCode);
  const left = s?.code && now ? Math.max(0, Math.ceil((s.code.refreshAt - now) / 1000)) : 30;
  const away = s?.away ?? [];
  const watch = away.filter(isWatched);
  const rest = away.filter((r) => !isWatched(r));
  const stars = s?.stars ?? [];
  const c = s?.counts;
  const countLine = c
    ? `${c.expected} expected here · ${c.checkedIn} checked in · ${c.started} started · ${c.submitted} submitted`
    : "";
  const awayNote =
    c && c.fromElsewhere > 0 ? `${c.fromElsewhere} who checked in here are registered at another centre.` : null;

  const window_ =
    s?.paper?.startsAt && s.paper.endsAt ? ` · ${hm(s.paper.startsAt)} – ${hm(s.paper.endsAt)}` : "";
  const pulse = !ok || s?.beforeOpen
    ? null
    : offline
      ? "Retrying…"
      : s?.closed
        ? "Not updating"
        : codeView
          ? "Code changes every 30 s"
          : "Updates every 8 s";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#170A0D] text-[#FDFBF7]">
      {/* Header: where, what, and the time by the server's clock. */}
      <header className="flex shrink-0 items-center gap-3.5 border-b border-[rgba(242,233,218,.12)] bg-[#1E0E12] px-[18px] py-3.5">
        <Link href="/admin/desk" aria-label="All desks" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kids-icon.png" alt="" className="h-[30px] w-[30px]" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-bold leading-tight">{ok ? `${centre} · Exam desk` : "Exam desk"}</p>
          <p className="truncate text-[12px] leading-snug text-[#CDBFB6]">
            {ok ? (s?.paper?.name ?? "") + window_ : s ? "" : "…"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[13.5px] tabular-nums">{now ? clock(now) : ""}</p>
          {pulse ? (
            <p className="text-[11.5px] text-[#CDBFB6]">
              {pulse}
              {pulse === "Updates every 8 s" ? (
                <>
                  {" · "}
                  <button type="button" onClick={load} className="underline-offset-2 hover:underline">
                    Refresh
                  </button>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {watching && !s?.closed && !codeView ? (
          <button
            type="button"
            onClick={() => setShowCode(true)}
            className="ml-2 hidden h-11 shrink-0 items-center gap-2 rounded-[11px] border-[1.5px] border-[#E5BE7A] px-[18px] text-[14px] font-bold text-[#E5BE7A] hover:bg-[#241216] lg:flex"
          >
            <QrCode size={18} strokeWidth={1.9} />
            Show check-in code
          </button>
        ) : null}
      </header>

      {offline ? (
        <div className="flex shrink-0 items-center gap-2.5 bg-[#FDFBF7] px-[18px] py-2.5 text-[14.5px] font-bold text-[#3D0A10]">
          <WifiOff size={18} strokeWidth={1.9} />
          <span className="flex-1">No connection. Retrying…</span>
          {lastOk ? (
            <span className="hidden text-[12.5px] font-medium text-[#6B5B5D] lg:inline">Last updated {clock(lastOk)}</span>
          ) : null}
        </div>
      ) : null}
      {ok && s?.closed && s.paper?.endsAt ? (
        <div className="shrink-0 bg-[#F2E9DA] px-[18px] py-2.5 text-[#2B1A1C]">
          <p className="text-[15px] font-bold">This paper has closed. No more students can check in.</p>
          <p className="hidden text-[12.5px] text-[#6B5B5D] lg:block">
            These lists stopped updating at {clock(s.paper.endsAt)}.
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-3">
          {!s ? (
            <Centred>
              <p className="text-[15px] text-[#CDBFB6]">Loading…</p>
            </Centred>
          ) : !s.ok ? (
            <Centred>
              <Lock size={40} strokeWidth={1.9} className="text-[#E5BE7A]" />
              <p className={`${DISPLAY} text-[28px] leading-tight`}>{s.message}</p>
              <p className="max-w-[420px] text-[15px] leading-relaxed text-[#CDBFB6]">
                The office puts a teacher on a centre&rsquo;s desk for one paper, from the Exams tab. Signed in as{" "}
                <span className="font-mono">{staffId}</span>.
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="h-12 rounded-xl border-[1.5px] border-[rgba(242,233,218,.45)] px-[22px] text-[15px] font-semibold hover:bg-[#241216]"
                >
                  Sign out
                </button>
              </form>
            </Centred>
          ) : codeView && s.code ? (
            <>
              <CodePanel code={s.code} left={left} />
              {s.running ? (
                <button
                  type="button"
                  onClick={() => setShowCode(false)}
                  className="mt-auto flex min-h-14 items-center justify-center gap-2.5 rounded-[14px] bg-[#C9A24B] text-[16px] font-bold text-[#2B1A1C] lg:mx-auto lg:mt-2 lg:px-6"
                >
                  <ArrowLeft size={19} strokeWidth={1.9} />
                  Back to the students to watch
                </button>
              ) : (
                <PhoneCounts line={countLine} note={awayNote} />
              )}
            </>
          ) : watching ? (
            <>
              <div className={tab === "watch" ? "flex flex-col gap-2" : "hidden flex-col gap-2 lg:flex"}>
                <WatchLists watch={watch} rest={rest} desk={desk} />
              </div>
              <div className={tab === "stars" ? "lg:hidden" : "hidden"}>
                <StarsTab stars={stars} away={away} desk={desk} />
              </div>
              <div className={tab === "find" ? "flex flex-col gap-2.5 lg:hidden" : "hidden"}>
                <PhoneCounts line={countLine} note={null} />
                <p className={`${DISPLAY} text-[23px]`}>Find a student</p>
                <FindStudent desk={desk} />
              </div>
            </>
          ) : (
            <>
              <Centred>
                <Clock size={40} strokeWidth={1.9} className="text-[#E5BE7A]" />
                {s.beforeOpen && s.paper?.scanOpensAt ? (
                  <>
                    <p className={`${DISPLAY} text-[30px] leading-tight`}>Check-in opens at {hm(s.paper.scanOpensAt)}.</p>
                    <p className="max-w-[380px] text-[15.5px] leading-relaxed text-[#CDBFB6]">
                      Leave this screen open. The code appears by itself at that time.
                    </p>
                  </>
                ) : (
                  <p className={`${DISPLAY} text-[28px] leading-tight`}>This paper has not been scheduled yet.</p>
                )}
              </Centred>
              <PhoneCounts line={countLine} note={null} />
            </>
          )}
        </main>

        {ok ? (
          <aside className="hidden w-[420px] shrink-0 flex-col gap-[18px] overflow-y-auto border-l border-[rgba(242,233,218,.12)] bg-[#1B0C10] p-[18px] lg:flex">
            <section>
              <p className={`${LABEL} mb-2`}>This room</p>
              {c ? (
                <dl className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#241216] px-1.5 py-3 text-center">
                  {[
                    [c.expected, "Expected here"],
                    [c.checkedIn, "Checked in"],
                    [c.started, "Started"],
                    [c.submitted, "Submitted"],
                  ].map(([v, k]) => (
                    <div key={k}>
                      <dd className="font-mono text-[24px] font-bold tabular-nums">{v}</dd>
                      <dt className="text-[11.5px] leading-tight text-[#CDBFB6]">{k}</dt>
                    </div>
                  ))}
                </dl>
              ) : null}
              {awayNote ? <p className="mt-[7px] text-[12.5px] text-[#CDBFB6]">{awayNote}</p> : null}
            </section>
            {watching ? (
              <section className="flex flex-col gap-2">
                <p className={LABEL}>Stars · most first</p>
                {stars.length === 0 ? (
                  <p className="text-[12.5px] leading-relaxed text-[#B8A99F]">
                    Nobody has a star. After warning a student, open their name and give one. Up to {MAX_STARS}.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {stars.map((r) => {
                      const a = away.find((x) => x.uid === r.uid);
                      const meta = a?.away_now ? "away now" : a ? `left ${a.left}×` : "not left";
                      return (
                        <StudentLine key={r.uid} uid={r.uid} name={r.name} stars={r.stars} strength="quiet" meta={meta} desk={desk} />
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}
            {watching || codeView ? (
              <section className="flex min-h-0 flex-col gap-2.5">
                <p className={LABEL}>Find a student</p>
                <FindStudent desk={desk} />
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* The phone's bottom bar, for the paper itself. */}
      {watching && !codeView ? (
        <nav className="grid shrink-0 auto-cols-fr grid-flow-col border-t border-[rgba(242,233,218,.14)] bg-[#1E0E12] px-1.5 pb-3.5 pt-1.5 lg:hidden">
          <TabButton on={tab === "watch"} label="Watch" sub={watch.length ? `${watch.length} to watch` : "none yet"} onClick={() => setTab("watch")} />
          <TabButton on={tab === "stars"} label="Stars" sub={String(stars.length)} onClick={() => setTab("stars")} />
          <TabButton on={tab === "find"} label="Find" sub="" onClick={() => setTab("find")} />
          {!s?.closed ? <TabButton on={false} label="Check-in code" sub="" onClick={() => setShowCode(true)} /> : null}
        </nav>
      ) : null}
    </div>
  );
}

function Centred({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 text-center">{children}</div>;
}

function PhoneCounts({ line, note }: { line: string; note: string | null }) {
  if (!line) return null;
  return (
    <div className="lg:hidden">
      <p className="rounded-[10px] border border-[rgba(242,233,218,.12)] bg-[#1E0E12] px-3 py-2 text-[13px] tabular-nums text-[#CDBFB6]">
        {line}
      </p>
      {note ? <p className="mt-1 text-[12.5px] text-[#CDBFB6]">{note}</p> : null}
    </div>
  );
}

function TabButton({ on, label, sub, onClick }: { on: boolean; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-14 flex-col items-center justify-center gap-[3px] rounded-xl ${
        on ? "bg-[#C9A24B] text-[#2B1A1C]" : "text-[#FDFBF7]"
      }`}
    >
      <span className="text-[14px] font-bold">{label}</span>
      {sub ? <span className="text-[11px] font-semibold">{sub}</span> : null}
    </button>
  );
}

/** Readable from two metres: 256 px code and 58 px digits on a phone, 440 and 112 on a laptop. */
function CodePanel({ code, left }: { code: NonNullable<DeskState["code"]>; left: number }) {
  return (
    <div className="flex flex-col items-center gap-3 lg:flex-1 lg:flex-row lg:justify-center lg:gap-14">
      {/* White ground and a quiet zone: a dark-theme QR scans badly on a cheap camera. */}
      <div
        className="w-[256px] shrink-0 rounded-2xl bg-white p-[18px] lg:w-[440px] lg:rounded-[22px] lg:p-[30px] [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: code.svg }}
        aria-label="Check-in code"
      />
      <div className="flex flex-col items-center gap-3 lg:items-start lg:gap-4">
        <p className={`hidden lg:block ${LABEL} text-[13px] tracking-[0.16em]`}>Desk code</p>
        <p className="font-mono text-[58px] font-bold leading-none tracking-[0.06em] tabular-nums lg:text-[112px] lg:tracking-[0.05em]">
          {code.code.slice(0, 3)} {code.code.slice(3)}
        </p>
        <div className="h-1 w-[220px] overflow-hidden rounded bg-[rgba(242,233,218,.15)] lg:h-[5px] lg:w-[360px]">
          <div className="h-full bg-[#C9A24B]" style={{ width: `${Math.min(100, (left / 30) * 100)}%` }} />
        </div>
        <p className="text-[13.5px] text-[#CDBFB6] lg:text-[16px]">Changes in {left} s</p>
        {/* The camera is the fast path and the typed code is the one that has
            actually been tested end to end. */}
        <p className="max-w-[320px] text-center text-[13.5px] leading-normal text-[#CDBFB6] lg:max-w-[420px] lg:text-left lg:text-[16px]">
          If the camera will not read it, they can type the six digits instead.
        </p>
      </div>
    </div>
  );
}

/**
 * Who has left the paper on their phone — another app, the home screen, a
 * call. The students to watch (3 exits, 2 minutes away in all, or away right
 * now; ruled 8 Oct 2026), then, quieter, the ones who left once or twice.
 *
 * A fact for the person in the room, not a verdict: a call from home looks
 * exactly like a search. It says what the phone saw and leaves the judging to
 * the invigilator, who can walk over and look.
 */
function WatchLists({ watch, rest, desk }: { watch: Away[]; rest: Away[]; desk: Desk }) {
  return (
    <>
      <div className="flex flex-col gap-[7px]">
        <div className="flex items-baseline gap-2.5">
          <p className={`${DISPLAY} whitespace-nowrap text-[21px]`}>Watch these students</p>
          {watch.length ? <p className="text-[13px] text-[#CDBFB6]">{watch.length}</p> : null}
        </div>
        <p className="text-[12px] leading-snug text-[#B8A99F]">
          Counts each time the paper left the screen. It cannot see a second phone. A call home looks the same as a
          search: go and look first.
        </p>
        {watch.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-dashed border-[rgba(242,233,218,.28)] p-[18px]">
            <p className="text-[17px] font-bold">Nobody to watch yet.</p>
            <p className="text-[14px] leading-relaxed text-[#CDBFB6]">
              A student appears here once they have left the paper <strong className="text-[#FDFBF7]">{WATCH_EXITS} times</strong>,
              been away <strong className="text-[#FDFBF7]">{WATCH_SECONDS / 60} minutes</strong> in total, or are{" "}
              <strong className="text-[#FDFBF7]">away right now</strong>.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-[7px]">
            {watch.map((r) => (
              <StudentLine
                key={r.uid}
                uid={r.uid}
                name={r.name}
                stars={r.stars}
                strength={strengthOf(r, true)}
                awayNow={r.away_now && r.status !== "submitted"}
                meta={awayMeta(r, true)}
                desk={desk}
              />
            ))}
          </ul>
        )}
      </div>
      {rest.length > 0 ? (
        <div className="mt-1 flex flex-col">
          <div className="mb-0.5 flex items-baseline gap-2.5">
            <p className={LABEL}>Left once or twice</p>
            <p className="text-[12px] text-[#B8A99F]">{rest.length}</p>
          </div>
          <ul className="flex flex-col">
            {rest.map((r) => (
              <StudentLine
                key={r.uid}
                uid={r.uid}
                name={r.name}
                stars={r.stars}
                strength={strengthOf(r, false)}
                meta={strengthOf(r, false) === "quiet" ? awayMeta(r, false) : awayMeta(r, true)}
                desk={desk}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** The phone's Stars tab: everyone with a star, most first, as full rows. */
function StarsTab({ stars, away, desk }: { stars: Starred[]; away: Away[]; desk: Desk }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <p className={`${DISPLAY} text-[23px]`}>Stars</p>
        <p className="text-[13px] text-[#CDBFB6]">
          {stars.length === 1 ? "1 student" : `${stars.length} students`}
          {stars.length > 1 ? " · most first" : ""}
        </p>
      </div>
      {stars.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-[#CDBFB6]">
          Nobody has a star. After warning a student, open their name in Watch or Find and give one. Up to {MAX_STARS}.
        </p>
      ) : (
        <ul className="flex flex-col gap-[7px]">
          {stars.map((r) => {
            const a = away.find((x) => x.uid === r.uid);
            return (
              <StudentLine
                key={r.uid}
                uid={r.uid}
                name={r.name}
                stars={r.stars}
                strength={r.stars >= MAX_STARS || a?.away_now ? "strong" : "watch"}
                awayNow={Boolean(a?.away_now && a.status !== "submitted")}
                meta={a ? awayMeta(a, true) : `Has not left the paper · Class ${r.class}`}
                desk={desk}
              />
            );
          })}
        </ul>
      )}
      <p className="text-[12.5px] leading-relaxed text-[#B8A99F]">
        A star records a warning you gave in person. Every star given or taken back is written down with your name and
        the time.
      </p>
    </div>
  );
}

/** ★★☆ — nothing at all when there are none, so a clean row stays clean. */
function StarMark({ count, size }: { count: number; size: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="shrink-0 whitespace-nowrap leading-none"
      style={{ fontSize: size, letterSpacing: size >= 20 ? 2 : 1 }}
      aria-label={`${count} of ${MAX_STARS} stars`}
    >
      <span className="text-[#E5BE7A]">{"★".repeat(count)}</span>
      <span className="text-[rgba(242,233,218,.22)]">{"★".repeat(Math.max(0, MAX_STARS - count))}</span>
    </span>
  );
}

const Chevron = ({ open }: { open: boolean }) => (
  <span
    aria-hidden
    className={`mx-1 mb-1 h-[9px] w-[9px] shrink-0 border-b-2 border-r-2 border-[#CDBFB6] transition-transform ${
      open ? "-rotate-[135deg] mb-0 mt-1" : "rotate-45"
    }`}
  />
);

/**
 * A star is a warning given in the room: the invigilator has spoken to the
 * student and records it, up to three. What three leads to is not decided yet
 * (8 Oct 2026); the count is kept and audited, and nothing acts on it. While a
 * tap is saving both buttons lock, so a double-tap cannot give two stars.
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
  const [busy, setBusy] = useState<1 | -1 | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function change(by: 1 | -1) {
    setBusy(by);
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
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy !== null || stars >= MAX_STARS}
          onClick={() => change(1)}
          className={`flex min-h-12 items-center gap-2 rounded-xl px-[18px] text-[15px] font-bold text-[#2B1A1C] ${
            busy === 1 ? "bg-[#A88A42]" : "bg-[#C9A24B] disabled:opacity-[.32]"
          }`}
        >
          {busy === 1 ? <Spinner /> : null}
          {busy === 1 ? "Saving…" : "★ Give a star"}
        </button>
        <button
          type="button"
          disabled={busy !== null || stars <= 0}
          onClick={() => change(-1)}
          className={`flex min-h-12 items-center gap-2 rounded-xl border-[1.5px] px-4 text-[15px] font-semibold ${
            busy !== null
              ? "border-[rgba(242,233,218,.25)] text-[#B8A99F]"
              : "border-[rgba(242,233,218,.45)] text-[#FDFBF7] disabled:opacity-[.32]"
          }`}
        >
          {busy === -1 ? <Spinner light /> : null}
          {busy === -1 ? "Saving…" : "Take one back"}
        </button>
        <span className="text-[13.5px] text-[#CDBFB6]">
          {stars >= MAX_STARS ? `${MAX_STARS} of ${MAX_STARS} — the most` : `${stars} of ${MAX_STARS}`}
        </span>
      </div>
      {note ? <p className="mt-1.5 text-[13px] text-[#E5BE7A]">{note}</p> : null}
    </div>
  );
}

const Spinner = ({ light }: { light?: boolean }) => (
  <span
    aria-hidden
    className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${
      light ? "border-[#B8A99F]" : "border-[#2B1A1C]"
    }`}
  />
);

/**
 * One student in a desk list, in one of three strengths: strongest (away now,
 * or 3 stars) with a gold border; "watch"; or a single quiet line. A tap opens
 * who they are, the star controls, and each time the paper left their screen —
 * fetched on the tap, not with the list. Star controls live only in here, so
 * nobody gives a star by brushing a list while walking.
 */
function StudentLine({
  uid,
  name,
  stars,
  strength,
  awayNow,
  meta,
  desk,
}: {
  uid: string;
  name: string;
  stars: number;
  strength: Strength;
  awayNow?: boolean;
  meta: string;
  desk: Desk;
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

  const id = `${uid.slice(0, 3)} ${uid.slice(3, 6)} ${uid.slice(6)}`;

  const body = open ? (
    <div className="mt-1.5 flex flex-col gap-3 border-t border-[rgba(242,233,218,.16)] pt-3">
      {note ? (
        <p className="text-[14px] text-[#E5BE7A]">{note}</p>
      ) : !detail ? (
        <p className="text-[14px] text-[#CDBFB6]">Loading…</p>
      ) : (
        <>
          <p className="text-[14px] leading-normal text-[#EDE3D8]">
            Class {detail.class} · {detail.school_name}
            <br />
            {detail.home_centre !== desk.centre ? `Registered at ${detail.home_centre} · ` : ""}
            {detail.checked_in_at ? `checked in ${clock(detail.checked_in_at)}` : "not checked in"}
          </p>
          <StarButtons uid={uid} stars={detail.stars} desk={desk} onChange={(n) => setDetail({ ...detail, stars: n })} />
          {detail.periods.length > 0 ? (
            <ol className="flex flex-col gap-[3px] font-mono text-[13px] tabular-nums text-[#EDE3D8]">
              {detail.periods.map((p) => (
                <li key={p.left_at} className="flex flex-wrap gap-1.5">
                  <span>
                    Left {clock(p.left_at)} →{p.back_at ? ` back ${clock(p.back_at)}` : ""}
                  </span>
                  {p.back_at ? null : <span className="font-bold text-[#E5BE7A]">not back</span>}
                  {p.how === "unfocused" ? <span className="text-[#CDBFB6]">· covered</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-[#CDBFB6]">Has not left the paper.</p>
          )}
        </>
      )}
    </div>
  ) : null;

  if (strength === "quiet") {
    return (
      <li className={`border-t border-[rgba(242,233,218,.10)] ${open ? "pb-3" : ""}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-h-10 w-full items-baseline gap-2.5 px-1 pt-1.5 text-left text-[#E2D6CB]"
        >
          <span className="text-[14.5px] font-semibold text-[#FDFBF7]">{name}</span>
          <span className="font-mono text-[12px] text-[#B8A99F]">{id}</span>
          <StarMark count={stars} size={14} />
          <span className="min-w-0 flex-1 text-right text-[13px] text-[#CDBFB6]">{meta}</span>
        </button>
        {body ? <div className="px-1">{body}</div> : null}
      </li>
    );
  }

  const strong = strength === "strong";
  return (
    <li
      className={`rounded-[14px] px-3.5 py-2.5 ${
        strong ? "border-2 border-[#C9A24B] bg-[#3A1C22]" : "border border-[rgba(242,233,218,.16)] bg-[#261318]"
      }`}
    >
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full flex-col gap-1.5 text-left">
        <span className="flex w-full items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className={`block font-bold leading-tight ${strong ? "text-[18px]" : "text-[17px]"}`}>{name}</span>
            <span className={`block font-mono tabular-nums text-[#CDBFB6] ${strong ? "text-[13.5px]" : "text-[13px]"}`}>{id}</span>
          </span>
          <StarMark count={stars} size={strong ? 22 : 20} />
          <Chevron open={open} />
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {awayNow ? (
            <span className="rounded-md bg-[#E5BE7A] px-[9px] py-1 text-[12.5px] font-extrabold tracking-[0.1em] text-[#3D0A10]">
              AWAY NOW
            </span>
          ) : null}
          <span className={`text-[14px] leading-snug ${strong ? "text-[#EDE3D8]" : "text-[#E2D6CB]"}`}>{meta}</span>
        </span>
      </button>
      {body}
    </li>
  );
}

/**
 * Find one student — the one just warned, or the one whose phone has died —
 * to give a star or let their paper carry on on another phone. Moving is
 * confirmed in place, inside the card, not in a pop-up over the list.
 */
function FindStudent({ desk }: { desk: Desk }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Student[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      const data = await post(desk, { q });
      setRows(data.ok ? data.students : []);
      setNote(data.ok ? null : { ok: false, text: data.message });
    } catch {
      setNote({ ok: false, text: "No connection. Try again." });
    }
  }

  async function release(s: Student) {
    const data = await post(desk, { release: s.uid });
    setConfirming(null);
    setNote({ ok: data.ok, text: data.message });
    if (data.ok) search();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <form
        onSubmit={search}
        className="flex h-[52px] items-center gap-2.5 rounded-xl border-[1.5px] border-[rgba(242,233,218,.25)] bg-[#241216] px-3.5 focus-within:border-[#E5BE7A] lg:h-12"
      >
        <Search size={18} strokeWidth={1.9} className="shrink-0 text-[#E5BE7A]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or User ID"
          enterKeyHint="search"
          className={`min-w-0 flex-1 bg-transparent text-[#FDFBF7] outline-none placeholder:text-[#B8A99F] ${q ? "font-mono text-[16px]" : "text-[15px]"}`}
        />
      </form>
      {note ? <p className={`text-[13.5px] ${note.ok ? "text-[#CDBFB6]" : "text-[#E5BE7A]"}`}>{note.text}</p> : null}
      {rows ? (
        rows.length === 0 ? (
          <p className="text-[13.5px] text-[#B8A99F]">Nobody by that name at this centre.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((s) => {
              const state = !s.checked_in_at
                ? "not checked in"
                : s.status === "submitted"
                  ? "submitted"
                  : s.status === "in_progress"
                    ? s.released
                      ? "released, waiting for the new phone"
                      : `writing · ${s.answered} answered`
                    : "checked in, not started";
              const canMove = s.status === "in_progress" && !s.released;
              return (
                <li
                  key={s.uid}
                  className="flex flex-col gap-[11px] rounded-[14px] border border-[rgba(242,233,218,.16)] bg-[#261318] px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-bold">{s.name}</p>
                      <p className="font-mono text-[13px] text-[#CDBFB6]">
                        {s.uid.slice(0, 3)} {s.uid.slice(3, 6)} {s.uid.slice(6)}
                      </p>
                    </div>
                    <StarMark count={s.stars} size={20} />
                  </div>
                  <p className="text-[14px] leading-snug text-[#E2D6CB]">
                    Class {s.class}
                    {s.home_centre !== desk.centre ? ` · registered at ${s.home_centre}` : ""} · {state}
                  </p>
                  <StarButtons
                    uid={s.uid}
                    stars={s.stars}
                    desk={desk}
                    onChange={(n) => setRows((rs) => rs?.map((x) => (x.uid === s.uid ? { ...x, stars: n } : x)) ?? null)}
                  />
                  {canMove && confirming !== s.uid ? (
                    <button
                      type="button"
                      onClick={() => setConfirming(s.uid)}
                      className="min-h-12 rounded-xl border-[1.5px] border-[rgba(242,233,218,.45)] text-[15px] font-semibold hover:bg-[#2e171d]"
                    >
                      Move to another phone
                    </button>
                  ) : null}
                  {canMove && confirming === s.uid ? (
                    <div className="flex flex-col gap-3 rounded-xl bg-[#FDFBF7] px-4 py-3.5 text-[#2B1A1C]">
                      <p className="text-[15px] leading-normal">
                        Move {s.name}&rsquo;s paper to another phone? They keep every answer and the same time. The phone it
                        was on can no longer save.
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="min-h-12 flex-1 rounded-[11px] border-[1.5px] border-[#D9CDBB] text-[15px] font-semibold"
                        >
                          Keep it here
                        </button>
                        <button
                          type="button"
                          onClick={() => release(s)}
                          className="min-h-12 flex-[1.3] rounded-[11px] bg-[#7B1E2B] text-[15px] font-bold text-[#FDFBF7]"
                        >
                          Move the paper
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}

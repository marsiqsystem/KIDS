"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, Entry, StageData } from "@/lib/exam/toppers";

/**
 * The Publish Moment — the SET 2026 stage instrument.
 *
 * Three acts on one screen:
 *
 *   I   the wait      a button that must be HELD for 1.5s. Publishing every
 *                     child's result is the one irreversible thing this
 *                     codebase does; it should not be one slip of a finger
 *                     away, and a hold reads to an audience as intent.
 *   II  the drop      ambient motion freezes, light breaks outward, the words
 *                     land, the confetti falls once and never loops.
 *   III the boards    class toppers, streams, zones, districts, centres,
 *                     schools, the finale. Driven with the arrow keys.
 *
 * The publish request fires at the START of Act II, not at its end: the results
 * must already be open by the time the audience has finished reading the word,
 * because the first thing 200 people do is reach for their phones. If it fails,
 * the show still runs and the failure is printed where only the operator will
 * look — the worst possible moment to make a hall watch an error message.
 *
 * `?rehearse=1` runs everything with the publish call disabled.
 */
const HOLD_MS = 1500;
const CONFETTI = ["#C9A24B", "#E5BE7A", "#F4C12A", "#FDFBF7", "#1E9E8C"];
const RING_R = 228;
const RING_C = 2 * Math.PI * RING_R;

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

type Act = "wait" | "declare" | "boards";

export default function StageShow({
  data, alreadyPublished, rehearse,
}: {
  data: StageData;
  alreadyPublished: boolean;
  rehearse: boolean;
}) {
  const [act, setAct] = useState<Act>("wait");
  const [progress, setProgress] = useState(0);
  const [charging, setCharging] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [carry, setCarry] = useState(false);
  const [showWait, setShowWait] = useState(true);
  const [boardIdx, setBoardIdx] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const holding = useRef(false);
  const raf = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const confRaf = useRef(0);
  const boards = data.boards;

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /* ---- the stage is a fixed 1920×1080 canvas, scaled to the projector ---- */
  useEffect(() => {
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      document.documentElement.style.setProperty("--stage-scale", String(s || 1));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* ---- the celebration: one fall, no loop ---- */
  const confetti = useCallback((count: number, life: number) => {
    const el = canvas.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const W = 1920, H = 1080;
    const ps = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: -Math.random() * H * 0.9,
      w: 4 + Math.random() * 5, h: 12 + Math.random() * 20,
      vy: 90 + Math.random() * 150, vx: -26 + Math.random() * 52,
      rot: Math.random() * Math.PI, vr: -1.6 + Math.random() * 3.2,
      c: CONFETTI[(Math.random() * CONFETTI.length) | 0],
      a: 0.55 + Math.random() * 0.45,
    }));
    const t0 = performance.now();
    let last = t0;
    cancelAnimationFrame(confRaf.current);
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const age = now - t0;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of ps) {
        p.y += p.vy * dt; p.x += p.vx * dt; p.rot += p.vr * dt;
        p.vy = Math.min(p.vy + 26 * dt, 260);
        const fade = age > life ? Math.max(0, 1 - (age - life) / 900) : 1;
        if (p.y < H + 60 && fade > 0) alive++;
        ctx.save();
        ctx.globalAlpha = p.a * fade * (p.y > H - 140 ? Math.max(0, (H + 40 - p.y) / 180) : 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive > 0 && age < life + 1200) confRaf.current = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, W, H);
    };
    confRaf.current = requestAnimationFrame(step);
  }, []);

  /* ---- Act II ---- */
  const fire = useCallback(() => {
    holding.current = false;
    cancelAnimationFrame(raf.current);
    clearTimers();
    setCharging(false);
    setFreeze(true);
    setAct("declare");

    // The request goes out NOW, in parallel with the animation. By the time the
    // audience has read the word, the phones in the hall already work.
    if (rehearse) {
      setNote("REHEARSAL — nothing was published");
    } else {
      fetch("/api/stage/publish", { method: "POST" })
        .then((r) => r.json().then((d) => ({ ok: r.ok && d.ok, d })))
        .then(({ ok, d }) => {
          if (ok) setNote(`${fmt(d.published)} results are live`);
          else setError(d.message ?? "Publish failed. Results are NOT live.");
        })
        .catch(() => setError("Could not reach the server. Results are NOT live — check the connection and hold again."));
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      after(60, () => { setFreeze(false); setShowWait(false); });
      after(1600, () => { setAct("boards"); setBoardIdx(0); });
      return;
    }
    after(430, () => { setFreeze(false); setCarry(true); });
    after(1500, () => setShowWait(false));
    after(2500, () => confetti(190, 5200));
    after(6400, () => { setAct("boards"); setBoardIdx(0); setCarry(false); });
  }, [rehearse, confetti]);

  /* ---- Act I: hold to fire ---- */
  const holdStart = useCallback(() => {
    if (act !== "wait" || holding.current) return;
    holding.current = true;
    setCharging(true);
    let last = performance.now();
    let p = 0;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      p += holding.current ? dt / HOLD_MS : -dt / 420;
      if (p >= 1) { setProgress(1); fire(); return; }
      if (p <= 0) { setProgress(0); setCharging(false); return; }
      setProgress(p);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [act, fire]);

  const holdEnd = useCallback(() => { holding.current = false; }, []);

  /* ---- Act III ---- */
  const goTo = useCallback((n: number) => {
    const i = Math.max(0, Math.min(boards.length - 1, n));
    setBoardIdx(i);
    if (boards[i]?.kind === "finale") confetti(130, 3600);
  }, [boards, confetti]);

  const reset = useCallback(() => {
    clearTimers();
    cancelAnimationFrame(confRaf.current);
    canvas.current?.getContext("2d")?.clearRect(0, 0, 1920, 1080);
    holding.current = false;
    setAct("wait"); setShowWait(true); setCarry(false); setFreeze(false);
    setProgress(0); setCharging(false); setBoardIdx(0); setError(null); setNote(null);
  }, []);

  /* ---- operator keyboard ---- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "?" || (k === "/" && e.shiftKey)) { e.preventDefault(); setShowHelp((v) => !v); return; }
      if (k === "r" || k === "R") { e.preventDefault(); reset(); return; }
      if (k === "f" || k === "F") {
        e.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
        return;
      }
      if (act === "wait" && (k === " " || k === "Enter")) {
        e.preventDefault();
        if (!e.repeat) holdStart();
        return;
      }
      if (act === "boards") {
        if (k === "ArrowRight" || k === "PageDown") { e.preventDefault(); goTo(boardIdx + 1); }
        if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); goTo(boardIdx - 1); }
      }
    };
    const up = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") holdEnd(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [act, boardIdx, goTo, holdStart, holdEnd, reset]);

  useEffect(() => () => {
    clearTimers();
    cancelAnimationFrame(raf.current);
    cancelAnimationFrame(confRaf.current);
  }, []);

  const board = boards[Math.min(boardIdx, boards.length - 1)];

  return (
    <div className="stage" data-freeze={freeze ? "1" : "0"} data-carry={carry ? "1" : "0"}>
      <div className="stage-fit">
        {/* ─────────────────────────────────── Act I ─── */}
        {showWait && (
          <div className="stage-layer stage-carry">
            <div className="stage-breathe" style={{ textAlign: "center" }}>
              <div className="stage-eyebrow">Students Evaluation Test 2026&ndash;27</div>
              <h1 className="stage-title">
                First Phase Results
              </h1>
              <p className="stage-sub">Project UDAAN · Kabitirtha Institute of Development &amp; Studies</p>
              <div className="stage-stats" style={{ justifyContent: "center" }}>
                <div>
                  <div className="stage-stat-v">{fmt(data.overview.appeared)}</div>
                  <div className="stage-stat-l">Candidates</div>
                </div>
                <div>
                  <div className="stage-stat-v">{String(data.overview.centres).padStart(2, "0")}</div>
                  <div className="stage-stat-l">Centres</div>
                </div>
                <div>
                  <div className="stage-stat-v">{fmt(data.overview.schools)}</div>
                  <div className="stage-stat-l">Schools</div>
                </div>
              </div>
            </div>

            <button
              className="stage-hold"
              data-charging={charging ? "1" : "0"}
              onPointerDown={(e) => { e.preventDefault(); holdStart(); }}
              onPointerUp={holdEnd}
              onPointerLeave={holdEnd}
              onPointerCancel={holdEnd}
              aria-label="Hold to publish the SET 2026 written results"
            >
              <svg className="stage-ring" viewBox="0 0 480 480" aria-hidden="true">
                <circle className="track" cx="240" cy="240" r={RING_R} />
                <circle
                  className="fill" cx="240" cy="240" r={RING_R}
                  strokeDasharray={`${(progress * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`}
                />
              </svg>
              <span className="stage-hold-disc">
                <span className="stage-hold-word">PUBLISH</span>
                <span className="stage-hold-hint">Hold to declare</span>
              </span>
            </button>
          </div>
        )}

        {/* ────────────────────────────────── Act II ─── */}
        {act === "declare" && (
          <div className="stage-layer">
            <div className="stage-flash" aria-hidden="true" />
            <div style={{ textAlign: "center", position: "relative" }}>
              <div className="stage-declare-word">RESULTS</div>
              <div className="stage-declare-word two">PUBLISHED</div>
              <div className="stage-declare-rule" />
              <div className="stage-declare-line">
                Declared live on stage · {data.eventDate}
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────── Act III ─── */}
        {act === "boards" && board && (
          <BoardView key={board.id} board={board} data={data} />
        )}

        <canvas className="stage-confetti" ref={canvas} width={1920} height={1080} aria-hidden="true" />

        {/* ── operator chrome ── */}
        {act === "boards" && (
          <div className="stage-rail">
            <div className="stage-pips">
              {boards.map((b, i) => (
                <span key={b.id} className="stage-pip"
                  data-on={i === boardIdx ? "2" : i < boardIdx ? "1" : "0"} />
              ))}
            </div>
            <span className="stage-rail-label">
              BOARD {String(boardIdx + 1).padStart(2, "0")} / {String(boards.length).padStart(2, "0")}
            </span>
          </div>
        )}

        {(rehearse || note || alreadyPublished) && (
          <div className="stage-flag">
            {rehearse ? "Rehearsal — publish disabled"
              : note ?? "Results were already published"}
          </div>
        )}
        {error && <div className="stage-error" role="alert">{error}</div>}

        {showHelp && (
          <div className="stage-help" onClick={() => setShowHelp(false)}>
            <dl>
              <dt>Hold Space</dt><dd>Publish and start the declaration</dd>
              <dt>&larr; &rarr;</dt><dd>Move between boards</dd>
              <dt>F</dt><dd>Full screen</dd>
              <dt>R</dt><dd>Reset to the waiting screen (does not un-publish)</dd>
              <dt>?</dt><dd>Close this</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── the boards ─── */

function BoardView({ board, data }: { board: Board; data: StageData }) {
  const e = board.entries;
  return (
    <div className="stage-board stage-rise">
      <div className="stage-board-head">
        <div className="stage-board-eyebrow">{board.eyebrow}</div>
        <h2 className="stage-board-title">{board.title}</h2>
        <p className="stage-board-sub">{board.subtitle}</p>
        <div className="stage-board-count">{board.count}</div>
      </div>

      {board.kind === "overview" && (
        <div className="stage-cells">
          {[
            { v: fmt(data.overview.appeared), l: "Candidates appeared", n: `across ${data.overview.centres} centres` },
            { v: fmt(data.overview.marked), l: "OMR sheets marked", n: "assessed and verified" },
            { v: String(data.overview.highest), l: "Highest mark", n: "out of 100" },
            { v: data.overview.average.toFixed(1), l: "Overall average", n: "marks out of 100" },
            { v: String(data.overview.centres), l: "Examination centres", n: "Kolkata · Suburb · Asansol" },
            { v: fmt(data.overview.schools), l: "Schools represented", n: "across every district" },
          ].map((c) => (
            <div key={c.l} className="stage-cell">
              <div className="stage-cell-v">{c.v}</div>
              <div className="stage-cell-l">{c.l}</div>
              <div className="stage-cell-n">{c.n}</div>
            </div>
          ))}
        </div>
      )}

      {board.kind === "podium" && (
        <>
          <div className="stage-podium">
            {[e[1], e[0], e[2]].map((x, i) =>
              x ? <Step key={x.rank} e={x} first={i === 1} /> : <div key={i} />)}
          </div>
          {e.length > 3 && (
            <div className="stage-tail">
              {e.slice(3).map((x) => (
                <div key={x.rank} className="stage-tail-row">
                  <span className="stage-tail-rank">{x.rank}</span>
                  <span>
                    <span className="stage-tail-name">{x.name}</span>
                    <span className="stage-tail-sub" style={{ display: "block" }}>
                      {x.school}{x.stream && ` · ${x.stream}`}
                    </span>
                  </span>
                  <span className="stage-tail-marks">{x.marks}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {board.kind === "columns" && (
        <div className="stage-cols">
          {e.map((x) => (
            <div key={x.anchor} className="stage-step">
              <div className="stage-step-rank">{x.anchor}</div>
              <div className="stage-step-name">{x.name}</div>
              <div className="stage-step-school">{x.school}</div>
              <div className="stage-step-marks">{x.marks}<span> / 100</span></div>
            </div>
          ))}
        </div>
      )}

      {board.kind === "list" && (
        <div className={`stage-list${e.length > 11 ? " two" : ""}`}>
          {e.map((x) => (
            <div key={x.anchor} className="stage-list-row">
              <span className="stage-list-anchor">{x.anchor}</span>
              <span>
                <span className="stage-list-name">{x.name}</span>
                <span className="stage-list-sub" style={{ display: "block" }}>{x.school}</span>
              </span>
              <span className="stage-list-marks">{x.marks}</span>
            </div>
          ))}
        </div>
      )}

      {board.kind === "finale" && (
        <div className="stage-finale">
          {e.map((x) => (
            <div key={x.rank} className={`stage-finale-row${x.rank === 1 ? " one" : ""}`}>
              <span className="stage-finale-rank">{x.rank}</span>
              <span>
                <span className="stage-finale-name" style={{ display: "block" }}>{x.name}</span>
                <span className="stage-finale-sub">
                  {x.school} · Class {x.className}{x.stream && ` · ${x.stream}`} · {x.centre}
                </span>
              </span>
              <span className="stage-finale-marks">{x.marks}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Step({ e, first }: { e: Entry; first: boolean }) {
  return (
    <div className={`stage-step${first ? " one" : ""}`}>
      <div className="stage-step-rank">{e.rank}</div>
      <div className="stage-step-name">{e.name}</div>
      <div className="stage-step-school">
        {e.school}
        <br />
        {e.centre}{e.stream && ` · ${e.stream}`}
      </div>
      <div className="stage-step-marks">{e.marks}<span> / 100</span></div>
    </div>
  );
}

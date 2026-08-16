"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Entry, StageData } from "@/lib/exam/toppers";

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
  const e = board?.entries ?? [];
  const [p1, p2, p3] = e;

  return (
    <div className="stage" data-freeze={freeze ? "1" : "0"} data-carry={carry ? "1" : "0"}>
      <div className="stage-fit">
        <div className="stage-tex-a" aria-hidden />
        <div className="stage-tex-b" aria-hidden />
        <span className="stage-star" style={{ top: 120, left: 230, fontSize: 18 }} aria-hidden>★</span>
        <span className="stage-star" style={{ top: 220, left: 1590, fontSize: 13, animationDelay: "1.5s" }} aria-hidden>★</span>
        <span className="stage-star" style={{ top: 820, left: 150, fontSize: 12, animationDelay: ".8s" }} aria-hidden>★</span>
        <span className="stage-star" style={{ top: 900, left: 1700, fontSize: 16, animationDelay: "2.2s" }} aria-hidden>★</span>

        {/* ═══════════════════════════════════════════════ Act I ═══ */}
        {showWait && (
          <div className="stage-wait">
            <div className="stage-crest">
              <div className="stage-crest-name">Kabitirtha Institute of Development &amp; Studies</div>
              <div className="stage-crest-rule"><i /><span>★</span><i /></div>
              <div className="stage-crest-mark">
                <div className="stage-crest-set">SET 2026</div>
                <div className="stage-crest-sub">
                  Students Evaluation Test<br />Project UDAAN · Kolkata
                </div>
              </div>
            </div>

            <div className="stage-holdwrap">
              <div className="stage-dial">
                <div className="stage-halo" aria-hidden />
                <div className="stage-halo late" aria-hidden />
                <svg className="stage-ring" width="480" height="480" viewBox="0 0 480 480" aria-hidden>
                  <circle cx="240" cy="240" r={RING_R} fill="none"
                    stroke="rgba(201,162,75,0.18)" strokeWidth="6" />
                  {charging && (
                    <circle cx="240" cy="240" r={RING_R} fill="none"
                      stroke="var(--accent-bright)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(progress * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`}
                      style={{ filter: "drop-shadow(0 0 10px rgba(244,193,42,.8))" }} />
                  )}
                </svg>
                <button type="button" className="stage-hold"
                  aria-label="Hold to publish the results of SET 2026"
                  onPointerDown={(ev) => { ev.preventDefault(); holdStart(); }}
                  onPointerUp={holdEnd} onPointerLeave={holdEnd} onPointerCancel={holdEnd}>
                  <span className="stage-hold-face" aria-hidden />
                  <span className="stage-hold-body">
                    <span className="stage-hold-star" aria-hidden>★</span>
                    <span className="stage-hold-word">PUBLISH</span>
                    <span className="stage-hold-hair" aria-hidden />
                    <span className="stage-hold-hint">HOLD 1.5s</span>
                  </span>
                </button>
              </div>
              <div className="stage-sealed">
                <i aria-hidden />
                <span>{alreadyPublished ? "ALREADY DECLARED" : "SEALED"}</span>
              </div>
            </div>

            <div className="stage-stats">
              <div className="stage-stat">
                <div className="stage-stat-v">{fmt(data.overview.appeared)}</div>
                <div className="stage-stat-l">Candidates</div>
              </div>
              <div className="stage-stat-div" aria-hidden />
              <div className="stage-stat">
                <div className="stage-stat-v">{String(data.overview.centres).padStart(2, "0")}</div>
                <div className="stage-stat-l">Centres</div>
              </div>
              <div className="stage-stat-div" aria-hidden />
              <div className="stage-stat">
                <div className="stage-stat-v">IX&ndash;XII</div>
                <div className="stage-stat-l">Classes</div>
              </div>
              <div className="stage-stat-div" aria-hidden />
              <div className="stage-stat">
                <div className="stage-stat-v">{fmt(data.overview.schools)}</div>
                <div className="stage-stat-l">Schools</div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ Act II ═══ */}
        {act === "declare" && (
          <div className="stage-declare">
            <div className="stage-flash" aria-hidden />
            <div style={{ textAlign: "center", position: "relative" }}>
              <div className="stage-word">RESULTS</div>
              <div className="stage-word two">PUBLISHED</div>
              <div className="stage-declare-rule" />
              <div className="stage-declare-line">Declared live on stage · {data.eventDate}</div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════ Act III ═══ */}
        {act === "boards" && board && (
          <div className="stage-board" key={board.id}>
            <div className="stage-head">
              <div className="stage-head-l">
                <div className="stage-eyebrow">{board.eyebrow}</div>
                <h1 className="stage-h1">{board.title}</h1>
                <div className="stage-h2">{board.subtitle}</div>
              </div>
              <div className="stage-head-r">
                <div className="stage-count">{board.count}</div>
                <div className="stage-mark">SET 2026</div>
              </div>
            </div>
            <div className="stage-rule" />

            <div className="stage-body">
              {board.kind === "overview" && (
                <div className="stage-cells">
                  {[
                    { v: fmt(data.overview.appeared), l: "Candidates appeared", n: `across ${data.overview.centres} centres` },
                    { v: fmt(data.overview.marked), l: "OMR sheets marked", n: "assessed and verified" },
                    { v: String(data.overview.highest), l: "Highest mark", n: "out of 100" },
                    { v: data.overview.average.toFixed(1), l: "Overall average", n: "marks out of 100" },
                    { v: String(data.overview.centres), l: "Examination centres", n: "Kolkata · Suburb · Asansol" },
                    { v: fmt(data.overview.schools), l: "Schools represented", n: "across every district" },
                  ].map((c, i) => (
                    <div key={c.l} className="stage-cell" style={{ animationDelay: `${i * 70}ms` }}>
                      <div className="stage-cell-v">{c.v}</div>
                      <div className="stage-cell-l">{c.l}</div>
                      <div className="stage-cell-n">{c.n}</div>
                    </div>
                  ))}
                </div>
              )}

              {board.kind === "podium" && (
                <div className="stage-podium-wrap">
                  <div className="stage-podium">
                    <Step e={p2} rank={2} />
                    <Step e={p1} rank={1} first />
                    <Step e={p3} rank={3} />
                  </div>
                  {e.length > 3 && (
                    <div className="stage-tail">
                      <div className="stage-tr head">
                        <div>Rank</div><div>Name</div><div>School</div><div>Centre</div>
                        <div style={{ textAlign: "right" }}>Marks</div>
                        <div style={{ textAlign: "right" }}>Percent</div>
                      </div>
                      {e.slice(3).map((x, i) => (
                        <div key={x.rank} className="stage-tr" style={{ animationDelay: `${i * 45}ms` }}>
                          <div className="rank">{x.rank}</div>
                          <div className="nm">{x.name}</div>
                          <div className="sc">{x.school}</div>
                          <div className="ce">{x.centre}</div>
                          <div className="mk">{x.marks}</div>
                          <div className="pc">{x.percent}%</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {board.kind === "columns" && (
                <div className="stage-cols">
                  {e.map((x, i) => (
                    <div key={x.anchor} className="stage-col" style={{ animationDelay: `${i * 90}ms` }}>
                      <div className="stage-col-lab"><span aria-hidden>★</span><b>{x.anchor}</b></div>
                      <div className="stage-col-name">{x.name}</div>
                      <div className="stage-col-sub">{x.school}<br />{x.centre} · {x.meta}</div>
                      <div className="stage-col-marks">
                        <b>{x.marks}</b><span>/ 100 · {x.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {board.kind === "list" && (
                <div className={`stage-list${e.length > 18 ? " dense denser" : e.length > 9 ? " dense" : ""}`}>
                  {e.map((x, i) => (
                    <div key={x.anchor} className="stage-li" style={{ animationDelay: `${i * 35}ms` }}>
                      <div className="stage-li-top">
                        <div className="stage-li-anchor">{x.anchor}</div>
                        <div className="stage-li-marks">{x.marks}</div>
                      </div>
                      <div className="stage-li-name">{x.name}</div>
                      <div className="stage-li-sub">{x.school} · {x.meta}</div>
                    </div>
                  ))}
                </div>
              )}

              {board.kind === "finale" && p1 && (
                <div className="stage-finale">
                  <div className="stage-fin-lab"><span aria-hidden>★</span><b>RANK 01</b></div>
                  <div className="stage-fin-name">{p1.name}</div>
                  <div className="stage-fin-sub">{p1.school} · {p1.centre} · {p1.meta}</div>
                  <div className="stage-fin-marks">
                    <b>{p1.marks}</b><span>/ 100 · {p1.percent}%</span>
                  </div>
                  <div className="stage-fin-pair">
                    {[p2, p3].filter(Boolean).map((x) => (
                      <div key={x.rank} className="stage-card stage-fin-card">
                        <div className="stage-step-lab">
                          <span aria-hidden>★</span>
                          <b>RANK {String(x.rank).padStart(2, "0")}</b>
                        </div>
                        <div className="n">{x.name}</div>
                        <div className="s">{x.school} · {x.meta}</div>
                        <div className="m">{x.marks} / 100 · {x.percent}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="stage-rail">
              <span className="stage-rail-label">
                BOARD {String(boardIdx + 1).padStart(2, "0")} / {String(boards.length).padStart(2, "0")}
              </span>
              <span className="stage-pips">
                {boards.map((b, i) => (
                  <span key={b.id} className="stage-pip"
                    data-on={i === boardIdx ? "2" : i < boardIdx ? "1" : "0"} />
                ))}
              </span>
              <span className="stage-rail-keys">PRESS ? FOR KEYS</span>
            </div>
          </div>
        )}

        <canvas className="stage-confetti" ref={canvas} width={1920} height={1080} aria-hidden />

        {(rehearse || note) && (
          <div className={`stage-badge${note && !rehearse ? " live" : ""}`}>
            {rehearse ? "REHEARSAL" : note}
          </div>
        )}
        {error && <div className="stage-error" role="alert">{error}</div>}
        {showHelp && (
          <div className="stage-help">
            Space / Enter &mdash; hold to publish · &rarr; &larr; board · F fullscreen · R reset · ? this legend
          </div>
        )}
      </div>
    </div>
  );
}

/** One podium step. Rank 1 is the tall middle card; 2 and 3 sit lower. */
function Step({ e, rank, first }: { e?: Entry; rank: number; first?: boolean }) {
  if (!e) return <div />;
  return (
    <div className={`stage-card stage-step${first ? " one" : ""}`}
      style={{ animationDelay: first ? "0ms" : rank === 2 ? "120ms" : "240ms" }}>
      <div className="stage-step-lab">
        <span aria-hidden>★</span><b>RANK {String(rank).padStart(2, "0")}</b>
      </div>
      <div className="stage-step-name">{e.name}</div>
      <div className="stage-step-sub">{e.school}<br />{e.centre} · {e.meta}</div>
      <div className="stage-step-marks">
        <b>{e.marks}</b><span>/ 100 · {e.percent}%</span>
      </div>
    </div>
  );
}

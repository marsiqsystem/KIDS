"use client";

import { useMemo, useState } from "react";
import type { InteractiveTemplate } from "@/lib/exam/chapter-assets";

/**
 * Learn it — the chapters this student lost most marks in, and what to do.
 *
 * One card per chapter: the trick (a memory hook, not a summary), an activity,
 * and the video where there is one. Ordered by marks lost, so the top card is
 * always worth more of their time than the bottom one.
 *
 * Four activity types are playable here; the rest are shown as a study card
 * with the answer behind a tap. That is deliberate — a blank where a game
 * should be teaches nothing, and a half-built game teaches worse.
 *
 * Everything is tap-driven. This is read on a phone, and drag-and-drop on a
 * small touch screen is how you lose a child in the first ten seconds.
 */
export interface LearnCard {
  chapter: string;
  section: string;
  correct: number;
  total: number;
  trick: string;
  videoId: string | null;
  videoLanguage: string | null;
  template: InteractiveTemplate;
  data: Record<string, unknown>;
  playable: boolean;
}

/**
 * A stable DOM id for one chapter's card, so the question sheet's
 * "Revise this chapter" button has somewhere to send the reader.
 */
export const chapterAnchor = (chapter: string) =>
  `learn-${chapter.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

/** The design's own name for each activity, shown after "Practice ·". */
const TEMPLATE_LABEL: Record<InteractiveTemplate, string> = {
  "match-pairs": "Match the pairs", "sort-bins": "Sort into bins",
  "true-false": "True or false", "step-solve": "Solve step by step",
  "timeline-order": "Put in order", "fill-blank": "Fill the blank",
  "formula-pick": "Pick the formula", "odd-one-out": "Odd one out",
  "label-diagram": "Label the diagram", transform: "Transform the sentence",
};

export function LearnIt({ cards }: { cards: LearnCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {cards.map((c) => <Card key={`${c.section}|${c.chapter}`} card={c} />)}
    </div>
  );
}

/**
 * One chapter, laid out as the design has it: the trick, the practice and the
 * video stacked in that order. Not tabs — a child who has to discover that a
 * "Practice" tab exists mostly does not, and the trick alone is not the lesson.
 */
function Card({ card }: { card: LearnCard }) {
  return (
    <article className="lcard" id={chapterAnchor(card.chapter)} style={{ scrollMarginTop: "12px" }}>
      <header className="border-b border-[var(--cream-muted)] px-3.5 pb-2.5 pt-3">
        <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
          {card.section}
        </div>
        <div className="mt-0.5 font-[family-name:var(--font-display)] text-[1.02rem] text-[var(--maroon)]">
          {card.chapter}
        </div>
        <div className="tnum mt-0.5 text-[0.72rem] text-[var(--ink-muted)]">
          {card.correct} of {card.total} on your paper
        </div>
      </header>

      <div className="flex items-start gap-2.5 bg-[#F7EEDA] px-3.5 py-[13px]">
        <span aria-hidden className="flex-none text-[1rem] leading-[1.35] text-[var(--gold)]">★</span>
        <div>
          <div className="mb-[3px] text-[0.64rem] font-bold uppercase tracking-[0.1em]"
            style={{ color: "#8A6A17" }}>
            The trick
          </div>
          <p className="text-[0.86rem] leading-[1.55]">{card.trick}</p>
        </div>
      </div>

      <div className="border-t border-[var(--cream-muted)] px-3.5 py-[13px]">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[0.64rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
            Practice · {TEMPLATE_LABEL[card.template]}
          </span>
        </div>
        <Activity card={card} />
      </div>

      {card.videoId ? (
        <div className="border-t border-[var(--cream-muted)] px-3.5 py-[13px]">
          <div className="mb-2 text-[0.64rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
            Video lesson
          </div>
          <div className="lvideo">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${card.videoId}`}
              title={`${card.chapter} — video lesson`}
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
            <p className="note">
              {card.videoLanguage ? `${card.videoLanguage.toLowerCase()} · ` : ""}
              chosen for this chapter. If it does not play here,{" "}
              <a href={`https://www.youtube.com/watch?v=${card.videoId}`}
                target="_blank" rel="noreferrer">open it on YouTube</a>.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--cream-muted)] bg-[var(--cream-surface)] px-3.5 py-[11px]">
          <p className="text-[0.74rem] leading-[1.5] text-[var(--ink-muted)]">
            No video for this chapter yet. The trick and the practice above are the
            whole lesson.
          </p>
        </div>
      )}
    </article>
  );
}

/* ─────────────────────────────────────────────────── activities ─── */

function Activity({ card }: { card: LearnCard }) {
  const d = card.data;
  const prompt = String(d.prompt ?? "");
  if (!card.playable) return <StudyCard card={card} prompt={prompt} />;
  switch (card.template) {
    case "match-pairs": return <MatchPairs prompt={prompt} data={d} />;
    case "sort-bins": return <SortBins prompt={prompt} data={d} />;
    case "true-false": return <TrueFalse prompt={prompt} data={d} />;
    case "odd-one-out": return <OddOneOut prompt={prompt} data={d} />;
    default: return <StudyCard card={card} prompt={prompt} />;
  }
}

/** Deterministic shuffle — a fixed order per chapter, so a reload is not a reset. */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return items
    .map((v, i) => ({ v, k: Math.abs(Math.sin(h + i) * 10000) % 1 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

function MatchPairs({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const pairs = (data.pairs ?? []) as { left: string; right: string }[];
  const rights = useMemo(() => shuffled(pairs.map((p) => p.right), prompt), [pairs, prompt]);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);

  const choose = (right: string) => {
    if (!picked) return;
    const want = pairs.find((p) => p.left === picked)?.right;
    if (want === right) {
      setDone((d) => ({ ...d, [picked]: right }));
      setPicked(null); setWrong(null);
    } else {
      setWrong(right);
      setTimeout(() => setWrong(null), 700);
    }
  };
  const finished = Object.keys(done).length === pairs.length;

  return (
    <div className="act">
      <p className="aprompt">{prompt}</p>
      <div className="pairs">
        <ul>
          {pairs.map((p) => (
            <li key={p.left}>
              <button type="button"
                className={`pill${done[p.left] ? " got" : ""}${picked === p.left ? " sel" : ""}`}
                disabled={!!done[p.left]}
                onClick={() => setPicked(picked === p.left ? null : p.left)}>
                {p.left}
                {done[p.left] && <span className="ans"> → {done[p.left]}</span>}
              </button>
            </li>
          ))}
        </ul>
        <ul>
          {rights.map((r) => {
            const used = Object.values(done).includes(r);
            return (
              <li key={r}>
                <button type="button"
                  className={`pill alt${used ? " got" : ""}${wrong === r ? " no" : ""}`}
                  disabled={used || !picked}
                  onClick={() => choose(r)}>{r}</button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="astate">
        {finished ? "All matched — well done."
          : picked ? "Now tap what it goes with."
          : "Tap one on the left, then its partner on the right."}
      </p>
    </div>
  );
}

function SortBins({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const bins = (data.bins ?? []) as string[];
  const items = (data.items ?? []) as { label: string; bin: string }[];
  const order = useMemo(() => shuffled(items, prompt), [items, prompt]);
  const [at, setAt] = useState(0);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const current = order[at];

  const put = (bin: string) => {
    if (!current) return;
    const ok = current.bin === bin;
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1) }));
    setFlash(ok ? "ok" : "no");
    setTimeout(() => { setFlash(null); setAt((i) => i + 1); }, ok ? 350 : 900);
  };

  if (!current) {
    return (
      <div className="act">
        <p className="astate big">{score.right} of {items.length} sorted correctly.</p>
        <button type="button" className="again"
          onClick={() => { setAt(0); setScore({ right: 0, wrong: 0 }); }}>Start again</button>
      </div>
    );
  }
  return (
    <div className="act">
      <p className="aprompt">{prompt}</p>
      <div className={`sortitem ${flash ?? ""}`}>{current.label}</div>
      {flash === "no" && <p className="astate no">It belongs in <b>{current.bin}</b>.</p>}
      <div className="bins">
        {bins.map((b) => (
          <button key={b} type="button" className="pill alt" disabled={!!flash}
            onClick={() => put(b)}>{b}</button>
        ))}
      </div>
      <p className="astate">{at + 1} of {items.length}</p>
    </div>
  );
}

function TrueFalse({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const items = (data.items ?? []) as { statement: string; is_true: boolean; why?: string }[];
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <div className="act">
      <p className="aprompt">{prompt}</p>
      <ul className="tflist">
        {items.map((it, i) => {
          const given = answers[i];
          const answered = given !== undefined;
          const right = answered && given === it.is_true;
          return (
            <li key={i} className={answered ? (right ? "ok" : "no") : ""}>
              <p>{it.statement}</p>
              {!answered ? (
                <div className="tfbtns">
                  <button type="button" className="pill alt"
                    onClick={() => setAnswers((a) => ({ ...a, [i]: true }))}>True</button>
                  <button type="button" className="pill alt"
                    onClick={() => setAnswers((a) => ({ ...a, [i]: false }))}>False</button>
                </div>
              ) : (
                <p className="astate">
                  <b>{it.is_true ? "True" : "False"}</b>
                  {right ? " — you had it right." : " — you said the other one."}
                  {it.why && <> {it.why}</>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OddOneOut({ prompt, data }: { prompt: string; data: Record<string, unknown> }) {
  const items = (data.items ?? []) as string[];
  const odd = Number(data.odd ?? -1);
  const because = String(data.because ?? "");
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="act">
      <p className="aprompt">{prompt}</p>
      <ul className="oddlist">
        {items.map((it, i) => (
          <li key={i}>
            <button type="button"
              className={`pill${pick === null ? "" : i === odd ? " got" : pick === i ? " no" : ""}`}
              disabled={pick !== null}
              onClick={() => setPick(i)}>{it}</button>
          </li>
        ))}
      </ul>
      {pick !== null && (
        <p className="astate">
          {pick === odd ? "That is the one. " : `The odd one out is “${items[odd]}”. `}
          {because}
        </p>
      )}
    </div>
  );
}

/**
 * For the six templates that are not playable yet: show the material and put
 * the answer behind a tap, so the card still teaches something.
 */
function StudyCard({ card, prompt }: { card: LearnCard; prompt: string }) {
  const [show, setShow] = useState(false);
  const d = card.data;
  const body = (() => {
    switch (card.template) {
      case "timeline-order":
        return (d.items as { label: string; note?: string }[] ?? [])
          .map((i) => `${i.label}${i.note ? ` — ${i.note}` : ""}`);
      case "fill-blank":
        return [String(d.text ?? "").replace(/\{(\d+)\}/g,
          (_m, n) => show ? `**${(d.answers as string[])?.[Number(n) - 1] ?? "___"}**` : "_____")];
      case "step-solve":
        return [String(d.problem ?? ""), ...((d.steps as { prompt?: string }[] ?? [])
          .map((s, i) => `${i + 1}. ${s.prompt ?? ""}`))];
      case "formula-pick":
        return (d.items as { ask?: string; right?: string }[] ?? [])
          .map((i) => `${i.ask ?? ""}${show && i.right ? ` — ${i.right}` : ""}`);
      case "transform":
        return (d.items as { from?: string; to?: string }[] ?? [])
          .map((i) => `${i.from ?? ""}${show && i.to ? ` → ${i.to}` : ""}`);
      default:
        return [];
    }
  })();

  return (
    <div className="act">
      <p className="aprompt">{prompt}</p>
      {card.template === "label-diagram" && typeof d.svg === "string" ? (
        <div className="diagram" dangerouslySetInnerHTML={{ __html: d.svg }} />
      ) : (
        <ol className="studylist">
          {body.map((line, i) => <li key={i}>{line.replace(/\*\*/g, "")}</li>)}
        </ol>
      )}
      <button type="button" className="again" onClick={() => setShow(!show)}>
        {show ? "Hide the answers" : "Show the answers"}
      </button>
    </div>
  );
}

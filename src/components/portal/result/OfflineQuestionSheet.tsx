"use client";

import { useEffect } from "react";
import type { OfflineStatus } from "@/lib/exam/offline-results";
import type { ReviewedQuestion } from "@/lib/exam/offline-review";
import { Badge } from "./ResultView";
import { ST, type SheetState } from "./offline-design";

/**
 * One question, opened — the design's bottom sheet, block for block.
 *
 * A sheet, not an inline expansion: a hundred rows that grow in place lose the
 * reader's position every time one opens, and on a phone the line they tapped
 * scrolls off the screen.
 *
 * The order below is the design's order and it is an argument: what you marked,
 * then why your answer fails, then why the right one works, then the others,
 * then how the class found it. The reason comes before the correction.
 */
const LETTER = ["A", "B", "C", "D", "E"];

const AS: Record<OfflineStatus, SheetState> = {
  correct: "correct", wrong: "wrong", blank: "blank",
  double: "flagged", grace: "graced",
};

/**
 * The one line that says what this question means for this child.
 *
 * The order of the tests is the design's: "most of your class missed this one,
 * you did not" has to be checked before the generic "well answered", or nobody
 * ever sees it.
 */
function insightFor(q: ReviewedQuestion, cls: string): string {
  const pct = q.classPct ?? 0;
  if (q.status === "grace") return "Nothing here is your fault, and nothing was lost.";
  if (q.status === "double") return "This one line is the only part of your sheet the machine could not read.";
  if (q.status === "correct" && pct <= 45) return "Most of your class missed this one. You did not.";
  if (q.status === "correct") return "Well answered.";
  if (q.status === "blank" && pct >= 70)
    return "You left this blank and most of your class got it right — a quick one to pick up.";
  if (q.status === "blank") return "Left blank. Nothing was taken away for it.";
  if (pct >= 70) return "Most of your class got this right, so it is worth going over once.";
  return `A hard one — only ${Math.round(pct)}% of Class ${cls} managed it.`;
}

export function OfflineQuestionSheet({
  question, pool, allQuestions, total, classLabel, filterWord, onClose, onStep, onLearn,
}: {
  question: ReviewedQuestion;
  /** The questions the current filter is showing, in order. */
  pool: ReviewedQuestion[];
  /** All 100, for when the open question is outside the filter. */
  allQuestions: ReviewedQuestion[];
  total: number;
  classLabel: string;
  /** The design's own word for the filter — "wrong", "not read" — or null. */
  filterWord: string | null;
  onClose: () => void;
  onStep: (n: number) => void;
  onLearn: ((chapter: string) => void) | null;
}) {
  const q = question;
  const s = ST[AS[q.status]];
  const at = pool.findIndex((x) => x.n === q.n);
  const inFilter = at !== -1;
  const walkAll = !filterWord || !inFilter;

  const step = (dir: number) => {
    const list = walkAll ? allQuestions : pool;
    if (!list.length) return;
    const here = list.findIndex((x) => x.n === q.n);
    const i = ((here === -1 ? 0 : here) + dir + list.length) % list.length;
    onStep(list[i].n);
  };

  // Escape closes, arrows walk. A hundred questions is a lot of tapping.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Hold the page still behind the sheet. Without this a phone scrolls the
  // list under the overlay and the reader loses the question they tapped.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const counter = `Question ${q.n} of ${total}`
    + (walkAll ? "" : ` · ${at + 1} of ${pool.length} ${filterWord}`);
  const navNote = walkAll
    ? `Previous and next move through all ${total} questions.`
    : `Previous and next stay inside your ${filterWord} filter.`;

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={counter}
      className="no-print fade fixed inset-0 z-[60] flex items-end justify-center bg-[rgb(43_26_28/50%)] lap:items-center lap:p-6">
      <div onClick={(e) => e.stopPropagation()}
        className="sheet-in max-h-[86vh] w-full max-w-[412px] overflow-auto rounded-t-[18px] bg-[var(--cream)] lap:max-h-[84vh] lap:max-w-[680px] lap:rounded-2xl">

        {/* ---- sticky head ---- */}
        <div className="sticky top-0 z-[2] flex items-center justify-between gap-2.5 border-b border-[var(--cream-muted)] bg-[var(--cream)] py-2.5 pl-4 pr-3">
          <div>
            <div className="lbl">{counter}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span aria-hidden
                className="inline-flex flex-none items-center justify-center rounded-full text-[0.78rem] font-bold leading-none"
                style={{ width: 21, height: 21, background: s.bg,
                  border: `1.5px solid ${s.stroke}`, color: s.fg }}>
                {s.glyph}
              </span>
              <span className="text-[0.82rem] font-semibold">{s.label}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--cream-muted)] px-3.5 text-[0.82rem] font-semibold text-[var(--maroon)]">
            <span aria-hidden className="text-[0.9rem] leading-none">⌄</span>
            <span>Close</span>
          </button>
        </div>

        <div className="p-4">
          {(q.section || q.chapter) && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {q.section && <Badge tone="maroon">{q.section}</Badge>}
              {q.chapter && <Badge tone="outline">{q.chapter}</Badge>}
            </div>
          )}
          {q.context && (
            <p className="mb-2 text-[0.84rem] italic leading-[1.5] text-[var(--ink-muted)]">
              {q.context}
            </p>
          )}
          <h3 className="mb-3.5 text-pretty font-[family-name:var(--font-display)] text-[1.16rem] leading-[1.35]">
            {q.stem || `${q.section} — question ${q.n}`}
          </h3>

          {q.status === "double" && (
            <div className="mb-3.5 rounded-[var(--radius-sm)] border border-[var(--gold)] bg-[#FBF3E2] p-3">
              <div className="mb-1 text-[0.8rem] font-bold" style={{ color: "#8A6A17" }}>
                The scanner could not read this bubble
              </div>
              <p className="mb-1.5 text-[0.82rem] leading-[1.55]">
                Two bubbles were filled on this line, so there was no single answer to mark.
              </p>
              <p className="text-[0.82rem] leading-[1.55]">
                No mark was given and none was taken away. Your physical sheet is kept
                at the centre — if you believe this is wrong, tell your school
                co-ordinator and it will be looked at by hand.
              </p>
            </div>
          )}

          {q.options.length > 0 ? (
            <div className="flex flex-col gap-2">
              {q.options.map((text, i) => {
                const isAns = q.answerIndex === i;
                // On a line the machine could not read there is no "you chose
                // it": two bubbles were filled and which one they meant is
                // exactly what is not known. Claiming a pick here would tell a
                // child they answered a question that was never counted.
                const isPicked = q.status !== "double" && q.pickedIndex === i;
                let mark = LETTER[i], bg = "var(--cream-muted)", stroke = "#D0BC9E",
                  fg = "#5C4D4F", border = "var(--cream-muted)", tag = "", tagColor = "";
                if (q.status === "grace") {
                  if (isPicked) {
                    bg = "#F7EEDA"; stroke = "var(--gold)"; fg = "#8A6A17";
                    border = "var(--gold)"; tag = "You marked this"; tagColor = "#8A6A17";
                  }
                } else if (isAns && isPicked) {
                  mark = "✓"; bg = "#D3EDE8"; stroke = "#57B3A4"; fg = "#0B5F53";
                  border = "#57B3A4"; tag = "Correct answer — you chose it"; tagColor = "#0B5F53";
                } else if (isAns) {
                  mark = "✓"; bg = "#D3EDE8"; stroke = "#57B3A4"; fg = "#0B5F53";
                  border = "#57B3A4"; tag = "Correct answer"; tagColor = "#0B5F53";
                } else if (isPicked) {
                  mark = "✕"; bg = "#F6E2E4"; stroke = "#C98D95"; fg = "#7B1E2B";
                  border = "#C98D95"; tag = "You marked this"; tagColor = "var(--maroon)";
                }
                return (
                  <div key={i}
                    className="flex items-start gap-2.5 rounded-[var(--radius-sm)] bg-[var(--cream-surface)] px-3 py-[11px]"
                    style={{ border: `1px solid ${border}` }}>
                    <span aria-hidden
                      className="mt-px inline-flex flex-none items-center justify-center rounded-full text-[0.74rem] font-bold leading-none"
                      style={{ width: 22, height: 22, background: bg,
                        border: `1.5px solid ${stroke}`, color: fg }}>
                      {mark}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.88rem] leading-[1.45]">
                        <b className="font-bold text-[var(--ink-muted)]">{LETTER[i]}.</b> {text}
                      </div>
                      {tag && (
                        <div className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.06em]"
                          style={{ color: tagColor }}>
                          {tag}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[0.88rem] leading-[1.6] text-[var(--ink-muted)]">
              This question is not in the published question bank, so only your sheet
              can be shown for it.
            </p>
          )}

          {q.status === "grace" && (
            <div className="mt-3.5 rounded-[var(--radius-sm)] border border-[var(--gold)] bg-[#FBF3E2] p-3">
              <div className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.1em]"
                style={{ color: "#8A6A17" }}>
                Why no answer was possible
              </div>
              <p className="mb-1.5 text-[0.85rem] leading-[1.6]">
                The printed paper carried no correct option for this question, so it
                was withdrawn after the exam.
              </p>
              <p className="text-[0.85rem] font-semibold leading-[1.6] text-[var(--maroon)]">
                {q.pickedIndex === null
                  ? "You left this line blank, and the mark was given to you anyway."
                  : `You marked ${LETTER[q.pickedIndex]}. Everyone was given this mark, whatever they filled in.`}
              </p>
            </div>
          )}

          {q.whyWrong && q.pickedIndex !== null && (
            <div className="mt-3.5 rounded-[var(--radius-sm)] border border-[#E2C3C7] bg-[#FBEEF0] p-3">
              <div className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
                Why {LETTER[q.pickedIndex]} is not the answer
              </div>
              <p className="text-[0.88rem] leading-[1.6]">{q.whyWrong}</p>
            </div>
          )}

          {q.whyCorrect && q.status !== "grace" && (
            <div className="mt-2.5 rounded-[var(--radius-sm)] border border-[#B7DED5] bg-[#E8F5F1] p-3">
              <div className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.1em]"
                style={{ color: "#0B5F53" }}>
                Why {q.answerIndex !== null ? LETTER[q.answerIndex] : "the answer"} is right
              </div>
              <p className="text-[0.88rem] leading-[1.6]">{q.whyCorrect}</p>
            </div>
          )}

          {q.status !== "grace" && q.whyOthers.length > 0 && (
            <div className="mt-2.5 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] p-3">
              <div className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                And the others
              </div>
              <div className="flex flex-col gap-[5px]">
                {q.whyOthers.map((o) => (
                  <div key={o.index} className="text-[0.8rem] leading-[1.5] text-[var(--ink-muted)]">
                    <b className="text-[var(--ink)]">{LETTER[o.index]}</b> — {o.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] p-3">
            <div className="tnum text-[0.82rem] leading-[1.55]">
              {q.status === "grace"
                ? "Withdrawn question — no class figure applies."
                : q.classPct !== null
                  ? `${Math.round(q.classPct)}% of Class ${classLabel} answered this correctly.`
                  : `Class ${classLabel} figures are not published for this question.`}
            </div>
            <div className="mt-1.5 text-[0.8rem] leading-[1.55] text-[var(--maroon)]">
              {insightFor(q, classLabel)}
            </div>
          </div>

          {onLearn && q.chapter && (
            <button onClick={() => onLearn(q.chapter)}
              className="mt-3 flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-2.5 rounded-[var(--radius-sm)] border border-[var(--gold)] bg-[#F7EEDA] px-3.5 py-2.5 text-left">
              <span>
                <span className="block text-[0.66rem] font-bold uppercase tracking-[0.1em]"
                  style={{ color: "#8A6A17" }}>
                  Learn this chapter
                </span>
                <span className="mt-0.5 block text-[0.88rem]">{q.chapter}</span>
              </span>
              <span aria-hidden className="flex-none font-bold text-[var(--maroon)]">→</span>
            </button>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => step(-1)}
              className="min-h-[46px] flex-1 cursor-pointer rounded-[var(--radius-sm)] border-[1.5px] border-[var(--maroon)] bg-transparent text-[0.86rem] font-semibold text-[var(--maroon)]">
              ← Previous
            </button>
            <button onClick={() => step(1)}
              className="min-h-[46px] flex-1 cursor-pointer rounded-[var(--radius-sm)] border-[1.5px] border-[var(--maroon)] bg-[var(--maroon)] text-[0.86rem] font-semibold text-[var(--cream)]">
              Next →
            </button>
          </div>
          <p className="mt-2 text-center text-[0.72rem] text-[var(--ink-muted)]">{navNote}</p>
        </div>
      </div>
    </div>
  );
}

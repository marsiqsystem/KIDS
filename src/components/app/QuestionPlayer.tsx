"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CloudCheck, Lightbulb, RotateCcw, WifiOff, X } from "lucide-react";
import { answerQuestion, answerPractice, type Verdict } from "@/app/app/loop-actions";
import type { PlayCard } from "@/lib/app/loop";
import { subjectHue } from "@/lib/app/subjects";
import Sheet from "@/components/app/Sheet";

/**
 * The question player. Redesign board 02, 2B–2D.
 *
 * The cards arrive WITHOUT their answers. Tapping an option calls the server,
 * which writes the answer down and only then says what was right. So the key is
 * never in the page, and there is no way to see the answer without having
 * answered.
 *
 * Nothing to read but the question until the tap. Then: correct is teal with a
 * star and three sparks; wrong reveals the key in teal and marks the chosen row
 * in maroon wash — no red, no shake — and the "Why" sheet rises by itself,
 * because that is the moment the explanation is for. On a right answer "Why?"
 * stays a button.
 */

const LETTERS = ["A", "B", "C", "D", "E"];

export default function QuestionPlayer({
  cards,
  startAt,
  mode = "daily",
  doneHref = "/app/set/summary",
  leaveHref = "/app",
}: {
  cards: PlayCard[];
  startAt: number;
  /** "daily" is the five-a-day set; "practice" is one chapter, opened from Learn. */
  mode?: "daily" | "practice";
  doneHref?: string;
  leaveHref?: string;
}) {
  const router = useRouter();
  const first = Math.min(startAt, Math.max(cards.length - 1, 0));
  const [at, setAt] = useState(first);
  const [chosen, setChosen] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  // What each question came to, for the dots across the top. The ones answered
  // before this visit are unknown here and simply show as done.
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [why, setWhy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const card = cards[at];
  const last = at === cards.length - 1;

  function commit(option: number) {
    if (verdict || pending) return;
    setChosen(option);
    setFailed(false);

    startTransition(async () => {
      try {
        const v = await (mode === "daily" ? answerQuestion : answerPractice)(card.id, option);
        setVerdict(v);
        setResults((r) => ({ ...r, [at]: v.correct }));
        if (!v.correct) setWhy(true);
      } catch {
        // The answer did not reach KIDS. Say so and let them tap again rather
        // than pretending it landed — this is a phone on a school's 3G.
        setChosen(null);
        setFailed(true);
      }
    });
  }

  function next() {
    setWhy(false);
    if (last) {
      router.push(doneHref);
      return;
    }
    setAt((i) => i + 1);
    setChosen(null);
    setVerdict(null);
    setFailed(false);
  }

  if (!card) {
    return (
      <div className="app-body">
        <p className="k-line">No questions left here.</p>
        <Link href={leaveHref} className="k-btn k-btn--outline">
          Back
        </Link>
      </div>
    );
  }

  const repeatedMistake =
    verdict && !verdict.correct && verdict.previousChoice === chosen && verdict.previouslyWrong;
  const hue = subjectHue(card.section);
  const answerText = verdict ? card.options[verdict.answerIndex] : "";

  const teardown = verdict ? (
    <>
      <div className="qp-why__head">
        <Lightbulb size={20} className="qp-why__bulb" aria-hidden="true" />
        <span>Why {LETTERS[verdict.answerIndex]}</span>
      </div>
      {verdict.whyCorrect ? <p className="qp-why__body">{verdict.whyCorrect}</p> : null}

      {Object.keys(verdict.whyWrong).length > 0 ? (
        <>
          <div className="qp-why__rule" />
          <div className="k-label">Why not the others</div>
          <div className="qp-why__others">
            {Object.entries(verdict.whyWrong).map(([index, text]) => (
              <p key={index}>
                <strong>{LETTERS[Number(index)]} ·</strong> {text}
              </p>
            ))}
          </div>
        </>
      ) : null}

      {repeatedMistake ? (
        <p className="qp-why__again">You chose {LETTERS[chosen!]} last time too.</p>
      ) : null}

      <div className="qp-back">
        <RotateCcw size={18} aria-hidden="true" />
        <span>
          Back in <strong>{verdict.days} day{verdict.days === 1 ? "" : "s"}</strong>
        </span>
      </div>
      <button type="button" className="k-btn" onClick={next}>
        {last ? "Finish" : "Next"}
      </button>
    </>
  ) : null;

  return (
    <div className="qp">
      <header className="qp__bar">
        <div className="qp__top">
          <Link href={leaveHref} className="qp__leave" aria-label="Leave — your answers are kept">
            <X size={24} aria-hidden="true" />
          </Link>
          <div className="qp__dots" aria-hidden="true">
            {cards.map((c, i) => {
              const r = results[i];
              const kind =
                i === at && !verdict
                  ? "here"
                  : r === true
                    ? "right"
                    : r === false
                      ? "wrong"
                      : i < first
                        ? "done"
                        : "todo";
              return <span key={c.id} className={`qp__dot qp__dot--${kind}`} />;
            })}
          </div>
          <span className="qp__count">
            {at + 1}/{cards.length}
          </span>
        </div>
        <div className="qp__chips">
          {mode === "daily" ? (
            card.seen ? (
              <span className="k-chip k-chip--again qp__again">Again</span>
            ) : (
              <span className="k-chip k-chip--new">New</span>
            )
          ) : null}
          <span className="k-chip qp__subject" style={{ background: hue }}>
            {card.section}
          </span>
          {card.chapter ? <span className="qp__chapter">{card.chapter}</span> : null}
        </div>
      </header>

      <div className="qp__body">
        {verdict?.correct ? (
          <div className="qp__sparks" aria-hidden="true">
            <span className="k-spark">★</span>
            <span className="k-spark" style={{ fontSize: 20, animationDelay: "0.2s" }}>
              ★
            </span>
            <span className="k-spark" style={{ animationDelay: "0.4s" }}>
              ★
            </span>
          </div>
        ) : null}

        {card.context ? <p className="qp__context">{card.context}</p> : null}
        <p className="qp__stem" lang={/[ঀ-৿]/.test(card.stem) ? "bn" : undefined}>
          {card.stem}
        </p>

        <div className="qp__options" role="group" aria-label="Options">
          {card.options.map((option, i) => {
            const isAnswer = verdict?.answerIndex === i;
            const isMine = chosen === i;
            const state = !verdict
              ? isMine
                ? "picked"
                : ""
              : isAnswer
                ? "right"
                : isMine
                  ? "wrong"
                  : "faded";
            return (
              <button
                key={i}
                type="button"
                className={`qp-opt${state ? ` qp-opt--${state}` : ""}`}
                onClick={() => commit(i)}
                disabled={!!verdict || pending}
                aria-pressed={isMine}
              >
                <span className="qp-opt__mark">
                  {state === "right" ? (
                    <Check size={20} aria-label="Correct" />
                  ) : state === "wrong" ? (
                    <X size={18} aria-label="Your answer" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="qp-opt__text">{option}</span>
                {state === "right" && verdict?.correct ? (
                  <span className="qp-opt__star" aria-hidden="true">
                    ★
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="qp__foot">
          {failed ? (
            <span className="k-toast k-toast--wait" role="alert">
              <WifiOff size={15} aria-hidden="true" /> Not sent. Check signal, tap again.
            </span>
          ) : pending ? (
            <span className="qp__status">Sending…</span>
          ) : verdict ? (
            <span className="qp__status">
              <CloudCheck size={15} className="qp__saved" aria-hidden="true" /> Saved
            </span>
          ) : null}

          {verdict ? (
            <div className="qp__acts">
              <button type="button" className="k-btn qp__whybtn" onClick={() => setWhy(true)}>
                Why?
              </button>
              <button type="button" className="k-btn qp__next" onClick={next}>
                {last ? "Finish" : "Next"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={why && !!verdict} onClose={() => setWhy(false)} title={undefined}>
        <span className="app-sr">{`The answer is ${LETTERS[verdict?.answerIndex ?? 0]}: ${answerText}`}</span>
        {teardown}
      </Sheet>
    </div>
  );
}

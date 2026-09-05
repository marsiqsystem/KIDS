"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { answerQuestion, answerPractice, type Verdict } from "@/app/app/loop-actions";
import type { PlayCard } from "@/lib/app/loop";

/**
 * The question player. Design 3d, with 2h's teardown — every option explained,
 * not only the one that was picked.
 *
 * The cards arrive WITHOUT their answers. Committing to an option calls the
 * server, which writes the answer down and only then says what was right. So
 * the key is never in the page, and there is no way to see the answer without
 * having answered.
 *
 * A repeat is announced before it is read, and answering it the same wrong way
 * twice is the one moment this app raises its voice — quietly, in gold.
 */

const LETTERS = ["A", "B", "C", "D", "E"];

const seenOn = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(
    new Date(iso),
  );

export default function QuestionPlayer({
  cards,
  startAt,
  mode = "daily",
  title = "today’s set",
  doneHref = "/app/set/summary",
}: {
  cards: PlayCard[];
  startAt: number;
  /** "daily" is the five-a-day set; "practice" is one chapter, opened from Learn. */
  mode?: "daily" | "practice";
  title?: string;
  doneHref?: string;
}) {
  const router = useRouter();
  const [at, setAt] = useState(Math.min(startAt, Math.max(cards.length - 1, 0)));
  const [chosen, setChosen] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const card = cards[at];
  const last = at === cards.length - 1;

  function commit(option: number) {
    if (verdict || pending) return;
    setChosen(option);
    setFailed(null);

    startTransition(async () => {
      try {
        setVerdict(await (mode === "daily" ? answerQuestion : answerPractice)(card.id, option));
      } catch {
        // The answer did not reach KIDS. Say so and let them try again rather
        // than pretending it landed — this is a phone on a school's 3G.
        setChosen(null);
        setFailed("That did not reach KIDS. Check your connection and tap the answer again.");
      }
    });
  }

  function next() {
    if (last) {
      router.push(doneHref);
      return;
    }
    setAt((i) => i + 1);
    setChosen(null);
    setVerdict(null);
    setFailed(null);
  }

  if (!card) {
    return (
      <div className="app-body">
        <p className="app-hint">This set has no questions left in it.</p>
        <Link href="/app" className="app-btn app-btn--outline">
          Back to home
        </Link>
      </div>
    );
  }

  const repeatedMistake =
    verdict && !verdict.correct && verdict.previousChoice === chosen && verdict.previouslyWrong;

  return (
    <div className="app-play">
      <header className="app-play__bar">
        <Link href="/app" className="app-titlebar__back" aria-label="Leave the set">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </Link>
        <div className="app-play__progress">
          <span className="app-play__count">
            Question {at + 1} of {cards.length}{" · "}{title}
          </span>
          <div className="app-play__pips" aria-hidden="true">
            {cards.map((c, i) => (
              <span key={c.id} className={`app-pip${i < at || (i === at && verdict) ? " app-pip--done" : ""}${i === at ? " app-pip--at" : ""}`} />
            ))}
          </div>
        </div>
        {verdict && <span className="app-play__saved">Saved</span>}
      </header>

      <div className="app-play__body">
        <div className="app-play__chapter">
          <span className="app-play__chaptername">{card.chapter ?? card.section}</span>
          {card.seen && (
            // Named before it is read. A student is never quietly served an old
            // question as if it were new.
            <span className="app-play__seen">
              Seen {seenOn(card.seen.lastAnsweredAt)}
              {card.seen.wasCorrect ? " · you had it right" : " · you had it wrong"}
            </span>
          )}
        </div>

        {card.context && <p className="app-play__context">{card.context}</p>}
        <p className="app-play__stem">{card.stem}</p>

        <div className="app-options" role="group" aria-label="Options">
          {card.options.map((option, i) => {
            const isAnswer = verdict?.answerIndex === i;
            const isMine = chosen === i;
            const state = !verdict
              ? isMine
                ? " app-option--picked"
                : ""
              : isAnswer
                ? " app-option--right"
                : isMine
                  ? " app-option--wrong"
                  : "";

            return (
              <button
                key={i}
                type="button"
                className={`app-option${state}`}
                onClick={() => commit(i)}
                disabled={!!verdict || pending}
                aria-pressed={isMine}
              >
                <span className="app-option__letter">{LETTERS[i]}</span>
                <span className="app-option__text">{option}</span>
                {verdict && isAnswer && <span className="app-option__flag">Correct</span>}
                {verdict && isMine && !isAnswer && <span className="app-option__flag">You</span>}
              </button>
            );
          })}
        </div>

        {failed && (
          <div className="app-card" role="alert">
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>{failed}</p>
          </div>
        )}

        {verdict && (
          <div className={`app-teardown${verdict.correct ? " app-teardown--right" : ""}`}>
            <span className="app-teardown__verdict">
              {verdict.correct
                ? "Right"
                : `Not right · the answer is ${LETTERS[verdict.answerIndex]}`}
            </span>

            {repeatedMistake && (
              <p className="app-teardown__again">
                You chose {LETTERS[chosen!]} last time too. Read the line for {LETTERS[chosen!]} below
                before moving on — this one comes back in {verdict.days} day
                {verdict.days === 1 ? "" : "s"}.
              </p>
            )}

            {verdict.whyCorrect && <p className="app-teardown__why">{verdict.whyCorrect}</p>}

            {Object.keys(verdict.whyWrong).length > 0 && (
              <div className="app-teardown__others">
                <span className="app-label">Why the others are wrong</span>
                {Object.entries(verdict.whyWrong).map(([index, text]) => (
                  <div key={index} className="app-teardown__row">
                    <span className="app-teardown__letter">{LETTERS[Number(index)]}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            )}

            <span className="app-teardown__return">
              Comes back in {verdict.days} day{verdict.days === 1 ? "" : "s"}.
            </span>
          </div>
        )}
      </div>

      <footer className="app-play__foot">
        <button type="button" className="app-btn" onClick={next} disabled={!verdict}>
          {pending ? "Saving…" : last ? "Finish" : "Next question"}
        </button>
      </footer>
    </div>
  );
}

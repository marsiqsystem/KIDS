"use client";

import { useEffect, useState } from "react";
import type { MarkedQuestion, OnlineMarksheet, QuestionStatus } from "@/lib/exam/results";
import type { OfflineMarksheet } from "@/lib/exam/offline-results";
import type { ReviewedQuestion } from "@/lib/exam/offline-review";
import type { LearnCard } from "./LearnIt";
import { OfflineSheet } from "./OfflineSheet";

/**
 * The published result, as a student sees it.
 *
 * Two screens in one component, exactly as designed: a landing that shows both
 * papers side by side, and the full marksheet for whichever one they open. The
 * back button returns to the landing rather than to browser history, because
 * "← Both marksheets" has to work the same whether they arrived by scanning
 * their card or by opening the link a second time.
 *
 * Every number here was computed by scripts/publish-results.ts and is passed in
 * whole. This component does no arithmetic on marks — it only decides what to
 * show — so nothing a student reads can be an artefact of their phone.
 */

type View = "landing" | "online" | "offline";

const STATUS: Record<QuestionStatus, { glyph: string; label: string; cls: string }> = {
  correct: {
    glyph: "✓",
    label: "Correct",
    cls: "bg-[var(--ok-bg)] border-[var(--ok-line)] text-[var(--ok-ink)]",
  },
  wrong: {
    glyph: "✕",
    label: "Wrong",
    cls: "bg-[var(--no-bg)] border-[var(--no-line)] text-[var(--no-ink)]",
  },
  blank: {
    glyph: "–",
    label: "Not answered",
    cls: "bg-[var(--skip-bg)] border-[var(--skip-line)] text-[var(--skip-ink)]",
  },
};

const num = (n: number) => n.toLocaleString("en-IN");

export interface ResultViewProps {
  name: string;
  uid: string;
  classLabel: string;
  stream: string | null;
  school: string;
  centre: string;
  publishedOn: string;
  online: OnlineMarksheet | null;
  /** The written paper. Null when the student did not sit it. */
  offline: OfflineMarksheet | null;
  /** Whether the written paper's results are out at all — a separate switch. */
  offlinePublished: boolean;
  offlineQuestions: ReviewedQuestion[];
  offlineLearn: LearnCard[];
  marksheetHref: string;
}

export default function ResultView(props: ResultViewProps) {
  const { online } = props;
  const [view, setView] = useState<View>("landing");
  const [openQ, setOpenQ] = useState<number | null>(null);

  const toLanding = () => {
    setView("landing");
    setOpenQ(null);
    window.scrollTo(0, 0);
  };
  const toOnline = () => {
    setView("online");
    setOpenQ(null);
    window.scrollTo(0, 0);
  };
  const toOffline = () => {
    setView("offline");
    setOpenQ(null);
    window.scrollTo(0, 0);
  };

  return (
    <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[20px] bg-[var(--cream)] shadow-[var(--shadow-lg)] sm:my-4 lap:mt-[18px] lap:max-w-[1180px] lap:rounded-2xl">
      <Header {...props} />

      {view === "landing" ? (
        <Landing {...props} onOpenOnline={toOnline} onOpenOffline={toOffline} />
      ) : view === "offline" ? (
        props.offline && (
          <OfflineSheet
            sheet={props.offline}
            questions={props.offlineQuestions}
            learn={props.offlineLearn}
            classLabel={props.classLabel}
            centre={props.centre}
            marksheetHref={props.marksheetHref}
            onBack={toLanding}
            other={{
              state: online ? "ready" : "absent",
              marks: online?.marks ?? 0,
              total: online?.total ?? 0,
            }}
            onOpenOther={toOnline}
          />
        )
      ) : (
        online && (
          <Marksheet
            {...props}
            online={online}
            onBack={toLanding}
            openQ={openQ}
            setOpenQ={setOpenQ}
          />
        )
      )}

      {online && openQ !== null && (
        <QuestionSheet
          question={online.questions[openQ - 1]}
          total={online.total}
          classLabel={props.classLabel}
          onClose={() => setOpenQ(null)}
          onPrev={() => setOpenQ((n) => Math.max(1, (n ?? 1) - 1))}
          onNext={() => setOpenQ((n) => Math.min(online.total, (n ?? 1) + 1))}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- header --- */

function Header({ name, classLabel, uid, stream, school, centre }: ResultViewProps) {
  return (
    <>
      <div className="sky px-[18px] pb-[18px] pt-3.5 text-[var(--cream)] lap:px-9 lap:pb-[26px] lap:pt-5">
        <div className="stars" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-2.5">
          <span className="font-[family-name:var(--font-display)] text-[1.3rem] font-extrabold tracking-[0.02em]">
            KIDS
          </span>
          <div className="shrink-0 text-right">
            <div className="font-[family-name:var(--font-display)] text-[0.95rem] font-bold text-[var(--gold-light)]">
              SET 2026
            </div>
            <div className="text-[0.62rem] uppercase tracking-[0.08em] opacity-85">
              Sun 19 July 2026
            </div>
          </div>
        </div>

        {/* On a laptop the name and the school sit side by side on one baseline,
            rather than the school trailing a long way under a short name. */}
        <div className="relative lap:grid lap:grid-cols-[minmax(0,1fr)_auto] lap:items-end lap:gap-10">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d8efe9] py-[5px] pl-[9px] pr-3 text-[0.74rem] font-semibold text-[#0a5246]">
              <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
                <circle cx="10" cy="10" r="9" fill="#0F7A69" />
                <path
                  d="M5.6 10.4l2.8 2.8 5.9-6.2"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Verified as {name}</span>
            </div>

            <h1 className="mb-1.5 mt-2.5 text-balance text-[1.7rem] font-bold leading-[1.18] text-[var(--cream)] lap:text-[2.1rem]">
              {name}
            </h1>

            <div className="tnum flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.82rem] text-[#dcf1ec]">
              <span>
                Class {classLabel} · Roll {uid}
              </span>
              {stream ? (
                <span>· {stream}</span>
              ) : (
                <span className="opacity-80">· Stream not recorded</span>
              )}
            </div>
          </div>

          <div className="mt-2 text-[0.74rem] leading-[1.5] text-[#cde7e1] lap:mt-0 lap:text-right lap:text-[0.8rem] lap:leading-[1.55]">
            <div>School — {school}</div>
            <div>Exam centre — {centre}</div>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-[var(--gold)]" />
    </>
  );
}

/* -------------------------------------------------------------- landing --- */

function Landing({
  online,
  offline,
  offlinePublished,
  classLabel,
  publishedOn,
  onOpenOnline,
  onOpenOffline,
}: ResultViewProps & { onOpenOnline: () => void; onOpenOffline: () => void }) {
  return (
    <>
      <div className="px-4 pb-1 pt-5 lap:max-w-[780px] lap:px-9 lap:pb-1.5 lap:pt-7">
        <div className="lbl">Published {publishedOn}</div>
        <h2 className="mb-2 mt-1.5 text-[1.42rem] text-[var(--maroon)]">Your result is ready</h2>
        <p className="mb-1 text-[0.9rem] leading-[1.6]">
          You sat two papers on the same morning. They are marked separately and shown separately.
          Open either one — you can come back for the other.
        </p>
      </div>

      {/* Two papers, so two columns on a laptop — read side by side rather than
          one scrolled past to reach the other. */}
      <div className="flex flex-col gap-3.5 px-4 pb-5 pt-3.5 lap:grid lap:grid-cols-2 lap:items-start lap:gap-5 lap:px-9 lap:pb-[26px] lap:pt-5">
        {/* ---- online ---- */}
        {online ? (
          <button
            onClick={onOpenOnline}
            className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-t-[3px] border-[var(--cream-muted)] border-t-[var(--gold)] bg-[var(--cream-surface)] p-4 pt-4 text-left shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <h3 className="mb-1 text-[1.22rem] text-[var(--maroon)]">Online Exam</h3>
                <div className="text-[0.74rem] text-[var(--ink-muted)]">
                  50 questions · 30 minutes · on your phone
                </div>
              </div>
              <Badge tone="teal">Ready</Badge>
            </div>

            <div className="mt-3.5 flex items-end justify-between gap-3">
              <div className="tnum flex items-baseline gap-[5px]">
                <span className="font-[family-name:var(--font-display)] text-[3.1rem] font-bold leading-[0.95] text-[var(--maroon)]">
                  {online.marks}
                </span>
                <span className="font-[family-name:var(--font-display)] text-[1.15rem] text-[var(--gold)]">
                  / {online.total}
                </span>
              </div>
              <div className="tnum text-right text-[0.76rem] leading-[1.5] text-[var(--ink-muted)]">
                <div>{online.percent}%</div>
                {online.ranks && (
                  <div>
                    Rank {num(online.ranks.classRank)} of {num(online.ranks.classSat)} in Class{" "}
                    {classLabel}
                  </div>
                )}
              </div>
            </div>

            <div className="my-3 h-px bg-[var(--cream-muted)]" />
            <div className="flex items-center justify-between text-[0.86rem] font-semibold text-[var(--maroon)]">
              <span>Open full marksheet</span>
              <span aria-hidden="true">→</span>
            </div>
          </button>
        ) : (
          <Panel>
            <Badge tone="outline">Not attempted</Badge>
            <h3 className="mb-1 mt-2 text-[1.22rem] text-[var(--maroon)]">Online Exam</h3>
            <div className="text-[0.74rem] text-[var(--ink-muted)]">
              50 questions · 30 minutes · on your phone
            </div>
            <Note title="You did not sit this paper">
              <p className="mb-1.5">
                So there are no marks and no rank for it. Our records show no answer sheet was
                started on your ID that morning.
              </p>
              <p>If you believe you did sit it, tell your school co-ordinator.</p>
            </Note>
          </Panel>
        )}

        {/* ---- the written paper ---- */}
        {!offlinePublished ? (
          <OfflinePending />
        ) : offline ? (
          <button
            onClick={onOpenOffline}
            className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-t-[3px] border-[var(--cream-muted)] border-t-[var(--gold)] bg-[var(--cream-surface)] p-4 pt-4 text-left shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <h3 className="mb-1 text-[1.22rem] text-[var(--maroon)]">Offline (Written) Exam</h3>
                <div className="text-[0.74rem] text-[var(--ink-muted)]">
                  100 questions · OMR sheet · at your centre
                </div>
              </div>
              <Badge tone="teal">Ready</Badge>
            </div>

            <div className="mt-3.5 flex items-end justify-between gap-3">
              <div className="tnum flex items-baseline gap-[5px]">
                <span className="font-[family-name:var(--font-display)] text-[3.1rem] font-bold leading-[0.95] text-[var(--maroon)]">
                  {offline.marks}
                </span>
                <span className="font-[family-name:var(--font-display)] text-[1.15rem] text-[var(--gold)]">
                  / {offline.total}
                </span>
              </div>
              <div className="tnum text-right text-[0.76rem] leading-[1.5] text-[var(--ink-muted)]">
                <div>{offline.percent}%</div>
                {offline.classRank !== null && (
                  <div>
                    Rank {num(offline.classRank)} of {num(offline.classSat)} in Class {classLabel}
                  </div>
                )}
              </div>
            </div>

            <div className="my-3 h-px bg-[var(--cream-muted)]" />
            <div className="flex items-center justify-between text-[0.86rem] font-semibold text-[var(--maroon)]">
              <span>Open full marksheet</span>
              <span aria-hidden="true">→</span>
            </div>
          </button>
        ) : (
          <Panel>
            <Badge tone="outline">Not attempted</Badge>
            <h3 className="mb-1 mt-2 text-[1.22rem] text-[var(--maroon)]">Offline (Written) Exam</h3>
            <div className="text-[0.74rem] text-[var(--ink-muted)]">
              100 questions · OMR sheet · at your centre
            </div>
            <Note title="You did not sit this paper">
              <p className="mb-1.5">
                So there are no marks and no rank for it. Our records show no answer
                sheet was collected under your Unique ID that morning.
              </p>
              <p>If you believe you did sit it, tell your school co-ordinator.</p>
            </Note>
          </Panel>
        )}
      </div>

      <div className="px-4 pb-[22px] lap:px-9 lap:pb-[30px]">
        <Privacy />
      </div>
    </>
  );
}

/**
 * The written paper, always pending.
 *
 * Never "absent", even for a student we suspect was not there: the OMR sheets
 * have not been marked, so we do not yet know who sat it. Telling a child who
 * did sit it that they did not would be a lie we would have to take back.
 */
function OfflinePending() {
  return (
    <Panel>
      <Badge tone="maroon">Not published yet</Badge>
      <h3 className="mb-1 mt-2 text-[1.22rem] text-[var(--maroon)]">Offline (Written) Exam</h3>
      <div className="text-[0.74rem] text-[var(--ink-muted)]">
        100 questions · OMR sheet · at your centre
      </div>
      <Note title="Still being marked">
        <p className="mb-1.5">
          Your written sheet was collected at the centre and is being assessed by hand. When it is
          done, your marks will appear on this same page.
        </p>
        <p>There is nothing more for you to do, and no date has been announced yet. Keep this link and check back.</p>
      </Note>
    </Panel>
  );
}

/* ------------------------------------------------------------ marksheet --- */

function Marksheet({
  online,
  classLabel,
  onBack,
  setOpenQ,
}: ResultViewProps & {
  online: OnlineMarksheet;
  onBack: () => void;
  openQ: number | null;
  setOpenQ: (n: number | null) => void;
}) {
  const [filter, setFilter] = useState<"all" | QuestionStatus>("all");

  const rows = online.questions.filter((q) => filter === "all" || q.status === filter);

  return (
    <>
      <div className="no-print flex items-center justify-between gap-2 border-b border-[var(--cream-muted)] bg-[var(--cream-surface)] px-2.5 py-2 lap:pl-6 lap:pr-[30px]">
        <button
          onClick={onBack}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 px-3 text-[0.86rem] font-semibold text-[var(--maroon)]"
        >
          <span aria-hidden="true">←</span>
          <span>Both marksheets</span>
        </button>
        <span className="lbl pr-1.5">Online paper</span>
      </div>

      {/* On a laptop this becomes a 352px rail beside a wide column. The three
          `contents` wrappers below are inert on a phone — the cards stay in one
          scrolling column, in the order they are written — and become the grid
          areas above 900px. */}
      <div className="flex flex-col gap-4 px-4 pb-6 pt-4 lap:grid lap:grid-cols-[352px_minmax(0,1fr)] lap:items-start lap:gap-x-5 lap:px-9 lap:pb-[34px] lap:pt-6">
        {/* ---- rail, upper: the mark and where it placed ---- */}
        <div className="contents lap:col-start-1 lap:row-start-1 lap:flex lap:flex-col lap:gap-4">
        {/* ---- the score ---- */}
        <div className="rise rounded-[var(--radius-md)] border border-t-[3px] border-[var(--cream-muted)] border-t-[var(--gold)] bg-[var(--cream-surface)] px-[18px] pb-4 pt-5 text-center shadow-[var(--shadow-md)]">
          <div className="lbl">Online Exam Marksheet</div>
          <div className="tnum mt-2.5 flex items-baseline justify-center gap-1.5">
            {/* The mark is rendered on the server, not counted up on the client:
                it must be right in the HTML for a phone with no JS, for print,
                and for the split second before hydration. The card's `rise`
                animation is what makes it arrive. */}
            <span className="font-[family-name:var(--font-display)] text-[4.4rem] font-bold leading-[0.9] text-[var(--maroon)]">
              {online.marks}
            </span>
            <span className="font-[family-name:var(--font-display)] text-[1.55rem] text-[var(--gold)]">
              / {online.total}
            </span>
          </div>
          <div className="tnum mt-2.5 text-[0.92rem]">
            {online.percent}% · {online.marks} of {online.total} marks
          </div>

          <StarRule />

          <p className="m-0 text-[0.8rem] leading-[1.6] text-[var(--ink-muted)]">
            Marks come straight from your assessed answers. One mark for each correct answer, and
            nothing taken away for a wrong one.
          </p>

          {online.isFullMarks && (
            <p className="mt-2.5 text-[0.82rem] font-semibold leading-[1.6] text-[var(--maroon)]">
              You answered every question correctly.{" "}
              {online.cohort.fullMarks > 1
                ? `${num(online.cohort.fullMarks)} students across all classes did that.`
                : "You are the only student across all classes who did that."}
            </p>
          )}
        </div>

        {/* ---- correct / wrong / blank ---- */}
        <div className="grid grid-cols-3 gap-2">
          <Tally status="correct" n={online.correct} label="Correct" />
          <Tally status="wrong" n={online.wrong} label="Wrong" />
          <Tally status="blank" n={online.blank} label="Not answered" />
        </div>

        {/* Ranks sit with the mark, not below the analysis: on a laptop the rail
            is the answer to "how did I do", and the wide column is the detail. */}
        {online.ranks ? (
          <Card title="Where you stand">
            <div className="grid grid-cols-2 gap-2">
              <Rank
                label={`Rank in Class ${classLabel}`}
                value={num(online.ranks.classRank)}
                sub={`of ${num(online.ranks.classSat)}`}
              />
              <Rank
                label="Percentile in class"
                value={online.ranks.percentile === null ? "—" : online.ranks.percentile.toFixed(1)}
                sub={`Class ${classLabel} only`}
              />
              <Rank
                label="In your exam centre"
                value={num(online.ranks.centreRank)}
                sub={`of ${num(online.ranks.centreSat)}`}
              />
              <Rank
                label="In your school"
                value={num(online.ranks.schoolRank)}
                sub={`of ${num(online.ranks.schoolSat)}`}
              />
            </div>
            <p className="mt-3 text-[0.78rem] leading-[1.6] text-[var(--ink-muted)]">
              A rank is only a position in a list on one morning. It does not decide what you can
              learn next.
            </p>
          </Card>
        ) : (
          <Card title="Why there is no rank here">
            <p className="text-[0.85rem] leading-[1.6]">
              On exam morning you sat the paper written for a different class. Every mark above is
              honestly yours and is counted in full.
            </p>
            <p className="mt-2 text-[0.85rem] leading-[1.6]">
              But your classmates answered different questions, so placing you in a list beside them
              would not mean anything. That is why there is no rank and no class comparison on this
              page — not because of anything you did.
            </p>
          </Card>
        )}
        </div>

        {/* ---- wide column: how it went, and every question ---- */}
        <div className="contents lap:col-start-2 lap:row-start-1 lap:row-span-2 lap:flex lap:min-w-0 lap:flex-col lap:gap-4">
        {/* ---- the half hour ---- */}
        <Card title="How the half hour went">
          <div className="mt-2 grid gap-0.5">
            <Field label="Submitted at" value={`${online.submittedAt ?? "—"}${online.timedOut ? " (auto)" : ""}`} />
            {/* "of 30" only when they handed it in themselves. A student who
                started at 10:32 had 28 minutes, not 30, because the window shut
                at 11:00 for everyone — so "28.3 min of 30" would read as though
                they gave up early. */}
            <Field
              label="Time taken"
              value={
                online.minutesTaken === null
                  ? "—"
                  : online.timedOut
                    ? `${online.minutesTaken} min`
                    : `${online.minutesTaken} min of 30`
              }
            />
            <Field label="Questions answered" value={`${online.answered} of ${online.total}`} />
          </div>
          <p className="mt-3 text-[0.84rem] leading-[1.6]">
            {online.timedOut
              ? "The exam window closed at 11:00 before you pressed submit, so the paper submitted itself. Everything you had marked was saved — nothing was lost."
              : online.minutesLeft === null
                ? "Your paper was received and marked in full."
                : `You finished with ${online.minutesLeft} minute${online.minutesLeft === 1 ? "" : "s"} still on the clock. The time did not run out on you.`}
          </p>
        </Card>

        {/* ---- comparison, only where it is honest ---- */}
        {online.ranks && (
          <Card
            title="You and your class"
            sub={`${num(online.ranks.classSat)} students in Class ${classLabel} sat this paper. Across all four classes, ${num(online.cohort.sat)} of ${num(online.cohort.enrolled)} sat it and the average was ${online.cohort.average}.`}
          >
            <div className="flex flex-col gap-3">
              <Bar
                label="You"
                value={String(online.marks)}
                pct={(online.marks / online.total) * 100}
                fill="var(--maroon)"
              />
              <Bar
                label={`Class ${classLabel} average`}
                value={online.classAvg.toFixed(2)}
                pct={(online.classAvg / online.total) * 100}
                fill="var(--teal)"
              />
              <Bar
                label={`Class ${classLabel} highest`}
                value={String(online.classHigh)}
                pct={(online.classHigh / online.total) * 100}
                fill="var(--gold)"
              />
            </div>
            <p className="mt-3.5 text-[0.78rem] leading-[1.6] text-[var(--ink-muted)]">
              Classes IX, X, XI and XII sat four different papers, so nobody is ever compared across
              classes.
            </p>
          </Card>
        )}

        {/* ---- what to do next ---- */}
        <Card title="What to do next" sub="Read against how the rest of your class answered.">
          {online.shone.length > 0 ? (
            <>
              <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--ok-ink)]">
                You did well here
              </div>
              <div className="flex flex-col gap-2">
                {online.shone.map((q) => (
                  <QuestionLink
                    key={q.n}
                    onClick={() => setOpenQ(q.n)}
                    note={`Q${q.n} — only ${q.classPct}% of Class ${classLabel} got this right`}
                    noteClass="text-[var(--ok-ink)]"
                    text={q.q}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--ok-ink)]">
                Where to start
              </div>
              <p className="text-[0.84rem] leading-[1.6]">
                Nothing to list here from this paper. That is alright — start with the three below,
                which most of your class found easy, and they will be the quickest to learn.
              </p>
            </>
          )}

          <div className="my-4 h-px bg-[var(--cream-muted)]" />

          <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
            Worth going back to
          </div>
          {online.revise.length > 0 ? (
            <div className="flex flex-col gap-2">
              {online.revise.map((q) => (
                <QuestionLink
                  key={q.n}
                  onClick={() => setOpenQ(q.n)}
                  note={`Q${q.n} — ${q.classPct}% of Class ${classLabel} got this right`}
                  noteClass="text-[var(--maroon)]"
                  text={q.q}
                />
              ))}
            </div>
          ) : (
            <p className="text-[0.84rem] leading-[1.6]">
              There is nothing to revise from this paper — you answered every question correctly.
            </p>
          )}

          <div className="mt-3.5 flex items-start gap-2.5 rounded-[var(--radius-sm)] bg-[var(--cream-muted)] p-3">
            <span aria-hidden="true" className="text-[0.95rem] leading-[1.4] text-[var(--gold)]">
              ★
            </span>
            <div>
              <div className="mb-[3px] text-[0.8rem] font-semibold text-[var(--maroon)]">
                Short video lessons — coming later
              </div>
              <p className="text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">
                KIDS is preparing a lesson for each question. When one is ready it will appear right
                here, beside the question it fixes. Nothing to sign up for.
              </p>
            </div>
          </div>

          <p className="mt-2.5 text-[0.72rem] italic leading-[1.5] text-[var(--ink-muted)]">
            Built only from your own answers and how your class answered. Grouping by topic will
            follow once every question is mapped to a concept — that mapping does not exist yet.
          </p>
        </Card>

        {/* ---- every question ---- */}
        <div className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] pb-1 pt-4">
          <div className="px-4">
            <h3 className="mb-0.5 text-[1.05rem] text-[var(--maroon)]">Every question, one by one</h3>
            <p className="mb-3 text-[0.76rem] text-[var(--ink-muted)]">
              Tap a question to see what it asked, what you chose and what was correct. The number on
              the right is the share of your class who got it right.
            </p>
            <div className="no-print mb-3 flex flex-wrap gap-1.5">
              {(
                [
                  ["all", `All ${online.total}`],
                  ["wrong", `Wrong ${online.wrong}`],
                  ["blank", `Blank ${online.blank}`],
                  ["correct", `Correct ${online.correct}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`min-h-[44px] cursor-pointer rounded-full border-[1.5px] px-[13px] py-2 text-[0.78rem] font-semibold ${
                    filter === id
                      ? "border-[var(--maroon)] bg-[var(--maroon)] text-[var(--cream)]"
                      : "border-[var(--cream-muted)] bg-transparent text-[var(--maroon)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--cream-muted)]">
            {rows.map((q) => (
              <button
                key={q.n}
                onClick={() => setOpenQ(q.n)}
                className="flex min-h-[54px] w-full cursor-pointer items-center gap-2.5 border-b border-[var(--cream-muted)] px-3.5 py-2.5 text-left"
              >
                <Pip status={q.status} size={24} />
                <span className="tnum w-6 shrink-0 text-[0.76rem] text-[var(--ink-muted)]">{q.n}</span>
                <span className="flex-1 text-[0.83rem] leading-[1.4]">{q.q}</span>
                <span className="tnum shrink-0 text-[0.7rem] text-[var(--ink-muted)]">
                  {q.classPct}%
                </span>
              </button>
            ))}
          </div>
        </div>

        </div>

        {/* ---- rail, lower: what to do with the page ---- */}
        <div className="contents lap:col-start-1 lap:row-start-2 lap:mt-4 lap:flex lap:flex-col lap:gap-4">
        {/* ---- print ---- */}
        <div className="no-print rounded-[var(--radius-md)] border border-t-[3px] border-[var(--cream-muted)] border-t-[var(--gold)] bg-[var(--cream-surface)] p-4">
          <h3 className="mb-1.5 text-[1.05rem] text-[var(--maroon)]">Take it with you</h3>
          <p className="mb-3.5 text-[0.82rem] leading-[1.6] text-[var(--ink-muted)]">
            Print this page to keep in your file or show at school.
          </p>
          <button
            onClick={() => window.print()}
            className="min-h-[52px] w-full cursor-pointer rounded-[var(--radius-sm)] border-[1.5px] border-[var(--maroon)] bg-transparent text-[0.9rem] font-semibold text-[var(--maroon)]"
          >
            Print this page
          </button>
        </div>

        <OfflinePending />
        <Privacy />
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------- bottom sheet --- */

function QuestionSheet({
  question: q,
  total,
  classLabel,
  onClose,
  onPrev,
  onNext,
}: {
  question: MarkedQuestion;
  total: number;
  classLabel: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  // Escape closes, as it does everywhere else a sheet covers the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const letters = ["A", "B", "C", "D"];
  const insight =
    q.status === "correct" && q.classPct <= 45
      ? "Most of your class missed this one. You did not."
      : q.status === "correct"
        ? "Well answered."
        : q.status === "blank" && q.classPct >= 70
          ? "You left this blank and most of your class got it right — a quick one to pick up."
          : q.status === "blank"
            ? "Left blank. Nothing was taken away for it."
            : q.classPct >= 70
              ? "Most of your class got this right, so it is worth going over once."
              : `A hard one — only ${q.classPct}% of your class managed it.`;

  return (
    <div
      onClick={onClose}
      className="fade no-print fixed inset-0 z-[60] flex items-end justify-center bg-[rgb(43_26_28/50%)] lap:items-center lap:p-6"
    >
      {/* A sheet rising from the bottom edge is a phone gesture. On a laptop the
          same panel is a centred dialog — wider, and not pinned to a screen
          edge the pointer never travels to. */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="sheet-in max-h-[86vh] w-full max-w-[460px] overflow-auto rounded-t-[18px] bg-[var(--cream)] lap:max-h-[82vh] lap:max-w-[620px] lap:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between gap-2.5 border-b border-[var(--cream-muted)] bg-[var(--cream)] py-2.5 pl-4 pr-3">
          <div>
            <div className="lbl">
              Question {q.n} of {total}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Pip status={q.status} size={21} />
              <span className="text-[0.82rem] font-semibold">{STATUS[q.status].label}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-1.5 rounded-full bg-[var(--cream-muted)] px-3.5 text-[0.82rem] font-semibold text-[var(--maroon)]"
          >
            <span aria-hidden="true">⌄</span>
            <span>Close</span>
          </button>
        </div>

        <div className="p-4">
          {q.context && (
            <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--cream-surface)] p-3 text-[0.84rem] leading-[1.6] text-[var(--ink-muted)]">
              {q.context}
            </p>
          )}

          <h3 className="mb-3.5 text-pretty text-[1.16rem] leading-[1.35]">{q.q}</h3>

          <div className="flex flex-col gap-2">
            {q.options.map((text, i) => {
              const isCorrect = i === q.answer;
              const isPickedWrong = q.picked === i && !isCorrect;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-3 py-[11px]"
                >
                  {isCorrect ? (
                    <Pip status="correct" size={22} />
                  ) : isPickedWrong ? (
                    <Pip status="wrong" size={22} />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-px inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--skip-line)] bg-[var(--cream-muted)] text-[0.72rem] font-bold leading-none text-[var(--skip-ink)]"
                    >
                      {letters[i]}
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="text-[0.88rem] leading-[1.45]">{text}</div>
                    {isCorrect && (
                      <div className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[var(--ok-ink)]">
                        {q.status === "correct" ? "Correct answer — you chose it" : "Correct answer"}
                      </div>
                    )}
                    {isPickedWrong && (
                      <div className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[var(--maroon)]">
                        You chose this
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] p-3">
            <div className="tnum text-[0.82rem] leading-[1.55]">
              {q.classPct}% of Class {classLabel} answered this correctly.
            </div>
            <div className="mt-1.5 text-[0.8rem] leading-[1.55] text-[var(--maroon)]">{insight}</div>
          </div>

          {q.status !== "correct" && (
            <div className="mt-2.5 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--cream-muted)] px-3 py-[11px]">
              <span aria-hidden="true" className="text-[var(--gold)]">
                ★
              </span>
              <span className="text-[0.78rem] text-[var(--ink-muted)]">
                A short lesson for this question is being made — not available yet.
              </span>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onPrev}
              disabled={q.n === 1}
              className="min-h-[46px] flex-1 cursor-pointer rounded-[var(--radius-sm)] border-[1.5px] border-[var(--maroon)] bg-transparent text-[0.86rem] font-semibold text-[var(--maroon)] disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={onNext}
              disabled={q.n === total}
              className="min-h-[46px] flex-1 cursor-pointer rounded-[var(--radius-sm)] border-[1.5px] border-[var(--maroon)] bg-[var(--maroon)] text-[0.86rem] font-semibold text-[var(--cream)] disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- parts --- */

export function Pip({ status, size }: { status: QuestionStatus; size: number }) {
  const s = STATUS[status];
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] font-bold leading-none ${s.cls}`}
    >
      {s.glyph}
    </span>
  );
}

export function Tally({ status, n, label }: { status: QuestionStatus; n: number; label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-2 py-3 text-center">
      <Pip status={status} size={26} />
      <div className="tnum font-[family-name:var(--font-display)] text-[1.55rem] font-bold leading-[1.15]">
        {n}
      </div>
      <div className="text-[0.68rem] leading-[1.3] text-[var(--ink-muted)]">{label}</div>
    </div>
  );
}

export function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] p-4">
      <h3 className="mb-0.5 text-[1.05rem] text-[var(--maroon)]">{title}</h3>
      {sub && <p className="mb-3.5 text-[0.76rem] leading-[1.5] text-[var(--ink-muted)]">{sub}</p>}
      {children}
    </div>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] p-4">
      {children}
    </div>
  );
}

export function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3.5 rounded-[var(--radius-sm)] bg-[var(--cream-muted)] p-3.5">
      <div className="mb-1.5 font-[family-name:var(--font-display)] text-[1rem] font-bold text-[var(--maroon)]">
        {title}
      </div>
      <div className="text-[0.85rem] leading-[1.6]">{children}</div>
    </div>
  );
}

export function Badge({ tone, children }: { tone: "teal" | "maroon" | "outline"; children: React.ReactNode }) {
  const cls = {
    teal: "bg-[rgb(30_158_140/12%)] text-[var(--teal-ink)] border-transparent",
    maroon: "bg-[var(--maroon-tint)] text-[var(--maroon)] border-transparent",
    outline: "bg-transparent text-[var(--ink-muted)] border-[var(--cream-muted)]",
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.06em] ${cls}`}
    >
      {children}
    </span>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--cream-muted)] py-2 last:border-0">
      <span className="text-[0.78rem] text-[var(--ink-muted)]">{label}</span>
      <span className="tnum text-[0.86rem] font-semibold">{value}</span>
    </div>
  );
}

export function Bar({ label, value, pct, fill }: { label: string; value: string; pct: number; fill: string }) {
  return (
    <div>
      <div className="mb-[5px] flex items-baseline justify-between gap-2">
        <span className="text-[0.84rem]">{label}</span>
        <span className="tnum text-[0.84rem] font-bold">{value}</span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-[3px] bg-[var(--cream-muted)]">
        <div className="h-full rounded-[3px]" style={{ width: `${Math.min(100, pct)}%`, background: fill }} />
      </div>
    </div>
  );
}

export function Rank({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] p-3">
      <div className="min-h-[2.1em] text-[0.66rem] uppercase leading-[1.35] tracking-[0.06em] text-[var(--ink-muted)]">
        {label}
      </div>
      <div className="tnum font-[family-name:var(--font-display)] text-[1.5rem] font-bold leading-[1.2] text-[var(--maroon)]">
        {value}
      </div>
      <div className="tnum text-[0.7rem] text-[var(--ink-muted)]">{sub}</div>
    </div>
  );
}

function QuestionLink({
  onClick,
  note,
  noteClass,
  text,
}: {
  onClick: () => void;
  note: string;
  noteClass: string;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-[11px] text-left"
    >
      <div className={`tnum text-[0.72rem] font-semibold ${noteClass}`}>{note}</div>
      <div className="mt-[3px] text-[0.84rem] leading-[1.45]">{text}</div>
    </button>
  );
}

export function StarRule() {
  return (
    <div className="my-3 flex items-center gap-2" aria-hidden="true">
      <div className="h-px flex-1 bg-[var(--cream-muted)]" />
      <span className="text-[0.7rem] text-[var(--gold)]">★</span>
      <div className="h-px flex-1 bg-[var(--cream-muted)]" />
    </div>
  );
}

export function Privacy() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] p-3.5">
      <div className="lbl mb-1.5">Keep this private</div>
      <p className="text-[0.82rem] leading-[1.6]">
        This link is yours alone. Anyone who opens it can see your result, so do not post it in a
        group. If you want to show someone, send a screenshot instead.
      </p>
    </div>
  );
}

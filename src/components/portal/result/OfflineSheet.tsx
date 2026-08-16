"use client";

import { useState } from "react";
import type { OfflineMarksheet, OfflineStatus } from "@/lib/exam/offline-results";
import type { ReviewedQuestion } from "@/lib/exam/offline-review";
import { StarRule } from "./ResultView";
import { ST, LEGEND, bubbleStyle, type SheetState } from "./offline-design";
import { LearnIt, chapterAnchor, type LearnCard } from "./LearnIt";
import { OfflineQuestionSheet } from "./OfflineQuestionSheet";

/**
 * The written paper's marksheet.
 *
 * Every card, every measurement and every line of copy here is taken from the
 * Claude Design handoff (`SET 2026 Result.dc.html` and its `design.js`) — read
 * out of the source, not inferred from a screenshot. The order of the cards is
 * the design's order, because the order is an argument: the marks, then how we
 * got them, then the sheet itself, then the class, then the questions, then the
 * chapters, then what to do about it.
 *
 * The design's five states are not the scorer's five. `flagged` is its word for
 * a line the machine could not read — two bubbles filled, or too faint — which
 * is exactly what our reader calls a double mark, and the design counts those
 * under "Not answered" rather than under "Wrong".
 */
const num = (n: number) => n.toLocaleString("en-IN");
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

const AS: Record<OfflineStatus, SheetState> = {
  correct: "correct", wrong: "wrong", blank: "blank",
  double: "flagged", grace: "graced",
};

/** The design's filter ids, in its order, mapped onto our five statuses. */
type FilterId = "all" | OfflineStatus;
const FILTER_WORD: Record<OfflineStatus, string> = {
  wrong: "wrong", blank: "blank", correct: "correct",
  grace: "grace", double: "not read",
};

const CENTRE_DATE = "Sunday 19 July 2026";

export function OfflineSheet({
  sheet, questions, learn, classLabel, centre, marksheetHref, onBack,
  other, onOpenOther,
}: {
  sheet: OfflineMarksheet;
  questions: ReviewedQuestion[];
  learn: LearnCard[];
  classLabel: string;
  centre: string;
  marksheetHref: string;
  onBack: () => void;
  /** The online paper's state, for the bridge card. */
  other: { state: "ready" | "pending" | "absent"; marks: number; total: number };
  onOpenOther: () => void;
}) {
  // The design opens on "all": the sheet is the point of the page, and arriving
  // to a dimmed one reads as an error. The filter drives BOTH the OMR panels
  // and the question list, keeping matches lit and dimming the rest.
  const [filter, setFilter] = useState<FilterId>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [hoverSection, setHoverSection] = useState<number | null>(null);

  /* ---------------------------------------------------------- counts --- */
  // `sheet.correct` counts grace inside it and `sheet.wrong` counts doubles
  // inside it, because that is how they scored. The design shows the four
  // buckets a child can act on, so both are taken back out here.
  const correct = sheet.correct - sheet.grace;
  const wrong = sheet.wrong - sheet.doubles;
  const blank = sheet.blank;
  const graced = sheet.grace;
  const flagged = sheet.doubles;

  const rows = questions.filter((q) => filter === "all" || q.status === filter);
  const opened = open === null ? null : questions.find((q) => q.n === open) ?? null;

  /* -------------------------------------------------------- sections --- */
  // The TRACK is scaled to the section's out-of, so a 15-mark block can never
  // draw the same rail as a 25-mark one; the list runs strongest first.
  const maxOut = Math.max(1, ...sheet.sections.map((s) => s.total));
  const withPct = sheet.sections.map((s, i) => ({
    ...s, index: i,
    trackPct: Math.round((s.total / maxOut) * 100),
    fillPct: s.total ? Math.round((s.marks / s.total) * 100) : 0,
    // XI/XII sit one common block and three subjects of their own; IX/X sit
    // seven sections that are common to the whole class.
    isCommon: sheet.sections.length === 4 && i === 0,
    isOptional: sheet.sections.length === 4 && i > 0,
  }));
  const ranked = [...withPct].sort((a, b) => b.fillPct - a.fillPct || a.first - b.first);
  const sectionNote = `${sheet.sections.length} sections, and they are not the same size. ${
    sheet.sections.length === 4
      ? `The first block was sat by everyone in Class ${classLabel}; the other three are the subjects printed on your own sheet.`
      : "Marks and the out-of are shown for each."
  }`;

  const gaps = withPct.map((s) => ({ ...s, gap: s.marks - (s.classAvg ?? s.marks) }));
  const haveAvg = withPct.some((s) => s.classAvg !== null);
  const best = gaps.reduce((a, b) => (b.gap > a.gap ? b : a), gaps[0]);
  const worst = gaps.reduce((a, b) => (b.gap < a.gap ? b : a), gaps[0]);
  const standingLine = !haveAvg
    ? ""
    : worst.gap < -0.5
      ? `Against your class you are strongest in ${best.name} and furthest behind in ${worst.name} — that is where the marks are waiting, not in the sections you already answer well.`
      : "You are at or above the class average in every section of this paper.";

  /* ------------------------------------------------------- OMR panels --- */
  // The physical sheet: columns of 25, in the order they were printed.
  const panels: { title: string; score: string; qs: ReviewedQuestion[] }[] = [];
  for (let p = 0; p * 25 < sheet.total; p++) {
    const slice = questions.slice(p * 25, p * 25 + 25);
    const got = slice.filter((q) => q.status === "correct" || q.status === "grace").length;
    panels.push({
      title: `Q${p * 25 + 1} – Q${Math.min(p * 25 + 25, sheet.total)}`,
      score: `${got} of ${slice.length}`,
      qs: slice,
    });
  }

  /* --------------------------------------------------------- chapters --- */
  const map = new Map<string, {
    name: string; section: string; asked: number; got: number; qs: ReviewedQuestion[];
  }>();
  for (const q of questions) {
    if (!q.chapter || q.status === "grace" || q.status === "double") continue;
    const m = map.get(q.chapter) ?? { name: q.chapter, section: q.section, asked: 0, got: 0, qs: [] };
    m.asked += 1;
    m.qs.push(q);
    if (q.status === "correct") m.got += 1;
    map.set(q.chapter, m);
  }
  const all = [...map.values()].map((c) => ({ ...c, lost: c.asked - c.got }));
  const big = all.filter((c) => c.asked >= 2 && c.lost > 0)
    .sort((a, b) => b.lost - a.lost || b.asked - a.asked);
  const singles = all.filter((c) => c.asked === 1 && c.lost > 0);
  const chapters = big.slice(0, 6);
  const chapterTail = singles.length
    ? `Another ${singles.length} chapter${singles.length === 1 ? "" : "s"} had only one question on this paper and you missed it. One question out of one tells us very little, so it is not listed above.`
    : "Every chapter above had at least two questions on your paper, so the pattern is real and not one unlucky question.";

  const strong = all.filter((c) => c.asked >= 2 && c.lost === 0)
    .sort((a, b) =>
      a.qs.reduce((x, q) => x + (q.classPct ?? 0), 0) / a.asked
      - b.qs.reduce((x, q) => x + (q.classPct ?? 0), 0) / b.asked)
    .slice(0, 3);
  const revise = big.slice(0, 3);

  /* ------------------------------------------------------------ misc --- */
  const filterNote = filter === "all"
    ? `Showing all ${sheet.total} questions. The filter above also drives the list further down the page.`
    : `Showing the ${rows.length} question${rows.length === 1 ? "" : "s"} you can filter to. The sheet below keeps them lit and dims the rest.`;

  const goLearn = (chapter: string) => {
    setOpen(null);
    requestAnimationFrame(() => {
      document.getElementById(chapterAnchor(chapter))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const canLearn = new Set(learn.map((c) => c.chapter));

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: `All ${sheet.total}` },
    { id: "wrong", label: `Wrong ${wrong}` },
    { id: "blank", label: `Blank ${blank}` },
    { id: "correct", label: `Correct ${correct}` },
    { id: "grace", label: `Grace ${graced}` },
  ];
  if (flagged) filters.push({ id: "double", label: `Not read ${flagged}` });

  return (
    <>
      <div className="no-print flex items-center justify-between gap-2 border-b border-[var(--cream-muted)] bg-[var(--cream-surface)] px-2.5 py-2 lap:pl-6 lap:pr-[30px]">
        <button onClick={onBack}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 px-3 text-[0.86rem] font-semibold text-[var(--maroon)]">
          <span aria-hidden="true">←</span>
          <span>Both marksheets</span>
        </button>
        <span className="lbl pr-1.5">Written paper</span>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 pt-4 lap:grid lap:grid-cols-[352px_minmax(0,1fr)] lap:items-start lap:gap-x-5 lap:px-9 lap:pb-[34px] lap:pt-6">

        {/* ═══════════════════════════════════ g1 — the rail, first screen ═══ */}
        <div className="contents lap:col-start-1 lap:row-start-1 lap:flex lap:flex-col lap:gap-4">

          <Card gold center rise>
            <div className="lbl">Written Paper Marksheet</div>
            <div className="tnum mt-2.5 flex items-baseline justify-center gap-1.5">
              <span className="font-[family-name:var(--font-display)] text-[4.4rem] font-bold leading-[0.9] text-[var(--maroon)]">
                {sheet.marks}
              </span>
              <span className="font-[family-name:var(--font-display)] text-[1.55rem] text-[var(--gold)]">
                / {sheet.total}
              </span>
            </div>
            <div className="tnum mt-2.5 text-[0.92rem]">
              {sheet.percent}% · {sheet.marks} of {sheet.total} marks
            </div>
            <div className="my-3"><StarRule /></div>
            <p className="text-[0.8rem] leading-[1.6] text-[var(--ink-muted)]">
              One mark for each correct answer. Nothing is taken away for a wrong
              answer, and a blank counts the same as a wrong one — zero.
            </p>
            {sheet.isFullMarks && (
              <p className="mt-2.5 text-[0.82rem] font-semibold leading-[1.6] text-[var(--maroon)]">
                You answered every question correctly.
              </p>
            )}
          </Card>

          <Card>
            <div className="lbl mb-1.5">How we got this</div>
            <p className="text-[0.82rem] leading-[1.6]">
              Written at {centre} on {CENTRE_DATE}. Your OMR sheet was scanned and
              machine-read at the KIDS office, then checked against the master
              roster for Class {classLabel}.
            </p>
          </Card>

          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(68px,1fr))]">
            <Count st="correct" n={correct} label="Correct" />
            <Count st="wrong" n={wrong} label="Wrong" />
            <Count st="blank" n={blank + flagged} label="Not answered" />
            <Count st="graced" n={graced} label="Grace marks" />
          </div>

          {sheet.ranked && sheet.classRank !== null ? (
            <Card>
              <H3>Where you stand</H3>
              {/* Two, as the design has it. Stacking four ranks invites a child
                  to shop for the flattering one. */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Rank label={`Rank in Class ${classLabel}`} value={num(sheet.classRank)}
                  sub={`of ${num(sheet.classSat)}`} />
                {sheet.percentile !== null && (
                  <Rank label="Percentile in class" value={sheet.percentile.toFixed(1)}
                    sub={`Class ${classLabel} only`} />
                )}
              </div>
              <p className="mt-3 text-[0.78rem] leading-[1.6] text-[var(--ink-muted)]">
                Ranks are worked out within Class {classLabel} only. There is no
                cut-off and nothing to pass or fail.
              </p>
            </Card>
          ) : (
            <Card>
              <H3>Why there is no rank here</H3>
              <p className="mt-2 text-[0.85rem] leading-[1.6]">
                A rank needs every sheet in your class to be marked and checked the
                same way. A small number of sheets could not be placed in that list,
                and yours is one of them.
              </p>
              <p className="mt-1.5 text-[0.85rem] leading-[1.6]">
                Your marks are unaffected — everything below is your own paper, in full.
              </p>
            </Card>
          )}

          <Card>
            <H3 tight>Section by section</H3>
            <p className="mb-3.5 text-[0.76rem] text-[var(--ink-muted)]">{sectionNote}</p>
            <div className="flex flex-col gap-[13px]">
              {ranked.map((s) => (
                <div key={s.name} tabIndex={0}
                  onMouseEnter={() => setHoverSection(s.index)}
                  onMouseLeave={() => setHoverSection(null)}
                  onFocus={() => setHoverSection(s.index)}
                  onBlur={() => setHoverSection(null)}>
                  <div className="mb-[5px] flex items-baseline justify-between gap-2">
                    <span className="text-[0.86rem] font-semibold">{s.name}</span>
                    <span className="tnum text-[0.82rem] font-bold text-[var(--maroon)]">
                      {s.marks} / {s.total}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-[3px] bg-[var(--cream-muted)]"
                    style={{ width: `${s.trackPct}%` }}>
                    <div className="h-3 bg-[var(--maroon)]" style={{ width: `${s.fillPct}%` }} />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    {s.isCommon && (
                      <span className="text-[0.6rem] uppercase tracking-[0.08em] text-[#0B5F53]">
                        Common to everyone
                      </span>
                    )}
                    {s.isOptional && (
                      <span className="text-[0.6rem] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                        Your optional subject
                      </span>
                    )}
                    <span className="tnum text-[0.68rem] text-[var(--ink-muted)]">
                      Q{s.first}–{s.last} · {s.fillPct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-[0.74rem] leading-[1.55] text-[var(--ink-muted)]">
              Bar lengths are drawn to the size of each section, so a{" "}
              {Math.min(...sheet.sections.map((s) => s.total))}-mark section can never
              look like a {maxOut}-mark one. Strongest at the top.
            </p>
          </Card>
        </div>

        {/* ═════════════════════════════════════ g2 — the wide column ═══════ */}
        <div className="contents lap:col-start-2 lap:row-start-1 lap:row-span-2 lap:flex lap:min-w-0 lap:flex-col lap:gap-4">

          <Card gold pad="16px 14px">
            <h3 className="mb-0.5 font-[family-name:var(--font-display)] text-[1.15rem] text-[var(--maroon)]">
              Your sheet, as we read it
            </h3>
            <p className="mb-3 text-[0.78rem] leading-[1.55] text-[var(--ink-muted)]">
              Every bubble on your OMR sheet, printed back to you: the one you
              filled, and the one the answer key says. Tap any line to open that
              question.
            </p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {filters.map((f) => {
                const on = filter === f.id;
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`min-h-[44px] cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] px-[13px] py-2 text-[0.78rem] font-semibold ${
                      on
                        ? "border-[var(--maroon)] bg-[var(--maroon)] text-[var(--cream)]"
                        : "border-[var(--cream-muted)] bg-transparent text-[var(--maroon)]"}`}>
                    {f.label}
                  </button>
                );
              })}
            </div>
            <p className="mb-3 text-[0.72rem] text-[var(--ink-muted)]">{filterNote}</p>

            <div className="mb-3.5 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-2.5">
              <div className="lbl mb-2">How to read this sheet</div>
              <div className="grid gap-2 gap-x-3.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                {LEGEND.map((lg) => (
                  <div key={lg.k} className="flex items-start gap-2">
                    <Disc st={lg.k} size={22} />
                    <span className="text-[0.72rem] leading-[1.45] text-[var(--ink)]">{lg.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[18px] lap:grid lap:grid-cols-2 lap:gap-x-6">
              {panels.map((panel) => {
                let lastSection = "";
                return (
                  <div key={panel.title}
                    className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)]">
                    <div className="flex items-baseline justify-between gap-2 bg-[var(--cream-muted)] px-2.5 py-[7px]">
                      <span className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
                        {panel.title}
                      </span>
                      <span className="tnum text-[0.66rem] text-[var(--ink-muted)]">{panel.score}</span>
                    </div>
                    {panel.qs.map((q) => {
                      const st = ST[AS[q.status]];
                      const sec = sheet.sections.find((s) => q.n >= s.first && q.n <= s.last);
                      const newSection = (sec?.name ?? "") !== lastSection;
                      lastSection = sec?.name ?? "";
                      const dim =
                        (filter !== "all" && q.status !== filter)
                        || (hoverSection !== null && sheet.sections[hoverSection]?.name !== sec?.name)
                          ? 0.22 : 1;
                      return (
                        <div key={q.n}>
                          {newSection && sec && (
                            <div className="bg-[#F6EFE2] px-2.5 pb-[3px] pt-1.5 text-[0.6rem] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                              {sec.name} · Q{sec.first}–{sec.last}
                            </div>
                          )}
                          <button onClick={() => setOpen(q.n)}
                            aria-label={`Question ${q.n} — ${st.label}`}
                            className="flex min-h-[34px] w-full cursor-pointer items-center gap-[7px] border-0 border-t border-[#EFE7D9] px-2.5 py-[3px] text-left"
                            style={{ opacity: dim }}>
                            <span className="tnum w-[22px] flex-none text-right text-[0.66rem] text-[var(--ink-muted)]">
                              {q.n}
                            </span>
                            <span className="flex items-center gap-1">
                              {["a", "b", "c", "d"].map((o, i) => {
                                const marked = q.marked === o || q.second === o;
                                const isKey = q.key === o;
                                const kind =
                                  // A line the machine could not read: the design
                                  // hatches the first two bubbles, because which
                                  // two they were is exactly what is not known.
                                  q.status === "double" ? (i < 2 ? "flag" : "plain")
                                    : q.status === "grace" ? (marked ? "grace" : "plain")
                                    : marked && isKey ? "both"
                                    : marked ? "pick"
                                    : isKey ? "key"
                                    : "plain";
                                return (
                                  <span key={o} aria-hidden style={bubbleStyle(kind)}>
                                    {o.toUpperCase()}
                                  </span>
                                );
                              })}
                            </span>
                            <span aria-hidden
                              className="ml-auto inline-flex flex-none items-center justify-center text-[0.76rem] font-bold leading-none"
                              style={{ width: 22, height: 22, borderRadius: 5, background: st.bg,
                                border: `1.5px solid ${st.stroke}`, color: st.fg }}>
                              {st.glyph}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p className="mt-3.5 text-[0.72rem] italic leading-[1.55] text-[var(--ink-muted)]">
              This is what the scanner read off the paper you handed in. If a line
              does not match what you remember marking, tell your school
              co-ordinator — the physical sheet is kept.
            </p>
          </Card>

          <Card>
            <H3 tight>You and your class</H3>
            <p className="mb-3.5 text-[0.76rem] text-[var(--ink-muted)]">
              {num(sheet.classSat)} students in Class {classLabel} sat this written
              paper. Classes IX to XII sat different papers, so nobody is compared
              across classes.
            </p>
            <div className="flex flex-col gap-3">
              <CompareBar label="You" value={String(sheet.marks)}
                pct={sheet.total ? (sheet.marks / sheet.total) * 100 : 0} fill="var(--maroon)" />
              <CompareBar label={`Class ${classLabel} average`} value={one(sheet.classAvg)}
                pct={sheet.total ? (sheet.classAvg / sheet.total) * 100 : 0} fill="var(--teal)" />
            </div>

            {haveAvg && (
              <>
                <div className="my-4 h-px bg-[var(--cream-muted)]" />
                <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
                  Section by section, against your class
                </div>
                <p className="mb-3 text-[0.76rem] leading-[1.55] text-[var(--ink-muted)]">
                  The overall number hides this. A section where you are well below
                  the class is worth more of your time than one where you are already
                  ahead.
                </p>
                <div className="flex flex-col gap-[11px]">
                  {gaps.map((s) => (
                    <div key={s.name}
                      onMouseEnter={() => setHoverSection(s.index)}
                      onMouseLeave={() => setHoverSection(null)}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-[0.8rem]">{s.name}</span>
                        <span className="tnum text-[0.74rem] font-semibold"
                          style={{ color: s.gap >= 0 ? "#0B5F53" : "var(--maroon)" }}>
                          {s.gap >= 0 ? "+" : "−"}{one(Math.abs(s.gap))} against the class
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-[3px] bg-[var(--cream-muted)]"
                        style={{ width: `${s.trackPct}%` }}>
                        <div className="h-2.5 rounded-[3px] bg-[var(--maroon)]"
                          style={{ width: `${s.fillPct}%` }} />
                        {s.classAvg !== null && (
                          <div className="absolute -top-[3px] h-4 w-0.5 bg-[var(--teal)]"
                            style={{ left: `${Math.round((s.classAvg / s.total) * 100)}%` }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[0.72rem] leading-[1.55] text-[var(--ink-muted)]">
                  The teal line on each bar is the Class {classLabel} average for that
                  section, worked out from how the whole class answered those same
                  questions.
                </p>
                <p className="mt-2.5 text-[0.82rem] leading-[1.6]">{standingLine}</p>
              </>
            )}
          </Card>

          <div data-print="card" className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] pb-1 pt-4">
            <div className="px-4">
              <H3 tight>Every question, explained</H3>
              <p className="mb-3 text-[0.76rem] text-[var(--ink-muted)]">
                Every question carries a written explanation — why the right answer
                is right, and why each of the others is not. Tap any line to read it.
              </p>
            </div>
            <div className="border-t border-[var(--cream-muted)]">
              {rows.map((q) => {
                const st = ST[AS[q.status]];
                return (
                  <button key={q.n} onClick={() => setOpen(q.n)} aria-haspopup="dialog"
                    className="flex min-h-[54px] w-full cursor-pointer items-center gap-2.5 border-b border-[var(--cream-muted)] px-3.5 py-2.5 text-left">
                    <Disc st={AS[q.status]} size={24} />
                    <span className="tnum w-6 flex-none text-[0.76rem] text-[var(--ink-muted)]">
                      {q.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.83rem] leading-[1.4]">
                        {q.stem || `${q.section} — question ${q.n}`}
                      </span>
                      <span className="mt-0.5 block text-[0.68rem] text-[var(--ink-muted)]">
                        {q.chapter ? `${q.section} · ${q.chapter}` : q.section}
                      </span>
                    </span>
                    <span className="tnum flex-none text-[0.7rem] text-[var(--ink-muted)]">
                      {q.status === "grace" ? "grace"
                        : q.classPct !== null ? `${Math.round(q.classPct)}%` : ""}
                    </span>
                    <span className="sr-only">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Card>
            <H3 tight>By chapter</H3>
            <p className="mb-3.5 text-[0.76rem] leading-[1.55] text-[var(--ink-muted)]">
              Your {sheet.total} questions came from {all.length} chapters. These are
              the ones that actually cost you marks, heaviest first.
            </p>
            {chapters.length > 0 ? (
              <>
                <div className="flex flex-col gap-2.5">
                  {chapters.map((c) => (
                    <button key={c.name}
                      onClick={() => canLearn.has(c.name) && goLearn(c.name)}
                      className="block w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-[11px] text-left">
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="text-[0.86rem] font-semibold">{c.name}</span>
                        <span className="tnum text-[0.76rem] font-bold"
                          style={{ color: c.got === 0 ? "var(--maroon)" : "var(--ink)" }}>
                          {c.got} of {c.asked}
                        </span>
                      </div>
                      <div className="mt-[7px] flex items-center gap-1">
                        {c.qs.map((q) => (
                          <Dot key={q.n} got={q.status === "correct"} />
                        ))}
                        <span className="ml-1 text-[0.7rem] text-[var(--ink-muted)]">
                          {c.section} · {c.lost} mark{c.lost === 1 ? "" : "s"} lost
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[0.74rem] leading-[1.55] text-[var(--ink-muted)]">
                  {chapterTail}
                </p>
              </>
            ) : (
              <p className="text-[0.85rem] leading-[1.6]">
                Nothing to single out. You did not lose more than a mark in any one
                chapter of this paper.
              </p>
            )}
          </Card>

          <Card>
            <H3 tight>Learn it</H3>
            <p className="mb-3.5 text-[0.76rem] leading-[1.55] text-[var(--ink-muted)]">
              {learn.length
                ? "A trick to remember it, something to practise on, and a video where one exists."
                : ""}
            </p>
            {learn.length > 0 ? (
              <LearnIt cards={learn} />
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] p-3.5">
                <p className="mb-1.5 text-[0.85rem] leading-[1.6]">
                  There is nothing here for you to fix from this paper.
                </p>
                <p className="text-[0.82rem] leading-[1.6] text-[var(--ink-muted)]">
                  Your paper touched {all.length} chapters, and each one still has a
                  trick, a practice set and sometimes a video. Open any question above
                  and take the chapter link from there.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <H3 tight>What to do next</H3>
            <p className="mb-3.5 text-[0.76rem] text-[var(--ink-muted)]">
              Worked out from the chapters your questions came from, not from single
              questions.
            </p>

            <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#0B5F53]">
              {strong.length ? "You did well here" : "Where to start"}
            </div>
            {strong.length > 0 ? (
              <div className="flex flex-col gap-2">
                {strong.map((c) => (
                  <button key={c.name}
                    onClick={() => canLearn.has(c.name) && goLearn(c.name)}
                    className="block w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-[11px] text-left">
                    <div className="tnum text-[0.72rem] font-semibold text-[#0B5F53]">
                      All {c.asked} questions correct · {c.section}
                    </div>
                    <div className="mt-[3px] text-[0.84rem] leading-[1.45]">{c.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[0.84rem] leading-[1.6]">
                Nothing to list here from this paper. That is alright — start with the
                chapters below. They are the ones that cost you the most, so they are
                where the marks are.
              </p>
            )}

            <div className="my-4 h-px bg-[var(--cream-muted)]" />

            <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--maroon)]">
              Worth going back to
            </div>
            {revise.length > 0 ? (
              <div className="flex flex-col gap-2">
                {revise.map((c) => (
                  <button key={c.name}
                    onClick={() => canLearn.has(c.name) && goLearn(c.name)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-[11px] text-left">
                    <span className="min-w-0 flex-1">
                      <span className="tnum block text-[0.72rem] font-semibold text-[var(--maroon)]">
                        {c.lost} mark{c.lost === 1 ? "" : "s"} lost here · {c.section}
                      </span>
                      <span className="mt-[3px] block text-[0.84rem] leading-[1.45]">{c.name}</span>
                    </span>
                    {canLearn.has(c.name) && (
                      <span className="flex-none text-[0.74rem] font-semibold text-[var(--maroon)]">
                        Learn it →
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[0.84rem] leading-[1.6]">
                There is nothing to revise from this paper — you answered every
                question correctly.
              </p>
            )}

            <p className="mt-3.5 text-[0.82rem] leading-[1.6]">
              {sheet.isFullMarks
                ? "You answered every question on the paper. Take the chapters you enjoyed and go further into them."
                : "One paper on one morning tells you which chapters to open next. That is all it tells you, and it is worth knowing."}
            </p>
          </Card>
        </div>

        {/* ═════════════════════════ g3 — under the rail, second row ════════ */}
        <div className="contents lap:col-start-1 lap:row-start-2 lap:mt-4 lap:flex lap:flex-col lap:gap-4">

          <div className="no-print rounded-[var(--radius-md)] border border-t-[3px] border-[var(--cream-muted)] border-t-[var(--gold)] bg-[var(--cream-surface)] p-4">
            <H3>Take it with you</H3>
            <p className="mb-3.5 mt-1.5 text-[0.82rem] leading-[1.6] text-[var(--ink-muted)]">
              A one-page A4 marksheet with your sheet printed on it, ready to keep in
              your file or show at school.
            </p>
            <a href={marksheetHref} target="_blank" rel="noreferrer"
              className="flex min-h-[52px] w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--maroon)] px-4 text-center text-[0.9rem] font-bold text-[var(--cream)] no-underline">
              Download your marksheet (A4)
            </a>
            <div className="h-2.5" />
            <button onClick={() => window.print()}
              className="min-h-[52px] w-full cursor-pointer rounded-[var(--radius-sm)] border-[1.5px] border-[var(--maroon)] bg-transparent text-[0.9rem] font-bold text-[var(--maroon)]">
              Print this page
            </button>
          </div>

          <Card>
            <div className="lbl">Your other paper</div>
            {other.state === "ready" ? (
              <>
                <p className="mb-2.5 mt-1.5 text-[0.82rem] leading-[1.6]">
                  You also sat the online paper. It was a different paper of 50
                  questions in half an hour, so the two scores are not comparable and
                  are never added together.
                </p>
                <button onClick={onOpenOther}
                  className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-2.5 text-left">
                  <span className="font-[family-name:var(--font-display)] text-[1rem] text-[var(--maroon)]">
                    Online Exam
                  </span>
                  <span className="tnum text-[0.8rem] font-semibold text-[var(--maroon)]">
                    {other.marks} / {other.total} →
                  </span>
                </button>
              </>
            ) : other.state === "pending" ? (
              <>
                <div className="my-0.5 font-[family-name:var(--font-display)] text-[1.05rem] text-[var(--maroon)]">
                  Online Exam
                </div>
                <p className="text-[0.82rem] leading-[1.6]">
                  Still being marked. It will appear on this page — nothing more is
                  needed from you.
                </p>
              </>
            ) : (
              <>
                <div className="my-0.5 font-[family-name:var(--font-display)] text-[1.05rem] text-[var(--maroon)]">
                  Online Exam
                </div>
                <p className="text-[0.82rem] leading-[1.6]">
                  You did not sit this one, so there is no result for it.
                </p>
              </>
            )}
          </Card>

          <Card>
            <div className="lbl mb-1.5">Keep this private</div>
            <p className="text-[0.82rem] leading-[1.6]">
              This link is yours alone. Anyone who opens it can see your result, so do
              not post it in a group. If you want to show someone, send a screenshot
              instead.
            </p>
          </Card>
        </div>
      </div>

      {opened && (
        <OfflineQuestionSheet
          question={opened}
          pool={rows}
          allQuestions={questions}
          total={sheet.total}
          classLabel={classLabel}
          filterWord={filter === "all" ? null : FILTER_WORD[filter]}
          onClose={() => setOpen(null)}
          onStep={setOpen}
          onLearn={opened.chapter && canLearn.has(opened.chapter) ? goLearn : null}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------- pieces --- */

/** The design's plain card: cream surface, muted border, optional gold top. */
function Card({
  children, gold, center, rise, pad = "16px",
}: {
  children: React.ReactNode; gold?: boolean; center?: boolean; rise?: boolean; pad?: string;
}) {
  return (
    <div data-print="card"
      className={`rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] ${
        gold ? "border-t-[3px] border-t-[var(--gold)]" : ""} ${
        center ? "text-center" : ""} ${rise ? "rise shadow-[var(--shadow-md)]" : ""}`}
      style={{ padding: gold && center ? "20px 18px 16px" : pad }}>
      {children}
    </div>
  );
}

function H3({ children, tight }: { children: React.ReactNode; tight?: boolean }) {
  return (
    <h3 className={`font-[family-name:var(--font-display)] text-[1.05rem] text-[var(--maroon)] ${
      tight ? "mb-0.5" : ""}`}>
      {children}
    </h3>
  );
}

/** The design's status disc — a glyph in a tinted, outlined circle. */
function Disc({ st, size }: { st: SheetState; size: number }) {
  const s = ST[st];
  return (
    <span aria-hidden
      className="inline-flex flex-none items-center justify-center rounded-full font-bold leading-none"
      style={{ width: size, height: size, background: s.bg,
        border: `1.5px solid ${s.stroke}`, color: s.fg, fontSize: size * 0.35 }}>
      {s.glyph}
    </span>
  );
}

function Count({ st, n, label }: { st: SheetState; n: number; label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-1.5 py-3 text-center">
      <Disc st={st} size={26} />
      <div className="tnum font-[family-name:var(--font-display)] text-[1.5rem] font-bold leading-[1.15]">
        {n}
      </div>
      <div className="text-[0.66rem] leading-[1.3] text-[var(--ink-muted)]">{label}</div>
    </div>
  );
}

function Rank({ label, value, sub }: { label: string; value: string; sub: string }) {
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

function CompareBar({ label, value, pct, fill }: {
  label: string; value: string; pct: number; fill: string;
}) {
  return (
    <div>
      <div className="mb-[5px] flex items-baseline justify-between gap-2">
        <span className="text-[0.84rem]">{label}</span>
        <span className="tnum text-[0.84rem] font-bold">{value}</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-[3px] bg-[var(--cream-muted)]">
        <div className="h-3.5 rounded-[3px]"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: fill }} />
      </div>
    </div>
  );
}

function Dot({ got }: { got: boolean }) {
  const s = got
    ? { bg: "#D3EDE8", stroke: "#57B3A4", fg: "#0B5F53", glyph: "✓" }
    : { bg: "#F6E2E4", stroke: "#C98D95", fg: "#7B1E2B", glyph: "✕" };
  return (
    <span aria-hidden
      className="inline-flex items-center justify-center rounded-full text-[0.62rem] font-bold leading-none"
      style={{ width: 17, height: 17, background: s.bg,
        border: `1.5px solid ${s.stroke}`, color: s.fg }}>
      {s.glyph}
    </span>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { firstPhaseReport } from "@/lib/exam/report";
import type { Band, ClassRow, FirstPhaseReport, Threshold } from "@/lib/exam/report";
import { publicationState } from "@/lib/exam/results";
import "./results.css";

/**
 * The public report on the first phase of SET 2026–27.
 *
 * This is not the student's result page — that is /portal, reached by scanning
 * the admit card, and it is the only place a child's own marks appear. This page
 * is for head teachers, parents, partners and press: what happened on 19 July,
 * as a whole, honestly.
 *
 * Three rules the page is built around, and they are the reason several obvious
 * panels are missing:
 *
 *   1. ONLINE ONLY. The 100-question written paper sat the same morning is still
 *      being marked by hand. Every figure here is the 50-question online paper,
 *      and the page says so repeatedly rather than once.
 *   2. NO SUBJECTS. The online paper is one mixed paper per class. There are no
 *      subject toppers, no subject averages and no per-subject charts to build.
 *   3. NOTHING THAT SHAMES. Best schools and fullest centres are celebrated;
 *      there is no bottom table and no failing-school list. These are
 *      under-resourced vernacular-medium schools and the page exists to
 *      encourage them.
 *
 * The four classes sat four different papers, so they are never ranked against
 * one another — where they appear side by side the page says why.
 *
 * Regenerated hourly rather than per visit: the tables behind it are a frozen
 * published snapshot, so there is nothing to be fresh about.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "SET 2026–27 First Phase Results — KIDS",
  description:
    "The first-phase (online paper) results of the Students Evaluation Test 2026–27: 6,778 students from 112 schools at 21 centres across West Bengal, reported in full.",
};

const TOTAL = 50;
const num = (v: number) => v.toLocaleString("en-IN");
const marks = (v: number) => v.toFixed(2);
const pct = (v: number) => `${v.toFixed(1)}%`;
/** A mark out of 50, as a share of the bar it sits on. */
const ofTotal = (v: number) => `${(v / TOTAL) * 100}%`;

const CARD =
  "bg-[var(--cream-surface)] border border-[var(--cream-muted)] rounded-[10px] shadow-[var(--shadow-sm)]";
const TH =
  "p-[12px_18px] bg-[var(--cream-muted)] text-[var(--maroon)] text-[0.68rem] tracking-[0.08em] uppercase font-semibold";
const TD = "px-[18px] py-[13px] border-t border-[var(--cream-muted)] leading-[1.5]";
const HEADING =
  "font-[family-name:var(--font-display)] font-bold text-[clamp(1.7rem,3.4vw,2.44rem)] leading-[1.2] mt-2 mb-3 text-[var(--ink)]";
const LEDE =
  "max-w-[66ch] text-[clamp(0.95rem,1.4vw,1.05rem)] leading-[1.7] text-[var(--ink-muted)]";
const NOTE = "text-[0.85rem] leading-[1.7] text-[var(--ink-muted)]";

function Rule() {
  return (
    <div className="h-[2px] bg-[var(--gold)] mt-[clamp(48px,7vw,80px)] mb-[clamp(36px,5vw,56px)]" />
  );
}

/** "one" … "ten", for prose that would read badly with a numeral. */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.72rem] tracking-[0.14em] uppercase text-[var(--maroon)] font-bold">
      {children}
    </div>
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className}>
      ★
    </span>
  );
}

/** A labelled bar on a 0–50 or 0–100% track, used in five places. */
function BarRow({
  label,
  width,
  value,
  colour = "var(--maroon)",
  tick,
  height = "14px",
  labelWidth = "clamp(74px,12vw,104px)",
  valueWidth = "clamp(96px,18vw,136px)",
}: {
  label: React.ReactNode;
  width: string;
  value: React.ReactNode;
  colour?: string;
  /** A dotted or solid reference mark across the track, as a percentage. */
  tick?: { at: string; dotted?: boolean };
  height?: string;
  labelWidth?: string;
  valueWidth?: string;
}) {
  return (
    <div
      className="grid items-center gap-[clamp(8px,1.5vw,16px)]"
      style={{ gridTemplateColumns: `${labelWidth} 1fr ${valueWidth}` }}
    >
      <span className="text-[0.84rem] text-[var(--ink)] font-semibold tnum">{label}</span>
      <span
        className="block bg-[var(--cream-muted)] rounded-full relative"
        style={{ height }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width, background: colour }}
        />
        {tick && (
          <span
            className="absolute -top-[5px] -bottom-[5px]"
            style={
              tick.dotted
                ? { left: tick.at, borderLeft: "2px dotted var(--ink)" }
                : { left: tick.at, width: "2px", background: "var(--ink)" }
            }
          />
        )}
      </span>
      <span className="text-[0.82rem] text-[var(--ink-muted)] text-right tnum">{value}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── the page ─── */

export default async function ResultsPage() {
  const { published } = await publicationState();
  if (!published) return <NotPublishedYet />;

  const report = await firstPhaseReport();
  const { headline, classes, bands, thresholds, timing, hardest, easiest } = report;

  const overallTurnout = (headline.sat / headline.enrolled) * 100;

  return (
    <div className="report min-h-screen">
      <Hero headline={headline} />

      <div className="w-full px-4 md:px-8 pb-[clamp(60px,8vw,96px)]">
        <Headlines report={report} />
        <Rule />
        <Distribution bands={bands} thresholds={thresholds} ranked={headline.ranked} />
        <Rule />
        <Classes classes={classes} timing={timing} overallTurnout={overallTurnout} />
        <Rule />
        <FullMarks report={report} />
        <Rule />
        <Schools report={report} />
        <Rule />
        <Centres report={report} overallTurnout={overallTurnout} />
        <Rule />
        <Difficulty hardest={hardest} easiest={easiest} />
        <Rule />
        <WhatNext />
        <OwnResult />

        <p className="mt-[clamp(28px,4vw,44px)] text-[0.82rem] leading-[1.8] text-[var(--ink-muted)] max-w-[80ch]">
          All figures on this page are drawn from the assessed online paper of the Students
          Evaluation Test held on 19 July 2026, and are published for verification. They cover the
          first phase only. Where a figure is an average, it is the average of the students who sat,
          not of those registered. Schools or parents who believe a figure is wrong may write to
          KIDS at the address below.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────── hero ─── */

/**
 * The opening band.
 *
 * The top padding carries an extra 80px because the site's navbar is `fixed` and
 * 80px tall while <main> offsets only the 40px announcement bar above it. Every
 * other page absorbs the navbar in PageHeader's `py-24`; this hero has to do it
 * itself, or the badge sits under the navigation.
 */
function Hero({ headline }: { headline: FirstPhaseReport["headline"] }) {
  return (
    <div className="sky relative overflow-hidden text-[var(--cream)] w-full px-4 md:px-8 pt-[calc(80px+clamp(40px,7vw,84px))] pb-[clamp(52px,8vw,96px)]">
      <Star className="absolute top-[12%] left-[8%] text-[var(--star-gold)] opacity-50 text-[12px]" />
      <Star className="absolute top-[26%] left-[22%] text-[var(--gold-light)] opacity-35 text-[8px]" />
      <Star className="absolute top-[8%] right-[18%] text-[var(--star-gold)] opacity-45 text-[10px]" />
      <Star className="absolute top-[34%] right-[9%] text-[var(--gold-light)] opacity-30 text-[14px]" />
      <Star className="absolute top-[18%] left-[47%] text-[var(--star-gold)] opacity-25 text-[9px]" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap gap-2.5 items-center">
          <span className="inline-flex items-center gap-1.5 bg-[var(--gold)] text-[var(--maroon)] text-[0.72rem] font-bold tracking-[0.08em] uppercase px-3 py-[5px] rounded-full">
            <Star /> First phase · online paper
          </span>
          <span className="text-[0.78rem] tracking-[0.08em] uppercase opacity-85">
            Project UDAAN
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-[clamp(2.1rem,5.2vw,3.6rem)] leading-[1.12] m-0 max-w-[20ch] text-[var(--cream)]">
          SET 2026–27 · First Phase Results
        </h1>

        <p className="m-0 max-w-[60ch] text-[clamp(1rem,1.6vw,1.2rem)] leading-[1.6] text-[#e8f3f0]">
          On Sunday, 19 July 2026, {num(headline.sat)} students from {num(headline.schools)} schools
          sat the online paper of the Students Evaluation Test at {num(headline.centres)} centres
          across West Bengal. This page reports what happened, in full.
        </p>

        <div className="flex gap-3.5 items-start max-w-[62ch] bg-[rgba(12,42,46,0.42)] border border-[rgba(201,162,75,0.55)] rounded-[10px] px-[18px] py-3.5">
          <Star className="text-[var(--gold)] text-base leading-[1.5]" />
          <p className="m-0 text-[0.92rem] leading-[1.6] text-[var(--on-dark)]">
            These figures cover the{" "}
            <strong className="text-[var(--gold-light)]">online paper only</strong> — 50 questions in
            30 minutes. The 100-question written paper sat on the same day is still being marked by
            hand. Its results will be published separately; no date has been set.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── headlines ─── */

function Headlines({ report }: { report: FirstPhaseReport }) {
  const { headline } = report;
  const stats = [
    { value: num(headline.enrolled), label: "Students registered" },
    { value: num(headline.sat), label: "Sat the online paper" },
    { value: marks(headline.average), suffix: ` / ${TOTAL}`, label: "Average score" },
    { value: num(headline.fullMarks), label: "Scored full marks" },
  ];

  return (
    <section className="relative mt-[clamp(-32px,-4vw,-24px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-[clamp(12px,1.6vw,20px)]">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] border-t-[3px] border-t-[var(--gold)] rounded-[10px] shadow-[var(--shadow-md)] px-[18px] py-5"
          >
            <div className="font-[family-name:var(--font-display)] font-bold text-[clamp(2rem,4vw,2.9rem)] leading-[1.05] text-[var(--maroon)] tnum">
              {s.value}
              {s.suffix && (
                <span className="text-[0.42em] text-[var(--ink-muted)] font-semibold">
                  {s.suffix}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-[0.74rem] tracking-[0.08em] uppercase text-[var(--ink-muted)] font-semibold">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-7 gap-y-1 mt-[22px] pt-[18px] border-t border-[var(--cream-muted)] text-[0.88rem] leading-[1.7] text-[var(--ink-muted)]">
        <p className="m-0">
          <strong className="text-[var(--ink)]">{num(headline.centres)}</strong> exam centres
        </p>
        <p className="m-0">
          <strong className="text-[var(--ink)]">{num(headline.schools)}</strong> schools represented
        </p>
        <p className="m-0">
          <strong className="text-[var(--ink)]">Classes IX–XII</strong>, four papers
        </p>
        <p className="m-0">
          <strong className="text-[var(--ink)]">Bengali · Hindi · Urdu</strong>
        </p>
      </div>

      <p className="mt-[18px] text-[0.86rem] leading-[1.7] text-[var(--ink-muted)] max-w-[74ch]">
        One mark for each correct answer. Nothing is deducted for a wrong answer. Fifty marks in
        all, thirty minutes to answer.
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────── distribution ─── */

function Distribution({
  bands,
  thresholds,
  ranked,
}: {
  bands: Band[];
  thresholds: Threshold[];
  ranked: number;
}) {
  const tallest = Math.max(...bands.map((b) => b.students));
  const half = thresholds.filter((t) => t.share >= 50).at(-1);
  const broadMiddle = bands
    .filter((b) => b.from >= 15 && b.from <= 25)
    .reduce((sum, b) => sum + b.students, 0);
  const top = thresholds.find((t) => t.mark === 45);
  const foot = bands[0];

  return (
    <section>
      <SectionLabel>Section one</SectionLabel>
      <h2 className={HEADING}>How the whole cohort scored</h2>
      <p className={`${LEDE} m-0 mb-2`}>
        Every one of the {num(ranked)} ranked students, grouped by the marks they scored out of 50.
        The tallest column is the most common band. Read it as the shape of the cohort, not as a
        pass mark — there is no pass mark.
      </p>

      <div className={`${CARD} dist p-[clamp(18px,3vw,32px)] mt-6`}>
        <div className="flex items-end gap-[clamp(3px,0.8vw,12px)] h-[clamp(190px,26vw,300px)]">
          {bands.map((b) => {
            const emphasis = b.students === tallest || b.from === TOTAL;
            return (
              <div
                key={b.label}
                className="flex-1 min-w-0 flex flex-col justify-end items-center h-full gap-1.5"
              >
                <div
                  className={`dist-count text-[clamp(0.56rem,1vw,0.78rem)] tnum ${
                    emphasis ? "text-[var(--maroon)] font-bold" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {num(b.students)}
                </div>
                <div className="flex-1 min-h-0 w-full flex items-end">
                  <div
                    className="w-full rounded-t-[3px]"
                    style={{
                      height: `${(b.students / tallest) * 100}%`,
                      background: b.from >= 45 ? "var(--gold)" : "var(--maroon)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-[clamp(3px,0.8vw,12px)] mt-2 pt-2 border-t border-[var(--cream-muted)]">
          {bands.map((b) => (
            <div
              key={b.label}
              className={`dist-label flex-1 min-w-0 text-center text-[clamp(0.52rem,0.95vw,0.72rem)] tnum ${
                b.from >= 45 ? "text-[var(--maroon)] font-semibold" : "text-[var(--ink-muted)]"
              }`}
            >
              {b.label}
            </div>
          ))}
        </div>

        <div className="mt-2.5 text-[0.72rem] tracking-[0.06em] uppercase text-[var(--ink-muted)]">
          Marks scored out of 50 · number of students in each band
        </div>
      </div>

      <div className={`${CARD} p-[clamp(18px,3vw,32px)] mt-[clamp(14px,2vw,22px)]`}>
        <div className="font-[family-name:var(--font-display)] font-bold text-[1.3rem] text-[var(--ink)]">
          How many reached each mark
        </div>
        <p className="mt-1.5 mb-5 text-[0.9rem] leading-[1.7] text-[var(--ink-muted)] max-w-[66ch]">
          The same {num(ranked)} students read a different way: how many scored <em>at least</em> a
          given mark.{" "}
          {half && (
            <>
              Half the cohort — {num(half.students)} students — scored {half.mark} or more.
            </>
          )}
        </p>

        <div className="grid gap-[9px]">
          {thresholds.map((t) => (
            <BarRow
              key={t.mark}
              label={t.mark === TOTAL ? "All 50" : `${t.mark} or more`}
              width={`${Math.max(t.share, 0.9)}%`}
              colour={t.mark >= 40 ? "var(--gold)" : "var(--maroon)"}
              tick={half && t.mark === half.mark ? { at: `${t.share}%` } : undefined}
              value={
                <>
                  <strong className={t.mark === TOTAL ? "text-[var(--maroon)]" : "text-[var(--ink)]"}>
                    {num(t.students)}
                  </strong>{" "}
                  · {pct(t.share)}
                </>
              }
            />
          ))}
        </div>

        <div className="mt-3.5 pt-3 border-t border-[var(--cream-muted)] text-[0.8rem] text-[var(--ink-muted)] leading-[1.7]">
          The black tick marks the halfway point of the cohort. A student on {half?.mark} marks was,
          near enough, the middle student of the first phase.
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(14px,2vw,24px)] mt-[clamp(16px,2vw,24px)]">
        <Aside title="A broad middle">
          {num(broadMiddle)} students — just over half — scored between 15 and 29. This is where
          most of the cohort sits.
        </Aside>
        <Aside title="A second cluster at the top">
          {num(top?.students ?? 0)} students scored 45 or more. That is a real group, not a
          scattering of outliers — and {num(bands[10].students)} of them answered every question
          correctly.
        </Aside>
        <Aside title={`The ${num(foot.students)} at the foot`}>
          Most of the {num(foot.students)} students in the 0–4 band opened the paper and answered
          almost nothing. We report them rather than remove them.
        </Aside>
      </div>
    </section>
  );
}

function Aside({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] rounded-[10px] p-5">
      <div className="font-[family-name:var(--font-display)] text-[1.3rem] font-bold text-[var(--maroon)] mb-1.5">
        {title}
      </div>
      <p className="m-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">{children}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── class by class ─── */

function Classes({
  classes,
  timing,
  overallTurnout,
}: {
  classes: ClassRow[];
  timing: FirstPhaseReport["timing"];
  overallTurnout: number;
}) {
  const turnout = (c: ClassRow) => (c.sat / c.registered) * 100;
  const gap = (c: ClassRow) => Math.abs(c.average - c.median);

  const lowest = classes.reduce((a, b) => (turnout(a) <= turnout(b) ? a : b));
  const highest = classes.reduce((a, b) => (turnout(a) >= turnout(b) ? a : b));
  const uneven = classes.reduce((a, b) => (gap(a) >= gap(b) ? a : b));
  const tight = classes.filter((c) => gap(c) < 1).map((c) => c.cls);

  return (
    <section>
      <SectionLabel>Section two</SectionLabel>
      <h2 className={HEADING}>Class by class</h2>

      <div className="flex gap-3 items-start max-w-[70ch] bg-[var(--maroon-tint)] rounded-[10px] px-[18px] py-3.5 mb-6">
        <Star className="text-[var(--maroon)] text-[0.95rem] leading-[1.6]" />
        <p className="m-0 text-[0.92rem] leading-[1.7] text-[var(--maroon)]">
          <strong>Four different papers.</strong> Class IX, X, XI and XII each sat a paper written
          for their own year. A mark on one paper is not the same as a mark on another, so these
          four columns are not a ranking of the classes.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(232px,1fr))] gap-[clamp(14px,2vw,22px)]">
        {classes.map((c) => (
          <div key={c.cls} className={`${CARD} overflow-hidden`}>
            <div className="bg-[var(--maroon)] text-[var(--cream)] px-[18px] py-2.5 flex justify-between items-baseline">
              <span className="font-[family-name:var(--font-display)] font-bold text-[1.25rem]">
                Class {c.cls}
              </span>
              <span className="text-[0.72rem] tracking-[0.08em] uppercase opacity-85">Own paper</span>
            </div>
            <div className="p-[18px]">
              <div className="flex items-baseline gap-1.5">
                <span className="font-[family-name:var(--font-display)] font-bold text-[2.2rem] text-[var(--maroon)] leading-none tnum">
                  {marks(c.average)}
                </span>
                <span className="text-[0.8rem] text-[var(--ink-muted)]">average of {TOTAL}</span>
              </div>

              <div className="relative h-2.5 bg-[var(--cream-muted)] rounded-full mt-3.5 mb-1.5">
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--maroon)] rounded-full"
                  style={{ width: ofTotal(c.average) }}
                />
                <div
                  className="absolute -top-1 -bottom-1 w-0.5 bg-[var(--teal)]"
                  style={{ left: ofTotal(c.median) }}
                />
              </div>
              <div className="flex justify-between text-[0.68rem] text-[var(--ink-muted)] tnum">
                <span>0</span>
                <span className="text-[var(--teal)] font-semibold">
                  Median {c.median.toFixed(1)}
                </span>
                <span>{TOTAL}</span>
              </div>

              <div className="mt-4 grid gap-2 text-[0.86rem]">
                <Line label="Sat / registered" value={`${num(c.sat)} / ${num(c.registered)}`} />
                <Line label="Highest score" value={num(c.highest)} />
                <Line
                  label="Full marks"
                  value={`${num(c.fullMarks)} students`}
                  colour="text-[var(--maroon)]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[clamp(14px,2vw,22px)] mt-[clamp(14px,2vw,22px)]">
        <div className={`${CARD} p-[clamp(18px,3vw,28px)]`}>
          <div className="font-[family-name:var(--font-display)] font-bold text-[1.25rem] text-[var(--ink)]">
            Who turned up, class by class
          </div>
          <p className="mt-1.5 mb-[18px] text-[0.88rem] leading-[1.7] text-[var(--ink-muted)]">
            Share of each class&rsquo;s registered students who sat the online paper. The dotted
            line is the overall figure, {pct(overallTurnout)}.
          </p>
          <div className="grid gap-3">
            {classes.map((c) => (
              <BarRow
                key={c.cls}
                label={`Class ${c.cls}`}
                width={`${turnout(c)}%`}
                colour={c.cls === lowest.cls ? "var(--maroon-light)" : "var(--maroon)"}
                tick={{ at: `${overallTurnout}%`, dotted: true }}
                height="16px"
                labelWidth="66px"
                valueWidth="92px"
                value={<strong className="text-[var(--ink)]">{pct(turnout(c))}</strong>}
              />
            ))}
          </div>
          <p className={`${NOTE} mt-4 pt-3 border-t border-[var(--cream-muted)]`}>
            Class {lowest.cls} had the lowest turnout of the four:{" "}
            {num(lowest.registered - lowest.sat)} of its {num(lowest.registered)} registered students
            did not sit. Class {highest.cls} turned up in the greatest proportion.
          </p>
        </div>

        <div className={`${CARD} p-[clamp(18px,3vw,28px)]`}>
          <div className="font-[family-name:var(--font-display)] font-bold text-[1.25rem] text-[var(--ink)]">
            Average against middle student
          </div>
          <p className="mt-1.5 mb-[18px] text-[0.88rem] leading-[1.7] text-[var(--ink-muted)]">
            Each bar runs 0 to {TOTAL}.{" "}
            <span className="text-[var(--maroon)] font-semibold">●</span> is the average,{" "}
            <span className="text-[var(--teal)] font-semibold">●</span> the median. A wide gap means
            an uneven class.
          </p>
          <div className="grid gap-4">
            {classes.map((c) => (
              <div key={c.cls} className="grid grid-cols-[66px_1fr_74px] items-center gap-3">
                <span className="text-[0.86rem] font-semibold">Class {c.cls}</span>
                <span className="block h-1.5 bg-[var(--cream-muted)] rounded-full relative">
                  <span
                    className="absolute inset-y-0 bg-[var(--maroon-tint)]"
                    style={{
                      left: ofTotal(Math.min(c.average, c.median)),
                      width: ofTotal(gap(c)),
                    }}
                  />
                  <span
                    className="absolute top-1/2 w-[11px] h-[11px] -mt-[5.5px] -ml-[5.5px] bg-[var(--teal)] rounded-full"
                    style={{ left: ofTotal(c.median) }}
                  />
                  <span
                    className="absolute top-1/2 w-[11px] h-[11px] -mt-[5.5px] -ml-[5.5px] bg-[var(--maroon)] rounded-full"
                    style={{ left: ofTotal(c.average) }}
                  />
                </span>
                <span
                  className={`text-right text-[0.8rem] tnum ${
                    c.cls === uneven.cls
                      ? "text-[var(--maroon)] font-bold"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  {gap(c).toFixed(1)} gap
                </span>
              </div>
            ))}
          </div>
          <p className={`${NOTE} mt-4 pt-3 border-t border-[var(--cream-muted)]`}>
            {tight.length > 0 && (
              <>
                Class {tight.join(" and ")} {tight.length > 1 ? "are" : "is"} tightly clustered —
                most students scored close to their class average.{" "}
              </>
            )}
            Class {uneven.cls} is the uneven one.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(14px,2vw,24px)] mt-[clamp(16px,2vw,24px)]">
        <div className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] border-t-[3px] border-t-[var(--teal)] rounded-[10px] p-5">
          <div className="font-[family-name:var(--font-display)] text-[1.2rem] font-bold text-[var(--ink)] mb-1.5">
            What the median tells us
          </div>
          <p className="m-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">
            The average is the arithmetic mean; the median is the mark of the middle student. In
            Class {uneven.cls} the median ({uneven.median.toFixed(1)}) sits well below the average (
            {marks(uneven.average)}). That gap means a long tail of low scores pulling one number
            away from the other — a group of Class {uneven.cls} students who found this paper hard.
            It is the clearest signal in the data of where support is needed.
          </p>
        </div>

        <div className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] border-t-[3px] border-t-[var(--gold)] rounded-[10px] p-5">
          <div className="font-[family-name:var(--font-display)] text-[1.2rem] font-bold text-[var(--ink)] mb-1.5">
            How the half hour was used
          </div>
          <p className="mt-0 mb-3 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">
            {num(timing.byHand)} students submitted their paper themselves. {num(timing.autoSubmitted)}{" "}
            were submitted automatically when the window closed at 11:00.
          </p>
          <div className="flex gap-6 flex-wrap">
            <Minutes value={timing.averageMinutes} label="Average time taken" />
            <Minutes value={timing.medianMinutes} label="Median time taken" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Line({ label, value, colour = "" }: { label: string; value: string; colour?: string }) {
  return (
    <div className="flex justify-between gap-2.5 border-t border-[var(--cream-muted)] pt-2">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className={`tnum font-semibold ${colour}`}>{value}</span>
    </div>
  );
}

function Minutes({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-display)] font-bold text-[1.6rem] text-[var(--maroon)] tnum">
        {value.toFixed(1)}
        <span className="text-[0.55em] text-[var(--ink-muted)]"> min</span>
      </div>
      <div className="text-[0.72rem] tracking-[0.06em] uppercase text-[var(--ink-muted)]">
        {label}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── full marks ─── */

function FullMarks({ report }: { report: FirstPhaseReport }) {
  const { classes, headline, fullMarkStudents } = report;

  return (
    <section>
      <SectionLabel>Section three</SectionLabel>
      <h2 className={HEADING}>Full marks</h2>
      <p className={`${LEDE} m-0 mb-5`}>
        {num(headline.fullMarks)} students answered all fifty questions correctly. Marks are taken
        directly from the assessed paper and published as they stand.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[clamp(12px,1.6vw,18px)] mb-[clamp(22px,3vw,32px)]">
        {classes.map((c) => (
          <div
            key={c.cls}
            className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] border-t-[3px] border-t-[var(--gold)] rounded-[10px] p-[18px]"
          >
            <div className="text-[0.72rem] tracking-[0.1em] uppercase text-[var(--ink-muted)] font-semibold">
              Class {c.cls} · top score
            </div>
            <div className="font-[family-name:var(--font-display)] font-bold text-[2.1rem] text-[var(--maroon)] leading-[1.1] mt-1 tnum">
              {num(c.highest)}
              <span className="text-[0.45em] text-[var(--ink-muted)]"> / {TOTAL}</span>
            </div>
            <div className="mt-2 text-[0.86rem] text-[var(--ink-muted)] leading-[1.6]">
              reached by <strong className="text-[var(--ink)]">{num(c.fullMarks)} students</strong>{" "}
              of {num(c.sat)}
            </div>
          </div>
        ))}
      </div>

      <p className="m-0 mb-5 max-w-[68ch] text-[0.9rem] leading-[1.7] text-[var(--ink-muted)]">
        Every class has a top score of {TOTAL}, so there is no single topper in any class — there is
        a group of them. The list below is a list of equals, not a ranking: it is grouped by class
        and set alphabetically within each, and carries no internal order.
      </p>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full min-w-[560px] text-[0.92rem] border-collapse">
          <thead>
            <tr>
              <th className={`${TH} text-left w-14`}>#</th>
              <th className={`${TH} text-left`}>Student</th>
              <th className={`${TH} text-left w-24`}>Class</th>
              <th className={`${TH} text-left`}>School</th>
              <th className={`${TH} text-right w-24`}>Score</th>
            </tr>
          </thead>
          <tbody>
            {fullMarkStudents.map((s, i) => (
              <tr key={`${s.name}-${s.cls}-${i}`} className={i % 2 === 1 ? "bg-[rgba(242,233,218,0.4)]" : ""}>
                <td className={`${TD} text-[var(--gold)]`}>
                  <Star />
                </td>
                <td className={`${TD} font-semibold text-[var(--ink)]`}>{s.name}</td>
                <td className={`${TD} text-[var(--ink-muted)]`}>Class {s.cls}</td>
                <td className={`${TD} text-[var(--ink-muted)]`}>{s.school}</td>
                <td className={`${TD} text-right font-bold text-[var(--maroon)] tnum`}>
                  {TOTAL} / {TOTAL}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="scroll-hint hidden text-[0.76rem] tracking-[0.06em] uppercase text-[var(--ink-muted)] mt-2">
        Scroll the table sideways →
      </div>
      <p className={`${NOTE} mt-3.5 max-w-[74ch]`}>
        Every student here scored the same {TOTAL} out of {TOTAL}. Names, classes and schools are as
        recorded on the exam register. Each of them can also see their own marked answer sheet on
        their personal result page.
      </p>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────── schools ─── */

function Schools({ report }: { report: FirstPhaseReport }) {
  const { schools, headline } = report;

  return (
    <section>
      <SectionLabel>Section four</SectionLabel>
      <h2 className={HEADING}>Schools we want to thank</h2>
      <p className={`${LEDE} m-0 mb-[22px] max-w-[68ch]`}>
        The {WORDS[schools.length] ?? schools.length} schools whose students averaged highest in the
        first phase. The figure
        is the average of the students <em>from that school who sat the online paper</em> — so a
        school with {num(Math.min(...schools.map((s) => s.sat)))} students and one with{" "}
        {num(Math.max(...schools.map((s) => s.sat)))} are measured the same way. Only schools with at
        least 25 students sitting are listed, because small groups swing wildly. This is not a league
        table, and there is no bottom of it.
      </p>

      <div className={`${CARD} p-[clamp(18px,3vw,32px)] mb-[clamp(14px,2vw,22px)]`}>
        <div className="font-[family-name:var(--font-display)] font-bold text-[1.25rem] text-[var(--ink)]">
          School averages against the whole cohort
        </div>
        <p className="mt-1.5 mb-5 text-[0.88rem] leading-[1.7] text-[var(--ink-muted)] max-w-[68ch]">
          Each bar runs 0 to {TOTAL}. The dotted line is the overall average of{" "}
          {marks(headline.average)}.
        </p>
        <div className="grid gap-[11px]">
          {schools.map((s) => (
            <div key={s.school} className="grid grid-cols-[minmax(0,1fr)] gap-1">
              <div className="flex justify-between gap-3 text-[0.83rem] leading-[1.4]">
                <span>{s.school}</span>
                <span className="font-bold text-[var(--maroon)] tnum whitespace-nowrap">
                  {marks(s.average)}
                </span>
              </div>
              <span className="block h-[15px] bg-[var(--cream-muted)] rounded-full relative">
                <span
                  className="absolute inset-y-0 left-0 bg-[var(--maroon)] rounded-full"
                  style={{ width: ofTotal(s.average) }}
                />
                <span
                  className="absolute -top-1 -bottom-1 border-l-2 border-dotted border-[var(--ink)]"
                  style={{ left: ofTotal(headline.average) }}
                />
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-3 border-t border-[var(--cream-muted)] text-[0.8rem] text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-[7px]">
            <span className="w-4 h-2 bg-[var(--maroon)] rounded-full inline-block" />
            School average
          </span>
          <span className="inline-flex items-center gap-[7px]">
            <span className="w-4 border-t-2 border-dotted border-[var(--ink)] inline-block" />
            Cohort average, {marks(headline.average)}
          </span>
          <span>Scale: 0 to {TOTAL} marks</span>
        </div>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full min-w-[620px] text-[0.93rem] border-collapse">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>School</th>
              <th className={`${TH} text-right w-[120px]`}>Students sat</th>
              <th className={`${TH} text-right w-40`}>Average of {TOTAL}</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s, i) => (
              <tr key={s.school} className={i % 2 === 1 ? "bg-[rgba(242,233,218,0.4)]" : ""}>
                <td className={TD}>
                  <Star className="text-[var(--gold)] mr-2" />
                  {s.school}
                </td>
                <td className={`${TD} text-right text-[var(--ink-muted)] tnum`}>{num(s.sat)}</td>
                <td className={`${TD} text-right font-bold text-[var(--maroon)] tnum`}>
                  {marks(s.average)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="scroll-hint hidden text-[0.76rem] tracking-[0.06em] uppercase text-[var(--ink-muted)] mt-2">
        Scroll the table sideways →
      </div>
      <p className={`${NOTE} mt-3.5`}>
        {num(headline.schools)} schools took part in all. Every one of them sent students into a
        paper they had never seen before.
      </p>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────── centres ─── */

/* The scatter's two scales, fixed so the plot is honest: 80% turnout sits at
   x=140 and every percentage point is 40px; 20 marks sits at y=256 and every
   mark is 16.8px up. Both are clamped to the plotting area rather than allowed
   to run off the axes. */
const scatterX = (turnout: number) => Math.min(575, Math.max(65, 140 + (turnout - 80) * 40));
const scatterY = (average: number) => Math.min(285, Math.max(25, 256 - (average - 20) * 16.8));

function Centres({
  report,
  overallTurnout,
}: {
  report: FirstPhaseReport;
  overallTurnout: number;
}) {
  const { centres, headline } = report;

  // Only the four extremes are labelled: the highest and lowest averages, and
  // the two fullest halls. Eight labels on a 600-unit canvas collide.
  const byAverage = [...centres].sort((a, b) => a.average - b.average);
  const labelled = new Set(
    [
      byAverage[0]?.centre,
      byAverage[byAverage.length - 1]?.centre,
      centres[0]?.centre,
      centres[1]?.centre,
    ].filter(Boolean),
  );
  const best = byAverage[byAverage.length - 1];
  // Sorted by turnout, so the last row is the emptiest hall of the eight.
  const bestIsEmptiest = best?.centre === centres[centres.length - 1]?.centre;

  return (
    <section>
      <SectionLabel>Section five</SectionLabel>
      <h2 className={HEADING}>Centres and turnout</h2>
      <p className={`${LEDE} m-0 mb-6 max-w-[68ch]`}>
        {num(headline.centres)} centres opened on 19 July. Turnout is the share of registered
        students at a centre who actually sat the online paper.
      </p>

      <div
        className={`${CARD} grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[clamp(16px,2.4vw,28px)] items-center p-[clamp(20px,3vw,28px)] mb-6`}
      >
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-[family-name:var(--font-display)] font-bold text-[clamp(2.4rem,6vw,3.4rem)] text-[var(--maroon)] leading-none tnum">
              {pct(overallTurnout)}
            </span>
            <span className="text-[0.9rem] text-[var(--ink-muted)]">overall turnout</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden mt-4 bg-[var(--cream-muted)]">
            <div className="bg-[var(--maroon)]" style={{ width: `${overallTurnout}%` }} />
            <div className="bg-[var(--maroon-tint)]" style={{ width: `${100 - overallTurnout}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[0.8rem] text-[var(--ink-muted)] tnum">
            <span>
              <strong className="text-[var(--maroon)]">{num(headline.sat)}</strong> sat
            </span>
            <span>
              <strong className="text-[var(--ink)]">{num(headline.absent)}</strong> did not sit
            </span>
          </div>
        </div>
        <p className="m-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">
          {num(headline.absent)} registered students did not sit the online paper. We publish that
          number because it matters: it is a phone shared between siblings, a network that dropped,
          a family who moved, an exam morning that went wrong. Understanding it is part of the work
          of the next phase.
        </p>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full min-w-[660px] text-[0.93rem] border-collapse">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>Exam centre</th>
              <th className={`${TH} text-right w-[108px]`}>Registered</th>
              <th className={`${TH} text-right w-20`}>Sat</th>
              <th className={`${TH} text-right w-[104px]`}>Turnout</th>
              <th className={`${TH} text-right w-[118px]`}>Average of {TOTAL}</th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c, i) => (
              <tr key={c.centre} className={i % 2 === 1 ? "bg-[rgba(242,233,218,0.4)]" : ""}>
                <td className={TD}>{c.centre}</td>
                <td className={`${TD} text-right text-[var(--ink-muted)] tnum`}>
                  {num(c.registered)}
                </td>
                <td className={`${TD} text-right tnum`}>{num(c.sat)}</td>
                <td className={`${TD} text-right font-bold text-[var(--maroon)] tnum`}>
                  {pct(c.turnout)}
                </td>
                <td className={`${TD} text-right text-[var(--ink-muted)] tnum`}>
                  {marks(c.average)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="scroll-hint hidden text-[0.76rem] tracking-[0.06em] uppercase text-[var(--ink-muted)] mt-2">
        Scroll the table sideways →
      </div>
      <p className={`${NOTE} mt-3.5 max-w-[74ch]`}>
        The {WORDS[centres.length] ?? centres.length} centres with the highest turnout, of{" "}
        {num(headline.centres)}. Averages
        differ between centres partly because centres draw on different schools and different mixes
        of classes.
      </p>

      <div className={`${CARD} p-[clamp(18px,3vw,32px)] mt-[clamp(16px,2.4vw,26px)]`}>
        <div className="font-[family-name:var(--font-display)] font-bold text-[1.25rem] text-[var(--ink)]">
          Turnout does not predict marks
        </div>
        <p className="mt-1.5 mb-[18px] text-[0.88rem] leading-[1.7] text-[var(--ink-muted)] max-w-[68ch]">
          Each dot is one of these {WORDS[centres.length] ?? centres.length} centres: turnout across
          the bottom, average score up the side. If a full hall meant higher marks the dots would
          climb to the right. They do not.
        </p>
        <div className="scroll-hint hidden text-[0.76rem] tracking-[0.06em] uppercase text-[var(--ink-muted)] mb-2">
          Scroll sideways to see the whole chart →
        </div>
        {/* The chart is capped rather than run full-bleed: stretched across a
            1900px screen the viewBox scales its 11px axis labels up with it,
            until the axis type is larger than the headings around it. */}
        <div className="overflow-x-auto">
          <svg
            viewBox="0 0 600 340"
            role="img"
            aria-label="Scatter plot of centre turnout against average score"
            className="w-full max-w-[1100px] min-w-[430px] h-auto block"
          >
            <line x1="60" y1="256" x2="580" y2="256" stroke="#F2E9DA" strokeWidth="1" />
            <line x1="60" y1="172" x2="580" y2="172" stroke="#F2E9DA" strokeWidth="1" />
            <line x1="60" y1="88" x2="580" y2="88" stroke="#F2E9DA" strokeWidth="1" />
            <line
              x1="60"
              y1={scatterY(headline.average)}
              x2="580"
              y2={scatterY(headline.average)}
              stroke="#7B1E2B"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              opacity="0.55"
            />
            <text
              x="576"
              y={scatterY(headline.average) - 6}
              textAnchor="end"
              fontSize="11"
              fill="#7B1E2B"
            >
              Cohort average {marks(headline.average)}
            </text>

            <line x1="60" y1="20" x2="60" y2="290" stroke="#6B5B5D" strokeWidth="1" />
            <line x1="60" y1="290" x2="580" y2="290" stroke="#6B5B5D" strokeWidth="1" />
            {[20, 25, 30].map((mark) => (
              <text
                key={mark}
                x="50"
                y={scatterY(mark) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6B5B5D"
              >
                {mark}
              </text>
            ))}
            {[80, 82, 84, 86, 88, 90].map((share) => (
              <text
                key={share}
                x={scatterX(share)}
                y="308"
                textAnchor="middle"
                fontSize="11"
                fill="#6B5B5D"
              >
                {share}%
              </text>
            ))}
            <text x="320" y="332" textAnchor="middle" fontSize="11" fill="#6B5B5D" letterSpacing="0.06em">
              TURNOUT
            </text>
            <text
              x="18"
              y="155"
              textAnchor="middle"
              fontSize="11"
              fill="#6B5B5D"
              letterSpacing="0.06em"
              transform="rotate(-90 18 155)"
            >
              AVERAGE OF {TOTAL}
            </text>

            {centres.map((c) => {
              const x = scatterX(c.turnout);
              const y = scatterY(c.average);
              const isBest = c.centre === best?.centre;
              const right = x > 420;
              // The centre name only, without the "High School (H.S.)" tail —
              // a full name is four times the width of the plot.
              const short = c.centre.split(/\s+(?:High|Islamic)\b/)[0];
              return (
                <g key={c.centre}>
                  <circle cx={x} cy={y} r="7" fill={isBest ? "#C9A24B" : "#7B1E2B"} />
                  {labelled.has(c.centre) && (
                    <text
                      x={right ? x - 10 : x + 12}
                      y={y + 4}
                      textAnchor={right ? "end" : "start"}
                      fontSize="11.5"
                      fill="#2B1A1C"
                    >
                      {short} · {marks(c.average)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <p className={`${NOTE} mt-3.5 pt-3 border-t border-[var(--cream-muted)]`}>
          The two fullest centres sat at opposite ends of the score range, and the highest-scoring
          centre of the {WORDS[centres.length] ?? centres.length} — {best?.centre}, at{" "}
          {marks(best?.average ?? 0)} —
          {bestIsEmptiest ? " had the lowest turnout of them" : " is nowhere near the fullest"}.
          Turnout and attainment are two separate problems, and each needs its own answer.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────── difficulty ─── */

function Difficulty({
  hardest,
  easiest,
}: {
  hardest: FirstPhaseReport["hardest"];
  easiest: FirstPhaseReport["easiest"];
}) {
  return (
    <section>
      <SectionLabel>Section six</SectionLabel>
      <h2 className={HEADING}>The hardest and easiest questions</h2>
      <p className={`${LEDE} m-0 mb-6 max-w-[68ch]`}>
        For every question we know the share of students in that class who answered it correctly.
        Across all four papers that share ran from about {Math.round(hardest.correctPct)}% to{" "}
        {Math.round(easiest.correctPct)}%.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(16px,2.4vw,26px)]">
        <div className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] border-t-[3px] border-t-[var(--maroon)] rounded-[10px] p-[clamp(20px,3vw,28px)]">
          <div className="text-[0.72rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold">
            Hardest question
          </div>
          <div className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] text-[var(--ink)] mt-2 mb-4">
            Class {hardest.cls} · Question {hardest.n}
          </div>
          <div className="h-3.5 bg-[var(--cream-muted)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--maroon)]" style={{ width: `${hardest.correctPct}%` }} />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-[family-name:var(--font-display)] font-bold text-[2rem] text-[var(--maroon)] tnum">
              {pct(hardest.correctPct)}
            </span>
            <span className="text-[0.88rem] text-[var(--ink-muted)]">
              of Class {hardest.cls} answered it correctly
            </span>
          </div>
          <p className="mt-3.5 text-[0.88rem] leading-[1.7] text-[var(--ink-muted)]">
            Fewer than one student in {WORDS[Math.round(100 / hardest.correctPct)] ?? "ten"}. A
            question this hard tells the paper-setters as much as it tells the students.
          </p>
        </div>

        <div className="bg-[var(--cream-surface)] border border-[var(--cream-muted)] border-t-[3px] border-t-[var(--teal)] rounded-[10px] p-[clamp(20px,3vw,28px)]">
          <div className="text-[0.72rem] tracking-[0.1em] uppercase text-[var(--teal-ink)] font-bold">
            Easiest question
          </div>
          <div className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] text-[var(--ink)] mt-2 mb-4">
            Class {easiest.cls} · Question {easiest.n}
          </div>
          <div className="h-3.5 bg-[var(--cream-muted)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--teal)]" style={{ width: `${easiest.correctPct}%` }} />
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-[family-name:var(--font-display)] font-bold text-[2rem] text-[var(--teal-ink)] tnum">
              {pct(easiest.correctPct)}
            </span>
            <span className="text-[0.88rem] text-[var(--ink-muted)]">
              of Class {easiest.cls} answered it correctly
            </span>
          </div>
          <p className="mt-3.5 text-[0.88rem] leading-[1.7] text-[var(--ink-muted)]">
            About {WORDS[Math.round(easiest.correctPct / 10)] ?? "nine"} students in ten. Almost the
            whole year group had this one.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── what comes next ─── */

function WhatNext() {
  const items = [
    {
      title: "The written paper",
      text: "The 100-question OMR paper sat at the centres on the same morning is still being marked by hand. It carries the subject papers — English, Mathematics, Physical Science and Life Science. No publication date has been set.",
    },
    {
      title: "Merit and scholarships",
      text: "Final merit under Project UDAAN is decided once both papers are marked. Nothing on this page is a final award.",
    },
    {
      title: "Felicitation",
      text: "Students, schools and centres will be honoured at the UDAAN felicitation ceremony. Dates will be announced to schools directly and published here.",
    },
  ];

  return (
    <section>
      <SectionLabel>What comes next</SectionLabel>
      <h2 className={`${HEADING} mb-5`}>The exam is not over</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(16px,2.4vw,26px)]">
        {items.map((item) => (
          <div key={item.title} className="flex gap-3.5 items-start">
            <Star className="text-[var(--gold)] text-[1.1rem] leading-[1.5]" />
            <div>
              <div className="font-[family-name:var(--font-display)] font-bold text-[1.2rem] text-[var(--ink)] mb-1.5">
                {item.title}
              </div>
              <p className="m-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnResult() {
  return (
    <div className="bg-[linear-gradient(160deg,var(--maroon)_0%,var(--maroon-deep)_100%)] text-[var(--cream)] rounded-xl p-[clamp(26px,4vw,44px)] mt-[clamp(44px,6vw,72px)] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(20px,3vw,40px)] items-center">
      <div>
        <div className="font-[family-name:var(--font-display)] font-bold text-[clamp(1.5rem,3vw,2rem)] leading-[1.2] text-[var(--gold-light)]">
          Looking for your own result?
        </div>
        <p className="mt-2.5 text-[0.98rem] leading-[1.7] text-[var(--on-dark)] max-w-[46ch]">
          Students see their own marks, class rank and answer sheet on their personal result page.
          Open it by scanning the QR code on your admit card.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/set"
          className="inline-flex items-center gap-2 bg-[var(--gold)] text-[var(--maroon)] font-bold text-[0.98rem] px-[26px] py-[13px] rounded-md no-underline"
        >
          Check your result
        </Link>
        <Link
          href="/udaan"
          className="inline-flex items-center gap-2 bg-transparent text-[var(--cream)] border-[1.5px] border-[rgba(253,251,247,0.5)] font-semibold text-[0.98rem] px-[26px] py-[13px] rounded-md no-underline"
        >
          About Project UDAAN
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── the gate ─── */

/**
 * Before the results open — and if the database is unreachable.
 *
 * The same gate the student portal uses, for the same reason: a page that cannot
 * reach the results tables must say "not yet", never show an error or, worse,
 * an empty report full of zeroes.
 */
function NotPublishedYet() {
  return (
    <div className="report min-h-screen">
      <div className="sky text-[var(--cream)] w-full px-4 md:px-8 pt-[calc(80px+clamp(56px,9vw,96px))] pb-[clamp(56px,9vw,96px)]">
        <div className="flex flex-col gap-5">
          <span className="inline-flex items-center gap-1.5 bg-[var(--gold)] text-[var(--maroon)] text-[0.72rem] font-bold tracking-[0.08em] uppercase px-3 py-[5px] rounded-full self-start">
            <Star /> Project UDAAN
          </span>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[clamp(2rem,5vw,3.2rem)] leading-[1.12] m-0 max-w-[20ch]">
            SET 2026–27 results are not published yet
          </h1>
          <p className="m-0 max-w-[60ch] text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.6] text-[#e8f3f0]">
            The first-phase report will appear on this page as soon as the results are declared.
            Students will find their own marks on their personal result page, opened by scanning the
            QR code on their admit card.
          </p>
          <Link
            href="/set"
            className="inline-flex items-center gap-2 bg-[var(--gold)] text-[var(--maroon)] font-bold text-[0.98rem] px-[26px] py-[13px] rounded-md no-underline self-start"
          >
            About the Students Evaluation Test
          </Link>
        </div>
      </div>
    </div>
  );
}

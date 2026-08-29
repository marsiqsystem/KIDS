import type { Metadata } from "next";
import Link from "next/link";
import { examReport } from "@/lib/exam/report";
import type {
  Band,
  ClassRow,
  ExamReport,
  SectionRow,
  StreamGroup,
  Threshold,
  WrittenReport,
} from "@/lib/exam/report";
import { publicationState } from "@/lib/exam/results";
import { offlinePublicationState } from "@/lib/exam/offline-results";
import PaperView from "./PaperView";
import "./results.css";

/**
 * The public report on SET 2026–27.
 *
 * This is not the student's result page — that is /portal, reached by scanning
 * the admit card, and it is the only place a child's own marks appear. This page
 * is for head teachers, parents, partners and press: what happened on 19 July,
 * as a whole, honestly.
 *
 * Four rules the page is built around, and they are the reason several obvious
 * panels are missing:
 *
 *   1. TWO PAPERS, NEVER ADDED. A 50-question online paper and a 100-question
 *      written paper, sat the same morning, marked and published separately,
 *      with different rosters. No figure here sums them. Where they stand side
 *      by side it is as percentages of their own totals, and the page says so.
 *   2. NOBODY IS NAMED. Not the sixty-four who scored 50 out of 50, not the one
 *      student who answered all hundred written questions correctly. Every one
 *      of them sees their own result on their own page. These are minors and
 *      this is a public page.
 *   3. NOTHING THAT SHAMES. Best schools and fullest centres are celebrated;
 *      there is no bottom table and no failing-school list. A *subject* may be
 *      named as weak — that is a curriculum finding and it is the most useful
 *      thing on the page. A school never is.
 *   4. CLASSES ARE NOT RANKED AGAINST EACH OTHER. IX, X, XI and XII sat
 *      different papers. The one exception is the seven sections of the Class IX
 *      and X paper, which both years sat in full, so those genuinely compare.
 *
 * The written half appears only once the written paper is published. Until then
 * this page reports the online paper alone and says so, exactly as it did
 * between 1 and 27 August 2026.
 *
 * Regenerated hourly rather than per visit: the tables behind it are a frozen
 * published snapshot, so there is nothing to be fresh about.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "SET 2026–27 Results — KIDS",
  description:
    "The full results of the Students Evaluation Test 2026–27: a 50-question online paper and a 100-question written paper, sat by students from 112 schools at 21 centres across West Bengal, reported in full.",
};

const TOTAL = 50;
const WRITTEN_TOTAL = 100;
const num = (v: number) => v.toLocaleString("en-IN");
const marks = (v: number) => v.toFixed(2);
const pct = (v: number) => `${v.toFixed(1)}%`;
/** A mark out of 50, as a share of the bar it sits on. */
const ofTotal = (v: number) => `${(v / TOTAL) * 100}%`;
/** A mark out of 100 is already its own percentage. */
const ofWritten = (v: number) => `${v}%`;

const CARD =
  "bg-[var(--cream-surface)] border border-[var(--cream-muted)] rounded-[10px] shadow-[var(--shadow-sm)]";
const TH =
  "p-[12px_18px] bg-[var(--cream-muted)] text-[var(--maroon)] text-[0.68rem] tracking-[0.08em] uppercase font-semibold";
const TD = "px-[18px] py-[13px] border-t border-[var(--cream-muted)] leading-[1.5]";
const HEADING =
  "font-[family-name:var(--font-display)] font-bold text-[clamp(1.7rem,3.4vw,2.44rem)] leading-[1.2] mt-2 mb-3 text-[var(--ink)]";
const LEDE =
  "max-w-[68ch] text-[clamp(0.95rem,1.4vw,1.05rem)] leading-[1.7] text-[var(--ink-muted)]";
const CARD_TITLE =
  "font-[family-name:var(--font-display)] font-bold text-[1.3rem] text-[var(--ink)]";

function Rule() {
  return (
    <div className="h-[2px] bg-[var(--gold)] mt-[clamp(48px,7vw,80px)] mb-[clamp(36px,5vw,56px)]" />
  );
}

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

/**
 * A section, with the gold rule that separates it from the one above.
 *
 * The rule belongs to the section rather than sitting between two of them so
 * that a section hidden by the reading-mode switch takes its rule with it.
 * Without that, turning off the written paper leaves two gold rules touching.
 */
function Section({
  paper,
  label,
  children,
}: {
  /** Which reading modes this section appears in. Omit for "always". */
  paper?: "online" | "written" | "both";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div data-paper={paper}>
      <Rule />
      <section>
        <SectionLabel>{label}</SectionLabel>
        {children}
      </section>
    </div>
  );
}

/** A labelled bar on a 0–50, 0–100 or 0–100% track. */
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
      <span className="block bg-[var(--cream-muted)] rounded-full relative" style={{ height }}>
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width, background: colour }}
        />
        {tick && (
          <span
            className="absolute -top-1 -bottom-1 w-0"
            style={{
              left: tick.at,
              borderLeft: `2px ${tick.dotted ? "dotted" : "solid"} var(--ink)`,
            }}
          />
        )}
      </span>
      <span className="text-right text-[0.82rem] text-[var(--ink-muted)] tnum">{value}</span>
    </div>
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

/* ─────────────────────────────────────────────────────────────── page ─── */

export default async function ResultsPage() {
  const [{ published }, { published: writtenOpen }] = await Promise.all([
    publicationState(),
    offlinePublicationState(),
  ]);
  if (!published) return <NotPublishedYet />;

  const report = await examReport(writtenOpen);
  const { headline, classes, bands, thresholds, hardest, easiest, written, both } = report;

  const overallTurnout = (headline.sat / headline.enrolled) * 100;

  const body = (
    <div className="w-full px-4 md:px-8 pt-[clamp(40px,6vw,68px)] pb-[clamp(60px,8vw,96px)]">
      <Figures report={report} turnout={overallTurnout} />
      {both && <Compared both={both} />}
      <Distribution bands={bands} thresholds={thresholds} ranked={headline.ranked} written={written} />
      <Classes classes={classes} written={written} />
      {written && <Subjects written={written} />}
      {written && <Zones written={written} />}
      <Perfect classes={classes} headline={headline} written={written} />
      <Schools report={report} />
      <Centres report={report} turnout={overallTurnout} written={written} />
      <Difficulty hardest={hardest} easiest={easiest} written={written} />
      <WhatNext written={written} />
      <OwnResult written={written} />
      <Footnote written={written} />
    </div>
  );

  return (
    <div className="report min-h-screen">
      <Hero report={report} />
      {written ? <PaperView>{body}</PaperView> : <div data-view="online">{body}</div>}
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
function Hero({ report }: { report: ExamReport }) {
  const { headline, written } = report;

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
            <Star /> {written ? "Complete result · both papers" : "First phase · online paper"}
          </span>
          <span className="text-[0.78rem] tracking-[0.08em] uppercase opacity-85">
            Project UDAAN
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-[clamp(2.1rem,5.2vw,3.6rem)] leading-[1.12] m-0 max-w-[22ch] text-[var(--cream)]">
          {written ? "SET 2026–27 · One exam, two papers" : "SET 2026–27 · First Phase Results"}
        </h1>

        {written ? (
          <p className="m-0 max-w-[62ch] text-[clamp(1rem,1.6vw,1.2rem)] leading-[1.6] text-[#e8f3f0]">
            On Sunday, 19 July 2026, students from {num(headline.schools)} schools sat the Students
            Evaluation Test at {num(headline.centres)} centres across West Bengal. They sat two
            papers that morning: a 50-question online paper and a 100-question written paper by
            subject. Both are now marked. This page reports both.
          </p>
        ) : (
          <p className="m-0 max-w-[60ch] text-[clamp(1rem,1.6vw,1.2rem)] leading-[1.6] text-[#e8f3f0]">
            On Sunday, 19 July 2026, {num(headline.sat)} students from {num(headline.schools)}{" "}
            schools sat the online paper of the Students Evaluation Test at {num(headline.centres)}{" "}
            centres across West Bengal. This page reports what happened, in full.
          </p>
        )}

        {written ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3 max-w-[720px] mt-1">
            <PaperNote
              tone="var(--maroon-tint)"
              name="Online paper"
              detail="50 questions · 30 minutes · one mixed paper per class"
            />
            <PaperNote
              tone="#a0beeb"
              name="Written paper"
              detail="100 questions · marked from the OMR sheet · by subject"
            />
          </div>
        ) : (
          <div className="flex gap-3.5 items-start max-w-[62ch] bg-[rgba(12,42,46,0.42)] border border-[rgba(201,162,75,0.55)] rounded-[10px] px-[18px] py-3.5">
            <Star className="text-[var(--gold)] text-base leading-[1.5]" />
            <p className="m-0 text-[0.92rem] leading-[1.6] text-[var(--on-dark)]">
              These figures cover the{" "}
              <strong className="text-[var(--gold-light)]">online paper only</strong> — 50 questions
              in 30 minutes. The 100-question written paper sat on the same day is still being
              marked by hand. Its results will be published separately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PaperNote({ tone, name, detail }: { tone: string; name: string; detail: string }) {
  return (
    <div
      className="bg-[rgba(12,42,46,0.42)] border border-[rgba(232,201,204,0.4)] rounded-lg px-4 py-3.5"
      style={{ borderLeft: `4px solid ${tone}` }}
    >
      <div
        className="text-[0.7rem] tracking-[0.1em] uppercase font-bold"
        style={{ color: tone }}
      >
        {name}
      </div>
      <div className="mt-1 text-[0.9rem] leading-[1.6] text-[var(--on-dark)]">{detail}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── the figures ─── */

/**
 * The two papers as two cards, each against its own total and its own roster.
 *
 * The rosters differ — eighteen candidates were admitted after the online exam
 * had already been sat — and a turnout figure that quietly mixed them would be
 * wrong for both papers. Each card measures itself against its own.
 */
function Figures({ report, turnout }: { report: ExamReport; turnout: number }) {
  const { headline, written } = report;
  const onlineShare = (headline.average / TOTAL) * 100;

  return (
    <section>
      <SectionLabel>The exam in figures</SectionLabel>
      <h2 className={HEADING}>
        <span data-paper="both">Both papers, side by side</span>
        <span data-only="online">The online paper in figures</span>
        <span data-only="written">The written paper in figures</span>
      </h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        <span data-paper="both">
          The two papers are different lengths and different difficulties, so they are never added
          together into a single mark. Each is reported against its own total and its own roster.
        </span>
        <span data-only="online">
          Reported against its own total and its own roster. The 100-question written paper sat the
          same morning is reported separately, and the two are never added together.
        </span>
        <span data-only="written">
          Reported against its own total and its own roster. The 50-question online paper sat the
          same morning is reported separately, and the two are never added together.
        </span>
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[clamp(14px,2vw,24px)]">
        <div
          data-paper="online"
          className={`${CARD} shadow-[var(--shadow-md)] border-t-[3px] border-t-[var(--maroon)] p-[clamp(20px,3vw,30px)] h-full box-border`}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold">
              Online paper
            </span>
            <span className="text-[0.74rem] text-[var(--ink-muted)]">50 questions · 30 minutes</span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-[family-name:var(--font-display)] font-bold text-[clamp(2.6rem,6vw,3.4rem)] leading-none text-[var(--maroon)] tnum">
              {marks(headline.average)}
            </span>
            <span className="text-[0.95rem] text-[var(--ink-muted)]">average of 50</span>
          </div>
          <div className="h-3 bg-[var(--cream-muted)] rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-[var(--maroon)]" style={{ width: `${onlineShare}%` }} />
          </div>
          <div className="mt-1.5 text-[0.78rem] text-[var(--ink-muted)]">
            {pct(onlineShare)} of the paper answered correctly
          </div>
          <div className="grid gap-2 mt-5 text-[0.9rem]">
            <Line
              label="Sat the paper"
              value={`${num(headline.sat)} of ${num(headline.enrolled)} · ${pct(turnout)}`}
            />
            <Line
              label="Scored full marks"
              value={`${num(headline.fullMarks)} students`}
              colour="var(--maroon)"
            />
            <Line label="Marking" value="Machine, instant" />
          </div>
        </div>

        {written && (
          <div
            data-paper="written"
            className={`${CARD} shadow-[var(--shadow-md)] border-t-[3px] border-t-[var(--royal-blue)] p-[clamp(20px,3vw,30px)] h-full box-border`}
          >
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--royal-blue)] font-bold">
                Written paper
              </span>
              <span className="text-[0.74rem] text-[var(--ink-muted)]">
                100 questions · by subject
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-[family-name:var(--font-display)] font-bold text-[clamp(2.6rem,6vw,3.4rem)] leading-none text-[var(--royal-blue)] tnum">
                {marks(written.headline.average)}
              </span>
              <span className="text-[0.95rem] text-[var(--ink-muted)]">average of 100</span>
            </div>
            <div className="h-3 bg-[var(--cream-muted)] rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-[var(--royal-blue)]"
                style={{ width: ofWritten(written.headline.average) }}
              />
            </div>
            <div className="mt-1.5 text-[0.78rem] text-[var(--ink-muted)]">
              Marks run the whole way from 0 to 100 · median {num(written.headline.median)}
            </div>
            <div className="grid gap-2 mt-5 text-[0.9rem]">
              <Line
                label="Sat the paper"
                value={`${num(written.headline.sat)} of ${num(written.headline.enrolled)} · ${pct(
                  written.headline.turnout,
                )}`}
              />
              <Line
                label="Highest mark"
                value={`${num(written.headline.highest)} · ${
                  written.headline.perfect === 1
                    ? "one student"
                    : `${num(written.headline.perfect)} students`
                }`}
                colour="var(--royal-blue)"
              />
              <Line label="Marking" value="Assessed OMR" />
            </div>
          </div>
        )}
      </div>

      {written && (
        <p className="mt-4 mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)] max-w-[78ch]">
          <span data-paper="both">Each paper&rsquo;s turnout is measured against its own roster.</span>
          <span data-only="online">Turnout is measured against this paper&rsquo;s own roster.</span>
          <span data-only="written">Turnout is measured against this paper&rsquo;s own roster.</span>{" "}
          The written roster is {num(written.headline.enrolled - report.headline.enrolled)} students
          larger than the online one, because a few candidates were admitted after the online exam
          had already been sat.
        </p>
      )}
    </section>
  );
}

function Line({ label, value, colour = "" }: { label: string; value: string; colour?: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-[var(--cream-muted)] pt-2">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="font-semibold tnum" style={colour ? { color: colour } : undefined}>
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────── the two papers compared ─── */

/**
 * The only place the two papers are held against each other, and only on the
 * students who sat both — which is the only cohort on which the comparison
 * means anything. Percentages of their own totals, never a sum.
 */
function Compared({ both }: { both: NonNullable<ExamReport["both"]> }) {
  const gap = both.onlinePct - both.writtenPct;

  return (
    <Section paper="both" label="The two papers compared">
      <h2 className={HEADING}>
        The same children, {gap.toFixed(0)} points apart
      </h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        {num(both.sat)} students sat both papers on the same morning. Putting both marks on a common
        scale of 100 is the only fair way to hold them side by side.
      </p>

      <div className={`${CARD} p-[clamp(20px,3.4vw,34px)]`}>
        <div className="grid gap-[22px]">
          <ComparedBar label="Online paper" value={both.onlinePct} colour="var(--maroon)" />
          <ComparedBar label="Written paper" value={both.writtenPct} colour="var(--royal-blue)" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(14px,2vw,24px)] mt-7 pt-6 border-t border-[var(--cream-muted)]">
          <div>
            <div className={CARD_TITLE}>The written paper is harder</div>
            <p className="mt-1.5 mb-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">
              It is twice as long, it runs on subject syllabus rather than general aptitude, and it
              asks students to hold a hundred questions in one sitting. {article(gap)} {gap.toFixed(0)}-point gap
              on the same children, on the same morning, is a property of the papers — not of the
              students.
            </p>
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-[family-name:var(--font-display)] font-bold text-[2.2rem] leading-none text-[var(--teal-ink)] tnum">
                {both.correlation.toFixed(2)}
              </span>
              <span className="text-[0.9rem] text-[var(--ink-muted)]">
                correlation between the two
              </span>
            </div>
            <p className="mt-2 mb-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">
              Real, but far from perfect. A child who did well on one paper did not reliably do well
              on the other. That is the clearest argument in the data for having set two papers
              rather than one: each finds something the other misses.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ComparedBar({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div>
      <div className="flex justify-between items-baseline gap-3 mb-2">
        <span className="text-[0.9rem] font-semibold text-[var(--ink)]">{label}</span>
        <span
          className="font-[family-name:var(--font-display)] font-bold text-[1.5rem] tnum"
          style={{ color: colour }}
        >
          {pct(value)}
        </span>
      </div>
      <div className="h-[26px] bg-[var(--cream-muted)] rounded-md overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: colour }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── distribution ─── */

function Distribution({
  bands,
  thresholds,
  ranked,
  written,
}: {
  bands: Band[];
  thresholds: Threshold[];
  ranked: number;
  written: WrittenReport | null;
}) {
  const tallest = Math.max(...bands.map((b) => b.students));
  const half = thresholds.filter((t) => t.share >= 50).at(-1);
  const broadMiddle = bands
    .filter((b) => b.from >= 15 && b.from <= 25)
    .reduce((sum, b) => sum + b.students, 0);
  const top = thresholds.find((t) => t.mark === 45);
  const foot = bands[0];

  return (
    <Section label="Distribution">
      <h2 className={HEADING}>
        <span data-paper="both">The shape of each paper</span>
        <span data-only="online">The shape of the paper</span>
        <span data-only="written">The shape of the paper</span>
      </h2>
      <p className={`${LEDE} m-0 mb-2`}>
        Read this as the shape of the cohort, not as a pass mark. There is no pass mark on
        either paper.
      </p>

      {/* ── the online histogram ────────────────────────────────────────── */}
      <div data-paper="online" className={`${CARD} dist p-[clamp(18px,3vw,32px)] mt-6`}>
        <div className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold mb-4">
          Online paper · {num(ranked)} ranked students, marks out of 50
        </div>
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
          Number of students in each band · {num(broadMiddle)} sit between 15 and 29
        </div>
      </div>

      {/* ── how many reached each online mark ───────────────────────────── */}
      <div data-paper="online" className={`${CARD} p-[clamp(18px,3vw,32px)] mt-[clamp(14px,2vw,22px)]`}>
        <div className={CARD_TITLE}>How many reached each mark</div>
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
                  <strong
                    className={t.mark === TOTAL ? "text-[var(--maroon)]" : "text-[var(--ink)]"}
                  >
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
          near enough, the middle student of the online paper.
        </div>
      </div>

      {/* ── the written paper ───────────────────────────────────────────── */}
      {written && <WrittenSpread written={written} />}

      <div
        data-paper="online"
        className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(14px,2vw,24px)] mt-[clamp(16px,2vw,24px)]"
      >
        <Aside title="A broad middle">
          {num(broadMiddle)} students — just over half — scored between 15 and 29 on the online
          paper. This is where most of the cohort sits.
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
    </Section>
  );
}

/**
 * The written paper's spread.
 *
 * Not a histogram: the written marks are reported to the office as a snapshot of
 * totals rather than banded counts, so a bar chart here would be a chart of
 * numbers we do not hold. The strip carries the two figures we do — the median
 * and the mean, and the distance between them — and the rows below count the
 * students above each landmark.
 */
function WrittenSpread({ written }: { written: WrittenReport }) {
  const { headline, thresholds } = written;
  const perfect = thresholds.find((t) => t.mark === 100);

  return (
    <div data-paper="written" className={`${CARD} p-[clamp(18px,3vw,32px)] mt-[clamp(14px,2vw,22px)]`}>
      <div className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--royal-blue)] font-bold">
        Written paper · {num(headline.sat)} students, marks out of 100
      </div>
      <p className="mt-2.5 mb-[22px] text-[0.9rem] leading-[1.7] text-[var(--ink-muted)] max-w-[66ch]">
        The written marks run the whole way from 0 to 100 — a far wider spread than the online
        paper, which is what a hundred subject questions will do. The middle student scored{" "}
        {num(headline.median)}.
      </p>

      <div
        className="relative h-[30px] rounded-md"
        style={{
          background:
            "linear-gradient(90deg, var(--cream-muted) 0%, var(--royal-blue-tint) 55%, var(--royal-blue) 100%)",
        }}
      >
        <div
          className="absolute -top-[7px] -bottom-[7px] w-0.5 bg-[var(--ink)]"
          style={{ left: ofWritten(headline.median) }}
        />
        <div
          className="absolute -top-[7px] -bottom-[7px] w-0 border-l-2 border-dotted border-[var(--maroon)]"
          style={{ left: ofWritten(headline.average) }}
        />
      </div>
      <div className="flex justify-between mt-2.5 text-[0.74rem] text-[var(--ink-muted)] tnum">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[0.8rem] text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-[7px]">
          <span className="w-0.5 h-3.5 bg-[var(--ink)] inline-block" />
          Median {num(headline.median)}
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <span className="w-0 h-3.5 border-l-2 border-dotted border-[var(--maroon)] inline-block" />
          Average {marks(headline.average)}
        </span>
      </div>

      <div className="grid gap-2.5 mt-6 pt-5 border-t border-[var(--cream-muted)]">
        {thresholds.map((t) => (
          <BarRow
            key={t.mark}
            label={t.mark === WRITTEN_TOTAL ? "All 100" : `${t.mark} or more`}
            width={t.share < 0.6 ? "6px" : `${t.share}%`}
            colour={t.mark >= 90 ? "var(--gold)" : "var(--royal-blue)"}
            value={
              t.mark === WRITTEN_TOTAL ? (
                <>
                  <strong className="text-[var(--maroon)]">{num(t.students)}</strong>{" "}
                  {t.students === 1 ? "student" : "students"}
                </>
              ) : (
                <>
                  <strong className="text-[var(--ink)]">{num(t.students)}</strong> · {pct(t.share)}
                </>
              )
            }
          />
        ))}
      </div>

      {perfect && perfect.students > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--cream-muted)] text-[0.82rem] leading-[1.7] text-[var(--ink-muted)]">
          {perfect.students === 1
            ? "One student answered all one hundred questions correctly — the only perfect written paper in the exam."
            : `${num(perfect.students)} students answered all one hundred questions correctly.`}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── class by class ─── */

function Classes({ classes, written }: { classes: ClassRow[]; written: WrittenReport | null }) {
  return (
    <Section label="Class by class">
      <h2 className={HEADING}>Four classes, four sets of papers</h2>

      <div className="flex gap-3.5 items-start bg-[var(--cream-surface)] border border-[var(--gold)] rounded-[10px] px-[18px] py-3.5 mb-6 max-w-[76ch]">
        <Star className="text-[var(--gold)] text-base leading-[1.5]" />
        <p className="m-0 text-[0.92rem] leading-[1.7] text-[var(--ink-muted)]">
          <strong className="text-[var(--ink)]">These four columns are not a ranking.</strong> Class
          IX, X, XI and XII each sat papers written for their own year, on their own syllabus. A
          mark on one class&rsquo;s paper is not the same as a mark on another&rsquo;s — so Class XII
          standing highest says nothing about Class X&rsquo;s students.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(14px,2vw,24px)]">
        {classes.map((c) => {
          const w = written?.classes.find((r) => r.cls === c.cls);
          return (
            <div key={c.cls} className={`${CARD} p-[clamp(18px,2.4vw,26px)] flex flex-col gap-5`}>
              <div className="font-[family-name:var(--font-display)] font-bold text-[1.45rem] text-[var(--maroon)]">
                Class {c.cls}
              </div>

              <div data-paper="online">
                <div className="text-[0.68rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold">
                  Online · of 50
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-[family-name:var(--font-display)] font-bold text-[2rem] leading-none text-[var(--ink)] tnum">
                    {marks(c.average)}
                  </span>
                  <span className="text-[0.8rem] text-[var(--ink-muted)] tnum">
                    median {num(c.median)}
                  </span>
                </div>
                <div className="h-2.5 bg-[var(--cream-muted)] rounded-full mt-2.5 overflow-hidden">
                  <div className="h-full bg-[var(--maroon)]" style={{ width: ofTotal(c.average) }} />
                </div>
                <div className="mt-2 text-[0.8rem] text-[var(--ink-muted)] tnum">
                  {num(c.sat)} sat · {num(c.fullMarks)} scored 50
                </div>
              </div>

              {w && (
                <div data-paper="written">
                  <div className="text-[0.68rem] tracking-[0.1em] uppercase text-[var(--royal-blue)] font-bold">
                    Written · of 100
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="font-[family-name:var(--font-display)] font-bold text-[2rem] leading-none text-[var(--ink)] tnum">
                      {marks(w.average)}
                    </span>
                    <span className="text-[0.8rem] text-[var(--ink-muted)] tnum">
                      median {num(w.median)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-[var(--cream-muted)] rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-[var(--royal-blue)]"
                      style={{ width: ofWritten(w.average) }}
                    />
                  </div>
                  <div className="mt-2 text-[0.8rem] text-[var(--ink-muted)] tnum">
                    {num(w.sat)} sat · highest {num(w.highest)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────── subjects, written paper ─── */

/**
 * What students found hard, rather than only how much.
 *
 * The online paper is one mixed paper per class and can never answer this
 * question; the written paper is sat by subject, so for the first time in SET
 * the exam has a curriculum finding in it. That is the most useful thing on this
 * page for a head teacher, which is why it is given the most room.
 *
 * A subject is named as weak. A school never is — see the rules at the top.
 */
function Subjects({ written }: { written: WrittenReport }) {
  const { sections, streams } = written;
  const fell = sections.filter((s) => s.fell);
  const commerce = streams.find((g) => g.stream === "Commerce");
  const science = streams.find((g) => g.stream === "Science");
  const arts = streams.find((g) => g.stream === "Arts");

  // "Answered least well" is read off the figures beside it, never asserted: the
  // lowest section of each paper, whatever it turns out to be.
  const lowest = [
    { group: "Class IX", row: [...sections].sort((a, b) => a.ix - b.ix)[0], value: (r: SectionRow) => r.ix },
    { group: "Class X", row: [...sections].sort((a, b) => a.x - b.x)[0], value: (r: SectionRow) => r.x },
  ];
  const lowestStream = (g: StreamGroup | undefined, cls: "xi" | "xii") => {
    if (!g) return null;
    const rows = g.subjects.filter((s) => s[cls] !== null);
    return rows.sort((a, b) => (a[cls] ?? 0) - (b[cls] ?? 0))[0] ?? null;
  };
  const lowXi = lowestStream(arts, "xi");
  const lowXii = lowestStream(arts, "xii");

  const maths = {
    ix: sections.find((s) => s.section === "Mathematics")?.ix,
    x: sections.find((s) => s.section === "Mathematics")?.x,
    xi: science?.subjects.find((s) => s.subject === "Mathematics")?.xi,
  };
  const topCommerce = commerce?.subjects.slice(0, 3) ?? [];

  return (
    <Section paper="written" label="Subjects · written paper">
      <h2 className={HEADING}>Where the cohort is strong, and where it needs help</h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        The written paper is sat by subject, so for the first time the exam can say <em>what</em>{" "}
        students found hard rather than only how much. Every figure below is the share of that
        subject&rsquo;s questions answered correctly. A subject may be named as weak; a school never
        is.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(14px,2vw,24px)]">
        <Finding title="Answered least well, paper by paper">
          {lowest.map(({ group, row, value }) => row && (
            <span key={group} className="block">
              {group} — {row.section}, {pct(value(row))}.
            </span>
          ))}
          {lowXi && (
            <span className="block">
              Class XI Arts — {lowXi.subject}, {pct(lowXi.xi ?? 0)}.
            </span>
          )}
          {lowXii && (
            <span className="block">
              Class XII Arts — {lowXii.subject}, {pct(lowXii.xii ?? 0)}.
            </span>
          )}
          <span className="block mt-2">
            Four separate papers and four separate cohorts. This is a curriculum signal, not a school
            one.
          </span>
        </Finding>

        <Finding title="Mathematics is weak in the school years">
          Class IX {pct(maths.ix ?? 0)} and Class X {pct(maths.x ?? 0)} — the years where the
          foundation is laid.
          {maths.xi != null && (
            <> It recovers to {pct(maths.xi)} in Class XI Science, where only students who chose it
            sit it.</>
          )}
        </Finding>

        {topCommerce.length === 3 && (
          <Finding title="Commerce is the strongest stream">
            {topCommerce
              .map((s) => `${s.subject} ${pct(Math.max(s.xi ?? 0, s.xii ?? 0))}`)
              .join(", ")}
            . Commerce students answered around three questions in four correctly.
          </Finding>
        )}

        <Finding title="English is answered best in Class XII">
          {streams
            .map((g) => `${g.stream} ${g.english.xii != null ? pct(g.english.xii) : "—"}`)
            .join(" · ")}
          . English &amp; General Knowledge is the strongest section of all three Class XII papers.
          In vernacular-medium schools that is worth stating plainly.
        </Finding>
      </div>

      {/* ── the seven sections of the IX and X paper ─────────────────────── */}
      <div className={`${CARD} p-[clamp(20px,3vw,32px)] mt-[clamp(16px,2.4vw,28px)]`}>
        <div className={CARD_TITLE}>Classes IX and X · seven sections of one paper</div>
        <p className="mt-1.5 mb-5 text-[0.9rem] leading-[1.7] text-[var(--ink-muted)] max-w-[70ch]">
          Every student in these two years sat all seven sections, so the two years can be compared
          section by section — the one place on this page where two classes are held against each
          other, and it is honest because it is the same seven sections either side.
        </p>

        <div className="grid gap-4">
          {sections.map((s) => (
            <div key={s.section}>
              <div className="flex justify-between items-baseline gap-3">
                <span
                  className={`text-[0.86rem] font-semibold ${
                    s.fell ? "text-[var(--maroon)]" : "text-[var(--ink)]"
                  }`}
                >
                  {s.section}
                  {s.fell && <Star className="ml-1.5 text-[var(--gold)] text-[0.7rem]" />}
                </span>
              </div>
              <div className="grid gap-1 mt-1.5">
                <SectionBar label="IX" value={s.ix} colour="var(--teal)" />
                <SectionBar
                  label="X"
                  value={s.x}
                  colour={s.fell ? "var(--maroon)" : "var(--royal-blue)"}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-[var(--cream-muted)] text-[0.8rem] text-[var(--ink-muted)]">
          <Key colour="var(--teal)">Class IX</Key>
          <Key colour="var(--royal-blue)">Class X</Key>
          <Key colour="var(--maroon)">Where Class X fell furthest below Class IX</Key>
        </div>

        {fell.length === 2 && (
          <p className="mt-4 mb-0 text-[0.9rem] leading-[1.7] text-[var(--ink-muted)] max-w-[70ch]">
            Class X answered <strong className="text-[var(--ink)]">less</strong> of{" "}
            {fell[0].section} and {fell[1].section} correctly than Class IX did, on the year&rsquo;s
            own paper — {pct(fell[0].ix)} down to {pct(fell[0].x)}, and {pct(fell[1].ix)} down to{" "}
            {pct(fell[1].x)}. Those two sections are where a teaching intervention would show the
            fastest return.
          </p>
        )}
      </div>

      {/* ── XI and XII by subject and stream ─────────────────────────────── */}
      <div className={`${CARD} p-[clamp(20px,3vw,32px)] mt-[clamp(14px,2vw,22px)]`}>
        <div className={CARD_TITLE}>Classes XI and XII · by subject and stream</div>
        <p className="mt-1.5 mb-4 text-[0.9rem] leading-[1.7] text-[var(--ink-muted)] max-w-[70ch]">
          Twenty-five questions per subject. Each row shows Class XI and Class XII on the same 0–100
          scale, so the movement between the two years is visible at a glance. Each subject sits
          under the stream whose students actually sat it.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-[0.8rem] text-[var(--ink-muted)]">
          <Key colour="var(--teal)">Class XI</Key>
          <Key colour="var(--royal-blue)">Class XII</Key>
        </div>

        {streams.map((g) => (
          <div key={g.stream} className="mb-7 last:mb-0">
            <div className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold mb-3">
              {g.stream}
            </div>
            <div className="grid gap-2.5">
              {g.subjects.map((s) => (
                <SubjectBar key={s.subject} label={s.subject} xi={s.xi} xii={s.xii} />
              ))}
            </div>
          </div>
        ))}

        <div className="pt-5 border-t border-[var(--cream-muted)]">
          <div className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold mb-3">
            English &amp; General Knowledge · sat by every stream
          </div>
          <div className="grid gap-2.5">
            {streams.map((g) => (
              <SubjectBar
                key={g.stream}
                label={`${g.stream} stream`}
                xi={g.english.xi}
                xii={g.english.xii}
              />
            ))}
          </div>
        </div>

        <p className="mt-5 pt-4 border-t border-[var(--cream-muted)] mb-0 text-[0.82rem] leading-[1.7] text-[var(--ink-muted)] max-w-[74ch]">
          Every subject shown was sat by at least thirty candidates. Where fewer than thirty students
          sat a subject the figure is withheld: an average built on a handful of children is noise,
          and it can identify them. That is why a few subjects appear for one year only.
        </p>
      </div>
    </Section>
  );
}

function Finding({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD} p-[clamp(18px,2.4vw,24px)]`}>
      <div className="font-[family-name:var(--font-display)] font-bold text-[1.12rem] leading-[1.35] text-[var(--maroon)] mb-2">
        {title}
      </div>
      <p className="m-0 text-[0.9rem] leading-[1.75] text-[var(--ink-muted)] tnum">{children}</p>
    </div>
  );
}

function Key({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px]">
      <span
        className="w-4 h-[9px] rounded-full inline-block"
        style={{ background: colour }}
      />
      {children}
    </span>
  );
}

function SectionBar({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="grid grid-cols-[26px_1fr_clamp(58px,9vw,74px)] items-center gap-2.5">
      <span className="text-[0.76rem] text-[var(--ink-muted)] font-semibold tnum">{label}</span>
      <span className="block h-3 bg-[var(--cream-muted)] rounded-full overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: colour }} />
      </span>
      <span className="text-right text-[0.8rem] text-[var(--ink-muted)] tnum">{pct(value)}</span>
    </div>
  );
}

/** One subject, Class XI over Class XII, on a shared 0–100 scale. */
function SubjectBar({
  label,
  xi,
  xii,
}: {
  label: string;
  xi: number | null;
  xii: number | null;
}) {
  return (
    <div className="subj grid grid-cols-[clamp(104px,17vw,168px)_1fr_clamp(96px,15vw,120px)] items-center gap-[clamp(8px,1.5vw,16px)]">
      <span className="text-[0.84rem] font-semibold text-[var(--ink)] leading-[1.35]">{label}</span>
      <span className="grid gap-[3px]">
        {xi !== null && (
          <span className="block h-[9px] bg-[var(--cream-muted)] rounded-full overflow-hidden">
            <span className="block h-full bg-[var(--teal)] rounded-full" style={{ width: `${xi}%` }} />
          </span>
        )}
        {xii !== null && (
          <span className="block h-[9px] bg-[var(--cream-muted)] rounded-full overflow-hidden">
            <span
              className="block h-full bg-[var(--royal-blue)] rounded-full"
              style={{ width: `${xii}%` }}
            />
          </span>
        )}
      </span>
      <span className="subj-value text-right text-[0.82rem] text-[var(--ink-muted)] tnum">
        {xi !== null && xii !== null
          ? `${xi.toFixed(1)} → ${xii.toFixed(1)}`
          : xi !== null
            ? `XI only · ${xi.toFixed(1)}`
            : `XII only · ${(xii ?? 0).toFixed(1)}`}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── zones ─── */

function Zones({ written }: { written: WrittenReport }) {
  const { zones, headline } = written;
  const spread = Math.max(...zones.map((z) => z.average)) - Math.min(...zones.map((z) => z.average));

  return (
    <Section paper="written" label="Zones · written paper">
      <h2 className={HEADING}>The three zones performed alike</h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        Just {marks(spread)} marks out of a hundred separate the highest zone from the lowest. On a
        cohort of {num(headline.sat)} children drawn from every centre in the exam, that is the
        finding: where a child sits the exam is not what decides their mark.
      </p>

      <div className={`${CARD} p-[clamp(20px,3vw,32px)]`}>
        <div className="grid gap-4">
          {zones.map((z) => (
            <BarRow
              key={z.zone}
              labelWidth="clamp(112px,20vw,190px)"
              valueWidth="clamp(58px,9vw,76px)"
              height="18px"
              colour="var(--royal-blue)"
              width={ofWritten(z.average)}
              label={
                <span className="block">
                  <span className="block text-[0.88rem] text-[var(--ink)] font-semibold">
                    {z.zone}
                  </span>
                  <span className="block text-[0.76rem] text-[var(--ink-muted)] font-normal">
                    {num(z.sat)} sat
                  </span>
                </span>
              }
              value={<strong className="text-[var(--ink)]">{marks(z.average)}</strong>}
            />
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[var(--cream-muted)] text-[0.82rem] leading-[1.7] text-[var(--ink-muted)]">
          Bars run 0 to 100. All three zones sit within{" "}
          {marks(
            Math.max(...zones.map((z) => Math.abs(z.average - headline.average))),
          )}{" "}
          marks of the cohort average of {marks(headline.average)}.
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────── perfect papers ─── */

/**
 * The top of the exam, without a single name.
 *
 * The office named the sixty-four full-mark students when the online paper was
 * published alone; the redesign took the names off, and they stay off. Every one
 * of them can see their own result on their own page, which is where a child's
 * name belongs on a public internet.
 */
function Perfect({
  classes,
  headline,
  written,
}: {
  classes: ClassRow[];
  headline: ExamReport["headline"];
  written: WrittenReport | null;
}) {
  const mostFull = Math.max(...classes.map((c) => c.fullMarks));
  const ix = written?.classes.find((c) => c.cls === "IX");
  const x = written?.classes.find((c) => c.cls === "X");
  // Only one class can be named as the perfect paper's when exactly one class
  // reaches the top mark and exactly one student scored it. Otherwise the page
  // reports the mark and leaves the class out, rather than guessing.
  const atTop = written?.classes.filter((c) => c.highest === written.headline.highest) ?? [];
  const perfectClass =
    written && written.headline.perfect === 1 && atTop.length === 1 ? atTop[0] : null;

  return (
    <Section label="The top of the exam">
      <h2 className={HEADING}>Perfect papers</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[clamp(14px,2vw,24px)]">
        <div
          data-paper="online"
          className={`${CARD} border-t-[3px] border-t-[var(--maroon)] p-[clamp(20px,3vw,30px)]`}
        >
          <div className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--maroon)] font-bold">
            Online paper
          </div>
          <div className="font-[family-name:var(--font-display)] font-bold text-[clamp(3rem,8vw,4.4rem)] leading-none text-[var(--maroon)] mt-2 tnum">
            {num(headline.fullMarks)}
          </div>
          <p className="mt-1.5 mb-5 text-[0.98rem] leading-[1.6] text-[var(--ink-muted)]">
            students scored <strong className="text-[var(--ink)]">50 out of 50</strong>.
          </p>

          <div className="grid gap-2">
            {classes.map((c) => (
              <BarRow
                key={c.cls}
                labelWidth="clamp(64px,10vw,84px)"
                valueWidth="clamp(34px,6vw,48px)"
                height="12px"
                colour="var(--gold)"
                width={`${mostFull === 0 ? 0 : (c.fullMarks / mostFull) * 100}%`}
                label={`Class ${c.cls}`}
                value={<strong className="text-[var(--ink)]">{num(c.fullMarks)}</strong>}
              />
            ))}
          </div>

          <p className="mt-5 pt-4 border-t border-[var(--cream-muted)] mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)]">
            No student is named here — every one of the {num(headline.fullMarks)} sees their own
            result on their portal.
          </p>
        </div>

        {written && (
          <div
            data-paper="written"
            className={`${CARD} border-t-[3px] border-t-[var(--royal-blue)] p-[clamp(20px,3vw,30px)]`}
          >
            <div className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--royal-blue)] font-bold">
              Written paper
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="font-[family-name:var(--font-display)] font-bold text-[clamp(3rem,8vw,4.4rem)] leading-none text-[var(--royal-blue)] tnum">
                {num(written.headline.highest)}
              </span>
              <span className="text-[0.95rem] text-[var(--ink-muted)]">
                out of 100 —{" "}
                {written.headline.perfect === 1 ? "once" : `${num(written.headline.perfect)} times`}
              </span>
            </div>
            <p className="mt-2 mb-5 text-[0.98rem] leading-[1.6] text-[var(--ink-muted)]">
              {perfectClass ? (
                <>One student, in Class {perfectClass.cls}, answered every one of the hundred
                questions correctly.</>
              ) : written.headline.perfect === 1 ? (
                <>One student answered every one of the hundred questions correctly.</>
              ) : (
                <>{num(written.headline.perfect)} students answered every one of the hundred
                questions correctly.</>
              )}
            </p>

            <div className="grid gap-2 text-[0.9rem]">
              {written.thresholds
                .filter((t) => t.mark === 90 || t.mark === 75)
                .map((t) => (
                  <Line
                    key={t.mark}
                    label={`Scored ${t.mark} or more`}
                    value={`${num(t.students)} students`}
                  />
                ))}
              {written.classHighs.map((c) => (
                <Line key={c.cls} label={`Highest in Class ${c.cls}`} value={num(c.highest)} />
              ))}
            </div>

            {ix && x && ix.highest === x.highest && (
              <p className="mt-5 pt-4 border-t border-[var(--cream-muted)] mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)]">
                Class IX and Class X produced their highest marks on the same figure,{" "}
                {num(ix.highest)}, on two different papers.
              </p>
            )}
          </div>
        )}
      </div>

      {written && (
        <p className="mt-5 mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)] max-w-[76ch]">
          Final merit under Project UDAAN is decided on both papers together. Nothing on this page is
          a final award.
        </p>
      )}
    </Section>
  );
}

/* ───────────────────────────────────────────────────────────── schools ─── */

function Schools({ report }: { report: ExamReport }) {
  const { schools, headline, written } = report;

  return (
    <Section paper="online" label="Schools · online paper">
      <h2 className={HEADING}>Schools we want to thank</h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        The {word(schools.length)} schools whose students averaged highest on the online paper. The figure
        is the average of the students <em>from that school who sat</em>, so a school with 26
        students and one with 208 are measured the same way. Only schools with at least 25 students
        sitting are listed, because small groups swing wildly. This is not a league table, and there
        is no bottom of it.
      </p>

      <div className={`${CARD} p-[clamp(20px,3vw,32px)]`}>
        <div className="grid gap-3.5">
          {schools.map((s) => (
            <div key={s.school}>
              <div className="flex justify-between items-baseline gap-3 mb-1.5">
                <span className="text-[0.88rem] text-[var(--ink)] leading-[1.4]">
                  {s.school}{" "}
                  <span className="text-[var(--ink-muted)] text-[0.8rem] tnum">
                    · {num(s.sat)} sat
                  </span>
                </span>
                <span className="font-[family-name:var(--font-display)] font-bold text-[1.05rem] text-[var(--maroon)] tnum shrink-0">
                  {marks(s.average)}
                </span>
              </div>
              <span className="block h-3 bg-[var(--cream-muted)] rounded-full relative overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--maroon)]"
                  style={{ width: ofTotal(s.average) }}
                />
                <span
                  className="absolute inset-y-0 w-0.5 bg-[var(--ink)] opacity-60"
                  style={{ left: ofTotal(headline.average) }}
                />
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-[var(--cream-muted)] text-[0.8rem] text-[var(--ink-muted)]">
          <Key colour="var(--maroon)">School average</Key>
          <span className="inline-flex items-center gap-[7px]">
            <span className="w-0.5 h-3.5 bg-[var(--ink)] inline-block" />
            Cohort average, {marks(headline.average)}
          </span>
          <span>Scale: 0 to {TOTAL} marks</span>
        </div>
      </div>

      <p className="mt-4 mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)] max-w-[78ch]">
        {num(headline.schools)} schools took part in all. Every one of them sent students into a
        paper they had never seen before.
        {written && (
          <> School-level figures for the written paper will be added here when the per-school
          written breakdown is published.</>
        )}
      </p>
    </Section>
  );
}

/* ───────────────────────────────────────────────────────────── centres ─── */

function Centres({
  report,
  turnout,
  written,
}: {
  report: ExamReport;
  turnout: number;
  written: WrittenReport | null;
}) {
  const { centres, headline } = report;

  return (
    <Section paper="online" label="Centres and turnout">
      <h2 className={HEADING}>{numberWord(headline.centres)} centres</h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        {numberWord(headline.centres)} centres opened on 19 July{written ? " for both papers" : ""}.
        Turnout is the share of students on a centre&rsquo;s roster who sat the online paper.
      </p>

      <div className={`${CARD} p-[clamp(20px,3vw,32px)] mb-[clamp(14px,2vw,22px)]`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-[family-name:var(--font-display)] font-bold text-[clamp(2.2rem,5vw,3rem)] leading-none text-[var(--maroon)] tnum">
            {pct(turnout)}
          </span>
          <span className="text-[0.92rem] text-[var(--ink-muted)]">online turnout</span>
        </div>

        <div className="flex h-[18px] rounded-full overflow-hidden mt-4 bg-[var(--cream-muted)]">
          <div className="bg-[var(--maroon)]" style={{ width: `${turnout}%` }} />
          <div className="bg-[var(--cream-muted)]" style={{ width: `${100 - turnout}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 mt-2 text-[0.82rem] text-[var(--ink-muted)] tnum">
          <span>
            <strong className="text-[var(--ink)]">{num(headline.sat)}</strong> sat
          </span>
          <span>
            <strong className="text-[var(--ink)]">{num(headline.absent)}</strong> did not sit
          </span>
        </div>

        {written && (
          <div className="mt-4 pt-4 border-t border-[var(--cream-muted)] flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-[family-name:var(--font-display)] font-bold text-[1.6rem] leading-none text-[var(--royal-blue)] tnum">
              {pct(written.headline.turnout)}
            </span>
            <span className="text-[0.88rem] text-[var(--ink-muted)] tnum">
              written turnout · {num(written.headline.sat)} sat
            </span>
          </div>
        )}

        <p className="mt-4 mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)] max-w-[76ch]">
          {written
            ? "More students sat the written paper than the online one. We publish the shortfall on both because it matters: it is a phone shared between siblings, a network that dropped, a family who moved, an exam morning that went wrong. Understanding it is part of the work of the next round."
            : "We publish the shortfall because it matters: it is a phone shared between siblings, a network that dropped, a family who moved, an exam morning that went wrong. Understanding it is part of the work of the next round."}
        </p>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full border-collapse text-[0.88rem] min-w-[540px]">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>Exam centre</th>
              <th className={`${TH} text-right`}>Registered</th>
              <th className={`${TH} text-right`}>Sat</th>
              <th className={`${TH} text-right`}>Turnout</th>
              <th className={`${TH} text-right`}>Average of 50</th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c) => (
              <tr key={c.centre}>
                <td className={TD}>{c.centre}</td>
                <td className={`${TD} text-right tnum`}>{num(c.registered)}</td>
                <td className={`${TD} text-right tnum`}>{num(c.sat)}</td>
                <td className={`${TD} text-right tnum font-semibold text-[var(--maroon)]`}>
                  {pct(c.turnout)}
                </td>
                <td className={`${TD} text-right tnum`}>{marks(c.average)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="scroll-hint hidden mt-2 text-[0.78rem] text-[var(--ink-muted)]">
        Scroll the table sideways →
      </div>

      <p className="mt-4 mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)] max-w-[78ch]">
        The {word(centres.length)} centres with the highest turnout, of {word(headline.centres)}.
        Averages differ between centres partly because centres draw on different schools and
        different mixes of classes.
      </p>
    </Section>
  );
}

/**
 * Small counts spelled out, because "The 8 schools" and "of 21" read as a
 * spreadsheet in the middle of a sentence. Every figure a reader compares stays
 * a numeral; only these do not.
 */
const WORDS: Record<number, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
  20: "twenty",
  21: "twenty-one",
  22: "twenty-two",
};
const word = (v: number) => WORDS[v] ?? num(v);
const numberWord = (v: number) => {
  const w = WORDS[v];
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : num(v);
};

/** "An 8-point gap", "A 7-point gap" — the article agrees with how the digit is said. */
const article = (v: number) => ([8, 11, 18].includes(Math.round(v)) ? "An" : "A");

/* ────────────────────────────────────────────────────────── difficulty ─── */

function Difficulty({
  hardest,
  easiest,
  written,
}: {
  hardest: ExamReport["hardest"];
  easiest: ExamReport["easiest"];
  written: WrittenReport | null;
}) {
  return (
    <Section paper="online" label="Question difficulty · online paper">
      <h2 className={HEADING}>The hardest and easiest questions</h2>
      <p className={`${LEDE} m-0 mb-[26px]`}>
        For every online question we know the share of students in that class who answered it
        correctly. Across all four papers that share ran from about {Math.round(hardest.correctPct)}%
        to {Math.round(easiest.correctPct)}%.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(14px,2vw,24px)]">
        <Extreme
          kind="Hardest question"
          extreme={hardest}
          colour="var(--maroon)"
          note="A question this hard tells the paper-setters as much as it tells the students."
        />
        <Extreme
          kind="Easiest question"
          extreme={easiest}
          colour="var(--teal)"
          note="Almost the whole year group had this one."
        />
      </div>

      {written && (
        <p className="mt-4 mb-0 text-[0.85rem] leading-[1.7] text-[var(--ink-muted)] max-w-[78ch]">
          The same question-by-question analysis for the hundred written questions per class is
          prepared and will be published alongside the text of the questions once KIDS confirms it.
        </p>
      )}
    </Section>
  );
}

function Extreme({
  kind,
  extreme,
  colour,
  note,
}: {
  kind: string;
  extreme: ExamReport["hardest"];
  colour: string;
  note: string;
}) {
  return (
    <div className={`${CARD} p-[clamp(20px,3vw,28px)]`}>
      <div
        className="text-[0.7rem] tracking-[0.1em] uppercase font-bold"
        style={{ color: colour }}
      >
        {kind}
      </div>
      <div className="mt-1.5 text-[1.05rem] font-semibold text-[var(--ink)]">
        Class {extreme.cls} · Question {extreme.n}
      </div>
      <div className="h-3 bg-[var(--cream-muted)] rounded-full mt-4 overflow-hidden">
        <div className="h-full" style={{ width: `${extreme.correctPct}%`, background: colour }} />
      </div>
      <div className="flex items-baseline gap-2.5 mt-3">
        <span
          className="font-[family-name:var(--font-display)] font-bold text-[1.9rem] leading-none tnum"
          style={{ color: colour }}
        >
          {pct(extreme.correctPct)}
        </span>
        <span className="text-[0.86rem] text-[var(--ink-muted)]">
          of Class {extreme.cls} answered it correctly
        </span>
      </div>
      <p className="mt-3 mb-0 text-[0.88rem] leading-[1.7] text-[var(--ink-muted)]">{note}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── what comes next ─── */

function WhatNext({ written }: { written: WrittenReport | null }) {
  const fell = written?.sections.filter((s) => s.fell) ?? [];

  return (
    <Section label="What comes next">
      <h2 className={HEADING}>From results to action</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[clamp(14px,2vw,24px)]">
        <Next title="Merit and scholarships">
          {written
            ? "Final merit under Project UDAAN is decided on both papers together. Awards are announced to schools directly."
            : "Merit under Project UDAAN is decided once the written paper is marked as well. Awards are announced to schools directly."}
        </Next>
        <Next title="Teaching where it is needed">
          {fell.length === 2 ? (
            <>
              {fell[0].section} and {fell[1].section} in Classes IX and X are where the subject data
              points most clearly. Teacher training and residential coaching will be planned against
              these findings.
            </>
          ) : (
            <>
              Teacher training and residential coaching will be planned against the subject findings
              of the written paper.
            </>
          )}
        </Next>
        <Next title="Felicitation">
          Students, schools and centres will be honoured at the UDAAN felicitation ceremony. Dates
          will be announced to schools and published here.
        </Next>
      </div>
    </Section>
  );
}

function Next({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD} p-[clamp(18px,2.4vw,24px)] flex gap-3.5 items-start`}>
      <Star className="text-[var(--gold)] text-base leading-[1.4] shrink-0" />
      <div>
        <div className="font-[family-name:var(--font-display)] font-bold text-[1.12rem] text-[var(--ink)] mb-1.5">
          {title}
        </div>
        <p className="m-0 text-[0.9rem] leading-[1.7] text-[var(--ink-muted)]">{children}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── your own result ─── */

function OwnResult({ written }: { written: WrittenReport | null }) {
  return (
    <div className="sky text-[var(--cream)] rounded-[12px] mt-[clamp(48px,7vw,80px)] p-[clamp(24px,4vw,40px)] flex flex-wrap gap-6 items-center justify-between">
      <div className="max-w-[52ch]">
        <div className="font-[family-name:var(--font-display)] font-bold text-[clamp(1.4rem,3vw,1.9rem)] leading-[1.25]">
          Looking for your own result?
        </div>
        <p className="mt-2 mb-0 text-[0.95rem] leading-[1.7] text-[var(--on-dark)]">
          {written
            ? "Both papers, your class rank and your answer sheets are on your personal result page. Sign in with the roll number on your admit card, or scan its QR code."
            : "Your marks and your class rank are on your personal result page. Sign in with the roll number on your admit card, or scan its QR code."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 bg-[var(--gold)] text-[var(--maroon)] font-bold text-[0.95rem] px-[24px] py-[13px] rounded-md no-underline"
        >
          Check your result
        </Link>
        <Link
          href="/set"
          className="inline-flex items-center gap-2 border border-[rgba(243,239,230,0.5)] text-[var(--cream)] font-semibold text-[0.95rem] px-[24px] py-[13px] rounded-md no-underline"
        >
          About SET
        </Link>
      </div>
    </div>
  );
}

function Footnote({ written }: { written: WrittenReport | null }) {
  return (
    <p className="mt-[clamp(28px,4vw,44px)] text-[0.82rem] leading-[1.8] text-[var(--ink-muted)] max-w-[80ch]">
      All figures on this page are drawn from the assessed papers of the Students Evaluation Test
      held on 19 July 2026, and are published for verification.
      {written ? (
        <>
          {" "}
          The online paper is marked out of 50 and the written paper out of 100; the two are never
          added together. Where a figure is an average, it is the average of the students{" "}
          <strong className="text-[var(--ink)]">who sat</strong>, never of those registered, and each
          paper&rsquo;s turnout is measured against that paper&rsquo;s own roster. Subject figures
          are withheld where fewer than thirty candidates sat the subject.
        </>
      ) : (
        <>
          {" "}
          They cover the online paper only. Where a figure is an average, it is the average of the
          students <strong className="text-[var(--ink)]">who sat</strong>, not of those registered.
        </>
      )}{" "}
      Schools or parents who believe a figure is wrong may write to KIDS at the address below.
    </p>
  );
}

/* ──────────────────────────────────────────────────────── not published ─── */

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
            The report will appear on this page as soon as the results are declared. Students will
            find their own marks on their personal result page, opened by scanning the QR code on
            their admit card.
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

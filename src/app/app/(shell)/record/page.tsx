import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { recordState, type PracticeWeek } from "@/lib/app/record";
import { signUid, qrSecret } from "@/lib/qr-token";
import type { OfflineMarksheet } from "@/lib/exam/offline-results";
import "../../record.css";

/**
 * My Record — design 5a.
 *
 * The whole screen is arranged around one rule: the two papers were marked and
 * ranked independently and are never added together. They get separate cards,
 * separate ranks, separate cohort sizes and separate "open" links, and there is
 * no combined total anywhere on the page.
 *
 * Every number is read from the published snapshots. Nothing here is arithmetic
 * done on a phone.
 */
export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-IN");
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** 1st, 2nd, 3rd, 148th — a rank read the way a child says it aloud. */
function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${num(n)}th`;
  return `${num(n)}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

type State = Awaited<ReturnType<typeof recordState>>;

export default async function RecordPage() {
  const student = await requireStudent();
  const { written, online, practice } = await recordState(student);

  // The same signed link the portal hands out, so a marksheet opened from the
  // app is the identical page — one marksheet, one route, one QR secret.
  const marksheetHref = `/marksheet?id=${student.uid}&t=${signUid(student.uid, qrSecret())}`;

  return (
    <>
      <div>
        <h1 className="app-h1">My record</h1>
        <p className="app-sub">
          {student.name}
          {" · "}
          <span className="app-datum__uid">{student.uid}</span>
        </p>
        <p className="app-sub">
          SET 2026 · 19 July
          {written.state === "ready" && written.publishedOn
            ? ` · published ${written.publishedOn}`
            : ""}
        </p>
      </div>

      <p className="rec-lede">
        You sat <b>two separate papers</b>. They were marked and ranked independently — one score is
        never added to the other.
      </p>

      <WrittenCard paper={written} />
      <OnlineCard paper={online} />

      {(written.state === "ready" || online.state === "ready") && (
        <Link href={marksheetHref} className="app-btn app-btn--outline">
          Download my marksheet
        </Link>
      )}

      <PracticeCard practice={practice} />

      {written.state === "ready" && written.sheet && <SectionCard sheet={written.sheet} />}
    </>
  );
}

/* ------------------------------------------------------------- paper 1 --- */

function WrittenCard({ paper }: { paper: State["written"] }) {
  if (paper.state === "pending") {
    return (
      <section className="rec-card rec-card--wait">
        <PaperHead n={1} name="Written OMR" note="100 questions" />
        <h2 className="rec-wait__title">Your paper has been collected</h2>
        <p className="rec-wait__body">
          Your OMR sheet has reached the office and is being assessed with every other sheet from
          your centre. Results are published for all centres together, never school by school.
        </p>
        <ol className="rec-steps">
          <li className="rec-steps__done">Paper collected — the exam day</li>
          <li className="rec-steps__now">Assessment under way — now</li>
          <li>Results published — to be announced</li>
        </ol>
        <p className="rec-wait__foot">
          The app will tell you the day it happens. There is nothing you need to do.
        </p>
      </section>
    );
  }

  if (paper.state === "absent" || !paper.sheet) {
    return (
      <section className="rec-card rec-card--absent">
        <PaperHead n={1} name="Written OMR" note="Not attempted" />
        <p className="rec-absent__body">You did not sit the written paper on 19 July.</p>
        <p className="rec-absent__foot">
          This is not a zero and it is not counted against you anywhere. There is no rank for a paper
          that was not attempted.
        </p>
      </section>
    );
  }

  const s = paper.sheet;
  return (
    <section className="rec-card">
      <PaperHead n={1} name="Written OMR" note={`${s.total} questions`} />

      <div className="rec-score">
        <div className="rec-score__mark">
          <span className="rec-score__n">{s.marks}</span>
          <span className="rec-score__of">/ {s.total}</span>
        </div>
        {s.percentile !== null && (
          <div className="rec-score__pctl">
            <span className="rec-score__pctln">{one(s.percentile)}</span>
            <span className="rec-score__pctll">Percentile</span>
          </div>
        )}
      </div>

      <div className="rec-tally">
        <span className="rec-tally__ok">{s.correct} correct</span>
        <span className="rec-tally__no">{s.wrong} wrong</span>
        <span className="rec-tally__sk">{s.blank} blank</span>
      </div>

      {s.ranked ? (
        <>
          <dl className="rec-ranks">
            <Rank label="In your class" rank={s.classRank} of={s.classSat} />
            <Rank label="In your centre" rank={s.centreRank} of={s.centreSat} />
            <Rank label="In your school" rank={s.schoolRank} of={s.schoolSat} />
          </dl>
          <p className="rec-ranks__note">
            Every rank counts only the students who actually sat this paper.
          </p>
        </>
      ) : (
        <p className="rec-ranks__note">
          Your marks stand on their own. You sat a different paper from your classmates, so there is
          no rank to compare them against.
        </p>
      )}

      <Link href="/app/record/written" className="app-btn">
        Open my answer sheet
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------- paper 2 --- */

function OnlineCard({ paper }: { paper: State["online"] }) {
  if (paper.state === "pending") {
    return (
      <section className="rec-card rec-card--wait">
        <PaperHead n={2} name="Online" note="50 questions" />
        <h2 className="rec-wait__title">Not published yet</h2>
        <p className="rec-wait__body">
          The online paper is released on its own switch, separately from the written one. The app
          will tell you the day it happens.
        </p>
      </section>
    );
  }

  if (paper.state === "absent" || !paper.sheet) {
    return (
      <section className="rec-card rec-card--absent">
        <PaperHead n={2} name="Online" note="Not attempted" />
        <p className="rec-absent__body">You did not sit the online paper on 19 July.</p>
        <p className="rec-absent__foot">
          This is not a zero and it is not counted against you anywhere. There is no rank for a paper
          that was not attempted, and your written result stands entirely on its own.
        </p>
      </section>
    );
  }

  const s = paper.sheet;
  return (
    <section className="rec-card">
      <PaperHead n={2} name="Online" note={`${s.total} questions`} />

      <div className="rec-score">
        <div className="rec-score__mark">
          <span className="rec-score__n">{s.marks}</span>
          <span className="rec-score__of">/ {s.total}</span>
        </div>
        {s.ranks && s.ranks.percentile !== null && (
          <div className="rec-score__pctl">
            <span className="rec-score__pctln">{one(s.ranks.percentile)}</span>
            <span className="rec-score__pctll">Percentile</span>
          </div>
        )}
      </div>

      <div className="rec-tally">
        <span className="rec-tally__ok">{s.correct} correct</span>
        <span className="rec-tally__no">{s.wrong} wrong</span>
        <span className="rec-tally__sk">{s.blank} blank</span>
      </div>

      {s.ranked && s.ranks ? (
        <>
          <dl className="rec-ranks">
            <Rank label="In your class" rank={s.ranks.classRank} of={s.ranks.classSat} />
            <Rank label="In your centre" rank={s.ranks.centreRank} of={s.ranks.centreSat} />
            <Rank label="In your school" rank={s.ranks.schoolRank} of={s.ranks.schoolSat} />
          </dl>
          <p className="rec-ranks__note">
            {num(s.ranks.classSat)} of your class sat this paper — a different group from the written
            one, so the two ranks are not comparable.
          </p>
        </>
      ) : (
        <p className="rec-ranks__note">
          Your marks stand on their own. You answered a different paper from your classmates, so
          there is no rank to compare them against.
        </p>
      )}

      <Link href="/app/record/online" className="app-btn">
        See question by question
      </Link>
    </section>
  );
}

/* --------------------------------------------------------------- parts --- */

function PaperHead({ n, name, note }: { n: number; name: string; note: string }) {
  return (
    <div className="rec-head">
      <span className="rec-head__name">
        Paper {n} · {name}
      </span>
      <span className="rec-head__note">{note}</span>
    </div>
  );
}

function Rank({ label, rank, of }: { label: string; rank: number | null; of: number }) {
  if (rank === null) return null;
  return (
    <div className="rec-rank">
      <dt>{label}</dt>
      <dd>
        <b>{ordinal(rank)}</b> of {num(of)}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------ practice --- */

function PracticeCard({ practice }: { practice: State["practice"] }) {
  if (practice.answered === 0) {
    return (
      <section className="rec-card rec-card--quiet">
        <div className="rec-head">
          <span className="rec-head__name">Practice since the exam</span>
        </div>
        <p className="rec-absent__foot">
          Nothing yet. Your daily set is five questions; once you have answered a few, your own
          record appears here.
        </p>
        <Link href="/app" className="app-btn app-btn--outline app-btn--small">
          Start today&rsquo;s set
        </Link>
      </section>
    );
  }

  return (
    <section className="rec-card rec-card--quiet">
      <div className="rec-head">
        <span className="rec-head__name">Practice since the exam</span>
        <span className="rec-head__note">{practice.accuracy}% right first time</span>
      </div>

      {practice.weeks.length > 1 && <Spark weeks={practice.weeks} />}

      <p className="rec-absent__foot">
        Of the {num(practice.answered)} questions the app has put in front of you, you were right at
        first sight on {num(practice.right)}. This is your own record, not a rank — nobody else is in
        this line.
      </p>
    </section>
  );
}

/**
 * The practice line.
 *
 * Drawn from the weeks that exist, with no axis invented to fill a gap: a
 * student who has practised for two weeks gets two points, not five.
 */
function Spark({ weeks }: { weeks: PracticeWeek[] }) {
  const w = 300;
  const h = 64;
  const pad = 8;
  const step = weeks.length > 1 ? (w - pad * 2) / (weeks.length - 1) : 0;
  const y = (pct: number) => pad + (1 - pct / 100) * (h - pad * 2);
  const pts = weeks.map((k, i) => `${pad + i * step},${y(k.pct)}`);

  return (
    <div className="rec-spark">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-hidden="true" preserveAspectRatio="none">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--maroon)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {weeks.map((k, i) => (
          <circle key={k.week} cx={pad + i * step} cy={y(k.pct)} r="3" fill="var(--maroon)" />
        ))}
      </svg>
      <div className="rec-spark__axis">
        {weeks.map((k) => (
          <span key={k.week}>
            {k.label}
            <b>{k.pct}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ sections --- */

/**
 * Where the marks went, section by section — design 5a's breakdown.
 *
 * Seven rows for IX and X, four for XI and XII, because that is what the paper
 * had. The rows are not hard-coded: they come off the marked sheet, which is
 * also where the class average on each bar comes from.
 */
function SectionCard({ sheet }: { sheet: OfflineMarksheet }) {
  const max = Math.max(1, ...sheet.sections.map((s) => s.total));
  return (
    <section className="rec-card rec-card--quiet">
      <div className="rec-head">
        <span className="rec-head__name">Written paper · by section</span>
        <span className="rec-head__note">you · class avg</span>
      </div>

      <div className="rec-bars">
        {sheet.sections.map((s) => (
          <div key={s.keyId} className="rec-bar">
            <div className="rec-bar__line">
              <span className="rec-bar__name">{s.name}</span>
              <span className="rec-bar__score">
                {s.marks} / {s.total}
                {s.classAvg !== null && <span className="rec-bar__avg"> · {one(s.classAvg)}</span>}
              </span>
            </div>
            <div className="rec-bar__track" style={{ width: `${(s.total / max) * 100}%` }}>
              <span className="rec-bar__fill" style={{ width: `${(s.marks / s.total) * 100}%` }} />
              {s.classAvg !== null && (
                <span
                  className="rec-bar__mark"
                  style={{ left: `${(s.classAvg / s.total) * 100}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="rec-absent__foot">
        The dark line on each bar is the class average for that section; the bar is your own mark.
        One mark per correct answer — nothing is deducted for a wrong answer and nothing is added for
        a blank, so the sections add to {sheet.total} and to the mark on your sheet.
      </p>
    </section>
  );
}

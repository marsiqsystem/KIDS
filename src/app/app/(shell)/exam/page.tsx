import { requireStudent } from "@/lib/app/gate";
import { windowFor, phaseOf } from "@/lib/exam/schedule";
import { paperByCode } from "@/lib/exam/phases";
import { findCheckin } from "@/lib/exam/checkin";
import { findAttempt } from "@/lib/exam/attempts";
import { sql } from "@/lib/exam/db";
import { firstName } from "@/lib/exam/portal-auth";
import LiveExam from "@/components/portal/LiveExam";
import CheckIn from "@/components/app/CheckIn";

export const dynamic = "force-dynamic";

const ist = (d: Date | string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts });

/**
 * The Exam tab. Permanent, and on most days it says nothing is open.
 *
 * On an exam morning it is the whole flow, decided on the server from the
 * paper's own row and never from the phone's clock:
 *
 *   not yet        the paper, when it opens, and the rules -- stated as what
 *                  happens, not as prohibitions (Design 6b)
 *   check-in open  scan the invigilator's code, or type the six digits
 *   checked in     the paper itself: July's runner, proven on 6,780 students,
 *                  through the app's own gate
 *   in             the receipt, which does not go away (Design 6d)
 *
 * The rules shown are the ones ruled on 14 September 2026, not Design's
 * assumptions: one closing time for the whole hall, answers kept on the phone
 * with the server's clock deciding, and another phone only through the
 * invigilator.
 */
export default async function ExamPage() {
  const student = await requireStudent();
  const window = await windowFor(student);
  const received = await receiptsFor(student.uid);

  if (!window) {
    return (
      <>
        <h1 className="app-h1">Exam</h1>
        <div className="app-soon">
          <h2>No paper is open</h2>
          <p>
            When KIDS schedules your next paper it appears here, with the date and the rules, well
            before it opens.
          </p>
        </div>
        <Received rows={received} />
      </>
    );
  }

  const paper = await paperByCode(window.examPaperCode);
  const phase = phaseOf(window);
  const attempt = await findAttempt(student.uid, window.examPaperId);
  const checkin = window.requiresCheckin ? await findCheckin(student.uid, window.examPaperId) : null;
  const closes = ist(window.endsAt, { hour: "numeric", minute: "2-digit" });

  if (attempt?.status === "submitted" || phase === "over") {
    return (
      <>
        <h1 className="app-h1">Exam</h1>
        <div className="app-card app-card--cream">
          <h3>{attempt?.status === "submitted" ? "Your answers are in" : `${paper.name} has closed`}</h3>
          {attempt?.status === "submitted" ? (
            <>
              <p>
                {paper.name}. {Object.keys(attempt.answers ?? {}).length} answered, received{" "}
                {ist(attempt.submitted_at ?? attempt.deadline_at, { hour: "numeric", minute: "2-digit", second: "2-digit" })}.
                A paper can only be taken once.
              </p>
              {attempt.receipt ? <ReceiptNumber value={attempt.receipt} /> : null}
            </>
          ) : (
            <p>You did not start this paper, so there is nothing on your record for it.</p>
          )}
          <p>Results are published for all centres together. The app will tell you.</p>
        </div>
        <Received rows={received.filter((r) => r.receipt !== attempt?.receipt)} />
      </>
    );
  }

  if (phase === "before") {
    return (
      <>
        <h1 className="app-h1">Exam</h1>
        <div className="app-card app-card--gold">
          <h3>{paper.name} · Class {student.class}</h3>
          <p>
            Opens {ist(window.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
            {window.requiresCheckin
              ? `. Check-in at your centre opens ${ist(window.opensAt, { hour: "numeric", minute: "2-digit" })}.`
              : "."}
          </p>
        </div>
        <Rules closes={closes} checkin={window.requiresCheckin} />
        <Received rows={received} />
      </>
    );
  }

  if (window.requiresCheckin && !checkin) {
    return (
      <>
        <h1 className="app-h1">Exam</h1>
        <CheckIn paperName={paper.name} centreName={`${student.centre_code} · ${student.centre_name}`} />
        <Rules closes={closes} checkin />
      </>
    );
  }

  // Checked in (or no check-in needed). The runner takes over: its own waiting
  // room until the paper opens, then the paper.
  return (
    <LiveExam
      uid={student.uid}
      token=""
      api="/api/app/exam"
      paperKey={window.examPaperCode}
      label={`${paper.name} · Class ${student.class}`}
      name={firstName(student.name)}
      classLabel={student.class}
      centreCode={checkin?.centre_code ?? student.centre_code}
      questionCount={paper.question_count ?? 0}
      durationMinutes={window.durationMinutes}
      windowClosesIso={window.endsAt.toISOString()}
      startsAtIso={window.startsAt.toISOString()}
      serverNowIso={new Date().toISOString()}
    />
  );
}

function Rules({ closes, checkin }: { closes: string; checkin: boolean }) {
  return (
    <div className="app-card">
      <h3>Read this before you begin</h3>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14.5, lineHeight: 1.55 }}>
        {checkin ? (
          <li>You sit this paper in the hall. It opens only after you scan your invigilator&rsquo;s code.</li>
        ) : null}
        <li>The clock is the KIDS server&rsquo;s clock. Changing the time on your phone does nothing.</li>
        <li>
          The paper closes at <strong>{closes}</strong> for everyone in the hall. Starting late means less time.
        </li>
        <li>Every answer is kept on your phone as you tap it. If your data drops, keep answering.</li>
        <li>
          If the app closes, open it again on the same phone: you return to your answers with the same time.
        </li>
        <li>
          If your phone stops working, tell your invigilator. Only they can move your paper to another phone.
        </li>
        <li>At closing time the paper submits itself with whatever you have answered.</li>
        <li>Nothing is marked right or wrong until results are published.</li>
      </ul>
    </div>
  );
}

function ReceiptNumber({ value }: { value: string }) {
  return (
    <div style={{ display: "grid", gap: 2, marginBlock: 6 }}>
      <span className="app-label">Receipt number</span>
      <span style={{ fontFamily: "var(--font-data)", fontSize: 24, fontWeight: 600, letterSpacing: "0.1em" }}>{value}</span>
      <span className="app-hint">Quote this if you ever need to ask about this paper.</span>
    </div>
  );
}

type ReceivedRow = { name: string; receipt: string; submitted_at: string };

/** Every paper this student has handed in through the app, with its receipt. */
async function receiptsFor(uid: string): Promise<ReceivedRow[]> {
  return (await sql`
    select p.name, a.receipt, coalesce(a.submitted_at, a.deadline_at)::text as submitted_at
      from attempts a join exam_papers p on p.id = a.exam_paper_id
     where a.uid = ${uid} and a.status = 'submitted' and a.receipt is not null
     order by a.submitted_at desc
  `) as ReceivedRow[];
}

function Received({ rows }: { rows: ReceivedRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="app-card">
      <h3>Answers received</h3>
      <dl className="app-kv">
        {rows.map((r) => (
          <div key={r.receipt} style={{ display: "contents" }}>
            <dt>{ist(r.submitted_at, { day: "numeric", month: "short" })}</dt>
            <dd>
              {r.name} · <span style={{ fontFamily: "var(--font-data)" }}>{r.receipt}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

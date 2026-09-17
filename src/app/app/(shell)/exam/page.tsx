import { requireStudent } from "@/lib/app/gate";
import { windowFor, phaseOf } from "@/lib/exam/schedule";
import { paperByCode } from "@/lib/exam/phases";
import { findCheckin } from "@/lib/exam/checkin";
import { findAttempt } from "@/lib/exam/attempts";
import { sql } from "@/lib/exam/db";
import { firstName } from "@/lib/exam/portal-auth";
import LiveExam from "@/components/portal/LiveExam";
import CheckIn from "@/components/app/CheckIn";
import { Empty, Head } from "@/components/app/kit";
import {
  CentreCard,
  ClosedNote,
  FourRules,
  OpensIn,
  PaperHero,
  PapersSat,
  Receipt,
} from "@/components/app/exam/ExamFaces";

export const dynamic = "force-dynamic";

const ist = (d: Date | string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts });

/**
 * The Exam tab. Redesign board 04 — permanent, and most days it is calm.
 *
 * On an exam morning it is the whole flow, decided on the server from the
 * paper's own row and never from the phone's clock:
 *
 *   nothing       "No exam right now", and every receipt this student holds
 *   before        the paper, date, time, length, a countdown, the centre, and
 *                 the four rules ruled on 14 September 2026
 *   check-in      scan the desk code, or type the six digits
 *   checked in    LiveExam, drawn as the app: waiting room, start, the paper
 *   in            the receipt, which does not go away
 *   closed        "This paper has closed", with the receipt if there is one
 */
export default async function ExamPage() {
  const student = await requireStudent();
  const window = await windowFor(student);
  const received = await receiptsFor(student.uid);

  if (!window) {
    return (
      <>
        <Head title="Exam" />
        <div className="k-card k-card--dashed">
          <Empty title="No exam right now" line="Your next paper will show here." />
        </div>
        <PapersSat rows={received} />
      </>
    );
  }

  const paper = await paperByCode(window.examPaperCode);
  const phase = phaseOf(window);
  const attempt = await findAttempt(student.uid, window.examPaperId);
  const checkin = window.requiresCheckin ? await findCheckin(student.uid, window.examPaperId) : null;
  const serverNow = new Date().toISOString();
  // Where they were marked present. A check-in at another centre is allowed and
  // recorded by its code; the name is looked up so the receipt reads as a place.
  const centre = !checkin
    ? student.centre_name
    : checkin.centre_code === student.centre_code
      ? student.centre_name
      : await centreName(checkin.centre_code);

  if (attempt?.status === "submitted" || phase === "over") {
    const handedIn = attempt?.status === "submitted";
    return (
      <>
        <Head title="Exam" />
        {phase === "over" ? <ClosedNote started={handedIn} /> : null}
        {handedIn ? (
          <Receipt
            paper={paper.name}
            receipt={attempt.receipt ?? null}
            handedInIso={new Date(attempt.submitted_at ?? attempt.deadline_at).toISOString()}
            answered={Object.keys(attempt.answers ?? {}).length}
            total={paper.question_count ?? 0}
            centre={centre}
          />
        ) : null}
        <PapersSat rows={received.filter((r) => r.receipt !== attempt?.receipt)} />
      </>
    );
  }

  if (phase === "before") {
    return (
      <>
        <PaperHero name={paper.name} startsAt={window.startsAt.toISOString()} minutes={window.durationMinutes} />
        <OpensIn at={window.startsAt.toISOString()} serverNowIso={serverNow} />
        <CentreCard name={student.centre_name} />
        <FourRules />
        {window.requiresCheckin ? (
          <button type="button" className="k-btn" disabled>
            Check-in opens {ist(window.opensAt, { hour: "numeric", minute: "2-digit" })}
          </button>
        ) : null}
        <PapersSat rows={received} />
      </>
    );
  }

  if (window.requiresCheckin && !checkin) {
    return <CheckIn centreName={student.centre_name} />;
  }

  // Checked in (or no check-in needed). The runner takes over: its own waiting
  // room until the paper opens, then the paper.
  return (
    <LiveExam
      variant="app"
      uid={student.uid}
      token=""
      api="/api/app/exam"
      paperKey={window.examPaperCode}
      label={paper.name}
      name={firstName(student.name)}
      classLabel={student.class}
      centreCode={checkin?.centre_code ?? student.centre_code}
      centreName={centre}
      questionCount={paper.question_count ?? 0}
      durationMinutes={window.durationMinutes}
      windowClosesIso={window.endsAt.toISOString()}
      startsAtIso={window.startsAt.toISOString()}
      serverNowIso={serverNow}
    />
  );
}

async function centreName(code: string): Promise<string> {
  const rows = (await sql`
    select centre_name from students where centre_code = ${code} and centre_name is not null limit 1
  `) as { centre_name: string }[];
  return rows[0]?.centre_name ?? code;
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

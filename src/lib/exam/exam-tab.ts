import { windowFor, phaseOf } from "@/lib/exam/schedule";
import { paperByCode } from "@/lib/exam/phases";
import { findCheckin } from "@/lib/exam/checkin";
import { findAttempt } from "@/lib/exam/attempts";
import { getPaper } from "@/lib/exam/papers";
import { questionsPerStudent } from "@/lib/exam/question-check";
import { sql } from "@/lib/exam/db";
import { firstName } from "@/lib/exam/portal-auth";
import type { Student } from "@/lib/exam/db";

/**
 * Which face the Exam tab shows, and everything that face needs.
 *
 * Decided on the server from the paper's own row and never from the phone's
 * clock. Shared by the website's Exam tab (src/app/app/(shell)/exam/page.tsx)
 * and the native app's GET /api/m/v1/exam, so the two can never disagree about
 * whether a child may check in or start.
 *
 *   none     "No exam right now", and every receipt this student holds
 *   closed   the paper has closed or been handed in; the receipt if any
 *   before   the paper, date, time, length, a countdown, the centre, the rules
 *   checkin  scan the desk code, or type the six digits
 *   paper    checked in (or none needed): the runner — waiting room, start, paper
 */
export type ReceivedRow = { name: string; receipt: string; submitted_at: string };

export type ExamTab =
  | { face: "none"; received: ReceivedRow[] }
  | {
      face: "closed";
      over: boolean;
      handedIn: { paper: string; receipt: string | null; handedInIso: string; answered: number; total: number; centre: string } | null;
      received: ReceivedRow[];
    }
  | {
      face: "before";
      paper: string;
      startsAt: string;
      opensAt: string;
      minutes: number;
      requiresCheckin: boolean;
      centre: string;
      serverNow: string;
      received: ReceivedRow[];
    }
  | { face: "checkin"; centre: string }
  | {
      face: "paper";
      uid: string;
      paperKey: string;
      label: string;
      name: string;
      classLabel: string;
      centreCode: string;
      centre: string;
      questionCount: number;
      durationMinutes: number;
      closesAt: string;
      startsAt: string;
      serverNow: string;
    };

export async function examTabFor(student: Student): Promise<ExamTab> {
  const window = await windowFor(student);
  const received = await receiptsFor(student.uid);

  if (!window) return { face: "none", received };

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
    return {
      face: "closed",
      over: phase === "over",
      handedIn: handedIn
        ? {
            paper: paper.name,
            receipt: attempt.receipt ?? null,
            handedInIso: new Date(attempt.submitted_at ?? attempt.deadline_at).toISOString(),
            answered: Object.keys(attempt.answers ?? {}).length,
            total: paper.question_count ?? 0,
            centre,
          }
        : null,
      received: received.filter((r) => r.receipt !== attempt?.receipt),
    };
  }

  if (phase === "before") {
    return {
      face: "before",
      paper: paper.name,
      startsAt: window.startsAt.toISOString(),
      opensAt: window.opensAt.toISOString(),
      minutes: window.durationMinutes,
      requiresCheckin: window.requiresCheckin,
      centre: student.centre_name,
      serverNow,
      received,
    };
  }

  if (window.requiresCheckin && !checkin) return { face: "checkin", centre: student.centre_name };

  // How many questions THIS student will answer: the set's size, or with a
  // choice of subjects, the compulsory part and their chosen ones. The paper's
  // own question_count is empty for December, which drew "0 questions".
  const set = getPaper(window.paperId);
  const questionCount = set ? questionsPerStudent(set.questions, set.choice ?? null) : (paper.question_count ?? 0);

  return {
    face: "paper",
    uid: student.uid,
    paperKey: window.examPaperCode,
    label: paper.name,
    name: firstName(student.name),
    classLabel: student.class,
    centreCode: checkin?.centre_code ?? student.centre_code,
    centre,
    questionCount,
    durationMinutes: window.durationMinutes,
    closesAt: window.endsAt.toISOString(),
    startsAt: window.startsAt.toISOString(),
    serverNow,
  };
}

async function centreName(code: string): Promise<string> {
  const rows = (await sql`
    select centre_name from students where centre_code = ${code} and centre_name is not null limit 1
  `) as { centre_name: string }[];
  return rows[0]?.centre_name ?? code;
}

/** Every paper this student has handed in through the app, with its receipt. */
async function receiptsFor(uid: string): Promise<ReceivedRow[]> {
  return (await sql`
    select p.name, a.receipt, coalesce(a.submitted_at, a.deadline_at)::text as submitted_at
      from attempts a join exam_papers p on p.id = a.exam_paper_id
     where a.uid = ${uid} and a.status = 'submitted' and a.receipt is not null
     order by a.submitted_at desc
  `) as ReceivedRow[];
}

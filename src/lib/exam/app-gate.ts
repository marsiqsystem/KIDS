import { sessionClaims } from "@/lib/app/session";
import { findStudentForSession } from "@/lib/app/devices";
import { sql } from "./db";
import { windowFor, phaseOf, type ExamWindow, type Phase } from "./schedule";
import { getPaper, type Paper } from "./papers";
import { findCheckin, type Checkin } from "./checkin";
import type { Student } from "./db";

/**
 * The gate on the app's exam endpoints -- Phase 2 and everything after July.
 *
 * July's gate (api-gate.ts) had no session: the admit-card QR was the
 * credential, so a borrowed phone could scan the same card and carry on. That
 * cannot be the rule now. Students who registered in the app have no printed
 * card, and it was ruled on 14 September 2026 that carrying on on another phone
 * is the invigilator's decision, not the student's. So this gate asks three
 * things July's never did:
 *
 *   1. Who is signed in, on which phone -- the app session, with the same
 *      one-account-one-phone rule as every other screen.
 *   2. Have they checked in at a centre, if the paper requires it.
 *   3. Is this the phone the paper is running on. A paper is bound to the phone
 *      it was started on; another phone is refused until an invigilator
 *      releases it (checkin.ts releasePaper).
 */

export type AppExamContext = {
  student: Student;
  deviceId: string;
  window: ExamWindow;
  paper: Paper;
  phase: Phase;
  checkin: Checkin | null;
};

export type AppGateResult =
  | { ok: true; ctx: AppExamContext }
  | { ok: false; status: number; body: { ok: false; reason: string; message: string } };

const fail = (status: number, reason: string, message: string): AppGateResult => ({
  ok: false,
  status,
  body: { ok: false, reason, message },
});

export async function appGate(opts: { requireCheckin: boolean }): Promise<AppGateResult> {
  const claims = await sessionClaims();
  if (!claims) return fail(401, "signed_out", "You are signed out. Sign in again to carry on.");

  // An exam needs to know which phone it is on. A session from before phones
  // were recorded has none; signing in again fixes it in a minute, and there is
  // no honest way to apply rule 3 without it.
  if (!claims.deviceId) {
    return fail(401, "no_device", "Sign out and sign in again on this phone before you start the paper.");
  }

  const found = await findStudentForSession(claims.uid);
  if (!found) return fail(401, "signed_out", "You are signed out. Sign in again to carry on.");
  if (found.boundTo && found.boundTo !== claims.deviceId) {
    return fail(401, "moved", "Your account was opened on another phone, so this one was signed out.");
  }

  const student = found.student;
  const window = await windowFor(student);
  if (!window) return fail(409, "no_window", "No paper is open for you.");

  const paper = getPaper(window.paperId);
  if (!paper) return fail(503, "paper_missing", "This paper has not been loaded. Tell your invigilator.");

  const checkin = window.requiresCheckin ? await findCheckin(student.uid, window.examPaperId) : null;
  if (opts.requireCheckin && window.requiresCheckin && !checkin) {
    return fail(403, "not_checked_in", "Scan the code at your invigilator's desk first.");
  }

  return {
    ok: true,
    ctx: { student, deviceId: claims.deviceId, window, paper, phase: phaseOf(window), checkin },
  };
}

/**
 * Bind a running paper to this phone, or refuse.
 *
 * The first phone to open the paper takes it. After that only that phone may
 * save or submit, until an invigilator releases it -- which clears the binding,
 * so the next phone to open it takes it instead.
 */
export async function bindPaperToPhone(uid: string, examPaperId: string, deviceId: string): Promise<boolean> {
  const rows = (await sql`
    update attempts set device_hash = coalesce(device_hash, ${deviceId})
     where uid = ${uid} and exam_paper_id = ${examPaperId}::bigint
    returning device_hash
  `) as { device_hash: string | null }[];
  return rows[0]?.device_hash === deviceId;
}

export const OTHER_PHONE = {
  ok: false as const,
  reason: "other_phone",
  message:
    "Your paper is running on another phone. If that phone has stopped working, ask your invigilator to move your paper to this one.",
};

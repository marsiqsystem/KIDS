import { openPortal } from "./portal-auth";
import { windowFor, phaseOf, type ExamWindow, type Phase } from "./schedule";
import { getPaper, type Paper } from "./papers";
import type { Student } from "./db";

/**
 * The gate on every exam endpoint.
 *
 * Each request re-verifies the QR signature from scratch. There is no session
 * and no cookie, on purpose: the admit card IS the credential, so a student
 * whose phone dies can pick up a borrowed one, scan the same card and carry on.
 * A cookie would have made that impossible, which is precisely the thing the FAQ
 * promises will work.
 */

export type ExamContext = {
  student: Student;
  window: ExamWindow;
  paper: Paper;
  phase: Phase;
};

export type GateFailure = {
  status: number;
  body: { ok: false; reason: string; message: string };
};

export type GateResult = { ok: true; ctx: ExamContext } | ({ ok: false } & GateFailure);

const fail = (status: number, reason: string, message: string): GateResult => ({
  ok: false,
  status,
  body: { ok: false, reason, message },
});

export async function gate(id: unknown, token: unknown): Promise<GateResult> {
  const gated = await openPortal(String(id ?? ""), String(token ?? ""));

  if (!gated.ok) {
    // The same four refusals the portal page renders, in JSON.
    const message =
      gated.reason === "bad_signature"
        ? "This link could not be verified. Scan the QR code on your own admit card."
        : gated.reason === "not_found"
          ? "That Unique ID is not on the SET 2026 register."
          : gated.reason === "no_class"
            ? "We do not hold your class, so we cannot give you a paper. Show this screen to your exam coordinator."
            : "This link is incomplete. Scan the QR code on your admit card again.";
    return fail(gated.reason === "bad_signature" ? 403 : 400, gated.reason, message);
  }

  const student = gated.student;
  const window = windowFor(student);
  if (!window) {
    return fail(409, "no_window", "No exam is scheduled for you.");
  }

  const paper = getPaper(window.paperId);
  if (!paper) {
    // Should never happen for a class we hold (IX/X/XI/XII all have a paper), but
    // if an id ever fails to resolve, say so plainly rather than handing a child
    // an empty exam and letting them think they have sat it.
    return fail(503, "paper_missing", `The paper ${window.paperId} has not been loaded.`);
  }

  return { ok: true, ctx: { student, window, paper, phase: phaseOf(window) } };
}

/**
 * Answers, as the client sends them: { "0": 2, "3": 1 }.
 *
 * Validated to the actual shape of the actual paper. A client can send anything
 * at all — option 7 of a 4-option question, question 900 of a 50-question paper,
 * a string where a number goes — and none of it may reach the database or the
 * marker.
 */
export function cleanAnswers(raw: unknown, paper: Paper): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const clean: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const q = Number(key);
    if (!Number.isInteger(q) || q < 0 || q >= paper.questions.length) continue;
    if (typeof value !== "number" || !Number.isInteger(value)) continue;
    if (value < 0 || value >= paper.questions[q].options.length) continue;
    clean[String(q)] = value;
  }
  return clean;
}

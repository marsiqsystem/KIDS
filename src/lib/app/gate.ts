import { redirect } from "next/navigation";
import { sessionClaims } from "@/lib/app/session";
import { findStudentForSession } from "@/lib/app/devices";
import { logAppEvent } from "@/lib/app/accounts";
import type { Student } from "@/lib/exam/db";

/**
 * The one place a signed-in page finds out who is looking at it.
 *
 * Called from the shell layout AND from any page that needs the student — not
 * passed down from the layout as a prop. A layout does not re-run on every
 * navigation within its subtree, so a page that trusted a prop from it would
 * be trusting a check that may not have happened on this request. Each page
 * asks for itself; the session is a cookie read and one indexed lookup.
 *
 * The register is still the authority on who exists. A session cookie signed
 * for a student who has since been removed gets nothing.
 *
 * Phase 0 added the device rule to this same function, on purpose: it is the
 * only choke point every page and every server action already passes through,
 * so putting the check anywhere else would have meant twenty places to forget
 * it. The lookup it needs was folded into the query that was happening anyway
 * (see findStudentForSession), so the rule costs one column, not one query.
 */
export type StudentCheck =
  | { ok: true; student: Student }
  | { ok: false; reason: "signed_out" | "moved" };

/**
 * The same check without the redirect, for the native app's API, which
 * answers 401 with a reason instead of sending a browser to a page.
 */
export async function checkStudent(): Promise<StudentCheck> {
  const claims = await sessionClaims();
  if (!claims) return { ok: false, reason: "signed_out" };

  const found = await findStudentForSession(claims.uid);
  if (!found) return { ok: false, reason: "signed_out" };

  const { student, boundTo } = found;

  /**
   * One account, one phone at a time.
   *
   * Enforced only when all three facts are present: the account is bound, this
   * session says which phone it is, and they disagree. Any missing piece means
   * the rule cannot be applied honestly, and an unenforceable rule must not
   * throw a child out of their own account — a pre-Phase-0 session, a client
   * that sent no id, an account claimed before this shipped. Those pass, and
   * the next sign-in binds them properly.
   *
   * When it does fire, the student who was displaced is the one who gets the
   * sentence, because they are the person who needs to know: somebody signed
   * into this account somewhere else. That is the August dispute happening in
   * front of them instead of three weeks later in an email nobody can answer.
   */
  if (boundTo && claims.deviceId && boundTo !== claims.deviceId) {
    await logAppEvent(claims.uid, "device_evicted", { session: claims.deviceId, bound: boundTo });
    return { ok: false, reason: "moved" };
  }

  return { ok: true, student };
}

export async function requireStudent(): Promise<Student> {
  const check = await checkStudent();
  if (!check.ok) redirect(check.reason === "moved" ? "/app/sign-in?moved=1" : "/app/sign-in");
  return check.student;
}

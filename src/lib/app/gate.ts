import { redirect } from "next/navigation";
import { sessionUid } from "@/lib/app/session";
import { findStudent, type Student } from "@/lib/exam/db";

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
 */
export async function requireStudent(): Promise<Student> {
  const uid = await sessionUid();
  if (!uid) redirect("/app/sign-in");

  const student = await findStudent(uid);
  if (!student) redirect("/app/sign-in");

  return student;
}

import { sql } from "@/lib/exam/db";
import { findAccount } from "@/lib/app/accounts";
import { verifyPassword } from "@/lib/app/passwords";

/**
 * "Delete my account" — what both app stores require a student to be able to
 * do from inside the app, and what the website offers too, for anybody who has
 * uninstalled it.
 *
 * WHAT GOES — Umar's ruling, 9 Oct 2026: the APP's data, all of it.
 *   app_accounts         the password, the lock-out counter
 *   app_devices          every phone, and its push token
 *   app_subjects, app_answers, app_sets, app_notice_reads
 *                        the daily loop and what was read
 *   coaching_marks, coaching_presence
 *                        the day's ticks and the room
 *   app_account_requests a claim or reset waiting in the office
 *   app_events           the app's own audit of this child
 *
 * WHAT STAYS, and the screen says so before the tap: the register entry and
 * every exam result and attempt. Those are KIDS' institutional record, the same
 * rows the institute publishes from; deleting an app does not unsit a paper.
 * Batch membership stays too — the office put the child on it, and only the
 * office takes them off. A child who comes back claims again and starts fresh.
 *
 * One transaction, so a dropped connection never leaves half an account. The
 * fact that it happened is written to admin_events (actor "student"), which is
 * the office's audit rather than the child's data: without it, an account that
 * vanished would look like a fault.
 */
const CONFIRM_WORD = "DELETE";

export type DeleteResult =
  | { ok: true }
  | { ok: false; field: "password" | "confirm"; message: string };

export async function deleteAppAccount(uid: string, password: string, confirm: string): Promise<DeleteResult> {
  if (confirm.trim().toUpperCase() !== CONFIRM_WORD) {
    return { ok: false, field: "confirm", message: `Type ${CONFIRM_WORD} to show you mean it.` };
  }

  // A password the child chose is asked for again. An account on a one-time
  // password (issued by the office, or opened by an approval) has none the
  // child knows, so the typed word is the whole confirmation.
  const account = await findAccount(uid);
  if (account && !account.must_change) {
    if (!password) return { ok: false, field: "password", message: "Type your password." };
    if (!(await verifyPassword(password, account.password_hash))) {
      return { ok: false, field: "password", message: "That is not your password. Nothing has been deleted." };
    }
  }

  await sql.transaction([
    sql`delete from app_devices where uid = ${uid}`,
    sql`delete from app_subjects where uid = ${uid}`,
    sql`delete from app_answers where uid = ${uid}`,
    sql`delete from app_sets where uid = ${uid}`,
    sql`delete from app_notice_reads where uid = ${uid}`,
    sql`delete from coaching_marks where uid = ${uid}`,
    sql`delete from coaching_presence where uid = ${uid}`,
    sql`delete from app_account_requests where uid = ${uid}`,
    sql`delete from app_events where uid = ${uid}`,
    sql`delete from app_accounts where uid = ${uid}`,
    sql`
      insert into admin_events (actor, action, target_kind, target_id, detail)
      values ('student', 'app_account_deleted', 'student', ${uid}, null)
    `,
  ]);
  return { ok: true };
}

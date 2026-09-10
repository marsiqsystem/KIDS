import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "@/lib/admin/staff";
import { logAppEvent } from "@/lib/app/accounts";
import { hashPassword } from "@/lib/app/passwords";
import { oneTimePassword } from "@/lib/admin/staff";

/**
 * The office end of the promise /app/reset makes.
 *
 * There is no SMS gateway and there never will be one — sending codes costs
 * money every month and this app is paid for by KIDS alone. So a forgotten
 * password is cleared by a person, and until now that person had to be somebody
 * at a terminal running `scripts/set-app-password.ts`. This is the same thing
 * from the console, which means it can be done by a named account, in the
 * office, while the child is standing there.
 *
 * Two groups need it, and neither is small:
 *
 *   * **1,061 of 9,714 have no date of birth on the register**, so the claim
 *     flow has nothing to check them against and refuses. They can only get in
 *     with a password issued to them.
 *   * **Anybody who forgets.**
 *
 * Three properties this must keep:
 *
 *   1. It never reveals an existing password. There is nothing to reveal — only
 *      a scrypt hash. It can replace, never read.
 *   2. The issued password is ALWAYS `must_change = true`. An office-issued
 *      password is a one-time key and must never become the standing one.
 *   3. It clears the lockout. Half the resets the office will do are for a child
 *      who has just locked themselves out with three wrong guesses, and issuing
 *      a password they then cannot use for fifteen minutes would be a bug the
 *      office would report as "it doesn't work".
 *
 * What it deliberately does NOT do is unbind the phone. Signing in rebinds the
 * account to whatever handset it is signed in on (see bindDevice), so a child
 * on a new phone is already handled, and clearing the binding here would only
 * remove the record of which phone they were on before.
 */

export interface IssuedPassword {
  uid: string;
  password: string;
  /** False when this account had never been claimed — the password creates it. */
  existed: boolean;
}

export async function resetAppPassword(uid: string, by: string): Promise<IssuedPassword> {
  if (!/^\d{9}$/.test(uid)) throw new Error("That is not a nine-digit User ID.");

  const known = (await sql`select 1 as there from students where uid = ${uid}`) as unknown[];
  if (known.length === 0) throw new Error("Nobody on the register has that User ID.");

  const password = oneTimePassword();
  const hash = await hashPassword(password);

  // One statement for both cases. A child who has never claimed and a child who
  // has forgotten are the same job at the counter, and an office screen that
  // made the operator find out which one they were dealing with first would be
  // answering a question the database can answer itself.
  const rows = (await sql`
    insert into app_accounts (uid, password_hash, must_change)
    values (${uid}, ${hash}, true)
    on conflict (uid) do update
      set password_hash   = ${hash},
          password_set_at = now(),
          must_change     = true,
          failed_attempts = 0,
          locked_until    = null
    returning (xmax <> 0) as existed
  `) as { existed: boolean }[];

  const existed = rows[0]?.existed ?? false;

  // Both trails, because they answer different questions. admin_events says
  // which member of staff did it; app_events is what a family is shown when
  // they ask who has been into their daughter's account.
  await logAdminEvent(by, "app_password_reset", { kind: "student", id: uid }, { existed });
  await logAppEvent(uid, "password_set", { by });

  return { uid, password, existed };
}

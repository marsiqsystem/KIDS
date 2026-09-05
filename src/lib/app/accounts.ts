import { sql, findStudent, type Student } from "@/lib/exam/db";
import { hashPassword, verifyPassword } from "@/lib/app/passwords";

/**
 * Who may open the student app, and what happens when they cannot.
 *
 * Every refusal in here is a sentence a fourteen-year-old has to read on a
 * 360px screen, so the shapes returned are named after what went wrong rather
 * than after an HTTP status. Design 4a is explicit that the two failures must
 * not be the same sentence: an unknown ID names nobody, a wrong password names
 * the student back to them. That is not an oversight — on a shared handset,
 * seeing someone else's name is the fastest way to realise you are typing into
 * your sister's account.
 */

/** Three wrong passwords, then fifteen minutes. Design 4a. */
const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

export interface Account {
  uid: string;
  password_hash: string;
  must_change: boolean;
  failed_attempts: number;
  locked_until: Date | null;
}

export async function findAccount(uid: string): Promise<Account | null> {
  const rows = (await sql`
    select uid, password_hash, must_change, failed_attempts, locked_until
    from app_accounts
    where uid = ${uid}
  `) as Account[];
  return rows[0] ?? null;
}

/**
 * The audit trail. Never awaited by a caller that would make a student wait for
 * it, and never given anything derived from a password.
 */
export async function logAppEvent(
  uid: string,
  kind: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await sql`
      insert into app_events (uid, kind, detail)
      values (${uid}, ${kind}, ${detail ? JSON.stringify(detail) : null})
    `;
  } catch {
    // A failed audit write must never be the reason a child cannot sign in.
  }
}

// ------------------------------------------------------------------ sign in --

export type SignIn =
  | { ok: true; student: Student; mustChange: boolean }
  | { ok: false; reason: "malformed" }
  | { ok: false; reason: "unknown_id"; uid: string }
  | { ok: false; reason: "unclaimed"; student: Student }
  | { ok: false; reason: "locked"; student: Student; minutes: number }
  | { ok: false; reason: "bad_password"; student: Student; triesLeft: number };

export async function signIn(rawUid: string, password: string): Promise<SignIn> {
  const uid = (rawUid ?? "").replace(/\D/g, "");
  if (uid.length !== 9 || !password) return { ok: false, reason: "malformed" };

  const student = await findStudent(uid);
  // Deliberately checked before the account: a student who has never claimed
  // and a student who does not exist are different problems with different
  // answers, and conflating them sends a child to their school for an ID that
  // is already correct.
  if (!student) {
    await logAppEvent(uid, "unknown_id");
    return { ok: false, reason: "unknown_id", uid };
  }

  const account = await findAccount(uid);
  if (!account) return { ok: false, reason: "unclaimed", student };

  if (account.locked_until && account.locked_until.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.round((account.locked_until.getTime() - Date.now()) / 60_000));
    return { ok: false, reason: "locked", student, minutes };
  }

  if (!(await verifyPassword(password, account.password_hash))) {
    // The lock is counted and applied in one statement. Two phones guessing the
    // same account at once must not each read `failed_attempts = 2` and each
    // decide there is a try left.
    const rows = (await sql`
      update app_accounts
         set failed_attempts = failed_attempts + 1,
             locked_until = case
               when failed_attempts + 1 >= ${MAX_ATTEMPTS}
               then now() + (${LOCK_MINUTES} || ' minutes')::interval
               else null
             end
       where uid = ${uid}
      returning failed_attempts, locked_until
    `) as { failed_attempts: number; locked_until: Date | null }[];

    const failed = rows[0]?.failed_attempts ?? account.failed_attempts + 1;
    if (rows[0]?.locked_until) {
      await logAppEvent(uid, "locked", { minutes: LOCK_MINUTES });
      return { ok: false, reason: "locked", student, minutes: LOCK_MINUTES };
    }
    await logAppEvent(uid, "bad_password");
    return { ok: false, reason: "bad_password", student, triesLeft: MAX_ATTEMPTS - failed };
  }

  await sql`
    update app_accounts
       set failed_attempts = 0, locked_until = null, last_sign_in_at = now()
     where uid = ${uid}
  `;
  await logAppEvent(uid, "signin");
  return { ok: true, student, mustChange: account.must_change };
}

// -------------------------------------------------------------------- claim --

export type Claim =
  | { ok: true; student: Student }
  | { ok: false; reason: "malformed" }
  | { ok: false; reason: "unknown_id"; uid: string }
  | { ok: false; reason: "already_claimed"; student: Student }
  | { ok: false; reason: "no_dob"; student: Student }
  | { ok: false; reason: "wrong_dob" };

/**
 * "I sat SET 2026 — claim my account."
 *
 * The proof is the date of birth on the register, which is printed on the admit
 * card the student is holding. It is a weak secret and is not pretended to be
 * anything else: it keeps a stranger who has only guessed at a nine-digit
 * number out, and that is all it is for. The exam has its own gate.
 *
 * 1,061 of the 9,714 children on the register have no date of birth recorded.
 * They cannot pass this and are not asked to guess: `no_dob` sends them down
 * the same route as a forgotten password, where a teacher sets it by hand.
 */
export async function claimAccount(
  rawUid: string,
  dob: string,
  password: string,
): Promise<Claim> {
  const uid = (rawUid ?? "").replace(/\D/g, "");
  if (uid.length !== 9) return { ok: false, reason: "malformed" };

  const student = await findStudent(uid);
  if (!student) {
    await logAppEvent(uid, "unknown_id", { at: "claim" });
    return { ok: false, reason: "unknown_id", uid };
  }

  if (await findAccount(uid)) return { ok: false, reason: "already_claimed", student };
  if (!student.dob) return { ok: false, reason: "no_dob", student };

  // Both sides normalised to DD-MM-YYYY. Every one of the 8,653 dates on the
  // register is stored in exactly that shape, but a typed `1-1-2009` should
  // still match a printed `01-01-2009`.
  if (normaliseDob(dob) !== normaliseDob(student.dob)) {
    await logAppEvent(uid, "bad_dob");
    return { ok: false, reason: "wrong_dob" };
  }

  await sql`
    insert into app_accounts (uid, password_hash)
    values (${uid}, ${await hashPassword(password)})
    on conflict (uid) do nothing
  `;
  await logAppEvent(uid, "claim");
  return { ok: true, student };
}

/** `1-1-2009`, `01-01-2009` and `01/01/2009` are the same date. */
function normaliseDob(raw: string): string {
  const parts = (raw ?? "").trim().split(/[-/.\s]+/);
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return "";
  return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
}

// ------------------------------------------------------------ set password --

/** Used by the claim flow and, later, by a student changing their own password. */
export async function setPassword(uid: string, password: string): Promise<void> {
  await sql`
    update app_accounts
       set password_hash = ${await hashPassword(password)},
           password_set_at = now(),
           must_change = false,
           failed_attempts = 0,
           locked_until = null
     where uid = ${uid}
  `;
  await logAppEvent(uid, "password_set");
}

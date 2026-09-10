/**
 * Set a student's app password by hand — the KIDS office half of the promise
 * made on /app/reset.
 *
 *   node --env-file=.env.local scripts/set-app-password.ts 213999417
 *   node --env-file=.env.local scripts/set-app-password.ts 213999417 --password="chosen one"
 *   node --env-file=.env.local scripts/set-app-password.ts 213999417 --status
 *
 * Why this has to exist
 * ---------------------
 * Two groups of children cannot get into the app without it, and neither is
 * small:
 *
 *   * **1,061 of 9,714 have no date of birth on the register**, so the claim
 *     flow has nothing to check them against and says so. Every demo account is
 *     in this group too, which is why the test account cannot be used to
 *     rehearse a successful claim.
 *   * **Anyone who forgets their password.** There is no SMS gateway to pay
 *     for, so there is no code to send. /app/reset says a person clears it.
 *
 * That screen once told students "your school signs in and clears the password"
 * and nothing behind it existed. It no longer says that, and the office end now
 * exists as a SCREEN as well — /admin, Students tab, admin accounts only, which
 * is where a forgotten password should be cleared while the child is standing
 * there. This script remains for the jobs a screen is bad at: setting a chosen
 * password, doing it in bulk, and working when nobody can sign in to /admin.
 *
 * What it deliberately does NOT do
 * --------------------------------
 * It never reads or reveals an existing password — there is nothing to read,
 * only a scrypt hash. It cannot tell you what a child's password was; it can
 * only replace it.
 *
 * The replacement is always `must_change = true`, so an office-issued password
 * is a one-time key and never becomes the account's standing password. The
 * student is made to choose their own at the next sign-in.
 */
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { scrypt as scryptCb, randomBytes as saltBytes } from "node:crypto";
import { promisify } from "node:util";

// Typed the same way src/lib/app/passwords.ts types it: promisify's inferred
// signature drops the options argument, which is where N lives.
const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local ...");
  process.exit(1);
}
const sql = neon(url);

const args = process.argv.slice(2);
const uid = (args.find((a) => /^\d{9}$/.test(a)) ?? "").trim();
const given = args.find((a) => a.startsWith("--password="))?.slice("--password=".length);
const statusOnly = args.includes("--status");

if (!uid) {
  console.error("Give a 9-digit User ID.\n  node --env-file=.env.local scripts/set-app-password.ts 213999417");
  process.exit(1);
}

/**
 * The same scrypt format src/lib/app/passwords.ts writes and reads:
 * `s1$<salt>$<hash>`, both base64url, 16-byte salt, 32-byte key, N=2^14.
 *
 * Repeated here rather than imported because this is a plain node script and
 * that file sits behind the "@/" path alias, which only the Next build
 * resolves. If the two ever disagree, THAT FILE WINS — it is the one the app
 * authenticates with, and verifyPassword() refuses anything whose prefix,
 * segment count or byte lengths do not match, so a drift here does not produce
 * a weak password: it produces an account nobody can sign in to.
 *
 * The check at the bottom of this script exists for exactly that reason.
 */
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

async function hashPassword(password: string): Promise<string> {
  const salt = saltBytes(SALT_BYTES);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_BYTES, SCRYPT);
  return `s1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Read it back the way the app will, before promising the student it works. */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "s1") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_BYTES, SCRYPT);
  return key.equals(expected);
}

/**
 * A password a teacher can read down a phone line without spelling it out.
 * No l/1/O/0, no symbols — it is typed once, on a phone keyboard, by a child
 * who is about to replace it anyway.
 */
function readablePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const [student] = (await sql`
  select uid, name, class, school_name, dob, is_demo from students where uid = ${uid}
`) as { uid: string; name: string; class: string; school_name: string; dob: string | null; is_demo: boolean }[];

if (!student) {
  console.error(`No student with ID ${uid}. The register is the authority on who exists.`);
  process.exit(1);
}

const [account] = (await sql`
  select claimed_at, password_set_at, must_change, last_sign_in_at, current_device_id
  from app_accounts where uid = ${uid}
`) as {
  claimed_at: Date; password_set_at: Date; must_change: boolean;
  last_sign_in_at: Date | null; current_device_id: string | null;
}[];

console.log(`\n  ${student.uid}  ${student.name}`);
console.log(`  ${student.class} · ${student.school_name}${student.is_demo ? " · DEMO" : ""}`);
console.log(`  date of birth on register: ${student.dob ?? "none — cannot claim without this"}`);
console.log(
  account
    ? `  account: claimed ${account.claimed_at.toISOString().slice(0, 10)}` +
      `, must_change=${account.must_change}` +
      `, last sign-in ${account.last_sign_in_at?.toISOString().slice(0, 10) ?? "never"}` +
      `, bound device ${account.current_device_id ? "yes" : "none"}`
    : `  account: none — this child has never set a password`,
);

if (statusOnly) process.exit(0);

const password = given ?? readablePassword();
const hash = await hashPassword(password);

// Prove the hash reads back before it is written and a student is sent to a
// door with it. Twice before in this project a well-formed artifact was shipped
// that nothing could actually read.
if (!(await verifyPassword(password, hash))) {
  console.error("\n  The hash did not verify against its own password. Refusing to write it.");
  console.error("  Check this file's scrypt parameters against src/lib/app/passwords.ts.\n");
  process.exit(1);
}

// Insert OR update: setPassword() in accounts.ts is an UPDATE and assumes a row
// already exists, which is exactly what is not true for the children this
// script is for — they have never claimed.
await sql`
  insert into app_accounts (uid, password_hash, must_change)
  values (${uid}, ${hash}, true)
  on conflict (uid) do update
    set password_hash   = excluded.password_hash,
        password_set_at = now(),
        must_change     = true,
        failed_attempts = 0,
        locked_until    = null
`;

// The event, never the password. app_events is read by people.
await sql`
  insert into app_events (uid, kind, detail)
  values (${uid}, 'password_set', ${JSON.stringify({ by: "office", script: "set-app-password" })})
`;

console.log(`\n  Password set. Give the student this once:\n`);
console.log(`      ${password}\n`);
console.log(`  They must change it at their next sign-in (must_change is set).`);
console.log(`  It is not stored anywhere in readable form — if it is lost, run this again.\n`);

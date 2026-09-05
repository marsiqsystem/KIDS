import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

/**
 * Password hashing for the student app.
 *
 * scrypt from node:crypto, not bcrypt or argon2 from npm. Two reasons, and the
 * second is the real one:
 *
 *   1. It is already here. Every dependency added to this repo is a dependency
 *      somebody has to keep patched for as long as the app runs, and there is
 *      nobody to do that but Umar.
 *   2. scrypt is memory-hard, which is the property that matters. These
 *      passwords protect children's accounts and will, realistically, be short
 *      and guessable — a birth year, a school name. The cost of a guess is the
 *      only defence such a password has.
 *
 * N = 2^14 costs ~16 MB and ~50 ms per verification on Vercel's Node runtime.
 * That is a deliberate ceiling: high enough to make offline guessing expensive,
 * low enough that a class of forty signing in at once does not time out.
 */
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

/** The stored form: `s1$<salt>$<hash>`, both base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_BYTES, SCRYPT);
  return `s1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/**
 * Does `password` produce `stored`?
 *
 * Returns false rather than throwing on a malformed hash: a corrupt row must
 * refuse the sign-in, not crash the sign-in page for everybody.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "s1") return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "base64url");
    expected = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;

  const key = await scrypt(password.normalize("NFKC"), salt, KEY_BYTES, SCRYPT);
  // Constant time: a byte-by-byte early exit leaks how much of a guess was
  // right, exactly as it would in verifyUidToken.
  return timingSafeEqual(key, expected);
}

/**
 * Is this good enough to be a password here?
 *
 * Deliberately not the usual uppercase/symbol/number ritual. The cohort is
 * 9,714 vernacular-medium children, many on a shared handset, typing on a phone
 * keyboard that has to be switched to reach a symbol. A rule that forces `!` on
 * them produces `password1!` written on the inside of a pencil box, which is
 * worse than a long thing they can remember.
 *
 * Six characters, and it may not be the User ID they just typed — that one
 * check catches the single most likely bad password on this particular app.
 */
export function passwordProblem(password: string, uid: string): string | null {
  const p = password.normalize("NFKC");
  if (p.length < 6) return "Your password needs at least 6 characters.";
  if (p.length > 200) return "That password is too long.";
  if (p.replace(/\D/g, "") === uid && uid.length === 9) {
    return "Your password cannot be your User ID — anyone holding your admit card knows that number.";
  }
  return null;
}

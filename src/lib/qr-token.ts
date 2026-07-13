import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The signature carried in every printed admit-card QR code.
 *
 *   https://www.kidskolkata.org/portal?id=<uniqueId>&t=<token>
 *
 * This is a byte-for-byte port of `sign_uid()` in generate_admit_cards.py, the
 * Python that actually signed the 9,384 cards already in students' hands. Those
 * cards cannot be reissued, so this file is not free to change: get it wrong and
 * every QR code on the planet fails to verify, and we find out at 10:00 on exam
 * morning. Two details are easy to get wrong and both are load-bearing:
 *
 *   1. The HMAC key is the secret's 64 ASCII hex CHARACTERS -- not the 32 raw
 *      bytes they encode. Python did `secret.encode("ascii")`, so we do too.
 *   2. The SHA-256 digest is truncated to its first 12 bytes BEFORE base64url
 *      encoding, yielding exactly 16 unpadded characters.
 *
 * scripts/check-qr-tokens.ts replays this against every token we ever printed.
 */
export const QR_TOKEN_BYTES = 12;

/** Reproduces the token printed on a card. */
export function signUid(uid: string | number, secret: string): string {
  return createHmac("sha256", Buffer.from(secret, "ascii"))
    .update(String(uid), "ascii")
    .digest()
    .subarray(0, QR_TOKEN_BYTES)
    .toString("base64url");
}

/**
 * Is `token` the signature this secret produces for `uid`?
 *
 * Compared in constant time: a byte-by-byte early exit leaks, through timing,
 * how much of a guessed token was correct, which is enough to forge one.
 */
export function verifyUidToken(uid: string | number, token: string, secret: string): boolean {
  const expected = Buffer.from(signUid(uid, secret), "ascii");
  const given = Buffer.from(String(token), "ascii");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/**
 * The signing secret, from the environment.
 *
 * Never commit this. Anyone holding it can mint a valid admit card for any
 * student, real or invented.
 */
export function qrSecret(): string {
  const secret = process.env.KIDS_QR_SECRET?.trim();
  if (!secret) throw new Error("KIDS_QR_SECRET is not set — QR codes cannot be verified.");
  return secret;
}

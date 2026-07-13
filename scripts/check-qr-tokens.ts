/**
 * Proves the TypeScript QR verifier reproduces the tokens Python actually
 * printed on the admit cards.
 *
 *   npm run check:qr                       # synthetic fixture, no secrets needed
 *   npm run check:qr -- <vectors.json>     # every real token, needs KIDS_QR_SECRET
 *
 * The 9,384 cards in students' hands cannot be reissued. If this ever fails, do
 * NOT "fix" the vectors -- fix the code, or every QR code stops working.
 *
 * Real (uid, token) pairs are bearer credentials: whoever holds one can open
 * that student's portal. They live outside this repo. The committed fixture uses
 * a dummy secret and invented UIDs, so it proves algorithm parity while leaking
 * nothing.
 */
import { readFileSync } from "node:fs";
import { signUid, verifyUidToken } from "../src/lib/qr-token.ts";
import FIXTURE from "../src/lib/__fixtures__/qr-token-vectors.json" with { type: "json" };

type Vector = { uid: string; token: string };

const path = process.argv[2];
let secret: string;
let vectors: Vector[];
let label: string;

if (path) {
  const env = process.env.KIDS_QR_SECRET?.trim();
  if (!env) {
    console.error("KIDS_QR_SECRET is not set — cannot check real tokens.");
    process.exit(1);
  }
  secret = env;
  vectors = JSON.parse(readFileSync(path, "utf8")) as Vector[];
  label = `${vectors.length} REAL printed tokens`;
} else {
  secret = FIXTURE.secret;
  vectors = FIXTURE.vectors;
  label = `${vectors.length} synthetic vectors (dummy secret)`;
}

let mismatches = 0;
for (const { uid, token } of vectors) {
  const ours = signUid(uid, secret);
  if (ours !== token || !verifyUidToken(uid, token, secret)) {
    if (mismatches < 5) console.error(`  MISMATCH ${uid}: printed ${token}, we produce ${ours}`);
    mismatches++;
  }
}

// A verifier that says yes to everything would pass the loop above.
const [{ uid: sampleUid, token: sampleToken }] = vectors;
const rejectsTampered = !verifyUidToken(sampleUid, sampleToken.slice(0, -1) + "X", secret);
const rejectsOtherUid = !verifyUidToken(String(Number(sampleUid) + 1), sampleToken, secret);
const rejectsEmpty = !verifyUidToken(sampleUid, "", secret);

console.log(`checked : ${label}`);
console.log(`matched : ${vectors.length - mismatches}/${vectors.length}`);
console.log(`rejects tampered token : ${rejectsTampered}`);
console.log(`rejects token reused on another uid : ${rejectsOtherUid}`);
console.log(`rejects empty token : ${rejectsEmpty}`);

if (mismatches || !rejectsTampered || !rejectsOtherUid || !rejectsEmpty) {
  console.error("\nFAIL — the TypeScript port does not match the printed cards.");
  process.exit(1);
}
console.log("\nOK — every token verifies, and forgeries are rejected.");

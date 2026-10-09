import { json } from "@/lib/app/mobile-api";
import { NATIVE_LATEST, NATIVE_MINIMUM, NATIVE_NOTES, STORE } from "@/lib/app/native-build";

export const dynamic = "force-dynamic";

/**
 * Which native builds this server still serves (src/lib/app/native-build.ts).
 * No session needed: a phone too old to sign in is exactly the one that must
 * be able to ask.
 */
export async function GET() {
  return json({ ok: true, latest: NATIVE_LATEST, minimum: NATIVE_MINIMUM, notes: NATIVE_NOTES, store: STORE });
}

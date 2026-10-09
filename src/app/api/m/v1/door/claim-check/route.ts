import { NextRequest } from "next/server";
import { json } from "@/lib/app/mobile-api";
import { claimCheck } from "@/lib/app/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step one of claiming — see claimCheck. POST { uid } → { state }, one of
 * unknown | claimed | no_dob | ok. Says nothing sign-in does not already say.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return json({ ok: true, state: await claimCheck(String(body?.uid ?? "")) });
}

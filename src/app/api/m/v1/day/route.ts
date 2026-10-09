import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { markOfferedBlock, type BlockKind } from "@/lib/app/day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "I'm up", "Begin", "Done" — the website's markDay, for the native app.
 *
 * POST { kind } marks one block of today done — through markOfferedBlock, the
 * same check the website makes: only a block the student's own day is offering
 * right now. Anything else marks nothing.
 */
export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  const kind = String(body?.kind ?? "") as BlockKind;

  if (!(await markOfferedBlock(student, kind))) return json({ ok: false, message: "That is not open on your day." });
  return json({ ok: true });
}

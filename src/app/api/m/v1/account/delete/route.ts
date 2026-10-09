import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { findAccount } from "@/lib/app/accounts";
import { deleteAppAccount } from "@/lib/app/delete-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete my account, for the native app — the store requirement. Same function
 * as the website's (deleteAppAccount): the app's data goes, the register entry
 * and exam results stay.
 *
 * GET                           → { needsPassword }
 * POST { password, confirm }    → { ok: true } | { ok: false, field, message }
 *
 * The phone forgets its token on { ok: true }. Every other session dies with
 * the account too: findStudentForSession needs the account row, so a second
 * phone or an open browser is signed out on its next request.
 */
export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const account = await findAccount(student.uid);
  return json({ ok: true, needsPassword: Boolean(account && !account.must_change) });
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;
  const body = await request.json().catch(() => ({}));
  return json(await deleteAppAccount(student.uid, String(body?.password ?? ""), String(body?.confirm ?? "")));
}

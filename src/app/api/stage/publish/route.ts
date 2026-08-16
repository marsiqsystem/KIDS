import { NextResponse } from "next/server";
import { sql } from "@/lib/exam/db";
import { isAdmin } from "@/lib/admin/auth";

/**
 * The publish button, for real.
 *
 * Held down on stage, this is the request that opens 7,287 written results at
 * once. It is the same statement `scripts/publish-offline.ts` runs, with the
 * same refusals in front of it — a stage is a worse place than a terminal to
 * discover the table is empty.
 *
 * Admin cookie required. This endpoint publishes children's results to the
 * public internet; it cannot be reachable by anyone who wanders onto /stage.
 *
 * Idempotent: holding the button a second time re-stamps `offline_publish_at`
 * to now, which changes nothing that is already open. An operator who is not
 * sure whether it fired can simply hold it again.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: "Not signed in as admin." }, { status: 401 });
  }

  try {
    const [count] = (await sql`select count(*)::int as n from offline_results`) as unknown as
      { n: number }[];
    if (!count?.n) {
      return NextResponse.json(
        { ok: false, message: "There are no written results in the database to publish." },
        { status: 409 },
      );
    }

    // The same integrity gate the CLI applies: a row whose parts do not add up,
    // or whose answer sheet is the wrong length, must never go out.
    const [bad] = (await sql`
      select count(*)::int as n from offline_results
      where correct + wrong + blank <> total_q
         or length(outcome) <> total_q
         or length(marked) <> total_q
    `) as unknown as { n: number }[];
    if (bad?.n) {
      return NextResponse.json(
        { ok: false, message: `Refusing: ${bad.n} result row(s) do not add up. Nothing was published.` },
        { status: 409 },
      );
    }

    await sql`
      update results_meta
      set offline_published = true,
          offline_published_at = coalesce(offline_published_at, now()),
          offline_publish_at = now()
      where id = true`;

    return NextResponse.json(
      { ok: true, published: count.n },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "The database did not accept the change. Results are NOT published." },
      { status: 500 },
    );
  }
}

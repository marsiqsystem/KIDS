/**
 * Release the offline written paper's results — or hide them again.
 *
 *   node scripts/publish-offline.ts --status
 *   node scripts/publish-offline.ts --publish              # opens immediately
 *   node scripts/publish-offline.ts --publish --at 19:00   # opens at 7 PM IST
 *   node scripts/publish-offline.ts --publish --at "2026-08-20 19:00"
 *   node scripts/publish-offline.ts --unpublish            # hide again
 *
 * Authorising and opening are two different things, exactly as for the online
 * paper. `--publish` says the office stands behind the marks; `--at` says when
 * students may see them. Given both, the results open by themselves at that
 * moment — there is no cron to fire and nobody has to be awake to press
 * anything at 19:00.
 *
 * This is the ONLY step between a filled table and a published result. It
 * computes nothing and writes no marks: `scripts/import-offline-results.ts`
 * has already done all of that, which is what makes publishing instant. If the
 * numbers are wrong, unpublish, fix them upstream, re-import, publish again.
 *
 * The online paper has its own separate switch and is untouched here. A student
 * sat both on the same morning; they are released independently.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (match) process.env[match[1]] ??= match[2];
}
const sql = neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "");

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const valueOf = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

/** "19:00" today IST, or "YYYY-MM-DD HH:MM" IST, as an absolute instant. */
function istToDate(text: string): Date {
  const timeOnly = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (timeOnly) {
    const nowIst = new Date(Date.now() + 5.5 * 3600_000);
    const y = nowIst.getUTCFullYear();
    const m = String(nowIst.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nowIst.getUTCDate()).padStart(2, "0");
    text = `${y}-${m}-${d} ${timeOnly[1].padStart(2, "0")}:${timeOnly[2]}`;
  }
  const full = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!full) {
    console.error(`cannot read "${text}" as a time. Use 19:00 or "2026-08-20 19:00".`);
    process.exit(1);
  }
  const [, y, mo, d, h, mi] = full;
  // IST is UTC+5:30 and has no daylight saving, so this is exact.
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi) - 5.5 * 3600_000);
}

const IST = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";

async function status(): Promise<void> {
  const [m] = (await sql`
    select offline_published, offline_published_at, offline_publish_at,
           offline_computed_at, offline_totals
    from results_meta`) as any[];
  const [n] = (await sql`select count(*)::int n from offline_results`) as any[];
  const [q] = (await sql`select count(*)::int n from offline_question_stats`) as any[];

  const held = (await sql`
    select w.school_name, count(o.uid)::int sat
    from offline_withheld_schools w
    left join students s on s.school_name = w.school_name
    left join offline_results o on o.uid = s.uid
    group by w.school_name order by w.school_name`) as any[];
  const heldSat = held.reduce((t, r) => t + r.sat, 0);

  const open = m?.offline_published && m?.offline_publish_at
    && new Date(m.offline_publish_at) <= new Date();
  console.log(`results in the table   ${n.n.toLocaleString()}`);
  console.log(`question stats         ${q.n.toLocaleString()}`);
  console.log(`imported               ${IST(m?.offline_computed_at)}`);
  console.log(`authorised             ${m?.offline_published ? `YES, ${IST(m.offline_published_at)}` : "no"}`);
  console.log(`opens                  ${IST(m?.offline_publish_at)}`);
  console.log(`schools held back      ${held.length ? `${held.length} — ${heldSat.toLocaleString()} results stay shut` : "none"}`);
  console.log(`students can see it    ${open ? `YES — LIVE NOW${heldSat ? `, ${(n.n - heldSat).toLocaleString()} of them` : ""}` : "no"}`);
  for (const h of held) console.log(`                       · ${h.school_name} (${h.sat})`);
  if (m?.offline_totals && Object.keys(m.offline_totals).length) {
    const t = m.offline_totals;
    console.log(`\n${t.sat?.toLocaleString()} sat · ${t.absent?.toLocaleString()} absent · ` +
      `average ${t.average} · highest ${t.highest} · ${t.fullMarks} full marks`);
  }
}

async function main(): Promise<number> {
  if (has("--status") || args.length === 0) {
    await status();
    return 0;
  }

  if (has("--unpublish")) {
    await sql`
      update results_meta
      set offline_published = false, offline_publish_at = null
      where id = true`;
    console.log("hidden. Nothing was recomputed and no mark was touched.\n");
    await status();
    return 0;
  }

  if (!has("--publish")) {
    console.error("nothing to do. Use --status, --publish [--at HH:MM], or --unpublish.");
    return 1;
  }

  // Refuse to publish an empty or half-filled table. Publishing is the one
  // action here that a student sees, so it checks its own ground first.
  const [n] = (await sql`select count(*)::int n from offline_results`) as any[];
  const [q] = (await sql`select count(*)::int n from offline_question_stats`) as any[];
  const [s] = (await sql`select count(*)::int n from offline_section_stats`) as any[];
  const [bad] = (await sql`
    select count(*)::int n from offline_results
    where correct + wrong + blank <> total_q
       or length(marked) <> 100 or length(outcome) <> 100`) as any[];
  if (n.n === 0 || q.n === 0 || s.n === 0) {
    console.error(`refusing: results ${n.n}, question stats ${q.n}, section stats ${s.n}. ` +
      `Run scripts/import-offline-results.ts first.`);
    return 1;
  }
  if (bad.n > 0) {
    console.error(`refusing: ${bad.n} row(s) do not add up or have a malformed answer sheet.`);
    return 1;
  }

  // The withhold list is what keeps named schools shut once the switch is
  // thrown, and the app fails CLOSED if it cannot read the table — a missing
  // one would hold the entire cohort back rather than leak anybody. Either way
  // publishing without it is not the release that was asked for, so check it is
  // there before opening anything.
  const [table] = (await sql`select to_regclass('offline_withheld_schools') as t`) as any[];
  if (!table?.t) {
    console.error("refusing: offline_withheld_schools does not exist. " +
      "Run scripts/withhold-schools.ts --list to create it, and set the hold list first.");
    return 1;
  }
  const heldNow = (await sql`
    select count(distinct s.uid)::int n
    from offline_withheld_schools w join students s on s.school_name = w.school_name`) as any[];

  const at = valueOf("--at") ? istToDate(valueOf("--at")!) : new Date();
  await sql`
    update results_meta
    set offline_published = true,
        offline_published_at = now(),
        offline_publish_at = ${at.toISOString()}
    where id = true`;

  const shut = heldNow[0]?.n ?? 0;
  const scope = shut
    ? `${n.n.toLocaleString()} results, less ${shut.toLocaleString()} held back by school`
    : `${n.n.toLocaleString()} results`;
  console.log(at <= new Date()
    ? `\nPUBLISHED. ${scope} — visible now.\n`
    : `\nAUTHORISED. ${scope} — open by themselves at ${IST(at)} IST.\n`);
  await status();
  return 0;
}

process.exit(await main());

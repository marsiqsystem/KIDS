/**
 * Record which medium's question paper each candidate was handed.
 *
 *   node --env-file=.env.local scripts/set-student-medium.ts <schools.json>
 *   node --env-file=.env.local scripts/set-student-medium.ts --status
 *
 * The Bengali IX History and X Geography sections ask different questions from
 * the English paper, so the result page has to know which paper a candidate
 * actually sat before it can show them the right question, the right
 * explanation and the right revision video.
 *
 * This was briefly derived from `offline_withheld_schools`, which was wrong:
 * that table says what is being held back from publication, and it empties as
 * soon as everything is released. The medium is a permanent fact about exam
 * day and belongs on the student.
 *
 * The input is the same file the OMR evaluator reads, so the two cannot drift:
 *   Desktop\KIDS OMR 2026\bengali-medium-schools.json
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}
const sql = neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "");

async function status(): Promise<void> {
  const rows = (await sql`
    select medium, count(*)::int n from students where not is_demo
    group by medium order by medium`) as { medium: string; n: number }[];
  for (const r of rows) {
    console.log(`  ${(r.medium || "(default / English)").padEnd(22)} ${r.n.toLocaleString()}`);
  }
  const byClass = (await sql`
    select class, count(*)::int n from students
    where medium = 'BENGALI' and not is_demo group by class order by class`) as
    { class: string; n: number }[];
  if (byClass.length) {
    console.log("\n  BENGALI by class: " + byClass.map((r) => `${r.class} ${r.n}`).join(" · "));
  }
}

async function main(): Promise<number> {
  const arg = process.argv[2];
  if (!arg || arg === "--status") {
    await status();
    return 0;
  }

  const doc = JSON.parse(readFileSync(arg, "utf8")) as
    { medium: string; schools: string[] };
  const medium = String(doc.medium ?? "").trim().toUpperCase();
  const schools = (doc.schools ?? []).map((s) => String(s).trim()).filter(Boolean);
  if (!medium || !schools.length) {
    console.error(`${arg} names no medium or no schools.`);
    return 1;
  }

  // Refuse on a name that matches nobody. A school that quietly matches nothing
  // leaves its candidates on the English paper's questions, which is exactly
  // the failure this script exists to prevent, and it is silent.
  const known = (await sql`select distinct school_name from students`) as
    { school_name: string }[];
  const have = new Set(known.map((k) => k.school_name));
  const missing = schools.filter((s) => !have.has(s));
  if (missing.length) {
    console.error(`refusing: ${missing.length} school name(s) match no student:`);
    for (const m of missing) console.error(`   ${m}`);
    return 1;
  }

  await sql`
    alter table students add column if not exists medium text not null default ''`;
  await sql`update students set medium = '' where medium <> ''`;
  const done = (await sql`
    update students set medium = ${medium}
    where school_name = any(${schools}) returning uid`) as { uid: string }[];

  console.log(`${done.length.toLocaleString()} student(s) set to ${medium} ` +
    `across ${schools.length} school(s).\n`);
  await status();
  return 0;
}

process.exit(await main());

/**
 * Hold named schools back from the written paper's release — or let them go.
 *
 *   node scripts/withhold-schools.ts --list                 # who is held, and how many children
 *   node scripts/withhold-schools.ts --list-all             # every school in the roster, exact names
 *   node scripts/withhold-schools.ts --hold scripts/withheld-schools.json
 *   node scripts/withhold-schools.ts --release "Exact School Name"
 *   node scripts/withhold-schools.ts --release-all
 *
 * `scripts/publish-offline.ts` is one lever for the whole cohort. This is the
 * exception list in front of it: a child whose school is held sees the same
 * "not published yet" page they saw before the release, on /portal and on
 * /marksheet alike, while every other child's result is open.
 *
 * It writes NO marks and moves NO ranks. Held children sat the same paper and
 * are counted in every average, every cohort size and every rank exactly as
 * before; only the door to their own page is shut. That is what makes releasing
 * a school later a single delete with nothing to recompute — and what stops a
 * classmate's rank shifting under them when it happens.
 *
 * Matching is EXACT against `students.school_name`, because a near-match is the
 * one failure mode that matters here: a name that quietly matches nothing
 * publishes a school that was meant to be held. Any unmatched name aborts the
 * whole run before a single row is written, and prints the closest names it
 * found so the file can be corrected.
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

/** The table lives in schema.sql; provisioned here so the script stands alone. */
async function ensureTable(): Promise<void> {
  await sql`
    create table if not exists offline_withheld_schools (
      school_name text primary key,
      reason      text,
      added_at    timestamptz not null default now()
    )`;
}

/** Letters and digits only, folded — enough to catch spacing and punctuation drift. */
const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function list(): Promise<void> {
  const rows = (await sql`
    select w.school_name, w.reason, w.added_at,
           count(s.uid)::int  as enrolled,
           count(o.uid)::int  as sat
    from offline_withheld_schools w
    left join students s on s.school_name = w.school_name
    left join offline_results o on o.uid = s.uid
    group by w.school_name, w.reason, w.added_at
    order by w.school_name`) as any[];

  if (!rows.length) {
    console.log("No school is held back. A release opens every result at once.");
    return;
  }
  const sat = rows.reduce((n, r) => n + r.sat, 0);
  const enrolled = rows.reduce((n, r) => n + r.enrolled, 0);
  console.log(`${rows.length} school(s) held — ${sat.toLocaleString()} results stay shut ` +
    `(${enrolled.toLocaleString()} on the roster)\n`);
  for (const r of rows) {
    console.log(`  ${String(r.sat).padStart(4)} sat / ${String(r.enrolled).padStart(4)}  ${r.school_name}`);
  }
  const [total] = (await sql`select count(*)::int n from offline_results`) as any[];
  console.log(`\n${(total.n - sat).toLocaleString()} of ${total.n.toLocaleString()} results would be visible.`);
}

async function listAll(): Promise<void> {
  const rows = (await sql`
    select s.school_name, count(*)::int enrolled, count(o.uid)::int sat,
           exists (select 1 from offline_withheld_schools w
                   where w.school_name = s.school_name) as held
    from students s
    left join offline_results o on o.uid = s.uid
    group by s.school_name
    order by s.school_name`) as any[];
  console.log(`${rows.length} schools\n`);
  for (const r of rows) {
    console.log(`${r.held ? "HELD" : "    "}  ${String(r.sat).padStart(4)}/${String(r.enrolled).padStart(4)}  ${r.school_name}`);
  }
}

async function hold(file: string): Promise<number> {
  const doc = JSON.parse(readFileSync(file, "utf8")) as { reason?: string; schools: string[] };
  const wanted: string[] = doc.schools ?? [];
  if (!wanted.length) {
    console.error(`${file} lists no schools.`);
    return 1;
  }

  const known = (await sql`select distinct school_name from students`) as { school_name: string }[];
  const byFold = new Map(known.map((k) => [fold(k.school_name), k.school_name]));

  // Resolve every name BEFORE writing anything. A file with one bad line must
  // hold nothing at all, rather than hold twenty schools and leave the
  // twenty-first published without saying so.
  const resolved: string[] = [];
  const failed: string[] = [];
  for (const name of wanted) {
    if (byFold.has(fold(name))) resolved.push(byFold.get(fold(name))!);
    else failed.push(name);
  }

  if (failed.length) {
    console.error(`refusing: ${failed.length} name(s) match no school. Nothing was held.\n`);
    for (const name of failed) {
      const key = fold(name);
      const near = known
        .filter((k) => fold(k.school_name).includes(key.slice(0, 8)) || key.includes(fold(k.school_name).slice(0, 8)))
        .slice(0, 4);
      console.error(`  ✗ ${name}`);
      for (const n of near) console.error(`      did you mean: ${n.school_name}`);
    }
    return 1;
  }

  const duplicates = resolved.filter((n, i) => resolved.indexOf(n) !== i);
  if (duplicates.length) {
    console.error(`refusing: ${[...new Set(duplicates)].join(", ")} listed more than once.`);
    return 1;
  }

  for (const name of resolved) {
    await sql`
      insert into offline_withheld_schools (school_name, reason)
      values (${name}, ${doc.reason ?? null})
      on conflict (school_name) do update set reason = excluded.reason`;
  }
  console.log(`held ${resolved.length} school(s).\n`);
  await list();
  return 0;
}

async function main(): Promise<number> {
  await ensureTable();

  if (has("--list-all")) {
    await listAll();
    return 0;
  }
  if (has("--list") || args.length === 0) {
    await list();
    return 0;
  }
  if (has("--release-all")) {
    await sql`delete from offline_withheld_schools`;
    console.log("every school released. If the paper is published, all results are now visible.\n");
    await list();
    return 0;
  }
  if (has("--release")) {
    const name = valueOf("--release");
    if (!name) {
      console.error('--release needs a school name, exactly as --list prints it.');
      return 1;
    }
    const gone = (await sql`
      delete from offline_withheld_schools where school_name = ${name} returning school_name`) as any[];
    if (!gone.length) {
      console.error(`no held school is named "${name}". --list shows the exact names.`);
      return 1;
    }
    console.log(`released ${gone[0].school_name}. Its results are visible if the paper is published.\n`);
    await list();
    return 0;
  }
  if (has("--hold")) {
    const file = valueOf("--hold");
    if (!file) {
      console.error("--hold needs a JSON file, e.g. scripts/withheld-schools.json");
      return 1;
    }
    return hold(file);
  }

  console.error("nothing to do. Use --list, --list-all, --hold <file>, --release <name>, or --release-all.");
  return 1;
}

process.exit(await main());

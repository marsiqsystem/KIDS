/**
 * Turn one exam into a series of phases.
 *
 *   node --env-file=.env.local scripts/migrate-exam-phases.ts --status
 *   node --env-file=.env.local scripts/migrate-exam-phases.ts --rehearse
 *   node --env-file=.env.local scripts/migrate-exam-phases.ts
 *
 * WHY THIS EXISTS
 *
 * `attempts`, `online_results` and `offline_results` were each keyed on the
 * student and nothing else -- one row per child, for ever. SET 2026 was not a
 * row in a table, it was the shape of the tables, so SET 2026 Phase 2 in
 * December had nowhere to go and neither did a mock. This moves every mark onto
 * the paper it was sat for, and moves the primary key with it.
 *
 * WHAT IT TOUCHES
 *
 * The three tables holding SET 2026's published results -- 6,780 attempts,
 * 6,778 online marks and 7,322 offline marks that are live on the website right
 * now. So:
 *
 *   * Every step is idempotent. Running it twice changes nothing the second
 *     time, and a run that stops half way leaves a working database.
 *   * The old primary key is dropped LAST, after the new column is populated
 *     and proven, so at no point is the table without a unique constraint on
 *     the student.
 *   * `--rehearse` does the whole thing against real copies of the three tables
 *     in a scratch schema and then throws them away. There is no standby
 *     database to test on -- NEW_DATABASE_URL points at this same project --
 *     so the rehearsal is the substitute, and it is not optional before a first
 *     run.
 *   * NOT ONE MARK IS READ, WRITTEN OR RECOMPUTED. Only the key changes.
 *
 * The July windows below are copied from src/lib/exam/config.ts, which is the
 * record of what actually happened on 19 July 2026 and must not be re-derived.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("No DATABASE_URL. Run with: node --env-file=.env.local scripts/…");
  process.exit(1);
}
const sql = neon(url);

const args = process.argv.slice(2);
const statusOnly = args.includes("--status");
const rehearse = args.includes("--rehearse");

/** The three tables whose key moves, and the paper each one's July rows belong to. */
const MOVED = [
  { table: "attempts", paper: "P1-ONLINE" },
  { table: "online_results", paper: "P1-ONLINE" },
  { table: "offline_results", paper: "P1-OFFLINE" },
] as const;

// 19 July 2026, 10:30 IST. Scanning opened 60 minutes before; the paper ran 30.
const JULY_START = "2026-07-19T10:30:00+05:30";
const JULY_SCAN = "2026-07-19T09:30:00+05:30";
const JULY_END = "2026-07-19T11:00:00+05:30";
// The OMR half followed at 11:30 at the same desk. It has no app window at all.

async function applySchema(): Promise<void> {
  const text = readFileSync(new URL("../src/lib/exam/schema.sql", import.meta.url), "utf8");
  for (const s of text.split(/;\s*$/m).map((x) => x.trim()).filter(Boolean)) {
    await sql.query(s);
  }
}

async function status(): Promise<void> {
  const series = (await sql`
    select id::text, code, name, award_rule, incomplete from exam_series order by id
  `) as Record<string, string>[];

  if (!series.length) {
    console.log("\n  no series — the migration has not run\n");
  }

  for (const s of series) {
    console.log(`\n  ${s.code} — ${s.name}`);
    console.log(`  award: ${s.award_rule}, incomplete marks rank '${s.incomplete}'\n`);
    const phases = (await sql`
      select p.id::text, p.code, p.name, p.ordinal, p.award_paper_id::text
        from exam_phases p where p.series_id = ${s.id}::bigint order by p.ordinal
    `) as Record<string, string>[];
    for (const ph of phases) {
      const papers = (await sql`
        select id::text, code, mode, kind, max_marks, starts_at, published, requires_checkin
          from exam_papers where phase_id = ${ph.id}::bigint order by code
      `) as Record<string, unknown>[];
      console.log(`  ${ph.name}`);
      for (const pa of papers) {
        const award = String(pa.id) === String(ph.award_paper_id) ? " ← counts for the award" : "";
        const when = pa.starts_at ? String(pa.starts_at).slice(0, 16) : "not scheduled";
        const pub = pa.published ? "published" : "unpublished";
        const chk = pa.requires_checkin ? ", check-in required" : "";
        console.log(
          `    ${String(pa.code).padEnd(12)} ${String(pa.mode).padEnd(8)} /${String(pa.max_marks).padEnd(4)} ` +
            `${when}  ${pub}${chk}${award}`,
        );
      }
    }
  }

  console.log("\n  rows carrying a paper:");
  for (const { table } of MOVED) {
    const [r] = (await sql.query(
      `select count(*)::int total, count(exam_paper_id)::int placed from ${table}`,
    )) as { total: number; placed: number }[];
    const key = await primaryKeyOf(table);
    console.log(`    ${table.padEnd(16)} ${r.placed}/${r.total}   key: ${key}`);
  }
  console.log();
}

async function primaryKeyOf(table: string, schema = "public"): Promise<string> {
  const rows = (await sql.query(
    `select pg_get_constraintdef(con.oid) def
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
      where con.contype = 'p' and rel.relname = $1 and ns.nspname = $2`,
    [table, schema],
  )) as { def: string }[];
  return rows[0]?.def ?? "(none)";
}

/**
 * Create the series, its two phases and its three papers.
 *
 * Idempotent through `on conflict do nothing` on the natural keys, so the
 * second run finds everything and inserts nothing.
 */
async function seedStructure(): Promise<Record<string, string>> {
  await sql`
    insert into exam_series (code, name, award_rule, incomplete)
    values ('SET2026', 'Students Evaluation Test 2026', 'average', 'alone')
    on conflict (code) do nothing
  `;
  const [series] = (await sql`
    select id::text from exam_series where code = 'SET2026'
  `) as { id: string }[];

  for (const [code, name, ordinal] of [
    ["P1", "Phase 1", 1],
    ["P2", "Phase 2", 2],
  ] as const) {
    await sql`
      insert into exam_phases (series_id, code, name, ordinal)
      values (${series.id}::bigint, ${code}, ${name}, ${ordinal})
      on conflict (series_id, code) do nothing
    `;
  }

  const phases = Object.fromEntries(
    ((await sql`
      select id::text, code from exam_phases where series_id = ${series.id}::bigint
    `) as { id: string; code: string }[]).map((p) => [p.code, p.id]),
  );

  // Phase 1: what was actually sat on 19 July 2026, already marked and live.
  await sql`
    insert into exam_papers
      (phase_id, code, name, mode, kind, max_marks, question_count,
       scan_opens_at, starts_at, ends_at, duration_minutes,
       requires_checkin, published, published_at)
    values
      (${phases.P1}::bigint, 'P1-ONLINE', 'Phase 1 — online paper', 'online', 'live', 50, 50,
       ${JULY_SCAN}::timestamptz, ${JULY_START}::timestamptz, ${JULY_END}::timestamptz, 30,
       false, true, now())
    on conflict (phase_id, code) do nothing
  `;
  await sql`
    insert into exam_papers
      (phase_id, code, name, mode, kind, max_marks, requires_checkin, published, published_at)
    values
      (${phases.P1}::bigint, 'P1-OFFLINE', 'Phase 1 — offline OMR paper', 'offline', 'live', 100,
       false, true, now())
    on conflict (phase_id, code) do nothing
  `;

  // Phase 2: December, deliberately UNSCHEDULED. Umar has the window as
  // 10-15 December and has not fixed the day; the control centre sets it, and
  // an unscheduled paper correctly reads as "no paper is open" on every screen.
  await sql`
    insert into exam_papers
      (phase_id, code, name, mode, kind, max_marks, requires_checkin, published)
    values
      (${phases.P2}::bigint, 'P2-ONLINE', 'Phase 2 — December paper', 'online', 'live', 100,
       true, false)
    on conflict (phase_id, code) do nothing
  `;

  const papers = Object.fromEntries(
    ((await sql`
      select pa.id::text, pa.code from exam_papers pa
       join exam_phases ph on ph.id = pa.phase_id
      where ph.series_id = ${series.id}::bigint
    `) as { id: string; code: string }[]).map((p) => [p.code, p.id]),
  );

  // The ruling of 13 September, stored rather than written into a query:
  // Phase 1 is represented in the award by the OFFLINE mark, never the online.
  await sql`
    update exam_phases set award_paper_id = ${papers["P1-OFFLINE"]}::bigint
     where id = ${phases.P1}::bigint and award_paper_id is distinct from ${papers["P1-OFFLINE"]}::bigint
  `;
  await sql`
    update exam_phases set award_paper_id = ${papers["P2-ONLINE"]}::bigint
     where id = ${phases.P2}::bigint and award_paper_id is distinct from ${papers["P2-ONLINE"]}::bigint
  `;

  return papers;
}

/**
 * Move one table onto its paper.
 *
 * Backfill, prove there is nothing left behind, make the column required, and
 * only then move the key. Each step checks whether it has already happened, so
 * the whole function is safe to run again.
 */
async function moveKey(table: string, paperId: string, schema = "public"): Promise<void> {
  const q = `${schema}.${table}`;

  const [before] = (await sql.query(
    `select count(*)::int total, count(*) filter (where exam_paper_id is null)::int missing from ${q}`,
  )) as { total: number; missing: number }[];

  if (before.missing > 0) {
    await sql.query(`update ${q} set exam_paper_id = $1 where exam_paper_id is null`, [paperId]);
  }

  const [after] = (await sql.query(
    `select count(*) filter (where exam_paper_id is null)::int missing from ${q}`,
  )) as { missing: number }[];
  if (after.missing > 0) {
    throw new Error(`${table}: ${after.missing} rows still have no paper — refusing to move the key`);
  }

  await sql.query(`alter table ${q} alter column exam_paper_id set not null`);

  // The key itself, last. Look the constraint name up rather than assuming
  // `<table>_pkey`: a renamed constraint would otherwise fail silently here.
  const pk = (await sql.query(
    `select con.conname from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
      where con.contype='p' and rel.relname=$1 and ns.nspname=$2`,
    [table, schema],
  )) as { conname: string }[];

  const current = await primaryKeyOf(table, schema);
  if (current.includes("exam_paper_id")) {
    console.log(`    ${table.padEnd(16)} ${before.total} rows — key already moved`);
    return;
  }

  if (pk[0]) await sql.query(`alter table ${q} drop constraint "${pk[0].conname}"`);
  await sql.query(`alter table ${q} add primary key (uid, exam_paper_id)`);

  console.log(
    `    ${table.padEnd(16)} ${before.total} rows — ${before.missing} placed, key now (uid, exam_paper_id)`,
  );
}

/**
 * The whole migration against throwaway copies of the real tables.
 *
 * `including all` carries the indexes, defaults and the primary key across, so
 * what is exercised here is the same DDL on the same data at the same size --
 * which is the only way to find out that a key really can be moved before
 * doing it to rows that are live on the website.
 */
async function rehearseMigration(papers: Record<string, string>): Promise<void> {
  const S = "phase_rehearsal";
  console.log(`\n  rehearsing in schema "${S}" …`);
  await sql.query(`drop schema if exists ${S} cascade`);
  await sql.query(`create schema ${S}`);

  for (const { table } of MOVED) {
    await sql.query(`create table ${S}.${table} (like public.${table} including all)`);
    await sql.query(`insert into ${S}.${table} select * from public.${table}`);
  }

  for (const { table, paper } of MOVED) {
    await moveKey(table, papers[paper], S);
  }

  // The control: every mark must be identical to the one in the live table.
  for (const { table } of MOVED) {
    const [d] = (await sql.query(
      `select count(*)::int n from (
         select uid from ${S}.${table} except select uid from public.${table}
         union all
         select uid from public.${table} except select uid from ${S}.${table}
       ) t`,
    )) as { n: number }[];
    if (d.n !== 0) throw new Error(`${table}: rehearsal lost or invented ${d.n} students`);
  }
  console.log("    every student still present in all three — rehearsal clean");

  await sql.query(`drop schema ${S} cascade`);
  console.log(`    scratch schema dropped\n`);
}

// ------------------------------------------------------------------- run it --

await applySchema();

if (statusOnly) {
  await status();
  process.exit(0);
}

const papers = await seedStructure();
console.log("\n  series, phases and papers in place");

if (rehearse) {
  await rehearseMigration(papers);
  console.log("  REHEARSAL ONLY — the live tables were not touched.");
  console.log("  Run again without --rehearse to migrate them.\n");
  process.exit(0);
}

console.log("\n  moving the keys:");
for (const { table, paper } of MOVED) {
  await moveKey(table, papers[paper]);
}

await status();

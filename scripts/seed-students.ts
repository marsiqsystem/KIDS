/**
 * Seed the exam database with every enrolled student.
 *
 *   npm run seed:students -- <students-seed.json>
 *
 * The seed file holds ~9,446 real names and dates of birth. It is personal data
 * and lives OUTSIDE this repo, which is public. Never commit it.
 *
 * Idempotent: re-running updates existing rows rather than duplicating them, so
 * it is safe to run again after a correction to the master workbook. It never
 * touches `attempts` -- a re-seed must not wipe a student's exam.
 *
 * It also never DELETES, which matters more since registration opened: a child
 * who applied through the app is on the register without being in the workbook,
 * and a reseed must leave them exactly where they are. See the final check.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

type Row = {
  uid: string;
  name: string;
  class: string;
  stream: string | null;
  school_code: string;
  school_name: string;
  centre_code: string;
  centre_name: string;
  dob: string | null;
  is_demo: boolean;
};

const path = process.argv[2];
if (!path) {
  console.error("usage: npm run seed:students -- <students-seed.json>");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const sql = neon(url);
const students = JSON.parse(readFileSync(path, "utf8")) as Row[];
console.log(`read ${students.length} students from ${path}`);

const schema = readFileSync(new URL("../src/lib/exam/schema.sql", import.meta.url), "utf8");
for (const statement of schema.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("schema applied");

// Batched: 9,446 single-row round trips over HTTP would take minutes.
const BATCH = 250;
let done = 0;

for (let i = 0; i < students.length; i += BATCH) {
  const slice = students.slice(i, i + BATCH);

  const values: string[] = [];
  const params: unknown[] = [];
  for (const s of slice) {
    const n = params.length;
    values.push(
      `($${n + 1},$${n + 2},$${n + 3},$${n + 4},$${n + 5},$${n + 6},$${n + 7},$${n + 8},$${n + 9},$${n + 10})`,
    );
    params.push(
      s.uid, s.name, s.class, s.stream, s.school_code,
      s.school_name, s.centre_code, s.centre_name, s.dob, s.is_demo,
    );
  }

  await sql.query(
    `insert into students
       (uid, name, class, stream, school_code, school_name, centre_code, centre_name, dob, is_demo)
     values ${values.join(",")}
     on conflict (uid) do update set
       name        = excluded.name,
       class       = excluded.class,
       stream      = excluded.stream,
       school_code = excluded.school_code,
       school_name = excluded.school_name,
       centre_code = excluded.centre_code,
       centre_name = excluded.centre_name,
       dob         = excluded.dob,
       is_demo     = excluded.is_demo`,
    params,
  );

  done += slice.length;
  process.stdout.write(`\rseeded ${done}/${students.length}`);
}
console.log("");

/**
 * Put approved corrections back.
 *
 * The upsert above has just written the workbook's values over every student in
 * it -- which, before this step existed, is exactly how corrections made in the
 * database were silently reverted. Corrections a student asked for and the
 * office approved are kept as rows in `app_corrections`, so they are re-applied
 * here, oldest first so a later correction to the same field wins.
 *
 * The statements mirror applyToRegister() in src/lib/admin/corrections.ts. This
 * script cannot import that file (no path aliases on bare Node), so a field
 * added there must be added here too.
 *
 * Once the workbook has been brought into line -- the control centre exports
 * every approved correction -- re-applying is a no-op, which is the point.
 */
const corrections = (await sql`
  select c.uid, c.field, c.new_value from app_corrections c
   where c.status = 'approved' order by c.decided_at
`.catch(() => [])) as { uid: string; field: string; new_value: string }[];

for (const c of corrections) {
  if (c.field === "name") await sql`update students set name = ${c.new_value} where uid = ${c.uid}`;
  else if (c.field === "dob") await sql`update students set dob = ${c.new_value} where uid = ${c.uid}`;
  else if (c.field === "stream") await sql`update students set stream = ${c.new_value} where uid = ${c.uid}`;
  else if (c.field === "class")
    await sql`update students set class = ${c.new_value},
              stream = case when ${c.new_value} in ('IX','X') then null else stream end
              where uid = ${c.uid}`;
  else if (c.field === "school")
    await sql`update students s set centre_code = x.centre_code, centre_name = x.centre_name,
                     school_code = x.school_code, school_name = x.school_name
                from (select centre_code, centre_name, school_code, school_name from students
                       where centre_code || '|' || school_code = ${c.new_value} and not is_demo limit 1) x
               where s.uid = ${c.uid}`;
}
if (corrections.length) {
  console.log(`re-applied ${corrections.length} approved correction(s) over the workbook's values`);
}

const [{ count }] = (await sql`select count(*)::int as count from students`) as { count: number }[];
const [{ demo }] = (await sql`select count(*)::int as demo from students where is_demo`) as { demo: number }[];
const [{ nodob }] = (await sql`select count(*)::int as nodob from students where dob is null`) as { nodob: number }[];
const [{ noclass }] = (await sql`select count(*)::int as noclass from students where class is null`) as { noclass: number }[];

console.log(`\nstudents in db : ${count}`);
console.log(`  demo         : ${demo}`);
console.log(`  without dob  : ${nodob}`);
console.log(`  without class: ${noclass}  <- these cannot be given a paper`);

/**
 * Did every student in the workbook reach the database?
 *
 * This used to be `count === students.length`, which was right only while the
 * database was a mirror of the workbook and nothing else could add a row. Since
 * registration opened (September 2026) the app can put a child on the register
 * too, so an exact-count check reports FAIL on a perfectly healthy database the
 * first time anybody registers -- which would look like a disaster on exactly
 * the day it must not.
 *
 * The real question was never "are the totals equal". It is "is every student in
 * this file in the database", and that is what is asked now. Rows the file does
 * not contain are reported rather than counted against it, and split into the
 * ones that are explained -- an approved application -- and the ones that are
 * not, which are worth a human look even though they do not fail the seed.
 */
const fileUids = students.map((s) => s.uid);

const [{ seeded }] = (await sql`
  select count(*)::int as seeded from students where uid = any(${fileUids}::text[])
`) as { seeded: number }[];

const extra = (await sql`
  select s.uid, r.uid is not null as registered
    from students s
    left join app_registrations r on r.uid = s.uid and r.status = 'approved'
   where s.uid <> all(${fileUids}::text[])
   order by s.uid
`) as { uid: string; registered: boolean }[];

if (extra.length) {
  const viaApp = extra.filter((e) => e.registered).length;
  const unexplained = extra.filter((e) => !e.registered);
  console.log(`\nnot in the workbook: ${extra.length}`);
  console.log(`  registered in app : ${viaApp}  <- expected; approved applications`);
  if (unexplained.length) {
    console.log(`  unexplained       : ${unexplained.length}  <- from neither source; worth a look`);
    for (const e of unexplained.slice(0, 10)) console.log(`      ${e.uid}`);
  }
}

if (seeded !== students.length) {
  console.error(
    `\nFAIL — ${students.length} students in the file, ${seeded} of them in the database.`,
  );
  process.exit(1);
}
console.log("\nOK — every student in the workbook is in the database.");

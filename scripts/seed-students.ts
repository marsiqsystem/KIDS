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

const [{ count }] = (await sql`select count(*)::int as count from students`) as { count: number }[];
const [{ demo }] = (await sql`select count(*)::int as demo from students where is_demo`) as { demo: number }[];
const [{ nodob }] = (await sql`select count(*)::int as nodob from students where dob is null`) as { nodob: number }[];
const [{ noclass }] = (await sql`select count(*)::int as noclass from students where class is null`) as { noclass: number }[];

console.log(`\nstudents in db : ${count}`);
console.log(`  demo         : ${demo}`);
console.log(`  without dob  : ${nodob}`);
console.log(`  without class: ${noclass}  <- these cannot be given a paper`);

if (count !== students.length) {
  console.error(`\nFAIL — expected ${students.length} rows, found ${count}.`);
  process.exit(1);
}
console.log("\nOK — every student is in the database.");

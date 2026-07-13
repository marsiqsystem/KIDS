/**
 * Remove students we cannot give a paper to.
 *
 *   node --env-file=.env.local scripts/prune-blocked.ts <students-ready.json>
 *
 * A partially-applied seed can leave rows behind that the current seed file no
 * longer contains -- e.g. a Class XI student with no stream, who has a class (so
 * the NOT NULL check passes) but still cannot be routed to one of the eight
 * papers. They must not sit in the register looking enrolled.
 *
 * Refuses to touch anyone who has already started an exam.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const path = process.argv[2];
if (!path) {
  console.error("usage: node --env-file=.env.local scripts/prune-blocked.ts <students-ready.json>");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const ready = (JSON.parse(readFileSync(path, "utf8")) as { uid: string }[]).map((s) => s.uid);

const stale = (await sql`
  select uid, name, class, stream, school_name
  from students
  where uid <> all(${ready}::char(9)[])
`) as { uid: string; name: string; class: string; stream: string | null; school_name: string }[];

if (!stale.length) {
  console.log("Nothing to prune — the register matches the seed file exactly.");
  process.exit(0);
}

const started = (await sql`
  select uid from attempts where uid <> all(${ready}::char(9)[])
`) as { uid: string }[];

if (started.length) {
  console.error(`REFUSING to prune: ${started.length} of these have already started an exam.`);
  console.error(started.map((s) => s.uid).join(", "));
  process.exit(1);
}

console.log(`pruning ${stale.length} student(s) who cannot be given a paper:\n`);
for (const s of stale) {
  console.log(`  ${s.uid}  ${s.name}  (${s.class}${s.stream ? " " + s.stream : ", no stream"})  ${s.school_name}`);
}

await sql`delete from students where uid <> all(${ready}::char(9)[])`;

const [{ count }] = (await sql`select count(*)::int as count from students`) as { count: number }[];
console.log(`\nstudents in db: ${count}`);
if (count !== ready.length) {
  console.error(`FAIL — expected ${ready.length}.`);
  process.exit(1);
}
console.log("OK — the register now contains exactly the students we can examine.");

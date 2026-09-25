/**
 * Create the student app's tables, and the control centre's.
 *
 *   node scripts/apply-app-schema.ts            # create anything missing
 *   node scripts/apply-app-schema.ts --status   # what exists right now
 *
 * The exam half of the database is provisioned by whichever script needs it
 * (seed-students, publish-results, import-offline-results all call
 * ensureSchema on src/lib/exam/schema.sql). The app half had no such caller —
 * its tables were made by hand while it was being built, which is fine on one
 * laptop and not fine on a fresh Neon project. This is that caller.
 *
 * Safe to re-run. Every statement in src/lib/app/schema.sql is `create ... if
 * not exists`, and nothing here drops, alters or writes a row.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Load .env.local before running this.");
  process.exit(1);
}

const sql = neon(url);

/**
 * The schema files this script owns, applied in this order.
 *
 * The control centre's tables come second because admin_batches.created_by
 * references admin_staff, and admin_batch_members.uid references students —
 * which the exam schema provides and which is already there on any database
 * that has ever held a result.
 */
const FILES = ["../src/lib/app/schema.sql", "../src/lib/admin/schema.sql"];

/** The tables this file is responsible for, in dependency order. */
const TABLES = [
  "app_accounts",
  "app_events",
  "app_subjects",
  "app_answers",
  "app_sets",
  "app_notice_reads",
  "app_devices",
  "admin_staff",
  "admin_batches",
  "admin_batch_members",
  "admin_batch_teachers",
  "admin_events",
  "admin_classes",
  "admin_class_attendance",
  "admin_posts",
  "app_account_requests",
  "register_guardians",
];

/**
 * Read the DDL from schema.sql itself rather than keeping a copy here that
 * would drift from it. Line comments are stripped first: schema.sql contains
 * prose with semicolons in it, and one surviving comment splits a create
 * statement in half. Same reasoning as publish-results.ts.
 */
async function apply() {
  for (const file of FILES) {
    const ddl = readFileSync(new URL(file, import.meta.url), "utf8")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of ddl) await sql.query(statement);
  }
}

async function status() {
  for (const table of TABLES) {
    const rows = (await sql.query(
      `select to_regclass($1) is not null as there`,
      [`public.${table}`],
    )) as { there: boolean }[];

    if (!rows[0]?.there) {
      console.log(`  ${table.padEnd(18)} MISSING`);
      continue;
    }
    const [{ n }] = (await sql.query(`select count(*)::int as n from ${table}`)) as { n: number }[];
    console.log(`  ${table.padEnd(18)} ${n} row${n === 1 ? "" : "s"}`);
  }
}

const wantsStatus = process.argv.includes("--status");

if (!wantsStatus) {
  await apply();
  console.log(`Applied ${FILES.map((f) => f.replace("../", "")).join(" and ")}.\n`);
}
await status();

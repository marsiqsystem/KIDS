/**
 * Copy Father / Guardian and Contact Number from the master workbook into
 * `register_guardians`, so the control centre can check an "open my account"
 * request against what the school gave KIDS.
 *
 *   node --env-file=.env.local scripts/load-guardians.ts "<path to MASTER (Final).xlsx>"
 *   node --env-file=.env.local scripts/load-guardians.ts --status
 *
 * The workbook is personal data and lives OUTSIDE this repo, which is public.
 * Never commit it, or anything exported from it.
 *
 * Read-only on the workbook. Idempotent on the database: every row is upserted,
 * so re-run it after the master changes. A UID in the workbook that is not on
 * the register is counted and skipped, never inserted.
 */
import ExcelJS from "exceljs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Load .env.local before running this.");
  process.exit(1);
}
const sql = neon(url);

if (process.argv.includes("--status")) {
  const [r] = (await sql`
    select count(*)::int as rows,
           count(*) filter (where guardian_name is not null)::int as father,
           count(*) filter (where phone is not null)::int as phone,
           max(loaded_at) as loaded
      from register_guardians
  `) as { rows: number; father: number; phone: number; loaded: Date | null }[];
  console.log(r);
  process.exit(0);
}

const path = process.argv[2];
if (!path) {
  console.error('usage: node --env-file=.env.local scripts/load-guardians.ts "<MASTER (Final).xlsx>"');
  process.exit(1);
}

/** A cell as plain text: numbers, rich text and formula results all arrive as objects. */
function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  let v: unknown = value;
  if (typeof v === "object" && v !== null) {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: string };
    if (o.richText) v = o.richText.map((p) => p.text).join("");
    else if (o.result !== undefined) v = o.result;
    else if (o.text !== undefined) v = o.text;
  }
  const s = String(v).replace(/\s+/g, " ").trim();
  // The workbook marks a missing value several ways. None of them is a name.
  return s === "" || /^(-|—|–|na|n\/a|nil|none|0)$/i.test(s) ? null : s;
}

const book = new ExcelJS.Workbook();
await book.xlsx.readFile(path);
const sheet = book.getWorksheet("Master Data");
if (!sheet) {
  console.error('No sheet called "Master Data" in that workbook.');
  process.exit(1);
}

// Columns by header, not by position: the master has gained columns before.
const header = new Map<string, number>();
sheet.getRow(1).eachCell((cell, col) => header.set(String(text(cell.value) ?? "").toLowerCase(), col));
const colOf = (name: string) => {
  const c = header.get(name.toLowerCase());
  if (!c) {
    console.error(`No "${name}" column. Headers: ${[...header.keys()].join(" | ")}`);
    process.exit(1);
  }
  return c;
};
const UID = colOf("Unique ID / Roll No");
const FATHER = colOf("Father / Guardian");
const PHONE = colOf("Contact Number");

const rows: { uid: string; father: string | null; phone: string | null }[] = [];
sheet.eachRow((row, n) => {
  if (n === 1) return;
  const uid = (text(row.getCell(UID).value) ?? "").replace(/\D/g, "");
  if (uid.length !== 9) return;
  rows.push({ uid, father: text(row.getCell(FATHER).value), phone: text(row.getCell(PHONE).value) });
});
console.log(`read ${rows.length} students from the workbook`);

// Batched, and filtered to the register in the same statement.
const BATCH = 500;
let written = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH);
  const done = (await sql.query(
    `insert into register_guardians (uid, guardian_name, phone)
     select t.uid, t.father, t.phone
       from unnest($1::text[], $2::text[], $3::text[]) as t(uid, father, phone)
       join students s on s.uid = t.uid
     on conflict (uid) do update
       set guardian_name = excluded.guardian_name,
           phone         = excluded.phone,
           loaded_at     = now()
     returning uid`,
    [slice.map((r) => r.uid), slice.map((r) => r.father), slice.map((r) => r.phone)],
  )) as unknown[];
  written += done.length;
}

console.log(`written ${written}; skipped ${rows.length - written} not on the register`);

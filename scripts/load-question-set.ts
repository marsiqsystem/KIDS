/**
 * Load a paper's questions into the database from a file kept OFF GitHub.
 *
 *   node --env-file=.env.local scripts/load-question-set.ts --status
 *   node --env-file=.env.local scripts/load-question-set.ts <file.json> --set P2-ONLINE-X
 *   node --env-file=.env.local scripts/load-question-set.ts <file.json> --set P2-ONLINE-X --yes
 *   node --env-file=.env.local scripts/load-question-set.ts --remove P2-ONLINE-X
 *
 * WHY
 *
 * The repository is public. July's papers went into it on the morning of the
 * exam; a December paper committed in October would be read by every student in
 * October. So the file lives on the office laptop -- beside the admit-card
 * generator, never in this folder's git -- and this script puts it in the
 * database, where only the server can read the answer key.
 *
 * THE FILE
 *
 *   [
 *     { "q": "Which river ...?", "options": ["Teesta", "Damodar", "Jaldhaka", "Mahananda"], "answer": 1 },
 *     { "context": "Read the passage ...", "q": "...", "options": ["..", "..", "..", ".."], "answer": 0 }
 *   ]
 *
 * `answer` is the INDEX of the correct option, counting from 0 -- the same shape
 * as src/lib/exam/set2026-papers.ts, so nobody has to learn a second one.
 *
 * THE SET CODE says who gets it, most specific first:
 *
 *   P2-ONLINE-X                 every Class X student
 *   P2-ONLINE-XI-SCIENCE        Class XI Science only
 *   P2-ONLINE-X-BENGALI         Class X, Bengali medium only
 *   P2-ONLINE-XI-SCIENCE-BENGALI
 *
 * A student is handed the most specific set that exists for them. Load
 * P2-ONLINE-X and P2-ONLINE-X-BENGALI and a Bengali-medium child gets the second.
 *
 * WITHOUT --yes IT CHANGES NOTHING. It checks the file, prints what it found --
 * including how the answers are spread, because a key that is all B is a key
 * that was typed wrong -- and stops. Read it, then run again with --yes.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { userInfo } from "node:os";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("No DATABASE_URL. Run with: node --env-file=.env.local scripts/…");
  process.exit(1);
}
const sql = neon(url);

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a) => !a.startsWith("--") && a !== flag("set") && a !== flag("remove"));
const confirmed = args.includes("--yes");

// ------------------------------------------------------------------ status --

if (args.includes("--status")) {
  const rows = (await sql`
    select s.code, p.code as paper, s.question_count, s.loaded_at, s.loaded_by, left(s.checksum, 12) as sum,
           (select count(*)::int from attempts a where a.paper_id = s.code) as attempts
      from exam_question_sets s join exam_papers p on p.id = s.exam_paper_id
     order by s.code
  `) as Record<string, unknown>[];
  if (!rows.length) console.log("\n  no question sets loaded\n");
  else {
    console.log();
    for (const r of rows) {
      console.log(
        `  ${String(r.code).padEnd(30)} ${String(r.question_count).padStart(3)} q  ` +
          `${String(r.loaded_at).slice(4, 21)}  by ${r.loaded_by}  sha ${r.sum}…  ${r.attempts} attempts`,
      );
    }
    console.log();
  }
  process.exit(0);
}

// ------------------------------------------------------------------ remove --

const removing = flag("remove");
if (removing) {
  const [{ n }] = (await sql`select count(*)::int as n from attempts where paper_id = ${removing}`) as { n: number }[];
  if (n > 0) {
    console.error(`\n  ${removing} has been sat by ${n} students. It cannot be removed: their marks depend on it.\n`);
    process.exit(1);
  }
  const gone = (await sql`delete from exam_question_sets where code = ${removing} returning code`) as unknown[];
  console.log(gone.length ? `\n  removed ${removing}\n` : `\n  there is no set ${removing}\n`);
  process.exit(0);
}

// -------------------------------------------------------------------- load --

const code = flag("set")?.trim().toUpperCase();
if (!file || !code) {
  console.error("usage: … load-question-set.ts <file.json> --set P2-ONLINE-X [--yes]");
  process.exit(1);
}

const m = code.match(/^([A-Z0-9]+-[A-Z0-9]+)-(IX|X|XI|XII)(?:-(SCIENCE|COMMERCE|ARTS))?(?:-(BENGALI))?$/);
if (!m) {
  console.error(
    `\n  "${code}" is not a set code. It is <paper>-<class>[-<stream>][-<medium>], e.g. P2-ONLINE-X or P2-ONLINE-XI-SCIENCE.\n`,
  );
  process.exit(1);
}
const [, paperCode, cls, stream, medium] = m;
if (paperCode === "P1-ONLINE" || code.startsWith("SET2026")) {
  console.error("\n  July's papers are the record of what was sat. They cannot be replaced.\n");
  process.exit(1);
}
if (stream && cls !== "XI" && cls !== "XII") {
  console.error(`\n  Class ${cls} has no stream.\n`);
  process.exit(1);
}

const [paper] = (await sql`
  select id::text, code, name, mode, question_count, max_marks from exam_papers
   where code = ${paperCode} and archived_at is null
`) as { id: string; code: string; name: string; mode: string; question_count: number | null; max_marks: number }[];
if (!paper) {
  console.error(`\n  There is no paper ${paperCode}. Create it in the control centre's Exams tab first.\n`);
  process.exit(1);
}
if (paper.mode !== "online") {
  console.error(`\n  ${paperCode} is an offline paper. It is marked by the OMR tool, not loaded here.\n`);
  process.exit(1);
}

const raw = readFileSync(file, "utf8");
const checksum = createHash("sha256").update(raw).digest("hex");

let data: unknown;
try {
  data = JSON.parse(raw.replace(/^﻿/, ""));
} catch (e) {
  console.error(`\n  The file is not valid JSON: ${(e as Error).message}\n`);
  process.exit(1);
}
if (!Array.isArray(data) || data.length === 0) {
  console.error("\n  The file must be a list of questions.\n");
  process.exit(1);
}

const problems: string[] = [];
const questions: { q: string; context?: string; options: string[] }[] = [];
const key: number[] = [];

data.forEach((item, i) => {
  const n = i + 1;
  const it = item as { q?: unknown; context?: unknown; options?: unknown; answer?: unknown };
  if (typeof it.q !== "string" || !it.q.trim()) problems.push(`question ${n}: no question text`);
  if (!Array.isArray(it.options) || it.options.length < 2 || it.options.length > 6) {
    problems.push(`question ${n}: needs 2 to 6 options`);
    return;
  }
  if (it.options.some((o) => typeof o !== "string" || !o.trim())) problems.push(`question ${n}: an option is empty`);
  if (new Set(it.options.map((o) => String(o).trim().toLowerCase())).size !== it.options.length) {
    problems.push(`question ${n}: two options are the same`);
  }
  if (!Number.isInteger(it.answer) || (it.answer as number) < 0 || (it.answer as number) >= it.options.length) {
    problems.push(`question ${n}: "answer" must be 0 to ${it.options.length - 1} (the index of the right option)`);
  }
  if (it.context !== undefined && typeof it.context !== "string") problems.push(`question ${n}: context must be text`);

  questions.push({
    q: String(it.q ?? "").trim(),
    ...(typeof it.context === "string" && it.context.trim() ? { context: it.context.trim() } : {}),
    options: (it.options as string[]).map((o) => String(o).trim()),
  });
  key.push(it.answer as number);
});

const stems = new Map<string, number>();
questions.forEach((q, i) => {
  const s = q.q.toLowerCase();
  if (stems.has(s)) problems.push(`questions ${stems.get(s)! + 1} and ${i + 1} are the same question`);
  else stems.set(s, i);
});

if (paper.question_count && questions.length !== paper.question_count) {
  problems.push(`${paper.code} is set for ${paper.question_count} questions; the file has ${questions.length}`);
}

// ------------------------------------------------------------------ report --

const letters = "ABCDEF";
const spread = new Map<number, number>();
for (const k of key) spread.set(k, (spread.get(k) ?? 0) + 1);

console.log(`\n  ${code}  →  ${paper.name}`);
console.log(`  Class ${cls}${stream ? ` · ${stream}` : ""}${medium ? ` · ${medium} medium` : ""}`);
console.log(`  ${questions.length} questions · sha256 ${checksum.slice(0, 16)}…\n`);

console.log(
  "  answers: " +
    [...spread.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${letters[k]} ${v}`).join("   "),
);
const most = Math.max(...spread.values());
if (most / questions.length > 0.5) {
  console.log(`  ⚠ more than half the answers are the same letter. Check the key was not typed wrong.`);
}

console.log("\n  first three, as a student will see them, with the key:");
for (const [i, q] of questions.slice(0, 3).entries()) {
  console.log(`\n   ${i + 1}. ${q.q.slice(0, 110)}`);
  q.options.forEach((o, j) => console.log(`      ${j === key[i] ? "✓" : " "} ${letters[j]}  ${o.slice(0, 80)}`));
}

if (problems.length) {
  console.error(`\n  ${problems.length} problem${problems.length === 1 ? "" : "s"} — nothing was loaded:`);
  for (const p of problems.slice(0, 30)) console.error(`   · ${p}`);
  if (problems.length > 30) console.error(`   · …and ${problems.length - 30} more`);
  console.error();
  process.exit(1);
}

const [{ sat }] = (await sql`select count(*)::int as sat from attempts where paper_id = ${code}`) as { sat: number }[];
if (sat > 0) {
  console.error(`\n  ${code} has already been sat by ${sat} students. It cannot be replaced.\n`);
  process.exit(1);
}

const [existing] = (await sql`
  select left(checksum, 16) as sum, loaded_at from exam_question_sets where code = ${code}
`) as { sum: string; loaded_at: string }[];

if (!confirmed) {
  console.log(
    `\n  Checked. ${existing ? `This REPLACES the set loaded ${String(existing.loaded_at).slice(4, 21)} (sha ${existing.sum}…).` : "Nothing is loaded under this code yet."}`,
  );
  console.log(`  Nothing has been changed. To load it, run the same command with --yes.\n`);
  process.exit(0);
}

await sql`
  insert into exam_question_sets
    (code, exam_paper_id, class, stream, medium, questions, answer_key, question_count, checksum, loaded_by)
  values
    (${code}, ${paper.id}::bigint, ${cls}, ${stream ?? null}, ${medium ?? ""},
     ${JSON.stringify(questions)}::jsonb, ${JSON.stringify(key)}::jsonb, ${questions.length},
     ${checksum}, ${userInfo().username})
  on conflict (code) do update set
    questions = excluded.questions, answer_key = excluded.answer_key,
    question_count = excluded.question_count, checksum = excluded.checksum,
    loaded_at = now(), loaded_by = excluded.loaded_by, exam_paper_id = excluded.exam_paper_id
`;

console.log(`\n  Loaded ${code}. Every server picks it up within a minute.\n`);

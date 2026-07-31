/**
 * Move each demo account's attempt onto the student who actually sat it.
 *
 *   node scripts/apply-demo-substitutions.ts            # show what would change
 *   node scripts/apply-demo-substitutions.ts --commit   # actually do it
 *
 * 19 July 2026, CTR-12: five students pressed Submit in the first minute, before
 * they had answered anything. The centre gave them the admit cards of KIDS Team
 * demo accounts and let them sit the paper properly on those IDs. So the mark
 * that belongs to each of them is the one recorded against the demo ID.
 *
 * Until this runs, `attempts` still holds their accidental 0-4, and the result
 * portal — which reads Neon, not the Excel — would publish it to them. See
 * scripts/demo-substitutions.json for the map and the reasoning.
 *
 * What it does, per student, in one transaction:
 *   1. writes the voided attempt into exam_events, in full, before touching it
 *   2. moves answers, mark, paper and every timestamp onto the student's row
 *   3. records the merit-list decision on `attempts.merit_eligible`
 *   4. deletes the now-duplicated demo attempt, so the mark exists exactly once
 *
 * Nothing is lost: step 1 snapshots both the voided attempt and the demo attempt
 * into the append-only log first, so the whole operation can be reconstructed
 * from exam_events alone. Safe to run twice — an already-moved attempt is
 * detected and skipped.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { paperIdFor } from "../src/lib/exam/config.ts";

// The Next runtime loads .env.local for us; a bare node script does not.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (match) process.env[match[1]] ??= match[2];
  }
} catch {
  /* no .env.local: rely on the real environment */
}

const commit = process.argv.includes("--commit");
const sql = neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "");

type Sub = { demoUid: string; studentUid: string; meritEligible: boolean; note?: string };
const SUBS: Sub[] = JSON.parse(
  readFileSync(new URL("./demo-substitutions.json", import.meta.url), "utf8"),
).substitutions;

type Row = {
  uid: string;
  name: string;
  class: string;
  is_demo: boolean;
  paper_id: string | null;
  status: string | null;
  score: number | null;
  answers: Record<string, number> | null;
  started_at: string | null;
  deadline_at: string | null;
  submitted_at: string | null;
  last_sync_at: string | null;
  merit_eligible: boolean | null;
};

// `merit_eligible` is where the merit-list decision has to live: the Excel is a
// report, but the portal and the merit list read Neon. Recording it in a
// spreadsheet alone is how a decision quietly stops being honoured.
if (commit) {
  await sql`alter table attempts add column if not exists merit_eligible boolean not null default true`;
} else {
  const exists = (await sql`
    select 1 from information_schema.columns
     where table_name = 'attempts' and column_name = 'merit_eligible'
  `) as unknown[];
  if (!exists.length) {
    console.log("Would add column: attempts.merit_eligible boolean not null default true\n");
  }
}

const uids = SUBS.flatMap((s) => [s.demoUid, s.studentUid]);
const rows = (await sql`
  select s.uid, s.name, s.class, s.is_demo,
         a.paper_id, a.status, a.score, a.answers,
         a.started_at, a.deadline_at, a.submitted_at, a.last_sync_at,
         ${commit ? sql`a.merit_eligible` : sql`true as merit_eligible`}
    from students s
    left join attempts a on a.uid = s.uid
   where s.uid = any(${uids})
`) as Row[];

const byUid = new Map(rows.map((r) => [r.uid.trim(), r]));

let moved = 0;
let already = 0;

for (const sub of SUBS) {
  const demo = byUid.get(sub.demoUid);
  const student = byUid.get(sub.studentUid);

  // Never guess at a student's result. Anything unexpected stops the run.
  if (!demo) throw new Error(`${sub.demoUid}: not in the register`);
  if (!student) throw new Error(`${sub.studentUid}: not in the register`);
  if (!demo.is_demo) throw new Error(`${sub.demoUid}: not a demo account`);
  if (student.is_demo) throw new Error(`${sub.studentUid}: is itself a demo account`);

  const label = `${student.uid.trim()} ${student.name} (Class ${student.class})`;

  // Already applied: the demo row is empty and the student holds the attempt.
  if (!demo.status) {
    if (student.status) {
      console.log(`  ${label}: already applied — demo ${sub.demoUid} holds no attempt. Skipped.`);
      already++;
      continue;
    }
    throw new Error(`${sub.demoUid}: no attempt to move, and ${sub.studentUid} has none either`);
  }

  const mismatch = paperIdFor(student.class) !== demo.paper_id;
  const voidedAnswered = Object.keys(student.answers ?? {}).length;
  const awardedAnswered = Object.keys(demo.answers ?? {}).length;

  console.log(
    `  ${label}\n` +
      `      voided : ${student.status ?? "no attempt"} ${student.score ?? "—"}/50` +
      ` (${voidedAnswered} answered, submitted ${student.submitted_at ?? "—"})\n` +
      `      awarded: ${demo.score}/50 (${awardedAnswered} answered) from demo ${sub.demoUid} ${demo.name}\n` +
      `      paper  : ${demo.paper_id}${mismatch ? `  ⚠ NOT the Class ${student.class} paper` : ""}\n` +
      `      merit  : ${sub.meritEligible ? "eligible" : "EXCLUDED from merit list"}`,
  );

  if (!commit) continue;

  // The audit record is written BEFORE the change, and carries enough to undo it.
  const audit = {
    by: "demo-substitution",
    demoUid: sub.demoUid,
    demoName: demo.name,
    note: sub.note ?? null,
    paperMismatch: mismatch,
    meritEligible: sub.meritEligible,
    voided: {
      paper_id: student.paper_id,
      status: student.status,
      score: student.score,
      answers: student.answers,
      started_at: student.started_at,
      deadline_at: student.deadline_at,
      submitted_at: student.submitted_at,
      last_sync_at: student.last_sync_at,
    },
    awarded: {
      paper_id: demo.paper_id,
      status: demo.status,
      score: demo.score,
      answers: demo.answers,
      started_at: demo.started_at,
      deadline_at: demo.deadline_at,
      submitted_at: demo.submitted_at,
      last_sync_at: demo.last_sync_at,
    },
  };

  await sql.transaction([
    sql`
      insert into exam_events (uid, kind, detail)
      values (${student.uid.trim()}, 'substitute', ${JSON.stringify(audit)}::jsonb)
    `,
    sql`
      insert into exam_events (uid, kind, detail)
      values (${sub.demoUid}, 'substitute', ${JSON.stringify({
        by: "demo-substitution",
        transferredTo: sub.studentUid,
        studentName: student.name,
        score: demo.score,
      })}::jsonb)
    `,
    // The student submitted an empty paper by accident, so a row always exists —
    // but insert-on-conflict rather than a bare update, so this is still correct
    // for a student who never started at all.
    sql`
      insert into attempts (uid, paper_id, status, started_at, deadline_at, submitted_at,
                            answers, last_sync_at, score, merit_eligible)
      values (${student.uid.trim()}, ${demo.paper_id}, ${demo.status},
              ${demo.started_at}, ${demo.deadline_at}, ${demo.submitted_at},
              ${JSON.stringify(demo.answers ?? {})}::jsonb, ${demo.last_sync_at},
              ${demo.score}, ${sub.meritEligible})
      on conflict (uid) do update
        set paper_id      = excluded.paper_id,
            status        = excluded.status,
            started_at    = excluded.started_at,
            deadline_at   = excluded.deadline_at,
            submitted_at  = excluded.submitted_at,
            answers       = excluded.answers,
            last_sync_at  = excluded.last_sync_at,
            score         = excluded.score,
            merit_eligible = excluded.merit_eligible
    `,
    // The mark now belongs to the student. Leaving it on the demo ID as well
    // would mean one paper counted twice — and these students are still holding
    // those demo admit cards, so scanning one must not show them a second result.
    sql`delete from attempts where uid = ${sub.demoUid}`,
  ]);

  moved++;
}

console.log(
  commit
    ? `\nMoved ${moved} attempt(s).${already ? ` ${already} already applied.` : ""}`
    : `\nDry run — nothing was changed. Re-run with --commit to apply.`,
);

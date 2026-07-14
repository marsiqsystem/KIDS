/**
 * Close and mark every paper whose time has run out.
 *
 *   node scripts/finalise-attempts.ts            # show what would change
 *   node scripts/finalise-attempts.ts --commit   # actually do it
 *
 * Most papers finalise themselves: any request that touches an expired attempt
 * submits it from the last synced draft. But a student whose phone died at 10:50
 * and who never opens the portal again is never touched by anything, and their
 * row would sit in 'in_progress' for ever.
 *
 * So this is the sweep. Run it AFTER the window closes -- 11:05 on 19 July -- and
 * every paper is in, marked, and comparable. It is safe to run repeatedly: an
 * attempt that is already submitted is not eligible.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { getPaper, scoreAnswers } from "../src/lib/exam/papers.ts";

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

type Row = { uid: string; paper_id: string; answers: Record<string, number> };

const expired = (await sql`
  select uid, paper_id, answers
    from attempts
   where status = 'in_progress'
     and now() >= deadline_at
   order by uid
`) as Row[];

if (!expired.length) {
  console.log("Nothing to finalise — every attempt is already submitted.");
  process.exit(0);
}

console.log(`${expired.length} unsubmitted paper(s) past their deadline:\n`);

let marked = 0;
let orphaned = 0;

for (const row of expired) {
  const paper = getPaper(row.paper_id);
  if (!paper) {
    // Cannot mark a paper we do not hold. Never guess a score.
    console.log(`  ${row.uid}  paper ${row.paper_id} NOT FOUND — left alone, needs a human`);
    orphaned++;
    continue;
  }

  const answers = row.answers ?? {};
  const score = scoreAnswers(paper, answers);
  console.log(
    `  ${row.uid}  ${Object.keys(answers).length}/${paper.questions.length} answered  →  score ${score}`,
  );

  if (commit) {
    await sql`
      update attempts
         set status = 'submitted', submitted_at = deadline_at, score = ${score}
       where uid = ${row.uid} and status = 'in_progress'
    `;
    await sql`
      insert into exam_events (uid, kind, detail)
      values (${row.uid}, 'autosubmit', ${JSON.stringify({ by: "sweep", score })}::jsonb)
    `;
    marked++;
  }
}

console.log(
  commit
    ? `\nFinalised ${marked} paper(s).${orphaned ? ` ${orphaned} left for a human.` : ""}`
    : `\nDry run — nothing was changed. Re-run with --commit to finalise.`,
);

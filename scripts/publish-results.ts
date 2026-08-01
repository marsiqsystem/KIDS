/**
 * Compute the online result for every student, once, and write it down.
 *
 *   node scripts/publish-results.ts                     # compute + store, still hidden
 *   node scripts/publish-results.ts --publish           # authorise; opens immediately
 *   node scripts/publish-results.ts --publish --at 19:00  # authorise; opens at 7 PM IST
 *   node scripts/publish-results.ts --unpublish         # hide again; nothing recomputed
 *   node scripts/publish-results.ts --status            # what is stored right now
 *
 * Authorising and opening are two different things. `--publish` says the marks
 * are checked; `--at` says when students may see them. Given both, the results
 * open by themselves at that moment — there is no cron to fire and nothing for
 * anyone to remember to do at 19:00.
 *
 * Why a snapshot and not a live query: a rank is a student's position among
 * ~2,000 classmates. Deriving that on every scan would mean reading the whole
 * cohort to render one page, and two students opening their result a minute
 * apart could be shown ranks computed over subtly different data. A published
 * result has to be a fixed thing that stops moving the moment it is published.
 *
 * Every mark here is RE-MARKED from the answer sheet and the answer key. The
 * stored `attempts.score` is checked against it and a mismatch aborts the whole
 * run: publishing a number we cannot reproduce is the one thing this must never
 * do.
 *
 * Safe to re-run. It recomputes everything and overwrites, and it never touches
 * `students`, `attempts` or `exam_events`.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { getPaper, scoreAnswers } from "../src/lib/exam/papers.ts";
import { EXAM, paperIdFor } from "../src/lib/exam/config.ts";
import { rankAll, type Ranks } from "../src/lib/exam/ranking.ts";

// The Next runtime loads .env.local for us; a bare node script does not.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (match) process.env[match[1]] ??= match[2];
  }
} catch {
  /* no .env.local: rely on the real environment */
}

const sql = neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "");

const args = process.argv.slice(2);
const argv = new Set(args);
const PUBLISH = argv.has("--publish");
const UNPUBLISH = argv.has("--unpublish");
const STATUS_ONLY = argv.has("--status");
const TOTAL = EXAM.questionCount; // 50

/**
 * When students may see it. `--at 19:00` means 19:00 IST today; a full ISO
 * instant is accepted too. Absent, results open the moment they are authorised.
 */
function openAt(): Date {
  const i = args.indexOf("--at");
  const raw = i === -1 ? null : args[i + 1];
  if (!raw) return new Date();

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    // Today's date in IST, at the given wall-clock time, pinned to +05:30 so
    // the answer does not depend on the timezone of the laptop running this.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const at = new Date(
      `${today}T${hhmm[1].padStart(2, "0")}:${hhmm[2]}:00+05:30`,
    );
    if (Number.isNaN(at.getTime())) throw new Error(`--at: cannot read "${raw}"`);
    return at;
  }

  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) throw new Error(`--at: cannot read "${raw}"`);
  return at;
}

const OPEN_AT = openAt();
const istFull = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);

/* ------------------------------------------------------------------ ddl --- */

/**
 * Provision from schema.sql itself, rather than from a copy of the DDL kept in
 * here that would drift from it. Every statement in that file is `create ... if
 * not exists`, so running the whole thing is idempotent.
 *
 * EVERY line comment is stripped first, trailing ones included — schema.sql
 * really does contain "-- DD-MM-YYYY as printed; 913 students have none", and
 * that semicolon splits the students table in half if it survives to the split.
 */
async function ensureSchema() {
  const ddl = readFileSync(new URL("../src/lib/exam/schema.sql", import.meta.url), "utf8")
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of ddl) await sql.query(statement);
}

/* --------------------------------------------------------------- status --- */

async function showStatus() {
  const meta = (await sql`
    select *,
           (published and publish_at is not null and now() >= publish_at) as is_open,
           now() as db_now
      from results_meta where id
  `) as {
    published: boolean;
    published_at: string | null;
    publish_at: string | null;
    is_open: boolean;
    db_now: string;
    totals: Record<string, number>;
    computed_at: string;
  }[];

  if (!meta.length) {
    console.log("Nothing computed yet. Run without flags to compute.");
    return;
  }
  const m = meta[0];
  const [{ n }] = (await sql`select count(*)::int as n from online_results`) as { n: number }[];

  console.log(`  authorised   ${m.published ? "YES" : "no"}`);
  console.log(`  opens at     ${m.publish_at ? istFull(new Date(m.publish_at)) + " IST" : "—"}`);
  console.log(`  db clock now ${istFull(new Date(m.db_now))} IST`);
  console.log(
    `  VISIBLE      ${m.is_open ? "YES — students can see their result" : "no — students still see the old portal"}`,
  );
  if (!m.is_open && m.publish_at) {
    const mins = Math.round((new Date(m.publish_at).getTime() - new Date(m.db_now).getTime()) / 60000);
    console.log(`               opens in ${mins} minute${mins === 1 ? "" : "s"}`);
  }
  console.log(`  computed at  ${istFull(new Date(m.computed_at))} IST`);
  console.log(`  rows         ${n}`);
  console.log(`  totals       ${JSON.stringify(m.totals)}`);
}

/* ------------------------------------------------------------------ run --- */

await ensureSchema();

if (STATUS_ONLY) {
  await showStatus();
  process.exit(0);
}

if (UNPUBLISH) {
  await sql`update results_meta set published = false where id`;
  console.log("Hidden. Students now see the pre-publication portal again.");
  await showStatus();
  process.exit(0);
}

type Row = {
  uid: string;
  class: string;
  school_code: string;
  centre_code: string;
  is_demo: boolean;
  paper_id: string | null;
  status: string | null;
  started_at: string | null;
  deadline_at: string | null;
  submitted_at: string | null;
  score: number | null;
  answers: Record<string, number> | null;
  merit_eligible: boolean;
};

console.log("Reading the exam database…");

const rows = (await sql`
  select s.uid, s.class, s.school_code, s.centre_code, s.is_demo,
         a.paper_id, a.status, a.started_at, a.deadline_at, a.submitted_at,
         a.score, a.answers, coalesce(a.merit_eligible, true) as merit_eligible
  from students s
  left join attempts a on a.uid = s.uid
`) as Row[];

console.log(`  ${rows.length} students.`);

/* ------------------------------------------------- substitution guard --- */

/**
 * The five CTR-12 students who re-sat on a demo account's admit card.
 *
 * `scripts/apply-demo-substitutions.ts` moves those attempts onto the students
 * who actually did the work. Unlike the Excel export, this script does NOT know
 * how to do that move in memory — a published result must not depend on a
 * transformation that lives only in the process that printed it. So it checks
 * the move has been made, and refuses to publish if it has not: publishing
 * before it runs would award five students the empty paper they submitted by
 * accident at 10:30.
 */
{
  const subs: { demoUid: string; studentUid: string }[] = JSON.parse(
    readFileSync(new URL("./demo-substitutions.json", import.meta.url), "utf8"),
  ).substitutions;

  const byUid = new Map(rows.map((r) => [r.uid.trim(), r]));
  const pending = subs.filter((s) => byUid.get(s.demoUid)?.status);

  if (pending.length) {
    console.error(
      `\nREFUSING TO PUBLISH: ${pending.length} of ${subs.length} CTR-12 substitutions have not ` +
        `been applied to the database.\n` +
        pending.map((s) => `  demo ${s.demoUid} still holds the attempt for ${s.studentUid}`).join("\n") +
        `\n\nRun:  node scripts/apply-demo-substitutions.ts --commit\n` +
        `and then run this again.\n`,
    );
    process.exit(1);
  }
  console.log(`  ${subs.length} CTR-12 substitutions already applied.`);
}

/* --------------------------------------------------------------- derive --- */

type Marked = Row & Ranks & {
  /** Did they sit the paper? Attendance, and nothing to do with statistics. */
  satPaper: boolean;
  /** Their mark. Always shown to them, whatever the statistics do. */
  marks: number | null;
  correct: number;
  wrong: number;
  blank: number;
  minutesTaken: number | null;
  timedOut: boolean;
};

const marked: Marked[] = rows.map((r) => {
  const answers = r.answers ?? {};
  const paper = r.paper_id ? getPaper(r.paper_id) : null;
  const sat = r.score !== null && r.score !== undefined;

  // Re-marked from the key, never trusted from the stored column.
  const correct = paper && sat ? scoreAnswers(paper, answers) : 0;
  const answered = Object.keys(answers).length;

  if (sat && paper && correct !== r.score) {
    console.error(
      `\nREFUSING TO PUBLISH: ${r.uid} stores score ${r.score} but re-marking the same ` +
        `answer sheet against ${r.paper_id} gives ${correct}. Investigate before publishing.\n`,
    );
    process.exit(1);
  }

  const minutesTaken =
    r.started_at && r.submitted_at
      ? Math.round(
          ((new Date(r.submitted_at).getTime() - new Date(r.started_at).getTime()) / 60_000) * 10,
        ) / 10
      : null;

  /**
   * Does this mark belong in everyone else's statistics?
   *
   * No, for the three CTR-12 students who sat another class's paper. They keep
   * their marks in full — `marks` below is untouched — but they are lifted out
   * of their classmates' cohort altogether: out of the ranks, out of the class
   * average, out of the class highest, and out of the denominator a classmate
   * reads as "of 1,970". A Class X child's average must be the average of the
   * Class X paper, and a mark scored on the Class IX paper is not that.
   *
   * This is the same judgement that keeps them off the merit list, applied
   * everywhere the comparison would otherwise leak.
   */
  const counted = sat && r.merit_eligible !== false;

  return {
    ...r,
    // `score` is the STATISTICAL input: ranks, averages, cohort sizes. Null
    // means "does not enter the statistics" — either absent, or not comparable.
    score: counted ? correct : null,
    satPaper: sat,
    marks: sat ? correct : null,
    correct,
    wrong: sat ? answered - correct : 0,
    blank: sat ? TOTAL - answered : 0,
    minutesTaken,
    // Same rule the portal used on the day: at or past the deadline means the
    // paper submitted itself rather than being handed in.
    timedOut: Boolean(
      sat && r.submitted_at && r.deadline_at && new Date(r.submitted_at) >= new Date(r.deadline_at),
    ),
    classRank: null,
    centreRank: null,
    schoolRank: null,
    percentile: null,
  };
});

// Demo accounts ranked in their own pool; class by class, never across classes.
rankAll(marked, (r) => r);

const real = marked.filter((r) => !r.is_demo);
/** Everyone who turned up — the attendance figure quoted to students. */
const attended = real.filter((r) => r.satPaper);
/** Everyone whose mark enters the statistics. Excludes the three above. */
const counted = real.filter((r) => r.score !== null);

/* ----------------------------------------------------------- cohort sizes --- */

const satIn = (rows_: Marked[], key: (r: Marked) => string) => {
  const counts = new Map<string, number>();
  for (const r of rows_) {
    if (r.score === null) continue;
    const k = key(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
};

// Sizes count who is IN THE COHORT, matching the ranks they sit beside: "148 of
// 1,970" must not measure a rank against students who never turned up, nor
// against the three who answered a different class's paper.
const classSat = satIn(marked, (r) => `${r.is_demo}|${r.class}`);
const centreSat = satIn(marked, (r) => `${r.is_demo}|${r.centre_code}|${r.class}`);
const schoolSat = satIn(marked, (r) => `${r.is_demo}|${r.centre_code}|${r.school_code}|${r.class}`);

const classAgg = new Map<string, { sum: number; n: number; high: number }>();
for (const r of marked) {
  if (r.score === null) continue;
  const k = `${r.is_demo}|${r.class}`;
  const a = classAgg.get(k) ?? { sum: 0, n: 0, high: 0 };
  a.sum += r.score;
  a.n += 1;
  a.high = Math.max(a.high, r.score);
  classAgg.set(k, a);
}

/* ------------------------------------------------------------ write rows --- */

console.log("Writing results…");

await sql`delete from online_results`;

// Everyone who sat gets a stored result — including the three who are out of
// the statistics. They are owed their marksheet; they are not owed a rank.
const stored = marked.filter((r) => r.marks !== null);

const COLUMNS = [
  "uid", "marks", "correct", "wrong", "blank",
  "class_rank", "centre_rank", "school_rank", "percentile",
  "class_sat", "centre_sat", "school_sat", "class_avg", "class_high",
  "started_at", "submitted_at", "minutes_taken", "timed_out", "ranked",
  "answers", "paper_id",
];

const values = stored.map((r) => {
  const ck = `${r.is_demo}|${r.class}`;
  const agg = classAgg.get(ck)!;
  // A student who sat another class's paper keeps every mark and loses every
  // comparison: the ranks are nulled here, not merely hidden in the page, so
  // there is no ranked number stored anywhere that could later leak into a list.
  const ranked = r.merit_eligible !== false;

  return [
    r.uid.trim(), r.marks, r.correct, r.wrong, r.blank,
    ranked ? r.classRank : null, ranked ? r.centreRank : null,
    ranked ? r.schoolRank : null, ranked ? r.percentile : null,
    classSat.get(ck) ?? 0,
    centreSat.get(`${r.is_demo}|${r.centre_code}|${r.class}`) ?? 0,
    schoolSat.get(`${r.is_demo}|${r.centre_code}|${r.school_code}|${r.class}`) ?? 0,
    Math.round((agg.sum / agg.n) * 100) / 100, agg.high,
    r.started_at, r.submitted_at, r.minutesTaken, r.timedOut, ranked,
    JSON.stringify(r.answers ?? {}), r.paper_id,
  ];
});

/**
 * Written in batches, not row by row.
 *
 * Neon's HTTP driver makes one request per statement, and ~9,600 requests from
 * a laptop in Kolkata to Singapore is half an hour of waiting. 400 students per
 * INSERT is ~8,400 bind parameters — comfortably inside Postgres's 65,535 limit
 * — and turns the whole write into two dozen requests.
 */
const BATCH = 400;
let written = 0;

for (let i = 0; i < values.length; i += BATCH) {
  const batch = values.slice(i, i + BATCH);
  const params: unknown[] = [];
  const tuples = batch.map((row) => {
    const slots = row.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    // The answer sheet is the only column that needs a cast off a text bind.
    slots[19] = `${slots[19]}::jsonb`;
    return `(${slots.join(",")})`;
  });

  await sql.query(
    `insert into online_results (${COLUMNS.join(",")}) values ${tuples.join(",")}`,
    params,
  );
  written += batch.length;
  process.stdout.write(`\r  ${written} of ${values.length} results…`);
}

console.log(`\r  ${written} results.                    `);

/* ------------------------------------------------------- question stats --- */

console.log("Computing per-question difficulty…");

await sql`delete from online_question_stats`;

for (const cls of ["IX", "X", "XI", "XII"]) {
  const id = paperIdFor(cls)!;
  const paper = getPaper(id);
  if (!paper) continue;

  // Real students only. The design shows this to a child as "% of your class",
  // and the KIDS team is not their class.
  const cohort = counted.filter((r) => r.paper_id === id);
  if (!cohort.length) continue;

  const params: unknown[] = [];
  const tuples: string[] = [];
  for (let i = 0; i < TOTAL; i++) {
    let correct = 0;
    for (const r of cohort) if ((r.answers ?? {})[String(i)] === paper.key[i]) correct++;

    // Out of everyone who SAT, not everyone who attempted the question: a child
    // reading "38% of your class got this right" is being told how many of their
    // classmates got the mark, and a blank is not a right answer.
    params.push(id, i + 1, Math.round((correct / cohort.length) * 1000) / 10, cohort.length);
    tuples.push(`($${params.length - 3},$${params.length - 2},$${params.length - 1},$${params.length})`);
  }

  await sql.query(
    `insert into online_question_stats (paper_id, n, correct_pct, sat) values ${tuples.join(",")}`,
    params,
  );
  console.log(`  ${id}: ${cohort.length} sat.`);
}

/* --------------------------------------------------------------- totals --- */

// Attendance is attendance; statistics are statistics. The three CTR-12
// students DID sit the exam, so they are counted in `sat` — telling a child
// "6,778 of 9,637 sat it" must not quietly lose three who were in the room.
// They are out of `average` and `fullMarks`, which compare marks on one paper.
const totals = {
  enrolled: real.length,
  sat: attended.length,
  absent: real.length - attended.length,
  average: counted.length
    ? Math.round((counted.reduce((s, r) => s + (r.score as number), 0) / counted.length) * 100) / 100
    : 0,
  fullMarks: counted.filter((r) => r.score === TOTAL).length,
  notRanked: real.filter((r) => r.satPaper && r.merit_eligible === false).length,
};

await sql`
  insert into results_meta (id, published, published_at, publish_at, totals, computed_at)
  values (true, ${PUBLISH}, ${PUBLISH ? new Date().toISOString() : null},
          ${PUBLISH ? OPEN_AT.toISOString() : null},
          ${JSON.stringify(totals)}::jsonb, now())
  on conflict (id) do update set
    totals = excluded.totals,
    computed_at = excluded.computed_at,
    published = ${PUBLISH} or results_meta.published,
    published_at = coalesce(results_meta.published_at, excluded.published_at),
    -- Re-running the computation must never quietly move the announced moment.
    -- Only an explicit --publish sets it.
    publish_at = case when ${PUBLISH} then excluded.publish_at else results_meta.publish_at end
`;

console.log("\nDone.");
console.log(`  ${totals.sat} of ${totals.enrolled} sat · average ${totals.average} · ` +
  `${totals.fullMarks} full marks · ${totals.absent} did not sit · ${totals.notRanked} unranked`);
await showStatus();

if (!PUBLISH) {
  console.log("\nStored but not authorised. Re-run with --publish to release it.");
} else if (OPEN_AT > new Date()) {
  console.log(`\nAuthorised. Opens by itself at ${istFull(OPEN_AT)} IST — nothing more to run.`);
} else {
  console.log("\nAuthorised and OPEN NOW. Students can see their results.");
}

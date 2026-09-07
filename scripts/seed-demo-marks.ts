/**
 * Give a DEMO account a plausible set of marks for both papers, so the student
 * app can be walked through with something on the screens.
 *
 *   node --env-file=.env.local scripts/seed-demo-marks.ts 213999417
 *   node --env-file=.env.local scripts/seed-demo-marks.ts 213999417 --remove
 *
 * Why this needs to exist at all
 * -----------------------------
 * Every screen in the app reads the exam record, and the KIDS team's own
 * accounts never sat an exam. Umar's account shows empty cards on My Record,
 * no sections, no OMR sheet and nothing for the daily loop to compare against,
 * so the app cannot be judged on his own phone. These rows are the fixture that
 * makes it demonstrable.
 *
 * IT WILL ONLY EVER TOUCH A DEMO ACCOUNT
 * --------------------------------------
 * The first thing it does is read `students.is_demo` and refuse anything else.
 * These tables hold 7,322 published written results and 6,778 online ones for
 * real children; a script that writes invented marks must not be one typo away
 * from overwriting one of them. `--remove` deletes the rows again.
 *
 * What is real in here and what is invented
 * -----------------------------------------
 * The invented part is this one student's answers. Everything they are
 * COMPARED against is read from the live cohort at run time — the class
 * average, the class high, how many sat, and the per-question difficulty the
 * marksheet quotes. A fixture whose comparisons are also invented would show a
 * layout, not a product.
 *
 * The written paper's section names are taken from `offline_section_stats`
 * rather than from the admit card, because the marksheet joins on that exact
 * spelling: the card prints "Costing & Taxation" and the register says
 * "Cost & Taxation", and the second one is the one that finds a class average.
 *
 * BEFORE ANY RE-IMPORT
 * --------------------
 * `scripts/import-offline-results.ts` and `scripts/publish-results.ts` rebuild
 * these tables and count what they wrote. Run this with `--remove` first, or a
 * demo row will be sitting in a table whose row count is being asserted.
 */
import { neon } from "@neondatabase/serverless";
import { getPaper } from "../src/lib/exam/papers.ts";
import { paperIdFor } from "../src/lib/exam/config.ts";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env.local ...");
  process.exit(1);
}
const sql = neon(url);

const args = process.argv.slice(2);
const uid = (args.find((a) => /^\d{9}$/.test(a)) ?? "").trim();
const remove = args.includes("--remove");

if (!uid) {
  console.error("Give a 9-digit User ID.\n  node --env-file=.env.local scripts/seed-demo-marks.ts 213999417");
  process.exit(1);
}

/* ------------------------------------------------------------- the guard --- */

const [student] = (await sql`
  select uid, name, class, stream, school_name, centre_name, is_demo
  from students where uid = ${uid}
`) as {
  uid: string; name: string; class: string; stream: string | null;
  school_name: string; centre_name: string; is_demo: boolean;
}[];

if (!student) {
  console.error(`No student with ID ${uid}.`);
  process.exit(1);
}

if (!student.is_demo) {
  console.error(
    `\n  REFUSED. ${uid} · ${student.name} is a REAL student, not a demo account.\n` +
      `  This script writes invented marks. It will not touch a real child's record.\n`,
  );
  process.exit(1);
}

console.log(`\n  ${student.uid}  ${student.name}  ·  ${student.class}${student.stream ? " " + student.stream : ""}  ·  DEMO`);

if (remove) {
  // Only the written row this script wrote, identified by its own source
  // marker — never a row the real importer produced. `attempts` is not touched
  // at all: this script never writes one, so it has no business deleting one.
  const gone = (await sql`
    delete from offline_results where uid = ${uid} and source = 'demo-fixture' returning uid
  `) as unknown[];
  const goneOnline = (await sql`delete from online_results where uid = ${uid} returning uid`) as unknown[];
  console.log(`\n  Removed ${gone.length} written and ${goneOnline.length} online row(s).`);
  console.log(`  The record reads "absent" again.\n`);
  process.exit(0);
}

/* --------------------------------------------------- a repeatable shuffle --- */

/**
 * Seeded from the UID, so running this twice produces the same paper. A fixture
 * that changes under you is worse than no fixture: "was that a bug or did the
 * marks move?" is not a question worth having.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const rand = rng(Number(uid));

/* ------------------------------------------------- the written paper (OMR) --- */

const LETTERS = ["A", "B", "C", "D"];

/**
 * The blocks of this student's form, built from THEIR class and stream.
 *
 * An earlier version of this file hardcoded XII Commerce and, run against a
 * Class X demo account, wrote a XII Commerce paper onto a Class X record —
 * form "XII100", commerce answer keys and all. Nonsense of the kind that looks
 * entirely plausible on screen. The layout now comes from the student.
 *
 * XI and XII forms are four blocks of 25: English & General Knowledge, then
 * the three optional subjects of their stream. The subject names must be
 * spelled exactly as `offline_section_stats` spells them, or the marksheet
 * cannot find a class average to compare against.
 */
const SUBJECTS: Record<string, [string, string][]> = {
  commerce: [
    ["acc", "Accountancy"], ["bus", "Business Studies"],
    ["ctx", "Cost & Taxation"], ["ecc", "Economics"],
  ],
  science: [
    ["phy", "Physics"], ["che", "Chemistry"],
    ["mth", "Mathematics"], ["bio", "Biology"],
  ],
  arts: [
    ["his", "History"], ["pol", "Political Science"], ["geo", "Geography"],
    ["edu", "Education"], ["eco", "Economics"],
    ["evs", "Environmental Science"], ["phl", "Philosophy"],
  ],
};

const cls = student.class.trim().toUpperCase();
const stream = (student.stream ?? "").trim().toLowerCase();

if (cls !== "XI" && cls !== "XII") {
  // IX and X sit ONE 100-question paper split into seven sections of unequal
  // length, and this script has no verified source for where those sections
  // start and end — only for their names. Inventing the boundaries would
  // produce exactly the plausible nonsense described above. Refused, not
  // guessed.
  console.error(
    `\n  Class ${student.class} is not supported.\n` +
      `  IX and X sit a single 100-question paper in seven sections, and the section\n` +
      `  boundaries are not derivable here. Guessing them would write a record that\n` +
      `  looks right and is not.\n\n  XI and XII demo accounts work.\n`,
  );
  process.exit(1);
}

const options = SUBJECTS[stream];
if (!options) {
  console.error(`\n  No subject list for stream "${student.stream ?? "(none)"}" in class ${cls}.\n`);
  process.exit(1);
}

const prefix = cls.toLowerCase();
const BLOCKS = [
  { name: "English & General Knowledge", key_id: `${prefix}-egk` },
  ...options.slice(0, 3).map(([code, name]) => ({
    name,
    key_id: `${prefix}-${stream}-${code}`,
  })),
];
const PER_BLOCK = 25;

/** Roughly how well this student does in each block, so the bars differ. */
const SKILL = [0.8, 0.72, 0.64, 0.84];

const marked: string[] = [], second: string[] = [], key: string[] = [], outcome: string[] = [];
const sections: {
  name: string; key_id: string; first: number; last: number; total: number;
  correct: number; wrong: number; blank: number; grace: number; marks: number;
}[] = [];

BLOCKS.forEach((block, b) => {
  const first = b * PER_BLOCK + 1;
  let correct = 0, wrong = 0, blank = 0;

  for (let i = 0; i < PER_BLOCK; i++) {
    const answer = Math.floor(rand() * 4);
    key.push(LETTERS[answer]);
    const roll = rand();

    if (roll < 0.04) {
      // Left blank.
      marked.push("-"); second.push("-"); outcome.push("b"); blank++;
    } else if (roll < 0.06) {
      // Two bubbles filled. Scored as wrong — that is what a double IS, and
      // 2% of sheets in the real batch had them.
      marked.push(LETTERS[answer]);
      second.push(LETTERS[(answer + 1) % 4]);
      outcome.push("d"); wrong++;
    } else if (rand() < SKILL[b]) {
      marked.push(LETTERS[answer]); second.push("-"); outcome.push("c"); correct++;
    } else {
      marked.push(LETTERS[(answer + 1 + Math.floor(rand() * 3)) % 4]);
      second.push("-"); outcome.push("w"); wrong++;
    }
  }

  sections.push({
    name: block.name, key_id: block.key_id,
    first, last: first + PER_BLOCK - 1, total: PER_BLOCK,
    correct, wrong, blank, grace: 0, marks: correct,
  });
});

const totalQ = BLOCKS.length * PER_BLOCK;
const correct = sections.reduce((n, s) => n + s.correct, 0);
const wrong = sections.reduce((n, s) => n + s.wrong, 0);
const blank = sections.reduce((n, s) => n + s.blank, 0);
const marks = correct; // one mark per correct answer, no negative marking

/** The cohort this student is shown against — read, never invented. */
const [offCohort] = (await sql`
  select count(*)::int                      as sat,
         round(avg(marks), 2)               as avg,
         max(marks)::int                    as high,
         count(*) filter (where marks > ${marks})::int as better
    from offline_results
   where class = ${student.class} and coalesce(stream,'') = ${student.stream ?? ""} and ranked
`) as { sat: number; avg: string; high: number; better: number }[];

const classRank = offCohort.sat ? offCohort.better + 1 : 1;
const percentile = offCohort.sat
  ? Number((100 * (offCohort.sat - classRank) / offCohort.sat).toFixed(1))
  : null;

await sql`
  insert into offline_results (
    uid, class, stream, marks, correct, wrong, blank, grace, total_q,
    class_rank, centre_rank, school_rank, percentile,
    class_sat, centre_sat, school_sat, class_avg, class_high, ranked,
    sections, panels, marked, second, answer_key, outcome,
    form, source, hand_set, computed_at
  ) values (
    ${uid}, ${student.class}, ${student.stream}, ${marks}, ${correct}, ${wrong}, ${blank}, 0, ${totalQ},
    ${classRank}, 1, 1, ${percentile},
    ${offCohort.sat}, 1, 1, ${offCohort.avg}, ${offCohort.high}, true,
    ${JSON.stringify(sections)}, ${JSON.stringify(BLOCKS.slice(1).map((b) => b.name))},
    ${marked.join("")}, ${second.join("")}, ${key.join("")}, ${outcome.join("")},
    ${`${cls}100`}, ${"demo-fixture"}, 0, now()
  )
  on conflict (uid) do update set
    class = excluded.class, stream = excluded.stream, marks = excluded.marks,
    correct = excluded.correct, wrong = excluded.wrong, blank = excluded.blank,
    grace = excluded.grace, total_q = excluded.total_q,
    class_rank = excluded.class_rank, centre_rank = excluded.centre_rank,
    school_rank = excluded.school_rank, percentile = excluded.percentile,
    class_sat = excluded.class_sat, centre_sat = excluded.centre_sat,
    school_sat = excluded.school_sat, class_avg = excluded.class_avg,
    class_high = excluded.class_high, ranked = excluded.ranked,
    sections = excluded.sections, panels = excluded.panels,
    marked = excluded.marked, second = excluded.second,
    answer_key = excluded.answer_key, outcome = excluded.outcome,
    form = excluded.form, source = excluded.source,
    hand_set = excluded.hand_set, computed_at = now()
`;

console.log(`  written  ${marks}/${totalQ}  (${correct} right, ${wrong} wrong, ${blank} blank)` +
            `  rank ${classRank} of ${offCohort.sat}`);

/* ------------------------------------------------------- the online paper --- */

const paperId = paperIdFor(student.class);
const paper = paperId ? getPaper(paperId) : null;
if (!paper) {
  console.error(`  No online paper for class ${student.class} — written half only.`);
  process.exit(1);
}

// Answered against the REAL key, so the question-by-question review on
// /app/record/online agrees with the totals on the card. A fixture whose
// marks and answers disagree teaches you to distrust the screen.
const answers: Record<string, number> = {};
let onCorrect = 0, onWrong = 0, onBlank = 0;

paper.key.forEach((answer, i) => {
  const roll = rand();
  if (roll < 0.08) { onBlank++; return; }          // ran out of time or skipped
  if (roll < 0.80) { answers[String(i)] = answer; onCorrect++; }
  else { answers[String(i)] = (answer + 1 + Math.floor(rand() * 3)) % 4; onWrong++; }
});

const onMarks = onCorrect;

const [onCohort] = (await sql`
  select count(*)::int                        as sat,
         round(avg(marks), 2)                 as avg,
         max(marks)::int                      as high,
         count(*) filter (where marks > ${onMarks})::int as better
    from online_results r join students s on s.uid = r.uid
   where s.class = ${student.class} and r.ranked
`) as { sat: number; avg: string; high: number; better: number }[];

const onRank = onCohort.sat ? onCohort.better + 1 : 1;
const submitted = new Date("2026-07-19T05:12:00Z");   // 10:42 IST, inside the window
const started = new Date(submitted.getTime() - 41 * 60_000);

await sql`
  insert into online_results (
    uid, marks, correct, wrong, blank,
    class_rank, centre_rank, school_rank, percentile,
    class_sat, centre_sat, school_sat, class_avg, class_high,
    started_at, submitted_at, minutes_taken, timed_out, ranked,
    answers, paper_id, computed_at
  ) values (
    ${uid}, ${onMarks}, ${onCorrect}, ${onWrong}, ${onBlank},
    ${onRank}, 1, 1, ${onCohort.sat ? Number((100 * (onCohort.sat - onRank) / onCohort.sat).toFixed(1)) : null},
    ${onCohort.sat}, 1, 1, ${onCohort.avg}, ${onCohort.high},
    ${started.toISOString()}, ${submitted.toISOString()}, ${41}, false, true,
    ${JSON.stringify(answers)}, ${paperId}, now()
  )
  on conflict (uid) do update set
    marks = excluded.marks, correct = excluded.correct, wrong = excluded.wrong,
    blank = excluded.blank, class_rank = excluded.class_rank,
    centre_rank = excluded.centre_rank, school_rank = excluded.school_rank,
    percentile = excluded.percentile, class_sat = excluded.class_sat,
    centre_sat = excluded.centre_sat, school_sat = excluded.school_sat,
    class_avg = excluded.class_avg, class_high = excluded.class_high,
    started_at = excluded.started_at, submitted_at = excluded.submitted_at,
    minutes_taken = excluded.minutes_taken, timed_out = excluded.timed_out,
    ranked = excluded.ranked, answers = excluded.answers,
    paper_id = excluded.paper_id, computed_at = now()
`;

console.log(`  online   ${onMarks}/${paper.key.length}  (${onCorrect} right, ${onWrong} wrong, ${onBlank} blank)` +
            `  rank ${onRank} of ${onCohort.sat}`);
console.log(`\n  Both papers are on the record. Remove them with --remove before any re-import.\n`);

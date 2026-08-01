/**
 * Export the whole online exam — every student, every mark, every answer — to one
 * Excel workbook.
 *
 *   node scripts/export-marks.ts                       # -> Desktop/SET 2026 — Online Exam Marks.xlsx
 *   node scripts/export-marks.ts --out "C:/path/x.xlsx"
 *
 * Read-only: it touches nothing in the database. Everything /admin shows is
 * derived from these same three tables, so this is that page, unfolded.
 *
 * Real students and the KIDS Team demo accounts never share a sheet — the demo
 * rows would otherwise sit inside the ranks and the averages and quietly bend
 * every number a human reads off this file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { neon } from "@neondatabase/serverless";
import ExcelJS from "exceljs";
import { getPaper, scoreAnswers } from "../src/lib/exam/papers.ts";
import { EXAM, paperIdFor } from "../src/lib/exam/config.ts";
import { rankAll, groupBy } from "../src/lib/exam/ranking.ts";

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

const outFlag = process.argv.indexOf("--out");
const OUT =
  outFlag !== -1 && process.argv[outFlag + 1]
    ? path.resolve(process.argv[outFlag + 1])
    : path.join(os.homedir(), "Desktop", "SET 2026 — Online Exam Marks.xlsx");

const TOTAL = EXAM.questionCount; // 50
const LETTERS = ["A", "B", "C", "D"];
const CLASS_ORDER = ["IX", "X", "XI", "XII"];

/** IST, the only timezone this exam ever happened in. Excel gets a plain string. */
function ist(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "");
}

// ---------------------------------------------------------------- fetch

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
  paper_id: string | null;
  status: string | null;
  started_at: string | null;
  deadline_at: string | null;
  submitted_at: string | null;
  last_sync_at: string | null;
  score: number | null;
  device_hash: string | null;
  ip: string | null;
  answers: Record<string, number> | null;
  merit_eligible: boolean;
};

console.log("Reading the exam database…");

const rows = (await sql`
  select
    s.uid, s.name, s.class, s.stream, s.school_code, s.school_name,
    s.centre_code, s.centre_name, s.dob, s.is_demo,
    a.paper_id, a.status, a.started_at, a.deadline_at, a.submitted_at,
    a.last_sync_at, a.score, a.device_hash, a.ip, a.answers,
    coalesce(a.merit_eligible, true) as merit_eligible
  from students s
  left join attempts a on a.uid = s.uid
  order by s.centre_code, s.school_code, s.class, s.name
`) as Row[];

const events = (await sql`
  select e.id, e.uid, e.kind, e.at, e.detail, s.name, s.class, s.centre_code, s.is_demo
  from exam_events e
  left join students s on s.uid = e.uid
  order by e.at, e.id
`) as Record<string, unknown>[];

console.log(`  ${rows.length} students, ${events.length} events.`);

// -------------------------------------------------- demo substitutions

type Sub = { demoUid: string; studentUid: string; meritEligible: boolean; note?: string };
const SUBS: Sub[] = JSON.parse(
  readFileSync(new URL("./demo-substitutions.json", import.meta.url), "utf8"),
).substitutions;

/**
 * Five students at CTR-12 submitted an empty paper by accident in the first
 * minute and were given a demo account's admit card to sit it properly. The work
 * on the demo ID is theirs; the 10:30 submission on their own ID is not a result.
 *
 * `scripts/apply-demo-substitutions.ts` has since moved those attempts in the
 * database itself, so normally there is nothing left to move here and this only
 * reads the audit trail back out of `exam_events` to label the columns. It still
 * knows how to do the move in memory, so the workbook is correct whether or not
 * the database migration has been run.
 *
 * The accidental attempt is never dropped — it rides along as `voided*` so
 * anybody who asks "why did her mark change" can be shown both. Everything
 * downstream (ranks, averages, distributions, the answer grid) is computed after
 * this, so the whole workbook is internally consistent.
 */
const byUid = new Map(rows.map((r) => [r.uid.trim(), r]));

// What the migration recorded, for the students whose attempt has already moved.
type Audit = {
  demoUid?: string;
  demoName?: string;
  paperMismatch?: boolean;
  voided?: { score: number | null; answers: Record<string, number> | null; submitted_at: string | null };
};
const audits = new Map<string, Audit>(
  ((await sql`
    select uid, detail from exam_events
     where kind = 'substitute' and detail ? 'voided'
  `) as { uid: string; detail: Audit }[]).map((e) => [e.uid.trim(), e.detail]),
);

type Transfer = {
  voidedScore: number | null;
  voidedAnswered: number;
  voidedSubmittedAt: string | null;
  satOnDemoUid: string;
  satOnDemoName: string;
  paperMismatch: boolean;
  meritEligible: boolean;
};
const transfers = new Map<string, Transfer>();
const transferredOut = new Map<string, string>(); // demo uid -> student uid

for (const sub of SUBS) {
  const demoRow = byUid.get(sub.demoUid);
  const studentRow = byUid.get(sub.studentUid);

  // Never guess. A mapping we cannot resolve is shouted about and skipped.
  if (!demoRow) throw new Error(`substitution: demo ID ${sub.demoUid} is not in the register`);
  if (!studentRow) throw new Error(`substitution: student ID ${sub.studentUid} is not in the register`);
  if (!demoRow.is_demo) throw new Error(`substitution: ${sub.demoUid} is not a demo account`);
  if (studentRow.is_demo) throw new Error(`substitution: ${sub.studentUid} is itself a demo account`);

  // Already moved in the database: the demo row is empty and the student holds
  // the attempt. Take the voided figures from the audit log rather than from the
  // student's row, which is now the awarded attempt.
  const done = !demoRow.status;
  const audit = audits.get(sub.studentUid);
  if (done && !studentRow.status) {
    throw new Error(`substitution: neither ${sub.demoUid} nor ${sub.studentUid} holds an attempt`);
  }
  if (done && !audit) {
    throw new Error(`substitution: ${sub.studentUid} has no 'substitute' audit event to read`);
  }

  transfers.set(sub.studentUid, {
    voidedScore: done ? (audit!.voided?.score ?? null) : studentRow.score,
    voidedAnswered: Object.keys(
      (done ? audit!.voided?.answers : studentRow.answers) ?? {},
    ).length,
    voidedSubmittedAt: done ? (audit!.voided?.submitted_at ?? null) : studentRow.submitted_at,
    satOnDemoUid: sub.demoUid,
    satOnDemoName: done ? (audit!.demoName ?? demoRow.name) : demoRow.name,
    // The demo cards were handed out by whoever was free, not by class. A student
    // who answered another class's paper is not comparable to their classmates,
    // and that must be visible in the file, not discovered in a dispute.
    paperMismatch: paperIdFor(studentRow.class) !== studentRow.paper_id,
    meritEligible: sub.meritEligible,
  });
  transferredOut.set(sub.demoUid, sub.studentUid);

  // The attempt itself, moved wholesale: answers, mark, paper and every timestamp.
  if (!done) {
    studentRow.paper_id = demoRow.paper_id;
    studentRow.status = demoRow.status;
    studentRow.score = demoRow.score;
    studentRow.answers = demoRow.answers;
    studentRow.started_at = demoRow.started_at;
    studentRow.submitted_at = demoRow.submitted_at;
    studentRow.deadline_at = demoRow.deadline_at;
    studentRow.last_sync_at = demoRow.last_sync_at;
    studentRow.device_hash = demoRow.device_hash;
    studentRow.ip = demoRow.ip;
    studentRow.merit_eligible = sub.meritEligible;
  }
}

const preApplied = SUBS.filter((s) => !byUid.get(s.demoUid)?.status).length;
console.log(
  `  ${SUBS.length} demo substitutions (${preApplied} already applied in the database).`,
);

// ------------------------------------------------------------- derive

type Record_ = Row & {
  answered: number;
  correct: number;
  wrong: number;
  unanswered: number;
  recomputed: number | null;
  scoreMatches: string;
  percent: number | null;
  classRank: number | null;
  centreRank: number | null;
  schoolRank: number | null;
  percentile: number | null;
  minutesTaken: number | null;
};

const records: Record_[] = rows.map((r) => {
  const answers = r.answers ?? {};
  const paper = r.paper_id ? getPaper(r.paper_id) : null;
  const answered = Object.keys(answers).length;

  let correct = 0;
  if (paper) {
    correct = scoreAnswers(paper, answers);
  }
  const recomputed = paper ? correct : null;
  const stored = r.score;

  const minutesTaken =
    r.started_at && r.submitted_at
      ? Math.round(
          ((new Date(r.submitted_at).getTime() - new Date(r.started_at).getTime()) / 60_000) * 10,
        ) / 10
      : null;

  return {
    ...r,
    answered,
    correct: paper ? correct : 0,
    wrong: paper ? answered - correct : 0,
    unanswered: TOTAL - answered,
    recomputed,
    // Every stored score is re-marked here from the answer sheet and the key.
    // A mismatch is the one thing a results file must never hide.
    scoreMatches:
      stored === null || stored === undefined
        ? ""
        : recomputed === null
          ? "no paper"
          : recomputed === stored
            ? "OK"
            : "MISMATCH",
    percent: stored === null || stored === undefined ? null : Math.round((stored / TOTAL) * 1000) / 10,
    classRank: null,
    centreRank: null,
    schoolRank: null,
    percentile: null,
    minutesTaken,
  };
});

// Ranks are computed inside a cohort — demo accounts in their own pool, class by
// class, since the four papers are different papers and a mark on one is not a
// mark on another. The arithmetic lives in src/lib/exam/ranking.ts, shared with
// scripts/publish-results.ts, so the rank a student reads on their marksheet and
// the rank in this workbook can never quietly disagree.
rankAll(records, (r) => r);

// ------------------------------------------------------------- workbook

const wb = new ExcelJS.Workbook();
wb.creator = "KIDS Kolkata — SET 2026";
wb.created = new Date();

// Created first so Excel opens on it; the numbers are filled in at the very end,
// once every other sheet has been built.
const overview = wb.addWorksheet("Overview", { properties: { defaultColWidth: 22 } });

const HEADER_FILL = "FF0F5A52";
const BAND_FILL = "FFF2F7F6";

function styleHeader(ws: ExcelJS.Worksheet, freezeCols = 2) {
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  head.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  head.height = 28;
  ws.views = [{ state: "frozen", xSplit: freezeCols, ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };
}

/** Alternate row shading, so a 9,000-row sheet can still be read across. */
function band(ws: ExcelJS.Worksheet) {
  ws.eachRow((row, i) => {
    if (i > 1 && i % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
    }
  });
}

const MARK_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: "Unique ID", key: "uid", width: 12 },
  { header: "Name", key: "name", width: 30 },
  { header: "Class", key: "class", width: 7 },
  { header: "Stream", key: "stream", width: 11 },
  { header: "School Code", key: "school_code", width: 12 },
  { header: "School Name", key: "school_name", width: 42 },
  { header: "Centre Code", key: "centre_code", width: 12 },
  { header: "Centre Name", key: "centre_name", width: 42 },
  { header: "Date of Birth", key: "dob", width: 13 },
  { header: "Paper", key: "paper_id", width: 13 },
  { header: "Status", key: "status", width: 13 },
  { header: "Marks", key: "score", width: 8 },
  { header: "Out Of", key: "outOf", width: 8 },
  { header: "Percentage", key: "percent", width: 11 },
  { header: "Correct", key: "correct", width: 9 },
  { header: "Wrong", key: "wrong", width: 8 },
  { header: "Answered", key: "answered", width: 10 },
  { header: "Unanswered", key: "unanswered", width: 11 },
  { header: "Rank in Class", key: "classRank", width: 12 },
  { header: "Rank in Centre (class-wise)", key: "centreRank", width: 14 },
  { header: "Rank in School (class-wise)", key: "schoolRank", width: 14 },
  { header: "Percentile (class)", key: "percentile", width: 12 },
  { header: "Started (IST)", key: "startedAt", width: 21 },
  { header: "Submitted (IST)", key: "submittedAt", width: 21 },
  { header: "Deadline (IST)", key: "deadlineAt", width: 21 },
  { header: "Last Sync (IST)", key: "lastSyncAt", width: 21 },
  { header: "Minutes Taken", key: "minutesTaken", width: 12 },
  { header: "Re-marked Score", key: "recomputed", width: 13 },
  { header: "Score Check", key: "scoreMatches", width: 12 },
  { header: "Device Hash", key: "device_hash", width: 20 },
  { header: "IP", key: "ip", width: 16 },
  { header: "Demo Account", key: "isDemo", width: 12 },
  // The substitution audit trail — blank for all but the handful it applies to.
  { header: "Marks Source", key: "marksSource", width: 34 },
  { header: "Sat On Demo ID", key: "satOnDemoUid", width: 14 },
  { header: "Voided Own Marks", key: "voidedScore", width: 14 },
  { header: "Voided Own Answered", key: "voidedAnswered", width: 16 },
  { header: "Voided Submitted (IST)", key: "voidedSubmittedAt", width: 21 },
  { header: "Paper Mismatch", key: "paperMismatch", width: 30 },
  { header: "Merit List", key: "meritList", width: 34 },
  { header: "Student Enroll", key: "studentEnroll", width: 14 },
];

function marksRow(r: Record_) {
  const t = transfers.get(r.uid.trim());
  const gaveTo = transferredOut.get(r.uid.trim());
  return {
    uid: r.uid,
    name: r.name,
    class: r.class,
    stream: r.stream ?? "",
    school_code: r.school_code,
    school_name: r.school_name,
    centre_code: r.centre_code,
    centre_name: r.centre_name,
    dob: r.dob ?? "",
    paper_id: r.paper_id ?? "",
    status: r.status ?? "not_started",
    score: r.score ?? null,
    outOf: r.status ? TOTAL : null,
    percent: r.percent,
    correct: r.status ? r.correct : null,
    wrong: r.status ? r.wrong : null,
    answered: r.status ? r.answered : null,
    unanswered: r.status ? r.unanswered : null,
    classRank: r.classRank,
    centreRank: r.centreRank,
    schoolRank: r.schoolRank,
    percentile: r.percentile,
    startedAt: ist(r.started_at),
    submittedAt: ist(r.submitted_at),
    deadlineAt: ist(r.deadline_at),
    lastSyncAt: ist(r.last_sync_at),
    minutesTaken: r.minutesTaken,
    recomputed: r.recomputed,
    scoreMatches: r.scoreMatches,
    device_hash: r.device_hash ?? "",
    ip: r.ip ?? "",
    isDemo: r.is_demo ? "YES" : "No",
    marksSource: t
      ? `Sat on demo ID ${t.satOnDemoUid} (${t.satOnDemoName})`
      : gaveTo
        ? `Marks transferred to student ${gaveTo}`
        : "",
    satOnDemoUid: t ? t.satOnDemoUid : "",
    voidedScore: t ? t.voidedScore : null,
    voidedAnswered: t ? t.voidedAnswered : null,
    voidedSubmittedAt: t ? ist(t.voidedSubmittedAt) : "",
    paperMismatch: t
      ? t.paperMismatch
        ? `YES — Class ${r.class} student sat ${r.paper_id}`
        : "No"
      : "",
    meritList: r.is_demo
      ? ""
      : r.merit_eligible === false
        ? `Excluded — sat ${r.paper_id} as a Class ${r.class} student`
        : r.status
          ? "Eligible"
          : "",
    studentEnroll: gaveTo ?? "",
  };
}

function addMarksSheet(name: string, list: Record_[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  ws.columns = MARK_COLUMNS;
  for (const r of list) ws.addRow(marksRow(r));
  styleHeader(ws);
  band(ws);
  // Anything that failed re-marking, and every substituted mark, is shouted about
  // rather than buried. A result nobody can trace is a result nobody can defend.
  ws.eachRow((row, i) => {
    if (i > 1 && row.getCell("scoreMatches").value === "MISMATCH") {
      row.font = { color: { argb: "FFB00020" }, bold: true };
    }
    const mismatch = String(row.getCell("paperMismatch").value ?? "").startsWith("YES");
    if (i > 1 && row.getCell("marksSource").value) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: mismatch ? "FFFBD9D9" : "FFFDF0D2" },
      };
      if (mismatch) row.getCell("paperMismatch").font = { color: { argb: "FFB00020" }, bold: true };
    }
  });
  return ws;
}

function addAnswerSheet(name: string, list: Record_[]) {
  const ws = wb.addWorksheet(name);
  const cols: Partial<ExcelJS.Column>[] = [
    { header: "Unique ID", key: "uid", width: 12 },
    { header: "Name", key: "name", width: 30 },
    { header: "Class", key: "class", width: 7 },
    { header: "Paper", key: "paper_id", width: 13 },
    { header: "Centre Code", key: "centre_code", width: 12 },
    { header: "School Code", key: "school_code", width: 12 },
    { header: "Marks", key: "score", width: 8 },
  ];
  for (let i = 1; i <= TOTAL; i++) cols.push({ header: `Q${i}`, key: `q${i}`, width: 5 });
  for (let i = 1; i <= TOTAL; i++) cols.push({ header: `Q${i} ✓`, key: `c${i}`, width: 5 });
  ws.columns = cols;

  for (const r of list.filter((x) => x.status)) {
    const answers = r.answers ?? {};
    const paper = r.paper_id ? getPaper(r.paper_id) : null;
    const row: Record<string, unknown> = {
      uid: r.uid,
      name: r.name,
      class: r.class,
      paper_id: r.paper_id ?? "",
      centre_code: r.centre_code,
      school_code: r.school_code,
      score: r.score ?? null,
    };
    for (let i = 0; i < TOTAL; i++) {
      const picked = answers[String(i)];
      // "-" is a deliberate blank: the student saw the question and left it.
      row[`q${i + 1}`] = picked === undefined ? "-" : (LETTERS[picked] ?? String(picked));
      row[`c${i + 1}`] =
        !paper || picked === undefined ? "" : picked === paper.key[i] ? 1 : 0;
    }
    ws.addRow(row);
  }
  styleHeader(ws);
  band(ws);
  return ws;
}

const real = records.filter((r) => !r.is_demo);
const demo = records.filter((r) => r.is_demo);

// Sheet order is the order a human reads them in: the marks first.
const byClass = (a: Record_, b: Record_) =>
  CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class) ||
  (b.score ?? -1) - (a.score ?? -1) ||
  a.name.localeCompare(b.name);

addMarksSheet("Marks — All Students", [...real].sort(byClass));
addAnswerSheet("Answer Sheets", [...real].sort(byClass));

/**
 * Per-class merit lists — and the one place in this workbook where a student who
 * has a mark is deliberately left out.
 *
 * `merit_eligible = false` is set on the three CTR-12 students who re-sat on a
 * demo account's admit card and were handed another class's paper. They keep
 * their marks, their ranks and their full result everywhere else; a merit list
 * that ranked a Class X child on a Class IX paper against classmates who sat the
 * Class X paper would not survive the first school that asked about it.
 */
for (const cls of CLASS_ORDER) {
  const list = real.filter(
    (r) => r.class === cls && r.score !== null && r.merit_eligible !== false,
  );
  list.sort((a, b) => (b.score as number) - (a.score as number) || a.name.localeCompare(b.name));
  const ws = addMarksSheet(`Class ${cls} Merit`, list);
  const held = real.filter((r) => r.class === cls && r.merit_eligible === false);
  if (held.length) {
    const note = ws.addRow({});
    note.getCell(1).value =
      `Held off this merit list (${held.length}): ` +
      held.map((r) => `${r.name} ${r.uid} — ${r.score}/50 on ${r.paper_id}`).join("; ") +
      ". Marks stand; see the Demo ID Substitutions sheet.";
    note.getCell(1).font = { italic: true, color: { argb: "FFB00020" } };
    note.height = 22;
  }
}

// ----- centre and school summaries
{
  const ws = wb.addWorksheet("Centre Summary");
  ws.columns = [
    { header: "Centre Code", key: "code", width: 12 },
    { header: "Centre Name", key: "name", width: 46 },
    { header: "Class", key: "class", width: 8 },
    { header: "Enrolled", key: "enrolled", width: 10 },
    { header: "Appeared", key: "appeared", width: 10 },
    { header: "Absent", key: "absent", width: 9 },
    { header: "Appeared %", key: "pct", width: 11 },
    { header: "Average Marks", key: "avg", width: 13 },
    { header: "Highest", key: "max", width: 9 },
    { header: "Lowest", key: "min", width: 9 },
    { header: "Topper", key: "topper", width: 30 },
  ];
  const groups = groupBy(real, (r) => `${r.centre_code}|${r.class}`);
  const keys = [...groups.keys()].sort((a, b) => {
    const [ca, cla] = a.split("|");
    const [cb, clb] = b.split("|");
    return ca.localeCompare(cb) || CLASS_ORDER.indexOf(cla) - CLASS_ORDER.indexOf(clb);
  });
  for (const k of keys) {
    const g = groups.get(k)!;
    const sat = g.filter((r) => r.score !== null);
    const scores = sat.map((r) => r.score as number);
    const top = sat.reduce<Record_ | null>(
      (best, r) => (!best || (r.score as number) > (best.score as number) ? r : best),
      null,
    );
    ws.addRow({
      code: g[0].centre_code,
      name: g[0].centre_name,
      class: g[0].class,
      enrolled: g.length,
      appeared: sat.length,
      absent: g.length - sat.length,
      pct: g.length ? Math.round((sat.length / g.length) * 1000) / 10 : 0,
      avg: scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100 : null,
      max: scores.length ? Math.max(...scores) : null,
      min: scores.length ? Math.min(...scores) : null,
      topper: top ? `${top.name} (${top.uid})` : "",
    });
  }
  styleHeader(ws, 1);
  band(ws);
}

{
  const ws = wb.addWorksheet("School Summary");
  ws.columns = [
    { header: "Centre Code", key: "centre", width: 12 },
    { header: "School Code", key: "code", width: 12 },
    { header: "School Name", key: "name", width: 46 },
    { header: "Class", key: "class", width: 8 },
    { header: "Enrolled", key: "enrolled", width: 10 },
    { header: "Appeared", key: "appeared", width: 10 },
    { header: "Absent", key: "absent", width: 9 },
    { header: "Average Marks", key: "avg", width: 13 },
    { header: "Highest", key: "max", width: 9 },
    { header: "Topper", key: "topper", width: 30 },
  ];
  const groups = groupBy(real, (r) => `${r.centre_code}|${r.school_code}|${r.class}`);
  for (const k of [...groups.keys()].sort()) {
    const g = groups.get(k)!;
    const sat = g.filter((r) => r.score !== null);
    const scores = sat.map((r) => r.score as number);
    const top = sat.reduce<Record_ | null>(
      (best, r) => (!best || (r.score as number) > (best.score as number) ? r : best),
      null,
    );
    ws.addRow({
      centre: g[0].centre_code,
      code: g[0].school_code,
      name: g[0].school_name,
      class: g[0].class,
      enrolled: g.length,
      appeared: sat.length,
      absent: g.length - sat.length,
      avg: scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100 : null,
      max: scores.length ? Math.max(...scores) : null,
      topper: top ? `${top.name} (${top.uid})` : "",
    });
  }
  styleHeader(ws, 2);
  band(ws);
}

// ----- score distribution, class by class
{
  const ws = wb.addWorksheet("Score Distribution");
  ws.columns = [
    { header: "Marks", key: "mark", width: 8 },
    ...CLASS_ORDER.map((c) => ({ header: `Class ${c}`, key: c, width: 11 })),
    { header: "All Classes", key: "all", width: 12 },
  ];
  for (let m = 0; m <= TOTAL; m++) {
    const row: Record<string, unknown> = { mark: m };
    let all = 0;
    for (const c of CLASS_ORDER) {
      const n = real.filter((r) => r.class === c && r.score === m).length;
      row[c] = n;
      all += n;
    }
    row.all = all;
    ws.addRow(row);
  }
  styleHeader(ws, 1);
  band(ws);
}

// ----- per-question difficulty: how the cohort actually found each question
{
  const ws = wb.addWorksheet("Question Analysis");
  ws.columns = [
    { header: "Paper", key: "paper", width: 13 },
    { header: "Q. No.", key: "n", width: 8 },
    { header: "Question", key: "q", width: 70 },
    { header: "Correct Option", key: "key", width: 13 },
    { header: "Attempted", key: "attempted", width: 11 },
    { header: "Correct", key: "correct", width: 10 },
    { header: "Correct %", key: "pct", width: 11 },
    { header: "Chose A", key: "a", width: 9 },
    { header: "Chose B", key: "b", width: 9 },
    { header: "Chose C", key: "c", width: 9 },
    { header: "Chose D", key: "d", width: 9 },
    { header: "Left Blank", key: "blank", width: 11 },
  ];
  for (const cls of CLASS_ORDER) {
    const id = `SET2026-${cls}`;
    const paper = getPaper(id);
    if (!paper) continue;
    const sat = real.filter((r) => r.paper_id === id && r.status);
    for (let i = 0; i < TOTAL; i++) {
      const counts = [0, 0, 0, 0];
      let blank = 0;
      for (const r of sat) {
        const picked = (r.answers ?? {})[String(i)];
        if (picked === undefined) blank++;
        else if (counts[picked] !== undefined) counts[picked]++;
      }
      const attempted = sat.length - blank;
      const correct = counts[paper.key[i]];
      ws.addRow({
        paper: id,
        n: i + 1,
        q: paper.questions[i].q,
        key: LETTERS[paper.key[i]],
        attempted,
        correct,
        pct: sat.length ? Math.round((correct / sat.length) * 1000) / 10 : 0,
        a: counts[0],
        b: counts[1],
        c: counts[2],
        d: counts[3],
        blank,
      });
    }
  }
  styleHeader(ws, 2);
  band(ws);
}

// ----- the audit log, exactly as recorded
{
  const ws = wb.addWorksheet("Exam Events");
  ws.columns = [
    { header: "Event ID", key: "id", width: 10 },
    { header: "Unique ID", key: "uid", width: 12 },
    { header: "Name", key: "name", width: 30 },
    { header: "Class", key: "class", width: 7 },
    { header: "Centre Code", key: "centre", width: 12 },
    { header: "Kind", key: "kind", width: 12 },
    { header: "At (IST)", key: "at", width: 21 },
    { header: "Detail", key: "detail", width: 44 },
    { header: "Demo", key: "demo", width: 8 },
  ];
  for (const e of events) {
    ws.addRow({
      id: Number(e.id),
      uid: String(e.uid),
      name: e.name ? String(e.name) : "",
      class: e.class ? String(e.class) : "",
      centre: e.centre_code ? String(e.centre_code) : "",
      kind: String(e.kind),
      at: ist(e.at),
      detail: e.detail ? JSON.stringify(e.detail) : "",
      demo: e.is_demo ? "YES" : "No",
    });
  }
  styleHeader(ws, 2);
  band(ws);
}

// ----- answer keys, so any mark in this file can be checked by hand
{
  const ws = wb.addWorksheet("Answer Keys");
  ws.columns = [
    { header: "Paper", key: "paper", width: 13 },
    { header: "Q. No.", key: "n", width: 8 },
    { header: "Question", key: "q", width: 70 },
    { header: "Option A", key: "a", width: 26 },
    { header: "Option B", key: "b", width: 26 },
    { header: "Option C", key: "c", width: 26 },
    { header: "Option D", key: "d", width: 26 },
    { header: "Correct", key: "key", width: 9 },
  ];
  for (const cls of CLASS_ORDER) {
    const paper = getPaper(`SET2026-${cls}`);
    if (!paper) continue;
    paper.questions.forEach((q, i) => {
      ws.addRow({
        paper: paper.id,
        n: i + 1,
        q: q.q,
        a: q.options[0],
        b: q.options[1],
        c: q.options[2],
        d: q.options[3],
        key: LETTERS[paper.key[i]],
      });
    });
  }
  styleHeader(ws, 2);
  band(ws);
}

// ----- the substitution register: the whole story on one page
{
  const ws = wb.addWorksheet("Demo ID Substitutions");
  ws.columns = [
    { header: "Student ID", key: "uid", width: 12 },
    { header: "Student Name", key: "name", width: 26 },
    { header: "Class", key: "class", width: 7 },
    { header: "School", key: "school", width: 36 },
    { header: "Centre", key: "centre", width: 11 },
    { header: "Demo ID Used", key: "demo", width: 13 },
    { header: "Demo Account Name", key: "demoName", width: 24 },
    { header: "Paper Sat", key: "paper", width: 13 },
    { header: "Paper Mismatch", key: "mismatch", width: 32 },
    { header: "Voided Own Marks", key: "voided", width: 14 },
    { header: "Voided Own Answered", key: "voidedAns", width: 16 },
    { header: "Voided Submitted (IST)", key: "voidedAt", width: 21 },
    { header: "Marks Awarded", key: "score", width: 13 },
    { header: "Answered", key: "answered", width: 10 },
    { header: "Submitted (IST)", key: "at", width: 21 },
    { header: "Rank in Class (after)", key: "rank", width: 15 },
    { header: "Merit List", key: "merit", width: 34 },
    { header: "Note", key: "note", width: 44 },
  ];
  for (const sub of SUBS) {
    const r = records.find((x) => x.uid.trim() === sub.studentUid)!;
    const t = transfers.get(sub.studentUid)!;
    ws.addRow({
      uid: r.uid,
      name: r.name,
      class: r.class,
      school: r.school_name,
      centre: r.centre_code,
      demo: t.satOnDemoUid,
      demoName: t.satOnDemoName,
      paper: r.paper_id,
      mismatch: t.paperMismatch ? `YES — Class ${r.class} student sat ${r.paper_id}` : "No",
      voided: t.voidedScore,
      voidedAns: t.voidedAnswered,
      voidedAt: ist(t.voidedSubmittedAt),
      score: r.score,
      answered: r.answered,
      at: ist(r.submitted_at),
      rank: r.classRank,
      merit: t.meritEligible ? "Eligible" : `Excluded — sat ${r.paper_id}, not the Class ${r.class} paper`,
      note: sub.note ?? "",
    });
  }
  styleHeader(ws, 2);
  band(ws);
  ws.eachRow((row, i) => {
    if (i > 1 && String(row.getCell("mismatch").value ?? "").startsWith("YES")) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBD9D9" } };
      row.getCell("mismatch").font = { color: { argb: "FFB00020" }, bold: true };
    }
  });
}

// ----- demo accounts, kept out of every number above
addMarksSheet("Demo Accounts — Marks", [...demo].sort(byClass));
addAnswerSheet("Demo Accounts — Answers", [...demo].sort(byClass));

// ----- the cover sheet, written last but read first
{
  const ws = overview;
  ws.columns = [
    { header: "Measure", key: "k", width: 40 },
    { header: "Value", key: "v", width: 34 },
  ];
  const sat = real.filter((r) => r.score !== null);
  const scores = sat.map((r) => r.score as number);
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : null;
  const mismatches = records.filter((r) => r.scoreMatches === "MISMATCH").length;

  const lines: [string, string | number][] = [
    ["Examination", "SET 2026-27 (First Phase) — Online Exam"],
    ["Exam date", ist(EXAM.startsAt)],
    ["Duration", `${EXAM.durationMinutes} minutes`],
    ["Questions per paper", TOTAL],
    ["Marking", "1 mark per correct answer; no negative marking"],
    ["Exported at (IST)", ist(new Date())],
    ["", ""],
    ["Students enrolled (real)", real.length],
    ["Appeared (paper submitted)", sat.length],
    ["Did not appear", real.length - sat.length],
    ["Appearance rate", `${Math.round((sat.length / real.length) * 1000) / 10}%`],
    ["", ""],
    ["Average marks", scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100 : ""],
    ["Median marks", median ?? ""],
    ["Highest marks", scores.length ? Math.max(...scores) : ""],
    ["Lowest marks", scores.length ? Math.min(...scores) : ""],
    ["Scored 40 or above", scores.filter((s) => s >= 40).length],
    ["Scored full marks (50)", scores.filter((s) => s === TOTAL).length],
    ["", ""],
    ...CLASS_ORDER.flatMap((c): [string, string | number][] => {
      const g = real.filter((r) => r.class === c);
      const s = g.filter((r) => r.score !== null).map((r) => r.score as number);
      return [
        [
          `Class ${c}`,
          `${g.length} enrolled · ${s.length} appeared · avg ${
            s.length ? Math.round((s.reduce((a, x) => a + x, 0) / s.length) * 100) / 100 : "—"
          } · high ${s.length ? Math.max(...s) : "—"}`,
        ],
      ];
    }),
    ["", ""],
    ["Demo accounts (excluded above)", demo.length],
    ["Demo accounts that sat the paper", demo.filter((r) => r.score !== null).length],
    ["", ""],
    ["", ""],
    ["Demo ID substitutions applied", SUBS.length],
    [
      "  …of which sat another class's paper",
      [...transfers.values()].filter((t) => t.paperMismatch).length,
    ],
    [
      "Held off the merit list",
      `${real.filter((r) => r.merit_eligible === false).length} — marks stand, ranks stand, merit list only`,
    ],
    ["", ""],
    ["Re-marked score mismatches", mismatches === 0 ? "0 — every stored mark verified" : `${mismatches} — SEE RED ROWS`],
    ["Source", "Neon Postgres: students + attempts + exam_events (the /admin tables)"],
  ];
  for (const [k, v] of lines) ws.addRow({ k, v });
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  head.height = 24;
  ws.getColumn("k").font = { bold: true };
}

await wb.xlsx.writeFile(OUT);

const mismatches = records.filter((r) => r.scoreMatches === "MISMATCH");
console.log(`\nWrote ${OUT}`);
console.log(`  ${real.length} students, ${real.filter((r) => r.score !== null).length} marked papers`);
console.log(`  ${demo.length} demo accounts on their own sheets`);
for (const sub of SUBS) {
  const r = records.find((x) => x.uid.trim() === sub.studentUid)!;
  const t = transfers.get(sub.studentUid)!;
  console.log(
    `  sub: ${r.uid} ${r.name} (${r.class}) ${t.voidedScore} -> ${r.score} from demo ${t.satOnDemoUid}` +
      (t.paperMismatch ? `  ⚠ sat ${r.paper_id}, not the Class ${r.class} paper` : ""),
  );
}
console.log(
  mismatches.length
    ? `  ⚠ ${mismatches.length} stored score(s) disagree with a re-mark: ${mismatches
        .slice(0, 10)
        .map((r) => r.uid)
        .join(", ")}`
    : "  ✓ every stored score re-marked and verified",
);

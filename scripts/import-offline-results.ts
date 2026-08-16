/**
 * Load the offline written paper's marks into Neon, and rank them.
 *
 *   node scripts/import-offline-results.ts --status
 *   node scripts/import-offline-results.ts --dry-run
 *   node scripts/import-offline-results.ts
 *   node scripts/import-offline-results.ts --file "C:\path\offline-results.json"
 *
 * The marking happens on a machine that never touches the internet
 * (`Desktop\KIDS OMR 2026`). `export_for_web.py` there writes a json of derived
 * numbers — marks, sections, and four 100-character strings that reproduce the
 * answer sheet — and this reads it in. No scan, no image, no handwriting and no
 * phone number crosses. The export lives outside this repo on purpose: it is
 * 7,287 children's marks and this repo is public.
 *
 * This script does NOT publish anything. It fills the tables and leaves
 * `results_meta.offline_published` alone; releasing is a separate, deliberate
 * act (`scripts/publish-offline.ts`). Safe to re-run: every row is upserted, so
 * a re-marked sheet is corrected by exporting and importing again.
 *
 * Ranking is `src/lib/exam/ranking.ts`, the same module the online result uses,
 * so the two halves of the same morning can never disagree about what a rank
 * means. Within class only; ties share a place; absentees have no rank at all.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { rankAll, type Ranks } from "../src/lib/exam/ranking.ts";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (match) process.env[match[1]] ??= match[2];
}

const sql = neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const STATUS = args.includes("--status");
const fileArg = args.indexOf("--file");
const FILE =
  fileArg >= 0 ? args[fileArg + 1] : "C:\\Users\\GADZET ZONE\\Desktop\\offline-results.json";

interface Section {
  name: string; key_id: string; first: number; last: number; total: number;
  correct: number; wrong: number; blank: number; grace: number; marks: number;
}
interface Row {
  uid: string; class: string; stream: string;
  centre_code: string; school_code: string; zone: string;
  marks: number; total_q: number;
  correct: number; wrong: number; blank: number; grace: number;
  sections: Section[]; panels: string[];
  marked: string; second: string; key: string; outcome: string;
  form: string; source: string; hand_set: number;
  issued_form: string; sat_class_ruled: string;
  // filled in below
  score?: number | null; is_demo?: boolean; ranks?: Ranks;
}

async function status(): Promise<void> {
  const [n] = await sql`select count(*)::int n from offline_results`;
  const [q] = await sql`select count(*)::int n from offline_question_stats`;
  const [s] = await sql`select count(*)::int n from offline_section_stats`;
  const [m] = await sql`
    select offline_published, offline_publish_at, offline_computed_at, offline_totals
    from results_meta`;
  console.log(`offline_results        ${n.n.toLocaleString()}`);
  console.log(`offline_question_stats ${q.n.toLocaleString()}`);
  console.log(`offline_section_stats  ${s.n.toLocaleString()}`);
  console.log(`published              ${m?.offline_published ? "YES" : "no"}`);
  console.log(`publish_at             ${m?.offline_publish_at ?? "—"}`);
  console.log(`computed_at            ${m?.offline_computed_at ?? "—"}`);
  if (m?.offline_totals && Object.keys(m.offline_totals).length) {
    console.log(`totals                 ${JSON.stringify(m.offline_totals)}`);
  }
}

async function main(): Promise<number> {
  if (STATUS) {
    await status();
    return 0;
  }

  console.log(`reading ${FILE}`);
  const payload = JSON.parse(readFileSync(FILE, "utf8")) as {
    exported: string;
    students: Row[];
    question_stats: { key_id: string; n: number; correct_pct: number; sat: number }[];
    section_stats: { class: string; stream: string; section: string; total: number; sat: number; avg: number }[];
  };
  const rows = payload.students;
  console.log(`  exported ${payload.exported} · ${rows.length.toLocaleString()} results`);

  // Every result must belong to a student the site already knows. A mark with
  // no student is not importable — the page has no name, school or centre to
  // show beside it — and it is far likelier to be a bad Unique ID than a
  // missing child, so it stops the run rather than being written.
  const known = new Map<string, { is_demo: boolean }>();
  for (const r of await sql`select uid, is_demo from students`) {
    known.set((r.uid as string).trim(), { is_demo: r.is_demo as boolean });
  }
  const orphans = rows.filter((r) => !known.has(r.uid));
  if (orphans.length) {
    console.error(`\n  ! ${orphans.length} result(s) have no student row: ` +
      orphans.slice(0, 10).map((r) => r.uid).join(", "));
    console.error("    seed the students first (scripts/seed-students.ts), or fix the ID.");
    return 1;
  }

  // Rank with the same module the online result uses.
  for (const r of rows) {
    r.score = r.marks;
    r.is_demo = known.get(r.uid)!.is_demo;
    r.ranks = { classRank: null, centreRank: null, schoolRank: null, percentile: null };
  }
  rankAll(
    rows as unknown as (Row & { class: string; centre_code: string; school_code: string; is_demo: boolean; score: number | null })[],
    (r) => (r as Row).ranks!,
  );

  // Cohort sizes and averages are over who SAT, never over who was enrolled:
  // "148 of 1,842" must not compare a rank against children who never came.
  const count = new Map<string, number>();
  const sum = new Map<string, number>();
  const high = new Map<string, number>();
  const bump = (k: string, v: number) => {
    count.set(k, (count.get(k) ?? 0) + 1);
    sum.set(k, (sum.get(k) ?? 0) + v);
    high.set(k, Math.max(high.get(k) ?? 0, v));
  };
  for (const r of rows) {
    if (r.is_demo) continue;
    bump(`c|${r.class}`, r.marks);
    bump(`t|${r.centre_code}|${r.class}`, r.marks);
    bump(`s|${r.centre_code}|${r.school_code}|${r.class}`, r.marks);
  }

  if (DRY) {
    console.log("\n  dry run — nothing written\n");
    for (const cls of ["IX", "X", "XI", "XII"]) {
      const n = count.get(`c|${cls}`) ?? 0;
      if (!n) continue;
      const avg = (sum.get(`c|${cls}`)! / n).toFixed(2);
      const top = rows.filter((r) => r.class === cls && r.ranks!.classRank === 1);
      console.log(`  ${cls.padEnd(4)} ${String(n).padStart(5)} sat · avg ${avg} · high ` +
        `${high.get(`c|${cls}`)} · ${top.length} at rank 1`);
    }
    console.log(`\n  ${payload.question_stats.length} question stats, ` +
      `${payload.section_stats.length} section averages would be written`);
    return 0;
  }

  // The whole schema, split exactly as scripts/seed-students.ts splits it —
  // every statement is `if not exists`, so applying all of it is idempotent and
  // this script does not need to know which half it owns.
  console.log("  applying schema…");
  const schema = readFileSync("src/lib/exam/schema.sql", "utf8");
  for (const stmt of schema.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }

  console.log(`  writing ${rows.length.toLocaleString()} results…`);
  const CHUNK = 250;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await Promise.all(slice.map((r) => {
      const ck = `c|${r.class}`;
      const tk = `t|${r.centre_code}|${r.class}`;
      const sk = `s|${r.centre_code}|${r.school_code}|${r.class}`;
      const classSat = count.get(ck) ?? 1;
      return sql`
        insert into offline_results (
          uid, class, stream, marks, correct, wrong, blank, grace, total_q,
          class_rank, centre_rank, school_rank, percentile,
          class_sat, centre_sat, school_sat, class_avg, class_high, ranked,
          sections, panels, marked, second, answer_key, outcome,
          form, source, hand_set, computed_at
        ) values (
          ${r.uid}, ${r.class}, ${r.stream || null},
          ${r.marks}, ${r.correct}, ${r.wrong}, ${r.blank}, ${r.grace}, ${r.total_q},
          ${r.ranks!.classRank}, ${r.ranks!.centreRank}, ${r.ranks!.schoolRank},
          ${r.ranks!.percentile},
          ${classSat}, ${count.get(tk) ?? 1}, ${count.get(sk) ?? 1},
          ${((sum.get(ck) ?? 0) / classSat).toFixed(2)}, ${high.get(ck) ?? r.marks},
          ${!r.is_demo},
          ${JSON.stringify(r.sections)}, ${JSON.stringify(r.panels)},
          ${r.marked}, ${r.second}, ${r.key}, ${r.outcome},
          ${r.form}, ${r.source}, ${r.hand_set}, now()
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
          hand_set = excluded.hand_set, computed_at = now()`;
    }));
    done += slice.length;
    if (done % 1000 < CHUNK) console.log(`    ${done.toLocaleString()} / ${rows.length.toLocaleString()}`);
  }

  console.log(`  writing ${payload.question_stats.length} question stats…`);
  await sql`delete from offline_question_stats`;
  for (let i = 0; i < payload.question_stats.length; i += CHUNK) {
    await Promise.all(payload.question_stats.slice(i, i + CHUNK).map((q) => sql`
      insert into offline_question_stats (key_id, n, correct_pct, sat)
      values (${q.key_id}, ${q.n}, ${q.correct_pct}, ${q.sat})
      on conflict (key_id, n) do update set
        correct_pct = excluded.correct_pct, sat = excluded.sat`));
  }

  console.log(`  writing ${payload.section_stats.length} section averages…`);
  await sql`delete from offline_section_stats`;
  await Promise.all(payload.section_stats.map((s) => sql`
    insert into offline_section_stats (class, stream, section, total, sat, avg)
    values (${s.class}, ${s.stream ?? ""}, ${s.section}, ${s.total}, ${s.sat}, ${s.avg})
    on conflict (class, stream, section) do update set
      total = excluded.total, sat = excluded.sat, avg = excluded.avg`));

  // The cohort-wide numbers the page quotes in prose. Demo accounts are
  // excluded: a student reading "7,287 of 9,641 sat it" is being told about
  // their classmates, not about the KIDS team.
  const real = rows.filter((r) => !r.is_demo);
  const [{ enrolled }] = await sql`
    select count(*)::int enrolled from students where is_demo = false`;
  const marks = real.map((r) => r.marks).sort((a, b) => a - b);
  const totals = {
    enrolled,
    sat: real.length,
    absent: enrolled - real.length,
    average: +(marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2),
    median: marks[Math.floor(marks.length / 2)],
    fullMarks: marks.filter((m) => m === 100).length,
    highest: marks[marks.length - 1],
    byClass: Object.fromEntries(["IX", "X", "XI", "XII"].map((c) => {
      const v = real.filter((r) => r.class === c).map((r) => r.marks);
      return [c, v.length
        ? { sat: v.length, average: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2),
            highest: Math.max(...v) }
        : null];
    }).filter(([, v]) => v)),
  };
  await sql`
    insert into results_meta (id, offline_totals, offline_computed_at)
    values (true, ${JSON.stringify(totals)}, now())
    on conflict (id) do update set
      offline_totals = excluded.offline_totals,
      offline_computed_at = now()`;

  console.log("\n  done. NOT published — that is a separate step.");
  await status();
  return 0;
}

process.exit(await main());

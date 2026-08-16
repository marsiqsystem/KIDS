/**
 * Reading a published OFFLINE result — the written OMR paper of 19 July 2026.
 *
 * The twin of `results.ts`, and deliberately shaped like it, so the two halves
 * of the same morning cannot drift apart in how they gate, rank or phrase
 * anything. The differences are all in the paper, not in the plumbing:
 *
 *   * it has its own switch. `results_meta.published` released the online
 *     paper on 1 August; this reads `offline_published` / `offline_publish_at`.
 *     Releasing one must never release the other.
 *   * the sheet is stored as four 100-character strings rather than as answers,
 *     because there is no server-side paper to look the questions up in — the
 *     questions were on paper, in the child's hands. What we can show is the
 *     bubble they filled and the bubble the key wanted, which is exactly what
 *     the printed marksheet shows.
 *   * a question can be DOUBLE (two bubbles filled, scored as wrong) or GRACE
 *     (withdrawn, awarded to everyone). The online paper has neither.
 *
 * Nothing here is computed per request. `scripts/import-offline-results.ts`
 * wrote the snapshot; this is a plain read of it.
 */
import { sql } from "./db";
import type { Student } from "./db";

/** What became of one question on the sheet. */
export type OfflineStatus = "correct" | "wrong" | "blank" | "double" | "grace";

const STATUS: Record<string, OfflineStatus> = {
  c: "correct", w: "wrong", b: "blank", d: "double", g: "grace",
};

/** One question, as the scanner read it off the paper. */
export interface OfflineQuestion {
  n: number;
  /** The bubble filled, or null if none. On a double, the first of the two. */
  marked: string | null;
  /** The second bubble, when two were filled. */
  second: string | null;
  /** What the key wanted, or null where the question was withdrawn. */
  key: string | null;
  status: OfflineStatus;
  /** Which section of the paper this question belongs to. */
  section: string;
  /** Share of everyone who sat this block who got it right, to one decimal. */
  classPct: number | null;
}

/** One named block of the paper — a section of IX/X, a subject of XI/XII. */
export interface OfflineSection {
  name: string;
  keyId: string;
  first: number;
  last: number;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  grace: number;
  marks: number;
  percent: number;
  /** The class average for this section, so a bar can carry a comparison line. */
  classAvg: number | null;
}

export interface OfflineMarksheet {
  uid: string;
  /** The class whose PAPER was marked — see the note in schema.sql. */
  class: string;
  stream: string | null;
  marks: number;
  total: number;
  percent: number;
  /** Includes questions granted grace, so correct + wrong + blank = total. */
  correct: number;
  wrong: number;
  blank: number;
  grace: number;
  /** Two bubbles filled. Counted inside `wrong`, which is how they scored. */
  doubles: number;
  isFullMarks: boolean;

  /** Null for all of these when the student is not ranked. */
  classRank: number | null;
  centreRank: number | null;
  schoolRank: number | null;
  percentile: number | null;
  classSat: number;
  centreSat: number;
  schoolSat: number;
  classAvg: number;
  classHigh: number;
  ranked: boolean;

  sections: OfflineSection[];
  /** The three optional subjects, XI/XII only. */
  panels: string[];
  questions: OfflineQuestion[];

  /** X100 | XII100 — the printed form the student actually held. */
  form: string;
  /** How many questions a person settled by eye rather than the reader. */
  handSet: number;
}

export interface OfflineCohort {
  enrolled: number;
  sat: number;
  absent: number;
  average: number;
  median: number;
  highest: number;
  fullMarks: number;
}

export interface OfflinePublication {
  published: boolean;
  publishedOn: string;
}

const istDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric",
  }).format(d);

/**
 * Is the written paper's result out?
 *
 * Both conditions, as for the online paper: authorised AND the announced moment
 * reached, judged by the DATABASE clock. A missing table means "no" — a portal
 * that cannot reach the results must say "not yet", never show an error and
 * never show an empty result full of zeroes.
 */
export async function offlinePublicationState(): Promise<OfflinePublication> {
  // Local-only escape hatch, same as the online one. NEVER set this in Vercel.
  if (process.env.KIDS_RESULTS_PREVIEW === "1") {
    return { published: true, publishedOn: istDate(new Date()) };
  }
  try {
    const rows = (await sql`
      select offline_published_at,
             offline_publish_at,
             (offline_published and offline_publish_at is not null
              and now() >= offline_publish_at) as is_open
      from results_meta where id
    `) as { offline_published_at: string | null; offline_publish_at: string | null; is_open: boolean }[];
    const row = rows[0];
    if (!row?.is_open) return { published: false, publishedOn: "" };
    const stamp = row.offline_publish_at ?? row.offline_published_at;
    return { published: true, publishedOn: stamp ? istDate(new Date(stamp)) : "" };
  } catch {
    return { published: false, publishedOn: "" };
  }
}

/** The cohort-wide numbers the page quotes in prose. */
export async function offlineCohort(): Promise<OfflineCohort> {
  try {
    const rows = (await sql`select offline_totals from results_meta where id`) as
      { offline_totals: Partial<OfflineCohort> }[];
    const t = rows[0]?.offline_totals ?? {};
    return {
      enrolled: t.enrolled ?? 0, sat: t.sat ?? 0, absent: t.absent ?? 0,
      average: t.average ?? 0, median: t.median ?? 0,
      highest: t.highest ?? 0, fullMarks: t.fullMarks ?? 0,
    };
  } catch {
    return { enrolled: 0, sat: 0, absent: 0, average: 0, median: 0, highest: 0, fullMarks: 0 };
  }
}

interface Row {
  uid: string; class: string; stream: string | null;
  marks: number; correct: number; wrong: number; blank: number; grace: number;
  total_q: number;
  class_rank: number | null; centre_rank: number | null; school_rank: number | null;
  percentile: string | null;
  class_sat: number; centre_sat: number; school_sat: number;
  class_avg: string; class_high: number; ranked: boolean;
  sections: {
    name: string; key_id: string; first: number; last: number; total: number;
    correct: number; wrong: number; blank: number; grace: number; marks: number;
  }[];
  panels: string[];
  marked: string; second: string; answer_key: string; outcome: string;
  form: string; hand_set: number;
}

/**
 * This student's published written-paper marksheet, or null if they did not sit.
 *
 * Null is the honest answer for a student with no sheet: they were absent, and
 * the page says so in words rather than showing a zero they did not earn. A
 * genuine zero would be a row like any other.
 */
export async function findOfflineMarksheet(student: Student): Promise<OfflineMarksheet | null> {
  const rows = (await sql`
    select * from offline_results where uid = ${student.uid}
  `) as Row[];
  const r = rows[0];
  if (!r) return null;

  // The class average for each of this student's sections, and how the cohort
  // found each question. Both are read, never derived, so two students opening
  // their result a minute apart see the same comparison.
  const [avgRaw, statRaw] = await Promise.all([
    sql`select section, avg from offline_section_stats
        where class = ${r.class} and stream = ${r.stream ?? ""}`,
    sql`select key_id, n, correct_pct from offline_question_stats
        where key_id = any(${r.sections.map((s) => s.key_id).filter(Boolean)})`,
  ]);
  const avgRows = avgRaw as unknown as { section: string; avg: string }[];
  const statRows = statRaw as unknown as { key_id: string; n: number; correct_pct: string }[];
  const avgOf = new Map(avgRows.map((a) => [a.section, Number(a.avg)]));
  const pctOf = new Map(statRows.map((s) => [`${s.key_id}|${s.n}`, Number(s.correct_pct)]));

  const sections: OfflineSection[] = r.sections.map((s) => ({
    name: s.name, keyId: s.key_id, first: s.first, last: s.last, total: s.total,
    correct: s.correct, wrong: s.wrong, blank: s.blank, grace: s.grace,
    marks: s.marks,
    percent: s.total ? Math.round((100 * s.marks) / s.total) : 0,
    classAvg: avgOf.get(s.name) ?? null,
  }));

  const questions: OfflineQuestion[] = [];
  for (let i = 0; i < r.outcome.length; i++) {
    const n = i + 1;
    const sec = sections.find((s) => n >= s.first && n <= s.last);
    const letter = (c: string) => (c && c !== "-" ? c : null);
    questions.push({
      n,
      marked: letter(r.marked[i]),
      second: letter(r.second[i]),
      key: r.answer_key[i] === "g" ? null : letter(r.answer_key[i]),
      status: STATUS[r.outcome[i]] ?? "blank",
      section: sec?.name ?? "",
      // The stats are keyed by the answer key and numbered inside it, because
      // "Q37" is not the same question for two XI classmates who chose
      // different subjects.
      classPct: sec ? pctOf.get(`${sec.keyId}|${n - sec.first + 1}`) ?? null : null,
    });
  }

  const doubles = [...r.outcome].filter((c) => c === "d").length;

  return {
    uid: r.uid.trim(),
    class: r.class,
    stream: r.stream,
    marks: r.marks,
    total: r.total_q,
    percent: r.total_q ? Math.round((100 * r.marks) / r.total_q) : 0,
    correct: r.correct, wrong: r.wrong, blank: r.blank, grace: r.grace,
    doubles,
    isFullMarks: r.marks === r.total_q,
    classRank: r.class_rank, centreRank: r.centre_rank, schoolRank: r.school_rank,
    percentile: r.percentile === null ? null : Number(r.percentile),
    classSat: r.class_sat, centreSat: r.centre_sat, schoolSat: r.school_sat,
    classAvg: Number(r.class_avg), classHigh: r.class_high,
    ranked: r.ranked,
    sections, panels: r.panels ?? [], questions,
    form: r.form, handSet: r.hand_set,
  };
}

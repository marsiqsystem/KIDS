/**
 * How a mark becomes a position.
 *
 * Pure arithmetic, and deliberately no database import: this module is loaded
 * both by the Next runtime (src/lib/exam/results.ts) and by a bare-node script
 * (scripts/export-marks.ts, scripts/publish-results.ts). It was lifted out of
 * export-marks.ts unchanged so the marksheet a student reads and the workbook
 * the office reads can never quietly disagree about where that student came.
 *
 * Two rules are load-bearing and must survive any edit here:
 *
 *   1. A student who never sat the paper has NO rank. Not last place — none.
 *      Ranking absentees would invent a position out of an absence.
 *   2. Ranks only ever mean something inside one class. IX, X, XI and XII sat
 *      four different papers, so 34 on one is not 34 on another.
 */

/** Anything with a mark. `null` means they did not sit the paper. */
export interface Rankable {
  score: number | null;
}

/**
 * Competition rank — 1, 2, 2, 4 — over the students who actually sat.
 *
 * Ties genuinely share a position: two students on 41 are both 2nd, and the
 * next student is 4th. Breaking a tie would need a tiebreaker we do not have
 * and could not defend to the two children involved.
 */
export function rank<T extends Rankable>(group: T[], assign: (row: T, n: number) => void): void {
  const sat = group.filter((r) => r.score !== null && r.score !== undefined);
  sat.sort((a, b) => (b.score as number) - (a.score as number));

  let last: number | null = null;
  let n = 0;
  sat.forEach((r, i) => {
    if (r.score !== last) {
      n = i + 1;
      last = r.score as number;
    }
    assign(r, n);
  });
}

/**
 * Percentile within the cohort that sat, to one decimal.
 *
 * Top of the class is 100.0, bottom is 0.0. A cohort of one has no percentile —
 * you cannot be above or below yourself — so it returns null rather than a
 * meaningless 100.
 */
export function percentileOf(classRank: number | null, sat: number): number | null {
  if (classRank === null || sat <= 1) return null;
  return Math.round(((sat - classRank) / (sat - 1)) * 1000) / 10;
}

export function groupBy<T>(list: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of list) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/** The four cohorts a student is ranked inside. Class always; never across classes. */
export interface Cohorted extends Rankable {
  class: string;
  centre_code: string;
  school_code: string;
  is_demo: boolean;
}

export interface Ranks {
  classRank: number | null;
  centreRank: number | null;
  schoolRank: number | null;
  percentile: number | null;
}

/**
 * Rank everyone, in place.
 *
 * Real students and the KIDS Team demo accounts are ranked in SEPARATE pools.
 * A demo account sitting inside the real ranks would push a real child down a
 * place for a mark nobody scored.
 */
export function rankAll<T extends Cohorted>(rows: T[], out: (row: T) => Ranks): void {
  for (const pool of [rows.filter((r) => !r.is_demo), rows.filter((r) => r.is_demo)]) {
    for (const [, g] of groupBy(pool, (r) => r.class)) {
      rank(g, (r, n) => (out(r).classRank = n));
      const sat = g.filter((r) => r.score !== null && r.score !== undefined).length;
      for (const r of g) out(r).percentile = percentileOf(out(r).classRank, sat);
    }
    for (const [, g] of groupBy(pool, (r) => `${r.centre_code}|${r.class}`)) {
      rank(g, (r, n) => (out(r).centreRank = n));
    }
    for (const [, g] of groupBy(pool, (r) => `${r.centre_code}|${r.school_code}|${r.class}`)) {
      rank(g, (r, n) => (out(r).schoolRank = n));
    }
  }
}

/**
 * Finding a school in the picker. The website carries the same function at
 * src/lib/app/school-search.ts; keep the two alike.
 *
 * Until 26 Nov 2026 the pickers matched a letter anywhere in a name and showed
 * the first 40 (app), 30 or 20 (website). Typing "M" matched 82 schools; the
 * first 40 all began A–K, so not one school starting with M appeared — nor any
 * starting G, H, I, L, N, R, S or T. Now nothing is cut off, and names that
 * begin with what was typed come first.
 */

type Named = { school_name: string };

/** Lower case, punctuation as spaces: "C.M.O." and "c m o" read alike. */
function plain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** A to Z ignoring case and punctuation ("MIM Academy" after "Mahakavi"). */
export function schoolsAtoZ<T extends Named>(schools: readonly T[]): T[] {
  return [...schools].sort((a, b) => plain(a.school_name).localeCompare(plain(b.school_name)));
}

/**
 * Every school that matches, best first: the name starts with the words typed,
 * then a word in it does, then they appear anywhere (spaces and dots ignored).
 * A to Z within each. An empty search returns the whole list A to Z.
 */
export function findSchools<T extends Named>(schools: readonly T[], query: string): T[] {
  const sorted = schoolsAtoZ(schools);
  const q = plain(query);
  if (!q) return sorted;
  const qTight = q.replace(/ /g, "");
  const rank = (name: string): number => {
    const n = plain(name);
    if (n.startsWith(q)) return 0;
    if (` ${n}`.includes(` ${q}`)) return 1;
    if (n.includes(q) || n.replace(/ /g, "").includes(qTight)) return 2;
    return -1;
  };
  return sorted
    .map((s) => ({ s, r: rank(s.school_name) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r) // stable: A to Z kept within a rank
    .map((x) => x.s);
}

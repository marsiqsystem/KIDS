/**
 * Does what a child typed match what the school gave KIDS?
 *
 * Deliberately simple rules the office can predict, because the office acts on
 * the verdict: "Matched" requests can be approved in bulk.
 *
 *   Name, father   Same words, ignoring case, spacing, dots, and the prefixes
 *                  that come and go on forms (MD, MOHD, SK, SRI, LATE ...).
 *                  One side may have extra words -- "FIRST SURNAME" matches
 *                  "FIRST MIDDLE SURNAME" -- but every word of the shorter must
 *                  be in the longer.
 *   Phone          Any ten-digit number typed equals any on file. The master
 *                  sometimes holds two numbers in one cell, and +91 / a leading
 *                  0 are dropped.
 *
 * A request is MATCHED when the name matches AND the father or the phone does.
 * Anything else is NOT MATCHED and waits for a person -- including a child for
 * whom the master holds neither father nor phone (216 of the 979 with no date
 * of birth, counted 25 Sep 2026), because there is nothing to match against.
 */

export type FieldMatch = "match" | "differs" | "not_on_file";

const DROP = new Set(["MD", "MOHD", "MOHAMMAD", "MOHAMMED", "MUHAMMAD", "SK", "SHEIKH", "SHAIKH",
  "SRI", "SHRI", "SMT", "MR", "MRS", "DR", "LATE", "LT"]);

function words(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !DROP.has(w));
}

export function nameMatch(typed: string | null | undefined, onFile: string | null | undefined): FieldMatch {
  const b = words(onFile);
  if (b.length === 0) return "not_on_file";
  const a = words(typed);
  if (a.length === 0) return "differs";
  const [short, long] = a.length <= b.length ? [a, new Set(b)] : [b, new Set(a)];
  return short.every((w) => long.has(w)) ? "match" : "differs";
}

function phones(raw: string | null | undefined): string[] {
  return ((raw ?? "").match(/\d[\d\s-]{8,}\d/g) ?? [])
    .map((p) => p.replace(/\D/g, ""))
    .filter((p) => p.length >= 10)
    .map((p) => p.slice(-10));
}

export function phoneMatch(typed: string | null | undefined, onFile: string | null | undefined): FieldMatch {
  const b = phones(onFile);
  if (b.length === 0) return "not_on_file";
  const a = phones(typed);
  return a.some((p) => b.includes(p)) ? "match" : "differs";
}

/** Ten digits, or null. What the phone form accepts. */
export function tenDigits(raw: string): string | null {
  const [p] = phones(raw);
  return p ?? null;
}

export function verdict(name: FieldMatch, father: FieldMatch, phone: FieldMatch): "matched" | "not_matched" {
  return name === "match" && (father === "match" || phone === "match") ? "matched" : "not_matched";
}

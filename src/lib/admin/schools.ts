import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "./staff";

/**
 * Schools and centres, kept by the KIDS office from the Centres tab
 * (Umar, 10 Nov 2026). Until then each new school was a hand-written line in
 * schema.sql's extra_schools insert.
 *
 * Three facts shape everything here:
 *
 *   1. A school is (centre_code, school_code). school_code is a per-centre
 *      index -- SC-01 names twenty-odd different schools -- never an identity.
 *   2. A UID is District(1) + Centre(2) + School(2) + Sequence(4), and it never
 *      changes once minted: it is on the admit card and every mark is filed
 *      under it. Moving a school to another centre therefore moves its students
 *      on the register and leaves their UIDs exactly as they are.
 *   3. `students` is reseeded from the master workbook, which would put a moved
 *      school straight back. A move is written as one approved 'school'
 *      correction per student, which scripts/seed-students.ts re-applies after
 *      every reseed -- the same way a single student's move already survives.
 *
 * A school the office added (a row in extra_schools) may be renamed, and
 * removed while nobody is registered or applying there. A school that came from
 * the workbook is renamed in the workbook: renaming it here would be reverted
 * by the next reseed.
 */

export interface SchoolAdminRow {
  centre_code: string;
  centre_name: string;
  school_code: string;
  school_name: string;
  students: number;
  applying: number;
  /** In extra_schools: added from here or schema.sql, so it can be renamed. */
  added: boolean;
}

export interface District {
  digit: string;
  /** Centres already in this district, so the office can recognise it. */
  centres: string[];
}

export interface CentreChoice {
  centre_code: string;
  centre_name: string;
  digit: string;
}

export type SchoolResult = { ok: true; message: string } | { ok: false; message: string; field?: string };

/** Every school on the list, with how many are registered and applying there. */
export async function schoolsForAdmin(): Promise<SchoolAdminRow[]> {
  return (await sql`
    with pairs as (
      select centre_code, school_code from students where not is_demo
      union
      select centre_code, school_code from extra_schools
    )
    select p.centre_code, p.school_code,
           coalesce(
             (select centre_name from students s
               where s.centre_code = p.centre_code and not s.is_demo limit 1),
             (select centre_name from extra_schools x where x.centre_code = p.centre_code limit 1)
           ) as centre_name,
           coalesce(
             (select school_name from students s
               where s.centre_code = p.centre_code and s.school_code = p.school_code and not s.is_demo limit 1),
             x.school_name
           ) as school_name,
           (select count(*)::int from students s
             where s.centre_code = p.centre_code and s.school_code = p.school_code and not s.is_demo) as students,
           (select count(*)::int from app_registrations r
             where r.status = 'pending' and r.centre_code = p.centre_code and r.school_code = p.school_code) as applying,
           (x.school_code is not null) as added
      from pairs p
      left join extra_schools x on x.centre_code = p.centre_code and x.school_code = p.school_code
     order by p.centre_code, p.school_code
  `) as SchoolAdminRow[];
}

/** Every centre, with the district digit its UIDs start with. */
export async function centreChoices(): Promise<CentreChoice[]> {
  return (await sql`
    select centre_code, min(centre_name) as centre_name, min(digit) as digit from (
      select centre_code, centre_name, left(uid, 1) as digit from students where not is_demo
      union all
      select centre_code, centre_name, left(uid_prefix, 1) from extra_schools
    ) c
     group by centre_code
     order by centre_code
  `) as CentreChoice[];
}

/** The district digits in use, each with the centres that already use it. */
export function districtsOf(centres: CentreChoice[]): District[] {
  const by = new Map<string, string[]>();
  for (const c of centres) by.set(c.digit, [...(by.get(c.digit) ?? []), c.centre_name]);
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([digit, names]) => ({ digit, centres: names }));
}

/** Tidy a typed name: one space between words, no edges. Spelling is the office's own. */
function tidy(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Compare names without caring about case, spacing or full stops. */
function sameName(a: string, b: string): boolean {
  const k = (s: string) => s.toUpperCase().replace(/[.\s]+/g, "");
  return k(a) === k(b);
}

/** CTR-07 → 7. */
function centreNumber(code: string): number {
  const m = /^CTR-(\d+)$/.exec(code);
  return m ? Number(m[1]) : NaN;
}

const two = (n: number) => String(n).padStart(2, "0");

/** The next centre code after every one in use. */
async function nextCentreCode(): Promise<string> {
  const used = await centreChoices();
  const top = Math.max(0, ...used.map((c) => centreNumber(c.centre_code)).filter(Number.isFinite));
  return `CTR-${two(top + 1)}`;
}

/** The next school code at one centre, past every one in use there. */
async function nextSchoolCode(centreCode: string): Promise<string> {
  const rows = (await sql`
    select school_code from students where centre_code = ${centreCode}
    union
    select school_code from extra_schools where centre_code = ${centreCode}
  `) as { school_code: string }[];
  // SC-99 is the demo school at CTR-13; it does not move the count on.
  const nums = rows
    .map((r) => Number(/^SC-(\d+)$/.exec(r.school_code)?.[1]))
    .filter((n) => Number.isFinite(n) && n < 99);
  return `SC-${two(Math.max(0, ...nums) + 1)}`;
}

/** Is a five-digit UID prefix free -- no student's UID and no school's prefix starts with it? */
async function prefixFree(prefix: string): Promise<boolean> {
  const [r] = (await sql`
    select (exists (select 1 from students where left(uid, 5) = ${prefix})
         or exists (select 1 from extra_schools where uid_prefix = ${prefix})) as taken
  `) as { taken: boolean }[];
  return !r?.taken;
}

/** Where a school name already appears, if it does. */
async function existingByName(name: string): Promise<SchoolAdminRow | null> {
  const all = await schoolsForAdmin();
  return all.find((s) => sameName(s.school_name, name)) ?? null;
}

/**
 * Add a school, at a centre that exists or at a new one.
 *
 * The office names the school and the centre; the codes and the UID prefix are
 * worked out here, so nobody types a code. A new centre takes the next CTR
 * number and the district digit the office picks -- the first digit of every
 * UID minted there.
 */
export async function addSchool(
  input: { name: string; centre: string; newCentre: string; digit: string },
  staffId: string,
): Promise<SchoolResult> {
  const name = tidy(input.name);
  if (name.length < 3 || name.length > 120) return { ok: false, message: "Type the school's name.", field: "name" };

  const clash = await existingByName(name);
  if (clash) {
    return {
      ok: false,
      field: "name",
      message: `${clash.school_name} is already on the list, at ${clash.centre_name} (${clash.centre_code}). To change its centre, use Move on its row.`,
    };
  }

  const centres = await centreChoices();
  let centreCode: string;
  let centreName: string;
  let digit: string;

  if (input.centre === "new") {
    centreName = tidy(input.newCentre);
    if (centreName.length < 3 || centreName.length > 120) {
      return { ok: false, message: "Name the new centre.", field: "newCentre" };
    }
    const same = centres.find((c) => sameName(c.centre_name, centreName));
    if (same) {
      return { ok: false, field: "newCentre", message: `${same.centre_name} is already a centre (${same.centre_code}). Pick it from the list.` };
    }
    if (!/^[1-9]$/.test(input.digit)) return { ok: false, message: "Pick the district.", field: "digit" };
    centreCode = await nextCentreCode();
    digit = input.digit;
  } else {
    const c = centres.find((x) => x.centre_code === input.centre);
    if (!c) return { ok: false, message: "Pick the centre.", field: "centre" };
    centreCode = c.centre_code;
    centreName = c.centre_name;
    digit = c.digit;
  }

  const schoolCode = await nextSchoolCode(centreCode);
  const prefix = `${digit}${two(centreNumber(centreCode))}${schoolCode.slice(3)}`;
  if (prefix.length !== 5 || !(await prefixFree(prefix))) {
    return { ok: false, message: `The UID prefix ${prefix} is already in use. Nothing was added; tell Umar.` };
  }

  const rows = (await sql`
    insert into extra_schools (centre_code, centre_name, school_code, school_name, uid_prefix)
    values (${centreCode}, ${centreName}, ${schoolCode}, ${name}, ${prefix})
    on conflict do nothing
    returning school_code
  `) as { school_code: string }[];
  if (!rows.length) return { ok: false, message: "Somebody added a school at the same moment. Try again." };

  await logAdminEvent(staffId, "school_added", { kind: "school", id: `${centreCode}|${schoolCode}` }, {
    school: name,
    centre: centreName,
    new_centre: input.centre === "new",
    uid_prefix: prefix,
  });
  return {
    ok: true,
    message: `${name} added at ${centreName} (${centreCode} · ${schoolCode}). Families can choose it on Register now.`,
  };
}

/**
 * Rename a school the office added. Its students and any open applications
 * carry the name too, so all three change together.
 */
export async function renameSchool(pair: string, rawName: string, staffId: string): Promise<SchoolResult> {
  const [centre, code] = pair.split("|");
  const name = tidy(rawName);
  if (name.length < 3 || name.length > 120) return { ok: false, message: "Type the school's name." };

  const [x] = (await sql`
    select school_name from extra_schools where centre_code = ${centre} and school_code = ${code}
  `) as { school_name: string }[];
  if (!x) {
    return { ok: false, message: "This school came from the master workbook. Correct its name there; a change here would be undone by the next reseed." };
  }
  if (name === x.school_name) return { ok: false, message: "That is already its name." };
  const clash = await existingByName(name);
  if (clash && `${clash.centre_code}|${clash.school_code}` !== pair) {
    return { ok: false, message: `${clash.school_name} is already on the list, at ${clash.centre_name}.` };
  }

  await sql.transaction([
    sql`update extra_schools set school_name = ${name} where centre_code = ${centre} and school_code = ${code}`,
    sql`update students set school_name = ${name} where centre_code = ${centre} and school_code = ${code}`,
    sql`update app_registrations set school_name = ${name}
         where centre_code = ${centre} and school_code = ${code} and status = 'pending'`,
  ]);
  await logAdminEvent(staffId, "school_renamed", { kind: "school", id: pair }, { from: x.school_name, to: name });
  return { ok: true, message: `Renamed to ${name}.` };
}

/** Take a school the office added off the list, while nobody is registered or applying there. */
export async function removeSchool(pair: string, staffId: string): Promise<SchoolResult> {
  const [centre, code] = pair.split("|");
  const [s] = (await sql`
    select x.school_name,
           (select count(*)::int from students where centre_code = ${centre} and school_code = ${code}) as students,
           (select count(*)::int from app_registrations
             where centre_code = ${centre} and school_code = ${code} and status = 'pending') as applying
      from extra_schools x where x.centre_code = ${centre} and x.school_code = ${code}
  `) as { school_name: string; students: number; applying: number }[];
  if (!s) return { ok: false, message: "Only a school added here can be removed here." };
  if (s.students || s.applying) {
    return {
      ok: false,
      message: `${s.school_name} has ${s.students} registered and ${s.applying} applying. Move them to another school first.`,
    };
  }
  await sql`delete from extra_schools where centre_code = ${centre} and school_code = ${code}`;
  await logAdminEvent(staffId, "school_removed", { kind: "school", id: pair }, { school: s.school_name });
  return { ok: true, message: `${s.school_name} removed from the list.` };
}

/**
 * Move a school -- every student registered there and every open application --
 * to another centre, existing or new.
 *
 * The school gets the next code at its new centre and a row in extra_schools,
 * so it is on the list whether or not anybody is registered, and so the reseed
 * can find it (see fact 3 above). Its own UIDs keep their first digit, the
 * district, which is also the first digit of its new prefix.
 *
 * One transaction: the students, their correction rows, the applications and
 * the old row (if the office added it) all move together or not at all.
 */
export async function moveSchool(
  pair: string,
  input: { centre: string; newCentre: string },
  staffId: string,
): Promise<SchoolResult> {
  const [fromCentre, fromCode] = pair.split("|");
  const all = await schoolsForAdmin();
  const school = all.find((s) => s.centre_code === fromCentre && s.school_code === fromCode);
  if (!school) return { ok: false, message: "That school is no longer on the list." };

  const centres = await centreChoices();
  const from = centres.find((c) => c.centre_code === fromCentre);
  let toCentre: string;
  let toName: string;
  if (input.centre === "new") {
    toName = tidy(input.newCentre);
    if (toName.length < 3 || toName.length > 120) return { ok: false, message: "Name the new centre." };
    const same = centres.find((c) => sameName(c.centre_name, toName));
    if (same) return { ok: false, message: `${same.centre_name} is already a centre (${same.centre_code}). Pick it from the list.` };
    toCentre = await nextCentreCode();
  } else {
    const c = centres.find((x) => x.centre_code === input.centre);
    if (!c) return { ok: false, message: "Pick the centre to move to." };
    toCentre = c.centre_code;
    toName = c.centre_name;
  }
  if (toCentre === fromCentre) return { ok: false, message: `${school.school_name} is already at ${toName}.` };

  // The district: from the school's own UIDs if it has students, else its prefix.
  const [d] = (await sql`
    select coalesce(
      (select left(uid, 1) from students where centre_code = ${fromCentre} and school_code = ${fromCode} limit 1),
      (select left(uid_prefix, 1) from extra_schools where centre_code = ${fromCentre} and school_code = ${fromCode}),
      ${from?.digit ?? null}
    ) as digit
  `) as { digit: string | null }[];
  if (!d?.digit) return { ok: false, message: "Could not tell which district this school is in. Nothing was moved." };

  const toCode = await nextSchoolCode(toCentre);
  const prefix = `${d.digit}${two(centreNumber(toCentre))}${toCode.slice(3)}`;
  if (prefix.length !== 5 || !(await prefixFree(prefix))) {
    return { ok: false, message: `The UID prefix ${prefix} is already in use. Nothing was moved; tell Umar.` };
  }

  // A student's own open request to change school is theirs to have decided first.
  const [open] = (await sql`
    select count(*)::int as n from app_corrections c
      join students s on s.uid = c.uid
     where c.status = 'pending' and c.field = 'school'
       and s.centre_code = ${fromCentre} and s.school_code = ${fromCode}
  `) as { n: number }[];
  if (open?.n) {
    return { ok: false, message: `${open.n} student(s) at this school have asked to change school. Decide those on the Corrections tab first.` };
  }

  const fromPair = `${fromCentre}|${fromCode}`;
  const toPair = `${toCentre}|${toCode}`;
  const note = `School moved to ${toName} by the office`;

  await sql.transaction([
    sql`insert into extra_schools (centre_code, centre_name, school_code, school_name, uid_prefix)
        values (${toCentre}, ${toName}, ${toCode}, ${school.school_name}, ${prefix})`,
    sql`insert into app_corrections (uid, field, old_value, new_value, note, status, decided_at, decided_by)
        select uid, 'school', ${fromPair}, ${toPair}, ${note}, 'approved', now(), ${staffId}
          from students where centre_code = ${fromCentre} and school_code = ${fromCode}`,
    sql`update students set centre_code = ${toCentre}, centre_name = ${toName}, school_code = ${toCode}
         where centre_code = ${fromCentre} and school_code = ${fromCode}`,
    sql`update app_registrations set centre_code = ${toCentre}, school_code = ${toCode}
         where centre_code = ${fromCentre} and school_code = ${fromCode} and status = 'pending'`,
    sql`delete from extra_schools where centre_code = ${fromCentre} and school_code = ${fromCode}`,
  ]);

  // Filed under the pair the school LEFT: schema.sql's seed inserts read this
  // row to know not to put the old pair back.
  await logAdminEvent(staffId, "school_moved", { kind: "school", id: fromPair }, {
    school: school.school_name,
    from_centre: school.centre_name,
    to: toPair,
    to_centre: toName,
    new_centre: input.centre === "new",
    students: school.students,
    applying: school.applying,
  });

  const who = school.students
    ? `${school.students} student${school.students === 1 ? "" : "s"} moved with it; their User IDs do not change.`
    : "Nobody was registered there yet.";
  return { ok: true, message: `${school.school_name} is now at ${toName} (${toCentre} · ${toCode}). ${who}` };
}

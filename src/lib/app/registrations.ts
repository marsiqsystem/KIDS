import { sql } from "@/lib/exam/db";

/**
 * A child who is not on the register asking to be.
 *
 * The rule, Umar's, 13 September 2026: an application is not a student. It
 * carries no UID, it is invisible to the exam and to every published total, and
 * it stays that way until a named office account approves it. Approval is the
 * moment a UID is minted -- see `approveRegistration` below, which is the only
 * function in this codebase that has ever created one.
 */

export interface School {
  centre_code: string;
  centre_name: string;
  school_code: string;
  school_name: string;
}

/**
 * The schools a new student may choose from.
 *
 * Chosen from the register, never typed, because a school here is NOT its name
 * and NOT its `school_code`. `school_code` is a per-centre index: SC-01 names
 * twenty-one different schools, one at each centre. The identity of a school is
 * the PAIR (centre_code, school_code) -- 133 of them, with no collisions, being
 * the 112 real schools plus the demo one at each centre.
 *
 * The demo school is excluded: it exists so the KIDS team can test, and a
 * family must never be able to file a child under it.
 */
export async function listSchools(): Promise<School[]> {
  return (await sql`
    select distinct centre_code, centre_name, school_code, school_name
      from students
     where not is_demo
     order by centre_name, school_name
  `) as School[];
}

/** Collapse a name for comparison only. Never stored in this form. */
function normalise(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

export interface Duplicate {
  uid: string;
  name: string;
  class: string;
  school_name: string;
  centre_code: string;
}

/**
 * Has this child already got a UID?
 *
 * Name plus date of birth is 98.4% unique across the 9,652 students on the
 * register, which makes it a good enough guard to be worth running on every
 * application and nowhere near good enough to decide anything by itself. So it
 * never blocks: it attaches what it found to the application, and a person
 * looks. A child who is told "you already exist" and does not is a child who
 * cannot sit the exam.
 *
 * The reason this matters more than it sounds: a second UID is a second place
 * in the merit list and a second set of marks that can never be reconciled with
 * the first.
 */
export async function possibleDuplicates(name: string, dob: string): Promise<Duplicate[]> {
  const n = normalise(name);
  if (!n || !dob) return [];
  return (await sql`
    select uid, name, class, school_name, centre_code
      from students
     where not is_demo
       and dob = ${dob}
       and upper(regexp_replace(btrim(name), '\\s+', ' ', 'g')) = ${n}
     limit 10
  `) as Duplicate[];
}

export interface Application {
  name: string;
  dob: string;
  class: string;
  stream: string | null;
  centre_code: string;
  school_code: string;
  guardian_phone: string | null;
  device_id: string | null;
}

export type Applied =
  | { ok: true; id: string; duplicates: Duplicate[] }
  | { ok: false; reason: "incomplete" }
  | { ok: false; reason: "unknown_school" }
  | { ok: false; reason: "already_pending"; id: string };

/**
 * File an application.
 *
 * Refuses an unknown school rather than storing the codes it was handed: the
 * school name is copied FROM the register at this point, so an application can
 * never introduce a 113th spelling of a school that already exists. That is the
 * mistake that produced the Rajasthan Vidyapeeth rename cleanup.
 */
export async function applyToRegister(input: Application): Promise<Applied> {
  const name = input.name?.trim();
  const dob = input.dob?.trim();
  const cls = input.class?.trim().toUpperCase();

  if (!name || !dob || !cls || !input.centre_code || !input.school_code) {
    return { ok: false, reason: "incomplete" };
  }

  const [school] = (await sql`
    select school_name, centre_name from students
     where centre_code = ${input.centre_code}
       and school_code = ${input.school_code}
       and not is_demo
     limit 1
  `) as { school_name: string }[];
  if (!school) return { ok: false, reason: "unknown_school" };

  if (input.device_id) {
    const [existing] = (await sql`
      select id::text from app_registrations
       where device_id = ${input.device_id} and status = 'pending'
    `) as { id: string }[];
    if (existing) return { ok: false, reason: "already_pending", id: existing.id };
  }

  const duplicates = await possibleDuplicates(name, dob);

  const [row] = (await sql`
    insert into app_registrations
      (name, dob, class, stream, centre_code, school_code, school_name,
       guardian_phone, device_id, possible_duplicates)
    values
      (${name}, ${dob}, ${cls}, ${input.stream || null},
       ${input.centre_code}, ${input.school_code}, ${school.school_name},
       ${input.guardian_phone || null}, ${input.device_id || null},
       ${JSON.stringify(duplicates.map((d) => d.uid))}::jsonb)
    returning id::text
  `) as { id: string }[];

  return { ok: true, id: row.id, duplicates };
}

export interface PendingApplication {
  id: string;
  name: string;
  class: string;
  school_name: string;
  status: string;
  applied_at: Date;
  uid: string | null;
  reason: string | null;
}

/**
 * What this phone applied for.
 *
 * The whole point of registering inside the app rather than on a web form: the
 * family installs once, applies, and the app can show them where they stand
 * without an account to sign in to. When the office approves, this returns
 * `approved` with the UID and the app opens the profile in place -- no
 * credentials to keep, no second sign-in.
 */
export async function applicationForDevice(deviceId: string): Promise<PendingApplication | null> {
  if (!deviceId) return null;
  const rows = (await sql`
    select id::text, name, class, school_name, status, applied_at, uid, reason
      from app_registrations
     where device_id = ${deviceId}
     order by applied_at desc
     limit 1
  `) as PendingApplication[];
  return rows[0] ?? null;
}

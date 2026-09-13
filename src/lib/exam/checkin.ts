import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db";
import { qrSecret } from "@/lib/qr-token";
import { logEvent } from "./attempts";

/**
 * Checking in at a centre.
 *
 * The rule, ruled 14 September 2026: a Phase 2 paper opens only for a student
 * who has scanned the code on their invigilator's screen, and that code ROTATES
 * every thirty seconds. A printed code taped to a desk is photographed and on a
 * friend's phone at home within the minute; a rotating one is dead by then.
 *
 * The code is a signature over (paper, centre, 30-second step), so there is
 * nothing stored to leak and nothing for a desk to fetch but the current step.
 * A student's phone never learns how to make one. The same signature gives a
 * six-digit number for a phone whose camera will not focus.
 *
 * What this does not stop, stated so nobody relies on it: a student in the hall
 * reading the code aloud down a phone to someone outside, within the same
 * minute. The invigilator in the room is still the check on that; this makes
 * sitting from home require an accomplice in the hall, in real time, which is
 * a different and much rarer thing.
 */

const STEP_MS = 30_000;
/**
 * The current step and the one before: a code is good for between 30 and 60
 * seconds. Enough for a student to lift a phone, open the camera and scan a
 * screen that refreshed as they did; not enough to send a photo home and have
 * it used.
 */
const ACCEPT_STEPS = 2;

function key(): Buffer {
  // Derived, not the QR secret itself: an admit-card signature and a check-in
  // signature must never be interchangeable.
  return createHmac("sha256", qrSecret()).update("kids-checkin-v1").digest();
}

function mac(examPaperId: string, centre: string, step: number): Buffer {
  return createHmac("sha256", key()).update(`${examPaperId}|${centre}|${step}`).digest();
}

const stepAt = (now: number) => Math.floor(now / STEP_MS);

function sixDigits(m: Buffer): string {
  return String(m.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export interface DeskCode {
  /** What the QR encodes. Opaque to everyone but this file. */
  payload: string;
  /** The same thing, for typing. */
  code: string;
  /** When the screen should fetch the next one. */
  refreshAt: number;
}

/** The code a desk shows right now. */
export function deskCode(examPaperId: string, centre: string, now = Date.now()): DeskCode {
  const step = stepAt(now);
  const m = mac(examPaperId, centre, step);
  return {
    payload: `KIDSIN1.${examPaperId}.${centre}.${step}.${m.subarray(0, 12).toString("base64url")}`,
    code: sixDigits(m),
    refreshAt: (step + 1) * STEP_MS,
  };
}

export type Verified = { ok: true; centre: string; method: "qr" | "code" } | { ok: false; reason: string };

/**
 * Check a scanned payload or a typed code against a paper.
 *
 * A typed code does not say which centre it came from, so it is tried against
 * every centre on the register for the current and previous step -- 21 × 2
 * signatures, microseconds. If two centres happen to share a code in the same
 * step (a one-in-twenty-thousand event) it is refused and the student scans
 * instead, rather than being checked in at a guess.
 */
export async function verifyCheckin(
  examPaperId: string,
  input: string,
  now = Date.now(),
): Promise<Verified> {
  const raw = input.trim();
  const current = stepAt(now);
  const steps = Array.from({ length: ACCEPT_STEPS }, (_, i) => current - i);

  if (raw.startsWith("KIDSIN1.")) {
    const [, paper, centre, stepText, sig] = raw.split(".");
    const step = Number(stepText);
    if (paper !== examPaperId) return { ok: false, reason: "That code is for a different paper." };
    if (!centre || !Number.isInteger(step) || !sig) return { ok: false, reason: "That is not a KIDS check-in code." };
    if (!steps.includes(step)) {
      return { ok: false, reason: "That code has expired. Scan the screen again — it changes every 30 seconds." };
    }
    const expected = mac(examPaperId, centre, step).subarray(0, 12);
    const given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return { ok: false, reason: "That is not a KIDS check-in code." };
    }
    return { ok: true, centre, method: "qr" };
  }

  const digits = raw.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) {
    return { ok: false, reason: "Scan the code on the invigilator's screen, or type the six digits under it." };
  }

  const centres = (await sql`
    select distinct centre_code from students where not is_demo
  `) as { centre_code: string }[];
  const hits = new Set<string>();
  for (const { centre_code } of centres) {
    for (const step of steps) {
      if (sixDigits(mac(examPaperId, centre_code, step)) === digits) hits.add(centre_code);
    }
  }
  if (hits.size === 1) return { ok: true, centre: [...hits][0], method: "code" };
  if (hits.size > 1) return { ok: false, reason: "Scan the code this time — the number could not be matched to one centre." };
  return { ok: false, reason: "That number is not right, or it has already changed. Type the number showing now." };
}

export interface Checkin {
  centre_code: string;
  checked_in_at: Date;
  method: "qr" | "code";
}

export async function findCheckin(uid: string, examPaperId: string): Promise<Checkin | null> {
  const rows = (await sql`
    select centre_code, checked_in_at, method from exam_checkins
     where uid = ${uid} and exam_paper_id = ${examPaperId}::bigint
  `) as Checkin[];
  return rows[0] ?? null;
}

/**
 * Record a check-in. The FIRST one stands.
 *
 * A second scan -- a nervous child scanning twice, or at a second hall -- changes
 * nothing, so the record of where they were marked present cannot be moved by
 * the student after the fact.
 */
export async function recordCheckin(
  uid: string,
  examPaperId: string,
  centre: string,
  method: "qr" | "code",
  deviceId: string | null,
): Promise<Checkin> {
  await sql`
    insert into exam_checkins (uid, exam_paper_id, centre_code, method, device_id)
    values (${uid}, ${examPaperId}::bigint, ${centre}, ${method}, ${deviceId})
    on conflict (uid, exam_paper_id) do nothing
  `;
  const row = (await findCheckin(uid, examPaperId))!;
  if (row.centre_code === centre) {
    await logEvent(uid, "checkin", { paper: examPaperId, centre, method });
  }
  return row;
}

/* --------------------------------------------------------------- the desk --- */

export interface DeskCounts {
  /** Students on this centre's register with a question set loaded for them. */
  expected: number;
  checkedIn: number;
  /** Checked in here but registered at another centre. */
  fromElsewhere: number;
  started: number;
  submitted: number;
}

export async function deskCounts(examPaperId: string, centre: string): Promise<DeskCounts> {
  const [r] = (await sql`
    select
      (select count(*)::int from students s
        where s.centre_code = ${centre} and not s.is_demo
          and exists (select 1 from exam_question_sets q
                       where q.exam_paper_id = ${examPaperId}::bigint and q.class = s.class)) as expected,
      (select count(*)::int from exam_checkins c
        where c.exam_paper_id = ${examPaperId}::bigint and c.centre_code = ${centre}) as checked_in,
      (select count(*)::int from exam_checkins c join students s on s.uid = c.uid
        where c.exam_paper_id = ${examPaperId}::bigint and c.centre_code = ${centre}
          and s.centre_code <> ${centre}) as from_elsewhere,
      (select count(*)::int from attempts a join exam_checkins c
          on c.uid = a.uid and c.exam_paper_id = a.exam_paper_id
        where a.exam_paper_id = ${examPaperId}::bigint and c.centre_code = ${centre}) as started,
      (select count(*)::int from attempts a join exam_checkins c
          on c.uid = a.uid and c.exam_paper_id = a.exam_paper_id
        where a.exam_paper_id = ${examPaperId}::bigint and c.centre_code = ${centre}
          and a.status = 'submitted') as submitted
  `) as { expected: number; checked_in: number; from_elsewhere: number; started: number; submitted: number }[];
  return {
    expected: r.expected,
    checkedIn: r.checked_in,
    fromElsewhere: r.from_elsewhere,
    started: r.started,
    submitted: r.submitted,
  };
}

export interface DeskStudent {
  uid: string;
  name: string;
  class: string;
  home_centre: string;
  checked_in_at: Date | null;
  status: "in_progress" | "submitted" | null;
  answered: number;
  /** The phone the paper is bound to has been released for another. */
  released: boolean;
}

/**
 * The students at a desk, found by name or User ID.
 *
 * Searched, not listed: a centre can hold seven hundred children, and an
 * invigilator looking for the one whose phone just died needs one row, now.
 */
export async function deskSearch(examPaperId: string, centre: string, q: string): Promise<DeskStudent[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_]/g, "")}%`;
  return (await sql`
    select s.uid, s.name, s.class, s.centre_code as home_centre, c.checked_in_at,
           a.status, coalesce((select count(*)::int from jsonb_object_keys(a.answers)), 0) as answered,
           (a.uid is not null and a.status = 'in_progress' and a.device_hash is null) as released
      from students s
      left join exam_checkins c on c.uid = s.uid and c.exam_paper_id = ${examPaperId}::bigint
      left join attempts a on a.uid = s.uid and a.exam_paper_id = ${examPaperId}::bigint
     -- Demo accounts INCLUDED. They are left out of every count, but they sit a
     -- paper through the same gate as a child, and a rehearsal run on one must be
     -- findable at the desk like anybody else.
     where (s.centre_code = ${centre} or c.centre_code = ${centre})
       and (s.uid like ${like} or s.name ilike ${like})
     order by s.name
     limit 20
  `) as DeskStudent[];
}

/**
 * Let a student carry on on another phone.
 *
 * Ruled 14 September 2026: one account works on one phone, so a paper started
 * on one phone is refused on another -- until the invigilator presses this.
 * It releases the paper from its phone; the next phone to open it takes it, with
 * the same answers and the same deadline. Only a paper that is still running
 * can be released, and it is written down with the invigilator's name.
 */
export async function releasePaper(uid: string, examPaperId: string, staffId: string): Promise<boolean> {
  const rows = (await sql`
    update attempts set device_hash = null
     where uid = ${uid} and exam_paper_id = ${examPaperId}::bigint
       and status = 'in_progress' and now() < deadline_at
    returning uid
  `) as unknown[];
  if (rows.length) await logEvent(uid, "moved", { paper: examPaperId, by: staffId });
  return rows.length > 0;
}

/* ------------------------------------------------------------ assignments --- */

export interface DeskAssignment {
  exam_paper_id: string;
  paper_code: string;
  paper_name: string;
  centre_code: string;
  centre_name: string;
  starts_at: Date | null;
}

/**
 * The desks this member of staff may run.
 *
 * An admin may run any centre for any paper that needs a check-in; anybody else
 * only where they have been assigned. Checked again on every desk request, not
 * just when this list is drawn.
 */
export async function desksFor(staffId: string, isAdmin: boolean): Promise<DeskAssignment[]> {
  if (isAdmin) {
    return (await sql`
      select p.id::text as exam_paper_id, p.code as paper_code, p.name as paper_name,
             c.centre_code, c.centre_name, p.starts_at
        from exam_papers p
        cross join (select distinct centre_code, centre_name from students where not is_demo) c
       where p.requires_checkin and p.archived_at is null and p.mode = 'online'
       order by p.starts_at nulls last, p.code, c.centre_code
    `) as DeskAssignment[];
  }
  return (await sql`
    select p.id::text as exam_paper_id, p.code as paper_code, p.name as paper_name,
           i.centre_code,
           (select centre_name from students where centre_code = i.centre_code limit 1) as centre_name,
           p.starts_at
      from exam_invigilators i join exam_papers p on p.id = i.exam_paper_id
     where i.staff_id = ${staffId} and p.archived_at is null
     order by p.starts_at nulls last, i.centre_code
  `) as DeskAssignment[];
}

export async function mayRunDesk(
  staffId: string,
  isAdmin: boolean,
  examPaperId: string,
  centre: string,
): Promise<boolean> {
  if (isAdmin) return true;
  const rows = (await sql`
    select 1 from exam_invigilators
     where staff_id = ${staffId} and exam_paper_id = ${examPaperId}::bigint and centre_code = ${centre}
  `) as unknown[];
  return rows.length > 0;
}

import { sql } from "@/lib/exam/db";

/**
 * A student asking for their details to be put right.
 *
 * Asking changes nothing. The register is what the admit card, the merit list
 * and the school report are printed from, so a change to it is the office's to
 * make; this files the question and shows the student it is waiting.
 */

export type CorrectionField = "name" | "dob" | "class" | "stream" | "school";

export const FIELD_LABEL: Record<CorrectionField, string> = {
  name: "Name",
  dob: "Date of birth",
  class: "Class",
  stream: "Stream",
  school: "School",
};

export interface OpenCorrection {
  id: string;
  field: CorrectionField;
  old_value: string | null;
  new_value: string;
  status: "pending" | "approved" | "rejected";
  requested_at: Date;
  decided_at: Date | null;
  reason: string | null;
}

/** What this student has asked for, most recent first. Last 90 days. */
export async function correctionsFor(uid: string): Promise<OpenCorrection[]> {
  return (await sql`
    select id::text, field, old_value, new_value, status, requested_at, decided_at, reason
      from app_corrections
     where uid = ${uid}
       and (status = 'pending' or decided_at > now() - interval '90 days')
     order by requested_at desc
  `) as OpenCorrection[];
}

export interface CorrectionRequest {
  uid: string;
  field: CorrectionField;
  newValue: string;
  note: string | null;
}

export type Requested =
  | { ok: true }
  | { ok: false; reason: "same" | "already_open" | "invalid" | "unknown_school" };

/**
 * File one field's correction.
 *
 * The OLD value is read from the register here, not taken from the form: the
 * office judges the request against what the register actually said, and a form
 * can be sent with anything in it.
 */
export async function requestCorrection(req: CorrectionRequest): Promise<Requested> {
  const [s] = (await sql`
    select name, dob, class, stream, centre_code, school_code from students where uid = ${req.uid}
  `) as {
    name: string; dob: string | null; class: string; stream: string | null;
    centre_code: string; school_code: string;
  }[];
  if (!s) return { ok: false, reason: "invalid" };

  const value = req.newValue.trim();
  if (!value) return { ok: false, reason: "invalid" };

  const old =
    req.field === "school" ? `${s.centre_code}|${s.school_code}`
    : req.field === "dob" ? s.dob
    : req.field === "stream" ? s.stream
    : req.field === "class" ? s.class
    : s.name;

  if (req.field === "school") {
    const [known] = (await sql`
      select 1 as ok from students
       where centre_code || '|' || school_code = ${value} and not is_demo limit 1
    `) as unknown[];
    if (!known) return { ok: false, reason: "unknown_school" };
  }
  if (req.field === "class" && !["IX", "X", "XI", "XII"].includes(value)) {
    return { ok: false, reason: "invalid" };
  }
  if (req.field === "stream" && !["Arts", "Commerce", "Science"].includes(value)) {
    return { ok: false, reason: "invalid" };
  }
  if (req.field === "dob" && !/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return { ok: false, reason: "invalid" };
  }
  if ((old ?? "").trim().toUpperCase() === value.toUpperCase()) {
    return { ok: false, reason: "same" };
  }

  try {
    await sql`
      insert into app_corrections (uid, field, old_value, new_value, note)
      values (${req.uid}, ${req.field}, ${old}, ${value}, ${req.note})
    `;
  } catch {
    // The partial unique index: one open question per field.
    return { ok: false, reason: "already_open" };
  }
  return { ok: true };
}

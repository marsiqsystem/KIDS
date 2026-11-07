import { findSchool } from "@/lib/app/registrations";
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

  // A field left as it was is not a request -- checked before anything else,
  // so a school the register list no longer carries (a demo, a renamed one)
  // does not refuse every send that only corrects a name.
  if ((old ?? "").trim().toUpperCase() === value.toUpperCase()) {
    return { ok: false, reason: "same" };
  }

  if (req.field === "school") {
    const [centre, school] = value.split("|");
    if (!centre || !school || !(await findSchool(centre, school))) return { ok: false, reason: "unknown_school" };
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

export type CorrectionsFiled = { ok: boolean; message: string; filed: number };

/**
 * "My details are wrong", the whole form at once -- the website's form and the
 * native app's screen both send here, so the two can never answer differently.
 *
 * The form arrives with every field filled in from the register, and only the
 * fields the student actually changed are filed -- each as its own request, so
 * the office can accept a corrected spelling and still query a class change.
 * Nothing on the register changes until the office approves.
 */
export async function fileCorrections(
  uid: string,
  values: { name: string; dob: string; class: string; stream: string; school: string },
  note: string | null,
): Promise<CorrectionsFiled> {
  const asked: { field: CorrectionField; value: string }[] = [
    { field: "name", value: values.name },
    { field: "dob", value: values.dob },
    { field: "class", value: values.class },
    { field: "stream", value: values.stream },
    { field: "school", value: values.school },
  ];

  let filed = 0;
  const refused: string[] = [];
  for (const a of asked) {
    if (!a.value.trim()) continue;
    const r = await requestCorrection({ uid, field: a.field, newValue: a.value, note });
    if (r.ok) filed += 1;
    else if (r.reason === "already_open") refused.push(`${FIELD_LABEL[a.field]} is already waiting for the office`);
    else if (r.reason === "invalid") refused.push(`${FIELD_LABEL[a.field]} does not look right`);
    else if (r.reason === "unknown_school") refused.push("that school is not on our list");
    // "same" is not a refusal: it is a field they did not change.
  }

  if (filed === 0 && refused.length === 0) {
    return { ok: false, filed, message: "Nothing was changed. Edit the detail that is wrong, then send it." };
  }
  if (filed === 0) return { ok: false, filed, message: `Not sent: ${refused.join("; ")}.` };
  return {
    ok: true,
    filed,
    message:
      `Sent to the KIDS office. ${filed === 1 ? "It" : "They"} will check it and change your record if it is right.` +
      (refused.length ? ` Not sent: ${refused.join("; ")}.` : ""),
  };
}

/** Day, month, year boxes as DD-MM-YYYY; "" when any box is empty. */
export function dobFromParts(day: unknown, month: unknown, year: unknown): string {
  const d = String(day ?? "").trim().padStart(2, "0");
  const m = String(month ?? "").trim().padStart(2, "0");
  const y = String(year ?? "").trim();
  return d !== "00" && m !== "00" && y ? `${d}-${m}-${y}` : "";
}

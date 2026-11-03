import { sql } from "@/lib/exam/db";
import { logAdminEvent } from "./staff";
import { nameMatch, phoneMatch, tenDigits, verdict, type FieldMatch } from "./claim-match";

/**
 * The office end of "Ask KIDS to open my account".
 *
 * Each row is a phone waiting on this screen. Approving does not produce a
 * password -- it marks the request approved, and the phone that asked signs
 * itself in the next time it looks (src/lib/app/handoff.ts). So approving a
 * hundred is a hundred children in the app, with nothing printed and nothing
 * read out.
 *
 * What the office is judging is whether the person holding that phone is the
 * child the UID belongs to. The evidence is what they typed against what the
 * register says, and a family number to ring when those disagree. Approving the
 * wrong one hands a stranger a child's account -- and for a reset, signs the
 * real child out -- so the screen puts the two names side by side.
 */

export interface AccountRequestRow {
  id: string;
  uid: string;
  kind: "claim" | "reset";
  typed_name: string;
  father_name: string | null;
  guardian_phone: string | null;
  typed_dob: string | null;
  requested_at: Date;
  /** From the register. */
  name: string;
  class: string;
  stream: string | null;
  school_name: string;
  centre_code: string;
  /** From the master workbook, via register_guardians. Null when the master has none. */
  file_father: string | null;
  file_phone: string | null;
  /** Field by field, then the verdict. Rules in claim-match.ts. */
  match: { name: FieldMatch; father: FieldMatch; phone: FieldMatch };
  verdict: "matched" | "not_matched";
  /** Other phones asking for the same UID right now. More than one is a flag. */
  rivals: number;
  /** For a reset: when the account was last signed into, on whatever phone. */
  last_sign_in_at: Date | null;
  /** What the phone first sent, when the office has since edited the request. */
  original: { uid: string; typed_name: string; father_name: string | null; guardian_phone: string | null } | null;
  edited_at: Date | null;
  edited_by_name: string | null;
}

export async function pendingAccountRequests(limit = 500): Promise<AccountRequestRow[]> {
  const rows = (await sql`
    select q.id::text, q.uid, q.kind, q.typed_name, q.father_name, q.guardian_phone,
           q.typed_dob, q.requested_at,
           s.name, s.class, s.stream, s.school_name, s.centre_code,
           g.guardian_name as file_father, g.phone as file_phone,
           (select count(*)::int from app_account_requests o
             where o.uid = q.uid and o.status = 'pending' and o.id <> q.id) as rivals,
           a.last_sign_in_at, q.original, q.edited_at, ed.full_name as edited_by_name
      from app_account_requests q
      join students s on s.uid = q.uid
      left join register_guardians g on g.uid = q.uid
      left join app_accounts a on a.uid = q.uid
      left join admin_staff ed on ed.staff_id = q.edited_by
     where q.status = 'pending'
     order by q.requested_at
     limit ${limit}
  `) as Omit<AccountRequestRow, "match" | "verdict">[];

  return rows.map((r) => {
    const match = {
      name: nameMatch(r.typed_name, r.name),
      father: nameMatch(r.father_name, r.file_father),
      phone: phoneMatch(r.guardian_phone, r.file_phone),
    };
    return { ...r, match, verdict: verdict(match.name, match.father, match.phone) };
  });
}

export async function pendingAccountRequestCount(): Promise<number> {
  const [r] = (await sql`
    select count(*)::int as n from app_account_requests where status = 'pending'
  `) as { n: number }[];
  return r?.n ?? 0;
}

export async function approveAccountRequest(id: string, staffId: string): Promise<boolean> {
  const rows = (await sql`
    update app_account_requests
       set status = 'approved', decided_at = now(), decided_by = ${staffId}
     where id = ${id}::bigint and status = 'pending'
     returning uid, kind
  `) as { uid: string; kind: string }[];
  if (!rows.length) return false;

  // Any other phone asking for the same child is not this one: close them, so a
  // second approval cannot hand the account to a second handset by accident.
  await sql`
    update app_account_requests
       set status = 'rejected', decided_at = now(), decided_by = ${staffId},
           reason = 'Another request for this User ID was approved. Call the KIDS office if that was not you.'
     where uid = ${rows[0].uid} and status = 'pending'
  `;

  await logAdminEvent(staffId, "account_request_approved", { kind: "student", id: rows[0].uid }, {
    request: id,
    kind: rows[0].kind,
  });
  return true;
}

export async function rejectAccountRequest(id: string, staffId: string, reason: string): Promise<boolean> {
  const rows = (await sql`
    update app_account_requests
       set status = 'rejected', decided_at = now(), decided_by = ${staffId}, reason = ${reason || null}
     where id = ${id}::bigint and status = 'pending'
     returning uid
  `) as { uid: string }[];
  if (!rows.length) return false;

  await logAdminEvent(staffId, "account_request_rejected", { kind: "student", id: rows[0].uid }, {
    request: id,
    reason: reason || null,
  });
  return true;
}

/**
 * Approve, in one press, every MATCHED request that needs no other judgement: a
 * first claim (no account to take over) with no other phone asking for the same
 * child. Sixty at a time, like every other
 * bulk write in the control centre.
 *
 * Resets are never in it. Approving one signs a child's existing account out of
 * the phone it is on, and that is a decision for a person looking at the row.
 */
export async function approveMatchingRequests(staffId: string): Promise<{ approved: number; more: number }> {
  const clean = (await pendingAccountRequests(1000)).filter(
    (r) => r.kind === "claim" && r.verdict === "matched" && r.rivals === 0,
  );
  let approved = 0;
  for (const r of clean.slice(0, 60)) {
    if (await approveAccountRequest(r.id, staffId)) approved += 1;
  }
  return { approved, more: Math.max(0, clean.length - 60) };
}

export type RequestEdit = { ok: true; uid: string; kind: "claim" | "reset" } | { ok: false; message: string; field?: string };

/**
 * Correct a waiting request after ringing the family.
 *
 * The one edit that changes what approval does is the User ID: a child who
 * typed a classmate's, or a digit wrong, is pointed at their own record here
 * instead of being turned down and made to start again. The name, father and
 * phone can be put right too, so the row shows what the call confirmed.
 *
 * The kind is worked out again for the new User ID exactly as the phone worked
 * it out (handoff.ts): an account already open there makes it a reset, and
 * approving a reset signs that account out of every other phone. What the phone
 * first sent is kept in `original`, written on the first edit only.
 */
export async function editAccountRequest(
  id: string,
  staffId: string,
  input: { uid: string; typed_name: string; father_name: string; guardian_phone: string },
): Promise<RequestEdit> {
  const uid = input.uid.replace(/\D/g, "");
  if (uid.length !== 9) return { ok: false, message: "A User ID is nine digits.", field: "uid" };
  const name = input.typed_name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) return { ok: false, message: "Give the child's name.", field: "typed_name" };
  const father = input.father_name.trim().replace(/\s+/g, " ").slice(0, 100) || null;
  let phone: string | null = null;
  if (input.guardian_phone.trim()) {
    phone = tenDigits(input.guardian_phone);
    if (!phone) return { ok: false, message: "A ten-digit phone number, or leave it empty.", field: "guardian_phone" };
  }

  const [before] = (await sql`
    select uid, typed_name, father_name, guardian_phone, kind
      from app_account_requests where id = ${id}::bigint and status = 'pending'
  `) as { uid: string; typed_name: string; father_name: string | null; guardian_phone: string | null; kind: string }[];
  if (!before) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };

  if (uid !== before.uid) {
    const [student] = (await sql`select is_demo from students where uid = ${uid}`) as { is_demo: boolean }[];
    if (!student) return { ok: false, message: `No student on the register has the User ID ${uid}.`, field: "uid" };
    if (student.is_demo) return { ok: false, message: `${uid} is a KIDS demo record, not a child.`, field: "uid" };
  }
  const [acct] = (await sql`select 1 as x from app_accounts where uid = ${uid}`) as { x: number }[];
  const kind: "claim" | "reset" = acct ? "reset" : "claim";

  const rows = (await sql`
    update app_account_requests
       set original = coalesce(original, jsonb_build_object(
             'uid', uid, 'typed_name', typed_name, 'father_name', father_name,
             'guardian_phone', guardian_phone)),
           uid = ${uid}, kind = ${kind}, typed_name = ${name}, father_name = ${father},
           guardian_phone = ${phone}, edited_at = now(), edited_by = ${staffId}
     where id = ${id}::bigint and status = 'pending'
     returning id
  `) as { id: string }[];
  if (!rows.length) return { ok: false, message: "Somebody has already decided this one. Reload to see what they did." };

  await logAdminEvent(staffId, "account_request_edited", { kind: "student", id: uid }, {
    request: id,
    before,
    after: { uid, kind, typed_name: name, father_name: father, guardian_phone: phone },
  });
  return { ok: true, uid, kind };
}

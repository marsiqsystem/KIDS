import { currentStaff } from "@/lib/admin/session";
import { sql } from "@/lib/exam/db";
import { csvResponse } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "Waiting",
  approved: "Approved",
  rejected: "Turned down",
  withdrawn: "Withdrawn",
};

/**
 * Every "open my account" and password-reset request -- waiting and decided --
 * with what the phone typed beside what the register and master file hold.
 * Waiting ones first.
 *
 * Personal data: admin-only, never cached, never committed.
 */
export async function GET() {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin" || staff.must_change) {
    return new Response("Not signed in as an admin.", { status: 403 });
  }

  const rows = (await sql`
    select q.status, q.requested_at, q.kind, q.uid, s.name, q.typed_name,
           q.father_name, g.guardian_name as file_father, q.guardian_phone, g.phone as file_phone,
           q.typed_dob, s.class, s.stream, s.school_name, s.centre_code,
           q.decided_at, st.full_name as decided_by_name, q.reason, q.opened_at
      from app_account_requests q
      join students s on s.uid = q.uid
      left join register_guardians g on g.uid = q.uid
      left join admin_staff st on st.staff_id = q.decided_by
     order by (q.status = 'pending') desc, q.requested_at
  `) as Record<string, unknown>[];

  return csvResponse(
    `kids-claim-requests-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Status", "Asked", "Request", "UID", "Name on register", "Name typed",
      "Father typed", "Father on file", "Mobile typed", "Mobile on file", "Date of birth typed",
      "Class", "Stream", "School", "Centre", "Decided", "Decided by", "Reason turned down",
      "Opened on the phone",
    ],
    rows.map((r) => [
      STATUS[String(r.status)] ?? r.status,
      r.requested_at,
      r.kind === "reset" ? "Password reset" : "Claim",
      r.uid, r.name, r.typed_name,
      r.father_name, r.file_father, r.guardian_phone, r.file_phone, r.typed_dob,
      r.class, r.stream, r.school_name, r.centre_code,
      r.decided_at, r.decided_by_name, r.reason, r.opened_at,
    ]),
  );
}

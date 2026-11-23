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
 * Every application ever made in the app -- waiting, approved, turned down --
 * as a sheet the office can sort and filter in Excel. Waiting ones first.
 *
 * Personal data: admin-only, never cached, never committed.
 */
export async function GET() {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin" || staff.must_change) {
    return new Response("Not signed in as an admin.", { status: 403 });
  }

  const rows = (await sql`
    select r.status, r.applied_at, r.kind, r.name, r.class, r.stream, r.dob, r.guardian_phone,
           r.school_name, r.centre_code, r.school_code, r.uid, r.decided_at,
           st.full_name as decided_by_name, r.reason
      from app_registrations r
      left join admin_staff st on st.staff_id = r.decided_by
     order by (r.status = 'pending') desc, r.centre_code, r.school_code, r.applied_at
  `) as Record<string, unknown>[];

  return csvResponse(
    `kids-applications-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Status", "Applied", "Who", "Name", "Class", "Stream", "Date of birth", "Family mobile",
      "School", "Centre", "School code", "UID given", "Decided", "Decided by", "Reason turned down",
    ],
    rows.map((r) => [
      STATUS[String(r.status)] ?? r.status,
      r.applied_at,
      r.kind === "guest" ? "Staff / teacher" : "Student",
      r.name, r.class, r.stream, r.dob, r.guardian_phone,
      r.school_name, r.centre_code, r.school_code, r.uid,
      r.decided_at, r.decided_by_name, r.reason,
    ]),
  );
}

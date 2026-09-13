import { currentStaff } from "@/lib/admin/session";
import { approvedCorrections } from "@/lib/admin/corrections";

export const dynamic = "force-dynamic";

/**
 * Every approved correction, as a CSV for the master workbook.
 *
 * The workbook is the master and the database is downstream of it. A correction
 * made only in the database used to be reverted by the next reseed; it is now
 * re-applied instead (scripts/seed-students.ts), but the two sources still
 * disagree until the workbook is changed too. This file is how it gets changed
 * -- one row per field, with the old value beside the new, so it can be checked
 * against the sheet rather than trusted.
 *
 * Personal data: names and dates of birth. Admin-only, never cached, and it
 * must never be committed or put anywhere near the public repository.
 */
export async function GET() {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin" || staff.must_change) {
    return new Response("Not signed in as an admin.", { status: 403 });
  }

  const rows = await approvedCorrections();
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    ["UID", "Field", "Was", "Now", "Now (school name)", "Approved at", "Approved by"].join(","),
    ...rows.map((r) =>
      [r.uid, r.field, r.old_value, r.new_value, r.new_label, r.decided_at, r.decided_by].map(cell).join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  // A byte-order mark, so Excel on the office laptop opens a Bengali or Hindi
  // name as that name and not as mojibake.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kids-corrections-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

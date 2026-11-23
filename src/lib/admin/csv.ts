/**
 * A CSV download for the office, opened in Excel.
 *
 * Personal data goes through here (names, dates of birth, family numbers):
 * callers check for an admin first, and the response is never cached.
 */

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "23-11-2026 19:39", Kolkata time -- what the office reads, not ISO. */
export function istStamp(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return IST.format(date).replace(/\//g, "-").replace(",", "");
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : v instanceof Date ? istStamp(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvResponse(filename: string, header: string[], rows: unknown[][]): Response {
  const lines = [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  // A byte-order mark, so Excel opens a Bengali or Hindi name as that name.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

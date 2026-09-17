import type { AuditRow } from "./staff";

/**
 * The audit log as sentences a person can read out — redesign board 11.
 *
 * "Approved registration → UID 402 118 963", not `registration_approved
 * {"uid":"402118963"}`. Plain past tense, the affected record named. An action
 * this file does not know yet falls back to its own name with the underscores
 * taken out, so a new action is never hidden, only less polished.
 */

const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : null);

const uidText = (v: string | null) => (v && /^\d{9}$/.test(v) ? v.replace(/(\d{3})(?=\d)/g, "$1 ") : v);

export function sentence(e: AuditRow): string {
  const d = e.detail ?? {};
  const target = uidText(e.target_id);
  const name = str(d.name) ?? str(d.title);

  switch (e.action) {
    case "signin":
      return "Signed in";
    case "signout":
      return "Signed out";
    case "registration_approved":
      return `Approved a registration → UID ${target ?? ""}${name ? ` · ${name}` : ""}`;
    case "registration_rejected":
      return `Rejected a registration${name ? ` · ${name}` : ""}`;
    case "correction_approved":
      return `Approved a correction${str(d.field) ? ` to ${str(d.field)}` : ""}${target ? ` · UID ${target}` : ""}`;
    case "correction_rejected":
      return `Did not accept a correction${str(d.field) ? ` to ${str(d.field)}` : ""}${target ? ` · UID ${target}` : ""}`;
    case "app_password_reset":
    case "password_reset":
      return `Issued a new password${target ? ` · ${target}` : ""}`;
    case "password_set":
      return "Set their own password";
    case "staff_created":
      return `Created a staff account${target ? ` · ${target}` : ""}`;
    case "batch_created":
      return `Created a batch${name ? ` · ${name}` : ""}`;
    case "member_added":
      return `Added a student to a batch${str(d.uid) ? ` · UID ${uidText(str(d.uid))}` : ""}`;
    case "member_removed":
      return `Took a student out of a batch${str(d.uid) ? ` · UID ${uidText(str(d.uid))}` : ""}`;
    case "teacher_assigned":
      return `Assigned a teacher to a batch${str(d.staff) ? ` · ${str(d.staff)}` : ""}`;
    case "teacher_unassigned":
      return `Unassigned a teacher${str(d.staffId) ? ` · ${str(d.staffId)}` : ""}`;
    case "class_created":
      return `Scheduled a class${name ? ` · ${name}` : ""}`;
    case "class_started":
      return `Opened the room${name ? ` for ${name}` : ""}`;
    case "class_ended":
      return `Ended the class${name ? ` · ${name}` : ""}`;
    case "class_cancelled":
      return `Cancelled a class${name ? ` · ${name}` : ""}`;
    case "class_recording_set":
      return `Added the recording${name ? ` for ${name}` : ""}`;
    case "post_written":
      return `Posted a notice${name ? ` · “${name}”` : ""}`;
    case "post_pushed":
      return "Pushed a notice to phones";
    case "post_retracted":
      return `Retracted a notice${name ? ` · “${name}”` : ""}`;
    case "paper_scheduled":
      return `Scheduled a paper${str(d.paper) ? ` · ${str(d.paper)}` : ""}`;
    case "paper_unscheduled":
      return `Took a paper off the schedule${str(d.paper) ? ` · ${str(d.paper)}` : ""}`;
    case "mock_created":
      return `Created a mock test${name ? ` · ${name}` : ""}`;
    case "paper_marked":
      return `Marked and ranked a paper${str(d.paper) ? ` · ${str(d.paper)}` : ""}`;
    case "invigilator_assigned":
      return `Named an invigilator${str(d.centre) ? ` · ${str(d.centre)}` : ""}`;
    case "invigilator_unassigned":
      return `Removed an invigilator${str(d.centre) ? ` · ${str(d.centre)}` : ""}`;
    case "results_published":
      return `Published results${str(d.paper) ? ` · ${str(d.paper)}` : ""}`;
    case "results_withdrawn":
      return `Withdrew results${str(d.paper) ? ` · ${str(d.paper)}` : ""}`;
    case "award_published":
      return "Published the SET 2026 award";
    case "award_withdrawn":
      return "Withdrew the SET 2026 award";
    case "batch_archived":
      return "Archived a batch";
    case "batch_reopened":
      return "Reopened a batch";
    case "staff_disabled":
      return `Switched off a staff account${target ? ` · ${target}` : ""}`;
    case "staff_enabled":
      return `Switched a staff account back on${target ? ` · ${target}` : ""}`;
    case "award_computed":
      return "Computed the SET 2026 award";
    case "award_rule_changed":
      return "Changed the one-list / two-list rule";
    default: {
      const words = e.action.replace(/_/g, " ");
      return `${words.charAt(0).toUpperCase()}${words.slice(1)}${target ? ` · ${target}` : ""}`;
    }
  }
}

/**
 * Acts that cannot be taken back, for the badge in the log. Not publishing
 * results or the award: both have a Withdraw, by ruling.
 */
export const ONE_WAY = new Set([
  "registration_approved",
  "app_password_reset",
  "password_reset",
  "class_started",
  "class_ended",
  "post_pushed",
]);

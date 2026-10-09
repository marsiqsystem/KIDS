import { json, mobileStudent } from "@/lib/app/mobile-api";
import { chosenSections } from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import { unreadCount } from "@/lib/app/notices";
import { listDevices } from "@/lib/app/devices";
import { findAccount } from "@/lib/app/accounts";
import { OFFICE } from "@/components/app/door";
import { coachingSummary } from "@/lib/app/coaching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Profile, for the native app (board 07, 3A) — identity, not settings.
 *
 * The register read back, the counts behind "My subjects", and the phones that
 * have opened this account — listed only when there is more than one, as on
 * the website, because a security list everybody sees is one nobody reads.
 */
function mediumName(medium: string): string {
  const m = medium.trim().toUpperCase();
  if (!m) return "English";
  return m.charAt(0) + m.slice(1).toLowerCase();
}

export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const [sections, unread, devices, account, coaching] = await Promise.all([
    chosenSections(student.uid),
    unreadCount(student),
    listDevices(student.uid),
    findAccount(student.uid),
    coachingSummary(student.uid),
  ]);
  const questions = sections.length ? poolFor(student.class, student.stream, student.medium, sections).length : 0;

  return json({
    ok: true,
    name: student.name,
    uid: student.uid,
    onFile: {
      cls: student.stream ? `${student.class} · ${student.stream}` : student.class,
      school: student.school_name,
      centre: student.centre_name,
      medium: mediumName(student.medium),
    },
    unread,
    coaching,
    subjects: { chosen: sections.length, questions },
    mustChange: Boolean(account?.must_change),
    phones:
      devices.length > 1
        ? devices.map((d) => ({ label: d.label ?? "Unknown phone", lastSeen: d.last_seen_at, current: d.is_current }))
        : [],
    office: OFFICE,
  });
}

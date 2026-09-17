import Link from "next/link";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Flame,
  KeyRound,
  LogOut,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { chosenSections } from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import { signOutAction } from "@/app/app/actions";
import { unreadCount } from "@/lib/app/notices";
import { listDevices } from "@/lib/app/devices";
import { groupUid } from "@/lib/app/uid";
import { APP_BUILD } from "@/lib/app/app-build";
import { OFFICE } from "@/components/app/door";
import CoachingBlock from "@/components/app/CoachingBlock";
import "../../profile.css";

/**
 * Profile. Redesign board 07, 3A — identity, not settings.
 *
 * The header is the child's identity at KIDS: initials, name, and the User ID
 * beside them. Every fact under "What KIDS has on file" is the register read
 * back; nothing here edits it, and the one door is "Ask to change", which files
 * a request the office decides.
 *
 * Not drawn from the board: the star total (a proposal, not ruled) and "My KIDS
 * card" (no such screen exists). Kept from the brief that the board dropped:
 * My subjects, and My phones when a second phone has signed in.
 */
export const dynamic = "force-dynamic";

/** The medium as a child would say it. "" on the register means English. */
function mediumName(medium: string): string {
  const m = medium.trim().toUpperCase();
  if (!m) return "English";
  return m.charAt(0) + m.slice(1).toLowerCase();
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const student = await requireStudent();
  const [{ changed }, sections, unread, devices] = await Promise.all([
    searchParams,
    chosenSections(student.uid),
    unreadCount(student),
    listDevices(student.uid),
  ]);

  const questions = sections.length ? poolFor(student.class, student.stream, student.medium, sections).length : 0;

  return (
    <>
      <header className="pf-hero">
        <span className="pf-hero__avatar" aria-hidden="true">
          {initials(student.name)}
        </span>
        <div className="pf-hero__who">
          <h1 className="pf-hero__name">{student.name}</h1>
          <span className="pf-hero__uid">{groupUid(student.uid)}</span>
        </div>
      </header>

      {changed ? (
        <p className="pf-done" role="status">
          <ShieldCheck size={18} aria-hidden="true" /> Password changed.
        </p>
      ) : null}

      <CoachingBlock uid={student.uid} />

      <div className="k-card pf-file">
        <div className="pf-file__top">
          <span className="k-label">On file</span>
          <Link href="/app/profile/details" className="pf-file__ask">
            Ask to change
          </Link>
        </div>
        <dl className="pf-facts">
          <div>
            <dt>Class</dt>
            <dd>
              {student.class}
              {student.stream ? ` · ${student.stream}` : ""}
            </dd>
          </div>
          <div>
            <dt>School</dt>
            <dd>{student.school_name}</dd>
          </div>
          <div>
            <dt>Centre</dt>
            <dd>{student.centre_name}</dd>
          </div>
          <div>
            <dt>Medium</dt>
            <dd>{mediumName(student.medium)}</dd>
          </div>
        </dl>
      </div>

      <div className="pf-rows">
        <Link href="/app/notices" className="k-row">
          <span className="k-row__icon" aria-hidden="true">
            <Bell size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-row__title">Notices</span>
          </span>
          {unread > 0 ? <span className="k-bell__n pf-count">{unread}</span> : null}
          <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
        </Link>

        <Link href="/app/subjects" className="k-row">
          <span className="k-row__icon" aria-hidden="true">
            <BookOpen size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-row__title">My subjects</span>
            <span className="k-row__line">
              {sections.length ? `${sections.length} chosen · ${questions} questions` : "None chosen yet"}
            </span>
          </span>
          <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
        </Link>

        <Link href="/app/profile/password" className="k-row">
          <span className="k-row__icon" aria-hidden="true">
            <KeyRound size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-row__title">Change my password</span>
          </span>
          <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
        </Link>

        <Link href="/app/profile/details" className="k-row">
          <span className="k-row__icon" aria-hidden="true">
            <PencilLine size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-row__title">My details are wrong</span>
          </span>
          <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
        </Link>
      </div>

      {/* Shown only once there is a second phone to show: a security list that
          appears for everybody is one nobody reads. */}
      {devices.length > 1 ? (
        <div className="k-card">
          <div className="k-label">My phones</div>
          <ul className="pf-phones">
            {devices.map((d) => (
              <li key={d.device_id}>
                <Smartphone size={18} aria-hidden="true" />
                <span className="pf-phones__what">
                  {d.label ?? "Unknown phone"}
                  <span>
                    Last{" "}
                    {new Date(d.last_seen_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </span>
                {d.is_current ? <span className="k-chip k-chip--teal">This phone</span> : null}
              </li>
            ))}
          </ul>
          <p className="k-line">Not yours? Change your password now.</p>
        </div>
      ) : null}

      <div className="k-card pf-out">
        <ul className="pf-out__keeps">
          <li>
            <Flame size={20} aria-hidden="true" />
            <span>Streak kept</span>
          </li>
          <li>
            <ShieldCheck size={20} aria-hidden="true" />
            <span>Record kept</span>
          </li>
          <li>
            <Smartphone size={20} aria-hidden="true" />
            <span>Phone freed</span>
          </li>
        </ul>
        <form action={signOutAction}>
          <button type="submit" className="k-btn k-btn--outline">
            <LogOut size={18} aria-hidden="true" /> Sign out
          </button>
        </form>
        <p className="k-line pf-center">Signing out frees this phone for another student.</p>
      </div>

      <div className="pf-help">
        <span className="k-label">Contact KIDS</span>
        <a className="k-row" href={`tel:${OFFICE.tel}`}>
          <span className="k-row__icon" aria-hidden="true">
            <Phone size={20} />
          </span>
          <span className="k-row__title k-mono">{OFFICE.phone}</span>
        </a>
        <a className="k-row" href={`mailto:${OFFICE.email}`}>
          <span className="k-row__icon" aria-hidden="true">
            <Mail size={20} />
          </span>
          <span className="k-row__title door-email">{OFFICE.email}</span>
        </a>
      </div>

      <p className="pf-version">
        {OFFICE.reg} · build {APP_BUILD}
      </p>
    </>
  );
}

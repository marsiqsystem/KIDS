import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { chosenSections } from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import { signOutAction } from "@/app/app/actions";
import { unreadCount } from "@/lib/app/notices";
import { listDevices } from "@/lib/app/devices";
import "../../profile.css";

/**
 * Profile — design 7a. Identity, not settings.
 *
 * Every fact on the top card is the exam record read back, and nothing on this
 * screen can edit it. That is the reason there is no medium toggle: medium is
 * record data, like the spelling of a school, and a child who has been entered
 * under the wrong one needs the office to correct the record — not a switch
 * that would leave the app and the marksheet disagreeing.
 *
 * Two things a student can change are here, each on a screen of its own: the
 * subjects their daily set draws from, and their password. No toggles: on a
 * 360px handset a switch that fires on touch is a setting changed by accident.
 */
export const dynamic = "force-dynamic";

/** The medium as a child would say it. "" on the register means English. */
function mediumName(medium: string): string {
  const m = medium.trim().toUpperCase();
  if (!m) return "English";
  return m.charAt(0) + m.slice(1).toLowerCase();
}

function Chevron() {
  return (
    <svg
      className="pro-row__go"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const student = await requireStudent();
  const [{ changed }, sections, unread, devices] = await Promise.all([
    searchParams,
    chosenSections(student.uid),
    unreadCount(student),
    listDevices(student.uid),
  ]);

  // What the subjects row is worth saying: the sections themselves, and how
  // many questions they put behind the daily set. Counted from the bank in this
  // student's own medium, never a literal.
  const questions = sections.length
    ? poolFor(student.class, student.stream, student.medium, sections).length
    : 0;

  return (
    <>
      <h1 className="app-h1">Profile</h1>

      {changed && (
        <p className="pro-done" role="status">
          Your password is changed. Use the new one the next time you sign in.
        </p>
      )}

      <div className="pro-id">
        <span className="pro-id__label">Your User ID · never changes</span>
        <span className="pro-id__uid">
          {student.uid.slice(0, 3)} {student.uid.slice(3, 6)} {student.uid.slice(6)}
        </span>
        <span className="pro-id__name">{student.name}</span>
      </div>

      <div className="app-card">
        <div className="pro-facts">
          <div className="pro-fact">
            <span className="pro-fact__label">Class</span>
            <span className="pro-fact__value">
              {student.class}
              {student.stream ? ` · ${student.stream}` : ""}
            </span>
          </div>
          <div className="pro-fact">
            <span className="pro-fact__label">School</span>
            <span className="pro-fact__value">{student.school_name}</span>
          </div>
          <div className="pro-fact">
            <span className="pro-fact__label">Centre</span>
            <span className="pro-fact__value">
              {student.centre_code} · {student.centre_name}
            </span>
          </div>
          <div className="pro-fact">
            <span className="pro-fact__label">Medium</span>
            <span className="pro-fact__value">{mediumName(student.medium)}</span>
          </div>
        </div>
        <p>
          Your medium comes from your exam record, so it is not a switch here.
          {student.medium
            ? ` Where a question was written in ${mediumName(student.medium)} you get that one, and the explanations are in ${mediumName(student.medium)} too.`
            : " Your questions and explanations are the English ones."}
        </p>
      </div>

      <div className="pro-rows">
        <Link href="/app/notices" className="pro-row">
          <span className="pro-row__text">
            <span className="pro-row__title">Notices from KIDS</span>
            <span className="pro-row__note">
              {unread > 0
                ? `${unread} you have not read`
                : "Results, exam papers and your daily set"}
            </span>
          </span>
          <Chevron />
        </Link>

        <Link href="/app/subjects" className="pro-row">
          <span className="pro-row__text">
            <span className="pro-row__title">Change my subjects</span>
            <span className="pro-row__note">
              {sections.length
                ? `${sections.join(", ")} · ${questions} questions`
                : "You have not chosen any yet"}
            </span>
          </span>
          <Chevron />
        </Link>

        <Link href="/app/profile/password" className="pro-row">
          <span className="pro-row__text">
            <span className="pro-row__title">Change my password</span>
            <span className="pro-row__note">You will need the one you use now</span>
          </span>
          <Chevron />
        </Link>

        {/* Drawn and dimmed until September 2026, so a student could see the
            route existed before it worked. It works now for the details on
            the record; a disputed MARK is still a question for the office,
            and the screen behind this row says so. */}
        <Link href="/app/profile/details" className="pro-row">
          <span className="pro-row__text">
            <span className="pro-row__title">My details are wrong</span>
            <span className="pro-row__note">Name, date of birth, class or school</span>
          </span>
          <Chevron />
        </Link>
      </div>

      {/* Phase 0. The one screen in the app that answers "has somebody else
          been in my account" — the question the August link-sharing dispute
          could not answer at all, because nothing was ever written down.
          Shown only once there is a second phone to show: on the ordinary
          account this is noise, and a security notice that appears for
          everybody is a security notice nobody reads. */}
      {devices.length > 1 && (
        <div className="app-card pro-devices">
          <h2>Phones this account has been opened on</h2>
          <ul>
            {devices.map((d) => (
              <li key={d.device_id} className={d.is_current ? "is-current" : undefined}>
                <span className="pro-devices__what">
                  {d.label ?? "Unknown device"}
                  {d.is_current && <em> · this phone</em>}
                </span>
                <span className="pro-devices__when">
                  {d.sign_ins} sign-in{d.sign_ins === 1 ? "" : "s"} · last{" "}
                  {new Date(d.last_seen_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </li>
            ))}
          </ul>
          <p>
            Your account works on one phone at a time — the top one. If you do not recognise a
            phone on this list, change your password now and it is locked out.
          </p>
        </div>
      )}

      <div className="pro-out">
        <h2>Sign out — someone else needs this phone</h2>
        <ul>
          <li>
            <Tick />
            <span>
              Your streak, your record and your answers live on your User ID, not on this phone.
            </span>
          </li>
          <li>
            <Tick />
            <span>
              Anything you answered today is already with KIDS. Signing out does not undo a day.
            </span>
          </li>
          <li>
            <Tick />
            <span>
              This phone is left with nothing of yours on it, so the next student does not open your
              account. It all comes back when you sign in.
            </span>
          </li>
        </ul>
        <form action={signOutAction}>
          <button type="submit" className="app-btn app-btn--outline">
            Sign out
          </button>
        </form>
      </div>

      <div className="pro-help">
        <span className="app-eyebrow">Help</span>
        <span className="pro-help__who">Kabitirtha Institute of Development &amp; Studies</span>
        <a href="mailto:kids.kol.org2003@gmail.com">kids.kol.org2003@gmail.com</a>
        <a href="tel:+919836414786">+91 98364 14786</a>
        <address>
          82A/H/5, Dr. Sudhir Basu Road, Kolkata 700023
          <br />
          Registered NGO · S/1L/19796
        </address>
      </div>

      <p className="pro-version">SET student app · version 1.0</p>
    </>
  );
}

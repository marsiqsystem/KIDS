import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import PasswordChangeForm from "@/components/app/PasswordChangeForm";
import "../../../profile.css";

/**
 * Change my password. Design 7a's row, given its own screen.
 *
 * A screen rather than a card on Profile, because the three boxes plus the Show
 * toggle do not fit above the fold at 360 next to an identity card, and a
 * password half-typed while scrolling is the mistake this cohort actually makes.
 *
 * No code, no gateway, no bill: the current password is the whole check. See
 * changePassword() in src/lib/app/accounts.ts for why it is deliberately not
 * wired to the front door's lockout.
 */
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ must?: string }>;
}) {
  const [student, { must }] = await Promise.all([requireStudent(), searchParams]);

  return (
    <>
      <div>
        <Link href="/app/profile" className="app-btn app-btn--quiet" style={{ width: "auto", justifyContent: "flex-start", padding: 0 }}>
          ← Profile
        </Link>
        <h1 className="app-h1">Change my password</h1>
        <p className="app-sub">
          {student.uid.slice(0, 3)} {student.uid.slice(3, 6)} {student.uid.slice(6)} · {student.name}
        </p>
      </div>

      {/* Arrived here straight from sign-in because the office set this
          password by hand. Says so plainly: a child who is bounced to a form
          without explanation assumes something has gone wrong. */}
      {must && (
        <div className="app-card app-card--gold" role="status">
          <h3>Choose your own password now</h3>
          <p>
            The one you just used was set for you by KIDS, and someone else knows it. Type it once
            more below as your current password, then pick one only you know.
          </p>
        </div>
      )}

      <PasswordChangeForm />
    </>
  );
}

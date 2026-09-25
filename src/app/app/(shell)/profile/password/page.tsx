import { requireStudent } from "@/lib/app/gate";
import { findAccount } from "@/lib/app/accounts";
import PasswordChangeForm from "@/components/app/PasswordChangeForm";
import { Head } from "@/components/app/kit";
import { groupUid } from "@/lib/app/uid";
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
  searchParams: Promise<{ must?: string; opened?: string }>;
}) {
  const [student, { must, opened }] = await Promise.all([requireStudent(), searchParams]);
  // Read from the account, not the address bar: whether the current password is
  // asked for is a fact about the account.
  const issued = (await findAccount(student.uid))?.must_change ?? false;

  return (
    <>
      <Head title="Change password" back={must ? undefined : "/app/profile"} />
      <p className="k-line k-mono">{groupUid(student.uid)}</p>

      {/* Arrived straight from sign-in because the office set this password by
          hand. Said plainly: a child bounced to a form assumes something broke. */}
      {opened && issued ? (
        // Arrived by itself, from an approval in the control centre.
        <div className="door-alert door-alert--gold" role="status">
          <div className="door-alert__text">
            <p>
              <strong>KIDS opened your account on this phone.</strong> Your User ID is{" "}
              <span className="k-mono">{groupUid(student.uid)}</span> — write it down. Choose a password now so you
              can sign in again if you change phones.
            </p>
          </div>
        </div>
      ) : must && issued ? (
        <div className="door-alert door-alert--gold" role="status">
          <div className="door-alert__text">
            <p>
              <strong>Choose your own password now.</strong> The one you used was set by KIDS.
            </p>
          </div>
        </div>
      ) : null}

      <PasswordChangeForm needsCurrent={!issued} />
    </>
  );
}

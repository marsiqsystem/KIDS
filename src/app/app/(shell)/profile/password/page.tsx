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

export default async function ChangePasswordPage() {
  const student = await requireStudent();

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

      <PasswordChangeForm />
    </>
  );
}

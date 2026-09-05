import { requireStudent } from "@/lib/app/gate";
import { signOutAction } from "@/app/app/actions";

/**
 * Profile. Only the part of design 7a that can be built honestly today: who you
 * are, and signing out.
 *
 * Sign-out is a card with a promise in it, not a link in a corner. A shared
 * handset is the normal case here, so the screen says what happens to the
 * account before the button is pressed.
 */
export default async function ProfilePage() {
  const student = await requireStudent();

  return (
    <>
      <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, lineHeight: 1.2 }}>
        Profile
      </h1>

      <div className="app-card app-card--cream">
        <div className="app-datum">
          <span className="app-datum__label">Signed in as</span>
          <span className="app-datum__value">{student.name}</span>
        </div>
        <div className="app-datum">
          <span className="app-datum__label">User ID</span>
          <span className="app-datum__uid">
            {student.uid.slice(0, 3)} {student.uid.slice(3, 6)} {student.uid.slice(6)}
          </span>
        </div>
      </div>

      <div className="app-card">
        <h3>Sign out</h3>
        <p>
          Your record, your marks and your answer sheets stay exactly where they are — they belong to
          your User ID, not to this phone. Signing back in needs your password.
        </p>
        <form action={signOutAction}>
          <button type="submit" className="app-btn app-btn--outline app-btn--small">
            Sign out
          </button>
        </form>
      </div>

      <div className="app-soon">
        <h2>The rest of this screen is coming</h2>
        <p>
          Changing your subjects, changing your password, and asking the office to correct something
          on your record.
        </p>
      </div>
    </>
  );
}

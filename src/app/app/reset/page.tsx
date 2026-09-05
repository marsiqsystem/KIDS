import TitleBar from "@/components/app/TitleBar";
import { findStudent } from "@/lib/exam/db";

/**
 * Forgotten password, and the "my school can look up my ID" route. Design 4a.
 *
 * This screen deliberately does nothing. There is no reset link, no code, no
 * form — a password here is cleared by a person, and the screen's whole job is
 * to hand the student the two facts a teacher will ask for and get them out of
 * the app and into a staff room.
 *
 * No SMS, because there is no gateway to pay for. That is stated on the screen
 * rather than hidden, because a child who does not know why will keep looking
 * for the button.
 */
export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const uid = (id ?? "").replace(/\D/g, "").slice(0, 9);
  // Only looked up when nine digits actually arrived, so this page can never be
  // used to walk the register.
  const student = uid.length === 9 ? await findStudent(uid) : null;

  const grouped = uid.length === 9 ? `${uid.slice(0, 3)} ${uid.slice(3, 6)} ${uid.slice(6)}` : null;

  return (
    <div className="app-frame">
      <TitleBar title="Reset your password" />

      <div className="app-body">
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 21,
            lineHeight: 1.3,
          }}
        >
          A teacher has to unlock it
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-muted)" }}>
          KIDS does not send codes by SMS. Your password is reset by your school, or by the KIDS
          office, and you set a new one the next time you sign in.
        </p>

        <div className="app-card app-card--cream">
          <span className="app-label">Show this to your class teacher</span>

          <div className="app-datum">
            <span className="app-datum__label">User ID</span>
            <span className="app-datum__uid">{grouped ?? "the 9 digits on your admit card"}</span>
          </div>

          {student && (
            <div className="app-datum">
              <span className="app-datum__label">School</span>
              <span className="app-datum__value">{student.school_name}</span>
            </div>
          )}

          <hr className="app-rule-gold" />

          <p>
            Your school signs in with its own school code and clears the password from its student
            list. It takes them about a minute.
          </p>
        </div>

        <div className="app-card">
          <h3>If your school cannot do it</h3>
          <p>
            Write to KIDS with your User ID, your name and your school. Replies are by hand, so allow
            a working day.
          </p>
          <a className="app-contact" href="mailto:kids.kol.org2003@gmail.com">
            kids.kol.org2003@gmail.com
          </a>
          <a className="app-contact" href="tel:+919836414786">
            +91 98364 14786
          </a>
        </div>

        <div className="app-card app-card--gold" style={{ marginTop: "auto" }}>
          <h3>Why not a code on your phone?</h3>
          <p>
            Sending SMS costs money every month, and this app is built and paid for by KIDS alone. A
            teacher unlocking it costs nothing and is just as safe.
          </p>
        </div>
      </div>
    </div>
  );
}

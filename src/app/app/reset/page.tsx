import TitleBar from "@/components/app/TitleBar";
import { findStudent } from "@/lib/exam/db";

/**
 * Forgotten password, and the "my school can look up my ID" route. Design 4a.
 *
 * This screen deliberately does nothing. There is no reset link, no code, no
 * form — a password here is cleared by a person, and the screen's whole job is
 * to hand the student the two facts that person will ask for and get them out
 * of the app and to somebody who can help.
 *
 * No SMS, because there is no gateway to pay for. That is stated on the screen
 * rather than hidden, because a child who does not know why will keep looking
 * for the button.
 *
 * It used to say "your school signs in with its own school code and clears the
 * password from its student list". No such screen exists, and there are no
 * school accounts to sign in with — 112 schools would each need credentials and
 * somebody at each of them willing to use them, which is an operational
 * commitment KIDS has not made. The reset is done in the KIDS control centre by
 * a named member of staff (Students tab), so that is what this now says. A
 * screen may not promise a door that is not there.
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
          A person has to unlock it
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-muted)" }}>
          KIDS does not send codes by SMS. The KIDS office clears your password and gives you a
          new one to use once — you choose your own the moment you sign in with it.
        </p>

        <div className="app-card app-card--cream">
          <span className="app-label">Have these ready when you ask</span>

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
            Ask your class teacher to pass this to the KIDS office, or write to KIDS yourself with
            it. Clearing a password takes them under a minute once they have your User ID.
          </p>
        </div>

        <div className="app-card">
          <h3>Writing to KIDS</h3>
          <p>
            Send your User ID, your name and your school. Replies are by hand, so allow a working
            day. Nobody at KIDS can tell you your old password — there is no copy of it anywhere,
            which is the point. They can only give you a new one.
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

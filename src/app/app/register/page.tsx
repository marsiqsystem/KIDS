import Link from "next/link";
import TitleBar from "@/components/app/TitleBar";

/**
 * "I am new to KIDS — register." Design 4a's third button.
 *
 * Not built, and saying so plainly rather than hiding the button. Creating an
 * account for a child who is not on the SET 2026 register touches the merit
 * list, the school roster and UID minting all at once, and none of those are
 * decided yet. An honest closed door is better than a button that fails.
 */
export const metadata = { title: "Register · SET" };

export default function RegisterPage() {
  return (
    <div className="app-frame">
      <TitleBar title="New to KIDS" />
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
          Registration is not open yet
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-muted)" }}>
          Right now the app is for the students who sat SET 2026. If you sat the exam in July, you
          already have an account — you only need to claim it.
        </p>

        <Link href="/app/claim" className="app-btn app-btn--outline">
          I sat SET 2026 — claim my account
        </Link>

        <div className="app-card">
          <h3>If you did not sit SET 2026</h3>
          <p>
            Registration for the next Students Evaluation Test opens through your school. Ask your
            class teacher, or write to KIDS.
          </p>
          <a className="app-contact" href="mailto:kids.kol.org2003@gmail.com">
            kids.kol.org2003@gmail.com
          </a>
        </div>

        <p className="app-foot">
          <Link href="/app/sign-in">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

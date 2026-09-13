import TitleBar from "@/components/app/TitleBar";
import RegisterScreen from "@/components/app/RegisterScreen";
import { listSchools } from "@/lib/app/registrations";

export const dynamic = "force-dynamic";

export const metadata = { title: "Register · SET" };

/**
 * "I am new to KIDS — register."
 *
 * This was an honest closed door from 2 September until now: creating an
 * account for a child who is not on the SET 2026 register touches the school
 * roster and UID minting, and neither was decided. Both are, since 13
 * September, so the door opens.
 *
 * The 112 schools are fetched here rather than in the client component because
 * they are the same list for everybody and a server component can hand them
 * over without a round trip. They are chosen from, never typed: a school is the
 * pair (centre_code, school_code), and its NAME is copied from the register on
 * approval, so registration cannot introduce a 113th spelling of a school that
 * already exists.
 */
export default async function RegisterPage() {
  const schools = await listSchools();

  return (
    <div className="app-frame">
      <TitleBar title="New to KIDS" />
      <div className="app-body" style={{ paddingBottom: 0, gap: 12 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 21,
            lineHeight: 1.3,
          }}
        >
          Register for the Students Evaluation Test
        </h2>
      </div>
      <RegisterScreen schools={schools} />
    </div>
  );
}

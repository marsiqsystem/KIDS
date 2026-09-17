import RegisterScreen from "@/components/app/RegisterScreen";
import { DoorBar } from "@/components/app/door";
import { listSchools } from "@/lib/app/registrations";

export const dynamic = "force-dynamic";

export const metadata = { title: "Register · SET" };

/**
 * "New to KIDS — register." Redesign board 03, 2C.
 *
 * The 112 schools are fetched here rather than in the client component because
 * they are the same list for everybody. They are chosen from, never typed: a
 * school is the pair (centre_code, school_code), and its NAME is copied from the
 * register on approval, so registration cannot introduce a 113th spelling.
 */
export default async function RegisterPage() {
  const schools = await listSchools();

  return (
    <div className="app-frame">
      <DoorBar title="Register" />
      <RegisterScreen schools={schools} />
    </div>
  );
}

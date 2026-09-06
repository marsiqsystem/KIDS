import { redirect } from "next/navigation";
import Crest from "@/components/app/Crest";
import SignInForm from "@/components/app/SignInForm";
import { sessionUid } from "@/lib/app/session";

/**
 * The front door. Design 4a.
 *
 * Never cached: it reads the session cookie to decide whether anyone should be
 * looking at it at all.
 */
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; left?: string }>;
}) {
  // Already signed in — a shared handset's second child gets here by tapping a
  // bookmark, and should land in the app rather than at a password box.
  if (await sessionUid()) redirect("/app");

  const { id, left } = await searchParams;
  const initialUid = (id ?? "").replace(/\D/g, "").slice(0, 9);

  return (
    <div className="app-frame">
      <Crest />
      {left && (
        // The screen after sign-out is not a marketing page. It says the phone
        // is clear, and then gets out of the way of the next child.
        <div style={{ padding: "16px 16px 0" }}>
          <div className="app-card app-card--gold" role="status">
            <h3>Signed out. This phone is free.</h3>
            <p>
              Nothing of yours is left on it. Sign in whenever you want it back — your streak, your
              record and your answers carry on from where they were.
            </p>
          </div>
        </div>
      )}
      <SignInForm initialUid={initialUid} />
    </div>
  );
}

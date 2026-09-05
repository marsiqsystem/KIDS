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
  searchParams: Promise<{ id?: string }>;
}) {
  // Already signed in — a shared handset's second child gets here by tapping a
  // bookmark, and should land in the app rather than at a password box.
  if (await sessionUid()) redirect("/app");

  const { id } = await searchParams;
  const initialUid = (id ?? "").replace(/\D/g, "").slice(0, 9);

  return (
    <div className="app-frame">
      <Crest />
      <SignInForm initialUid={initialUid} />
    </div>
  );
}

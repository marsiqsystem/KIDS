import { redirect } from "next/navigation";
import { LogOut, Smartphone } from "lucide-react";
import SignInForm from "@/components/app/SignInForm";
import { DoorHero, Notice } from "@/components/app/door";
import { sessionUid } from "@/lib/app/session";

/**
 * The front door. Redesign board 03, 1B–1D.
 *
 * Never cached: it reads the session cookie to decide whether anyone should be
 * looking at it at all.
 */
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; left?: string; moved?: string }>;
}) {
  // Already signed in — a shared handset's second child gets here by tapping a
  // bookmark, and should land in the app rather than at a password box.
  if (await sessionUid()) redirect("/app");

  const { id, left, moved } = await searchParams;
  const initialUid = (id ?? "").replace(/\D/g, "").slice(0, 9);

  return (
    <div className="app-frame">
      <DoorHero title="Welcome back" line="A mission of excellence in education" />
      {moved ? (
        // This account was signed into on another phone, so this one fell out.
        // A move, never a breach: on a shared handset it is usually a sibling.
        <div className="door-notices">
          <Notice icon={<Smartphone size={20} />} tone="gold" title="Your account is on another phone">
            Signing in here moves it back. Not you? Change your password after.
          </Notice>
        </div>
      ) : null}
      {left ? (
        <div className="door-notices">
          <Notice icon={<LogOut size={20} />} tone="teal" title="Signed out. This phone is free.">
            Nothing of yours is left on it. Another student can sign in now.
          </Notice>
        </div>
      ) : null}
      <SignInForm initialUid={initialUid} />
    </div>
  );
}

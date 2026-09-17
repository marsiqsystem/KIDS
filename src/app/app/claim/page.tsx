import ClaimForm from "@/components/app/ClaimForm";
import { DoorBar } from "@/components/app/door";

export const dynamic = "force-dynamic";

/** Claim your account — for students already on the register. Redesign board 03, 2A. */
export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const initialUid = (id ?? "").replace(/\D/g, "").slice(0, 9);

  return (
    <div className="app-frame">
      <DoorBar title="Claim your account" />
      <ClaimForm initialUid={initialUid} />
    </div>
  );
}

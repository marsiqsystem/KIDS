import FindIdForm from "@/components/app/FindIdForm";
import { DoorBar } from "@/components/app/door";
import { listSchools } from "@/lib/app/registrations";

export const dynamic = "force-dynamic";

export const metadata = { title: "Find my User ID · SET" };

/**
 * Find my User ID (26 Nov 2026) -- for a child on the register who has lost
 * their KIDS card. Name, date of birth and school; see findMyUid.
 */
export default async function FindIdPage() {
  const schools = await listSchools();
  return (
    <div className="app-frame">
      <DoorBar title="Find my User ID" back="/app/claim" />
      <FindIdForm schools={schools} />
    </div>
  );
}

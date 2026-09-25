import AskOfficeScreen from "@/components/app/AskOfficeScreen";
import { DoorBar } from "@/components/app/door";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ask KIDS · SET" };

/**
 * Ask the KIDS office to open my account -- for a child on the register who
 * cannot claim by themselves, or has forgotten their password. The office
 * approves in the Claims tab and this phone signs itself in.
 * See src/lib/app/handoff.ts.
 */
export default async function AskPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const initialUid = (id ?? "").replace(/\D/g, "").slice(0, 9);

  return (
    <div className="app-frame">
      <DoorBar title="Ask KIDS to open my account" back={initialUid ? `/app/claim?id=${initialUid}` : "/app/claim"} />
      <AskOfficeScreen initialUid={initialUid} />
    </div>
  );
}

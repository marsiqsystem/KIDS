import TitleBar from "@/components/app/TitleBar";
import ClaimForm from "@/components/app/ClaimForm";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const initialUid = (id ?? "").replace(/\D/g, "").slice(0, 9);

  return (
    <div className="app-frame">
      <TitleBar title="Claim your account" />
      <div className="app-body" style={{ paddingBottom: 0, gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 21, lineHeight: 1.3 }}>
          You sat SET 2026 — the account is already yours
        </h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-muted)" }}>
          Your marks, your rank and your answer sheet are already on the register under your User ID.
          Claiming just puts a password on them.
        </p>
      </div>
      <ClaimForm initialUid={initialUid} />
    </div>
  );
}

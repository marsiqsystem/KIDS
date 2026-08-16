import type { Metadata } from "next";
import { isAdmin, adminConfigured } from "@/lib/admin/auth";
import { stageData } from "@/lib/exam/toppers";
import { offlinePublicationState } from "@/lib/exam/offline-results";
import StageShow from "@/components/stage/StageShow";
import "./stage.css";

export const metadata: Metadata = {
  title: "The Publish Moment · SET 2026",
  robots: { index: false, follow: false },
};

// Never cached, never prerendered: the boards are read at the moment the
// operator opens the screen, and the publish state must be the live one.
export const dynamic = "force-dynamic";

/**
 * The stage instrument.
 *
 * One screen, run from a laptop plugged into the hall projector. Act I is a
 * button that must be HELD, not clicked — the only irreversible action in this
 * codebase should not be one slip of a finger away. Holding it publishes every
 * written result. Act II is the declaration. Act III is the boards, driven with
 * the arrow keys.
 *
 * Admin-gated, because Act I publishes children's results to the internet.
 * `?rehearse=1` runs the whole show with the publish call disabled, so the
 * sequence can be walked through on the actual hall projector beforehand.
 */
export default async function StagePage({
  searchParams,
}: {
  searchParams: Promise<{ rehearse?: string }>;
}) {
  const { rehearse } = await searchParams;

  if (!adminConfigured() || !(await isAdmin())) {
    return (
      <main className="stage-locked">
        <h1>The Publish Moment</h1>
        <p>
          This screen declares the SET 2026 written results. Sign in at <code>/admin</code> on
          this same browser first, then come back.
        </p>
      </main>
    );
  }

  const [data, publication] = await Promise.all([
    stageData(
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric",
      }).format(new Date()),
    ),
    offlinePublicationState(),
  ]);

  return (
    <StageShow
      data={data}
      alreadyPublished={publication.published}
      rehearse={rehearse === "1"}
    />
  );
}

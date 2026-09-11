import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { dayFor } from "@/lib/app/day";
import SitStill from "@/components/app/SitStill";
import "../../day.css";

/**
 * Sitting still — the ritual block, ten minutes at six.
 *
 * ⚠️ This is the one screen in the app built against Design's advice. Design
 * argued that a ten-minute non-academic block, alone, at an hour when a child
 * has just been woken by an alarm they resent, with nobody watching, is the
 * definition of the block that gets swiped away — and proposed two minutes
 * attached to the wake instead. Umar overruled it on 11 September: the ritual
 * is not a completion metric to be optimised, it is the part of the day that is
 * not about marks. If it turns out to be skipped by week three, Design was
 * right, and this comment is the record of who decided.
 *
 * What IS taken from Design, entirely: no timer animation, no breathing
 * graphic, no audio. A cheap handset on 3G should not be animating anything at
 * six in the morning, and an audio track is a download every single day. The
 * screen goes almost black and does less the longer you look at it.
 */
export const dynamic = "force-dynamic";

export default async function SitPage() {
  const student = await requireStudent();

  const day = await dayFor(student);
  if (!day) redirect("/app");

  const block = day.blocks.find((b) => b.kind === "ritual");
  // Already sat today, or not on the programme's day at all. Either way there
  // is nothing to sit through and the day is the honest place to be.
  if (!block || block.status === "done") redirect("/app");

  return <SitStill minutes={block.minutes ?? 10} />;
}

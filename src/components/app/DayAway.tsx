import Link from "next/link";
import Image from "next/image";
import type { Day } from "@/lib/app/day";

/**
 * Two days or more without opening it. Redesign board 13, 2B.
 *
 * Welcome back and nothing else — the addendum's rule. No count of days
 * missed, no catch-up list, no streak wreckage. The night-to-dawn sky is used
 * here and nowhere else in The Day, because returning after an absence is the
 * UDAAN moment. One button, and it faces forward: today's class if there is
 * one, otherwise the day.
 *
 * `streak` is still passed in by Home and deliberately not shown.
 */
export default function DayAway({ day }: { day: Day; streak: number }) {
  const classBlock = day.blocks.find((b) => b.kind === "class");
  const classToday = classBlock && classBlock.status !== "uncounted" && classBlock.href;

  return (
    <div className="away">
      <div className="away__sky">
        <div className="away__crest">
          <Image src="/kids-icon.png" alt="" width={96} height={96} />
          <span className="door-sky__star" style={{ top: 0, right: -16 }}>★</span>
          <span className="door-sky__star" style={{ top: 34, left: -20, animationDelay: "0.8s" }}>★</span>
          <span className="door-sky__star" style={{ bottom: 4, right: -10, animationDelay: "1.6s" }}>★</span>
        </div>
        <h1 className="away__title">Welcome back</h1>
        <p className="away__line">Your day is still here.</p>
      </div>
      <div className="away__act">
        {classToday ? (
          <Link href={classBlock.href!} className="k-btn k-btn--gold">
            Today&rsquo;s {classBlock.at} class
          </Link>
        ) : (
          <Link href="/app/set" className="k-btn k-btn--gold">
            Start your five questions
          </Link>
        )}
      </div>
    </div>
  );
}

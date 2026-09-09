import Link from "next/link";
import { nextClassFor } from "@/lib/admin/classes";

/**
 * The next class, on Home.
 *
 * Renders nothing at all for a student who is in no batch — which, outside the
 * coaching programme, is nearly every one of the 9,652. A card saying "no
 * classes" would be clutter on 9,587 phones to serve 65.
 */
export default async function NextClass({ uid }: { uid: string }) {
  const live = await nextClassFor(uid);
  if (!live) return null;

  const open = Boolean(live.started_at);

  return (
    <Link href={`/app/class/${live.id}`} className={`cls-card${open ? " cls-card--live" : ""}`}>
      <span className="cls-card__top">{open ? "Live now — tap to join" : "Next class"}</span>
      <span className="cls-card__title">{live.title}</span>
      <span className="cls-card__when">
        {open ? "Your teacher has opened the room" : when(live.starts_at)}
        {live.subject ? ` · ${live.subject}` : ""}
      </span>
    </Link>
  );
}

/**
 * "Today at 6:00 pm", by the clock in Kolkata rather than the server's.
 *
 * The same care the greeting on this page already takes. A child reading
 * "tomorrow" about a class that is tonight would simply not turn up.
 */
function when(at: Date): string {
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", ...o }).format(at);

  const day = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });
  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const time = fmt({ hour: "numeric", minute: "2-digit", hour12: true });

  if (day === today) return `Today at ${time}`;
  return `${fmt({ weekday: "long", day: "numeric", month: "long" })} at ${time}`;
}

import Link from "next/link";
import { ChevronRight, Radio, Video } from "lucide-react";
import { nextClassFor } from "@/lib/admin/classes";

/**
 * The next class, on Home. Redesign board 12, 1B.
 *
 * Renders nothing for a student in no batch — nearly all 9,652. It shows from
 * before the class until its length plus 30 minutes, so a child arriving late
 * still finds the door. "Join" appears only when the room is open; before that
 * the card says who opens it, which is the honest answer. A live class gets a
 * card and a breathing dot here — never a dot in the tab bar.
 */
export default async function NextClass({ uid }: { uid: string }) {
  const live = await nextClassFor(uid);
  if (!live) return null;

  const open = Boolean(live.started_at);

  return (
    <Link href={`/app/class/${live.id}`} className={`nc${open ? " nc--live" : ""}`}>
      <span className="nc__top">
        {open ? (
          <>
            <span className="nc__dot k-breathe" aria-hidden="true" /> Class is open now
          </>
        ) : (
          <>
            <Video size={14} aria-hidden="true" /> Next class
          </>
        )}
      </span>
      <span className="nc__title">{live.title}</span>
      <span className="nc__when">
        {live.subject ? `${live.subject} · ` : ""}
        {open ? `started ${time(live.started_at!)}` : when(live.starts_at)} · {live.minutes} min
      </span>
      {open ? (
        <span className="k-btn nc__join">
          <Radio size={18} aria-hidden="true" /> Join
        </span>
      ) : (
        <span className="nc__who">
          The room opens when your teacher opens it <ChevronRight size={14} aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

const fmt = (at: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", ...o }).format(at);

const time = (at: Date) => fmt(at, { hour: "numeric", minute: "2-digit", hour12: true });

/** "today 6:30 pm", by the clock in Kolkata rather than the server's. */
function when(at: Date): string {
  const day = fmt(at, { year: "numeric", month: "2-digit", day: "2-digit" });
  const today = fmt(new Date(), { year: "numeric", month: "2-digit", day: "2-digit" });
  if (day === today) return `today ${time(at)}`;
  return `${fmt(at, { weekday: "long" })} ${time(at)}`;
}

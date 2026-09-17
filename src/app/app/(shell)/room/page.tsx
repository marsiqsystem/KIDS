import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { roomFor, DOING_LABEL } from "@/lib/app/room";
import StudyHour from "@/components/app/StudyHour";
import { Head } from "@/components/app/kit";
import "../day.css";

/**
 * The room. Design 8k — presence without a ladder.
 *
 * One square per student on the programme, nobody named, **including the
 * student looking at it**: their own square is not marked either, so there is
 * nothing here to compare. The bars say what the room is doing, never who.
 *
 * Redesign board 12, 1E. The whole screen is counts and a button. One query.
 */
export const dynamic = "force-dynamic";

export default async function RoomPage() {
  const student = await requireStudent();
  const room = await roomFor(student.uid);
  if (!room) redirect("/app");

  /**
   * It never says a number lower than one.
   *
   * At twenty to six in the morning the honest answer is that this child is the
   * only one awake, and "0 of your batch are working right now" is a sentence
   * that empties a room rather than describing it. They are here; that is one.
   */
  const alone = room.present <= 1;

  return (
    <div className="room">
      <Head title="The room" back="/app" />

      <div className="room__count">
        <b>{alone ? 1 : room.present}</b>
        <span>of {room.total} are here now</span>
      </div>

      {/* One square each. Identical, unordered, unlabelled — yours included. */}
      <div className="room__grid" role="img" aria-label={`${room.present} of ${room.total} here`}>
        {Array.from({ length: room.total }, (_, i) => (
          <span key={i} className={`room__sq${i < Math.max(1, room.present) ? " room__sq--on" : ""}`} />
        ))}
      </div>
      <p className="k-line room__note">One square each. No order, no names — not even yours.</p>

      {room.doing.length > 0 ? (
        <section className="k-card">
          <div className="k-label">What the room is doing</div>
          <ul className="room__doing">
            {room.doing.map((d) => (
              <li key={d.doing}>
                <span>{DOING_LABEL[d.doing]}</span>
                <b>{d.n}</b>
              </li>
            ))}
          </ul>
          <p className="k-line">Counted when you looked. Open the room again to see it change.</p>
        </section>
      ) : null}

      <section className="k-card room__sit">
        <div className="k-label">Study hour</div>
        <p className="k-line">A silent hour with the room. Your square lights up; nothing else.</p>
        <StudyHour minutesLeft={room.sittingFor} />
      </section>
    </div>
  );
}

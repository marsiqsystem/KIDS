import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { roomFor, DOING_LABEL } from "@/lib/app/room";
import StudyHour from "@/components/app/StudyHour";
import "../day.css";

/**
 * The room. Design 8k — presence without a ladder.
 *
 * One square per student on the programme, nobody named, **including the
 * student looking at it**: their own square is not marked either, so there is
 * nothing here to compare. The bars say what the room is doing, never who.
 *
 * The whole screen is two counts and a button. It costs one query.
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
      <div className="room__head">
        <h1 className="app-h1">The room</h1>
        <Link href="/app" className="room__back">
          Back to the day
        </Link>
      </div>

      {alone ? (
        <p className="room__count room__count--alone">You are the first one here.</p>
      ) : (
        <p className="room__count">
          <b>{room.present}</b> of your batch are working right now
        </p>
      )}

      {/* One square each. Identical, unordered, and unlabelled — a lit square
          is a person present and nothing else about them is knowable. */}
      <div className="room__grid" role="img" aria-label={`${room.present} of ${room.total} here`}>
        {Array.from({ length: room.total }, (_, i) => (
          <span key={i} className={`room__sq${i < room.present ? " room__sq--on" : ""}`} />
        ))}
      </div>
      <p className="room__note">
        One square each, nobody named. Yours is not marked either.
      </p>

      {room.doing.length > 0 ? (
        <section className="room__doing">
          <h2>What the room is doing</h2>
          <ul>
            {room.doing.map((d) => (
              <li key={d.doing}>
                <span>{DOING_LABEL[d.doing]}</span>
                <span className="room__bar">
                  <span style={{ width: `${Math.round((d.n / room.present) * 100)}%` }} />
                </span>
                <b>{d.n}</b>
              </li>
            ))}
          </ul>
          <p className="room__note">What, never who.</p>
        </section>
      ) : null}

      <section className="room__sit">
        <h2>Sit down with them</h2>
        <p>
          A silent hour. No video, no chat, no names — your square lights up in the grid and that
          is all. The going matters more than what you do when you arrive.
        </p>
        <StudyHour minutesLeft={room.sittingFor} />
        <p className="room__note">
          Costs no data. The grid updates when you next open the app.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { canStudentJoin, noteTokenIssued, type JoinRefusal } from "@/lib/admin/classes";
import { liveConfigured, liveDomain, mintToken } from "@/lib/live/jitsi";
import JitsiRoom from "@/components/live/JitsiRoom";
import "../class.css";

export const dynamic = "force-dynamic";

/**
 * A student in the class.
 *
 * The token is minted on this server, for this child, for this room, and handed
 * straight to the embed. It is never in the URL. That is the property the whole
 * arrangement was chosen for: this page's address can be forwarded to the whole
 * of Class X and it admits nobody, because the address is not the access.
 *
 * Every refusal below is a sentence a fourteen-year-old can act on. "Not
 * started" is the common one and it is not an error — it is the answer to the
 * question they are actually asking, which is whether to keep waiting.
 */
export default async function StudentClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await requireStudent();

  const verdict = await canStudentJoin(id, student.uid);

  if (!verdict.ok) return <Refused why={verdict.why} />;
  const live = verdict.live;

  if (!liveConfigured()) {
    return (
      <Waiting title={live.title}>
        <p>
          The class cannot be opened from this app yet. Nothing is wrong at your end — tell your
          teacher, and they will sort it out.
        </p>
      </Waiting>
    );
  }

  const token = mintToken(live.room, {
    id: student.uid,
    // Their own name, so the teacher's participant list reads like a register
    // rather than a row of handset names.
    name: student.name,
    moderator: false,
  });
  await noteTokenIssued(live.id, { uid: student.uid, moderator: false });

  return (
    <div className="cls-live">
      <div className="cls-live__head">
        <span className="cls-live__dot" aria-hidden />
        <span className="cls-live__title">{live.title}</span>
        {live.subject ? <span className="cls-live__sub">{live.subject}</span> : null}
      </div>
      <div className="cls-live__frame">
        <JitsiRoom
          domain={liveDomain()}
          room={live.room}
          jwt={token}
          displayName={student.name}
          moderator={false}
          onLeave="/app"
        />
      </div>
      <p className="cls-live__note">
        You join muted, with your camera off. Raise your hand and your teacher will let you speak.
      </p>
    </div>
  );
}

function Refused({ why }: { why: JoinRefusal }) {
  const said: Record<JoinRefusal, { head: string; body: string }> = {
    "not-found": {
      head: "There is no such class",
      body: "This link does not point at anything. Check with your teacher.",
    },
    cancelled: {
      head: "This class was cancelled",
      body: "Your teacher called it off. Watch the app for the next one.",
    },
    "not-started": {
      head: "Not started yet",
      body:
        "Your teacher has not opened the room. Nobody can go in before they do — including them. Come back in a few minutes.",
    },
    ended: {
      head: "This class has finished",
      body: "If it was recorded, the link will appear here once your teacher posts it.",
    },
    "not-in-batch": {
      head: "This is not your class",
      body: "You are not in the batch this class was set for. If that looks wrong, tell the office.",
    },
  };

  const { head, body } = said[why];

  return (
    <Waiting title={head}>
      <p>{body}</p>
    </Waiting>
  );
}

function Waiting({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cls-wait">
      <h1 className="app-h1">{title}</h1>
      <div className="cls-wait__body">{children}</div>
      <Link href="/app" className="app-btn">
        Back to home
      </Link>
    </div>
  );
}

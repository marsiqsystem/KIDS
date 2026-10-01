import Link from "next/link";
import { CalendarX, CircleCheck, Hourglass, Unlink, Users, Wrench } from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { canStudentJoin, findClass, noteTokenIssued, type JoinRefusal } from "@/lib/admin/classes";
import { recordingsForClass } from "@/lib/admin/recordings";
import { drivePlayerUrl } from "@/lib/drive";
import { liveConfigured, liveDomain, mintToken } from "@/lib/live/jitsi";
import JitsiRoom from "@/components/live/JitsiRoom";
import { Head } from "@/components/app/kit";
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

  // A finished class is where its recording lives. canStudentJoin has already
  // checked this child is in the batch: "ended" is only ever said to a member.
  if (!verdict.ok && verdict.why === "ended") return <Recorded classId={id} />;
  if (!verdict.ok) return <Refused why={verdict.why} />;
  const live = verdict.live;

  if (!liveConfigured()) {
    return (
      <Waiting title={live.title}>
        <p>This is ours to fix, not yours. Tell your teacher.</p>
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
        You join muted. Raise your hand; when your teacher allows it, tap your own mic.
      </p>
    </div>
  );
}

/**
 * A class that has finished: its recording, played by Google's own player
 * straight from the KIDS Drive (Umar's ruling, 2 Oct 2026 — a 90-minute video
 * through our own server would cost ~80 GB a class).
 *
 * A recorder that restarted mid-lesson leaves two parts; both are shown, in
 * order. Nothing yet usually means the upload is still running — a long class
 * takes a while to reach Drive, and Google then needs time before it will play.
 */
async function Recorded({ classId }: { classId: string }) {
  const [live, parts] = await Promise.all([findClass(classId), recordingsForClass(classId)]);
  if (!live) return <Refused why="not-found" />;

  const when = new Date(live.starts_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="cls-rec">
      <Head title={live.title} back="/app/recordings" />
      <p className="cls-rec__when">
        {live.subject ? `${live.subject} · ` : ""}
        {when}
      </p>

      {parts.length === 0 ? (
        <div className="k-card k-card--dashed cls-rec__none">
          <p>
            No recording yet. A class reaches here within an hour or so of finishing — come back
            later.
          </p>
        </div>
      ) : (
        parts.map((r, i) => (
          <section key={r.id} className="cls-rec__part">
            {parts.length > 1 ? <div className="k-label">Part {i + 1}</div> : null}
            <div className="cls-rec__player">
              <iframe
                src={drivePlayerUrl(r.drive_id)}
                title={parts.length > 1 ? `${live.title}, part ${i + 1}` : live.title}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </section>
        ))
      )}

      {parts.length > 0 ? (
        <p className="cls-rec__note">
          If it says the video is still being processed, Google is preparing it. Try again in a
          little while.
        </p>
      ) : null}
    </div>
  );
}

function Refused({ why }: { why: JoinRefusal }) {
  const said: Record<JoinRefusal, { head: string; body: string; icon: React.ReactNode }> = {
    "not-found": {
      head: "This class is gone",
      body: "Your classes are always on your day. Go through Home.",
      icon: <Unlink size={22} />,
    },
    cancelled: {
      head: "This class was cancelled",
      body: "Nothing is expected of you for it.",
      icon: <CalendarX size={22} />,
    },
    "not-started": {
      head: "Not started yet",
      body: "The room opens when your teacher opens it. Keep waiting.",
      icon: <Hourglass size={22} />,
    },
    ended: {
      head: "This class has finished",
      body: "If it was recorded, it appears here once your teacher posts it.",
      icon: <CircleCheck size={22} />,
    },
    "not-in-batch": {
      head: "This class is not yours",
      body: "It belongs to another batch. You have not done anything wrong.",
      icon: <Users size={22} />,
    },
  };

  const { head, body, icon } = said[why];

  return (
    <Waiting title={head} icon={icon}>
      <p>{body}</p>
    </Waiting>
  );
}

function Waiting({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="cls-wait">
      <span className="cls-wait__icon" aria-hidden="true">
        {icon ?? <Wrench size={22} />}
      </span>
      <h1 className="cls-wait__title">{title}</h1>
      <div className="cls-wait__body">{children}</div>
      <Link href="/app" className="k-btn">
        Back to your day
      </Link>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentStaff } from "@/lib/admin/session";
import { findClass, noteTokenIssued, teachesBatch } from "@/lib/admin/classes";
import { liveConfigured, liveDomain, mintToken } from "@/lib/live/jitsi";
import JitsiRoom from "@/components/live/JitsiRoom";

export const dynamic = "force-dynamic";

/**
 * The teacher in their own room.
 *
 * The moderator token is minted here, on the server, and handed to the embed.
 * It is never a query parameter and never reaches a link, because a URL is the
 * one thing a person copies and forwards without thinking.
 */
export default async function TeacherRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await currentStaff();
  if (!staff) redirect("/admin");

  const live = await findClass(id);
  if (!live) notFound();

  if (staff.role !== "admin" && !(await teachesBatch(staff.staff_id, live.batch_id))) {
    redirect("/admin?tab=classes");
  }

  if (!liveConfigured()) {
    return (
      <Shell title={live.title}>
        <p className="text-sm text-[#d98b8b]">
          The live class server is not configured on this deployment, so no room can be opened.
          Set <code>KIDS_JITSI_DOMAIN</code> and <code>KIDS_JITSI_SECRET</code>, then come back.
        </p>
        <p className="mt-3 text-xs text-[#6b5c57]">
          The checklist for standing that server up is in{" "}
          <code>docs/live-class-server.md</code>.
        </p>
      </Shell>
    );
  }

  if (live.cancelled_at) {
    return (
      <Shell title={live.title}>
        <p className="text-sm text-[#d98b8b]">This class was cancelled.</p>
      </Shell>
    );
  }

  /**
   * Opening this page does not open the class.
   *
   * A teacher may want to look at the room before they are ready — check their
   * microphone, or read the register from the last one. Starting is a button on
   * the console, and it is the only thing that lets a student in.
   */
  if (!live.started_at) {
    return (
      <Shell title={live.title}>
        <p className="text-sm text-[#c9b8b2]">
          This class has not been started yet, so nobody can join it — including you.
        </p>
        <p className="mt-2 text-xs text-[#6b5c57]">
          Go back to Classes and press <strong>Open the room</strong>. Students can join from the
          moment you do, and not before.
        </p>
      </Shell>
    );
  }

  const token = mintToken(live.room, {
    id: staff.staff_id,
    name: staff.full_name,
    moderator: true,
  });
  await noteTokenIssued(live.id, { staffId: staff.staff_id, moderator: true });

  return (
    <main className="flex h-screen flex-col bg-[#141010] text-[#e8e0dc]">
      <header className="flex shrink-0 items-center gap-4 border-b border-[#2a2321] px-5 py-3">
        <Link href="/admin?tab=classes" className="text-[#8a6f66]" aria-label="Back to classes">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-bold">{live.title}</h1>
        <span className="text-xs text-[#6b5c57]">
          {live.batch_name}
          {live.subject ? ` · ${live.subject}` : ""} · {live.attended} joined
        </span>
      </header>

      <div className="min-h-0 grow">
        <JitsiRoom
          domain={liveDomain()}
          room={live.room}
          jwt={token}
          displayName={staff.full_name}
          moderator
          onLeave="/admin?tab=classes"
        />
      </div>
    </main>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#141010] px-6 py-12 text-[#e8e0dc]">
      <div className="mx-auto max-w-md rounded-lg border border-[#2a2321] bg-[#1a1514] p-6">
        <h1 className="mb-4 text-sm font-bold">{title}</h1>
        {children}
        <Link
          href="/admin?tab=classes"
          className="mt-5 inline-block text-sm font-semibold text-[#8fbfae] underline"
        >
          Back to classes
        </Link>
      </div>
    </main>
  );
}

import { headers } from "next/headers";
import TabBar from "@/components/app/TabBar";
import UpdateNotice from "@/components/app/UpdateNotice";
import PushRegistrar from "@/components/app/PushRegistrar";
import { requireStudent } from "@/lib/app/gate";
import { appVersion, apkUrl } from "@/lib/app/app-version";
import { pushConfigured } from "@/lib/app/push";
import { touchPresence } from "@/lib/app/room";
import { programmeFor } from "@/lib/app/day";
import { windowFor, phaseOf } from "@/lib/exam/schedule";

/**
 * Everything behind the front door: the five tabs, and the gate in front of them.
 *
 * The gate is here rather than in a proxy (what Next 16 calls what used to be
 * middleware). The docs are explicit that a proxy is for optimistic checks and
 * not for session management or authorization, and a layout that already has to
 * run on every request is the cheapest honest place to do the real check.
 *
 * The update card lives here for the same reason: this is the one component on
 * the student's side of the door that renders on every tab, and reading one
 * request header costs nothing next to the gate that already ran.
 */
export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const student = await requireStudent();

  // The gold dot, driven by the real exam schedule rather than a flag. For 364
  // days a year this is false, which is the design's whole point about the tab.
  const window = windowFor(student);
  const examLive = window ? phaseOf(window) === "scanning" || phaseOf(window) === "live" : false;

  /**
   * Say this student is in the room — Design 8k.
   *
   * Here rather than on a timer or a socket: presence is POLLED when the app
   * opens, which is what 3G and a battery at 12% can afford. One upsert, and
   * only for the 65 — the programme lookup is the same one Home already does,
   * and for 9,649 students both are a single indexed miss.
   *
   * Never awaited into the render path in a way that could fail it. A room
   * that did not update is not a reason for a child to see an error.
   */
  if (await programmeFor(student.uid)) {
    void touchPresence(student.uid).catch(() => {});
  }

  // Only ever true inside the Android app. A browser is never told to update.
  const version = appVersion((await headers()).get("user-agent"));

  return (
    <div className="app-frame">
      <div className="app-shell">
        {/* Renders nothing, and does nothing at all until there is a Firebase
            project to talk to — the server is the only side that knows. */}
        <PushRegistrar enabled={pushConfigured()} />
        <div className="app-shell__body">
          {version.stale ? (
            <UpdateNotice expected={version.expected} note={version.note} href={apkUrl()} />
          ) : null}
          {children}
        </div>
        <TabBar examLive={examLive} />
      </div>
    </div>
  );
}

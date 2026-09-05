import TabBar from "@/components/app/TabBar";
import { requireStudent } from "@/lib/app/gate";
import { windowFor, phaseOf } from "@/lib/exam/schedule";

/**
 * Everything behind the front door: the five tabs, and the gate in front of them.
 *
 * The gate is here rather than in a proxy (what Next 16 calls what used to be
 * middleware). The docs are explicit that a proxy is for optimistic checks and
 * not for session management or authorization, and a layout that already has to
 * run on every request is the cheapest honest place to do the real check.
 */
export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const student = await requireStudent();

  // The gold dot, driven by the real exam schedule rather than a flag. For 364
  // days a year this is false, which is the design's whole point about the tab.
  const window = windowFor(student);
  const examLive = window ? phaseOf(window) === "scanning" || phaseOf(window) === "live" : false;

  return (
    <div className="app-frame">
      <div className="app-shell">
        <div className="app-shell__body">{children}</div>
        <TabBar examLive={examLive} />
      </div>
    </div>
  );
}

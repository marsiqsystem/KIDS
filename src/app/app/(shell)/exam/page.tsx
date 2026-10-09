import { requireStudent } from "@/lib/app/gate";
import { examTabFor } from "@/lib/exam/exam-tab";
import LiveExam from "@/components/portal/LiveExam";
import CheckIn from "@/components/app/CheckIn";
import { Empty, Head } from "@/components/app/kit";
import {
  CentreCard,
  ClosedNote,
  FourRules,
  OpensIn,
  PaperHero,
  PapersSat,
  Receipt,
} from "@/components/app/exam/ExamFaces";

export const dynamic = "force-dynamic";

const ist = (d: Date | string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts });

/**
 * The Exam tab. Redesign board 04 — permanent, and most days it is calm.
 *
 * On an exam morning it is the whole flow. Which face shows is decided by
 * examTabFor (src/lib/exam/exam-tab.ts) from the paper's own row, never from
 * the phone's clock — the same decision the native app's Exam tab reads.
 */
export default async function ExamPage() {
  const student = await requireStudent();
  const tab = await examTabFor(student);

  if (tab.face === "none") {
    return (
      <>
        <Head title="Exam" />
        <div className="k-card k-card--dashed">
          <Empty title="No exam right now" line="Your next paper will show here." />
        </div>
        <PapersSat rows={tab.received} />
      </>
    );
  }

  if (tab.face === "closed") {
    return (
      <>
        <Head title="Exam" />
        {tab.over ? <ClosedNote started={Boolean(tab.handedIn)} /> : null}
        {tab.handedIn ? <Receipt {...tab.handedIn} /> : null}
        <PapersSat rows={tab.received} />
      </>
    );
  }

  if (tab.face === "before") {
    return (
      <>
        <PaperHero name={tab.paper} startsAt={tab.startsAt} minutes={tab.minutes} />
        <OpensIn at={tab.startsAt} serverNowIso={tab.serverNow} />
        <CentreCard name={tab.centre} />
        <FourRules />
        {tab.requiresCheckin ? (
          <button type="button" className="k-btn" disabled>
            Check-in opens {ist(tab.opensAt, { hour: "numeric", minute: "2-digit" })}
          </button>
        ) : null}
        <PapersSat rows={tab.received} />
      </>
    );
  }

  if (tab.face === "checkin") return <CheckIn centreName={tab.centre} />;

  // Checked in (or no check-in needed). The runner takes over: its own waiting
  // room until the paper opens, then the paper.
  return (
    <LiveExam
      variant="app"
      uid={tab.uid}
      token=""
      api="/api/app/exam"
      paperKey={tab.paperKey}
      label={tab.label}
      name={tab.name}
      classLabel={tab.classLabel}
      centreCode={tab.centreCode}
      centreName={tab.centre}
      questionCount={tab.questionCount}
      durationMinutes={tab.durationMinutes}
      windowClosesIso={tab.closesAt}
      startsAtIso={tab.startsAt}
      serverNowIso={tab.serverNow}
    />
  );
}

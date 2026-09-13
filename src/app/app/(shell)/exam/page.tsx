import { requireStudent } from "@/lib/app/gate";
import { windowFor, phaseOf } from "@/lib/exam/schedule";

/**
 * The Exam tab. Permanent, and for 364 days a year it says nothing is open.
 *
 * The phase comes from the real schedule (src/lib/exam/schedule.ts), which is
 * the same one the July paper ran on, so this screen cannot drift out of step
 * with the exam itself.
 */
export default async function ExamPage() {
  const student = await requireStudent();
  const window = await windowFor(student);
  const phase = window ? phaseOf(window) : null;

  return (
    <>
      <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, lineHeight: 1.2 }}>
        Exam
      </h1>

      <div className="app-soon">
        <h2>{phase === "over" || phase === null ? "No paper is open" : "A paper is open"}</h2>
        <p>
          {phase === "over"
            ? "SET 2026 was sat on 19 July. When the next paper is scheduled, it appears here — and this tab grows a gold dot the moment it does."
            : "Your admit card, the centre PIN and the paper itself will be here."}
        </p>
      </div>
    </>
  );
}

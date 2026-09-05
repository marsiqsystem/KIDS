import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { loopState, playCards } from "@/lib/app/loop";
import QuestionPlayer from "@/components/app/QuestionPlayer";

/**
 * The set, being played.
 *
 * Outside the (shell) group on purpose: the five-tab bar does not belong under
 * a question. The only way out is the back chevron, and leaving is safe —
 * everything answered is already written down.
 */
export const dynamic = "force-dynamic";

export default async function SetPage() {
  const student = await requireStudent();
  const state = await loopState(student);

  if (state.needsSubjects) redirect("/app/subjects");
  if (!state.set) redirect("/app");
  if (state.set.answered >= state.set.questionIds.length) redirect("/app/set/summary");

  const cards = await playCards(student, state.set.questionIds);

  return (
    <div className="app-frame">
      {/* Resume where they left off: design 3g's "two of five answered on 30
          August" — the three not reached are still unseen. */}
      <QuestionPlayer cards={cards} startAt={state.set.answered} />
    </div>
  );
}

import { requireStudent } from "@/lib/app/gate";
import { practiceLine } from "@/lib/app/record";
import { resultViewProps } from "@/lib/exam/result-page";
import ResultView from "@/components/portal/result/ResultView";
import LaterResults from "@/components/portal/result/LaterResults";
import { awardFor, laterResultsFor } from "@/lib/exam/later-results";
import PracticeStrip from "@/components/app/PracticeStrip";
import { Head } from "@/components/app/kit";
import "@/app/portal/portal.css";
import "../../record.css";

/**
 * My Record.
 *
 * This screen used to be its own summary of the two papers — cards, section
 * bars, an OMR replica — written against design 5a. It is now the SAME
 * `<ResultView>` the portal shows a student who scans their admit card, and
 * that is the point: there is one result page, and the app is a way into it
 * rather than a second opinion about it.
 *
 * That component already carries everything the summary was working towards and
 * a good deal it never reached — both papers side by side, the full marksheet
 * for either, every question with the cohort's difficulty against it, the OMR
 * sheet, and the "learn it" cards with a video and a playable activity behind
 * each weak chapter. Keeping a parallel, thinner version of all that in the app
 * only guaranteed the two would drift.
 *
 * Two things are kept from the old screen, because the portal has no idea they
 * exist: the practice line from the daily loop, and the app shell around it —
 * the five tabs stay, so this is a tab and not a departure.
 *
 * The wrapper is `.portal` on purpose. Every token ResultView paints with is
 * scoped to that class in portal.css; without it the component renders with the
 * app's palette resolving to nothing.
 */
export const dynamic = "force-dynamic";

export default async function RecordPage() {
  const student = await requireStudent();
  const [result, practice, later, award] = await Promise.all([
    resultViewProps(student),
    practiceLine(student.uid),
    laterResultsFor(student),
    awardFor(student),
  ]);

  return (
    <div className="rec-portal">
      <div className="rec-portal__head">
        <Head title="Record" />
      </div>
      {/* Bleeds past the shell's padding: ResultView is a full-width card with
          its own internal spacing, and sitting it inside the app's body gutter
          would give it two. */}
      <div className="portal rec-portal__view">
        {/* Phase 2, mocks and the award, above July. Renders nothing until
            something after July is published. */}
        <LaterResults results={later} award={award} />
        <ResultView {...result} surface="app" />
      </div>

      <PracticeStrip practice={practice} />
    </div>
  );
}

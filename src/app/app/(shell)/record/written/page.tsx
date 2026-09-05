import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { writtenPaper } from "@/lib/app/record";
import { reviewQuestions } from "@/lib/exam/offline-review";
import AnswerSheet, { type SheetRow, type SheetBand } from "@/components/app/AnswerSheet";
import "../../../record.css";

/**
 * The written paper, question by question — design 5d.
 *
 * The gate is asked again here rather than trusted from the record home. A URL
 * is typed, shared and bookmarked; a page that renders a marked paper because
 * another page checked a minute ago is a page that renders it for a school that
 * has since been withheld.
 *
 * Only the sheet is sent to the browser — the stems, the options, what was
 * marked and what the key wanted. The explanations stay on the server until a
 * student taps a question. See src/app/app/record-actions.ts.
 */
export const dynamic = "force-dynamic";

export default async function WrittenPage() {
  const student = await requireStudent();
  const paper = await writtenPaper(student);

  if (paper.state !== "ready" || !paper.sheet) {
    return (
      <>
        <h1 className="app-h1">Your answer sheet</h1>
        <div className="app-soon">
          <h2>{paper.state === "absent" ? "No written paper on file" : "Not published yet"}</h2>
          <p>
            {paper.state === "absent"
              ? "You did not sit the written paper on 19 July, so there is no sheet to show. This is not a zero and it is not counted against you anywhere."
              : "The written paper is still being assessed. Your record will show it the day it is published."}
          </p>
          <Link href="/app/record" className="app-btn app-btn--outline app-btn--small">
            Back to my record
          </Link>
        </div>
      </>
    );
  }

  const sheet = paper.sheet;
  // The written paper differs by medium in 30 places; show this student theirs.
  const reviewed = reviewQuestions(sheet, student.medium);

  const rows: SheetRow[] = reviewed.map((q) => ({
    n: q.n,
    section: q.section,
    status: q.status,
    marked: q.marked,
    second: q.second,
    key: q.key,
    stem: q.stem,
    options: q.options,
  }));

  const bands: SheetBand[] = sheet.sections.map((s) => ({
    name: s.name,
    first: s.first,
    last: s.last,
    marks: s.marks,
    total: s.total,
  }));

  return (
    <>
      <Link href="/app/record" className="sheet-back">
        ← My record
      </Link>
      <AnswerSheet
        rows={rows}
        bands={bands}
        marks={sheet.marks}
        total={sheet.total}
        correct={sheet.correct}
        wrong={sheet.wrong}
        blank={sheet.blank}
        grace={sheet.grace}
        doubles={sheet.doubles}
      />
    </>
  );
}

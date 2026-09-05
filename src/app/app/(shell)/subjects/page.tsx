import { requireStudent } from "@/lib/app/gate";
import { offerSections, chosenSections, NEW_PER_DAY, answersFor } from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import SubjectChooser from "@/components/app/SubjectChooser";
import NoStream from "@/components/app/NoStream";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const student = await requireStudent();

  // XI/XII without a stream cannot be offered subjects — see NoStream.
  if ((student.class === "XI" || student.class === "XII") && !student.stream) {
    return <NoStream cls={student.class} />;
  }

  const sections = offerSections(student);
  const [chosen, answers] = await Promise.all([
    chosenSections(student.uid),
    answersFor(student.uid),
  ]);

  // How much NEW material each subject would bring this particular student.
  // A returning student who has already done half of Geography should be told
  // what adding it back is really worth, not its raw size.
  const unseenBySection: Record<string, number> = {};
  for (const s of sections) {
    const pool = poolFor(student.class, student.stream, student.medium, [s.section]);
    unseenBySection[s.section] = pool.filter((id) => !answers.has(id)).length;
  }

  return (
    <>
      <div>
        <span className="app-eyebrow">
          Class {student.class}
          {student.stream ? ` · ${student.stream}` : ""}
        </span>
        <h1 className="app-h1">What do you want to practise?</h1>
        <p className="app-lede">
          Choose what you want in your daily set. You can change this any day — nothing you have
          already done is lost.
        </p>
      </div>

      {(student.class === "XI" || student.class === "XII") && (
        // XI and XII answer FOUR blocks, not five: English & General Knowledge
        // is one combined section of 25, plus three subjects of their own. The
        // design says five; the question bank and every marksheet say four.
        <p className="app-hint">
          English &amp; General Knowledge is one combined section that everybody sits, plus the three
          subjects you chose. That is how SET marks Class {student.class} — the same four sections
          appear on your record.
        </p>
      )}

      <SubjectChooser
        sections={sections}
        chosen={chosen}
        perDay={NEW_PER_DAY}
        unseenBySection={unseenBySection}
      />
    </>
  );
}

import { requireStudent } from "@/lib/app/gate";
import { offerSections, chosenSections, NEW_PER_DAY, answersFor } from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import SubjectChooser from "@/components/app/SubjectChooser";
import NoStream from "@/components/app/NoStream";
import { Head } from "@/components/app/kit";

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
      <Head title="My subjects" back="/app" aside={`${chosen.length} / ${sections.length}`} />

      {(student.class === "XI" || student.class === "XII") && (
        // XI and XII answer four blocks: English & General Knowledge, which
        // everybody sits, plus three subjects of their stream.
        <p className="k-line">English &amp; GK is one section everyone sits.</p>
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

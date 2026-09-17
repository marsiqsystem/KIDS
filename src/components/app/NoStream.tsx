import Link from "next/link";
import { Empty } from "@/components/app/kit";

/**
 * Class XI or XII with no stream on the register.
 *
 * 15 children (8 in XI, 7 in XII). Without a stream we cannot tell which three
 * subjects they sat, so the bank offers them only English & General Knowledge —
 * one section of 25. Showing them that as if it were their whole syllabus would
 * be a quiet lie, so the app says what is missing instead.
 *
 * Not a question the student answers here. Stream is record data — it decided
 * which paper they were handed in July — and a correction goes to the office,
 * exactly as a misspelt school or a wrong medium does.
 */
export default function NoStream({ cls }: { cls: string }) {
  return (
    <div className="k-card k-card--dashed">
      <Empty title="Your stream is missing" line={`Class ${cls} needs a stream. Tell the KIDS office.`}>
        <Link href="/app/reset" className="k-btn k-btn--outline k-btn--small">
          Contact the office
        </Link>
      </Empty>
    </div>
  );
}

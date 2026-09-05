import Link from "next/link";

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
    <div className="app-soon">
      <h2>We do not hold your stream</h2>
      <p>
        Your record says Class {cls}, but not whether you are in Arts, Commerce or Science. That is
        what decides which three subjects are yours, so we cannot build your practice without it.
      </p>
      <p>
        The KIDS office can add it to your record. Tell them your User ID and your stream, and this
        page will work the next time you open it.
      </p>
      <Link href="/app/reset" className="app-btn app-btn--outline">
        How to reach the office
      </Link>
    </div>
  );
}

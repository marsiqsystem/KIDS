import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { listSchools } from "@/lib/app/registrations";
import { correctionsFor, FIELD_LABEL } from "@/lib/app/corrections";
import DetailsForm from "@/components/app/DetailsForm";
import "../../../profile.css";

export const dynamic = "force-dynamic";

/**
 * "My details are wrong."
 *
 * The row on Profile that was drawn and dimmed until this existed. It covers
 * what is written about the child -- name, date of birth, class, stream, school
 * -- and deliberately NOT their marks: a disputed mark is a question about a
 * paper, answered by looking at the sheet, and it still goes to the office by
 * phone or email, which this screen says.
 */
export default async function DetailsPage() {
  const student = await requireStudent();
  const [schools, asked] = await Promise.all([listSchools(), correctionsFor(student.uid)]);

  const pending = asked.filter((c) => c.status === "pending");
  const decided = asked.filter((c) => c.status !== "pending");

  return (
    <>
      <div>
        <Link href="/app/profile" className="app-btn app-btn--quiet" style={{ width: "auto", justifyContent: "flex-start", padding: 0 }}>
          ← Profile
        </Link>
        <h1 className="app-h1">My details are wrong</h1>
        <p className="app-sub">
          Change what is wrong below and send it. The KIDS office checks it, and your record changes
          when they agree.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="app-card app-card--cream">
          <h3>Waiting for the office</h3>
          <dl className="app-kv">
            {pending.map((c) => (
              <div key={c.id} style={{ display: "contents" }}>
                <dt>{FIELD_LABEL[c.field]}</dt>
                <dd>{c.field === "school" ? "A different school" : c.new_value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {decided.length > 0 && (
        <div className="app-card">
          <h3>Answered</h3>
          <dl className="app-kv">
            {decided.map((c) => (
              <div key={c.id} style={{ display: "contents" }}>
                <dt>{FIELD_LABEL[c.field]}</dt>
                <dd>
                  {c.status === "approved"
                    ? "Changed"
                    : `Not changed${c.reason ? ` — ${c.reason}` : ""}`}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <DetailsForm
        current={{
          name: student.name,
          dob: student.dob,
          class: student.class,
          stream: student.stream,
          centre_code: student.centre_code,
          school_code: student.school_code,
        }}
        schools={schools}
      />

      <div className="app-card">
        <h3>A mark looks wrong?</h3>
        <p>
          That is not a detail on your record, it is a question about your paper — the office has to
          look at the sheet itself. Write to{" "}
          <a className="app-contact" href="mailto:kids.kol.org2003@gmail.com">kids.kol.org2003@gmail.com</a>{" "}
          with your User ID.
        </p>
      </div>
    </>
  );
}

import { requireStudent } from "@/lib/app/gate";
import { listSchools } from "@/lib/app/registrations";
import { correctionsFor, FIELD_LABEL } from "@/lib/app/corrections";
import DetailsForm from "@/components/app/DetailsForm";
import { Head } from "@/components/app/kit";
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
      <Head title="Ask to change" back="/app/profile" />
      <p className="k-line">A person at KIDS checks every change first.</p>

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

      {asked.length > 0 ? (
        <div className="k-card">
          <div className="k-label">Your requests</div>
          <ul className="dt-asked">
            {[...pending, ...decided].map((c) => (
              <li key={c.id}>
                <span className="dt-asked__what">
                  {FIELD_LABEL[c.field]}
                  {c.status === "rejected" && c.reason ? <span>&ldquo;{c.reason}&rdquo;</span> : null}
                </span>
                <span
                  className={`k-chip ${
                    c.status === "pending" ? "k-chip--line" : c.status === "approved" ? "k-chip--teal" : "k-chip--grey"
                  }`}
                >
                  {c.status === "pending" ? "With the KIDS office" : c.status === "approved" ? "Approved" : "Not accepted"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="k-line dt-marks">
        A mark looks wrong? Marks are not changed here — call or email the office.
      </p>
    </>
  );
}

"use client";

import { useActionState, useState } from "react";
import { requestCorrectionsAction, type CorrectionState } from "@/app/app/actions";
import type { School } from "@/lib/app/registrations";

/**
 * The student's details, filled in from the register, to be edited where wrong.
 *
 * Pre-filled rather than blank because the question a child is answering is
 * "which of these is wrong", not "type your details again" -- and a blank form
 * invites them to retype a correct name slightly differently, which the office
 * would then have to query.
 */
export default function DetailsForm({
  current,
  schools,
}: {
  current: {
    name: string;
    dob: string | null;
    class: string;
    stream: string | null;
    centre_code: string;
    school_code: string;
  };
  schools: School[];
}) {
  const [state, action, pending] = useActionState<CorrectionState, FormData>(
    requestCorrectionsAction,
    {},
  );
  const [cls, setCls] = useState(current.class);
  const [d, m, y] = (current.dob ?? "").split("-");

  const byCentre = new Map<string, School[]>();
  for (const s of schools) byCentre.set(s.centre_name, [...(byCentre.get(s.centre_name) ?? []), s]);

  if (state.ok) {
    return (
      <div className="app-card app-card--cream" role="status">
        <h3>Sent to the KIDS office</h3>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="app-body" style={{ padding: 0 }}>
      <div className="app-field">
        <label className="app-label" htmlFor="name">Name</label>
        <input id="name" name="name" className="app-input" defaultValue={current.name} autoCapitalize="words" />
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="dobDay">Date of birth</label>
        <div className="app-dob">
          <input id="dobDay" name="dobDay" className="app-input" inputMode="numeric" maxLength={2} placeholder="DD" defaultValue={d ?? ""} aria-label="Day" />
          <input name="dobMonth" className="app-input" inputMode="numeric" maxLength={2} placeholder="MM" defaultValue={m ?? ""} aria-label="Month" />
          <input name="dobYear" className="app-input app-input--year" inputMode="numeric" maxLength={4} placeholder="YYYY" defaultValue={y ?? ""} aria-label="Year" />
        </div>
        {!current.dob && (
          <span className="app-hint">
            We do not hold your date of birth. Adding it here, once the office checks it, lets you
            claim or recover your account by yourself.
          </span>
        )}
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="class">Class</label>
        <select id="class" name="class" className="app-input app-select" value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="IX">Class IX</option>
          <option value="X">Class X</option>
          <option value="XI">Class XI</option>
          <option value="XII">Class XII</option>
        </select>
      </div>

      {(cls === "XI" || cls === "XII") && (
        <div className="app-field">
          <label className="app-label" htmlFor="stream">Stream</label>
          <select id="stream" name="stream" className="app-input app-select" defaultValue={current.stream ?? ""}>
            <option value="">Choose…</option>
            <option value="Science">Science</option>
            <option value="Commerce">Commerce</option>
            <option value="Arts">Arts</option>
          </select>
        </div>
      )}

      <div className="app-field">
        <label className="app-label" htmlFor="school">School</label>
        <select
          id="school"
          name="school"
          className="app-input app-select"
          defaultValue={`${current.centre_code}|${current.school_code}`}
        >
          {[...byCentre.entries()].map(([centre, list]) => (
            <optgroup key={centre} label={centre}>
              {list.map((s) => (
                <option key={`${s.centre_code}|${s.school_code}`} value={`${s.centre_code}|${s.school_code}`}>
                  {s.school_name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="app-hint">Your User ID stays the same if your school changes.</span>
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="note">Anything the office should know · optional</label>
        <textarea id="note" name="note" className="app-input" rows={3} maxLength={300} style={{ paddingBlock: 12 }} />
      </div>

      {state.message && (
        <div className="app-card" role="alert">
          <p style={{ margin: 0 }}>{state.message}</p>
        </div>
      )}

      <button type="submit" className="app-btn" disabled={pending}>
        {pending ? "Sending…" : "Send to the office"}
      </button>
    </form>
  );
}

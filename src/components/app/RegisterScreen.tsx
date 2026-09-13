"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import DeviceField, { readOrCreateDeviceId } from "./DeviceField";
import {
  registerAction,
  registrationStatusAction,
  finishRegistrationAction,
  type RegisterState,
  type FormState,
} from "@/app/app/actions";
import type { School } from "@/lib/app/registrations";
import type { PendingApplication } from "@/lib/app/registrations";

/**
 * "I am new to KIDS."
 *
 * One route with four faces, because to the family it is one thing -- "where is
 * my registration up to" -- and making them remember which page to come back to
 * would be our problem leaking into their evening.
 *
 *   nothing     the form
 *   pending     we have it, nobody has looked yet
 *   approved    here is your User ID; choose a password and you are in
 *   rejected    what the office said, and the way to try again
 *
 * The state is keyed on the installation id, not on a login, because there is
 * no account to log into until the last of those four. That is the whole
 * argument for registering inside the app rather than on a web form: the phone
 * that applied is the phone that gets let in, with nothing to remember in
 * between.
 */
export default function RegisterScreen({ schools }: { schools: School[] }) {
  const [application, setApplication] = useState<PendingApplication | null>(null);

  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {});
  const [cls, setCls] = useState("");

  // In an effect, not during render: localStorage is not there on the server,
  // and this page is server-rendered like every other one in the app. The id
  // itself is never held in state -- DeviceField puts it in the form, and the
  // only thing this component needs it for is the question it asks once.
  useEffect(() => {
    registrationStatusAction(readOrCreateDeviceId())
      .then(setApplication)
      .catch(() => {});
  }, []);

  // Re-ask after a successful submission, so the screen becomes the waiting
  // screen without the family wondering whether the tap did anything.
  useEffect(() => {
    if (!state.ok) return;
    registrationStatusAction(readOrCreateDeviceId())
      .then(setApplication)
      .catch(() => {});
  }, [state.ok]);

  /**
   * The form is the first paint, not a spinner.
   *
   * Whether this phone has already applied can only be answered after
   * localStorage has been read and the server asked, and making everybody watch
   * "Checking…" for that round trip would be charging every new family for the
   * rare returning one. Almost everyone who opens this screen is here to fill it
   * in, so it renders filled-in-able immediately and swaps to the waiting or
   * approved face if it turns out there is an application behind it.
   */
  if (application?.status === "approved" && application.uid) {
    return <Approved application={application} />;
  }
  if (application?.status === "pending") {
    return <Waiting application={application} />;
  }
  if (application?.status === "rejected") {
    return <Rejected application={application} onAgain={() => setApplication(null)} />;
  }

  const byCentre = new Map<string, School[]>();
  for (const s of schools) {
    const list = byCentre.get(s.centre_name) ?? [];
    list.push(s);
    byCentre.set(s.centre_name, list);
  }

  return (
    <form action={formAction} className="app-body">
      <DeviceField />

      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-muted)" }}>
        Fill this in and the KIDS office will check it. When they do, your account opens on this
        phone by itself — there is nothing to write down and nothing to remember.
      </p>

      <div className="app-field">
        <label className="app-label" htmlFor="name">
          Full name · as it is written at school
        </label>
        <input
          id="name"
          name="name"
          className={`app-input${state.field === "name" ? " app-input--bad" : ""}`}
          autoComplete="name"
          autoCapitalize="words"
        />
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="dobDay">
          Date of birth
        </label>
        <div className="app-dob">
          <input
            id="dobDay"
            name="dobDay"
            className={`app-input${state.field === "dob" ? " app-input--bad" : ""}`}
            inputMode="numeric"
            maxLength={2}
            placeholder="DD"
            aria-label="Day"
          />
          <input
            name="dobMonth"
            className={`app-input${state.field === "dob" ? " app-input--bad" : ""}`}
            inputMode="numeric"
            maxLength={2}
            placeholder="MM"
            aria-label="Month"
          />
          <input
            name="dobYear"
            className={`app-input app-input--year${state.field === "dob" ? " app-input--bad" : ""}`}
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            aria-label="Year"
          />
        </div>
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="class">
          Class you are in this year
        </label>
        <select
          id="class"
          name="class"
          value={cls}
          onChange={(e) => setCls(e.target.value)}
          className={`app-input app-select${state.field === "class" ? " app-input--bad" : ""}`}
        >
          <option value="">Choose…</option>
          <option value="IX">Class IX</option>
          <option value="X">Class X</option>
          <option value="XI">Class XI</option>
          <option value="XII">Class XII</option>
        </select>
      </div>

      {(cls === "XI" || cls === "XII") && (
        <div className="app-field">
          <label className="app-label" htmlFor="stream">
            Stream
          </label>
          <select id="stream" name="stream" className="app-input app-select">
            <option value="">Choose…</option>
            <option value="Science">Science</option>
            <option value="Commerce">Commerce</option>
            <option value="Arts">Arts</option>
          </select>
        </div>
      )}

      <div className="app-field">
        <label className="app-label" htmlFor="school">
          Your school
        </label>
        <select
          id="school"
          name="school"
          className={`app-input app-select${state.field === "school" ? " app-input--bad" : ""}`}
          defaultValue=""
        >
          <option value="">Choose your school…</option>
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
        <span className="app-hint">
          If your school is not on this list, it has not sat SET before. Ask your class teacher to
          write to KIDS.
        </span>
      </div>

      <div className="app-field">
        <label className="app-label" htmlFor="guardianPhone">
          A parent&rsquo;s phone number · optional
        </label>
        <input
          id="guardianPhone"
          name="guardianPhone"
          className="app-input"
          inputMode="tel"
          autoComplete="tel"
        />
        <span className="app-hint">Only so the office can reach your family if something is unclear.</span>
      </div>

      {state.message && <FormAlert state={{ message: state.message }} />}

      <button type="submit" className="app-btn" disabled={pending}>
        {pending ? "Sending…" : "Send my registration"}
      </button>

      <p className="app-foot">
        Sat SET 2026 already? <Link href="/app/claim">Claim your account instead</Link>
      </p>
    </form>
  );
}

function Waiting({ application }: { application: PendingApplication }) {
  return (
    <div className="app-body">
      <div className="app-card app-card--cream">
        <h3>With the KIDS office</h3>
        <p>
          We have your registration, {application.name.split(" ")[0]}. Somebody at KIDS checks every
          one by hand, so it is not instant — but you do not need to do anything else, and you do not
          need to come back to this screen.
        </p>
        <p>
          <strong>When it is approved this app opens your account by itself.</strong>
        </p>
      </div>

      <dl className="app-kv">
        <dt>Name</dt>
        <dd>{application.name}</dd>
        <dt>Class</dt>
        <dd>{application.class}</dd>
        <dt>School</dt>
        <dd>{application.school_name}</dd>
        <dt>Sent</dt>
        <dd>{new Date(application.applied_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
        })}</dd>
      </dl>

      <p className="app-foot">
        Something wrong above? Write to{" "}
        <a className="app-contact" href="mailto:kids.kol.org2003@gmail.com">
          kids.kol.org2003@gmail.com
        </a>
      </p>
    </div>
  );
}

function Approved({ application }: { application: PendingApplication }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    finishRegistrationAction,
    {},
  );

  return (
    <form action={formAction} className="app-body">
      <DeviceField />

      <div className="app-card app-card--gold">
        <h3>You are on the register</h3>
        <p>
          Welcome to KIDS, {application.name.split(" ")[0]}. Your User ID is below — it is yours for
          every exam you sit with us, so it is worth knowing by heart.
        </p>
      </div>

      <div className="app-uid-issued">{application.uid}</div>

      <div className="app-field">
        <label className="app-label">Choose a password</label>
        <PasswordField autoComplete="new-password" invalid={state.field === "password"} />
        <span className="app-hint">
          You will not have to sign in on this phone. This is so you can get back in if you ever
          change it or lose it.
        </span>
      </div>

      {state.message && <FormAlert state={state} />}

      <button type="submit" className="app-btn" disabled={pending}>
        {pending ? "Opening…" : "Finish and open my account"}
      </button>
    </form>
  );
}

function Rejected({
  application,
  onAgain,
}: {
  application: PendingApplication;
  onAgain: () => void;
}) {
  return (
    <div className="app-body">
      <div className="app-card">
        <h3>This registration was not accepted</h3>
        <p>
          {application.reason?.trim()
            ? application.reason
            : "The KIDS office did not give a reason on the form. They can tell you why, and what to do next."}
        </p>
      </div>

      <button type="button" className="app-btn app-btn--outline" onClick={onAgain}>
        Fill it in again
      </button>

      <p className="app-foot">
        Or write to{" "}
        <a className="app-contact" href="mailto:kids.kol.org2003@gmail.com">
          kids.kol.org2003@gmail.com
        </a>
      </p>
    </div>
  );
}

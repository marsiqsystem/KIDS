"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Phone, Search } from "lucide-react";
import PasswordField from "./PasswordField";
import FormAlert from "./FormAlert";
import DeviceField, { readOrCreateDeviceId } from "./DeviceField";
import { OFFICE, Stepper } from "./door";
import { groupUid } from "./UidField";
import {
  registerAction,
  registrationStatusAction,
  finishRegistrationAction,
  type RegisterState,
  type FormState,
} from "@/app/app/actions";
import type { School, PendingApplication } from "@/lib/app/registrations";

/**
 * "New to KIDS." Redesign board 03, 2C–2E.
 *
 * One route with four faces, because to the family it is one thing — "where is
 * my registration up to":
 *
 *   form        a stepper: who you are → your school → send
 *   pending     sent to the office; a gentle breathing state, not a dead page
 *   approved    "You are on the register", the new User ID large — and then
 *               choose a password, because an account with no password cannot
 *               be recovered onto another phone (our rule; the board skips it)
 *   rejected    the office's reason word for word, and the way on
 *
 * The state is keyed on the installation id, not on a login: the phone that
 * applied is the phone that gets let in, with nothing to remember in between.
 *
 * The board's third step is "choose a password". Registration here chooses it
 * on approval instead, as built — a password typed before anyone has checked
 * the application would be a secret stored for a child who may not exist.
 */
export default function RegisterScreen({ schools }: { schools: School[] }) {
  const [application, setApplication] = useState<PendingApplication | null>(null);
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {});

  // In an effect: localStorage is not there on the server.
  useEffect(() => {
    registrationStatusAction(readOrCreateDeviceId())
      .then(setApplication)
      .catch(() => {});
  }, []);

  // Re-ask after a successful submission, so the screen becomes the waiting face.
  useEffect(() => {
    if (!state.ok) return;
    registrationStatusAction(readOrCreateDeviceId())
      .then(setApplication)
      .catch(() => {});
  }, [state.ok]);

  if (application?.status === "approved" && application.uid) return <Approved application={application} />;
  if (application?.status === "pending") return <Waiting application={application} />;
  if (application?.status === "rejected") {
    return <Rejected application={application} onAgain={() => setApplication(null)} />;
  }

  return <Form schools={schools} state={state} formAction={formAction} pending={pending} />;
}

/* ------------------------------------------------------------------ form --- */

const STEPS = ["Who you are", "Your school", "Send"];

function Form({
  schools,
  state,
  formAction,
  pending,
}: {
  schools: School[];
  state: RegisterState;
  formAction: (data: FormData) => void;
  pending: boolean;
}) {
  const [step, setStep] = useState(0);
  const [handled, setHandled] = useState<RegisterState | null>(null);
  const [who, setWho] = useState({ name: "", d: "", m: "", y: "", cls: "", stream: "" });
  const [school, setSchool] = useState("");
  const [query, setQuery] = useState("");
  const month = useRef<HTMLInputElement>(null);
  const year = useRef<HTMLInputElement>(null);

  // A refusal returns the family to the step the field lives on.
  const refusedAt =
    state.field && handled !== state ? (state.field === "school" ? 1 : 0) : null;
  const at = refusedAt ?? step;

  const senior = who.cls === "XI" || who.cls === "XII";
  const whoReady =
    who.name.trim().length >= 2 && who.d && who.m && who.y.length === 4 && who.cls && (!senior || who.stream);

  const chosen = schools.find((s) => `${s.centre_code}|${s.school_code}` === school) ?? null;

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return schools.filter((s) => s.school_name.toLowerCase().includes(q)).slice(0, 30);
  }, [query, schools]);

  const byCentre = new Map<string, School[]>();
  for (const s of found) {
    const list = byCentre.get(s.centre_name) ?? [];
    list.push(s);
    byCentre.set(s.centre_name, list);
  }

  const next = (to: number) => {
    setHandled(state);
    setStep(to);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className="door-bar door-bar--steps">
        <Stepper steps={STEPS} at={at} />
      </div>

      <form action={formAction} className="door-body">
        <DeviceField />
        <input type="hidden" name="school" value={school} />

        {/* ---- 1 · who you are ---- */}
        <div className="door-step-body" hidden={at !== 0}>
          <h2 className="door-h2">Who you are</h2>

          <div className="door-field">
            <label className="k-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              className={`door-input${state.field === "name" ? " door-input--bad" : ""}`}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="As written at school"
              value={who.name}
              onChange={(e) => setWho((w) => ({ ...w, name: e.target.value }))}
            />
          </div>

          <div className="door-field">
            <label className="k-label" htmlFor="dobDay">
              Date of birth
            </label>
            <div className="door-dob">
              <label>
                <input
                  id="dobDay"
                  name="dobDay"
                  className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
                  inputMode="numeric"
                  maxLength={2}
                  value={who.d}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    setWho((w) => ({ ...w, d }));
                    if (d.length === 2) month.current?.focus();
                  }}
                  aria-label="Day"
                />
                <span>DD</span>
              </label>
              <label>
                <input
                  ref={month}
                  name="dobMonth"
                  className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
                  inputMode="numeric"
                  maxLength={2}
                  value={who.m}
                  onChange={(e) => {
                    const m = e.target.value.replace(/\D/g, "");
                    setWho((w) => ({ ...w, m }));
                    if (m.length === 2) year.current?.focus();
                  }}
                  aria-label="Month"
                />
                <span>MM</span>
              </label>
              <label className="door-dob__year">
                <input
                  ref={year}
                  name="dobYear"
                  className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
                  inputMode="numeric"
                  maxLength={4}
                  value={who.y}
                  onChange={(e) => setWho((w) => ({ ...w, y: e.target.value.replace(/\D/g, "") }))}
                  aria-label="Year"
                />
                <span>YYYY</span>
              </label>
            </div>
          </div>

          <fieldset className="door-field door-fieldset">
            <legend className="k-label">Class</legend>
            <div className="door-seg">
              {["IX", "X", "XI", "XII"].map((c) => (
                <label key={c} className={`door-seg__opt${who.cls === c ? " door-seg__opt--on" : ""}`}>
                  <input
                    type="radio"
                    name="class"
                    value={c}
                    checked={who.cls === c}
                    onChange={() => setWho((w) => ({ ...w, cls: c, stream: "" }))}
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>

          {senior ? (
            <fieldset className="door-field door-fieldset">
              <legend className="k-label">Stream</legend>
              <div className="door-seg">
                {["Science", "Commerce", "Arts"].map((s) => (
                  <label key={s} className={`door-seg__opt${who.stream === s ? " door-seg__opt--on" : ""}`}>
                    <input
                      type="radio"
                      name="stream"
                      value={s}
                      checked={who.stream === s}
                      onChange={() => setWho((w) => ({ ...w, stream: s }))}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {at === 0 && state.field !== "school" ? <FormAlert state={{ message: state.message }} /> : null}

          <div className="door-bottom">
            <button type="button" className="k-btn" disabled={!whoReady} onClick={() => next(1)}>
              Next
            </button>
            <p className="door-foot">
              Already on the register? <Link href="/app/claim">Claim your account</Link>
            </p>
          </div>
        </div>

        {/* ---- 2 · your school ---- */}
        <div className="door-step-body" hidden={at !== 1}>
          <h2 className="door-h2">Which school?</h2>

          <label className="door-search">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              placeholder="Type your school’s name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find your school"
            />
          </label>

          {chosen ? (
            <div className="door-chosen">
              <Check size={18} aria-hidden="true" />
              <span>
                <b>{chosen.school_name}</b>
                <span>{chosen.centre_name}</span>
              </span>
            </div>
          ) : null}

          <div className="door-schools">
            {[...byCentre.entries()].map(([centre, list]) => (
              <div key={centre}>
                <div className="k-label door-schools__centre">{centre}</div>
                {list.map((s) => {
                  const key = `${s.centre_code}|${s.school_code}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`door-school${school === key ? " door-school--on" : ""}`}
                      onClick={() => setSchool(key)}
                      aria-pressed={school === key}
                    >
                      {s.school_name}
                    </button>
                  );
                })}
              </div>
            ))}
            {query.trim().length >= 2 ? (
              <p className="door-hint door-center">
                {found.length} of {schools.length} schools
              </p>
            ) : null}
          </div>

          <p className="door-foot">
            My school is not here? <a href={`tel:${OFFICE.tel}`}>Call the office</a>
          </p>

          {at === 1 && state.field === "school" ? <FormAlert state={{ message: state.message }} /> : null}

          <div className="door-bottom">
            <button type="button" className="k-btn" disabled={!chosen} onClick={() => next(2)}>
              Next
            </button>
          </div>
        </div>

        {/* ---- 3 · send ---- */}
        <div className="door-step-body" hidden={at !== 2}>
          <h2 className="door-h2">Check and send</h2>

          <dl className="door-summary">
            <div>
              <dt>Name</dt>
              <dd>{who.name}</dd>
            </div>
            <div>
              <dt>Born</dt>
              <dd className="k-mono">
                {who.d.padStart(2, "0")} / {who.m.padStart(2, "0")} / {who.y}
              </dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>
                {who.cls}
                {who.stream ? ` · ${who.stream}` : ""}
              </dd>
            </div>
            <div>
              <dt>School</dt>
              <dd>{chosen?.school_name}</dd>
            </div>
          </dl>

          <div className="door-field">
            <label className="k-label" htmlFor="guardianPhone">
              Family phone · optional
            </label>
            <input
              id="guardianPhone"
              name="guardianPhone"
              className="door-input"
              inputMode="tel"
              autoComplete="tel"
            />
            <span className="door-hint">Only so the office can reach your family.</span>
          </div>

          <div className="door-bottom">
            <button type="submit" className="k-btn" disabled={pending}>
              {pending ? "Sending…" : "Send to KIDS"}
            </button>
            <button type="button" className="k-btn k-btn--quiet" onClick={() => setStep(0)}>
              Change something
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

/* ------------------------------------------------------------- waiting --- */

function Waiting({ application }: { application: PendingApplication }) {
  return (
    <div className="door-sky">
      <div className="door-sky__top">
        <div className="door-sky__crest k-breathe">
          <Image src="/kids-icon.png" alt="" width={84} height={84} />
          <span className="door-sky__star" style={{ top: 2, right: -14 }}>★</span>
          <span className="door-sky__star" style={{ top: 30, left: -18, animationDelay: "0.8s" }}>★</span>
          <span className="door-sky__star" style={{ bottom: 0, right: -8, animationDelay: "1.6s" }}>★</span>
        </div>
        <h2 className="door-sky__title">Sent to the KIDS office</h2>
        <p className="door-sky__line">A person reads every registration.</p>
      </div>

      <div className="door-body">
        <div className="k-card">
          <div className="k-label">What they received</div>
          <dl className="door-summary">
            <div>
              <dt>Name</dt>
              <dd>{application.name}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{application.class}</dd>
            </div>
            <div>
              <dt>School</dt>
              <dd>{application.school_name}</dd>
            </div>
          </dl>
          <p className="door-hint">
            Sent{" "}
            {new Date(application.applied_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        <p className="k-line door-center">
          When it is approved, this app opens your account <strong>by itself</strong>.
        </p>

        <a className="k-row" href={`tel:${OFFICE.tel}`}>
          <span className="k-row__icon" aria-hidden="true">
            <Phone size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-row__title">Something wrong above?</span>
            <span className="k-row__line">Call the office</span>
          </span>
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ approved --- */

function Approved({ application }: { application: PendingApplication }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(finishRegistrationAction, {});

  return (
    <form action={formAction} className="door-approved">
      <DeviceField />
      <div className="door-approved__top">
        <div className="k-celebrate">
          <Image src="/kids-icon.png" alt="" width={72} height={72} />
          <span className="k-spark" style={{ top: -6, right: -12, fontSize: 18 }}>★</span>
          <span className="k-spark" style={{ top: 4, left: -14, fontSize: 13, animationDelay: "0.5s" }}>★</span>
        </div>
        <h2 className="door-approved__title">You are on the register</h2>
      </div>

      <div className="door-body">
        <div className="door-issued">
          <div className="k-label">Your User ID</div>
          <div className="door-issued__uid">{groupUid(application.uid ?? "")}</div>
          <p className="door-issued__write">Write it down somewhere safe</p>
        </div>
        <p className="k-line door-center">You need it and your password on any other phone.</p>

        <div className="door-field">
          <label className="k-label" htmlFor="reg-password">
            Choose a password
          </label>
          <PasswordField
            id="reg-password"
            autoComplete="new-password"
            invalid={state.field === "password"}
            placeholder="At least 6 characters"
          />
        </div>

        <FormAlert state={state} />

        <div className="door-bottom">
          <button type="submit" className="k-btn k-btn--gold" disabled={pending}>
            {pending ? "Opening…" : "Open my app"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ rejected --- */

function Rejected({ application, onAgain }: { application: PendingApplication; onAgain: () => void }) {
  const reason = application.reason?.trim() ?? "";
  // When the office's words name an existing UID, that number is the way on.
  const existing = reason.match(/\b(\d{3})\s?(\d{3})\s?(\d{3})\b/);
  const uid = existing ? existing.slice(1).join("") : null;

  return (
    <div className="door-body">
      <h2 className="door-h2">This registration was not accepted</h2>

      {reason ? (
        <figure className="door-quote">
          <figcaption className="k-label">What the office wrote</figcaption>
          <blockquote>{reason}</blockquote>
        </figure>
      ) : null}

      {uid ? (
        <div className="door-issued door-issued--plain">
          <div className="k-label">Your existing number</div>
          <div className="door-issued__uid">{groupUid(uid)}</div>
          <Link href={`/app/claim?id=${uid}`} className="k-btn">
            Claim that account
          </Link>
        </div>
      ) : (
        <button type="button" className="k-btn k-btn--outline" onClick={onAgain}>
          Fill it in again
        </button>
      )}

      <p className="door-foot">
        If this is a mistake, call <a href={`tel:${OFFICE.tel}`}>{OFFICE.phone}</a>.
      </p>
    </div>
  );
}

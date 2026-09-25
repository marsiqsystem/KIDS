"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { Phone } from "lucide-react";
import UidField, { groupUid } from "./UidField";
import FormAlert from "./FormAlert";
import DeviceField from "./DeviceField";
import { useDoorStatus } from "./DoorWatch";
import { OFFICE } from "./door";
import { askOfficeAction, type AskState } from "@/app/app/actions";

/**
 * "Ask KIDS to open my account." One route, three faces, like registration:
 *
 *   form      User ID, the name as written at school, a family phone
 *   waiting   sent; this app opens the account by itself on approval
 *   refused   the office's words, and the form again beneath them
 *
 * For a child already on the register who cannot claim by themselves -- no date
 * of birth on the register, a date that does not match, or a forgotten
 * password. The office approves in the control centre's Claims tab, and the
 * phone that asked signs itself in. Nobody reads a password to anybody.
 */
export default function AskOfficeScreen({
  initialUid,
  dob,
  noDob,
}: {
  initialUid: string;
  /** DD-MM-YYYY typed on the claim screen, carried to the office. */
  dob?: string;
  /** Arrived from the claim screen because the register has no date of birth. */
  noDob?: boolean;
}) {
  const { status, opening, again } = useDoorStatus();
  const [state, formAction, pending] = useActionState<AskState, FormData>(askOfficeAction, {});
  const [uid, setUid] = useState(initialUid);
  const [retry, setRetry] = useState(false);

  // A sent request turns this screen into the waiting face.
  useEffect(() => {
    if (state.ok) again();
  }, [state, again]);

  if (opening || status?.state === "ready") {
    return (
      <div className="door-sky">
        <div className="door-sky__top">
          <div className="door-sky__crest k-breathe">
            <Image src="/kids-icon.png" alt="" width={84} height={84} />
          </div>
          <h2 className="door-sky__title">Approved by KIDS</h2>
          <p className="door-sky__line">Opening your account…</p>
        </div>
      </div>
    );
  }

  if (status?.state === "waiting") {
    return (
      <div className="door-sky">
        <div className="door-sky__top">
          <div className="door-sky__crest k-breathe">
            <Image src="/kids-icon.png" alt="" width={84} height={84} />
            <span className="door-sky__star" style={{ top: 2, right: -14 }}>★</span>
            <span className="door-sky__star" style={{ top: 30, left: -18, animationDelay: "0.8s" }}>★</span>
          </div>
          <h2 className="door-sky__title">Sent to the KIDS office</h2>
          <p className="door-sky__line">A person checks every request.</p>
        </div>

        <div className="door-body">
          <div className="k-card">
            <div className="k-label">What they received</div>
            <dl className="door-summary">
              <div>
                <dt>User ID</dt>
                <dd className="k-mono">{groupUid(status.uid)}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{status.typedName}</dd>
              </div>
              <div>
                <dt>Asking</dt>
                <dd>{status.kind === "reset" ? "Let me in again — I forgot my password" : "Open my account"}</dd>
              </div>
            </dl>
          </div>

          <p className="k-line door-center">
            When it is approved, this app opens your account <strong>by itself</strong>. You can close it and come back.
          </p>

          <a className="k-row" href={`tel:${OFFICE.tel}`}>
            <span className="k-row__icon" aria-hidden="true">
              <Phone size={20} />
            </span>
            <span className="k-row__text">
              <span className="k-row__title">Something wrong above?</span>
              <span className="k-row__line">Send it again below, or call the office</span>
            </span>
          </a>

          <details>
            <summary className="door-foot">Send it again</summary>
            <AskForm uid={uid} setUid={setUid} dob={dob} state={state} formAction={formAction} pending={pending} />
          </details>
        </div>
      </div>
    );
  }

  const refused = status?.state === "refused" && !retry ? status : null;

  return (
    <div className="door-body">
      {refused ? (
        <>
          <h2 className="door-h2">The office did not approve this</h2>
          {refused.reason ? (
            <figure className="door-quote">
              <figcaption className="k-label">What the office wrote</figcaption>
              <blockquote>{refused.reason}</blockquote>
            </figure>
          ) : (
            <p className="k-line">
              Call <a href={`tel:${OFFICE.tel}`}>{OFFICE.phone}</a> and they will tell you why.
            </p>
          )}
          <button type="button" className="k-btn k-btn--outline" onClick={() => setRetry(true)}>
            Ask again
          </button>
        </>
      ) : (
        <>
          {noDob ? (
            <>
              <h2 className="door-h2">We don’t have your date of birth</h2>
              <p className="k-line">
                Tell us a little more. The KIDS office checks it against your school’s records, then this app opens
                your account <strong>by itself</strong>.
              </p>
            </>
          ) : (
            <p className="k-line">
              The KIDS office checks who you are, then this app opens your account <strong>by itself</strong> — no
              password to be told.
            </p>
          )}
          <AskForm uid={uid} setUid={setUid} dob={dob} state={state} formAction={formAction} pending={pending} />
        </>
      )}
    </div>
  );
}

function AskForm({
  uid,
  setUid,
  dob,
  state,
  formAction,
  pending,
}: {
  uid: string;
  setUid: (v: string) => void;
  dob?: string;
  state: AskState;
  formAction: (data: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={formAction} className="door-step-body">
      <DeviceField />
      {dob ? <input type="hidden" name="dob" value={dob} /> : null}

      <div className="door-field">
        <label className="k-label">User ID</label>
        <UidField value={uid} onChange={setUid} invalid={state.field === "uid"} />
      </div>

      <div className="door-field">
        <label className="k-label" htmlFor="ask-name">
          Your full name
        </label>
        <input
          id="ask-name"
          name="name"
          className={`door-input${state.field === "name" ? " door-input--bad" : ""}`}
          autoComplete="name"
          autoCapitalize="words"
          placeholder="As written at school"
        />
      </div>

      <div className="door-field">
        <label className="k-label" htmlFor="ask-father">
          Father’s or guardian’s name
        </label>
        <input
          id="ask-father"
          name="father"
          className={`door-input${state.field === "father" ? " door-input--bad" : ""}`}
          autoCapitalize="words"
          placeholder="As given to your school"
        />
      </div>

      <div className="door-field">
        <label className="k-label" htmlFor="ask-phone">
          Family mobile number
        </label>
        <input
          id="ask-phone"
          name="guardianPhone"
          className={`door-input${state.field === "phone" ? " door-input--bad" : ""}`}
          inputMode="tel"
          autoComplete="tel"
          placeholder="10 digits"
        />
        <span className="door-hint">The number your school has. The office may ring it.</span>
      </div>

      <FormAlert state={{ message: state.message }} />

      <div className="door-bottom">
        <button type="submit" className="k-btn" disabled={pending || uid.length !== 9}>
          {pending ? "Sending…" : "Send to KIDS"}
        </button>
      </div>
    </form>
  );
}

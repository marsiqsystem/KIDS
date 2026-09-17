"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  BatteryLow,
  Check,
  Clock,
  DoorClosed,
  Loader2,
  MapPin,
  PencilLine,
  ReceiptText,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useServerCountdown } from "@/components/portal/Countdown";

/**
 * The faces of the Exam tab around the paper itself. Redesign board 04.
 *
 * Presentational only. Which face shows is decided on the server from the
 * paper's own row (the Exam page) or by LiveExam's stage — never here, and
 * never from the phone's clock.
 *
 * What is NOT drawn, although the board has it: a room and a desk number. KIDS
 * holds neither, so "Behala Centre · Room 4 · Desk 18" is only ever the centre.
 */

const ist = (d: Date | string, o: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o });

const pad = (n: number) => String(n).padStart(2, "0");

/* ---------------------------------------------------------- the four rules */

/**
 * The rules ruled on 14 September 2026, one icon and one line each. The brief's
 * exact promises — keep the rule, lose the paragraph.
 */
export function FourRules() {
  const rows: [ReactNode, string][] = [
    [<Clock key="c" size={22} />, "Everyone’s paper ends at the same time. A late start gets less time."],
    [<BatteryLow key="b" size={22} />, "If your phone dies, the invigilator moves your paper to another phone."],
    [<WifiOff key="w" size={22} />, "No signal? Keep answering. Answers are kept on the phone and sent later."],
    [<PencilLine key="p" size={22} />, "Change any answer until you hand in. Nothing is shown until results."],
  ];
  return (
    <div className="k-card">
      <div className="k-label ex-rules__title">Four things to know</div>
      <div className="ex-rules">
        {rows.map(([icon, line]) => (
          <div key={line} className="ex-rule">
            <span className="ex-rule__icon" aria-hidden="true">
              {icon}
            </span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- scheduled, not open */

export function PaperHero({
  eyebrow = "Students Evaluation Test 2026",
  name,
  startsAt,
  minutes,
}: {
  eyebrow?: string;
  name: string;
  startsAt?: string;
  minutes?: number;
}) {
  return (
    <header className="ex-hero">
      <Image src="/kids-icon.png" alt="" width={120} height={120} className="ex-hero__crest" aria-hidden="true" />
      <div className="ex-hero__eyebrow">{eyebrow}</div>
      <h1 className="ex-hero__name">{name}</h1>
      {startsAt ? (
        <div className="ex-hero__facts">
          <div>
            <span>Date</span>
            <b>{ist(startsAt, { day: "numeric", month: "short", year: "numeric" })}</b>
          </div>
          <div>
            <span>Time</span>
            <b>{ist(startsAt, { hour: "numeric", minute: "2-digit" })}</b>
          </div>
          {minutes ? (
            <div>
              <span>Length</span>
              <b>{minutes} min</b>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

/** Days, hours, minutes to a moment, on the server's clock. */
export function OpensIn({ at, serverNowIso, label = "Opens in" }: { at: string; serverNowIso: string; label?: string }) {
  const left = useServerCountdown(at, serverNowIso);
  return (
    <div className="k-card k-card--gold k-card--center">
      <div className="k-label">{label}</div>
      <div className="ex-opens" role="timer">
        {left.days > 0 ? (
          <span>
            <b>{left.days}</b>d
          </span>
        ) : null}
        <span>
          <b>{pad(left.hours)}</b>h
        </span>
        <span>
          <b>{pad(left.minutes)}</b>m
        </span>
        {left.days === 0 ? (
          <span>
            <b>{pad(left.seconds)}</b>s
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function CentreCard({ name, note }: { name: string; note?: string }) {
  return (
    <div className="k-card ex-centre">
      <MapPin size={20} className="ex-centre__pin" aria-hidden="true" />
      <div>
        <div className="k-label">Your centre</div>
        <div className="ex-centre__name">{name}</div>
        {note ? <div className="k-line">{note}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ waiting room */

export function WaitingRoom({
  name,
  startsAtIso,
  serverNowIso,
  centre,
}: {
  name: string;
  startsAtIso: string;
  serverNowIso: string;
  centre: string;
}) {
  const left = useServerCountdown(startsAtIso, serverNowIso);
  const h = left.totalHours;
  return (
    <div className="ex-page">
      <PaperHero eyebrow="Waiting room" name={name} />
      <div className="ex-wait">
        <div className="k-label">Starts in</div>
        <div className="ex-wait__clock" role="timer">
          {h > 0 ? `${h}:` : ""}
          {pad(left.minutes)}:{pad(left.seconds)}
        </div>
        <span className="k-chip k-chip--teal ex-wait__chip">
          <Check size={15} aria-hidden="true" /> Checked in · {centre}
        </span>
        <p className="k-line">
          Keep your phone on this screen.
          <br />
          <strong>The paper opens once only.</strong>
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- the paper is open */

export function StartFace({
  name,
  busy,
  resuming,
  error,
  onStart,
  questionCount,
  closes,
}: {
  name: string;
  busy: boolean;
  resuming: boolean;
  error: string;
  onStart: () => void;
  questionCount: number;
  closes: string;
}) {
  const refused = /another phone/i.test(error);
  return (
    <div className="ex-page">
      <PaperHero eyebrow={resuming ? "Your paper is waiting" : "The paper is open"} name={name} />
      <div className="app-body">
        {error ? (
          <div className="ex-note">
            <span className={`ex-note__icon${refused ? " ex-note__icon--gold" : ""}`} aria-hidden="true">
              {refused ? <Smartphone size={20} /> : <WifiOff size={20} />}
            </span>
            <div>
              <p className="k-h">{refused ? "Your paper is on another phone" : "That did not open"}</p>
              <p className="k-line">{refused ? "Ask the invigilator to move it to this one." : error}</p>
            </div>
          </div>
        ) : null}

        <div className="k-card k-card--center">
          <p className="ex-big">{questionCount}</p>
          <p className="k-line">questions · everyone ends at {closes}</p>
        </div>

        <p className="k-line ex-center">
          <strong>The paper opens once only.</strong>
        </p>

        <button type="button" className="k-btn ex-start" onClick={onStart} disabled={busy}>
          {busy ? <Loader2 size={20} className="ex-spin" aria-hidden="true" /> : null}
          {busy ? "Opening" : error ? "Try again" : resuming ? "Carry on" : "Start"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- handing in */

export function HandingIn() {
  return (
    <div className="ex-handing" role="alertdialog" aria-label="Handing in">
      <div className="ex-handing__card">
        <span className="ex-ring" aria-hidden="true" />
        <p className="ex-handing__title">Handing in…</p>
        <p className="ex-handing__line">Do not close this page.</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the receipt */

/**
 * "Answers received". Built like KIDS collateral — gold frame, maroon band —
 * because a child will screenshot it and send it home. It stays on the Exam tab.
 * No score, ever: nothing is shown until results are published.
 */
export function Receipt({
  paper,
  receipt,
  handedInIso,
  answered,
  total,
  centre,
}: {
  paper: string;
  receipt: string | null;
  handedInIso: string;
  answered: number;
  total: number;
  centre?: string;
}) {
  return (
    <div className="ex-receipt">
      <div className="ex-receipt__band">
        <Image src="/kids-icon.png" alt="" width={120} height={120} className="ex-hero__crest" aria-hidden="true" />
        <div className="ex-receipt__tick">
          <Check size={28} aria-hidden="true" />
          <span className="k-spark" style={{ top: -4, right: -12, fontSize: 15 }} aria-hidden="true">
            ★
          </span>
        </div>
        <h2 className="ex-receipt__title">Answers received</h2>
        <p className="ex-receipt__safe">Locked and safe.</p>
      </div>
      <div className="ex-receipt__body">
        {receipt ? (
          <div className="ex-receipt__no">
            <div className="k-label">Receipt number</div>
            <div className="ex-receipt__code">{receipt}</div>
          </div>
        ) : null}
        <div className="ex-receipt__rule" />
        <dl className="ex-receipt__rows">
          <div>
            <dt>Paper</dt>
            <dd>{paper}</dd>
          </div>
          <div>
            <dt>Handed in</dt>
            <dd className="k-mono">{ist(handedInIso, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</dd>
          </div>
          {total > 0 ? (
            <>
              <div>
                <dt>Answered</dt>
                <dd>
                  {answered} of {total}
                </dd>
              </div>
              <div>
                <dt>Left blank</dt>
                <dd>{total - answered}</dd>
              </div>
            </>
          ) : null}
          {centre ? (
            <div>
              <dt>Centre</dt>
              <dd>{centre}</dd>
            </div>
          ) : null}
        </dl>
        <p className="ex-receipt__foot">Results are published by the KIDS office. Nothing is shown until then.</p>
      </div>
    </div>
  );
}

/** Every paper handed in through the app, each with its receipt. */
export function PapersSat({ rows }: { rows: { name: string; receipt: string; submitted_at: string }[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <div className="k-label ex-list__title">Papers you have sat</div>
      <div className="ex-list">
        {rows.map((r) => (
          <div key={r.receipt} className="k-row">
            <span className="k-row__icon ex-list__icon" aria-hidden="true">
              <ReceiptText size={20} />
            </span>
            <span className="k-row__text">
              <span className="k-row__title">{r.name}</span>
              <span className="k-row__line k-mono">{r.receipt}</span>
            </span>
            <span className="ex-list__date">
              {ist(r.submitted_at, { day: "numeric", month: "short" })}
              <br />
              {ist(r.submitted_at, { year: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClosedNote({ started }: { started: boolean }) {
  return (
    <div className="ex-note">
      <span className="ex-note__icon ex-note__icon--grey" aria-hidden="true">
        <DoorClosed size={20} />
      </span>
      <div>
        <p className="k-h">This paper has closed</p>
        <p className="k-line">{started ? "Your receipt is below." : "You did not start it. Nothing is on your record for it."}</p>
      </div>
    </div>
  );
}

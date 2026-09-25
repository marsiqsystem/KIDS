import Image from "next/image";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { findStudent } from "@/lib/exam/db";
import { DoorBar, OFFICE } from "@/components/app/door";
import { groupUid } from "@/lib/app/uid";

/**
 * Forgot password — deliberately no self-service. Redesign board 03, 1E.
 *
 * There is no reset link, no code, no SMS button: a password here is cleared
 * by a named person in the KIDS control centre. Two ways to reach them. The
 * first is "Ask KIDS to let me in" -- a request from this phone that the office
 * approves in the Claims tab, after which this phone signs itself in and the
 * child chooses a new password (src/lib/app/handoff.ts); nobody reads a
 * password to anybody. The second is the card below, to show at the counter,
 * with the office's phone and email.
 *
 * Name and school appear only once a valid nine-digit UID arrived, so this page
 * can never be used to walk the register.
 */
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const uid = (id ?? "").replace(/\D/g, "").slice(0, 9);
  const student = uid.length === 9 ? await findStudent(uid) : null;

  return (
    <div className="app-frame">
      <DoorBar title="Forgot password" back={uid.length === 9 ? `/app/sign-in?id=${uid}` : "/app/sign-in"} />

      <div className="door-body">
        <p className="k-line">The KIDS office clears passwords. Ask them from this phone, or show them this card.</p>

        <div className="kcard">
          <div className="kcard__band">
            <Image src="/kids-icon.png" alt="" width={36} height={36} />
            <span>
              Kabitirtha Institute of
              <br />
              Development &amp; Studies
            </span>
          </div>
          <div className="kcard__body">
            <div className="kcard__row">
              <span className="k-label">User ID</span>
              <span className="kcard__uid">{uid.length === 9 ? groupUid(uid) : "— — —"}</span>
            </div>
            {student ? (
              <>
                <div className="kcard__row">
                  <span className="k-label">Name</span>
                  <span className="kcard__value">{student.name}</span>
                </div>
                <div className="kcard__row">
                  <span className="k-label">School</span>
                  <span className="kcard__value">{student.school_name}</span>
                </div>
                <div className="kcard__row">
                  <span className="k-label">Class</span>
                  <span className="kcard__value">{student.class}</span>
                </div>
              </>
            ) : null}
            <div className="kcard__rule" />
            <p className="kcard__foot">Password cleared by the KIDS office only. {OFFICE.reg}.</p>
          </div>
        </div>

        <Link className="k-btn" href={uid.length === 9 ? `/app/claim/ask?id=${uid}` : "/app/claim/ask"}>
          Ask KIDS to let me in on this phone
        </Link>
        <p className="k-line door-center">When the office approves, this app opens by itself.</p>

        <a className="k-row" href={`tel:${OFFICE.tel}`}>
          <span className="k-row__icon" aria-hidden="true">
            <Phone size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-label">Call the office</span>
            <span className="k-row__title k-mono">{OFFICE.phone}</span>
          </span>
        </a>
        <a className="k-row" href={`mailto:${OFFICE.email}`}>
          <span className="k-row__icon" aria-hidden="true">
            <Mail size={20} />
          </span>
          <span className="k-row__text">
            <span className="k-label">Email</span>
            <span className="k-row__title door-email">{OFFICE.email}</span>
          </span>
        </a>

        <p className="k-line door-center">A person at KIDS checks who you are, then opens your account again.</p>
      </div>
    </div>
  );
}

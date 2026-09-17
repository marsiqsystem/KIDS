import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The front door's parts. Redesign board 03.
 *
 * Server components; nothing here needs the browser.
 */

/** The crest carries the top third — the first screen a child sees. */
export function DoorHero({ title, line }: { title: string; line?: string }) {
  return (
    <header className="door-hero">
      <Image src="/kids-icon.png" alt="" width={150} height={150} className="door-hero__ghost" aria-hidden="true" />
      <Image src="/kids-icon.png" alt="KIDS" width={64} height={64} className="door-hero__mark" priority />
      <h1 className="door-hero__title">{title}</h1>
      {line ? <p className="door-hero__line">{line}</p> : null}
    </header>
  );
}

/** A white title bar with a back arrow, and an optional stepper under it. */
export function DoorBar({
  title,
  back = "/app/sign-in",
  steps,
  at = 0,
}: {
  title: string;
  back?: string;
  steps?: string[];
  at?: number;
}) {
  return (
    <header className="door-bar">
      <div className="door-bar__row">
        <Link href={back} className="door-bar__back" aria-label="Back">
          <ArrowLeft size={24} aria-hidden="true" />
        </Link>
        <h1 className="door-bar__title">{title}</h1>
        {steps && steps.length > 2 ? (
          <span className="door-bar__count">
            {at + 1} of {steps.length}
          </span>
        ) : null}
      </div>
      {steps ? <Stepper steps={steps} at={at} /> : null}
    </header>
  );
}

export function Stepper({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className={`door-steps door-steps--${steps.length}`}>
      {steps.map((label, i) => (
        <li
          key={label}
          className={`door-step${i === at ? " door-step--here" : ""}${i < at ? " door-step--done" : ""}`}
          aria-current={i === at ? "step" : undefined}
        >
          <span className="door-step__n">{i < at ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
          <span className="door-step__label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** One refusal or notice: an icon, a line in bold, one line under it. */
export function Notice({
  icon,
  tone = "maroon",
  title,
  children,
}: {
  icon: ReactNode;
  tone?: "maroon" | "gold" | "teal" | "grey";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="door-notice" role="status">
      <span className={`door-notice__icon door-notice__icon--${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div className="door-notice__text">
        <p className="k-h">{title}</p>
        {children ? <div className="k-line">{children}</div> : null}
      </div>
    </div>
  );
}

/** The office's real contact, from the site's contact page. */
export const OFFICE = {
  phone: "+91 98364 14786",
  tel: "+919836414786",
  email: "kids.kol.org2003@gmail.com",
  reg: "Reg. S/1L/19796",
};

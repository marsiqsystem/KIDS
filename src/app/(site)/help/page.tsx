import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { OFFICE } from "@/components/app/door";
import HelpVideos from "./HelpVideos";

/**
 * Help for families using KIDS EDU UDAAN: the four help films (7 Nov 2026) and
 * answers to the cases the office keeps meeting. Every answer here matches what
 * the app actually does — check the app before changing one.
 */

export const metadata: Metadata = {
  title: "Help · KIDS EDU UDAAN app · KIDS",
  description:
    "Help videos in Bengali and Hindi-Urdu, and answers to common questions about the KIDS EDU UDAAN app: claiming, registering, signing in, forgot password, new phone.",
};

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is the app free?",
    a: <>Yes. KIDS EDU UDAAN is completely free. KIDS never asks for money in the app.</>,
  },
  {
    q: "I sat SET in July. Do I register?",
    a: (
      <>
        No. You already have a 9-digit User ID — it is printed on your admit card. Tap <strong>Claim your account</strong>{" "}
        and type your User ID and date of birth. Registering again makes a second account and causes problems.
      </>
    ),
  },
  {
    q: "I have lost my User ID.",
    a: <>Ask your school or write to the KIDS office. Never register as a new student to get a new one.</>,
  },
  {
    q: "The app says “This account is already open”.",
    a: (
      <>
        The account was opened before — by you or by someone who helped you. Go back and sign in with that password. If
        nobody knows it, tap <strong>Forgot password</strong>.
      </>
    ),
  },
  {
    q: "The app says my date of birth does not match.",
    a: (
      <>
        Check the date against your school records — day, month, then the full four-digit year — and try again. If it
        still does not work, tap <strong>Ask KIDS to open my account</strong> and fill in the form.
      </>
    ),
  },
  {
    q: "I sent a request to the KIDS office. What now?",
    a: (
      <>
        Nothing more is needed from you. When the office approves, the app opens your account by itself. Until then,{" "}
        <strong>keep the app on your phone — do not delete it and do not clear its data</strong>, or the approval cannot
        reach you. When it opens, choose your password straight away.
      </>
    ),
  },
  {
    q: "I forgot my password.",
    a: (
      <>
        Tap <strong>Forgot password</strong> on the sign-in screen, fill in your name, your father&apos;s or
        guardian&apos;s name and a family mobile number, and tap <strong>Send to the KIDS office</strong>. Send it from
        the phone you will use. When the office approves, the app asks you to choose a new password.
      </>
    ),
  },
  {
    q: "I typed the wrong password and now I have to wait.",
    a: <>After three wrong tries the app rests for fifteen minutes. Wait, or tap Forgot password.</>,
  },
  {
    q: "I changed my phone. / The app says “Your account is on another phone”.",
    a: (
      <>
        One account works on one phone at a time. Install the app on the new phone and sign in with your User ID and
        password — the account moves to the new phone and the old one is signed out. Deleting and reinstalling the app
        counts as a new phone too.
      </>
    ),
  },
  {
    q: "It says “No connection” but my internet is working.",
    a: <>Tap the button once more. The second try usually goes through.</>,
  },
  {
    q: "My name, date of birth or school is wrong.",
    a: (
      <>
        In the app, open <strong>Profile → My details are wrong</strong> and send the correct details. You can also
        write to the KIDS office with your User ID, or tell your school. The office checks and corrects them.
      </>
    ),
  },
  {
    q: "I am a teacher, KIDS staff or member. Can I see the app?",
    a: (
      <>
        Yes. Tap <strong>Register</strong> and choose <strong>Other</strong> as your class, then choose which
        class&apos;s app you want to see. The KIDS office approves it.
      </>
    ),
  },
  {
    q: "I have an iPhone.",
    a: (
      <>
        Open <Link href="/app" className="text-primary font-semibold underline underline-offset-4">www.kidskolkata.org/app</Link>{" "}
        in Safari, tap Share, then <strong>Add to Home Screen</strong>. It works the same way as the Android app.
      </>
    ),
  },
  {
    q: "How do I delete my account?",
    a: (
      <>
        In the app: Profile → Delete my account. Or see{" "}
        <Link href="/delete-account" className="text-primary font-semibold underline underline-offset-4">
          kidskolkata.org/delete-account
        </Link>
        .
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        tag="KIDS EDU UDAAN APP"
        title="Help"
        description="Short videos in Bengali and Hindi-Urdu showing every step on the real app screens, and answers to the questions the KIDS office hears most."
      />

      <section className="py-16 md:py-20 bg-surface-container-low border-b border-outline-variant/50">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">Help videos</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Watch it done, step by step</h2>
            <p className="text-on-surface-variant">
              Not got the app yet? <Link href="/get-the-app" className="text-primary font-semibold underline underline-offset-4">Get KIDS EDU UDAAN</Link>.
            </p>
          </div>
          <HelpVideos />
        </div>
      </section>

      <section className="py-16 md:py-20 bg-surface">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">Questions</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary">Common questions</h2>
          </div>
          <div className="divide-y divide-outline-variant border-y border-outline-variant">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-lg text-on-surface marker:hidden">
                  <span>{f.q}</span>
                  <span className="text-primary text-2xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="mt-3 text-on-surface-variant leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-12 bg-primary text-on-primary rounded-2xl p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div>
              <h2 className="font-serif text-2xl mb-2">Still stuck?</h2>
              <p className="text-white/80">
                Write to the KIDS office. Always give your 9-digit User ID, if you have one.
              </p>
            </div>
            <a
              href={`mailto:${OFFICE.email}`}
              className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3.5 rounded-lg font-semibold text-sm hover:brightness-105 transition-all break-all"
            >
              <Mail className="w-4 h-4 shrink-0" aria-hidden="true" /> {OFFICE.email}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

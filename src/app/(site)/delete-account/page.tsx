"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { OFFICE } from "@/components/app/door";

/**
 * How to delete a KIDS app account — the public page the Google Play and App
 * Store listings link to. Both stores require one that works without the app
 * installed. It describes exactly what deleteAppAccount
 * (src/lib/app/delete-account.ts) does: the app's data goes, the register
 * entry and exam results stay (ruled 9 Oct 2026).
 *
 * A client page, like the privacy page beside it, because the site's
 * PageHeader animates and so can only be drawn on the client.
 */

export default function DeleteAccountPage() {
  return (
    <div>
      <PageHeader title="Delete your app account" description="The KIDS student app (SET · KIDS)" />

      <section className="w-full px-4 md:px-8 py-20 max-w-[900px] mx-auto">
        <div className="prose prose-lg max-w-none space-y-10 text-on-surface-variant">
          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">In the app</h2>
            <p className="leading-relaxed">
              Open <strong>Profile</strong>, tap <strong>Delete my account</strong>, type your password and the word DELETE.
              The account is deleted at once.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">Without the app</h2>
            <p className="leading-relaxed">
              Sign in on this website at <Link href="/app/sign-in">kidskolkata.org/app</Link>, open{" "}
              <strong>Profile</strong> and tap <strong>Delete my account</strong>. If you cannot sign in, write to{" "}
              <a href={`mailto:${OFFICE.email}`}>{OFFICE.email}</a> with your 9-digit User ID, and the office will delete it
              for you.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">What is deleted</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your app account and password, and the record of every phone signed in to it</li>
              <li>Your practice: the questions you answered, your streak and your chosen subjects</li>
              <li>Which notices you read, and your coaching day&rsquo;s ticks and study hours</li>
              <li>The app&rsquo;s own log of your sign-ins</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">What KIDS keeps</h2>
            <p className="leading-relaxed">
              Your name on the student register and your exam results. They are the institute&rsquo;s record of the papers
              you sat, and deleting the app account does not remove them. You can claim your account again at any time
              and start afresh.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

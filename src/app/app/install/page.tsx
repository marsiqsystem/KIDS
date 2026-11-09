import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play, Share, SquarePlus } from "lucide-react";
import { STORE } from "@/lib/app/native-build";
import { OFFICE } from "@/components/app/door";

/**
 * Where a family is sent to get the app. Redesign board 03, 1A.
 *
 * Public on purpose — it is the address that goes in a WhatsApp message — and it
 * carries no student's name and nothing to sign in with.
 *
 * Since the Play listing went live (Nov 2026) the button goes to Google Play;
 * the sideloaded-APK steps and Android's "Install anyway" warning are gone.
 */

export const metadata: Metadata = {
  title: "Install the SET app · KIDS",
  description: "How to install the KIDS app.",
  robots: { index: false, follow: false },
};

export default function InstallPage() {
  return (
    <div className="app-frame">
      <header className="door-hero door-hero--install">
        <Image src="/kids-icon.png" alt="" width={140} height={140} className="door-hero__ghost" aria-hidden="true" />
        <Image src="/kids-icon.png" alt="KIDS" width={56} height={56} className="door-hero__mark" priority />
        <div className="door-hero__eyebrow">Project UDAAN</div>
        <h1 className="door-hero__title">Get the KIDS app</h1>
        <p className="door-hero__sub">Five questions a day. Free, for KIDS students.</p>
      </header>

      <div className="door-body">
        {/* Since 7 Nov 2026 the app is public on Google Play; the old APK
            download (KIDS_APK_URL) is no longer offered here. */}
        <a className="k-btn k-btn--gold" href={STORE.android} target="_blank" rel="noopener noreferrer">
          <Play size={20} aria-hidden="true" /> Get it on Google Play
        </a>

        <div>
          <div className="k-label door-steps-title">Android · three steps</div>
          <ol className="inst">
            <li className="inst__step">
              <span className="inst__n">1</span>
              <span>
                Open the <strong>Play Store</strong> and search for <strong>KIDS EDU UDAAN</strong> — or tap the button
                above.
              </span>
            </li>
            <li className="inst__step">
              <span className="inst__n">2</span>
              <span>
                Check the name is exactly KIDS EDU UDAAN, then tap <strong>Install</strong>.
              </span>
            </li>
            <li className="inst__step">
              <span className="inst__n">3</span>
              <span>
                Tap <strong>Open</strong>. Sat SET in July? Tap Claim your account. New? Tap Register.
              </span>
            </li>
          </ol>
        </div>

        <div className="k-card">
          <div className="k-label">On an iPhone</div>
          <div className="inst__ios">
            <div>
              <span className="inst__ios-icon">
                <Share size={22} aria-hidden="true" />
              </span>
              <span>
                Tap <strong>Share</strong> in Safari
              </span>
            </div>
            <div>
              <span className="inst__ios-icon">
                <SquarePlus size={22} aria-hidden="true" />
              </span>
              <span>
                <strong>Add to Home Screen</strong>
              </span>
            </div>
          </div>
          <p className="door-hint">Open www.kidskolkata.org/app in Safari first.</p>
        </div>

        <p className="door-foot">
          Already installed? <Link href="/app">Open the app</Link>
          <br />
          Help videos and answers: <Link href="/help">kidskolkata.org/help</Link>
          <br />
          Stuck? Write to <a href={`mailto:${OFFICE.email}`}>{OFFICE.email}</a>
        </p>
      </div>
    </div>
  );
}

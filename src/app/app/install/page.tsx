import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download, Share, SquarePlus } from "lucide-react";
import { apkUrl } from "@/lib/app/app-version";
import { OFFICE } from "@/components/app/door";

/**
 * Where a family is sent to get the app. Redesign board 03, 1A.
 *
 * Public on purpose — it is the address that goes in a WhatsApp message — and it
 * carries no student's name and nothing to sign in with. The Android warning is
 * drawn, not described, with the words Android actually shows, because the
 * reader has just been told this file may harm their phone.
 *
 * The board prints a file size and a version under the button. Neither is
 * known here (the APK lives wherever KIDS_APK_URL points), so neither is drawn.
 * The download button hides entirely when no link is configured.
 */

export const metadata: Metadata = {
  title: "Install the SET app · KIDS",
  description: "How to install the KIDS app.",
  robots: { index: false, follow: false },
};

// The link is read at request time, so setting KIDS_APK_URL in Vercel takes
// effect without a rebuild.
export const dynamic = "force-dynamic";

export default function InstallPage() {
  const apk = apkUrl();

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
        {apk ? (
          // A plain link: the browser's own download manager handles a dropped
          // connection far better than anything we would write.
          <a className="k-btn k-btn--gold" href={apk} download>
            <Download size={20} aria-hidden="true" /> Download for Android
          </a>
        ) : (
          <div className="door-alert door-alert--gold">
            <p>
              The download is not ready yet. Ask the KIDS office for the file:{" "}
              <a href={`tel:${OFFICE.tel}`}>{OFFICE.phone}</a>
            </p>
          </div>
        )}

        <div>
          <div className="k-label door-steps-title">Android · three steps</div>
          <ol className="inst">
            <li className="inst__step">
              <span className="inst__n">1</span>
              <span>Tap the file you downloaded.</span>
            </li>
            <li className="inst__step inst__step--warn">
              <span className="inst__n">2</span>
              <div>
                <span>
                  Android may warn you. Tap <strong>Install anyway</strong>.
                </span>
                <div className="inst__phone" aria-hidden="true">
                  <p>&ldquo;This type of file can harm your device.&rdquo;</p>
                  <div>
                    <span>Cancel</span>
                    <span className="inst__go">Install anyway</span>
                  </div>
                </div>
              </div>
            </li>
            <li className="inst__step">
              <span className="inst__n">3</span>
              <span>Open the app and sign in.</span>
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
        </p>
      </div>
    </div>
  );
}

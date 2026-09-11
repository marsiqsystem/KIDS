import type { Metadata } from "next";
import Link from "next/link";
import Crest from "@/components/app/Crest";
import { apkUrl } from "@/lib/app/app-version";

/**
 * Where a student is sent to get the app. Design: none — this is a page nobody
 * asked for, written because 65 children cannot install something that is not
 * anywhere.
 *
 * Public on purpose. Every other page under /app is behind the door; this one
 * is the door's address, and it is what goes in a WhatsApp message to sixty-five
 * families. It carries no student's name and nothing to sign in with.
 *
 * Deliberately plain. The reader is fourteen, on a ₹8,000 handset, on mobile
 * data, and has been told by Android that this file may harm their phone.
 * Anything clever here is weight they pay for.
 */

export const metadata: Metadata = {
  title: "Install the SET app · KIDS",
  description: "How to install the KIDS Students Evaluation Test app.",
  robots: { index: false, follow: false },
};

// The link is read at request time, so setting KIDS_APK_URL in Vercel takes
// effect without a rebuild.
export const dynamic = "force-dynamic";

export default function InstallPage() {
  const apk = apkUrl();

  return (
    <div className="app-frame">
      <Crest />
      <div style={{ padding: "16px" }}>
        <div className="app-card">
          <h2>Get the KIDS app</h2>
          <p>
            For the Class X coaching programme. Your classes, your daily questions and your SET
            result all live in it.
          </p>
        </div>

        <div className="app-card app-card--cream" style={{ marginTop: 12 }}>
          <h3>On an Android phone</h3>
          {apk ? (
            <>
              <p>Tap the button, then open the file when it finishes downloading.</p>
              <p style={{ marginTop: 12 }}>
                {/*
                  A plain link, not a fetch or a script. It is a 6 MB file on a
                  phone that may be on 4G in a lift, and the browser's own
                  download manager handles a dropped connection far better than
                  anything we would write.
                */}
                <a className="app-btn" href={apk} download>
                  Download the app
                </a>
              </p>
            </>
          ) : (
            <p>
              The download is not ready yet. Ask the KIDS office for the file — they will send it
              to you.
            </p>
          )}
          <p style={{ marginTop: 12 }}>
            <strong>Android will warn you.</strong> It says something like &ldquo;this type of file
            can harm your device&rdquo; and asks whether to allow installing from this source. That
            is normal and it is expected — it says that about anything not from the Play Store, and
            the KIDS app is not on the Play Store. Tap <strong>Allow</strong>, then{" "}
            <strong>Install</strong>.
          </p>
        </div>

        <div className="app-card app-card--cream" style={{ marginTop: 12 }}>
          <h3>On an iPhone</h3>
          <p>
            There is no app to install — Apple does not allow it outside its own store. Open{" "}
            <strong>www.kidskolkata.org/app</strong> in Safari, tap the <strong>Share</strong>{" "}
            button at the bottom, and choose <strong>Add to Home Screen</strong>. It then opens
            like an app, with its own icon.
          </p>
        </div>

        <div className="app-card app-card--gold" style={{ marginTop: 12 }}>
          <h3>Then sign in</h3>
          <p>
            Open the app and tap <strong>I sat SET 2026 — claim my account</strong>. You need your{" "}
            <strong>nine-digit User ID</strong> from your admit card, and your{" "}
            <strong>date of birth</strong>. Then you choose your own password.
          </p>
          <p style={{ marginTop: 8 }}>
            If it will not accept your date of birth, the register does not have it. That is not
            your mistake — tell KIDS and they will give you a password instead.
          </p>
        </div>

        <p style={{ marginTop: 16, fontSize: "0.8rem", opacity: 0.7 }}>
          Already installed? <Link href="/app">Open the app</Link>.
        </p>
      </div>
    </div>
  );
}

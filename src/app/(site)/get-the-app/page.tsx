import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Award, Bell, ClipboardCheck, Sparkles, Smartphone, Apple } from "lucide-react";
import { STORE } from "@/lib/app/native-build";
import { OFFICE } from "@/components/app/door";
import PlayButton from "@/components/PlayButton";

/**
 * The public face of KIDS EDU UDAAN on the website — what it is, how to get
 * it, and which first button to press. Deliberately says nothing about the
 * coaching programme or a Phase 2 date (Umar, 9 Nov 2026: no announcement yet).
 *
 * /app/install (inside the app's own frame) is the short WhatsApp link; this is
 * the page the site's nav and banner point at.
 */

export const metadata: Metadata = {
  title: "KIDS EDU UDAAN app · KIDS",
  description:
    "KIDS EDU UDAAN is the free KIDS app for students of Classes IX to XII on the SET register. Get it on Google Play.",
};

const features = [
  { Icon: Sparkles, title: "Daily practice", desc: "A few questions every day in the subjects you choose, so nothing is forgotten." },
  { Icon: BookOpen, title: "Learn", desc: "Chapters and videos for each subject of your class." },
  { Icon: ClipboardCheck, title: "Exam", desc: "SET papers are sat in the app, at your centre, under an invigilator." },
  { Icon: Award, title: "My Record", desc: "Your SET result and marksheet, always in your pocket." },
  { Icon: Bell, title: "Notices", desc: "Messages from the KIDS office reach your phone directly." },
];

const firstSteps = [
  {
    who: "I sat SET in July",
    button: "Claim your account",
    need: "Your 9-digit User ID (on your admit card) and your date of birth.",
    video: "/help#claim",
  },
  {
    who: "I have never sat SET",
    button: "Register",
    need: "Your name as at school, date of birth, class, school and a family mobile number. The KIDS office approves it and the app gives you your User ID.",
    video: "/help#register",
  },
];

export default function GetTheAppPage() {
  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="bg-primary text-on-primary overflow-hidden">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-16 md:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="inline-block px-3 py-1 rounded bg-secondary text-on-secondary font-semibold text-sm mb-6">
              Free · For KIDS students
            </span>
            <h1 className="font-serif text-4xl md:text-6xl mb-6">KIDS EDU UDAAN</h1>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl mb-8">
              The KIDS app for students of Classes IX to XII. Practise every day, learn chapter by chapter, sit the
              Students Evaluation Test and keep your result — all on your own phone.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <PlayButton href={STORE.android} />
              <Link
                href="/help"
                className="border border-white/30 text-white px-6 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-white/10 transition-colors"
              >
                Watch the help videos
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/70">
              On the Play Store, search for <strong className="text-white">KIDS EDU UDAAN</strong>. Check the name is
              exactly that before you install.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-center gap-4">
            <img
              src="/help/app-welcome.jpg"
              alt="The app's first screen: User ID and password, and the Claim and Register buttons"
              className="w-40 md:w-56 rounded-[1.75rem] border-4 border-white/15 shadow-2xl translate-y-6"
            />
            <img
              src="/help/app-home.jpg"
              alt="The app's Home screen, asking the student to pick subjects for daily practice"
              className="w-40 md:w-56 rounded-[1.75rem] border-4 border-white/15 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ─── WHAT'S IN IT ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">In the app</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary">Everything for SET, in one place</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-xl border border-outline-variant">
                <span className="w-11 h-11 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="font-serif text-xl text-primary mb-2">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FIRST TIME ─── */}
      <section className="py-20 bg-surface-container-low border-y border-outline-variant/50">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">First time</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Which button do I press?</h2>
            <p className="text-lg text-on-surface-variant">
              Open the app and look under <strong>FIRST TIME</strong>. Choose one — never both. One student has only
              one User ID.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {firstSteps.map((s) => (
              <div key={s.button} className="bg-white p-8 rounded-xl border border-outline-variant flex flex-col">
                <p className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{s.who}</p>
                <h3 className="font-serif text-2xl text-primary mb-4">
                  Tap &ldquo;{s.button}&rdquo;
                </h3>
                <p className="text-on-surface-variant mb-6 flex-1">
                  <strong className="text-on-surface">You need:</strong> {s.need}
                </p>
                <Link href={s.video} className="text-primary font-semibold text-sm uppercase tracking-wider hover:underline underline-offset-4">
                  Watch how →
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-on-surface-variant">
            School teachers, KIDS staff and members: tap <strong>Register</strong> and choose{" "}
            <strong>Other</strong> as your class.
          </p>
        </div>
      </section>

      {/* ─── RULES + IPHONE ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-8">
          <div className="bg-secondary/5 border-2 border-secondary/20 rounded-2xl p-8">
            <h2 className="font-serif text-2xl text-primary mb-6 flex items-center gap-3">
              <Smartphone className="w-6 h-6" aria-hidden="true" /> Three things to remember
            </h2>
            <ol className="space-y-4 text-on-surface">
              <li className="flex gap-4">
                <span className="font-serif text-2xl text-secondary">1</span>
                <span>
                  <strong>One student, one account, one phone.</strong> Never make a second account. If you change
                  phones, just sign in on the new one — your account moves with you.
                </span>
              </li>
              <li className="flex gap-4">
                <span className="font-serif text-2xl text-secondary">2</span>
                <span>
                  <strong>Never delete the app or clear its data</strong> — especially while you are waiting for the
                  KIDS office. The office&apos;s approval reaches you through the app.
                </span>
              </li>
              <li className="flex gap-4">
                <span className="font-serif text-2xl text-secondary">3</span>
                <span>
                  <strong>Forgot your password?</strong> Tap <em>Forgot password</em>. Never register again.
                </span>
              </li>
            </ol>
          </div>
          <div className="bg-white border border-outline-variant rounded-2xl p-8">
            <h2 className="font-serif text-2xl text-primary mb-6 flex items-center gap-3">
              <Apple className="w-6 h-6" aria-hidden="true" /> On an iPhone
            </h2>
            <p className="text-on-surface-variant mb-4">
              The app is on Google Play for Android phones. On an iPhone, use the KIDS app in Safari instead:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-on-surface mb-6">
              <li>
                Open <Link href="/app" className="text-primary font-semibold underline underline-offset-4">www.kidskolkata.org/app</Link> in Safari.
              </li>
              <li>
                Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
              </li>
              <li>Open it from your home screen and sign in, claim or register as above.</li>
            </ol>
            <p className="text-sm text-on-surface-variant">
              Stuck? Write to the KIDS office at{" "}
              <a href={`mailto:${OFFICE.email}`} className="text-primary font-semibold">
                {OFFICE.email}
              </a>{" "}
              with your User ID, or see <Link href="/help" className="text-primary font-semibold">Help</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

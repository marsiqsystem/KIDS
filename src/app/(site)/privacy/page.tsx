"use client";

import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

export default function PrivacyPolicyPage() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        description="Last updated: October 2026"
      />

      <section className="w-full px-4 md:px-8 py-20 max-w-[900px] mx-auto">
        <div className="prose prose-lg max-w-none space-y-10 text-on-surface-variant">

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              Kabitirtha Institute of Development and Studies (&ldquo;KIDS,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting the privacy of our donors, volunteers, students, and website visitors. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or interact with our services.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">2. Information We Collect</h2>
            <h3 className="font-serif text-xl text-primary/80 mb-3">Personal Information</h3>
            <p className="leading-relaxed mb-4">When you make a donation, submit an inquiry, or register for our programs, we may collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Full name and contact details (email address, phone number, mailing address)</li>
              <li>Payment information for donation processing (handled securely by third-party payment processors)</li>
              <li>Student academic information for scholarship and evaluation purposes</li>
              <li>Volunteer preferences and areas of interest</li>
            </ul>

            <h3 className="font-serif text-xl text-primary/80 mb-3 mt-6">Non-Personal Information</h3>
            <p className="leading-relaxed">We automatically collect certain non-personal information including browser type, device information, IP address, and website usage patterns through cookies and analytics tools.</p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To process and acknowledge your donations and issue tax receipts (80G certificates)</li>
              <li>To communicate about our programs, events, and impact reports</li>
              <li>To administer the Students Evaluation Test (SET) under Project UDAAN</li>
              <li>To improve our website and services</li>
              <li>To comply with legal obligations and regulatory requirements</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">4. Data Protection</h2>
            <p className="leading-relaxed">
              We implement industry-standard security measures to protect your personal information. All donation transactions are encrypted using SSL technology. We do not store credit card or bank account details on our servers — all payment processing is handled by certified third-party providers.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">5. Information Sharing</h2>
            <p className="leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Trusted service providers who assist in operating our website and programs</li>
              <li>Government authorities when required by law or for tax compliance</li>
              <li>Partner educational institutions for program coordination</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">6. Cookies</h2>
            <p className="leading-relaxed">
              Our website uses cookies to enhance your browsing experience and analyze site traffic. You can modify your browser settings to decline cookies, though this may affect certain features of the website.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">7. Children&apos;s Privacy</h2>
            <p className="leading-relaxed">
              While our educational programs serve minors, we collect student information only with the consent of parents, guardians, or authorized school officials. Such data is used exclusively for academic evaluation and scholarship administration.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">8. Your Rights</h2>
            <p className="leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Request access to your personal data held by us</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal data (subject to legal obligations)</li>
              <li>Opt-out of marketing communications at any time</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">9. The KIDS EDU UDAAN App</h2>
            <p className="leading-relaxed">
              KIDS EDU UDAAN is the KIDS app for students of Classes IX to XII on the KIDS register. It is published on Google Play and the App Store by IQ Systems and Research Private Limited on behalf of KIDS. This section covers the app; it applies to the student pages of this website (/app) in the same way.
            </p>

            <h3 className="font-serif text-xl text-primary/80 mb-3 mt-6">What the app collects, and why</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Your register details</strong> — name, date of birth, class, stream and school. KIDS already holds these from the SET register; you type them when you register or claim your account. Used for your account and your results.</li>
              <li><strong>A family mobile number</strong>, only if you give one when registering or asking the office for help. Used by the KIDS office to contact you.</li>
              <li><strong>Your User ID and password.</strong> The password is stored only in scrambled (hashed) form; nobody at KIDS can read it.</li>
              <li><strong>A random installation number and the kind of phone</strong> (for example &ldquo;Android phone&rdquo;). One account works on one phone, and the office uses this to approve a new phone.</li>
              <li><strong>Your answers</strong> to daily and practice questions, and your exam answers and results. Used for practice, marking and your record.</li>
              <li><strong>Times you left the exam screen</strong> during a paper — collected only while an exam is open, and shown to your invigilator.</li>
              <li><strong>A notification token</strong>, if you allow notifications, so KIDS can send you notices and class reminders.</li>
            </ul>

            <h3 className="font-serif text-xl text-primary/80 mb-3 mt-6">Camera and microphone</h3>
            <p className="leading-relaxed">
              The camera is used only when you tap to scan the check-in code at your exam desk (nothing is stored), and in a live class if you turn your camera on. The microphone is used only in a live class, when you unmute. Live classes run on KIDS&apos; own class server. Screenshots are blocked while an exam paper is on screen.
            </p>

            <h3 className="font-serif text-xl text-primary/80 mb-3 mt-6">Services that handle data for us</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Firebase</strong> (Android) and <strong>Apple Push Notification service</strong> (iPhone) deliver notifications. They receive the notification token and the notice, not your results.</li>
              <li><strong>Google Drive</strong> stores recordings of live classes. A recording is shown only to the students of that class&apos;s batch.</li>
              <li><strong>YouTube</strong> plays chapter videos, in privacy-enhanced mode, and only when you tap play.</li>
              <li><strong>Expo</strong> delivers updates to the app&apos;s screens. It sees your phone&apos;s internet address and the app&apos;s version, nothing about you.</li>
            </ul>
            <p className="leading-relaxed mt-4">
              The app has no advertising and no analytics or tracking tools. Nothing is sold or shared for marketing. All data travels over encrypted connections (HTTPS).
            </p>

            <h3 className="font-serif text-xl text-primary/80 mb-3 mt-6">Deleting your account</h3>
            <p className="leading-relaxed">
              You can delete your app account at any time in the app (Profile &rarr; Delete my account) or at <a href="/delete-account" className="text-primary hover:underline">kidskolkata.org/delete-account</a>. This deletes at once your app account and password, every phone signed in to it, your practice answers, streak and subjects, notices read, coaching attendance and study hours, and the app&apos;s own log. KIDS keeps your register entry and your exam results as the institute&apos;s record of the Students Evaluation Test; you may claim your account again later and start afresh. To ask about anything KIDS holds, write to the address below.
            </p>

            <h3 className="font-serif text-xl text-primary/80 mb-3 mt-6">Age</h3>
            <p className="leading-relaxed">
              The app is meant for students aged about 13 to 18 who are on the KIDS register. It is not directed at younger children.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">10. Contact Us</h2>
            <p className="leading-relaxed">
              For any questions regarding this Privacy Policy or to exercise your rights, please contact us at:
            </p>
            <div className="mt-4 bg-surface-container p-6 rounded-xl border border-outline-variant">
              <p className="font-semibold text-on-surface">Kabitirtha Institute of Development &amp; Studies</p>
              <p>82A/H/5, Dr. Sudhir Basu Road, Kolkata - 700023</p>
              <p>Email: <a href="mailto:kids.kol.org2003@gmail.com" className="text-primary hover:underline">kids.kol.org2003@gmail.com</a></p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

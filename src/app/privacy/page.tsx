"use client";

import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

export default function PrivacyPolicyPage() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        description="Last updated: January 2025"
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
            <h2 className="font-serif text-2xl text-primary mb-4">9. Contact Us</h2>
            <p className="leading-relaxed">
              For any questions regarding this Privacy Policy or to exercise your rights, please contact us at:
            </p>
            <div className="mt-4 bg-surface-container p-6 rounded-xl border border-outline-variant">
              <p className="font-semibold text-on-surface">Kabitirtha Institute of Development &amp; Studies</p>
              <p>82A/H/5, Dr. Sudhir Basu Road, Kolkata - 700023</p>
              <p>Email: <a href="mailto:kids.kol.org2003@gmail.com" className="text-primary hover:underline">kids.kol.org2003@gmail.com</a></p>
              <p>Phone: <a href="tel:+919836414786" className="text-primary hover:underline">+91 9836414786</a></p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

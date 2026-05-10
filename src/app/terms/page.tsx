"use client";

import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

export default function TermsOfServicePage() {
  return (
    <div>
      <PageHeader
        title="Terms of Service"
        description="Last updated: January 2025"
      />

      <section className="w-full px-4 md:px-8 py-20 max-w-[900px] mx-auto">
        <div className="prose prose-lg max-w-none space-y-10 text-on-surface-variant">

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing and using the website of Kabitirtha Institute of Development and Studies (&ldquo;KIDS&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website or services.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">2. About KIDS</h2>
            <p className="leading-relaxed">
              KIDS is a registered Non-Governmental Organization (Registration No. S/1L/19796) operating in the state of West Bengal, India. We are dedicated to educational excellence, student evaluation, teacher training, and community development through our flagship Project UDAAN and associated programs.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">3. Donations</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All donations made through our website are voluntary and non-refundable unless made in error, in which case a refund may be requested within 7 days.</li>
              <li>Donations are eligible for tax exemption under Section 80G of the Income Tax Act, 1961, subject to applicable laws.</li>
              <li>KIDS reserves the right to allocate donations to the program or initiative where the need is greatest, unless the donor has specified a particular program.</li>
              <li>Donation receipts and 80G certificates will be issued via email within 30 working days of the transaction.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">4. Students Evaluation Test (SET)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Registration for SET is subject to eligibility criteria as published annually by KIDS.</li>
              <li>Examination results are final and binding. KIDS employs AI-powered OMR evaluation technology to ensure accuracy.</li>
              <li>Scholarships awarded through SET are subject to the terms and conditions published at the time of registration.</li>
              <li>KIDS reserves the right to modify examination schedules, venues, and formats with reasonable notice.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">5. Intellectual Property</h2>
            <p className="leading-relaxed">
              All content on this website — including text, images, logos, examination materials, and the KIDS OMR Evaluator software — is the intellectual property of Kabitirtha Institute of Development and Studies. Unauthorized reproduction, distribution, or modification of any content is strictly prohibited.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">6. Volunteer Engagement</h2>
            <p className="leading-relaxed">
              Volunteers who register through our website agree to abide by the KIDS Code of Conduct. KIDS reserves the right to accept or decline volunteer applications at its sole discretion. Volunteer work is unpaid and does not constitute an employment relationship.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">7. Website Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You agree to use the website only for lawful purposes and in a manner that does not infringe upon the rights of others.</li>
              <li>You shall not attempt to gain unauthorized access to any part of the website, server, or database.</li>
              <li>KIDS is not responsible for the content of external links provided on this website.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">8. Limitation of Liability</h2>
            <p className="leading-relaxed">
              KIDS provides this website and its services on an &ldquo;as-is&rdquo; basis. While we strive for accuracy, we do not guarantee that all information on the website is complete, current, or error-free. KIDS shall not be liable for any indirect, incidental, or consequential damages arising from the use of this website.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">9. Governing Law</h2>
            <p className="leading-relaxed">
              These Terms of Service are governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Kolkata, West Bengal.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">10. Changes to Terms</h2>
            <p className="leading-relaxed">
              KIDS reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting on this page. Continued use of the website after such changes constitutes acceptance of the updated terms.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl text-primary mb-4">11. Contact</h2>
            <p className="leading-relaxed">For questions about these Terms of Service, please contact:</p>
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

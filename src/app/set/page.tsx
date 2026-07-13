"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";
import FindYourCentre from "@/components/FindYourCentre";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const quickFacts = [
  { value: "19 July", label: "Exam Date (Sunday, 2026)" },
  { value: "10:00 AM", label: "Reporting Time" },
  { value: "IX – XII", label: "Eligible Classes" },
  { value: "3 Media", label: "Bengali · Hindi · Urdu" },
];

const syllabus = [
  { cls: "Class IX", scope: "Syllabus of Second Summative", board: "W.B.B.S.E." },
  { cls: "Class X", scope: "Syllabus of Second Summative", board: "W.B.B.S.E." },
  { cls: "Class XI", scope: "Syllabus of First Semester", board: "W.B.C.H.S.E." },
  { cls: "Class XII", scope: "Syllabus of Third Semester", board: "W.B.C.H.S.E." },
];

type LenisLike = { scrollTo: (target: HTMLElement | string | number, options?: { offset?: number }) => void };

export default function SetPage() {
  const mainRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const lenis = (window as unknown as { lenis?: LenisLike }).lenis;
    if (lenis) {
      lenis.scrollTo(el, { offset: -96 });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToEnrol = () => scrollTo("how-to-enrol");
  const scrollToCentre = () => scrollTo("find-centre");

  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>(".gsap-fade-up").forEach((el) => {
      gsap.fromTo(el, { y: 50, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
  }, { scope: mainRef });

  return (
    <div ref={mainRef}>
      <PageHeader
        tag="Enrolment Open · First Phase"
        title="Students Evaluation Test 2026–27"
        description="The first phase of the Students Evaluation Test (SET) will be held on Sunday, 19th July 2026. Open to students of Classes IX–XII from Bengali, Hindi & Urdu medium schools."
        backgroundImage="/WhatsApp Image 2026-05-07 at 3.05.24 AM.jpeg"
        actions={
          <>
            <button
              type="button"
              onClick={scrollToEnrol}
              className="bg-secondary text-on-secondary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider text-center hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-lg shadow-black/20"
            >
              How to Enrol
            </button>
            <button
              type="button"
              onClick={scrollToCentre}
              className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider text-center hover:bg-white/10 transition-all"
            >
              Find Your Centre
            </button>
          </>
        }
      />

      {/* Quick facts */}
      <section className="bg-primary py-12">
        <div className="w-full px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {quickFacts.map((f, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-serif text-primary-fixed mb-1">{f.value}</div>
              <div className="text-on-primary/70 text-xs font-semibold uppercase tracking-wider">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Poster + About */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
          {/* Poster (unchanged) */}
          <div className="gsap-fade-up">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-outline-variant/60">
              <img
                src="/SET-2026-Poster.jpg"
                alt="Students Evaluation Test (SET) 2026-27 First Phase official poster"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* About */}
          <div className="gsap-fade-up">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-3">About the First Phase</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6">A Merit Platform for Every Talented Student</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-4">
              The Students Evaluation Test (SET) is the flagship academic initiative of KIDS under Project UDAAN. It is a
              standardised, MCQ-based written assessment that reaches into government and government-aided schools to
              recognise and reward genuine merit &mdash; regardless of a student&apos;s background or medium of instruction.
            </p>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
              All students of Classes IX, X, XI &amp; XII from Bengali, Hindi and Urdu medium schools are invited to appear.
              Examination centres will be notified to registered students later.
            </p>

            {/* Deadline callout */}
            <div className="bg-secondary/10 border-2 border-secondary/20 rounded-xl p-6 mb-8">
              <p className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Important Deadline</p>
              <p className="text-on-surface">
                Interested students should enrol themselves with their <strong>Head of School before 4th July 2026</strong>.
                No candidature can be entertained after the deadline.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={scrollToEnrol} className="bg-primary text-on-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-colors">
                How to Enrol
              </button>
              <Link href="/udaan" className="border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary/5 transition-colors">
                About Project UDAAN
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Find your exam centre */}
      <FindYourCentre />

      {/* Syllabus */}
      <section className="py-20 bg-surface-container-low border-y border-stone-200">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl text-primary mb-4">Syllabus at a Glance</h2>
            <p className="text-lg text-on-surface-variant">The test is set on each class&apos;s prescribed board syllabus.</p>
          </div>
          <div className="gsap-fade-up overflow-x-auto rounded-xl border border-outline-variant shadow-sm max-w-4xl mx-auto">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Syllabus Scope</th>
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Board</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {syllabus.map((s, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-stone-50" : ""}>
                    <td className="px-6 py-4 font-bold text-primary">{s.cls}</td>
                    <td className="px-6 py-4">{s.scope}</td>
                    <td className="px-6 py-4 font-medium">{s.board}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enrolment closed notice */}
      <section id="how-to-enrol" className="py-20 bg-surface scroll-mt-28">
        <div className="w-full px-4 md:px-8 max-w-3xl mx-auto">
          <div className="gsap-fade-up bg-white rounded-2xl border border-outline-variant shadow-sm p-10 md:p-14 text-center">
            <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-widest bg-secondary-container/60 px-3 py-1 rounded-full mb-6">
              Notice
            </span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">
              Enrolment is Now Closed
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              Enrolment for the Students Evaluation Test 2026&ndash;27 has been closed. Enrolled students are requested to wait for their admit cards, which will be shared through their respective schools shortly.
            </p>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-primary p-12 rounded-2xl text-center text-on-primary max-w-4xl mx-auto">
            <h2 className="font-serif text-4xl mb-4">Have Questions About SET?</h2>
            <p className="text-lg max-w-2xl mx-auto mb-8 opacity-90">
              Enrolment is done through your school. For any queries, reach out to the KIDS office &mdash; our team is happy to help.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <a href="https://wa.me/918777052393" target="_blank" rel="noopener noreferrer" className="bg-secondary-container text-on-secondary-container px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:brightness-105 transition-all">
                WhatsApp: 8777052393
              </a>
              <a href="tel:+918017355971" className="border border-white/30 px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-white/10 transition-all">
                Call: 8017355971
              </a>
            </div>
            <p className="text-sm opacity-80">
              Or email us at{" "}
              <a href="mailto:kids.kol.org2003@gmail.com" className="underline hover:opacity-100">
                kids.kol.org2003@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

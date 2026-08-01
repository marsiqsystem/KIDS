"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";
import ResultLookup from "@/components/ResultLookup";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const examRecap = [
  { value: "19 July 2026", label: "Examination Held (Sunday)" },
  { value: "IX – XII", label: "Classes Appeared" },
  { value: "3 Media", label: "Bengali · Hindi · Urdu" },
];

const nextSteps = [
  {
    step: "01",
    title: "Results Go Live at 7:00 PM",
    text: "The first-phase results of the Students Evaluation Test 2026–27 will be declared today evening, at 7:00 PM.",
  },
  {
    step: "02",
    title: "Open Your Own Portal",
    text: "Scan the QR code on your admit card with your phone. It opens your personal student portal — your result is published on that same page.",
  },
  {
    step: "03",
    title: "Merit Felicitation to Follow",
    text: "Top performers and partner schools will be recognised under Project UDAAN. Details of the felicitation will be announced separately.",
  },
];

export default function SetPage() {
  const mainRef = useRef<HTMLDivElement>(null);

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
        tag="Result Day · First Phase"
        title="Students Evaluation Test 2026–27 Results"
        description="The results of the first phase of the Students Evaluation Test (SET) will be declared today, at 7:00 PM. Our heartfelt congratulations to every student who appeared."
        backgroundImage="/WhatsApp Image 2026-05-07 at 3.05.24 AM.jpeg"
      />

      {/* ─── DECLARATION BANNER ─── */}
      <section className="bg-primary py-16">
        <div className="w-full px-4 md:px-8 max-w-4xl mx-auto text-center">
          <span className="relative inline-flex items-center gap-2 text-secondary-fixed-dim text-xs font-semibold uppercase tracking-widest mb-5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary-fixed-dim" />
            </span>
            Results Awaited
          </span>
          <h2 className="font-serif text-3xl md:text-5xl text-on-primary mb-5">
            Results Will Be Declared This Evening
          </h2>
          <p className="text-on-primary/80 text-lg leading-relaxed max-w-2xl mx-auto">
            The wait is almost over. The first-phase results of the Students Evaluation Test
            2026&ndash;27 go live today at{" "}
            <strong className="text-secondary-fixed-dim">7:00 PM</strong>. We thank every student,
            parent and school for your patience and participation.
          </p>
        </div>
      </section>

      {/* ─── HOW TO SEE YOUR RESULT ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8 max-w-3xl mx-auto text-center">
          <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">Result Portal</span>
          <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">How to See Your Result</h2>
          <div className="w-24 h-1 bg-secondary mx-auto mb-8" />
          <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
            Your personal result is published on your own student portal &mdash; the same portal you
            used for the exam. Simply <strong className="text-on-surface">scan the QR code printed on
            your admit card</strong> with your phone camera, and your result will be there from 7:00 PM.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/qr"
              className="bg-primary text-on-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-colors"
            >
              Can&apos;t Scan? Open the Scanner
            </Link>
          </div>

          {/* ─── or type the ID ─── */}
          <div className="mt-12 pt-10 border-t border-outline-variant">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">
              No Admit Card With You?
            </span>
            <h3 className="font-serif text-2xl md:text-3xl text-primary mb-3">
              Enter Your Unique ID Instead
            </h3>
            <p className="text-on-surface-variant leading-relaxed mb-8 max-w-xl mx-auto">
              If you cannot scan the QR code, type your 9-digit Unique ID below and we will open
              your result page for you.
            </p>
            <ResultLookup />
          </div>

          <p className="mt-8 text-sm text-on-surface-variant">
            Keep your admit card handy. If your QR code will not open, contact your Head of School or the KIDS office.
          </p>
        </div>
      </section>

      {/* ─── EXAM RECAP ─── */}
      <section className="py-16 bg-surface-container-low border-y border-stone-200">
        <div className="w-full px-4 md:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
          {examRecap.map((f, i) => (
            <div key={i} className="gsap-fade-up">
              <div className="text-2xl md:text-3xl font-serif text-primary mb-1">{f.value}</div>
              <div className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHAT HAPPENS NEXT ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">What Happens Next</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Here&apos;s What to Expect</h2>
            <div className="w-24 h-1 bg-secondary mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {nextSteps.map((s, i) => (
              <div key={i} className="gsap-fade-up bg-white p-8 rounded-2xl border border-outline-variant shadow-sm">
                <div className="font-serif text-5xl text-primary-fixed/40 mb-4">{s.step}</div>
                <h3 className="font-serif text-xl text-on-surface mb-3">{s.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT NOTE ─── */}
      <section className="py-20 bg-surface-container-low border-t border-stone-200">
        <div className="w-full px-4 md:px-8 max-w-3xl mx-auto text-center">
          <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-3">A Word From KIDS</span>
          <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6">Every Appearing Student Is a Winner</h2>
          <p className="text-lg text-on-surface-variant leading-relaxed mb-4">
            The Students Evaluation Test is the flagship academic initiative of KIDS under Project UDAAN &mdash;
            a platform built to recognise and reward genuine merit across Bengali, Hindi and Urdu medium schools,
            regardless of a student&apos;s background.
          </p>
          <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
            Whatever the scorecard says this evening, appearing in SET is itself a step forward. We are proud of each
            one of you, and this is only the beginning of your journey with us.
          </p>
          <Link
            href="/udaan"
            className="inline-block border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary/5 transition-colors"
          >
            About Project UDAAN
          </Link>
        </div>
      </section>

      {/* ─── CONTACT / CTA ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-primary p-12 rounded-2xl text-center text-on-primary max-w-4xl mx-auto">
            <h2 className="font-serif text-4xl mb-4">Questions About Your Result?</h2>
            <p className="text-lg max-w-2xl mx-auto mb-8 opacity-90">
              If you need any help once results are out, reach out to the KIDS office &mdash; our team is happy to assist you and your school.
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

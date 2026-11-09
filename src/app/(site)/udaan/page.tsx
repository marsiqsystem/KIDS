"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { CENTRE_COUNT, CENTRE_LIST, SCHOOL_COUNT } from "@/lib/centres";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const objectives = [
  { icon: "📊", title: "Identify Talent", desc: "Unearthing merit through a standardized, merit-based evaluation framework." },
  { icon: "🧠", title: "Diagnostic Insight", desc: "Providing educators and parents with clear data on conceptual gaps." },
  { icon: "🏆", title: "Promote Excellence", desc: "Encouraging healthy academic competition and providing scholarships." },
];

const benefits = [
  { icon: "🚀", title: "Early Exposure", desc: "Introduces students to the format and pressure of competitive examinations (NEET, JEE, WBJEE) at an early stage." },
  { icon: "⚡", title: "Confidence Building", desc: "Through merit recognition and participation certificates, students gain academic self-assurance." },
  { icon: "🎯", title: "Identify Strengths", desc: "Our diagnostic reports highlight subject-wise strengths and weaknesses for career guidance." },
];

const subjects = [
  { cls: "IX - X", stream: "General", subjects: "English, Mathematics, Physical Science, Life Science, Geography, History", format: "MCQ · Phase 1 on OMR and online, Phase 2 in the app" },
  { cls: "XI - XII", stream: "Science", subjects: "Physics, Chemistry, Mathematics, Biology, Computer Science", format: "MCQ · Phase 1 on OMR and online, Phase 2 in the app" },
  { cls: "", stream: "Arts", subjects: "Political Science, Philosophy, History, Geography, Education", format: "MCQ · Phase 1 on OMR and online, Phase 2 in the app" },
  { cls: "", stream: "Commerce", subjects: "Accountancy, Business Studies, Economics, Costing & Taxation", format: "MCQ · Phase 1 on OMR and online, Phase 2 in the app" },
];

const phaseOne = [
  { num: "01", title: "Two papers", desc: "An online paper of 50 questions and a written OMR paper of 100. They are marked and shown separately — never added together." },
  { num: "02", title: "Marked by KIDS' own OMR software", desc: "Every answer sheet is scanned and read by software KIDS built for SET, and checked against the verified answer key. Sheets it flags — double marks, unclear panels, mixed-up forms — are checked and ruled by people." },
  { num: "03", title: "A marksheet that teaches", desc: "Each student's marksheet prints their own OMR sheet back to them, with a written explanation for every question and the chapters worth revising." },
  { num: "04", title: "Reports for schools", desc: "Participating schools receive their own report on how their students did." },
];

const phaseTwo = [
  { num: "01", title: "Register in the app", desc: "Phase 1 students claim their account with their User ID; new students register in the app and the KIDS office approves." },
  { num: "02", title: "At a centre, under invigilators", desc: "The paper is sat on the student's own phone, at an examination centre — not at home." },
  { num: "03", title: "Check in at the desk", desc: "Students scan the code at the invigilator's desk to open the paper. Screenshots are blocked while the paper is on screen." },
  { num: "04", title: "Results in the app", desc: "Results are published in the app, in each student's own My Record." },
];

export default function UdaanPage() {
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
        tag="PROJECT UDAAN"
        title="Students Evaluation Test (SET)"
        description="A revolutionary diagnostic assessment initiative designed to bridge the gap between academic learning and practical application."
        backgroundImage="/WhatsApp Image 2026-05-07 at 3.05.24 AM.jpeg"
      />

      {/* Stats Bar */}
      <section className="bg-primary py-12">
        <div className="w-full px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "3,253", label: "Students Analyzed" },
            { value: "98%", label: "Highest Score" },
            { value: "42", label: "Institutions" },
            { value: "08", label: "Zones Covered" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl font-serif text-primary-fixed mb-1">{s.value}</div>
              <div className="text-on-primary/70 text-xs font-semibold uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Objectives */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8 grid md:grid-cols-2 gap-16 items-center">
          <div className="gsap-fade-up">
            <h2 className="font-serif text-3xl text-primary mb-8">Objectives of SET</h2>
            <div className="space-y-8">
              {objectives.map((obj, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 text-xl">
                    {obj.icon}
                  </div>
                  <div>
                    <h3 className="font-serif text-xl mb-2">{obj.title}</h3>
                    <p className="text-on-surface-variant">{obj.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="gsap-fade-up bg-surface-container rounded-xl p-8 border border-outline-variant">
            <img src="/Evaluation Test 2.png" alt="KIDS Evaluation Test" className="w-full h-auto rounded-lg mb-6" />
            <blockquote className="border-l-4 border-primary pl-6 py-2">
              <p className="font-serif text-lg italic text-primary">
                &ldquo;Education is not the filling of a pail, but the lighting of a fire. Project UDAAN is that spark.&rdquo;
              </p>
              <cite className="block mt-4 text-sm font-semibold text-on-surface">— Kabitirtha Institute Leadership</cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-surface-container-low border-y border-stone-200">
        <div className="w-full px-4 md:px-8">
          <h2 className="font-serif text-4xl text-primary mb-12 text-center">Benefits for Students</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <div key={i} className="gsap-fade-up bg-white p-8 rounded-xl border border-stone-200">
                <span className="text-4xl mb-4 block">{b.icon}</span>
                <h3 className="font-serif text-xl text-primary mb-3">{b.title}</h3>
                <p className="text-on-surface-variant">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Table */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl text-primary mb-4">Subjects Assessed</h2>
            <p className="text-lg text-on-surface-variant">Comprehensive evaluation across secondary and higher secondary levels.</p>
          </div>
          <div className="gsap-fade-up overflow-x-auto rounded-xl border border-outline-variant shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Class</th>
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Streams</th>
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Subjects Covered</th>
                  <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider">Format</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subjects.map((s, i) => (
                  <tr key={i} className={i > 0 ? "bg-stone-50" : ""}>
                    <td className="px-6 py-4 font-bold text-primary">{s.cls}</td>
                    <td className="px-6 py-4 font-medium">{s.stream}</td>
                    <td className="px-6 py-4">{s.subjects}</td>
                    <td className="px-6 py-4 italic text-sm">{s.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Two phases */}
      <section className="py-20 bg-tertiary text-on-tertiary">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="text-sm font-semibold text-on-tertiary-container uppercase tracking-widest block mb-3">SET 2026&ndash;27</span>
            <h2 className="font-serif text-4xl mb-4">One Test, Two Phases</h2>
            <p className="opacity-80 text-lg">
              SET 2026&ndash;27 is held in two phases. The first was sat in July on paper and online; the second is sat
              in the KIDS EDU UDAAN app, at an examination centre.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="gsap-fade-up bg-tertiary-container rounded-xl p-8 border border-white/10">
              <span className="text-sm font-semibold uppercase tracking-wider text-secondary-fixed-dim">Phase 1 &middot; July 2026 &middot; Results published</span>
              <h3 className="font-serif text-2xl mt-2 mb-6">On paper, at the centres</h3>
              <ul className="space-y-5">
                {phaseOne.map((step) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-serif text-2xl text-secondary-container shrink-0 w-8">{step.num}</span>
                    <div>
                      <h4 className="font-serif text-lg">{step.title}</h4>
                      <p className="text-sm opacity-75">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/set" className="inline-block mt-8 text-sm font-semibold uppercase tracking-wider text-secondary-fixed-dim hover:underline underline-offset-4">
                Find your Phase 1 result &rarr;
              </Link>
            </div>
            <div className="gsap-fade-up bg-white/5 rounded-xl p-8 border border-white/10">
              <span className="text-sm font-semibold uppercase tracking-wider text-secondary-fixed-dim">Phase 2 &middot; Date to be announced</span>
              <h3 className="font-serif text-2xl mt-2 mb-6">In the app, at the centre</h3>
              <ul className="space-y-5">
                {phaseTwo.map((step) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-serif text-2xl text-secondary-container shrink-0 w-8">{step.num}</span>
                    <div>
                      <h4 className="font-serif text-lg">{step.title}</h4>
                      <p className="text-sm opacity-75">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/get-the-app" className="inline-block mt-8 text-sm font-semibold uppercase tracking-wider text-secondary-fixed-dim hover:underline underline-offset-4">
                Get the KIDS EDU UDAAN app &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Network — the real Phase 1 centres, from the register (src/lib/centres.ts) */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="font-serif text-4xl text-primary mb-2">Our Vast Network</h2>
              <p className="text-lg text-on-surface-variant">Empowering communities through localized examination infrastructure.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white px-8 py-4 rounded-lg border border-stone-200 shadow-sm">
                <span className="block text-3xl font-serif text-primary">{CENTRE_COUNT}</span>
                <span className="text-xs font-semibold uppercase opacity-60">Centres</span>
              </div>
              <div className="text-center bg-white px-8 py-4 rounded-lg border border-stone-200 shadow-sm">
                <span className="block text-3xl font-serif text-primary">{SCHOOL_COUNT}</span>
                <span className="text-xs font-semibold uppercase opacity-60">Schools</span>
              </div>
            </div>
          </div>
          <div className="gsap-fade-up bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h3 className="text-sm font-semibold text-primary mb-6 uppercase tracking-wider">Examination Centres &middot; Phase 1</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CENTRE_LIST.map(({ key, centre }) => (
                <div key={key} className="flex items-start gap-2 p-3 rounded-lg bg-stone-50">
                  <span className="text-secondary">📍</span>
                  <div>
                    <strong className="text-sm">{centre.name}</strong>
                    <p className="text-xs text-stone-500">
                      {centre.code} &middot; {centre.district}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-primary p-12 rounded-2xl text-center text-on-primary">
            <h2 className="font-serif text-4xl mb-6">Empower a Future Today</h2>
            <p className="text-lg max-w-2xl mx-auto mb-10 opacity-90">
              Your contributions help us maintain the technology and logistics required to bring SET to the most underserved students.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/support" className="bg-secondary-container text-on-secondary-container px-10 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:brightness-105 transition-all">
                Support Project UDAAN
              </Link>
              <Link href="/contact" className="border border-white/30 px-10 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-white/10 transition-all">
                Volunteer for SET
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

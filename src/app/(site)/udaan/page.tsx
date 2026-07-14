"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

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
  { cls: "IX - X", stream: "General", subjects: "English, Mathematics, Physical Science, Life Science, Geography, History", format: "MCQ based OMR" },
  { cls: "XI - XII", stream: "Science", subjects: "Physics, Chemistry, Mathematics, Biology, Computer Science", format: "MCQ based OMR" },
  { cls: "", stream: "Arts", subjects: "Political Science, Philosophy, History, Geography, Education", format: "MCQ based OMR" },
  { cls: "", stream: "Commerce", subjects: "Accountancy, Business Studies, Economics, Costing & Taxation", format: "MCQ based OMR" },
];

const processSteps = [
  { num: "01", title: "High-Speed Upload", desc: "Bulk scanning of physical OMR sheets into our secure cloud environment." },
  { num: "02", title: "AI Vision Scanning", desc: "Neural networks detect student IDs and bubbling patterns with pixel-level precision." },
  { num: "03", title: "Automated Scoring", desc: "Instant cross-referencing with master answer keys and negative marking logic." },
  { num: "04", title: "Smart Marksheet", desc: "Personalized performance analytics sent directly to schools and parents." },
];

const centres = [
  { school: "Garden Reach MAMG HS", zone: "Purulia Zone" },
  { school: "Momin HS", zone: "Raghunathpur Zone" },
  { school: "Siddhartha Vidyapith", zone: "Jhalda Zone" },
  { school: "Manbhum Victoria", zone: "Manbazar Zone" },
  { school: "Adarsha Vidyalaya", zone: "Balarampur Zone" },
  { school: "Kashipur Girls HS", zone: "Kashipur Zone" },
  { school: "Hura Block School", zone: "Hura Zone" },
  { school: "Neturia Academy", zone: "Neturia Zone" },
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

      {/* OMR Innovation */}
      <section className="py-20 bg-tertiary text-on-tertiary">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl text-on-tertiary-container mb-4">Our Innovation</h2>
            <h3 className="font-serif text-2xl">AI-Powered OMR Evaluator</h3>
            <p className="mt-4 max-w-2xl mx-auto opacity-80">
              Leveraging cutting-edge computer vision for instant, error-free results.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Comparison */}
            <div className="gsap-fade-up bg-tertiary-container rounded-xl p-8 border border-white/10">
              <h4 className="font-serif text-xl mb-8">Traditional vs. KIDS Innovation</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 pb-4 border-b border-white/10 text-sm font-semibold uppercase tracking-wider">
                  <span>Metric</span>
                  <span className="opacity-60">Traditional</span>
                  <span className="text-secondary-fixed-dim">KIDS AI</span>
                </div>
                {[
                  { metric: "Eval. Speed", trad: "15 Min / Page", kids: "~0.5 Seconds" },
                  { metric: "Accuracy", trad: "92.5%", kids: "99.9%" },
                  { metric: "Cost Impact", trad: "High Resource", kids: "85% Lower" },
                  { metric: "Analytics", trad: "Manual Entry", kids: "Instant Smart" },
                ].map((r, i) => (
                  <div key={i} className="grid grid-cols-3 py-4 border-b border-white/5">
                    <span className="opacity-60">{r.metric}</span>
                    <span>{r.trad}</span>
                    <span className="text-secondary-fixed-dim font-bold">{r.kids}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Process */}
            <div className="space-y-6">
              {processSteps.map((step) => (
                <div key={step.num} className="gsap-fade-up flex items-center gap-6 p-6 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-4xl font-serif text-secondary-container">{step.num}</span>
                  <div>
                    <h5 className="font-serif text-lg">{step.title}</h5>
                    <p className="text-sm opacity-70">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Network */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="font-serif text-4xl text-primary mb-2">Our Vast Network</h2>
              <p className="text-lg text-on-surface-variant">Empowering communities through localized examination infrastructure.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white px-8 py-4 rounded-lg border border-stone-200 shadow-sm">
                <span className="block text-3xl font-serif text-primary">08</span>
                <span className="text-xs font-semibold uppercase opacity-60">Centres</span>
              </div>
              <div className="text-center bg-white px-8 py-4 rounded-lg border border-stone-200 shadow-sm">
                <span className="block text-3xl font-serif text-primary">42+</span>
                <span className="text-xs font-semibold uppercase opacity-60">Schools</span>
              </div>
            </div>
          </div>
          <div className="gsap-fade-up bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h3 className="text-sm font-semibold text-primary mb-6 uppercase tracking-wider">Examination Centres</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {centres.map((c) => (
                <div key={c.school} className="flex items-start gap-2 p-3 rounded-lg bg-stone-50">
                  <span className="text-secondary">📍</span>
                  <div>
                    <strong className="text-sm">{c.school}</strong>
                    <p className="text-xs text-stone-500">{c.zone}</p>
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

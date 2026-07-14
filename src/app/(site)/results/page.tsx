"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const classResults = [
  {
    className: "Class IX",
    students: [
      { name: "Arpan Mondal", score: "98%" },
      { name: "Sanya Khan", score: "97%" },
      { name: "Rahul Sen", score: "95%" },
    ],
    extraCount: 7,
  },
  {
    className: "Class X",
    students: [
      { name: "Priyali Das", score: "99%" },
      { name: "Amitav Roy", score: "98%" },
      { name: "Nafisa Ali", score: "97%" },
    ],
    extraCount: 7,
  },
  {
    className: "Class XI",
    students: [
      { name: "Sujoy Ghosh", score: "96%" },
      { name: "Isha Dutta", score: "94%" },
      { name: "Vikram Singh", score: "93%" },
    ],
    extraCount: 7,
  },
  {
    className: "Class XII",
    students: [
      { name: "Kabir Sheikh", score: "97%" },
      { name: "Ritika Jain", score: "96%" },
      { name: "Akash Pal", score: "95%" },
    ],
    extraCount: 7,
  },
];

const bestSchools = [
  { name: "Howrah High School", award: "Highest Aggregate Growth", icon: "🏆" },
  { name: "Ranigunj Marwari Sanatan Vidyalay", award: "Overall Best Performance", icon: "🥇" },
  { name: "G.R. Nut Behari Das Boys HS", award: "Most Subject Toppers", icon: "⭐" },
];

const subjectToppers = [
  { subject: "Mathematics", student: "Arpan Mondal", faculty: "Prof. D. Mukherjee", score: "100/100" },
  { subject: "Physical Sciences", student: "Priyali Das", faculty: "Dr. S. K. Bose", score: "99/100" },
  { subject: "English Literature", student: "Kabir Sheikh", faculty: "Ms. Ananya Roy", score: "98/100" },
  { subject: "Life Sciences", student: "Nafisa Ali", faculty: "Mrs. P. Chatterjee", score: "97/100" },
];

const unsungHeroes = [
  {
    name: "Janab Iqbal Ansari",
    desc: "Recognized for his pivotal role in community outreach and mobilizing resources for Project UDAAN's grassroots initiatives in urban slums.",
    icon: "🤝",
  },
  {
    name: "Mrs. Zeenat Jahan",
    desc: "Honored for her exceptional contribution to the psychological counseling and emotional welfare of SET scholarship recipients.",
    icon: "💜",
  },
];

export default function ResultsPage() {
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
        title="SET 2025 Honors & Awards"
        tag="Academic Excellence"
        description="Celebrating the remarkable achievements of our students, the dedication of our educators, and the enduring support of our partner institutions under Project UDAAN."
      />

      {/* ─── TOP PERFORMERS ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">Merit List</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">SET 2025 Top Performers</h2>
            <div className="w-24 h-1 bg-secondary mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {classResults.map((cls, i) => (
              <div key={i} className="gsap-fade-up bg-white p-8 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-2xl text-primary">{cls.className}</h3>
                  <span className="text-2xl">🏅</span>
                </div>
                <ol className="space-y-3">
                  {cls.students.map((s, j) => (
                    <li key={j} className="flex justify-between items-center border-b border-surface-container py-3">
                      <span className="text-sm font-semibold text-on-surface">{j + 1}. {s.name}</span>
                      <span className="text-secondary font-bold">{s.score}</span>
                    </li>
                  ))}
                  <li className="text-xs text-on-surface-variant mt-4 text-center uppercase tracking-wider">
                    Plus {cls.extraCount} more achievers
                  </li>
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BEST SCHOOLS ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-4">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">Institutional Awards</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Pillars of Excellence</h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
              Recognizing our partner institutions that have shown exceptional commitment to academic progress and student development in 2025.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {bestSchools.map((school, i) => (
              <div
                key={i}
                className={`gsap-fade-up bg-white p-10 text-center border-t-4 border-primary shadow-sm rounded-xl ${
                  i === 1 ? "md:-translate-y-4" : ""
                }`}
              >
                <span className="text-4xl mb-4 block">{school.icon}</span>
                <h4 className="font-serif text-xl text-on-surface mb-2">{school.name}</h4>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">{school.award}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SUBJECT TOPPERS ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="mb-12">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-2">Subject-Wise Distinction</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary">Individual Brilliance</h2>
            <p className="text-on-surface-variant mt-2">Acknowledging the synergy between brilliant young minds and their guiding mentors.</p>
          </div>

          <div className="gsap-fade-up overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="py-4 text-sm font-semibold text-primary uppercase tracking-wider">Subject</th>
                  <th className="py-4 text-sm font-semibold text-primary uppercase tracking-wider">Student Topper</th>
                  <th className="py-4 text-sm font-semibold text-primary uppercase tracking-wider">Mentoring Faculty</th>
                  <th className="py-4 text-sm font-semibold text-primary uppercase tracking-wider text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {subjectToppers.map((t, i) => (
                  <tr key={i} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="py-6 font-semibold">{t.subject}</td>
                    <td className="py-6">{t.student}</td>
                    <td className="py-6 text-on-surface-variant">{t.faculty}</td>
                    <td className="py-6 text-right font-bold text-secondary">{t.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── UNSUNG HEROES ─── */}
      <section className="py-20 bg-primary text-on-primary">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-on-primary-container mb-4">The Unsung Heroes</h2>
            <p className="text-lg opacity-80 max-w-2xl mx-auto">
              Behind every success story lies the tireless effort of individuals who work in the shadows to build a brighter future for our children.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {unsungHeroes.map((hero, i) => (
              <div key={i} className="gsap-fade-up flex gap-6 items-start bg-primary-container p-8 rounded-xl">
                <div className="bg-primary p-4 rounded-full flex-shrink-0">
                  <span className="text-3xl">{hero.icon}</span>
                </div>
                <div>
                  <h4 className="font-serif text-xl mb-2">{hero.name}</h4>
                  <p className="text-sm opacity-90 italic">&ldquo;{hero.desc}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up text-center max-w-3xl mx-auto">
            <h3 className="font-serif text-3xl md:text-4xl text-primary mb-6">Be a Part of Their Success Story</h3>
            <p className="text-lg text-on-surface-variant mb-10">
              Your support can turn potential into performance. Join us in our mission to empower the next generation of scholars.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="bg-primary text-on-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Volunteer With Us
              </Link>
              <Link
                href="/support"
                className="border-2 border-secondary text-secondary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-secondary hover:text-white transition-all"
              >
                View Impact Report
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/* ── Data ── */
const streamToppers = [
  { rank: "01", name: "Aliya Khatoon", stream: "Science / Grade 12", score: "98.5%" },
  { rank: "02", name: "Sekh Gulfam", stream: "Mathematics / Grade 11", score: "97.2%" },
  { rank: "03", name: "Srilekha Kanjilal", stream: "English / Grade 10", score: "96.8%" },
  { rank: "04", name: "Adrika Gayen", stream: "Humanities / Grade 12", score: "96.4%" },
  { rank: "05", name: "Safia Jamil", stream: "Science / Grade 12", score: "95.9%" },
  { rank: "06", name: "Qayenat Parveen", stream: "Commerce / Grade 11", score: "95.5%" },
];

const statInsights = [
  { label: "Avg. Math Score", value: "78%", width: 78 },
  { label: "Avg. Science Score", value: "82%", width: 82 },
  { label: "Participation Growth", value: "+24%", width: 65 },
];

const aboutSetFeatures = [
  {
    icon: "✓",
    title: "Identifying Talent",
    desc: "Finding high-potential students in rural and underserved areas.",
  },
  {
    icon: "📊",
    title: "Competitive Exposure",
    desc: "Preparing students for national-level entrance examinations early on.",
  },
  {
    icon: "💡",
    title: "Analytical Thinking",
    desc: "Designing questions that challenge logic, not just rote memorization.",
  },
];

export default function ProjectsPage() {
  const mainRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Stats counter animation
    gsap.utils.toArray<HTMLElement>(".stat-number").forEach((el) => {
      const raw = el.dataset.value || "0";
      const target = parseFloat(raw.replace(/[^0-9.]/g, ""));
      const suffix = raw.replace(/[0-9.]/g, "");
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: target,
        duration: 2,
        ease: "power2.out",
        snap: { innerText: 1 },
        scrollTrigger: { trigger: el, start: "top 85%" },
        onUpdate() {
          const current = Math.round(parseFloat(el.textContent || "0"));
          el.textContent = current.toLocaleString() + suffix;
        },
      });
    });

    // Section fade-ins
    gsap.utils.toArray<HTMLElement>(".gsap-fade-up").forEach((el) => {
      gsap.fromTo(el, { y: 50, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
      });
    });
  }, { scope: mainRef });

  return (
    <div ref={mainRef}>
      {/* ─── PAGE HEADER ─── */}
      <PageHeader
        tag="IMPACT & EXCELLENCE"
        title="Projects and Achievements"
        description="At Kabitirtha Institute of Development and Studies (KIDS), we believe academic excellence is the cornerstone of social transformation. Through rigorous assessment frameworks and data-driven interventions, we are redefining educational standards for thousands of students across the region."
        backgroundImage="/Projects and Achievements.jpg"
      />

      {/* ─── PROJECT UDAAN NARRATIVE ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          {/* Header + Stats */}
          <div className="mb-16 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div className="max-w-2xl gsap-fade-up">
              <h2 className="font-serif text-4xl md:text-5xl text-primary mb-4">Project UDAAN (SET)</h2>
              <p className="text-lg text-on-surface-variant italic">
                A flagship narrative of talent identification and academic empowerment.
              </p>
            </div>
            <div className="flex gap-4 gsap-fade-up">
              {[
                { value: "10.1k", suffix: "+", label: "Participants" },
                { value: "9", suffix: "", label: "Districts" },
                { value: "40", suffix: "+", label: "Schools" },
              ].map((s, i) => (
                <div key={i} className="bg-surface-container-highest p-6 rounded-lg border border-outline-variant/30 text-center min-w-[120px] md:min-w-[140px]">
                  <p className="text-3xl md:text-4xl font-serif text-primary leading-none">
                    {s.value}<span className="text-secondary">{s.suffix}</span>
                  </p>
                  <p className="text-xs font-semibold text-on-surface-variant mt-2 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* About SET + Image Grid */}
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5 space-y-8 gsap-fade-up">
              <div className="bg-surface p-8 rounded-xl border-l-4 border-primary shadow-sm">
                <h3 className="font-serif text-2xl text-primary mb-4">About SET</h3>
                <p className="text-on-surface-variant mb-6">
                  The Students Evaluation Test (SET) is our primary academic assessment engine. Utilizing MCQ-based OMR technology, it provides a level playing field for students from diverse backgrounds to test their mettle.
                </p>
                <ul className="space-y-5">
                  {aboutSetFeatures.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                        {feat.icon}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-primary uppercase tracking-wider">{feat.title}</p>
                        <p className="text-sm text-on-surface-variant">{feat.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:col-span-7 gsap-fade-up">
              <img
                src="/Mission.jpeg"
                alt="KIDS Team at INSPIRE 2026"
                className="w-full h-[400px] md:h-[500px] object-cover rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── INNOVATION SPOTLIGHT ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="bg-primary-container rounded-3xl p-8 md:p-12 overflow-hidden relative">
            {/* Subtle grid pattern */}
            <div
              className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative z-10 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div className="gsap-fade-up">
                <h2 className="font-serif text-3xl md:text-4xl text-on-primary mb-6">
                  Innovation Spotlight: Digital Transformation
                </h2>
                <p className="text-primary-fixed text-lg mb-8 leading-relaxed">
                  To ensure transparency and rapid feedback, KIDS has pioneered the AI-Powered OMR Evaluator. This system processes thousands of results within hours, eliminating human error.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                    <span className="text-3xl">⚡</span>
                    <div>
                      <h4 className="font-serif text-lg text-white mb-1">Smart Marksheets</h4>
                      <p className="text-primary-fixed/80 text-sm">
                        Individualized performance reports with percentile ranking and subject-wise deep dives.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                    <span className="text-3xl">🤖</span>
                    <div>
                      <h4 className="font-serif text-lg text-white mb-1">AI Evaluator</h4>
                      <p className="text-primary-fixed/80 text-sm">
                        99.9% accuracy in mark identification with automated quality control checks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:block gsap-fade-up">
                <img
                  src="/Innovation Spotlight Digital Transformation.png"
                  alt="KIDS Digital Innovation"
                  className="rounded-2xl shadow-inner border border-white/20 w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SET 2025 RESULTS & PERFORMANCE ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          {/* Section Title */}
          <div className="text-center mb-16 gsap-fade-up">
            <h2 className="font-serif text-4xl md:text-5xl text-primary">SET 2025 — Results &amp; Performance Analysis</h2>
            <div className="w-24 h-1 bg-secondary mx-auto mt-4" />
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Stream Toppers Table */}
            <div className="lg:col-span-2 overflow-hidden border border-outline-variant rounded-xl bg-white shadow-sm gsap-fade-up">
              <div className="bg-primary px-6 py-4">
                <h3 className="font-serif text-xl text-white">Stream Toppers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high border-b border-outline-variant">
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider">Stream/Grade</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-wider text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {streamToppers.map((t) => (
                      <tr key={t.rank} className="hover:bg-surface-bright transition-colors">
                        <td className="px-6 py-4 font-bold text-primary">{t.rank}</td>
                        <td className="px-6 py-4 font-serif text-lg">{t.name}</td>
                        <td className="px-6 py-4 text-on-surface-variant">{t.stream}</td>
                        <td className="px-6 py-4 text-right font-bold">{t.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-stone-50 border-t border-outline-variant text-center">
                <Link href="/results" className="text-primary text-sm font-bold uppercase tracking-wider hover:underline underline-offset-4">
                  View Complete Merit List →
                </Link>
              </div>
            </div>

            {/* Key Statistical Insights Sidebar */}
            <div className="space-y-8 gsap-fade-up">
              <div className="bg-surface-container-high p-8 rounded-xl border border-outline-variant">
                <h3 className="font-serif text-xl text-primary mb-6">Key Statistical Insights</h3>
                <div className="space-y-6">
                  {statInsights.map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{s.label}</span>
                        <span className="font-bold text-on-surface">{s.value}</span>
                      </div>
                      <div className="w-full bg-outline-variant h-1.5 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full transition-all duration-1000" style={{ width: `${s.width}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-sm text-on-surface-variant leading-relaxed">
                  Our data shows a significant correlation between students participating in SET and their subsequent performance in state board examinations.
                </p>
              </div>

              {/* Performance card */}
              <div className="relative overflow-hidden group rounded-xl">
                <img
                  src="/2024 Performance Whitepaper.png"
                  alt="KIDS Performance Whitepaper"
                  className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                  <p className="text-white font-serif text-lg">2025 Performance Whitepaper</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── CELEBRATING THE ACHIEVERS ─── */}
          <div className="grid md:grid-cols-2 gap-12 items-center border-t border-outline-variant pt-16 gsap-fade-up">
            <div>
              <h3 className="font-serif text-3xl text-primary mb-6">Celebrating the Achievers</h3>
              <p className="text-lg text-on-surface-variant mb-8">
                Beyond scores, KIDS rewards excellence. Every year, we recognize the top{" "}
                <span className="font-bold text-primary">150 rank holders</span> with scholarships, certificates, and curated learning materials to support their ongoing education.
              </p>
              <div className="flex flex-wrap gap-3">
                {["🏅 Full Scholarships", "📚 Learning Kits", "⭐ Merit Certificates"].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary-fixed text-on-secondary-container rounded-full text-xs font-semibold uppercase tracking-wider">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-8">
                {[
                  { val: "150", label: "Awardees" },
                  { val: "₹12L+", label: "Disbursed" },
                ].map((s, i) => (
                  <div key={i} className="p-6 bg-surface-container-high rounded-xl text-center">
                    <p className="text-3xl font-serif font-bold text-primary">{s.val}</p>
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[
                  { val: "12", label: "Streams" },
                  { val: "100%", label: "Transparency" },
                ].map((s, i) => (
                  <div key={i} className="p-6 bg-surface-container-highest rounded-xl text-center">
                    <p className="text-3xl font-serif font-bold text-primary">{s.val}</p>
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-surface-bright border-y border-outline-variant/20">
        <div className="w-full px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center gsap-fade-up">
            <h2 className="font-serif text-4xl md:text-5xl text-primary mb-6">Join Us in Academic Excellence</h2>
            <p className="text-lg text-on-surface-variant mb-12">
              Become a life member of KIDS and help us scale Project UDAAN to more districts and provide more scholarships to deserving students. Join us in building a smarter tomorrow.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/support"
                className="bg-primary text-on-primary px-10 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-all inline-flex items-center justify-center gap-2"
              >
                🤝 Become a Life Member
              </Link>
              <Link
                href="/contact"
                className="border-2 border-secondary text-secondary px-10 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-secondary/5 transition-all inline-flex items-center justify-center gap-2"
              >
                👤 Volunteer With Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

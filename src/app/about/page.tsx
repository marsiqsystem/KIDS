"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const values = [
  { title: "Equity", desc: "Ensuring fair access to opportunities for all." },
  { title: "Excellence", desc: "Upholding the highest standards in education." },
  { title: "Integrity", desc: "Operating with transparency and ethical conduct." },
  { title: "Innovation", desc: "Pioneering new methods for educational delivery." },
  { title: "Sustainability", desc: "Building lasting institutions and communities." },
  { title: "Collaboration", desc: "Working with partners to amplify impact." },
];

const execCommittee = [
  { name: "Gopal Sonar", role: "President", desc: "Visionary educationist with 30+ years in rural development.", img: "/members/Gopal Sonar.jpeg" },
  { name: "Zakir Hossain", role: "Vice President", desc: "Expert in legal affairs and institutional governance.", img: "/members/Zakir Hossain.jpeg" },
  { name: "Md. Rizwan", role: "General Secretary", desc: "Operations specialist overseeing multi-district delivery.", img: "/members/Rizwan Sir.jpeg" },
  { name: "Md Shanawaz", role: "Vice President", desc: "Academic lead focusing on teacher training and pedagogy.", img: "/members/Md Shanawaz.jpeg" },
  { name: "Nusrat Hussain Khan", role: "Treasurer", desc: "Financial controller ensuring transparency in NGO funds.", img: "/members/Nusrat Hussain Khan.jpeg" },
];

const boardMembers = [
  { name: "Aftab Nadeem", img: "/members/AFTAB NADEEM.jpeg" },
  { name: "Anguri Khatoon", img: "/members/Anguri Khatoon.jpeg" },
  { name: "Ashraf Ali", img: "/members/Ashraf Ali.jpeg" },
  { name: "Dr. Md Nasir", img: "/members/Dr. Md Nasir.jpeg" },
  { name: "Gulshan Naaz", img: "/members/Gulshan Naaz.jpeg" },
  { name: "Imteyaz Ahmed Ansari", img: "/members/Imteyaz Ahmed Ansari.jpeg" },
  { name: "Javed Ashraf", img: "/members/Javed Ashraf.jpeg" },
  { name: "Manoj Rai", img: "/members/Manoj Rai.jpeg" },
  { name: "Maswood Ejaz", img: "/members/Maswood Ejaz.jpeg" },
  { name: "Md Iqbal Ansari", img: "/members/Md Iqbal Ansari.jpeg" },
  { name: "Md Khalid", img: "/members/Md Khalid.jpeg" },
  { name: "Md Naushad Ali", img: "/members/Md Naushad Ali.jpeg" },
  { name: "Md Shahbaaz Ali", img: "/members/Md Shahbaaz Ali.jpeg" },
  { name: "Md Shahid", img: "/members/Md Shahid.jpeg" },
  { name: "Reena Pandey", img: "/members/Reena Pandey.jpeg" },
  { name: "Wasima Parveen", img: "/members/Wasima Parveen.jpeg" },
];

const timeline = [
  { year: "2003", title: "Founding & Registration", desc: "Formally registered as an NGO, establishing roots in West Bengal with a mission to serve rural communities." },
  { year: "—", title: "Strategic Expansion", desc: "Successfully expanded operations across 9 critical districts, establishing satellite offices and mobile training units." },
  { year: "2026", title: "INSPIRE Ceremony", desc: "Grand celebration of Vision 2026 goals, marking impact on 50,000+ beneficiaries and honoring pioneer educators." },
];

export default function AboutPage() {
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
        title="About KIDS"
        description="A legacy of transformative education and social equity, built over two decades of dedicated service."
        backgroundImage="/About Header.jpg"
      />

      {/* Vision & Core Values */}
      <section className="py-20 w-full px-4 md:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="gsap-fade-up space-y-6">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest">The Core</span>
            <h2 className="font-serif text-4xl text-primary">Vision &amp; Mission</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              Kabitirtha Institute of Development and Studies (KIDS) operates as a catalyst for sustainable social change through high-quality education and professional training.
            </p>
            <div className="space-y-4 mt-8">
              <div className="flex gap-4 p-6 bg-surface-container-low rounded-lg border-l-4 border-primary">
                <div>
                  <h3 className="font-serif text-xl text-primary mb-2">Our Vision</h3>
                  <p className="text-on-surface">To create a world where educational excellence and social equity go hand-in-hand.</p>
                </div>
              </div>
              <div className="flex gap-4 p-6 bg-surface-container-low rounded-lg border-l-4 border-secondary">
                <div>
                  <h3 className="font-serif text-xl text-secondary mb-2">Our Mission</h3>
                  <p className="text-on-surface">To implement innovative educational programs and community development projects with measurable impact.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="gsap-fade-up bg-surface-container p-8 rounded-2xl">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest">Our Principles</span>
            <h2 className="font-serif text-4xl text-primary mt-2 mb-8">Core Values</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((v, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-serif text-lg text-primary">{v.title}</h4>
                  <p className="text-sm text-on-surface-variant">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-secondary uppercase">Evolution</span>
            <h2 className="font-serif text-4xl text-primary mt-2">Our Journey</h2>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-10 md:left-1/2 -translate-x-1/2 w-0.5 bg-outline-variant h-full" />
            <div className="space-y-12">
              {timeline.map((item, i) => (
                <div key={i} className="gsap-fade-up relative flex flex-col md:flex-row items-start md:items-center">
                  {i % 2 === 0 ? (
                    <>
                      <div className="w-[calc(100%-5rem)] md:w-1/2 md:pr-12 text-left md:text-right ml-20 md:ml-0">
                        <h3 className="font-serif text-xl text-primary">{item.title}</h3>
                        <p className="text-on-surface-variant">{item.desc}</p>
                      </div>
                      <div className="absolute left-10 md:left-1/2 -translate-x-1/2 z-10 w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold border-4 border-surface shadow-lg text-sm">
                        {item.year}
                      </div>
                      <div className="md:w-1/2 md:pl-12 hidden md:block" />
                    </>
                  ) : (
                    <>
                      <div className="md:w-1/2 md:pr-12 hidden md:block" />
                      <div className="absolute left-10 md:left-1/2 -translate-x-1/2 z-10 w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-white font-bold border-4 border-surface shadow-lg text-sm">
                        📍
                      </div>
                      <div className="w-[calc(100%-5rem)] md:w-1/2 md:pl-12 text-left ml-20 md:ml-0">
                        <h3 className="font-serif text-xl text-primary">{item.title}</h3>
                        <p className="text-on-surface-variant">{item.desc}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Female Brigade */}
      <section className="py-20 w-full px-4 md:px-8">
        <div className="gsap-fade-up bg-primary rounded-3xl overflow-hidden relative min-h-[500px] flex items-center">
          <img src="/The female brigade.jpg" alt="The Female Brigade" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="relative z-10 p-12 md:p-20 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-semibold text-primary-fixed uppercase tracking-widest mb-4 block">Grassroots Power</span>
              <h2 className="font-serif text-4xl text-white mb-6">The Female Brigade</h2>
              <p className="text-lg text-white opacity-90 leading-relaxed mb-8">
                Our &ldquo;Female Brigade&rdquo; is a dedicated cohort of 500+ women leaders, educators, and social activists who drive our mission on the ground. They manage health awareness drives, literacy camps, and vocational training sessions.
              </p>
              <div className="flex gap-8">
                <div>
                  <div className="text-4xl font-serif text-secondary-fixed-dim">60%</div>
                  <div className="text-xs text-white opacity-70">Field Leadership</div>
                </div>
                <div>
                  <div className="text-4xl font-serif text-secondary-fixed-dim">15k+</div>
                  <div className="text-xs text-white opacity-70">Women Empowered</div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
              <h3 className="font-serif text-xl text-white mb-4">Core Contributions</h3>
              <ul className="space-y-4 text-white/90">
                {["Rural Literacy Leadership", "Health & Hygiene Workshops", "Micro-Entrepreneurship Mentoring", "Child Advocacy & Protection"].map((item) => (
                  <li key={item} className="flex gap-3">✅ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Committee */}
      <section className="py-20 bg-white">
        <div className="w-full px-4 md:px-8">
          <div className="mb-16">
            <span className="text-sm font-semibold text-secondary uppercase">Ethical Governance</span>
            <h2 className="font-serif text-4xl text-primary mt-2">Executive Committee</h2>
            <p className="text-lg text-on-surface-variant mt-4 max-w-3xl">
              Our committee brings together expertise from academia, administration, and social service.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {execCommittee.map((m, i) => (
              <div key={i} className="gsap-fade-up group border border-outline-variant p-6 rounded-xl hover:bg-surface-container transition-colors">
                <div className="aspect-square bg-surface-container-high rounded-lg mb-6 overflow-hidden">
                  <img src={m.img} alt={m.name} className="w-full h-full object-cover object-top" />
                </div>
                <h3 className="font-serif text-lg text-primary">{m.name}</h3>
                <p className="text-sm font-semibold text-secondary uppercase mt-1">{m.role}</p>
                <p className="text-sm text-on-surface-variant mt-3">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Board Members */}
          <div className="mt-12 pt-12 border-t border-outline-variant">
            <h3 className="font-serif text-xl text-primary mb-8">Board of Members</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
              {boardMembers.map((member) => (
                <div key={member.name} className="group text-center">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-surface-container-high border-2 border-outline-variant group-hover:border-primary transition-colors mb-3">
                    <img src={member.img} alt={member.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{member.name}</p>
                  <p className="text-xs text-on-surface-variant">Member</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Achievements */}
      <section className="py-20 w-full px-4 md:px-8">
        <div className="gsap-fade-up bg-surface p-12 rounded-2xl border border-outline-variant relative overflow-hidden">
          <div className="relative z-10 grid md:grid-cols-3 gap-12 text-center">
            {[
              { icon: "🎓", value: "2,000+", label: "Teachers Trained", desc: "Enhancing rural pedagogy through specialized workshops." },
              { icon: "🏅", value: "120+", label: "Scholarships Awarded", desc: "Full academic support for talented marginalized students." },
              { icon: "🤲", value: "50k+", label: "Lives Impacted", desc: "Holistic community development since 2003." },
            ].map((s, i) => (
              <div key={i} className="space-y-4">
                <span className="text-5xl">{s.icon}</span>
                <div className="text-5xl font-serif text-primary">{s.value}</div>
                <p className="text-sm font-semibold text-secondary uppercase tracking-widest">{s.label}</p>
                <p className="text-sm text-on-surface-variant">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary-fixed-dim opacity-10 rounded-full blur-3xl" />
        </div>
      </section>
    </div>
  );
}

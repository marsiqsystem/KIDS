"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const mainRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Stats counter animation
    gsap.utils.toArray<HTMLElement>(".stat-number").forEach((el) => {
      const target = parseInt(el.dataset.value || "0", 10);
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: target,
        duration: 2,
        ease: "power2.out",
        snap: { innerText: 1 },
        scrollTrigger: { trigger: el, start: "top 85%" },
        onUpdate: function () {
          el.textContent = Math.round(parseFloat(el.textContent || "0")).toLocaleString();
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
      {/* ─── HERO ─── */}
      <section className="relative bg-primary overflow-hidden min-h-screen lg:h-screen flex items-center">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src="/Hero Section Image.jpeg"
            alt="KIDS Team Photo"
            className="w-full h-full object-cover opacity-25 grayscale hover:grayscale-0 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-primary/30" />
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 pt-36 lg:pt-28 pb-16">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-white leading-snug mb-4 tracking-tight">
              Bridging the Educational Gap for Talented Students
            </h1>

            <p className="text-white/80 leading-relaxed text-[15px] md:text-base mb-6 max-w-xl" style={{ fontFamily: "'Work Sans', sans-serif" }}>
              At KIDS, we empower students from Bengali, Hindi, and Urdu backgrounds — providing the environment, mentorship, and recognition they need to realize their dreams.
            </p>

            {/* Founder Quote Block */}
            <div className="mb-6 bg-white/[0.06] p-5 md:p-7 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              <blockquote className="font-serif text-white/95 italic leading-snug mb-4 text-lg md:text-xl lg:text-[1.4rem]">
                &ldquo;Our mission is to ensure every child, regardless of background, deserves an equal opportunity to discover their potential.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-secondary-container/60" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-secondary-container">
                    Md. Rizwan
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">
                    Founder &amp; General Secretary
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/about"
                className="bg-secondary text-on-secondary px-7 py-3.5 rounded-lg font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-300 shadow-lg shadow-black/20"
              >
                Learn More about Our Legacy
                <span className="text-base">→</span>
              </Link>
              <Link
                href="/udaan"
                className="border border-white/25 text-white px-7 py-3.5 rounded-lg font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:bg-white/10 transition-all duration-300"
              >
                Explore SET Program
              </Link>
            </div>
          </motion.div>

          {/* Right Visual — Featured Image with Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="block mt-12 lg:mt-0 lg:col-span-7"
          >
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border-2 border-white/10 aspect-[4/3] md:aspect-auto">
                <img
                  src="/Hero Section Image.jpeg"
                  alt="KIDS Leadership Team"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 right-0 md:-right-5 bg-surface/95 backdrop-blur-sm p-5 rounded-xl shadow-2xl border border-outline-variant/50 max-w-[260px] z-20">
                <p className="font-serif text-base font-semibold text-primary mb-1">Our Mission Leaders</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Dedicated educators and social workers committed to transformative rural education.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom fade for smooth transition to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-surface to-transparent z-10" />
      </section>

      {/* ─── VISION & MISSION ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="gsap-fade-up bg-surface-container-high p-12 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:shadow-xl">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Our Core Vision</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6">Empowerment Through Insight</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              To create a society where every child has the wings to fly toward their dreams, fueled by quality education and the recognition of their innate potential. We envision a future where rural and semi-urban talent is bridged with global opportunities.
            </p>
          </div>
          <div className="gsap-fade-up bg-secondary/5 p-12 rounded-2xl border-2 border-secondary/10 relative overflow-hidden group transition-all duration-300 hover:shadow-xl">
            <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-4">Our Core Mission</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6">Nurturing Tomorrow&apos;s Leaders</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              To identify, evaluate, and support high-achieving students through strategic academic assessments. Our mission is to eliminate financial and geographic barriers to education, providing a platform for excellence.
            </p>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Milestones &amp; Impact</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface">22+ Years of Educational Legacy</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "🏛️", value: 2003, label: "Foundation Year", desc: "Established Kabitirtha Institute with a vision for rural transformation." },
              { icon: "👥", value: 10100, label: "Students Reached", desc: "Directly impacting lives through our scholarship and exam programs." },
              { icon: "🎓", value: 2000, label: "Teachers Trained", desc: "Empowering educators to deliver pedagogical excellence." },
              { icon: "📍", value: 9, label: "Districts", desc: "Extending our mission across West Bengal." },
            ].map((stat, i) => (
              <div key={i} className="gsap-fade-up bg-white p-8 rounded-lg border border-outline-variant transition-all hover:shadow-lg">
                <div className="text-4xl mb-4">{stat.icon}</div>
                <div className="font-serif text-4xl text-secondary mb-1 stat-number" data-value={stat.value}>0</div>
                <p className="text-sm font-semibold text-on-surface-variant mb-2 uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm text-stone-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROJECT UDAAN PREVIEW ─── */}
      <section className="py-20 bg-primary text-on-primary">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start mb-16 gap-12">
            <div className="max-w-2xl gsap-fade-up">
              <span className="text-sm font-semibold text-on-primary-container uppercase tracking-widest block mb-4">Signature Project</span>
              <h2 className="font-serif text-3xl md:text-4xl mb-6">Project UDAAN: Student&apos;s Evaluation Test (SET)</h2>
              <p className="text-lg opacity-90 leading-relaxed mb-6">
                SET is the cornerstone of KIDS&apos; academic initiative. It serves as a rigorous, standardized testing platform that reaches deep into rural heartlands to find the stars of tomorrow.
              </p>
              <div className="bg-white/10 p-6 rounded-lg border border-white/20">
                <p className="font-semibold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
                  📍 Our 8 Active Examination Zones:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {["Murshidabad", "Nadia", "Malda", "Birbhum", "Burdwan", "Hooghly", "North 24 Pgs", "South 24 Pgs"].map((z) => (
                    <div key={z} className="bg-white/10 px-3 py-1.5 rounded text-center">{z}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-full lg:w-1/3 flex flex-col gap-4 pt-10">
              <Link href="/udaan" className="bg-secondary-container text-on-secondary-container px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider text-center hover:brightness-105 transition-all">
                Learn About SET →
              </Link>
              <Link href="/contact" className="border border-white/30 text-white px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider text-center hover:bg-white/10 transition-all">
                Contact Us
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "📊", title: "Academic Assessment", desc: "Scientific testing patterns designed by experts to evaluate core proficiency." },
              { icon: "💰", title: "Financial Support", desc: "Full and partial scholarships awarded to top performers." },
              { icon: "🌟", title: "Talent Recognition", desc: "Public validation through medals and certificates." },
              { icon: "📈", title: "Mentorship", desc: "Career guidance and academic tracking from our panel." },
            ].map((card, i) => (
              <div key={i} className="gsap-fade-up bg-primary-container p-8 rounded-lg border border-white/10 hover:-translate-y-2 transition-transform duration-300">
                <div className="text-3xl mb-6">{card.icon}</div>
                <h3 className="font-serif text-xl mb-4">{card.title}</h3>
                <p className="text-sm opacity-80">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LEADERSHIP QUOTES ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Voices of Leadership</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface">Guiding the Mission of Excellence</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {[
              {
                quote: "Our mission is not just to test knowledge, but to ignite the spark of potential in every child across the region. We believe education is the only tool for true empowerment.",
                name: "Md. Rizwan",
                role: "Founder & General Secretary",
                image: "/Rizwan Sir.jpeg",
              },
              {
                quote: "Excellence is never an accident; it is the result of high intention and sincere effort. At KIDS, we provide the platform where effort meets opportunity.",
                name: "Gopal Sonar",
                role: "President, KIDS",
                image: "/Gopal Sonar.jpeg",
              },
            ].map((leader, i) => (
              <div key={i} className="gsap-fade-up flex flex-col md:flex-row items-center gap-8 bg-surface-container-low p-8 rounded-2xl border border-outline-variant">
                <div className="w-32 h-40 flex-shrink-0 bg-stone-200 rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-outline-variant/50">
                  {leader.image ? (
                    <img src={leader.image} alt={leader.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <span className="text-4xl text-stone-400">👤</span>
                  )}
                </div>
                <div>
                  <p className="text-4xl text-primary mb-2 font-serif">&ldquo;</p>
                  <p className="text-lg italic text-on-surface mb-4">{leader.quote}</p>
                  <h4 className="font-serif text-xl text-primary">{leader.name}</h4>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">{leader.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-surface-container p-12 md:p-20 rounded-2xl relative overflow-hidden">
            <div className="max-w-2xl relative z-10">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Join the Mission</span>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6">Ready to make a lasting impact?</h2>
              <p className="text-lg text-on-surface-variant mb-10">
                Whether you are a student looking for growth, an educator wanting to contribute, or a member wanting to support a star—KIDS welcomes your involvement.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="bg-primary text-on-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity">
                  Contact Us Today
                </Link>
                <Link href="/support" className="border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary/5 transition-colors">
                  Become a Member
                </Link>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 p-10 hidden lg:block text-[200px]">
              🤝
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

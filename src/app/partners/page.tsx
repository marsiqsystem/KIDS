"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const mediaPartners = [
  { name: "The Daily Chronicle", type: "Mainstream Press Partner", icon: "📰", image: "/Local Newspaper Partner.jpeg" },
  { name: "Education TV", type: "Broadcast Partner", icon: "📺", image: "/Media Partner.jpeg" },
  { name: "Scholar's Journal", type: "Academic Publication", icon: "📄", image: "/Journal Partner.jpeg" },
  { name: "EduVoices Network", type: "Cultural Partner", icon: "🎙️", image: "/Cultural Partner.png" },
];

const participatingSchools = [
  "Howrah High School",
  "Marwari Sanatan Vidyalay",
  "G.R. Nutbehari Das",
  "Momin High School",
  "Anjuman Girls HS",
  "Scottish Church School",
  "St. Lawrence School",
  "Garden Reach High",
];

const examCentres = [
  "Garden Reach MAMG HS",
  "Kidderpore Muslim HS",
  "Islamia HS",
  "C.M.O. High School",
  "Metropolitan Inst.",
  "St. Stephens School",
];

export default function PartnersPage() {
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
        title="Our Partners in Excellence"
        tag="Global Collaboration"
        description="The power of collaboration is the cornerstone of our mission. By uniting academic rigor with corporate social responsibility, we are transforming the educational landscape for students across the region."
        backgroundImage="/Partners.jpg"
      />

      {/* ─── ASSOCIATION PARTNER ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="gsap-fade-up">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Primary Benefactor</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary mb-6">Association Partner</h2>
              <div className="w-24 h-1 bg-secondary-container mb-8" />
              <p className="text-lg text-on-surface-variant mb-6">
                We extend our deepest gratitude to <span className="font-semibold text-primary">SpeedLand Real Estate Pvt. Ltd.</span> for their unwavering commitment to educational equity.
              </p>
              <p className="text-on-surface-variant mb-8">
                Their generous support serves as the backbone for our flagship programs, <em>SET</em> and <em>INSPIRE 2026</em>, enabling us to reach thousands of talented students who lack the resources to excel. This partnership exemplifies how corporate visionaries can catalyze real social change.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-3xl">🤝</span>
                <span className="font-serif text-xl italic text-primary">SpeedLand Real Estate Pvt. Ltd.</span>
              </div>
            </div>

            <div className="gsap-fade-up">
              <div className="aspect-square bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden relative group">
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src="/Speedland.mp4" type="video/mp4" />
                </video>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="font-serif text-2xl font-bold text-white">SPEEDLAND</p>
                  <p className="text-xs font-medium tracking-tighter text-white/80 uppercase">Real Estate Pvt. Ltd.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECHNICAL PARTNERS ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="gsap-fade-up">
              <div className="aspect-video bg-surface-container-high border border-outline-variant rounded-xl shadow-sm overflow-hidden relative group">
                <img src="/Technical Partner.jpg" alt="Technical Partner" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="font-serif text-xl font-bold text-white">Technical Partner</p>
                  <p className="text-xs font-medium tracking-widest text-white/80 uppercase">Advanced Analytics Partner</p>
                </div>
              </div>
            </div>

            <div className="gsap-fade-up">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Infrastructure Support</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary mb-6">Technical Partner</h2>
              <div className="w-24 h-1 bg-secondary-container mb-8" />
              <p className="text-lg text-on-surface-variant mb-6">
                Our digital transformation is powered by specialized technical collaborators who bring cutting-edge solutions to educational assessment.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="text-2xl flex-shrink-0">🧠</span>
                  <div>
                    <h4 className="font-serif text-lg text-primary">AI-OMR Integration</h4>
                    <p className="text-on-surface-variant">Proprietary machine learning models for high-accuracy, automated grading of regional examination papers.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="text-2xl flex-shrink-0">☁️</span>
                  <div>
                    <h4 className="font-serif text-lg text-primary">Data Security</h4>
                    <p className="text-on-surface-variant">Encrypted student data management ensuring privacy and integrity across the entire network.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MEDIA & PRESS PARTNERS ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Voices of Impact</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Media &amp; Press Partners</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Collaborating with leading regional news and media outlets to highlight student achievements and educational advocacy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mediaPartners.map((partner, i) => (
              <div key={i} className="gsap-fade-up bg-white border border-outline-variant rounded-xl overflow-hidden hover:shadow-lg transition-all group">
                <div className="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center p-4">
                  <img
                    src={partner.image}
                    alt={partner.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="font-serif text-xl text-primary">{partner.name}</h3>
                  <p className="text-xs font-medium text-on-surface-variant mt-2 uppercase tracking-wider">{partner.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTICIPATING SCHOOLS ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Network of Excellence</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Participating Schools</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              A comprehensive network of 42+ prestigious institutions collaborating to identify and nurture exceptional talent through the KIDS assessment framework.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {participatingSchools.map((school, i) => (
              <div key={i} className="gsap-fade-up p-6 bg-white border border-outline-variant rounded-xl hover:shadow-md transition-all group border-l-4 border-l-primary/20 hover:border-l-primary">
                <div className="flex items-start gap-4">
                  <span className="text-2xl text-primary/40 group-hover:text-primary transition-colors">🏫</span>
                  <div>
                    <h3 className="font-serif text-lg text-primary mb-1">{school}</h3>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider">Institutional Member</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link href="/contact" className="text-sm font-semibold text-primary border-b border-primary pb-1 hover:text-secondary hover:border-secondary transition-all inline-flex items-center gap-2">
              View Full Directory of 42+ Schools →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── EXAMINATION CENTRES ─── */}
      <section className="py-20 bg-primary text-on-primary">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/3 gsap-fade-up">
              <h2 className="font-serif text-3xl md:text-4xl mb-6">Examination Centre Partners</h2>
              <p className="text-on-primary/80 mb-8 leading-relaxed">
                These 8 key institutions serve as the strategic hubs for our Student Evaluation Test (SET), providing the logistical infrastructure and academic supervision necessary for a fair and rigorous assessment environment.
              </p>
              <div className="bg-primary-container p-8 rounded-xl">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl">✅</span>
                  <span className="font-serif text-xl text-on-primary-container">Total Capacity</span>
                </div>
                <div className="text-4xl font-bold text-secondary-container font-serif">15,000+ Students</div>
                <p className="text-xs text-on-primary-container/60 mt-2 uppercase tracking-wider">Annual Evaluation Throughput</p>
              </div>
            </div>

            <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {examCentres.map((centre, i) => (
                <div key={i} className="gsap-fade-up p-6 bg-white/5 border border-white/10 rounded-lg flex items-center gap-4 group hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 flex-shrink-0 bg-secondary-container/20 rounded-full flex items-center justify-center font-serif font-bold text-secondary-container">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <span className="font-serif text-lg">{centre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-surface-container p-12 md:p-20 rounded-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/10 -mr-32 -mt-32 rounded-full" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-6">Join the Mission</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary mb-8">Become a Partner</h2>
              <p className="text-lg text-on-surface-variant mb-12">
                Is your institution or corporation ready to invest in the future of education? We are seeking partners who share our dedication to academic excellence and social impact. Let&apos;s build a brighter future together.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link
                  href="/contact"
                  className="bg-primary text-on-primary px-10 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider shadow-lg hover:opacity-90 transition-all"
                >
                  Contact for Corporate CSR
                </Link>
                <Link
                  href="/contact"
                  className="border-2 border-primary text-primary px-10 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary hover:text-on-primary transition-all"
                >
                  Academic Affiliation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

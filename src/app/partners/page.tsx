"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const serviceVerticals = [
  {
    icon: "🌐",
    title: "Digital Marketing & Web Development",
    items: [
      "High-conversion architecture for institutional landing pages.",
      "SEO and semantic web optimization for regional outreach.",
      "Responsive, mobile-first design for diverse student demographics.",
    ],
  },
  {
    icon: "🤖",
    title: "Intelligent Automation & AI Agents",
    items: [
      "Custom AI-driven OMR (Optical Mark Recognition) for high-speed grading.",
      "NLP-based sentiment analysis for student feedback loops.",
      "Automated CRM triggers for parent engagement and admissions.",
    ],
  },
  {
    icon: "🎬",
    title: "AI Filmmaking & Media Production",
    items: [
      "Generative AI video assets for rapid educational content creation.",
      "Cinematic documentation of institutional impact using AI stabilization.",
      "Dynamic localized video messaging for multi-lingual outreach.",
    ],
  },
  {
    icon: "📊",
    title: "Business Consultancy",
    items: [
      "Tech-stack auditing and infrastructure roadmap development.",
      "Competitive intelligence gathering and market analysis.",
      "Operational efficiency optimization through lean digital processes.",
    ],
  },
];

const partnershipSteps = [
  { num: "01", title: "Research", desc: "Deep-dive into organizational pain points and cultural context." },
  { num: "02", title: "Competitor Analysis", desc: "Mapping the landscape to find unique strategic advantages." },
  { num: "03", title: "Business Plan", desc: "Developing a technology-led growth and scaling blueprint." },
  { num: "04", title: "Execution", desc: "Hands-on implementation of AI systems and digital infrastructure." },
  { num: "05", title: "Optimization", desc: "Continuous monitoring and AI model fine-tuning for maximum ROI." },
];

const targetIndustries = [
  { icon: "🎓", label: "Education & EdTech" },
  { icon: "🏗️", label: "Real Estate & Infra" },
  { icon: "⚕️", label: "Healthcare Systems" },
  { icon: "🛍️", label: "Retail & E-commerce" },
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
        title="Empowering Education through Innovation"
        tag="Strategic Technology Partner"
        description="The KIDS digital ecosystem is powered by MARS (Market Analyzers and Research Solutions Pvt. Ltd.), our primary technology engine driving the future of talent identification and institutional excellence."
        backgroundImage="/Partners.jpg"
      />


      {/* ─── VISION SECTION ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="gsap-fade-up order-2 lg:order-1">
              <div className="aspect-square bg-surface-container-high border border-outline-variant rounded-2xl shadow-lg overflow-hidden relative">
                <img
                  src="/vision.png"
                  alt="Innovation and Future"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="font-serif text-2xl font-bold text-white">MARS</p>
                  <p className="text-xs font-medium tracking-widest text-white/80 uppercase">Market Analyzers and Research Solutions</p>
                </div>
              </div>
            </div>

            <div className="gsap-fade-up order-1 lg:order-2">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Our North Star</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary mb-6">Vision: The Autonomous Business Operating System</h2>
              <div className="w-24 h-1 bg-secondary-container mb-8" />
              <p className="text-lg text-on-surface-variant mb-8">
                At MARS, we are building a future where the friction of operational management disappears. Our flagship conceptual framework is the <span className="font-semibold text-primary">Autonomous Business Operating System</span>.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="text-2xl flex-shrink-0">🎙️</span>
                  <div>
                    <h4 className="font-serif text-lg text-primary mb-1">Voice-First Command Center</h4>
                    <p className="text-on-surface-variant">Imagine a CEO speaking tasks directly into a microphone: &ldquo;Analyze Q3 student performance and adjust outreach budgets for the top 5 performing schools.&rdquo;</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="text-2xl flex-shrink-0">🧠</span>
                  <div>
                    <h4 className="font-serif text-lg text-primary mb-1">Cognitive Automation</h4>
                    <p className="text-on-surface-variant">The system interprets the intent, cross-references data silos, generates an execution plan, and triggers the necessary digital agents to complete the work autonomously.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICE VERTICALS ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Service Verticals</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Technological Excellence Across Dimensions</h2>
            <div className="w-24 h-1 bg-secondary-container mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {serviceVerticals.map((v, i) => (
              <div key={i} className="gsap-fade-up p-8 bg-white border border-outline-variant rounded-xl hover:shadow-xl transition-all">
                <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-3xl">
                  {v.icon}
                </div>
                <h3 className="font-serif text-2xl text-primary mb-4">{v.title}</h3>
                <ul className="space-y-3 text-on-surface-variant">
                  {v.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-secondary mt-1">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICE INNOVATION ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-surface-container rounded-2xl p-10 md:p-16 border border-outline-variant relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-5 text-[180px] leading-none translate-x-8 -translate-y-8 select-none">
              🔍
            </div>
            <div className="relative z-10">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Service Innovation</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary mb-8">Service Innovation: Integrated Growth Systems</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                  <p className="text-lg text-on-surface-variant mb-6">
                    MARS delivers a seamless integration of data-driven strategy, intelligent automation, and creative execution. We don't just solve isolated problems; we build the digital infrastructure that enables businesses and institutions to scale autonomously.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-white rounded-xl border border-outline-variant">
                      <div className="text-4xl font-serif text-primary mb-2">500k+</div>
                      <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Annual Processing Capacity</div>
                    </div>
                    <div className="p-6 bg-white rounded-xl border border-outline-variant">
                      <div className="text-4xl font-serif text-primary mb-2">40%</div>
                      <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Average Conversion Growth</div>
                    </div>
                  </div>
                  <p className="text-on-surface-variant italic border-l-4 border-secondary-container pl-6">
                    &ldquo;Our mission is to close the gap between vision and execution. By embedding ourselves within our clients' operations, we transform technological potential into measurable business outcomes.&rdquo;
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-widest border-b border-outline-variant pb-2">Key Outcomes</h4>
                  <ul className="space-y-4 text-on-surface-variant">
                    <li className="flex gap-3 items-start"><span className="text-secondary mt-1">🔀</span> <span><span className="font-semibold text-on-surface">Omnichannel Growth:</span> Full-stack digital marketing and lead generation pipelines.</span></li>
                    <li className="flex gap-3 items-start"><span className="text-secondary mt-1">☑️</span> <span><span className="font-semibold text-on-surface">Intelligent Operations:</span> Custom AI agents and RPA workflows for friction-less management.</span></li>
                    <li className="flex gap-3 items-start"><span className="text-secondary mt-1">🚀</span> <span><span className="font-semibold text-on-surface">Cinematic Brand Storytelling:</span> AI-enhanced media production that resonates across global platforms.</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5-STEP MODEL ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Our Methodology</span>
            <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">The 5-Step Embedded Partnership Model</h2>
            <p className="text-on-surface-variant">How we integrate and transform institutions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-px bg-outline-variant" />
            {partnershipSteps.map((step, i) => (
              <div key={i} className="gsap-fade-up flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 bg-white border-2 border-primary rounded-full flex items-center justify-center text-primary font-bold text-xl mb-6 shadow-md relative z-10">
                  {step.num}
                </div>
                <h4 className="font-serif text-lg text-primary mb-2">{step.title}</h4>
                <p className="text-sm text-on-surface-variant">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TARGET CLIENTS ─── */}
      <section className="py-20 bg-surface">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="gsap-fade-up">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Industry Expertise</span>
              <h2 className="font-serif text-3xl md:text-4xl text-primary mb-6">Target Clients & Industries</h2>
              <div className="w-24 h-1 bg-secondary-container mb-8" />
              <p className="text-lg text-on-surface-variant mb-10">
                While our roots are in <span className="font-semibold text-primary">Educational Empowerment</span>, MARS provides specialized technology consulting across high-growth sectors.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {targetIndustries.map((ind, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white border border-outline-variant rounded-lg">
                    <span className="text-2xl">{ind.icon}</span>
                    <span className="font-semibold text-on-surface">{ind.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gsap-fade-up bg-primary/5 p-10 md:p-12 rounded-2xl border border-primary/10">
              <h4 className="font-serif text-2xl text-primary mb-6">Our Promise</h4>
              <p className="text-on-surface-variant italic mb-8 text-lg">
                &ldquo;We don&apos;t just deliver software; we deliver competitive advantage. In a world of generic solutions, MARS provides the surgical precision required to lead your market.&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-outline-variant shrink-0 shadow-sm">
                  <img src="/Technical Partner.jpg" alt="MARS Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-semibold text-primary">Technical Strategy Board</div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider">MARS Pvt. Ltd.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-primary text-on-primary rounded-2xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 text-[260px] leading-none translate-x-8 translate-y-8 select-none">
              🚀
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-serif text-3xl md:text-4xl mb-6">Ready to Scale Your Vision?</h2>
              <p className="text-lg text-on-primary/80 mb-10">
                Collaborate with the same technical team driving the KIDS digital transformation. MARS offers bespoke solutions for organizations looking to integrate advanced data and automation into their core operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="text-secondary-container text-xl">✉️</span>
                  <span className="text-sm font-semibold uppercase tracking-wider">mail@marspvtltd.com</span>
                </div>
                <div className="w-px h-6 bg-on-primary/20 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <span className="text-secondary-container text-xl">🌐</span>
                  <span className="text-sm font-semibold uppercase tracking-wider">www.marspvtltd.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

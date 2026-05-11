"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const zones = [
  { name: "Kolkata", desc: "Primary HQ & Central Examination Cell" },
  { name: "Howrah", desc: "School Outreach & Vocational Training" },
  { name: "Hooghly", desc: "Regional Merit Coordination" },
  { name: "North 24 Parganas", desc: "UDAAN Project Implementation" },
  { name: "South 24 Parganas", desc: "Rural Education Programs" },
  { name: "Raniganj & Asansol", desc: "Industrial Belt Education Cell" },
  { name: "Purulia", desc: "Tribal Welfare & Literacy" },
  { name: "Other Districts", desc: "Statewide Support Operations" },
];

export default function ContactPage() {
  const mainRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inquiryType: "Volunteer Inquiries",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>(".gsap-fade-up").forEach((el) => {
      gsap.fromTo(el, { y: 50, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
  }, { scope: mainRef });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMsg("Please fill in all required fields.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div ref={mainRef}>
      <PageHeader
        title="Get in Touch"
        description="Building bridges for educational excellence and social transformation. Reach out for partnership and support inquiries."
        backgroundImage="/Contact.jpg"
      />

      {/* Office & Form */}
      <section className="w-full px-4 md:px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Info */}
        <div className="lg:col-span-5 space-y-12">
          <div className="gsap-fade-up">
            <h2 className="font-serif text-2xl text-primary mb-6">Main Office</h2>
            <div className="flex gap-4 items-start mb-6">
              <span className="text-2xl text-primary">📍</span>
              <div>
                <p className="text-lg font-semibold">Kabitirtha Institute of Development &amp; Studies</p>
                <address className="not-italic text-on-surface-variant">
                  82A/H/5, Dr. Sudhir Basu Road<br />
                  Kolkata-700023, West Bengal
                </address>
              </div>
            </div>
            <div className="flex gap-4 items-start mb-6">
              <span className="text-2xl text-primary">📞</span>
              <div>
                <a href="tel:+919836414786" className="text-lg font-semibold text-primary hover:underline">
                  +91 9836414786
                </a>
              </div>
            </div>
            <div className="flex gap-4 items-start mb-6">
              <span className="text-2xl text-primary">✉️</span>
              <div>
                <a href="mailto:kids.kol.org2003@gmail.com" className="text-lg font-semibold text-primary hover:underline">
                  kids.kol.org2003@gmail.com
                </a>
              </div>
            </div>

            {/* Google Maps Embed */}
            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-outline-variant">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3685.8095477937!2d88.33!3d22.51!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjLCsDMwJzM2LjAiTiA4OMKwMTknNDguMCJF!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin&q=Dr+Sudhir+Basu+Road,+Kolkata+700023"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="KIDS Office Location - Dr. Sudhir Basu Road, Kolkata 700023"
              />
            </div>
          </div>

          <div className="gsap-fade-up bg-surface-container p-8 rounded-xl border-l-4 border-primary">
            <h3 className="font-serif text-xl text-primary mb-4">Executive</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span>👤</span>
                <span className="font-semibold">Md. Rizwan</span>
                <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">General Secretary</span>
              </div>
              <div className="flex items-center gap-3">
                <span>🕐</span>
                <span>Mon - Sat: 10:00 AM - 6:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        <div className="lg:col-span-7 gsap-fade-up bg-white p-10 rounded-xl shadow-sm border border-stone-200">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="font-serif text-3xl text-primary mb-4">Message Sent!</h2>
                <p className="text-lg text-on-surface-variant mb-8">
                  Thank you, {formData.name}. We&apos;ve received your inquiry and will get back to you shortly.
                </p>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setFormData({ name: "", email: "", inquiryType: "Volunteer Inquiries", message: "" });
                  }}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-all"
                >
                  Send Another Inquiry
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
                <h2 className="font-serif text-2xl text-primary mb-8">Inquiry Form</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Full Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Inquiry Type</label>
                    <select name="inquiryType" value={formData.inquiryType} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30">
                      <option>Volunteer Inquiries</option>
                      <option>School Partnerships</option>
                      <option>General Information</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Message *</label>
                    <textarea name="message" rows={5} value={formData.message} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                  </div>

                  {status === "error" && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full bg-primary text-white py-4 font-semibold text-sm uppercase tracking-widest rounded-lg hover:bg-primary-container shadow-md transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {status === "loading" ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      "Submit Inquiry"
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Regional Presence */}
      <section className="bg-surface-container-low py-20">
        <div className="w-full px-4 md:px-8">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-4xl text-primary mb-4">Regional Presence</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Our widespread network ensures educational support and examination facilities are accessible across West Bengal.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {zones.map((z, i) => (
              <div key={i} className="gsap-fade-up bg-white p-6 rounded-lg border border-stone-100 hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center mb-4 group-hover:bg-secondary group-hover:text-white transition-colors text-sm">
                  📍
                </div>
                <h4 className="font-serif text-xl mb-2">{z.name}</h4>
                <p className="text-sm text-on-surface-variant">{z.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full px-4 md:px-8 py-20">
        <div className="gsap-fade-up bg-primary-container rounded-2xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-[200px]">🤝</div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-serif text-4xl mb-6">Partner with Purpose</h2>
            <p className="text-lg mb-8 opacity-90">
              KIDS NGO welcomes schools, NGOs, and corporations to collaborate for a brighter, more equitable education landscape.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:kids.kol.org2003@gmail.com" className="bg-white text-primary font-semibold text-sm px-8 py-4 rounded-lg uppercase tracking-wider hover:bg-surface-container transition-colors">
                Email General Secretary
              </a>
              <button className="border border-white text-white font-semibold text-sm px-8 py-4 rounded-lg uppercase tracking-wider hover:bg-white/10 transition-colors">
                Download Annual Audit
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

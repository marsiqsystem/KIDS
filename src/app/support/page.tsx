"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export default function SupportPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    fathersName: "",
    spouseName: "",
    childrenMale: "",
    childrenFemale: "",
    address: "",
    city: "",
    pinCode: "",
    state: "",
    mobile: "",
    whatsapp: "",
    email: "",
    nationality: "",
    dob: "",
    gender: "",
    qualification: "",
    occupation: "",
    paymentMode: "",
    agreeTerm: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useGSAP(() => {
    gsap.utils.toArray<HTMLElement>(".gsap-fade-up").forEach((el) => {
      gsap.fromTo(el, { y: 50, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
  }, { scope: mainRef });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.mobile.trim()) errs.mobile = "Mobile number is required";
    if (!formData.email.trim()) errs.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Please enter a valid email address";
    if (!formData.agreeTerm) errs.agreeTerm = "You must agree to the undertaking";
    if (!formData.paymentMode) errs.paymentMode = "Please select a payment mode";
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // In a real app, send data to the backend here
    setSubmitted(true);
  };

  return (
    <div ref={mainRef}>
      <PageHeader
        title="Join Us"
        description="Become a Life Member of Kabitirtha Institute of Development & Studies and support our mission of excellence in education."
        backgroundImage="/Join Us.jpeg"
      />

      <section className="w-full px-4 md:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="gsap-fade-up bg-white p-8 md:p-12 rounded-xl border border-stone-200 shadow-sm"
              >
                <div className="text-center mb-10">
                  <h2 className="font-serif text-3xl text-primary mb-2">Application for Life Time Membership</h2>
                  <p className="text-on-surface-variant">Please fill out the form below to initiate your membership process.</p>
                </div>
                
                <form className="space-y-8" onSubmit={handleSubmit}>
                  {/* Personal Information */}
                  <div>
                    <h3 className="font-serif text-xl text-primary mb-4 pb-2 border-b border-stone-200">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30 ${errors.name ? "border-error" : "border-outline-variant"}`} />
                        {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Father&apos;s Name</label>
                        <input type="text" name="fathersName" value={formData.fathersName} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Name of Spouse</label>
                        <input type="text" name="spouseName" value={formData.spouseName} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">No. of Children (Male)</label>
                        <input type="number" name="childrenMale" value={formData.childrenMale} onChange={handleChange} min="0" className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">No. of Children (Female)</label>
                        <input type="number" name="childrenFemale" value={formData.childrenFemale} onChange={handleChange} min="0" className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Address</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Pin Code</label>
                        <input type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">State</label>
                        <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Mobile No. *</label>
                        <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30 ${errors.mobile ? "border-error" : "border-outline-variant"}`} />
                        {errors.mobile && <p className="text-error text-sm mt-1">{errors.mobile}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">WhatsApp No.</label>
                        <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Email *</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30 ${errors.email ? "border-error" : "border-outline-variant"}`} />
                        {errors.email && <p className="text-error text-sm mt-1">{errors.email}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Nationality</label>
                        <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Date of Birth</label>
                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Gender</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30">
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Qualification</label>
                        <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="font-semibold text-xs text-on-surface-variant uppercase tracking-wider">Occupation</label>
                        <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full px-4 py-3 border border-outline-variant rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-surface/30" />
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div>
                    <h3 className="font-serif text-xl text-primary mb-4 pb-2 border-b border-stone-200">Membership Fee</h3>
                    <p className="text-on-surface-variant mb-4">Mode of payment of <strong>Rs. 10,000/-</strong> to be paid for life membership. Please select:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {["CASH", "CHEQUE", "NEFT", "RTGS"].map((mode) => (
                        <label key={mode} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${formData.paymentMode === mode ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-container'}`}>
                          <input type="radio" name="paymentMode" value={mode} checked={formData.paymentMode === mode} onChange={handleChange} className="w-4 h-4 text-primary focus:ring-primary border-stone-300" />
                          <span className="font-semibold text-sm">{mode}</span>
                        </label>
                      ))}
                    </div>
                    {errors.paymentMode && <p className="text-error text-sm mt-2">{errors.paymentMode}</p>}
                  </div>

                  {/* Undertaking */}
                  <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant">
                    <h3 className="font-serif text-xl text-primary mb-4">Undertaking</h3>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="mt-1">
                        <input type="checkbox" name="agreeTerm" checked={formData.agreeTerm} onChange={handleChange} className="w-5 h-5 text-primary focus:ring-primary border-stone-300 rounded" />
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        I affirm that as a life-member of KIDS, I shall abide by the code of ethics of KIDS. I further undertake that I shall uphold the fair name of KIDS by maintaining high standards of integrity and professionalism.
                      </p>
                    </label>
                    {errors.agreeTerm && <p className="text-error text-sm mt-2">{errors.agreeTerm}</p>}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-5 rounded-lg font-serif text-xl hover:bg-primary-container transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    Submit Application
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-12 rounded-xl border border-stone-200 shadow-sm text-center"
              >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="font-serif text-3xl text-primary mb-4">Application Submitted, {formData.name}!</h2>
                <p className="text-lg text-on-surface-variant mb-6 max-w-2xl mx-auto">
                  Your life membership application has been successfully received. Please proceed with the payment of <strong>Rs. 10,000/-</strong> via your selected method ({formData.paymentMode}).
                </p>

                {/* Bank Details */}
                <div className="bg-surface-container p-6 rounded-xl mb-8 text-left max-w-2xl mx-auto">
                  <h3 className="font-serif text-lg text-primary mb-4">Bank Details for Transfer</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-on-surface-variant font-semibold">Account Name</p>
                      <p>Kabitirtha Institute of Development & Studies</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant font-semibold">Bank</p>
                      <p>State Bank of India</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant font-semibold">Account No.</p>
                      <p className="font-mono">Contact office for details</p>
                    </div>
                    <div>
                      <p className="text-on-surface-variant font-semibold">IFSC Code</p>
                      <p className="font-mono">Contact office for details</p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 mt-4 border-t border-outline-variant pt-4">
                    Once payment is completed, please email the transaction reference to <a href="mailto:kids.kol.org2003@gmail.com" className="text-primary hover:underline">kids.kol.org2003@gmail.com</a>.
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setSubmitted(false)}
                    className="bg-primary text-white px-8 py-3 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-all"
                  >
                    Back to Form
                  </button>
                  <Link
                    href="/"
                    className="border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary/5 transition-all"
                  >
                    Return Home
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="bg-surface-container-high p-6 rounded-lg flex items-center gap-4 border border-outline-variant/50 hover:shadow-md transition-shadow">
              <span className="text-4xl">🛡️</span>
              <div>
                <p className="text-xs text-on-surface-variant uppercase font-semibold">Registered NGO</p>
                <p className="font-serif text-xl text-primary">S/1L/19796</p>
              </div>
            </div>
            <div className="bg-surface-container-high p-6 rounded-lg flex items-center gap-4 border border-outline-variant/50 hover:shadow-md transition-shadow">
              <span className="text-4xl">📜</span>
              <div>
                <p className="text-xs text-on-surface-variant uppercase font-semibold">Legacy of Service</p>
                <p className="font-serif text-xl text-primary">22+ Years</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="bg-surface-container py-20">
        <div className="w-full px-4 md:px-8 text-center">
          <span className="text-5xl block mb-6">✨</span>
          <h2 className="font-serif text-4xl text-primary mb-6">A Circle of Excellence</h2>
          <p className="max-w-3xl mx-auto text-lg text-on-surface-variant leading-relaxed">
            By joining as a life member, you become an integral part of our mission to foster educational equity. Your involvement ensures our rigorous academic standards and our commitment to marginalized students continue to thrive.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-12 opacity-60">
            {[
              { icon: "🏛️", label: "80G Certified" },
              { icon: "📊", label: "Annual Audits" },
              { icon: "🌐", label: "Global Standards" },
            ].map((badge) => (
              <div key={badge.label} className="flex flex-col items-center">
                <span className="text-4xl mb-2">{badge.icon}</span>
                <span className="text-sm font-semibold">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import PageHeader from "@/components/PageHeader";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const morePhotos = [
  "/gallery/IMG-20260504-WA0060.jpg",
  "/gallery/IMG-20260504-WA0065.jpg",
  "/gallery/IMG-20260504-WA0070.jpg",
  "/gallery/IMG-20260504-WA0075.jpg",
  "/gallery/IMG-20260504-WA0080.jpg",
  "/gallery/IMG-20260504-WA0085.jpg",
  "/gallery/IMG-20260504-WA0090.jpg",
  "/gallery/IMG-20260504-WA0095.jpg",
  "/gallery/IMG-20260504-WA0100.jpg",
  "/gallery/IMG-20260504-WA0105.jpg",
  "/gallery/IMG-20260504-WA0110.jpg",
  "/gallery/IMG-20260504-WA0115.jpg",
  "/gallery/IMG-20260505-WA0000.jpg",
  "/gallery/IMG-20260505-WA0006.jpg",
  "/gallery/IMG-20260505-WA0010.jpg",
  "/gallery/IMG-20260505-WA0015.jpg",
  "/gallery/IMG-20260505-WA0020.jpg",
  "/gallery/IMG-20260505-WA0025.jpg",
  "/gallery/IMG-20260505-WA0030.jpg",
  "/gallery/IMG-20260505-WA0035.jpg",
  "/gallery/IMG-20260505-WA0040.jpg",
  "/gallery/IMG-20260505-WA0046.jpg",
  "/gallery/IMG-20260505-WA0050.jpg",
  "/gallery/IMG-20260505-WA0055.jpg",
];

export default function GalleryPage() {
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
        title="Visualizing Our Legacy"
        tag="Photo Gallery"
        description="Capturing decades of transformation, academic brilliance, and community empowerment."
        backgroundImage="/Gallery.jpg"
      />

      {/* ─── FEATURED: PROJECT UDAAN 2026 ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 gsap-fade-up">
              <div className="relative overflow-hidden rounded-xl shadow-xl group">
                <img
                  className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
                  src="/gallery/IMG-20260505-WA0010.jpg"
                  alt="Project UDAAN 2026"
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-primary/90 to-transparent text-white">
                  <span className="text-xs font-semibold uppercase tracking-widest bg-white/20 px-3 py-1 rounded backdrop-blur-sm mb-4 inline-block">Flagship Initiative</span>
                  <h2 className="font-serif text-3xl md:text-4xl mb-2">Project UDAAN 2026</h2>
                  <p className="text-stone-200">Empowering 50,000 students through specialized skill-based learning and digital literacy.</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 lg:pl-12 gsap-fade-up">
              <h3 className="font-serif text-3xl text-primary mb-4">A Narrative of Hope</h3>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-6">
                Through Project UDAAN, we aren&apos;t just building schools; we are crafting ecosystems of opportunity. This collection showcases the first milestones of our 2026 vision.
              </p>
              <Link href="/projects" className="text-sm font-semibold text-primary border-b-2 border-primary pb-1 hover:gap-4 transition-all inline-flex items-center gap-2">
                EXPLORE COLLECTION →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHAPTER I: THE ACADEMIC JOURNEY (3-col masonry) ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="gsap-fade-up">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Chapter I</span>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface">The Academic Journey</h2>
            </div>
            <p className="text-on-surface-variant max-w-sm hidden md:block">Witness the focus and determination of our students preparing for SET exams and higher excellence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Column 1 */}
            <div className="space-y-8 md:mt-10 gsap-fade-up">
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260504-WA0010.jpg" alt="Student Focus, Central Campus" />
              </div>
            </div>
            {/* Column 2 */}
            <div className="space-y-8 gsap-fade-up">
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260504-WA0015.jpg" alt="Collaborative Learning Space" />
              </div>
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260504-WA0020.jpg" alt="Preparation for SET Exams" />
              </div>
            </div>
            {/* Column 3 */}
            <div className="space-y-8 md:mt-10 gsap-fade-up">
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260504-WA0025.jpg" alt="Mastery in Mathematics" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHAPTER II & III: CELEBRATION & CULTURE (BENTO) ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-12 gsap-fade-up">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Chapter II &amp; III</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface">Celebration &amp; Culture</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-auto md:h-[800px]">
            <div className="md:col-span-2 md:row-span-2 gsap-fade-up group relative overflow-hidden rounded-xl bg-stone-200">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/gallery/IMG-20260504-WA0030.jpg" alt="Annual Convocation 2024" />
            </div>
            <div className="md:col-span-2 gsap-fade-up group relative overflow-hidden rounded-xl bg-stone-200">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/gallery/IMG-20260504-WA0045.jpg" alt="The Annual Mela" />
            </div>
            <div className="md:col-span-1 gsap-fade-up group relative overflow-hidden rounded-xl bg-stone-200">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/gallery/IMG-20260504-WA0040.jpg" alt="Female Brigade Workshop" />
            </div>
            <div className="md:col-span-1 gsap-fade-up group relative overflow-hidden rounded-xl bg-stone-200">
              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="/gallery/IMG-20260504-WA0055.jpg" alt="Evening of Mushaira" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHAPTER IV: EMPOWERING EDUCATORS ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="gsap-fade-up">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-4">Chapter IV</span>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-6">Empowering Educators</h2>
              <p className="text-lg text-on-surface-variant mb-8">
                Our impact is multiplied through our teachers. We invest in continuous professional development, modern pedagogy training, and psychological support for our faculty.
              </p>
              <div className="grid grid-cols-2 gap-8 border-t border-outline-variant pt-8">
                <div>
                  <span className="block font-serif text-4xl text-primary">120+</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Workshops Annually</span>
                </div>
                <div>
                  <span className="block font-serif text-4xl text-primary">1500+</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Trained Educators</span>
                </div>
              </div>
            </div>
            <div className="gsap-fade-up grid grid-cols-2 gap-4">
              <img className="rounded-xl shadow-md aspect-[3/4] object-cover mt-12" src="/gallery/IMG-20260504-WA0071.jpg" alt="Professional Development Seminar" />
              <img className="rounded-xl shadow-md aspect-[3/4] object-cover" src="/gallery/IMG-20260504-WA0054.jpg" alt="Bridging Tradition & Technology" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHAPTER V: INSPIRE GRAND AWARDS (3-col masonry) ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="gsap-fade-up">
              <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">Chapter V</span>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface">INSPIRE Grand Awards</h2>
            </div>
            <p className="text-on-surface-variant max-w-sm hidden md:block">Celebrating the extraordinary achievements of our students through the prestigious INSPIRE awards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Column 1 */}
            <div className="space-y-8 md:mt-10 gsap-fade-up">
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260505-WA0031.jpg" alt="Excellence in Innovation Felicitations" />
              </div>
            </div>
            {/* Column 2 */}
            <div className="space-y-8 gsap-fade-up">
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260504-WA0039.jpg" alt="Symbols of Achievement" />
              </div>
            </div>
            {/* Column 3 */}
            <div className="space-y-8 md:mt-10 gsap-fade-up">
              <div className="group relative overflow-hidden rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <img className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" src="/gallery/IMG-20260505-WA0036.jpg" alt="Grand Finale Stage Moment" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MORE FROM OUR JOURNEY ─── */}
      <section className="py-20 bg-surface-container-low">
        <div className="w-full px-4 md:px-8">
          <div className="text-center mb-12 gsap-fade-up">
            <span className="text-sm font-semibold text-primary uppercase tracking-widest block mb-2">More Moments</span>
            <h2 className="font-serif text-3xl md:text-4xl text-on-surface">From Our Journey</h2>
          </div>
          {/* Masonry layout — images render at natural aspect ratio */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {morePhotos.map((src, i) => (
              <div key={i} className="gsap-fade-up break-inside-avoid group relative overflow-hidden rounded-xl hover:shadow-xl transition-all">
                <img className="w-full object-cover transition-transform duration-500 group-hover:scale-105" src={src} alt={`KIDS Gallery Photo ${i + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="w-full px-4 md:px-8">
          <div className="gsap-fade-up bg-primary rounded-2xl p-12 md:p-20 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 border-[40px] border-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 border-[60px] border-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>
            <div className="relative z-10">
              <h2 className="font-serif text-3xl md:text-4xl mb-6">Be Part of the Story</h2>
              <p className="text-lg text-stone-200 max-w-xl mx-auto mb-10">
                Our journey is fueled by collective effort. Whether you want to volunteer your expertise or witness our impact firsthand, there is a place for you in our legacy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact" className="bg-white text-primary px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-stone-100 transition-colors">
                  Volunteer With Us
                </Link>
                <Link href="/support" className="border-2 border-white/40 text-white px-8 py-4 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-white/10 transition-colors">
                  Attend Next Event
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

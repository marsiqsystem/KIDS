"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MapPin, School, X } from "lucide-react";
import { CENTRE_COUNT, CENTRE_LIST, DISTRICT_COUNT, SCHOOL_COUNT } from "@/lib/centres";

/** Column count per breakpoint, matched to the grid classes below. */
const COLUMNS: { min: number; cols: number }[] = [
  { min: 1280, cols: 7 },
  { min: 768, cols: 4 },
  { min: 640, cols: 3 },
  { min: 0, cols: 2 },
];

function columnsForWidth(width: number) {
  return (COLUMNS.find((b) => width >= b.min) ?? COLUMNS[COLUMNS.length - 1]).cols;
}

export default function CentreDirectory() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [cols, setCols] = useState(COLUMNS[0].cols);

  // The panel is inserted after the last card of the open card's row, so it needs
  // the live column count. Nothing is open on first paint, so this cannot desync
  // the server-rendered markup.
  useEffect(() => {
    const measure = () => setCols(columnsForWidth(window.innerWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rowEndOfOpen =
    openIndex === null
      ? null
      : Math.min(Math.floor(openIndex / cols) * cols + cols - 1, CENTRE_LIST.length - 1);

  return (
    <section id="centre-directory" className="py-20 bg-surface-container-low border-y border-outline-variant/40 scroll-mt-28">
      <div className="w-full px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-sm font-semibold text-secondary uppercase tracking-widest block mb-3">
            Centre Allocation &middot; First Phase
          </span>
          <h2 className="font-serif text-4xl text-primary mb-4">All {CENTRE_COUNT} Examination Centres</h2>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            {SCHOOL_COUNT} schools across {DISTRICT_COUNT} districts have been allocated to the {CENTRE_COUNT} centres
            below. Tap any centre to see the schools reporting there on exam day.
          </p>
        </div>

        <div className="gsap-fade-up grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {CENTRE_LIST.map(({ key, centre }, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={key} className="contents">
                <button
                  type="button"
                  id={`centre-tab-${key}`}
                  aria-expanded={isOpen}
                  aria-controls={`centre-panel-${key}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className={`group flex h-full flex-col rounded-xl border-2 p-3 text-left transition-all ${
                    isOpen
                      ? "border-primary bg-primary text-on-primary shadow-lg shadow-primary/20"
                      : "border-outline-variant/70 bg-surface-container-lowest hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider ${
                        isOpen ? "bg-white/15 text-primary-fixed" : "bg-primary/8 text-primary"
                      }`}
                    >
                      {centre.code}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-primary-fixed" : "text-on-surface-variant/60 group-hover:text-primary"
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  <h3
                    className={`text-sm font-semibold leading-snug line-clamp-3 ${
                      isOpen ? "text-on-primary" : "text-on-surface"
                    }`}
                  >
                    {centre.name}
                  </h3>

                  <div className="mt-auto pt-3">
                    <p
                      className={`text-[11px] leading-tight mb-2 ${
                        isOpen ? "text-on-primary/70" : "text-on-surface-variant"
                      }`}
                    >
                      {centre.district}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${
                        isOpen ? "text-primary-fixed" : "text-secondary"
                      }`}
                    >
                      <School className="w-3 h-3" aria-hidden="true" />
                      {centre.schools.length} {centre.schools.length === 1 ? "school" : "schools"}
                    </span>
                  </div>
                </button>

                {rowEndOfOpen === i && openIndex !== null && (
                  <SchoolPanel index={openIndex} onClose={() => setOpenIndex(null)} />
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Allocation is final as per the official register. Enrolled students should confirm their own centre with the{" "}
          <a href="#find-centre" className="text-primary font-semibold underline underline-offset-4 hover:text-primary-container">
            Unique ID locator
          </a>{" "}
          below.
        </p>
      </div>
    </section>
  );
}

function SchoolPanel({ index, onClose }: { index: number; onClose: () => void }) {
  const { key, centre } = CENTRE_LIST[index];

  return (
    <div
      id={`centre-panel-${key}`}
      role="region"
      aria-labelledby={`centre-tab-${key}`}
      className="col-span-full animate-centre-panel rounded-2xl border-2 border-primary/25 bg-surface-container-lowest shadow-lg overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 bg-primary/5 border-b border-primary/15 p-5 md:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 font-mono text-xs font-bold tracking-wider text-on-primary">
              {centre.code}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{centre.district}</span>
          </div>
          <h3 className="font-serif text-2xl md:text-3xl text-primary leading-snug">{centre.name}</h3>
          <div className="mt-2 flex gap-2">
            <MapPin className="w-4 h-4 shrink-0 text-secondary mt-1" aria-hidden="true" />
            <address className="not-italic text-on-surface-variant leading-relaxed">{centre.address}</address>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Close the school list for ${centre.code}`}
          className="shrink-0 rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
          Schools Reporting to This Centre &middot; {centre.schools.length}
        </p>

        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {centre.schools.map((school, i) => (
            <li
              key={`${school.code}-${i}`}
              className="flex items-start gap-3 rounded-lg border border-outline-variant/60 bg-surface px-3 py-2.5"
            >
              <span className="shrink-0 font-mono text-[11px] font-bold tracking-wider text-secondary pt-0.5">
                {school.code}
              </span>
              <span className="text-sm text-on-surface leading-snug">{school.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

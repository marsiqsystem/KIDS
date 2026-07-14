"use client";

import { useState } from "react";
import { MapPin, Search, LoaderCircle, TriangleAlert } from "lucide-react";
import { CENTRE_COUNT, CENTRES, DISTRICT_COUNT, type Centre } from "@/lib/centres";
import GetDirections from "@/components/GetDirections";

export default function FindYourCentre() {
  const [uniqueId, setUniqueId] = useState("");
  const [centre, setCentre] = useState<Centre | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleChange = (value: string) => {
    setUniqueId(value.replace(/\D/g, "").slice(0, 9));
    setCentre(null);
    setError(null);
  };

  /**
   * Resolves against the enrolled register on the server. We deliberately do
   * not decode the ID in the browser: digits 2-3 of any 9-digit number look
   * like a valid centre, so a typo would send a student to the wrong school.
   */
  const handleLocate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uniqueId.length !== 9) {
      setCentre(null);
      setError("Please enter all 9 digits of your Unique ID.");
      return;
    }

    setChecking(true);
    setError(null);
    setCentre(null);

    try {
      const res = await fetch(`/api/centre?id=${uniqueId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message ?? "We couldn't look that ID up. Please try again.");
        return;
      }

      // The server vouches for the ID and names the centre; we render it from
      // the table bundled with this build, so code and data can never disagree.
      const match = CENTRES[data.centreKey];
      if (!match) {
        setError("We couldn't look that ID up. Please refresh the page and try again.");
        return;
      }
      setCentre(match);
    } catch {
      setError("We couldn't reach the register — please check your connection and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section id="find-centre" className="py-20 bg-primary scroll-mt-28 overflow-hidden">
      <div className="w-full px-4 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — map illustration */}
        <div className="gsap-fade-up relative">
          <div className="relative rounded-2xl overflow-hidden border border-secondary-fixed/25 shadow-2xl shadow-black/30 bg-surface">
            <MapIllustration />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { value: CENTRE_COUNT, label: "Exam Centres" },
              { value: DISTRICT_COUNT, label: "Districts" },
              { value: "19 July", label: "Exam Day" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 py-4 px-2">
                <div className="font-serif text-2xl md:text-3xl text-primary-fixed">{s.value}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/60 mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — locator card */}
        <div className="gsap-fade-up">
          <span className="text-sm font-semibold text-secondary-fixed-dim uppercase tracking-widest block mb-3">
            Centre Locator
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-on-primary mb-4">Find Your Exam Centre</h2>
          <p className="text-lg text-on-primary/75 leading-relaxed mb-8 max-w-xl">
            Every enrolled student has a 9-digit Unique ID printed on their admit card. Enter it below and we&apos;ll
            show you exactly where to report on exam day &mdash; then guide you there.
          </p>

          <div className="bg-surface rounded-2xl shadow-2xl shadow-black/25 p-6 md:p-8">
            <form onSubmit={handleLocate} noValidate>
              <label htmlFor="unique-id" className="block text-sm font-semibold text-on-surface mb-2">
                Your 9-Digit Unique ID
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="unique-id"
                  name="unique-id"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="9 digits, e.g. 4 1 5 1 0 . . . ."
                  value={uniqueId}
                  onChange={(e) => handleChange(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby="unique-id-hint"
                  className={`flex-1 min-w-0 rounded-lg border-2 bg-white px-4 py-3.5 font-mono text-lg tracking-[0.3em] text-on-surface placeholder:text-on-surface-variant/35 placeholder:tracking-[0.2em] outline-none transition-colors focus:border-primary ${
                    error ? "border-error" : "border-outline-variant"
                  }`}
                />
                <button
                  type="submit"
                  disabled={checking}
                  className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-7 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-colors disabled:cursor-wait disabled:opacity-70"
                >
                  {checking ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Checking&hellip;
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" aria-hidden="true" />
                      Locate
                    </>
                  )}
                </button>
              </div>
              <p id="unique-id-hint" className="mt-2.5 text-xs text-on-surface-variant">
                Enter the Unique ID exactly as printed on your admit card. We check it against the
                official register &mdash; the 2nd and 3rd digits are your centre, so an ID beginning{" "}
                <span className="font-mono text-on-surface">
                  4<span className="text-primary font-bold">15</span>
                </span>{" "}
                reports to CTR-15.
              </p>
            </form>

            <div aria-live="polite">
              {error && (
                <div className="mt-6 flex gap-3 rounded-xl border-2 border-error/20 bg-error/5 p-4">
                  <TriangleAlert className="w-5 h-5 shrink-0 text-error mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-on-surface leading-relaxed">{error}</p>
                </div>
              )}

              {centre && (
                <div className="mt-6 rounded-xl border-2 border-secondary/25 bg-secondary/5 p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 font-mono text-xs font-bold tracking-wider text-on-primary">
                      {centre.code}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
                      {centre.district}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl text-primary leading-snug mb-3">{centre.name}</h3>

                  <div className="flex gap-2.5 mb-6">
                    <MapPin className="w-4 h-4 shrink-0 text-secondary mt-1" aria-hidden="true" />
                    <address className="not-italic text-on-surface-variant leading-relaxed">{centre.address}</address>
                  </div>

                  <GetDirections centre={centre} />
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 text-sm text-on-primary/55 leading-relaxed max-w-xl">
            Centre allocation is final as per the official register. If your Unique ID does not resolve, please contact
            your Head of School or the KIDS office.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Decorative, brand-tinted map graphic — no external tiles or API key needed. */
function MapIllustration() {
  return (
    <svg
      viewBox="0 0 600 460"
      className="w-full h-auto block"
      role="img"
      aria-label="Illustration of a map with an exam centre marked by a pin"
    >
      <defs>
        <linearGradient id="fc-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fafaeb" />
          <stop offset="100%" stopColor="#efefe0" />
        </linearGradient>
        <linearGradient id="fc-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eec068" />
          <stop offset="100%" stopColor="#7b5805" />
        </linearGradient>
        <filter id="fc-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#570000" floodOpacity="0.25" />
        </filter>
      </defs>

      <rect width="600" height="460" fill="url(#fc-sky)" />

      {/* City blocks */}
      <g fill="#570000" opacity="0.06">
        <rect x="36" y="44" width="150" height="104" rx="8" />
        <rect x="232" y="30" width="118" height="76" rx="8" />
        <rect x="398" y="52" width="164" height="96" rx="8" />
        <rect x="44" y="212" width="120" height="90" rx="8" />
        <rect x="430" y="206" width="132" height="112" rx="8" />
        <rect x="60" y="352" width="180" height="76" rx="8" />
        <rect x="330" y="366" width="140" height="64" rx="8" />
      </g>

      {/* River */}
      <path
        d="M-10 336 C 90 316, 150 268, 250 262 S 420 300, 520 254 L 620 232 L 620 300 C 520 330, 430 372, 320 344 S 110 386, -10 400 Z"
        fill="#07274d"
        opacity="0.1"
      />

      {/* Roads */}
      <g stroke="#570000" strokeOpacity="0.18" strokeLinecap="round" fill="none">
        <path d="M0 178 H600" strokeWidth="14" />
        <path d="M300 0 V460" strokeWidth="14" />
        <path d="M0 330 H600" strokeWidth="9" />
        <path d="M120 0 V460" strokeWidth="7" />
        <path d="M470 0 V460" strokeWidth="7" />
        <path d="M0 92 H600" strokeWidth="5" />
        <path d="M0 402 H600" strokeWidth="5" />
      </g>
      <g stroke="#fafaeb" strokeOpacity="0.85" strokeWidth="1.5" strokeDasharray="10 12" fill="none">
        <path d="M0 178 H600" />
        <path d="M300 0 V460" />
      </g>

      {/* Approach route from the edge to the pin */}
      <path
        d="M60 430 L 120 430 L 120 330 L 300 330 L 300 254"
        fill="none"
        stroke="#7b5805"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="9 9"
      >
        <animate attributeName="stroke-dashoffset" from="72" to="0" dur="2.4s" repeatCount="indefinite" />
      </path>
      <circle cx="60" cy="430" r="7" fill="#570000" />
      <circle cx="60" cy="430" r="3" fill="#fafaeb" />

      {/* Locator rings */}
      <g fill="none" stroke="#7b5805">
        <circle cx="300" cy="254" r="34" strokeWidth="2" opacity="0.35">
          <animate attributeName="r" values="26;58" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0" dur="2.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="254" r="26" strokeWidth="2" opacity="0.25" />
      </g>

      {/* Pin */}
      <g filter="url(#fc-shadow)">
        <path
          d="M300 176 c-24 0 -43 19 -43 43 c0 32 43 74 43 74 s43 -42 43 -74 c0 -24 -19 -43 -43 -43 z"
          fill="url(#fc-pin)"
        />
        <circle cx="300" cy="219" r="15" fill="#fafaeb" />
        {/* School glyph inside the pin */}
        <path d="M300 210 l11 6 v1 h-22 v-1 z M292 219 h16 v8 h-16 z" fill="#570000" />
      </g>

      {/* Label card */}
      <g>
        <rect x="352" y="176" width="196" height="52" rx="10" fill="#570000" />
        <text x="368" y="200" fill="#ffdad4" fontFamily="monospace" fontSize="13" fontWeight="bold" letterSpacing="1.5">
          YOUR CENTRE
        </text>
        <text x="368" y="217" fill="#ffffff" fontFamily="sans-serif" fontSize="12" opacity="0.75">
          Report by 10:00 AM
        </text>
      </g>

      {/* Other centre markers */}
      <g fill="#570000" opacity="0.4">
        {[
          [120, 92],
          [470, 92],
          [120, 178],
          [470, 330],
          [300, 402],
          [180, 330],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />
        ))}
      </g>
    </svg>
  );
}

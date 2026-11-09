"use client";

import { useState } from "react";

/**
 * The four help films, each in Bengali and Hindi-Urdu. Files live in
 * public/help (720p H.264, faststart, 2–3 MB each) — there is no YouTube
 * channel. preload="none" so a phone on data downloads only the film it plays.
 */

type Lang = "bn" | "hi";

const LANGS: { id: Lang; label: string }[] = [
  { id: "bn", label: "বাংলা · Bengali" },
  { id: "hi", label: "हिंदी / اردو · Hindi-Urdu" },
];

const FILMS = [
  { n: 1, id: "install", title: "Install the app and open it", desc: "Finding KIDS EDU UDAAN on the Play Store, and which button to press the first time.", mins: "2 min" },
  { n: 2, id: "claim", title: "Sat SET in July? Claim your account", desc: "Your User ID from the admit card and your date of birth — and what to do if the app cannot find your date of birth.", mins: "3 min" },
  { n: 3, id: "register", title: "New student? Register", desc: "For students who have never had a KIDS User ID. Three steps, then the KIDS office approves.", mins: "2½ min" },
  { n: 4, id: "signin", title: "Sign in, forgot password, new phone", desc: "Signing in, three wrong tries, Forgot password, and moving to a new phone.", mins: "2 min" },
];

export default function HelpVideos() {
  const [lang, setLang] = useState<Lang>("bn");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3 mb-12" role="group" aria-label="Language of the videos">
        <span className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant mr-2">Language</span>
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLang(l.id)}
            aria-pressed={lang === l.id}
            className={`px-5 py-2.5 rounded-full border-2 font-semibold text-sm transition-colors ${
              lang === l.id
                ? "bg-primary border-primary text-on-primary"
                : "border-outline-variant text-on-surface hover:border-primary"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-8">
        {FILMS.map((f) => (
          <article key={f.id} id={f.id} className="scroll-mt-36 bg-white rounded-2xl border border-outline-variant overflow-hidden flex flex-col">
            <div className="bg-stone-900">
              <video
                key={`${f.id}-${lang}`}
                controls
                playsInline
                preload="none"
                poster={`/help/help-${f.n}.jpg`}
                className="w-full aspect-[9/16] object-contain"
              >
                <source src={`/help/help-${f.n}-${lang}.mp4`} type="video/mp4" />
              </video>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                Video {f.n} · {f.mins}
              </p>
              <h3 className="font-serif text-xl text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">{f.desc}</p>
              <a
                href={`/help/help-${f.n}-${lang}.mp4`}
                download
                className="mt-4 text-sm font-semibold text-primary hover:underline underline-offset-4"
              >
                Download to share on WhatsApp ↓
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

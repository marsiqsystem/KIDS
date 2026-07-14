"use client";

import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <Link
      href="/set"
      aria-label="Students Evaluation Test 2026-27 — view details"
      className="group fixed top-0 left-0 right-0 z-[60] h-10 flex items-center justify-center bg-primary text-on-primary overflow-hidden border-b border-secondary-container/30"
    >
      <div className="flex items-center gap-2 md:gap-3 px-3 whitespace-nowrap text-[11px] md:text-sm font-sans">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary-fixed-dim" />
        </span>
        <span className="font-semibold tracking-wide">
          <span className="hidden sm:inline">Students Evaluation Test (SET) 2026&ndash;27 First Phase</span>
          <span className="sm:hidden">SET 2026&ndash;27 First Phase</span>
        </span>
        <span className="hidden md:inline text-on-primary/70">
          &mdash; Exam on Sunday, 19th July 2026
        </span>
        <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-secondary-fixed-dim">
          Click Here
          <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </span>
      </div>
    </Link>
  );
}

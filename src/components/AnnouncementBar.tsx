"use client";

import Link from "next/link";

export default function AnnouncementBar() {
  return (
    <Link
      href="/set"
      aria-label="Students Evaluation Test 2026-27 results — declared today at 7 PM"
      className="group fixed top-0 left-0 right-0 z-[60] h-10 flex items-center justify-center bg-primary text-on-primary overflow-hidden border-b border-secondary-container/30"
    >
      <div className="flex items-center gap-2 md:gap-3 px-3 whitespace-nowrap text-[11px] md:text-sm font-sans">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary-fixed-dim" />
        </span>
        <span className="font-semibold tracking-wide">
          <span className="hidden sm:inline">SET 2026&ndash;27 First Phase Results</span>
          <span className="sm:hidden">SET 2026&ndash;27 Results</span>
        </span>
        <span className="hidden md:inline text-on-primary/70">
          &mdash; Declared today at 7:00 PM
        </span>
        <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-secondary-fixed-dim">
          Check Now
          <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </span>
      </div>
    </Link>
  );
}

"use client";

import { useState } from "react";

/**
 * The reading-mode switch, and the wrapper it acts on.
 *
 * The whole report is server-rendered inside `children` — both papers, every
 * section, always. This component adds only the sticky bar and the `data-view`
 * attribute; results.css does the hiding. Nothing about a student or a school
 * crosses to the browser to make the switch work, and a reader with JavaScript
 * off gets the complete report rather than an empty page.
 *
 * It is a Client Component wrapping Server Component children — the slot
 * pattern: `children` is rendered on the server and passed through, so none of
 * the report's code is shipped to the browser.
 */
export type PaperMode = "both" | "online" | "written";

const MODES: { id: PaperMode; label: string }[] = [
  { id: "both", label: "Both papers" },
  { id: "online", label: "Online only" },
  { id: "written", label: "Written only" },
];

export default function PaperView({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaperMode>("both");

  return (
    <div data-view={mode}>
      <div className="sticky top-0 z-20 bg-[var(--cream-surface)] border-b border-[var(--cream-muted)] shadow-[var(--shadow-sm)]">
        <div className="w-full px-4 md:px-8 py-3 flex flex-wrap gap-x-[22px] gap-y-3.5 items-center justify-between">
          <div className="flex flex-wrap gap-x-3.5 gap-y-2.5 items-center">
            <span className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--ink-muted)] font-bold">
              Reading
            </span>
            <div
              role="group"
              aria-label="Which paper to report"
              className="inline-flex gap-1 p-1 bg-[var(--cream-muted)] rounded-full"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`text-[0.82rem] font-semibold tracking-[0.02em] px-4 py-[9px] rounded-full border border-transparent whitespace-nowrap cursor-pointer ${
                    mode === m.id
                      ? "bg-[var(--maroon)] text-[var(--cream)]"
                      : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--maroon)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-[18px] gap-y-2 items-center text-[0.78rem] text-[var(--ink-muted)]">
            <span className="inline-flex items-center gap-[7px]" data-paper="online">
              <span className="w-4 h-[9px] bg-[var(--maroon)] rounded-full inline-block" />
              Online paper, of 50
            </span>
            <span className="inline-flex items-center gap-[7px]" data-paper="written">
              <span className="w-4 h-[9px] bg-[var(--royal-blue)] rounded-full inline-block" />
              Written paper, of 100
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

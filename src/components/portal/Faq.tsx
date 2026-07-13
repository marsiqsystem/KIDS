"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * The questions students actually ask.
 *
 * Every answer here must be true of the system we are shipping -- these are
 * promises. "Your answers are saved as you go" is only sayable because the exam
 * really does keep a draft; do not add an answer the code cannot honour.
 */
const QA = [
  {
    q: "What if my phone dies?",
    a: "Your answers are saved as you go, so they are not lost. Get your phone charged or borrow a charger, scan your QR code again, and you will come back to the questions with your answers still there. Charge fully the night before so this never happens.",
  },
  {
    q: "What if my internet drops?",
    a: "Once your paper has loaded, the test keeps working with no signal at all. Keep answering. Your phone reconnects by itself and sends your answers when the signal returns. Do not close the page.",
  },
  {
    q: "Can I use someone else's phone?",
    a: "Yes — the test is tied to your admit card, not to a phone. Scan your own QR code on the borrowed phone. But that person cannot then use the same phone for their own test at the same time, so plan ahead.",
  },
  {
    q: "What if I can't scan the QR code?",
    a: "Clean the camera, hold the card flat under good light, and hold steady about 15 cm away. If it still will not scan, tell your exam coordinator at the centre straight away — do not wait until 10:30.",
  },
  {
    q: "What if I'm late?",
    a: "Come anyway and go straight to your room. The online test still ends at 11:00 for everyone, so arriving late means less time — which is why you should report by 10:00.",
  },
  {
    q: "Can I change an answer after I've chosen it?",
    a: "Yes. Nothing is locked in until you press Submit. Go back to any question as often as you like and change your answer.",
  },
] as const;

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="portal-card p-5 sm:p-7">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold sm:text-[1.3rem]">
        Questions
      </h2>

      <dl className="mt-3 sm:columns-2 sm:gap-10">
        {QA.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="break-inside-avoid border-b border-[var(--cream-muted)] last:border-0"
            >
              <dt>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium sm:text-[0.95rem]">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </dt>
              {isOpen && (
                <dd className="pb-4 pr-6 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {item.a}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

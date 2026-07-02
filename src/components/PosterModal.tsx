"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "set_poster_seen_2026";

export default function PosterModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* sessionStorage unavailable — ignore */
    }
  };

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Students Evaluation Test 2026-27 announcement"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-surface rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/50"
          >
            {/* Header strip */}
            <div className="flex items-center justify-between bg-primary text-on-primary px-5 py-3 shrink-0">
              <span className="text-xs md:text-sm font-semibold uppercase tracking-widest">
                Latest Announcement
              </span>
              <button
                onClick={close}
                aria-label="Close announcement"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Poster (unchanged) */}
            <div className="overflow-y-auto bg-surface-container-low">
              <img
                src="/SET-2026-Poster.jpg"
                alt="Students Evaluation Test (SET) 2026-27 First Phase — Exam on Sunday 19th July 2026"
                className="w-full h-auto"
              />
            </div>

            {/* CTA footer */}
            <div className="shrink-0 p-4 md:p-5 bg-surface border-t border-outline-variant/50 flex flex-col sm:flex-row gap-3">
              <Link
                href="/set"
                onClick={close}
                className="flex-1 bg-primary text-on-primary text-center px-6 py-3 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-colors"
              >
                View Full Details &rarr;
              </Link>
              <button
                onClick={close}
                className="sm:flex-none border-2 border-primary text-primary px-6 py-3 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary/5 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

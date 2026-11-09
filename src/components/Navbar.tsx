"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Projects & Achievements", href: "/projects" },
  { name: "Gallery", href: "/gallery" },
  { name: "Partners", href: "/partners" },
  { name: "Results", href: "/results" },
  { name: "Help", href: "/help" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-10 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-200"
          : "bg-white border-b border-stone-200"
      }`}
    >
      <div className="w-full px-4 md:px-8 flex justify-between items-center h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="KIDS Logo"
            className="h-14 w-auto object-contain"
          />
          <div className="hidden sm:flex flex-col border-l border-stone-300 pl-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-secondary">
              Kabitirtha Institute of
            </span>
            <span className="text-sm font-serif font-bold text-primary">
              Development & Studies
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-6 2xl:gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative font-serif text-sm font-medium transition-colors duration-200 hover:text-primary ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-stone-600"
                }`}
              >
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* The app is what most visitors now arrive for, so it takes the gold
            button; Results moved into the text row once the declaration was
            three months old. Join Us stays the dark one. */}
        <div className="hidden xl:flex items-center gap-3">
          <Link
            href="/get-the-app"
            className={`px-5 py-2.5 rounded font-semibold text-sm uppercase tracking-wider border-2 border-secondary transition-colors ${
              pathname === "/get-the-app"
                ? "bg-secondary text-on-secondary"
                : "text-secondary hover:bg-secondary hover:text-on-secondary"
            }`}
          >
            Get the App
          </Link>
          <Link
            href="/support"
            className="bg-primary text-on-primary px-5 py-2.5 rounded font-semibold text-sm uppercase tracking-wider hover:bg-primary-container transition-colors"
          >
            Join Us
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="xl:hidden p-2 text-primary"
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-white border-t border-stone-200 overflow-hidden max-h-[calc(100vh-7.5rem)] overflow-y-auto"
          >
            <nav className="px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-lg font-serif font-medium p-2 rounded transition-colors ${
                    pathname === link.href
                      ? "bg-primary-fixed text-primary"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href="/get-the-app"
                onClick={() => setMobileOpen(false)}
                className="mt-4 border-2 border-secondary text-secondary text-center py-3 rounded font-semibold"
              >
                Get the App
              </Link>
              <Link
                href="/support"
                onClick={() => setMobileOpen(false)}
                className="bg-primary text-white text-center py-3 rounded font-semibold"
              >
                Join Us
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

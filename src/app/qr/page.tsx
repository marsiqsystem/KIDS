import type { Metadata } from "next";
import QrScanner from "@/components/QrScanner";
import "../portal/portal.css";

export const metadata: Metadata = {
  title: "Scan your admit card · SET 2026",
  description: "Scan the QR code on your SET 2026 admit card to open your student portal.",
  robots: { index: false, follow: false },
};

/**
 * kidskolkata.org/qr — the scanner of last resort.
 *
 * A student whose phone cannot scan a QR code from its camera app types this
 * short address in, and scans from here instead. It is deliberately the shortest
 * URL on the site, because it will be read aloud across a hall by a coordinator
 * to four hundred teenagers.
 */
export default function QrPage() {
  return (
    <div className="portal flex min-h-screen flex-col">
      <header className="sky px-5 py-8 text-center sm:py-10">
        <div className="stars" aria-hidden="true" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-[var(--cream)] sm:text-3xl">Scan your admit card</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#d8e6e2]">
            For phones that cannot scan a QR code on their own. Nothing is recorded here — it simply
            opens your own portal.
          </p>
        </div>
      </header>

      <main className="flex-1 bg-[var(--cream)]">
        <QrScanner />

        <p className="mx-auto max-w-md px-5 pb-10 text-center text-xs leading-relaxed text-[var(--ink-muted)]">
          Can&apos;t get it to scan? Tell your exam coordinator straight away — do not wait until
          10:30.
        </p>
      </main>
    </div>
  );
}

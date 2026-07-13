import Image from "next/image";
import { Check } from "lucide-react";

/** Header + footer shared by every portal screen. */
export default function PortalShell({
  verifiedAs,
  children,
}: {
  verifiedAs?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="portal flex min-h-screen flex-col">
      <header className="border-b border-[var(--cream-muted)] bg-[var(--cream)]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={38} height={38} className="h-9 w-9 object-contain" />
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-[0.02em] text-[var(--maroon)]">
                KIDS
              </div>
              <div className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Students Evaluation Test 2026
              </div>
            </div>
          </div>

          {verifiedAs && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(30_158_140/30%)] bg-[rgb(30_158_140/10%)] px-3 py-1.5">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--teal)]">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.4} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-[var(--teal-ink)]">
                Verified as {verifiedAs}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-[var(--maroon-deep)] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <Image src="/logo.png" alt="" width={42} height={42} className="h-10 w-10 object-contain" />
            <div className="leading-snug">
              <div className="font-[family-name:var(--font-display)] font-bold text-[var(--cream)]">
                Kabitirtha Institute of Development &amp; Studies
              </div>
              <div className="mt-0.5 text-xs text-[#c9a89c]">
                Reg. No. S/1L/19796 · Kolkata · A mission of excellence in education
              </div>
            </div>
          </div>
          <div className="text-xs leading-relaxed text-[#c9a89c] sm:text-right">
            82A/H/5, Dr. Sudhir Basu Road, Kolkata 700023
            <br />
            kids.kol.org2003@gmail.com
          </div>
        </div>
      </footer>
    </div>
  );
}

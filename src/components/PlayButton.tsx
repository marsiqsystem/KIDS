/**
 * "Get it on Google Play" — drawn in the site's own style rather than Google's
 * badge image, which we do not hold. The triangle is a plain shape, not
 * Google's logo.
 */
export default function PlayButton({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 bg-black text-white pl-4 pr-6 py-2.5 rounded-xl border border-white/20 hover:bg-stone-900 transition-colors shadow-lg shadow-black/20 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
        <path d="M5 3.5v17l14-8.5z" fill="currentColor" />
      </svg>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-wider text-white/75">Get it on</span>
        <span className="text-lg font-semibold">Google Play</span>
      </span>
    </a>
  );
}

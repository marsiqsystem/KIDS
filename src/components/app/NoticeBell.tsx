import Link from "next/link";

/**
 * The bell in the Home header. Design 7b's recommendation, and the reason it is
 * not a sixth tab: four message types a year do not earn a nav destination, and
 * the nav is already at five with 72px targets.
 *
 * The dot is the only gold in the header, so it reads as an event rather than
 * decoration — the same discipline as the one gold dot in the tab bar.
 */
export default function NoticeBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/app/notices"
      className="not-bell"
      aria-label={unread > 0 ? `Notices — ${unread} unread` : "Notices"}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {unread > 0 && <span className="not-bell__dot" />}
    </Link>
  );
}

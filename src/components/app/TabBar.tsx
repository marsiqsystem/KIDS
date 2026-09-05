"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The five tabs. Design 2d, chosen over 2e's four.
 *
 * Exam is permanent. It sits there dimmed and dotless for 364 days of the year,
 * which is the whole argument for it: on the one morning it matters, a nervous
 * child already knows where to look. The gold dot is the only one in the bar
 * and nothing else may ever wear one.
 *
 * 72px per target — above the 44px floor, and each tab is a full-width fifth of
 * a 360px screen.
 */

const TABS = [
  {
    href: "/app",
    label: "Home",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/app/learn",
    label: "Learn",
    icon: <path d="M12 7.5v13M3 5h5a3.5 3.5 0 0 1 4 2.5A3.5 3.5 0 0 1 16 5h5v13.5h-5a3.5 3.5 0 0 0-4 1.5 3.5 3.5 0 0 0-4-1.5H3z" />,
  },
  {
    href: "/app/exam",
    label: "Exam",
    icon: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9.5V13l2.5 1.5M9 2h6" />
      </>
    ),
  },
  {
    href: "/app/record",
    label: "Record",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
  },
  {
    href: "/app/profile",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </>
    ),
  },
];

export default function TabBar({ examLive = false }: { examLive?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Sections">
      {TABS.map((tab) => {
        // Home matches only itself; every other tab matches its subtree, so a
        // chapter opened inside Learn keeps Learn lit.
        const current = tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="app-nav__tab"
            aria-current={current ? "page" : undefined}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {tab.icon}
            </svg>
            <span>{tab.label}</span>
            {tab.label === "Exam" && examLive && <span className="app-nav__dot" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

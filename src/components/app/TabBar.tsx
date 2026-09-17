"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, CircleUser, FilePenLine, House } from "lucide-react";

/**
 * The five tabs. Redesign board 01.
 *
 * Exam is permanent. It sits there dotless for 364 days of the year, which is
 * the whole argument for it: on the one morning it matters, a nervous child
 * already knows where to look. The gold dot is the only one in the bar and
 * nothing else may ever wear one.
 *
 * Active is a maroon icon, a bold label and a short 3px rule on top; the icon
 * settles from 0.92 on tap. Each tab is a full fifth of a 360px screen.
 */

const TABS = [
  { href: "/app", label: "Home", Icon: House },
  { href: "/app/learn", label: "Learn", Icon: BookOpen },
  { href: "/app/exam", label: "Exam", Icon: FilePenLine },
  { href: "/app/record", label: "Record", Icon: Award },
  { href: "/app/profile", label: "Profile", Icon: CircleUser },
];

export default function TabBar({ examLive = false }: { examLive?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Sections">
      {TABS.map(({ href, label, Icon }) => {
        // Home matches only itself; every other tab matches its subtree, so a
        // chapter opened inside Learn keeps Learn lit.
        const current = href === "/app" ? pathname === "/app" : pathname.startsWith(href);

        return (
          <Link key={href} href={href} className="app-nav__tab" aria-current={current ? "page" : undefined}>
            <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
            {label === "Exam" && examLive && <span className="app-nav__dot" aria-label="A paper is open" />}
          </Link>
        );
      })}
    </nav>
  );
}

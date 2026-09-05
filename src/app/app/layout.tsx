import type { Metadata, Viewport } from "next";
import "./app.css";
import "./loop.css";
import "./learn.css";

/**
 * The student app.
 *
 * Deliberately outside app/(site): the site's chrome — the fixed navbar, the
 * announcement bar, Lenis smooth scrolling — is wrong on a phone app with its
 * own five-tab bar, in exactly the way it was wrong over a running exam clock.
 * See the note in app/(site)/layout.tsx.
 *
 * Everything below is scoped to `.app`, which carries the design-system tokens.
 */

export const metadata: Metadata = {
  title: "SET · KIDS",
  description: "The Students Evaluation Test app for KIDS students.",
  // Not a public page. It is a door with children's names behind it, and there
  // is nothing here for a search engine to index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // The app is a phone-shaped thing and pinch-zoom must still work — a student
  // reading a Bengali stem at 13px on a 360px screen may well need it. Only
  // the initial scale is fixed.
  width: "device-width",
  initialScale: 1,
  themeColor: "#7b1e2b",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="app">{children}</div>;
}

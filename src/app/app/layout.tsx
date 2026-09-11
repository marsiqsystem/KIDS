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
  /**
   * The iPhone half of the programme.
   *
   * There is no way to install a native iOS app without paying Apple, so an
   * iPhone student adds this to their home screen instead — and what they get
   * is decided here, not by the manifest, which iOS mostly ignores.
   *
   * `title` is the label under the icon: "SET · KIDS", not the institute's
   * full name inherited from the site's root layout, which a home screen
   * truncates to "KIDS - Kabitirtha In…".
   *
   * `capable` opens it without Safari's address bar and toolbar, which is the
   * whole difference between an app and a bookmark. `black-translucent` puts
   * the maroon crest behind the status bar rather than a grey strip above it.
   */
  appleWebApp: {
    capable: true,
    title: "SET · KIDS",
    statusBarStyle: "black-translucent",
  },
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

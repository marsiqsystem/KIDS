import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import AnnouncementBar from "@/components/AnnouncementBar";

/**
 * The public website's chrome: announcement bar, nav, footer, smooth scrolling.
 *
 * It lives in a route group rather than in the root layout because /portal and
 * /qr must NOT have it. Two reasons, and the first one is the exam:
 *
 *   1. The navbar is `fixed ... z-50`. The exam's own bar -- the one carrying the
 *      countdown and the answered-count -- is `sticky top-0 z-20` inside <main>.
 *      With the site chrome above it, the navigation sits ON TOP of a student's
 *      timer at 10:47. It was doing exactly that until this was split out.
 *
 *   2. Weight. The portal is opened on cheap Android phones on 3G, by 9,440
 *      students inside the same half hour. Lenis, Framer Motion and the navbar
 *      are a download none of them need in order to sit an exam.
 *
 * A route group changes no URLs: /about is still /about.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-10">{children}</main>
      <Footer />
    </SmoothScroll>
  );
}

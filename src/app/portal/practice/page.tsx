import type { Metadata } from "next";
import { openPortal } from "@/lib/exam/portal-auth";
import ErrorScreen from "@/components/portal/ErrorScreen";
import PracticeTest from "@/components/portal/PracticeTest";
import "../portal.css";

export const metadata: Metadata = {
  title: "Practice Test · SET 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Search = Promise<{ id?: string; t?: string }>;

/**
 * The practice test sits behind the same gate as the portal itself.
 *
 * Not because practice questions are secret -- they are deliberately worthless --
 * but because the screen must be reachable ONLY the way the real exam will be:
 * by scanning your own card. A student who can open this by URL alone would
 * learn the wrong lesson about how exam day works.
 */
export default async function PracticePage({ searchParams }: { searchParams: Search }) {
  const { id = "", t = "" } = await searchParams;
  const gate = await openPortal(id, t);

  if (!gate.ok) return <ErrorScreen reason={gate.reason} uid={gate.uid} />;

  return (
    <div className="portal">
      <PracticeTest backHref={`/portal?id=${gate.student.uid}&t=${encodeURIComponent(t)}`} />
    </div>
  );
}

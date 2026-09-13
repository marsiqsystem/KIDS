import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/admin/session";
import { desksFor, mayRunDesk } from "@/lib/exam/checkin";
import DeskScreen from "@/components/admin/DeskScreen";

export const metadata: Metadata = {
  title: "KIDS · Exam desk",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The exam desk, for invigilators.
 *
 * Its own page rather than a tab, because on exam morning it is opened on a
 * laptop or a phone propped on a desk and left there for two hours -- it should
 * be nothing but the code and the room.
 */
export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ paper?: string; centre?: string }>;
}) {
  const staff = await currentStaff();
  if (!staff || staff.must_change) redirect("/admin");

  const isAdmin = staff.role === "admin";
  const { paper = "", centre = "" } = await searchParams;
  const desks = await desksFor(staff.staff_id, isAdmin);

  const chosen = desks.find((d) => d.exam_paper_id === paper && d.centre_code === centre);
  if (chosen && (await mayRunDesk(staff.staff_id, isAdmin, paper, centre))) {
    return (
      <main className="min-h-screen bg-[#141010] px-5 py-5 text-[#e8e0dc]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center gap-4 text-xs text-[#6b5c57]">
            <Link href="/admin/desk" className="hover:text-[#c9b8b2]">← All desks</Link>
            <span>
              {staff.full_name} · <span className="font-mono">{staff.staff_id}</span>
            </span>
          </div>
          <DeskScreen paperId={chosen.exam_paper_id} centre={chosen.centre_code} centreName={chosen.centre_name} />
        </div>
      </main>
    );
  }

  const byPaper = new Map<string, typeof desks>();
  for (const d of desks) byPaper.set(d.exam_paper_id, [...(byPaper.get(d.exam_paper_id) ?? []), d]);

  return (
    <main className="min-h-screen bg-[#141010] px-5 py-8 text-[#e8e0dc]">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/admin" className="text-xs text-[#6b5c57] hover:text-[#c9b8b2]">← Control centre</Link>
          <h1 className="mt-2 text-lg font-bold">Exam desks</h1>
          <p className="mt-1 text-sm text-[#9c8c86]">
            Choose the paper and the centre you are running. The check-in code appears when check-in opens.
          </p>
        </div>

        {desks.length === 0 ? (
          <p className="rounded border border-[#2a2321] bg-[#1a1514] p-4 text-sm text-[#9c8c86]">
            {isAdmin
              ? "No paper needs a check-in yet. Schedule one in the Exams tab with “Scan in at a centre first” ticked."
              : "You have not been assigned to a desk. Ask the KIDS office to assign you in the Exams tab."}
          </p>
        ) : (
          [...byPaper.values()].map((list) => (
            <section key={list[0].exam_paper_id} className="rounded border border-[#2a2321] bg-[#1a1514]">
              <h2 className="border-b border-[#2a2321] px-4 py-3 text-sm font-bold">
                {list[0].paper_name}{" "}
                <span className="font-normal text-[#6b5c57]">
                  · {list[0].starts_at ? new Date(list[0].starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "not scheduled"}
                </span>
              </h2>
              <ul className="grid grid-cols-1 gap-px bg-[#2a2321] sm:grid-cols-3">
                {list.map((d) => (
                  <li key={d.centre_code} className="bg-[#1a1514]">
                    <Link
                      href={`/admin/desk?paper=${d.exam_paper_id}&centre=${d.centre_code}`}
                      className="block px-4 py-3 text-sm hover:bg-[#241c1a]"
                    >
                      <span className="font-mono text-[#6b5c57]">{d.centre_code}</span> {d.centre_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

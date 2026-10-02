import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentStaff } from "@/lib/admin/session";
import { editablePaper, julySubjects, openEditor, setsForPaper } from "@/lib/admin/questions";
import { CLASSES, STREAMS, describeSet, parseSetCode, setCodeFor } from "@/lib/exam/question-check";
import QuestionEditor from "@/components/admin/QuestionEditor";
import { SetRowActions } from "@/components/admin/QuestionSetActions";

export const metadata: Metadata = {
  title: "KIDS · Questions",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Writing a paper: its question sets, and the editor for one of them.
 *
 * Its own page rather than part of the Exams tab, because a set is fifty
 * questions with four options each -- a long piece of work somebody sits with,
 * not a row on a dashboard.
 *
 * ADMIN ONLY. Every byte below the list carries the answer key.
 */
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ paper?: string; set?: string; class?: string; stream?: string; bengali?: string }>;
}) {
  const staff = await currentStaff();
  if (!staff || staff.must_change) redirect("/admin");
  if (staff.role !== "admin") redirect("/admin");

  const q = await searchParams;
  const paper = await editablePaper(q.paper ?? "");
  if (!paper) notFound();

  // The "start a set" form is a plain GET: class, stream, medium in; a set code out.
  if (!q.set && q.class) {
    const cls = (CLASSES as readonly string[]).includes(q.class) ? q.class : null;
    const stream = q.stream && (STREAMS as readonly string[]).includes(q.stream) && (cls === "XI" || cls === "XII") ? q.stream : null;
    if (cls) redirect(`/admin/questions?paper=${paper.id}&set=${setCodeFor(paper.code, cls, stream, q.bengali === "1")}`);
  }

  if (q.set) {
    const parsed = parseSetCode(q.set);
    if (!parsed || parsed.paperCode !== paper.code) notFound();
    const editor = await openEditor(paper.id, q.set);
    return (
      <Shell back={{ href: `/admin/questions?paper=${paper.id}`, label: `All sets of ${paper.name}` }}>
        <div>
          <h1 className="font-[family-name:var(--font-newsreader)] text-[30px] leading-tight">{describeSet(q.set)}</h1>
          <p className="mt-1 text-[13.5px] text-[#6B5B5D]">
            {paper.name} · <span className="font-mono">{q.set}</span>
            {paper.question_count ? ` · set for ${paper.question_count} questions` : ""}
          </p>
        </div>
        <QuestionEditor
          paperId={paper.id}
          code={q.set}
          initial={editor.items}
          source={editor.source}
          version={editor.version}
          loadedCount={editor.loaded_count}
          locked={editor.attempts > 0 ? editor.attempts : 0}
          expectedCount={paper.question_count}
          initialChoice={editor.choice}
          suggestions={julySubjects(parsed.cls, parsed.stream)}
        />
      </Shell>
    );
  }

  const sets = await setsForPaper(paper.id);

  return (
    <Shell back={{ href: "/admin?tab=exams", label: "Exams" }}>
      <div>
        <h1 className="font-[family-name:var(--font-newsreader)] text-[30px] leading-tight">{paper.name}</h1>
        <p className="mt-1 text-[13.5px] text-[#6B5B5D]">
          One question set per class. A child is handed the most specific set that exists for them: Class XI
          Science, Bengali medium, gets <span className="font-mono">-XI-SCIENCE-BENGALI</span> if it is loaded,
          otherwise <span className="font-mono">-XI-BENGALI</span>, then <span className="font-mono">-XI-SCIENCE</span>,
          then <span className="font-mono">-XI</span>.
        </p>
      </div>

      <section className="overflow-hidden rounded-[14px] border border-[#F2E9DA] bg-white">
        <h2 className="border-b border-[#F2E9DA] px-4 py-3 text-sm font-bold">Sets</h2>
        {sets.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[#6B5B5D]">No sets yet. Start one below.</p>
        ) : (
          <ul className="divide-y divide-[#F2E9DA]">
            {sets.map((s) => (
              <li key={s.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <div className="min-w-[14rem] flex-1">
                  <div className="font-semibold">{describeSet(s.code)}</div>
                  <div className="font-mono text-xs text-[#6B5B5D]">{s.code}</div>
                </div>
                <div className="text-xs text-[#4A3A3C]">
                  {s.loaded_count !== null ? (
                    <div className="text-[#137565]">
                      Loaded · {s.loaded_count} questions · {when(s.loaded_at)} by {s.loaded_by}
                    </div>
                  ) : (
                    <div className="text-[#8A6D1F]">Not loaded — students of this set see no paper</div>
                  )}
                  {s.draft_count !== null ? (
                    <div className="text-[#6B5B5D]">
                      Unloaded draft · {s.draft_count} questions · saved {when(s.draft_at)} by {s.draft_by}
                    </div>
                  ) : null}
                  {s.attempts > 0 ? <div className="text-[#6B5B5D]">Sat by {s.attempts} · locked</div> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/questions?paper=${paper.id}&set=${s.code}`}
                    className="rounded bg-[#7B1E2B] px-3 py-1.5 text-xs font-semibold text-[#FDFBF7]"
                  >
                    {s.attempts > 0 ? "View" : s.draft_count !== null ? "Continue editing" : "Edit"}
                  </Link>
                  {s.attempts === 0 && s.loaded_count !== null ? (
                    <SetRowActions paperId={paper.id} code={s.code} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[14px] border border-[#F2E9DA] bg-white p-4">
        <h2 className="text-sm font-bold">Start a set</h2>
        <form method="get" className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="paper" value={paper.id} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Class</span>
            <select name="class" defaultValue="X" className={SELECT}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Stream (XI and XII only)</span>
            <select name="stream" defaultValue="" className={SELECT}>
              <option value="">Every stream — one paper for the class</option>
              {STREAMS.map((s) => (
                <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()} only</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Medium</span>
            <select name="bengali" defaultValue="" className={SELECT}>
              <option value="">English — every child without a Bengali set</option>
              <option value="1">Bengali medium only</option>
            </select>
          </label>
          <button type="submit" className="rounded bg-[#7B1E2B] px-4 py-2 text-sm font-semibold text-[#FDFBF7]">
            Open
          </button>
        </form>
        <p className="mt-3 text-xs text-[#6B5B5D]">
          A stream on Class IX or X is ignored: those classes have none. Opening a set that already exists takes you
          to it.
        </p>
      </section>
    </Shell>
  );
}

const SELECT =
  "rounded border border-[#E3D6C4] bg-[#FDFBF7] px-3 py-2 text-sm text-[#2B1A1C] outline-none focus:border-[#7B1E2B]";

function when(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

function Shell({ back, children }: { back: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FBF7EF] px-5 py-8 text-[#2B1A1C]">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={back.href} className="text-xs text-[#6B5B5D] hover:text-[#7B1E2B]">
          ← {back.label}
        </Link>
        {children}
      </div>
    </main>
  );
}

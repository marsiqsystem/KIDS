import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { currentStaff } from "@/lib/admin/session";
import { editablePaper, julySubjects, openEditor, setsForPaper, type SetSummary } from "@/lib/admin/questions";
import { pendingCount } from "@/lib/admin/registrations";
import { pendingCorrectionCount } from "@/lib/admin/corrections";
import { pendingAccountRequestCount } from "@/lib/admin/account-requests";
import { CLASSES, STREAMS, describeSet, parseSetCode, setCodeFor } from "@/lib/exam/question-check";
import QuestionEditor from "@/components/admin/QuestionEditor";
import ConsoleShell from "@/components/admin/ConsoleShell";
import { SetRowActions } from "@/components/admin/QuestionSetActions";

export const metadata: Metadata = {
  title: "KIDS · Questions",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Writing a paper: its question sets (board 17 A2, inside the console) and the
 * editor for one of them (A3, a page of its own -- fifty questions is a long
 * piece of work somebody sits with, and it gets the whole width).
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

  /* ------------------------------------------------------------ the editor */
  if (q.set) {
    const parsed = parseSetCode(q.set);
    if (!parsed || parsed.paperCode !== paper.code) notFound();
    const editor = await openEditor(paper.id, q.set);
    return (
      <main className="min-h-screen bg-[#FBF7EF] text-[#2B1A1C]">
        <div className="mx-auto max-w-[1000px] space-y-4 px-8 pb-36 pt-7">
          <div>
            <Link
              href={`/admin/questions?paper=${paper.id}`}
              className="inline-flex items-center gap-1 text-[12.5px] text-[#6B5B5D] hover:text-[#7B1E2B]"
            >
              Question sets
              <ChevronRight size={13} aria-hidden />
            </Link>
            <div className="mt-1 text-[12.5px] text-[#6B5B5D]">
              {paper.name} · <span className="font-mono">{q.set}</span>
              {paper.question_count ? ` · set for ${paper.question_count} questions` : ""}
            </div>
            <h1 className="mt-1 font-[family-name:var(--font-newsreader)] text-[32px] leading-tight">{describeSet(q.set)}</h1>
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
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------- the set list */
  const [sets, waiting, correctionsWaiting, requestsWaiting] = await Promise.all([
    setsForPaper(paper.id),
    pendingCount(),
    pendingCorrectionCount(),
    pendingAccountRequestCount(),
  ]);

  return (
    <ConsoleShell
      staff={staff}
      tab="exams"
      waiting={waiting}
      correctionsWaiting={correctionsWaiting}
      requestsWaiting={requestsWaiting}
    >
      <div className="mx-auto w-full max-w-[1180px] flex-1 space-y-5 px-8 py-7">
        <nav className="flex items-center gap-2 text-[13px] text-[#6B5B5D]" aria-label="Breadcrumb">
          <Link href="/admin?tab=exams" className="hover:text-[#7B1E2B]">Exams</Link>
          <ChevronRight size={14} aria-hidden />
          <span className="text-[#2B1A1C]">{paper.name} · question sets</span>
        </nav>

        <div className="flex flex-wrap items-end gap-5">
          <div className="min-w-[16rem] flex-1">
            <h1 className="font-[family-name:var(--font-newsreader)] text-[30px] leading-tight">Question sets</h1>
            <p className="mt-1 text-[13.5px] text-[#6B5B5D]">One set per class, and optionally per stream and medium</p>
          </div>
          <div className="rounded-xl border border-[#F2E9DA] bg-white px-4 py-3">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B5B5D]">
              A child gets the most specific set that exists
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="rounded-md bg-[#7B1E2B] px-2 py-1 text-[#FDFBF7]">XI·Sci·Beng</span>
              <ChevronRight size={13} className="text-[#C9A24B]" aria-hidden />
              <span className="rounded-md border border-[#F2E9DA] px-2 py-1">XI·Beng</span>
              <ChevronRight size={13} className="text-[#C9A24B]" aria-hidden />
              <span className="rounded-md border border-[#F2E9DA] px-2 py-1">XI·Sci</span>
              <ChevronRight size={13} className="text-[#C9A24B]" aria-hidden />
              <span className="rounded-md border border-[#F2E9DA] px-2 py-1">XI</span>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#F2E9DA] bg-white">
          {sets.length === 0 ? (
            <p className="px-5 py-5 text-sm text-[#6B5B5D]">No sets yet. Start one below.</p>
          ) : (
            <ul className="divide-y divide-[#F7F1E6]">
              {sets.map((s) => (
                <SetRow key={s.code} s={s} paperId={paper.id} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[#F2E9DA] bg-white px-5 py-[18px]">
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5B5D]">Start a set</div>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="paper" value={paper.id} />
            <Picker label="Class" name="class" defaultValue="X">
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Picker>
            <Picker label="Stream · XI & XII only" name="stream" defaultValue="">
              <option value="">Every stream</option>
              {STREAMS.map((s) => (
                <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
              ))}
            </Picker>
            <Picker label="Medium" name="bengali" defaultValue="">
              <option value="">English</option>
              <option value="1">Bengali medium only</option>
            </Picker>
            <button type="submit" className="h-10 rounded-[9px] bg-[#7B1E2B] px-5 text-sm font-semibold text-[#FDFBF7]">
              Open
            </button>
          </form>
          <p className="mt-2.5 text-xs text-[#6B5B5D]">Opening a set that already exists goes to it.</p>
        </section>
      </div>
    </ConsoleShell>
  );
}

function SetRow({ s, paperId }: { s: SetSummary; paperId: string }) {
  const name = describeSet(s.code);
  const href = `/admin/questions?paper=${paperId}&set=${s.code}`;
  const locked = s.attempts > 0;
  return (
    <li className="grid grid-cols-1 items-center gap-x-[18px] gap-y-2 px-5 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_230px]">
      <div>
        <div className="text-[14.5px] font-semibold">{name}</div>
        <div className="font-mono text-xs text-[#6B5B5D]">{s.code}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {locked ? (
          <Chip tone="grey">
            <Lock size={13} aria-hidden /> Sat by {s.attempts.toLocaleString("en-IN")} · locked
          </Chip>
        ) : null}
        {!locked && s.loaded_count !== null ? (
          <Chip tone="teal">
            Loaded · {s.loaded_count} questions · {day(s.loaded_at)}, {s.loaded_by}
          </Chip>
        ) : null}
        {!locked && s.loaded_count === null ? (
          <Chip tone="amber">Not loaded — students of this set see no paper</Chip>
        ) : null}
        {!locked && s.draft_count !== null ? (
          <Chip tone="grey">
            Unloaded draft · {s.draft_count} questions · saved {day(s.draft_at)}, {s.draft_by}
          </Chip>
        ) : null}
      </div>
      <div className="flex items-center gap-2 md:justify-self-end">
        {locked ? (
          <Link
            href={href}
            className="grid h-[34px] place-items-center rounded-[9px] border-[1.5px] border-[#F2E9DA] px-3.5 text-[13px] font-semibold hover:bg-[#FBF7EF]"
          >
            View
          </Link>
        ) : (
          <Link
            href={href}
            className="grid h-[34px] place-items-center rounded-[9px] bg-[#7B1E2B] px-3.5 text-[13px] font-semibold text-[#FDFBF7]"
          >
            {s.draft_count !== null ? "Continue editing" : "Edit"}
          </Link>
        )}
        {!locked && s.loaded_count !== null ? <SetRowActions paperId={paperId} code={s.code} name={name} /> : null}
      </div>
    </li>
  );
}

function Chip({ tone, children }: { tone: "teal" | "grey" | "amber"; children: React.ReactNode }) {
  const style =
    tone === "teal"
      ? "bg-[#E6F4F1] text-[#167A6C] font-semibold"
      : tone === "amber"
        ? "bg-[#FAF1DC] text-[#8A6A24] font-semibold"
        : "bg-[#EEEAE4] text-[#5C5254]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${style}`}>{children}</span>;
}

function Picker({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-[10rem] flex-1">
      <span className="mb-1.5 block text-xs text-[#6B5B5D]">{label}</span>
      <span className="relative block">
        <select
          name={name}
          defaultValue={defaultValue}
          className="h-10 w-full appearance-none rounded-[9px] border-[1.5px] border-[#F2E9DA] bg-white pl-3 pr-9 text-sm outline-none focus:border-[#7B1E2B]"
        >
          {children}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5B5D]" aria-hidden />
      </span>
    </label>
  );
}

function day(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

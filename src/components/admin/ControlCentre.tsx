import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  FilePenLine,
  KeyRound,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { resetStudentPassword } from "@/app/admin/actions";
import type { Staff, StaffListRow, AuditRow } from "@/lib/admin/staff";
import type { Batch, MemberRow, BatchTeacher } from "@/lib/admin/batches";
import type { Overview, StudentRow } from "@/lib/admin/students";

/** The register as the page loads it: one slice, and where that slice sits. */
type Register = { rows: StudentRow[]; total: number; page: number; pages: number; cls: string };
import type { LiveClass } from "@/lib/admin/classes";
import type { Post } from "@/lib/admin/posts";
import type { DecidedRow, PendingRow } from "@/lib/admin/registrations";
import type { ClaimTotals, SchoolClaims, UnclaimedRow } from "@/lib/admin/claims";
import type { AccountRequestRow } from "@/lib/admin/account-requests";
import type { PendingCorrection } from "@/lib/admin/corrections";
import type { AdminPaper, AwardState, CentreRow } from "@/lib/admin/exams";
import type { ContentChapter } from "@/lib/admin/content";
import { ONE_WAY, sentence } from "@/lib/admin/sentences";
import StaffPanel from "./StaffPanel";
import BatchesPanel from "./BatchesPanel";
import ClassesPanel from "./ClassesPanel";
import PostsPanel from "./PostsPanel";
import ApplicationsPanel from "./ApplicationsPanel";
import ClaimsPanel from "./ClaimsPanel";
import AccountRequestsPanel from "./AccountRequestsPanel";
import CorrectionsPanel from "./CorrectionsPanel";
import ContentPanel from "./ContentPanel";
import { CentresPanel, ExamsPanel, ResultsPanel } from "./ExamsPanel";
import { RowAction } from "./ui";
import ConsoleShell from "./ConsoleShell";

export interface OpenBatch {
  batch: Batch;
  members: MemberRow[];
  teachers: BatchTeacher[];
}

/** What the morning dashboard reads, on the Overview tab only. */
export interface Dashboard {
  claims: ClaimTotals;
  papers: AdminPaper[];
  events: AuditRow[];
}

const n = (x: number) => x.toLocaleString("en-IN");

const ist = (d: Date | string, o: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o });

/**
 * The control centre shell. Redesign board 05.
 *
 * Fourteen horizontal tabs became a grouped left sidebar with each queue's
 * count on its label, a top bar with search and the signed-in person, and the
 * KIDS light theme. The page stays a server component and every destination is
 * a link: nothing is read until somebody asks for it, and nothing polls — the
 * 12-second poll that once burned 110 Neon CU hours is not coming back. Refresh
 * is a button and it says when the numbers were read.
 *
 * Roles hide pages rather than greying out buttons. Admin sees everything; a
 * teacher sees My batches · Classes · Posts, plus Desk when they are an
 * invigilator on a paper. Those are the two roles that exist — Design's
 * Office / Content / No access roles are not built and are not drawn.
 */
export default async function ControlCentre({
  staff,
  tab,
  query,
  overview,
  staffList,
  batches,
  openBatch,
  students,
  register = null,
  events,
  classes,
  posts,
  liveReady,
  applications = null,
  waiting = 0,
  claims = null,
  corrections = null,
  correctionsWaiting = 0,
  requestsWaiting = 0,
  papers = null,
  centres = null,
  content = null,
  award = null,
  dashboard = null,
  hasDesk = false,
}: {
  staff: Staff;
  tab: string;
  query: string;
  overview: Overview | null;
  staffList: StaffListRow[];
  batches: Batch[];
  openBatch: OpenBatch | null;
  students: StudentRow[];
  /** The register itself, when nobody is searching. */
  register?: Register | null;
  events: AuditRow[];
  classes: LiveClass[];
  posts: Post[];
  liveReady: boolean;
  applications?: { pending: PendingRow[]; decided: DecidedRow[] } | null;
  /** Pending count for the sidebar. An inbox nobody knows is full is never opened. */
  waiting?: number;
  claims?: {
    totals: ClaimTotals;
    schools: SchoolClaims[];
    open: { school: SchoolClaims; unclaimed: UnclaimedRow[] } | null;
    /** Phones asking to be let in. Approving one opens the account on it. */
    requests: AccountRequestRow[];
  } | null;
  requestsWaiting?: number;
  corrections?: PendingCorrection[] | null;
  correctionsWaiting?: number;
  papers?: AdminPaper[] | null;
  centres?: CentreRow[] | null;
  content?: { choice: string; chapters: ContentChapter[] } | null;
  award?: AwardState | null;
  dashboard?: Dashboard | null;
  /** A teacher named as an invigilator on some paper. */
  hasDesk?: boolean;
}) {
  const isAdmin = staff.role === "admin";

  return (
    <ConsoleShell
      staff={staff}
      tab={tab}
      query={query}
      waiting={waiting}
      correctionsWaiting={correctionsWaiting}
      requestsWaiting={requestsWaiting}
      hasDesk={hasDesk}
    >

      <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-6">
        {tab === "overview" && overview ? (
          <OverviewPanel o={overview} batches={batches} dash={dashboard} waiting={waiting} corrections={correctionsWaiting} requests={requestsWaiting} />
        ) : null}
        {tab === "applications" && applications ? (
          <Page title="Applications" line={`${n(waiting)} waiting`}>
            <ApplicationsPanel pending={applications.pending} decided={applications.decided} />
          </Page>
        ) : null}
        {tab === "claims" && claims ? (
          <Page title="Claims" line={`${n(requestsWaiting)} asking to be let in`}>
            <div className="space-y-6">
              <AccountRequestsPanel rows={claims.requests} />
              <ClaimsPanel totals={claims.totals} schools={claims.schools} open={claims.open} />
            </div>
          </Page>
        ) : null}
        {tab === "corrections" && corrections ? (
          <Page title="Corrections" line={`${n(correctionsWaiting)} waiting`}>
            <CorrectionsPanel pending={corrections} />
          </Page>
        ) : null}
        {tab === "exams" && papers ? (
          <Page title="Exams" line="Series → phases → papers">
            <ExamsPanel
              papers={papers}
              staff={staffList.filter((s) => !s.disabled_at)}
              centres={(centres ?? []).map(({ centre_code, centre_name }) => ({ centre_code, centre_name }))}
            />
          </Page>
        ) : null}
        {tab === "results" && papers ? (
          <Page title="Results" line="Mark, rank, publish — and withdraw if needed">
            <ResultsPanel papers={papers} award={award ?? null} />
          </Page>
        ) : null}
        {tab === "centres" && centres ? (
          <Page title="Centres" line={`${centres.length} centres`}>
            <CentresPanel centres={centres} />
          </Page>
        ) : null}
        {tab === "content" && content ? (
          <Page title="Content" line="Chapter videos. Questions are not edited here.">
            <ContentPanel choice={content.choice} chapters={content.chapters} />
          </Page>
        ) : null}
        {tab === "staff" ? (
          <Page title="Teachers & admins" line="Two roles: Admin, and Teacher">
            <StaffPanel staff={staffList} me={staff} />
          </Page>
        ) : null}
        {tab === "batches" ? (
          <Page title={isAdmin ? "Batches" : "My batches"}>
            <BatchesPanel
              batches={batches}
              open={openBatch}
              teachers={staffList.filter((s) => !s.disabled_at)}
              canEdit={isAdmin}
            />
          </Page>
        ) : null}
        {tab === "classes" ? (
          <Page title="Classes" line="Scheduling does not open the room">
            <ClassesPanel classes={classes} batches={batches} configured={liveReady} />
          </Page>
        ) : null}
        {tab === "posts" ? (
          <Page title="Posts" line="No edit — to change one, retract and post again">
            <PostsPanel posts={posts} batches={batches} canPostToAll={isAdmin} />
          </Page>
        ) : null}
        {tab === "students" ? (
          <Page title="Students" line="The register · search to narrow it">
            <StudentsPanel students={students} register={register} query={query} canReset={isAdmin} />
          </Page>
        ) : null}
        {tab === "audit" ? (
          <Page title="Activity" line="Append-only · newest first">
            <AuditPanel events={events} />
          </Page>
        ) : null}
      </div>
    </ConsoleShell>
  );
}

/* ------------------------------------------------------------------ page --- */

function Page({ title, line, children }: { title: string; line?: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-newsreader)] text-[30px] leading-tight">{title}</h1>
        {line ? <p className="mt-1 text-[13.5px] text-[#6B5B5D]">{line}</p> : null}
      </div>
      {children}
    </div>
  );
}

const CARD = "rounded-[14px] border border-[#F2E9DA] bg-white";
const LABEL = "text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5B5D]";
const BIG = "font-[family-name:var(--font-newsreader)] text-[40px] leading-none lining-nums tabular-nums";

/* ------------------------------------------------------------- overview --- */

/**
 * The office's morning dashboard. Redesign board 05.
 *
 * The register reads left to right as one sentence — on the register → claimed
 * → locked out → applying — so the office sees where children are stuck. Every
 * count is a door into its queue. Numbers are read when the page opens;
 * Refresh reads them again. Nothing polls.
 */
function OverviewPanel({
  o,
  batches,
  dash,
  waiting,
  corrections,
  requests,
}: {
  o: Overview;
  batches: Batch[];
  dash: Dashboard | null;
  waiting: number;
  corrections: number;
  requests: number;
}) {
  const live = batches.filter((b) => !b.archived_at);
  const now = new Date();
  const pct = o.students ? Math.round((o.claimed / o.students) * 100) : 0;

  // The next paper that is not over, or the latest open one.
  const upcoming = (dash?.papers ?? [])
    .filter((p) => p.mode === "online" && p.starts_at && !p.closed)
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())[0];
  const days = upcoming?.starts_at
    ? Math.max(0, Math.ceil((new Date(upcoming.starts_at).getTime() - now.getTime()) / 86_400_000))
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-newsreader)] text-[30px] leading-tight">
            {ist(now, { weekday: "long" })} {greetingPart(now)}
          </h1>
          <p className="mt-1 text-[13.5px] text-[#6B5B5D]">
            {ist(now, { day: "numeric", month: "long", year: "numeric" })} · numbers as of{" "}
            {ist(now, { hour: "2-digit", minute: "2-digit", hour12: false })}
          </p>
        </div>
        <Link
          href="/admin?tab=overview"
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border-[1.5px] border-[#7B1E2B] px-4 text-sm font-semibold text-[#7B1E2B] hover:bg-[#F6E9E9]"
        >
          <RefreshCw size={17} aria-hidden /> Refresh
        </Link>
      </div>

      {/* the funnel */}
      <section className={`${CARD} px-6 py-5`}>
        <div className="mb-5 flex items-baseline gap-3">
          <span className={LABEL}>The register</span>
          <span className="text-[12.5px] text-[#A79B9C]">demo accounts excluded</span>
        </div>
        <div className="grid gap-5 md:grid-cols-4 md:gap-0 md:divide-x md:divide-[#F2E9DA]">
          <div className="md:pr-5">
            <div className={`${BIG} text-[#7B1E2B]`}>{n(o.students)}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">on the register</div>
          </div>
          <div className="md:px-5">
            <div className={`${BIG} text-[#1E9E8C]`}>{n(o.claimed)}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">accounts claimed</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F2E9DA]">
              <div className="h-full bg-[#1E9E8C]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[12.5px] text-[#6B5B5D]">{pct}% of the register</div>
          </div>
          <div className="md:px-5">
            <div className={`${BIG} text-[#B22234]`}>{dash ? n(dash.claims.lockedOut) : "—"}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">locked out</div>
            <div className="text-[12.5px] text-[#6B5B5D]">no account, no date of birth</div>
            <Link href="/admin?tab=claims" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7B1E2B]">
              Open their accounts <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="md:pl-5">
            <div className={`${BIG} text-[#B07A1F]`}>{n(waiting)}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold">new applications</div>
            <Link href="/admin?tab=applications" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7B1E2B]">
              Open the queue <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* inboxes */}
        <section className={`${CARD} px-5 py-5`}>
          <div className={`${LABEL} mb-4`}>Needs your decision</div>
          <div className="grid gap-2.5">
            <Inbox href="/admin?tab=applications" icon={<UserPlus size={20} />} title="Applications" n={waiting} hot={waiting > 0 && waiting >= corrections} />
            <Inbox href="/admin?tab=corrections" icon={<FilePenLine size={20} />} title="Corrections" n={corrections} hot={corrections > waiting} />
            <Inbox href="/admin?tab=claims" icon={<KeyRound size={20} />} title="Asking to be let in" n={requests} />
          </div>
        </section>

        {/* next exam */}
        <section className={`${CARD} px-5 py-5`}>
          <div className={`${LABEL} mb-4`}>Next exam</div>
          {upcoming ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="text-[17px] font-semibold">{upcoming.name}</div>
                  <div className="text-[13px] text-[#6B5B5D]">
                    {ist(upcoming.starts_at!, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                {days !== null ? (
                  <div className="text-center">
                    <div className="font-[family-name:var(--font-newsreader)] text-[34px] leading-none lining-nums text-[#7B1E2B]">{days}</div>
                    <div className="text-[12px] text-[#6B5B5D]">days</div>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["IX", "X", "XI", "XII"].map((c) => {
                  const ok = upcoming.loaded.includes(c);
                  return (
                    <span
                      key={c}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? "bg-[#E6F5F2] text-[#137565]" : "bg-[#FBE9EA] text-[#B22234]"}`}
                    >
                      {ok ? "✓" : "✗"} Class {c}
                    </span>
                  );
                })}
              </div>
              {upcoming.requires_checkin ? (
                <p className="mt-3 text-[13px] text-[#6B5B5D]">
                  Invigilators named at {new Set(upcoming.invigilators.map((i) => i.centre_code)).size} centres
                </p>
              ) : null}
              <Link href="/admin?tab=exams" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7B1E2B]">
                Open the exam <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          ) : (
            <p className="text-sm text-[#6B5B5D]">
              Nothing scheduled. <Link href="/admin?tab=exams" className="font-semibold text-[#7B1E2B]">Schedule a paper</Link>
            </p>
          )}
        </section>

        {/* results */}
        <section className={`${CARD} px-5 py-5`}>
          <div className={`${LABEL} mb-4`}>Results</div>
          <ul className="grid gap-2">
            {(dash?.papers ?? [])
              .filter((p) => p.results > 0 || p.computed_at || p.visible)
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1">{p.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      p.visible ? "bg-[#E6F5F2] text-[#137565]" : p.computed_at ? "bg-[#FAF1DC] text-[#8A6D1F]" : "bg-[#F2E9DA] text-[#6B5B5D]"
                    }`}
                  >
                    {p.visible ? "Published" : p.computed_at ? "Computed, waiting" : "Not marked"}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        {/* recent activity */}
        <section className={`${CARD} px-5 py-5`}>
          <div className="mb-4 flex items-center justify-between">
            <span className={LABEL}>Recent activity</span>
            <Link href="/admin?tab=audit" className="text-[12.5px] font-semibold text-[#7B1E2B]">
              All activity
            </Link>
          </div>
          <ul className="grid gap-2.5">
            {(dash?.events ?? []).map((e) => (
              <li key={e.id} className="flex gap-3 text-[13.5px]">
                <span className="flex-1">
                  <strong className="font-semibold">{e.actor_name ?? e.actor}</strong> {lower(sentence(e))}
                </span>
                <span className="shrink-0 text-xs text-[#A79B9C]">
                  {ist(e.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {live.length > 0 ? (
        <section className={`${CARD} px-5 py-5`}>
          <div className={`${LABEL} mb-3`}>Coaching</div>
          <ul className="grid gap-2">
            {live.map((b) => (
              <li key={b.id} className="flex items-center gap-3 text-sm">
                <Link href={`/admin?tab=batches&batch=${b.id}`} className="font-semibold text-[#7B1E2B]">
                  {b.name}
                </Link>
                <span className="text-xs text-[#6B5B5D]">
                  {n(b.student_count)} student{b.student_count === 1 ? "" : "s"} · {n(b.teacher_count)} teacher{b.teacher_count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function greetingPart(now: Date): string {
  const h = Number(ist(now, { hour: "2-digit", hour12: false }));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function Inbox({ href, icon, title, n: count, hot }: { href: string; icon: ReactNode; title: string; n: number; hot?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 rounded-[11px] px-4 py-3.5 ${
        hot ? "border-[1.5px] border-[#E5BE7A] bg-[#FAF1DC]" : "border border-[#F2E9DA]"
      }`}
    >
      <span className={hot ? "text-[#7B1E2B]" : "text-[#6B5B5D]"}>{icon}</span>
      <span className="flex-1 text-[15px] font-semibold">{title}</span>
      <span className={`font-[family-name:var(--font-newsreader)] text-[26px] lining-nums tabular-nums ${hot ? "text-[#7B1E2B]" : ""}`}>
        {count === 0 ? "✓" : n(count)}
      </span>
      <ChevronRight size={18} className="text-[#6B5B5D]" aria-hidden />
    </Link>
  );
}

/* -------------------------------------------------------------- students --- */

/**
 * The register: listed a page at a time, and searched when the office is after
 * one child. The query and the page both live in the URL, so a row somebody is
 * looking at can be sent to a colleague as a link.
 *
 * It listed nothing at all before a search was typed, which reads as a page
 * that does not work. 9,652 names is still not one page — hence 100 at a time,
 * a class filter, and prev/next.
 */
function StudentsPanel({
  students, register = null, query, canReset,
}: { students: StudentRow[]; register?: Register | null; query: string; canReset: boolean }) {
  const rows = query ? students : (register?.rows ?? []);
  return (
    <div className="space-y-5">
      {!query && register ? <RegisterBar register={register} /> : null}
      {query && students.length === 0 ? (
        <p className="text-sm text-[#B22234]">Nobody on the register matches “{query}”.</p>
      ) : rows.length === 0 ? (
        <p className={`${CARD} p-5 text-sm text-[#6B5B5D]`}>Nobody on the register yet.</p>
      ) : (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="border-b border-[#F2E9DA] bg-[#FBF7EF] text-xs text-[#6B5B5D]">
              <tr>
                <Th>User ID</Th>
                <Th>Name</Th>
                <Th>Class</Th>
                <Th>School</Th>
                <Th>App</Th>
                <Th>Batches</Th>
                {canReset ? <Th>Password</Th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E9DA]">
              {rows.map((s) => (
                <tr key={s.uid}>
                  <Td mono>{s.uid.replace(/(\d{3})(?=\d)/g, "$1 ")}</Td>
                  <Td>{s.name}</Td>
                  <Td>
                    {s.class}
                    {s.stream ? ` · ${s.stream}` : ""}
                  </Td>
                  <Td>{s.school_name}</Td>
                  <Td>
                    <AppState s={s} />
                  </Td>
                  <Td>{s.batches ?? <span className="text-[#A79B9C]">—</span>}</Td>
                  {canReset ? (
                    <Td>
                      <RowAction
                        action={resetStudentPassword}
                        fields={{ uid: s.uid }}
                        confirm={
                          s.claimed
                            ? `Clear ${s.name}'s password? Their old one stops working at once.`
                            : `Open an app account for ${s.name} and issue a password?`
                        }
                      >
                        {s.claimed ? "Reset password" : "Issue password"}
                      </RowAction>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {query && students.length === 100 ? (
            <p className="border-t border-[#F2E9DA] px-3 py-2 text-xs text-[#6B5B5D]">
              Showing the first 100. Narrow the search to see the rest.
            </p>
          ) : null}
          {!query && register && register.pages > 1 ? <Pager register={register} /> : null}
        </div>
      )}
    </div>
  );
}

/** Where this slice sits in the register, and the class filter over it. */
function RegisterBar({ register }: { register: Register }) {
  const from = (register.page - 1) * 100 + 1;
  const to = Math.min(register.page * 100, register.total);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-[#6B5B5D]">
        {register.total ? (
          <>
            Showing <b>{n(from)}–{n(to)}</b> of {n(register.total)} on the register.
          </>
        ) : (
          "Nobody on the register."
        )}{" "}
        Search above for one child; a forgotten app password is cleared here.
      </p>
      <div className="flex-1" />
      <nav className="flex items-center gap-1.5" aria-label="Filter by class">
        {[
          { key: "", label: "All" },
          { key: "IX", label: "IX" },
          { key: "X", label: "X" },
          { key: "XI", label: "XI" },
          { key: "XII", label: "XII" },
        ].map((c) => (
          <Link
            key={c.key || "all"}
            href={`/admin?tab=students${c.key ? `&sclass=${c.key}` : ""}`}
            className={`rounded-[8px] border px-2.5 py-1 text-[12.5px] font-semibold ${
              (register.cls ?? "") === c.key
                ? "border-[#7B1E2B] bg-[#7B1E2B] text-white"
                : "border-[#F2E9DA] bg-white text-[#6B5B5D] hover:border-[#7B1E2B]"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Prev / next over the register. Pages are links, so Back works. */
function Pager({ register }: { register: Register }) {
  const href = (p: number) =>
    `/admin?tab=students${register.cls ? `&sclass=${register.cls}` : ""}&page=${p}`;
  const btn = "rounded-[8px] border border-[#F2E9DA] px-3 py-1.5 text-[12.5px] font-semibold";
  return (
    <div className="flex items-center gap-3 border-t border-[#F2E9DA] px-3 py-2.5">
      {register.page > 1 ? (
        <Link href={href(register.page - 1)} className={`${btn} bg-white hover:border-[#7B1E2B]`}>
          Previous
        </Link>
      ) : (
        <span className={`${btn} bg-[#FBF7EF] text-[#A79B9C]`}>Previous</span>
      )}
      <span className="text-[12.5px] text-[#6B5B5D]">
        Page {n(register.page)} of {n(register.pages)}
      </span>
      {register.page < register.pages ? (
        <Link href={href(register.page + 1)} className={`${btn} bg-white hover:border-[#7B1E2B]`}>
          Next
        </Link>
      ) : (
        <span className={`${btn} bg-[#FBF7EF] text-[#A79B9C]`}>Next</span>
      )}
    </div>
  );
}

/** The app account's state, as a coloured pill — what the office is asked at the counter. */
function AppState({ s }: { s: StudentRow }) {
  const [label, cls] = !s.claimed
    ? ["Never claimed", "bg-[#F2E9DA] text-[#6B5B5D]"]
    : s.locked_out
      ? ["Locked out", "bg-[#FBE9EA] text-[#B22234]"]
      : s.must_change
        ? ["Password issued", "bg-[#FAF1DC] text-[#8A6D1F]"]
        : ["Claimed", "bg-[#E6F5F2] text-[#137565]"];
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

/* ----------------------------------------------------------------- audit --- */

/** Append-only, newest first, as sentences — redesign board 11. */
function AuditPanel({ events }: { events: AuditRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[#6B5B5D]">Nothing has been recorded yet.</p>;
  }

  return (
    <div className={`${CARD} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="border-b border-[#F2E9DA] bg-[#FBF7EF] text-xs text-[#6B5B5D]">
          <tr>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>What</Th>
            <Th> </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2E9DA]">
          {events.map((e) => (
            <tr key={e.id}>
              <Td mono>
                {ist(e.at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
              </Td>
              <Td>
                <span className="font-semibold">{e.actor_name ?? e.actor}</span>
                <span className="ml-1.5 font-mono text-xs text-[#A79B9C]">{e.actor}</span>
              </Td>
              <Td>{sentence(e)}</Td>
              <Td>
                {ONE_WAY.has(e.action) ? (
                  <span className="whitespace-nowrap rounded-full bg-[#F6E9E9] px-2.5 py-1 text-xs font-semibold text-[#7B1E2B]">One-way</span>
                ) : null}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- shared --- */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2.5 text-left font-semibold">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2.5 align-top ${mono ? "whitespace-nowrap font-mono text-xs" : ""}`}>{children}</td>;
}

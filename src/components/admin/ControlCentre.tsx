import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { resetStudentPassword, signOut } from "@/app/admin/actions";
import type { Staff, StaffListRow, AuditRow } from "@/lib/admin/staff";
import type { Batch, MemberRow, BatchTeacher } from "@/lib/admin/batches";
import type { Overview, StudentRow } from "@/lib/admin/students";
import type { LiveClass } from "@/lib/admin/classes";
import type { Post } from "@/lib/admin/posts";
import StaffPanel from "./StaffPanel";
import BatchesPanel from "./BatchesPanel";
import ClassesPanel from "./ClassesPanel";
import PostsPanel from "./PostsPanel";
import { RowAction } from "./ui";

export interface OpenBatch {
  batch: Batch;
  members: MemberRow[];
  teachers: BatchTeacher[];
}

const n = (x: number) => x.toLocaleString("en-IN");

/**
 * The control centre shell.
 *
 * A server component, and every tab is a link rather than client state. That is
 * the deliberate opposite of the exam dashboard this replaced, which held its
 * whole view in the browser and re-fetched it every twelve seconds — a habit
 * that cost 110 Neon CU hours on a page two people had open. Here, nothing is
 * read until somebody asks for it, and nothing is read again until they ask
 * again.
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
  events,
  classes,
  posts,
  liveReady,
}: {
  staff: Staff;
  tab: string;
  query: string;
  overview: Overview | null;
  staffList: StaffListRow[];
  batches: Batch[];
  openBatch: OpenBatch | null;
  students: StudentRow[];
  events: AuditRow[];
  classes: LiveClass[];
  posts: Post[];
  liveReady: boolean;
}) {
  const isAdmin = staff.role === "admin";

  const tabs = isAdmin
    ? [
        ["overview", "Overview"],
        ["staff", "Teachers & admins"],
        ["batches", "Batches"],
        ["classes", "Classes"],
        ["posts", "Posts"],
        ["students", "Students"],
        ["audit", "Activity"],
      ]
    : [
        ["batches", "My batches"],
        ["classes", "Classes"],
        ["posts", "Posts"],
      ];

  return (
    <main className="min-h-screen bg-[#141010] text-[#e8e0dc]">
      <header className="border-b border-[#2a2321]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <h1 className="text-sm font-bold tracking-wide">KIDS control centre</h1>
          <span className="text-xs text-[#6b5c57]">
            {staff.full_name} · <span className="font-mono">{staff.staff_id}</span> ·{" "}
            {isAdmin ? "Admin" : "Teacher"}
          </span>
          <form action={signOut} className="ml-auto">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded border border-[#3a2f2c] px-2.5
                         py-1 text-xs text-[#c9b8b2] hover:bg-[#241c1a]"
            >
              <LogOut className="h-3 w-3" aria-hidden />
              Sign out
            </button>
          </form>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              href={`/admin?tab=${key}`}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold ${
                tab === key
                  ? "border-[#8a6f66] text-[#e8e0dc]"
                  : "border-transparent text-[#6b5c57] hover:text-[#c9b8b2]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6">
        {tab === "overview" && overview ? <OverviewPanel o={overview} batches={batches} /> : null}
        {tab === "staff" ? <StaffPanel staff={staffList} me={staff} /> : null}
        {tab === "batches" ? (
          <BatchesPanel
            batches={batches}
            open={openBatch}
            teachers={staffList.filter((s) => !s.disabled_at)}
            canEdit={isAdmin}
          />
        ) : null}
        {tab === "classes" ? (
          <ClassesPanel classes={classes} batches={batches} configured={liveReady} />
        ) : null}
        {tab === "posts" ? (
          <PostsPanel posts={posts} batches={batches} canPostToAll={isAdmin} />
        ) : null}
        {tab === "students" ? (
          <StudentsPanel students={students} query={query} canReset={isAdmin} />
        ) : null}
        {tab === "audit" ? <AuditPanel events={events} /> : null}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------- overview --- */

function OverviewPanel({ o, batches }: { o: Overview; batches: Batch[] }) {
  const live = batches.filter((b) => !b.archived_at);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="On the register" value={n(o.students)} note="Demo records excluded" />
        <Stat label="App accounts claimed" value={n(o.claimed)} />
        <Stat label="Live batches" value={n(o.batches)} />
        <Stat label="Students in a batch" value={n(o.inABatch)} />
        <Stat label="Teachers" value={n(o.teachers)} />
        <Stat label="Admins" value={n(o.admins)} />
      </div>

      {live.length === 0 ? (
        <p className="rounded border border-[#2a2321] bg-[#1a1514] p-4 text-sm text-[#9c8c86]">
          No batches yet. Create one under <strong className="text-[#c9b8b2]">Batches</strong>, then
          add students to it by pasting their User IDs. Nothing here is fixed in code — a batch you
          create now is live immediately, and one you retire keeps its roster for the record.
        </p>
      ) : (
        <div className="rounded border border-[#2a2321] bg-[#1a1514]">
          <h2 className="border-b border-[#2a2321] px-4 py-3 text-sm font-bold">Live batches</h2>
          <ul className="divide-y divide-[#2a2321]">
            {live.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Link href={`/admin?tab=batches&batch=${b.id}`} className="font-semibold underline">
                  {b.name}
                </Link>
                <span className="text-xs text-[#6b5c57]">
                  {b.class_label ? `Class ${b.class_label} · ` : ""}
                  {n(b.student_count)} student{b.student_count === 1 ? "" : "s"} ·{" "}
                  {n(b.teacher_count)} teacher{b.teacher_count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded border border-[#2a2321] bg-[#1a1514] p-3">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-[#9c8c86]">{label}</div>
      {note ? <div className="mt-0.5 text-[10px] text-[#6b5c57]">{note}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------- students --- */

/**
 * The register, searched rather than listed.
 *
 * A plain GET form: no JavaScript, no fetch, and the query lives in the URL so
 * a search can be shared or reloaded. 9,714 names is not a page.
 */
function StudentsPanel({
  students,
  query,
  canReset,
}: {
  students: StudentRow[];
  query: string;
  canReset: boolean;
}) {
  return (
    <div className="space-y-5">
      <form method="get" className="flex flex-wrap gap-2">
        <input type="hidden" name="tab" value="students" />
        <input
          name="q"
          defaultValue={query}
          placeholder="User ID, name, or school"
          className="w-full max-w-md rounded border border-[#3a2f2c] bg-[#1a1514] px-3 py-2 text-sm
                     outline-none placeholder:text-[#6b5c57] focus:border-[#8a6f66]"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded bg-[#8a6f66] px-3 py-2 text-sm
                     font-semibold text-[#141010]"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Search
        </button>
      </form>

      {!query ? (
        <p className="text-sm text-[#6b5c57]">
          Search for a child by their nine-digit User ID, their name, or their school. This is
          where a forgotten app password is cleared — /app/reset sends them here.
        </p>
      ) : students.length === 0 ? (
        <p className="text-sm text-[#d98b8b]">Nobody on the register matches “{query}”.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-[#2a2321] bg-[#1a1514]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#2a2321] text-xs text-[#9c8c86]">
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
            <tbody className="divide-y divide-[#2a2321]">
              {students.map((s) => (
                <tr key={s.uid}>
                  <Td mono>{s.uid}</Td>
                  <Td>{s.name}</Td>
                  <Td>
                    {s.class}
                    {s.stream ? ` · ${s.stream}` : ""}
                  </Td>
                  <Td>{s.school_name}</Td>
                  <Td>
                    <AppState s={s} />
                  </Td>
                  <Td>{s.batches ?? <span className="text-[#6b5c57]">—</span>}</Td>
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
                        {s.claimed ? "Reset" : "Issue"}
                      </RowAction>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 100 ? (
            <p className="border-t border-[#2a2321] px-3 py-2 text-xs text-[#6b5c57]">
              Showing the first 100. Narrow the search to see the rest.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * What state this child's app account is in — the three things the office is
 * actually asked about at the counter.
 *
 * "Locked" matters most: three wrong guesses lock an account for fifteen
 * minutes, and a child standing there being told "it says wrong password" is
 * usually this, not a forgotten one. Issuing a password clears it.
 *
 * Whether the lockout is still running was decided by the database's clock in
 * the query that fetched this row, not here.
 */
function AppState({ s }: { s: StudentRow }) {
  if (!s.claimed) return <span className="text-[#6b5c57]">Never claimed</span>;
  if (s.locked_out) return <span className="text-[#d98b8b]">Locked out</span>;
  if (s.must_change) return <span className="text-[#c9a86b]">Password issued</span>;
  return <span className="text-[#8fbfae]">Claimed</span>;
}

/* ----------------------------------------------------------------- audit --- */

/** What the named accounts were for. Append-only, newest first. */
function AuditPanel({ events }: { events: AuditRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[#6b5c57]">Nothing has been recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-[#2a2321] bg-[#1a1514]">
      <table className="w-full text-sm">
        <thead className="border-b border-[#2a2321] text-xs text-[#9c8c86]">
          <tr>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>What</Th>
            <Th>On</Th>
            <Th>Detail</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2321]">
          {events.map((e) => (
            <tr key={e.id}>
              <Td mono>
                {new Date(e.at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </Td>
              <Td>
                {e.actor_name ?? e.actor}
                <span className="ml-1.5 font-mono text-xs text-[#6b5c57]">{e.actor}</span>
              </Td>
              <Td>{e.action.replace(/_/g, " ")}</Td>
              <Td mono>{e.target_id ?? "—"}</Td>
              <Td>
                <span className="text-xs text-[#9c8c86]">
                  {e.detail ? JSON.stringify(e.detail) : "—"}
                </span>
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
  return <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 align-top ${mono ? "whitespace-nowrap font-mono text-xs" : ""}`}>
      {children}
    </td>
  );
}

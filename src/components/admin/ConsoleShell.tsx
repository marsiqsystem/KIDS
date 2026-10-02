import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  Award,
  BookOpen,
  ClipboardList,
  FilePenLine,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  QrCode,
  Search,
  Shield,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { signOut } from "@/app/admin/actions";
import type { Staff } from "@/lib/admin/staff";

const n = (x: number) => x.toLocaleString("en-IN");

/**
 * The control centre's frame: the grouped sidebar and the top bar. Redesign
 * board 05.
 *
 * Its own component so that a page outside the tabbed /admin -- a paper's
 * question sets, board 17 A2 -- sits inside the same console instead of on a
 * bare page with a back link. `tab` is which sidebar item is lit.
 */
export default function ConsoleShell({
  staff,
  tab,
  query = "",
  waiting = 0,
  correctionsWaiting = 0,
  requestsWaiting = 0,
  hasDesk = false,
  children,
}: {
  staff: Staff;
  tab: string;
  query?: string;
  waiting?: number;
  correctionsWaiting?: number;
  requestsWaiting?: number;
  hasDesk?: boolean;
  children: ReactNode;
}) {
  const isAdmin = staff.role === "admin";

  type Item = { key: string; label: string; icon: ReactNode; count?: number; href?: string };
  const groups: { title: string; items: Item[] }[] = isAdmin
    ? [
        { title: "Today", items: [{ key: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> }] },
        {
          title: "Inboxes",
          items: [
            { key: "applications", label: "Applications", icon: <UserPlus size={18} />, count: waiting },
            { key: "corrections", label: "Corrections", icon: <FilePenLine size={18} />, count: correctionsWaiting },
            { key: "claims", label: "Claims", icon: <KeyRound size={18} />, count: requestsWaiting },
          ],
        },
        {
          title: "Register",
          items: [
            { key: "students", label: "Students", icon: <Users size={18} /> },
            { key: "centres", label: "Centres", icon: <MapPin size={18} /> },
          ],
        },
        {
          title: "Exam",
          items: [
            { key: "exams", label: "Exams", icon: <ClipboardList size={18} /> },
            { key: "desk", label: "Desk", icon: <QrCode size={18} />, href: "/admin/desk" },
            { key: "results", label: "Results", icon: <Award size={18} /> },
          ],
        },
        {
          title: "App",
          items: [
            { key: "content", label: "Content", icon: <BookOpen size={18} /> },
            { key: "posts", label: "Posts", icon: <Megaphone size={18} /> },
          ],
        },
        {
          title: "Coaching",
          items: [
            { key: "batches", label: "Batches", icon: <Layers size={18} /> },
            { key: "classes", label: "Classes", icon: <Video size={18} /> },
          ],
        },
        {
          title: "Admin",
          items: [
            { key: "staff", label: "Teachers & admins", icon: <Shield size={18} /> },
            { key: "audit", label: "Activity", icon: <History size={18} /> },
          ],
        },
      ]
    : [
        {
          title: "Coaching",
          items: [
            { key: "batches", label: "My batches", icon: <Layers size={18} /> },
            { key: "classes", label: "Classes", icon: <Video size={18} /> },
            { key: "posts", label: "Posts", icon: <Megaphone size={18} /> },
          ],
        },
        ...(hasDesk
          ? [{ title: "Exam", items: [{ key: "desk", label: "Desk", icon: <QrCode size={18} />, href: "/admin/desk" }] }]
          : []),
      ];

  const initials = staff.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <main className="flex min-h-screen bg-[#FBF7EF] text-[#2B1A1C]">
      {/* ------------------------------------------------------------ sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col bg-[#3D0A10] text-[#F2E9DA] lg:flex">
        <div className="flex items-center gap-3 border-b border-[rgba(242,233,218,0.12)] px-[18px] py-5">
          <Image src="/kids-icon.png" alt="" width={32} height={32} />
          <div>
            <div className="text-sm font-bold text-[#FDFBF7]">KIDS</div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#E5BE7A]">Control centre</div>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3.5" aria-label="Control centre">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A8908F]">
                {g.title}
              </div>
              <div className="grid gap-0.5">
                {g.items.map((it) => {
                  const on = tab === it.key;
                  return (
                    <Link
                      key={it.key}
                      href={it.href ?? `/admin?tab=${it.key}`}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-sm ${
                        on ? "bg-[#7B1E2B] font-semibold text-[#FDFBF7]" : "hover:bg-[rgba(242,233,218,0.08)]"
                      }`}
                    >
                      {it.icon}
                      <span className="flex-1">{it.label}</span>
                      {it.count ? (
                        <span className="grid h-5 min-w-6 place-items-center rounded-full bg-[#C9A24B] px-1.5 text-[11.5px] font-bold text-[#3D0A10] tabular-nums">
                          {n(it.count)}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[rgba(242,233,218,0.12)] px-[18px] py-3.5 text-[11.5px] leading-relaxed text-[#A8908F]">
          Reg. S/1L/19796
        </div>
      </aside>

      {/* --------------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-[#F2E9DA] bg-white px-6 py-3.5">
          {isAdmin ? (
            <form method="get" action="/admin" className="flex h-[42px] max-w-[460px] flex-1 items-center gap-2.5 rounded-[10px] border-[1.5px] border-[#F2E9DA] bg-[#FBF7EF] px-3.5 focus-within:border-[#7B1E2B]">
              <input type="hidden" name="tab" value="students" />
              <Search size={18} className="text-[#6B5B5D]" aria-hidden />
              <input
                name="q"
                defaultValue={tab === "students" ? query : ""}
                placeholder="Search UID, name or school"
                aria-label="Search the register"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A79B9C]"
              />
            </form>
          ) : (
            <span className="text-sm font-semibold text-[#6B5B5D]">You see only your own batches.</span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[13.5px] font-semibold">{staff.full_name}</div>
              <div className="text-[11.5px] text-[#6B5B5D]">
                <span className="font-mono">{staff.staff_id}</span> · {isAdmin ? "Admin" : "Teacher"}
              </div>
            </div>
            <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#7B1E2B] text-sm font-bold text-[#FDFBF7]">
              {initials}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                className="grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[#F2E9DA] text-[#6B5B5D] hover:bg-[#F6E9E9]"
              >
                <LogOut size={18} aria-hidden />
              </button>
            </form>
          </div>
          {/* Below laptop width the sidebar folds into a row of links. */}
          <nav className="flex w-full gap-1 overflow-x-auto lg:hidden" aria-label="Sections">
            {groups.flatMap((g) => g.items).map((it) => (
              <Link
                key={it.key}
                href={it.href ?? `/admin?tab=${it.key}`}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  tab === it.key ? "bg-[#7B1E2B] text-[#FDFBF7]" : "bg-[#F2E9DA] text-[#2B1A1C]"
                }`}
              >
                {it.label}
                {it.count ? ` ${n(it.count)}` : ""}
              </Link>
            ))}
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}

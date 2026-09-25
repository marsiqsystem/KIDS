import type { Metadata } from "next";
import { adminConfigured } from "@/lib/admin/auth";
import { currentStaff } from "@/lib/admin/session";
import { hasAnyAdmin, listStaff, recentEvents } from "@/lib/admin/staff";
import { batchMembers, batchTeachers, batchesForTeacher, listBatches } from "@/lib/admin/batches";
import { listStudents, overview, searchStudents } from "@/lib/admin/students";
import { recentClasses } from "@/lib/admin/classes";
import { listPosts } from "@/lib/admin/posts";
import { pendingCount, pendingRegistrations, recentDecisions } from "@/lib/admin/registrations";
import { claimTotals, claimsBySchool, unclaimedAtSchool } from "@/lib/admin/claims";
import { pendingAccountRequestCount, pendingAccountRequests } from "@/lib/admin/account-requests";
import { pendingCorrectionCount, pendingCorrections } from "@/lib/admin/corrections";
import { awardState, centresOverview, papersForAdmin } from "@/lib/admin/exams";
import { contentChapters } from "@/lib/admin/content";
import { liveConfigured } from "@/lib/live/jitsi";
import { desksFor } from "@/lib/exam/checkin";
import Bootstrap from "@/components/admin/Bootstrap";
import StaffSignIn from "@/components/admin/StaffSignIn";
import FirstPassword from "@/components/admin/FirstPassword";
import ControlCentre from "@/components/admin/ControlCentre";

export const metadata: Metadata = {
  title: "KIDS · Control centre",
  robots: { index: false, follow: false },
};

// Never cached: the gate is per-request and the page is the office's live view
// of who exists. Note what is NOT here any more — the 12-second poll that used
// to sit on this screen and once burned 110 Neon CU hours. A control centre is
// a page somebody leaves open all day; it reloads when they ask it to.
export const dynamic = "force-dynamic";

/**
 * The KIDS control centre.
 *
 * This replaced the SET 2026 exam control room, whose job finished when the
 * online paper did. The marks that screen watched are still in the database and
 * still reach every student through their QR code — what has gone is a
 * dashboard for an exam that is over, not the record of it.
 *
 * Four doors, in order:
 *
 *   1. No admin exists         → bootstrap with KIDS_ADMIN_KEY.
 *   2. Nobody signed in        → the Staff ID sign-in.
 *   3. Signed in, must_change  → replace the one-time password, nothing else.
 *   4. Signed in               → the control centre, admin or teacher.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string; q?: string; batch?: string; school?: string; cls?: string;
    /** Register listing: which class to show, and which page of it. */
    sclass?: string; page?: string;
  }>;
}) {
  const staff = await currentStaff();

  if (!staff) {
    if (!(await hasAnyAdmin())) return <Bootstrap configured={adminConfigured()} />;
    return <StaffSignIn />;
  }

  // Nothing else on this screen is reachable until the issued password is gone.
  if (staff.must_change) return <FirstPassword staff={staff} />;

  const {
    tab = "overview", q = "", batch = "", school = "", cls = "X",
    sclass = "", page = "1",
  } = await searchParams;
  const isAdmin = staff.role === "admin";

  /**
   * A teacher sees their own batches and nothing else — no staff list, no
   * register, no audit trail. Enforced here by not loading it, as well as in
   * the actions by requireStaff("admin").
   */
  if (!isAdmin) {
    const mine = await batchesForTeacher(staff.staff_id);
    const open = mine.find((b) => b.id === batch) ?? null;
    return (
      <ControlCentre
        staff={staff}
        tab={tab === "classes" || tab === "posts" ? tab : "batches"}
        query=""
        batches={mine}
        openBatch={
          open
            ? { batch: open, members: await batchMembers(open.id), teachers: await batchTeachers(open.id) }
            : null
        }
        overview={null}
        staffList={[]}
        students={[]}
        events={[]}
        classes={tab === "classes" ? await recentClasses(staff.staff_id) : []}
        posts={tab === "posts" ? await listPosts(staff.staff_id) : []}
        liveReady={liveConfigured()}
        hasDesk={(await desksFor(staff.staff_id, false)).length > 0}
      />
    );
  }

  // Only what the chosen tab needs. Loading all five panels on every render is
  // the same mistake the poll was, spread across a page instead of a timer.
  //
  // Students is the one tab with two sources: a search narrows the register, and
  // no search lists it a page at a time. It used to show nothing at all until
  // somebody typed, which reads as a page that does not work.
  const batches =
    tab === "batches" || tab === "overview" || tab === "classes" || tab === "posts"
      ? await listBatches(true)
      : [];
  const open = batch ? (batches.find((b) => b.id === batch) ?? null) : null;

  return (
    <ControlCentre
      staff={staff}
      tab={tab}
      query={q}
      overview={tab === "overview" ? await overview() : null}
      staffList={tab === "staff" || tab === "batches" || tab === "exams" ? await listStaff() : []}
      batches={batches}
      openBatch={
        open
          ? { batch: open, members: await batchMembers(open.id), teachers: await batchTeachers(open.id) }
          : null
      }
      students={tab === "students" && q ? await searchStudents(q) : []}
      register={
        tab === "students" && !q
          ? await listStudents({ cls: sclass, page: Number(page) || 1 })
          : null
      }
      events={tab === "audit" ? await recentEvents(150) : []}
      classes={tab === "classes" ? await recentClasses() : []}
      posts={tab === "posts" ? await listPosts() : []}
      liveReady={liveConfigured()}
      applications={
        tab === "applications"
          ? { pending: await pendingRegistrations(), decided: await recentDecisions() }
          : null
      }
      waiting={await pendingCount()}
      correctionsWaiting={await pendingCorrectionCount()}
      requestsWaiting={await pendingAccountRequestCount()}
      claims={tab === "claims" ? await loadClaims(school) : null}
      corrections={tab === "corrections" ? await pendingCorrections() : null}
      papers={tab === "exams" || tab === "results" ? await papersForAdmin() : null}
      centres={tab === "centres" || tab === "exams" ? await centresOverview() : null}
      award={tab === "results" ? await awardState() : null}
      content={tab === "content" ? await loadContent(cls) : null}
      dashboard={
        tab === "overview"
          ? { claims: await claimTotals(), papers: await papersForAdmin(), events: await recentEvents(10) }
          : null
      }
    />
  );
}

async function loadClaims(school: string) {
  const [totals, schools, requests] = await Promise.all([claimTotals(), claimsBySchool(), pendingAccountRequests()]);
  const [centre, code] = school.split("|");
  const picked = schools.find((s) => s.centre_code === centre && s.school_code === code) ?? null;
  return {
    totals,
    schools,
    requests,
    open: picked ? { school: picked, unclaimed: await unclaimedAtSchool(centre, code) } : null,
  };
}

const CONTENT_CHOICES = new Set(["IX", "X", "XI|Science", "XI|Commerce", "XI|Arts", "XII|Science", "XII|Commerce", "XII|Arts"]);

async function loadContent(raw: string) {
  const choice = CONTENT_CHOICES.has(raw) ? raw : "X";
  const [c, stream] = choice.split("|");
  return { choice, chapters: await contentChapters(c, stream ?? null) };
}

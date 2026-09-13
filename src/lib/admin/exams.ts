import { sql } from "@/lib/exam/db";
import { getPaper } from "@/lib/exam/papers";
import { PAPERS } from "@/lib/exam/config";
import { questionSetFor } from "@/lib/exam/schedule";
import { logAdminEvent } from "./staff";

/**
 * Exams, results and centres, as the office runs them.
 *
 * Three rules hold everywhere in this file, and each is here because breaking
 * it would hurt a child rather than merely look wrong:
 *
 *   1. PHASE 1 IS HISTORY. What was sat on 19 July cannot be rescheduled from
 *      here; its window is the record of what happened.
 *   2. A paper whose questions are not loaded cannot open, whatever its date
 *      says. The screen shows it; src/lib/exam/schedule.ts enforces it.
 *   3. Publication writes the columns the result pages ACTUALLY read. For
 *      Phase 1 that is still `results_meta`; a switch on `exam_papers` alone
 *      would be a control wired to nothing.
 */

export interface AdminPaper {
  id: string;
  code: string;
  name: string;
  phase_code: string;
  phase_name: string;
  mode: "online" | "offline";
  kind: "live" | "mock";
  max_marks: number;
  scan_opens_at: Date | null;
  starts_at: Date | null;
  ends_at: Date | null;
  duration_minutes: number | null;
  requires_checkin: boolean;
  attempts: number;
  results: number;
  /** Which of IX, X, XI, XII have a question set loaded for this sitting. */
  loaded: string[];
  /** Whether students can see marks right now, read from where the pages read it. */
  visible: boolean;
  counts_for_award: boolean;
}

export async function papersForAdmin(): Promise<AdminPaper[]> {
  const rows = (await sql`
    select pa.id::text, pa.code, pa.name, ph.code as phase_code, ph.name as phase_name,
           pa.mode, pa.kind, pa.max_marks, pa.scan_opens_at, pa.starts_at, pa.ends_at,
           pa.duration_minutes, pa.requires_checkin, pa.published, pa.publish_at,
           (ph.award_paper_id = pa.id) as counts_for_award,
           (select count(*)::int from attempts a where a.exam_paper_id = pa.id) as attempts,
           (select count(*)::int from online_results o where o.exam_paper_id = pa.id)
             + (select count(*)::int from offline_results f where f.exam_paper_id = pa.id) as results
      from exam_papers pa
      join exam_phases ph on ph.id = pa.phase_id
     where pa.archived_at is null
     order by ph.ordinal, pa.kind desc, pa.code
  `) as (Omit<AdminPaper, "loaded" | "visible"> & { published: boolean; publish_at: Date | null })[];

  const [meta] = (await sql`
    select (published and publish_at is not null and now() >= publish_at) as online_open,
           (offline_published and offline_publish_at is not null
             and now() >= offline_publish_at) as offline_open
      from results_meta where id
  `.catch(() => [])) as { online_open: boolean; offline_open: boolean }[];

  return rows.map((r) => ({
    ...r,
    loaded:
      r.mode === "online"
        ? (PAPERS as readonly string[]).filter((c) => {
            const set = questionSetFor(r.code, c);
            return set ? Boolean(getPaper(set)) : false;
          })
        : [],
    visible:
      r.code === "P1-ONLINE" ? Boolean(meta?.online_open)
      : r.code === "P1-OFFLINE" ? Boolean(meta?.offline_open)
      : Boolean(r.published && (!r.publish_at || new Date(r.publish_at) <= new Date())),
  }));
}

/** Kolkata wall-clock date and time to an absolute instant. */
export function istInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type Scheduled = { ok: true } | { ok: false; message: string };

export async function schedulePaper(
  id: string,
  input: { startsAt: Date; durationMinutes: number; scanLeadMinutes: number; requiresCheckin: boolean },
  staffId: string,
): Promise<Scheduled> {
  const [p] = (await sql`
    select pa.code, pa.mode, ph.code as phase_code,
           (select count(*)::int from attempts a where a.exam_paper_id = pa.id) as attempts
      from exam_papers pa join exam_phases ph on ph.id = pa.phase_id
     where pa.id = ${id}::bigint and pa.archived_at is null
  `) as { code: string; mode: string; phase_code: string; attempts: number }[];

  if (!p) return { ok: false, message: "That paper does not exist." };
  if (p.phase_code === "P1") {
    return { ok: false, message: "Phase 1 was sat on 19 July. Its window is the record of what happened." };
  }
  if (p.mode !== "online") return { ok: false, message: "An offline paper has no app window to set." };
  if (p.attempts > 0) {
    // Moving a window after children have started would move THEIR deadline,
    // which attempts.ts deliberately never does.
    return { ok: false, message: `${p.attempts} students have already started this paper. Its window can no longer move.` };
  }
  if (input.durationMinutes < 5 || input.durationMinutes > 240) {
    return { ok: false, message: "A paper runs between 5 and 240 minutes." };
  }
  if (input.scanLeadMinutes < 0 || input.scanLeadMinutes > 180) {
    return { ok: false, message: "Check-in opens between 0 and 180 minutes before the paper." };
  }
  if (input.startsAt.getTime() < Date.now()) {
    return { ok: false, message: "That start time has already passed." };
  }

  const scan = new Date(input.startsAt.getTime() - input.scanLeadMinutes * 60_000);
  const end = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);

  await sql`
    update exam_papers
       set scan_opens_at = ${scan.toISOString()}, starts_at = ${input.startsAt.toISOString()},
           ends_at = ${end.toISOString()}, duration_minutes = ${input.durationMinutes},
           requires_checkin = ${input.requiresCheckin}
     where id = ${id}::bigint
  `;
  await logAdminEvent(staffId, "paper_scheduled", undefined, {
    paper: p.code,
    starts_at: input.startsAt.toISOString(),
    minutes: input.durationMinutes,
    checkin: input.requiresCheckin,
  });
  return { ok: true };
}

export async function unschedulePaper(id: string, staffId: string): Promise<Scheduled> {
  const [p] = (await sql`
    select pa.code, ph.code as phase_code,
           (select count(*)::int from attempts a where a.exam_paper_id = pa.id) as attempts
      from exam_papers pa join exam_phases ph on ph.id = pa.phase_id
     where pa.id = ${id}::bigint
  `) as { code: string; phase_code: string; attempts: number }[];
  if (!p) return { ok: false, message: "That paper does not exist." };
  if (p.phase_code === "P1") return { ok: false, message: "Phase 1 cannot be unscheduled." };
  if (p.attempts > 0) return { ok: false, message: "Students have started this paper." };

  await sql`
    update exam_papers set scan_opens_at = null, starts_at = null, ends_at = null where id = ${id}::bigint
  `;
  await logAdminEvent(staffId, "paper_unscheduled", undefined, { paper: p.code });
  return { ok: true };
}

/**
 * A mock: sat, marked and shown exactly like the real paper, counted nowhere.
 *
 * Filed under Phase 2, because a mock is a rehearsal of Phase 2 -- November's
 * full-size one above all, which is the only way to learn what nine thousand
 * phones do before it counts.
 */
export async function createMock(
  input: { name: string; maxMarks: number; requiresCheckin: boolean },
  staffId: string,
): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Give the mock a name students will recognise." };
  if (input.maxMarks < 1 || input.maxMarks > 200) return { ok: false, message: "Marks run from 1 to 200." };

  const [phase] = (await sql`
    select ph.id::text from exam_phases ph join exam_series se on se.id = ph.series_id
     where se.code = 'SET2026' and ph.code = 'P2'
  `) as { id: string }[];
  if (!phase) return { ok: false, message: "Phase 2 does not exist. Run scripts/migrate-exam-phases.ts." };

  const [{ n }] = (await sql`
    select count(*)::int as n from exam_papers where phase_id = ${phase.id}::bigint and kind = 'mock'
  `) as { n: number }[];
  const code = `MOCK-${n + 1}`;

  await sql`
    insert into exam_papers (phase_id, code, name, mode, kind, max_marks, requires_checkin)
    values (${phase.id}::bigint, ${code}, ${name}, 'online', 'mock', ${input.maxMarks}, ${input.requiresCheckin})
  `;
  await logAdminEvent(staffId, "mock_created", undefined, { paper: code, name });
  return { ok: true, code };
}

/**
 * Open or withdraw a paper's results.
 *
 * Phase 1's two papers are still read from `results_meta` by every result page,
 * the portal and the public /set door, so that is what is written -- plus the
 * paper's own row, so the two never disagree. Any later paper has no reader yet
 * (marking and publishing Phase 2 is still to be built), so it is refused rather
 * than given a switch that would change nothing a student can see.
 */
export async function setResultsVisible(
  id: string,
  visible: boolean,
  staffId: string,
): Promise<Scheduled> {
  const [p] = (await sql`select code from exam_papers where id = ${id}::bigint`) as { code: string }[];
  if (!p) return { ok: false, message: "That paper does not exist." };

  if (p.code === "P1-ONLINE") {
    await sql`
      update results_meta
         set published = ${visible},
             published_at = case when ${visible} then coalesce(published_at, now()) else published_at end,
             publish_at = case when ${visible} then now() else publish_at end
       where id`;
  } else if (p.code === "P1-OFFLINE") {
    await sql`
      update results_meta
         set offline_published = ${visible},
             offline_published_at = case when ${visible} then coalesce(offline_published_at, now()) else offline_published_at end,
             offline_publish_at = case when ${visible} then now() else offline_publish_at end
       where id`;
  } else {
    return {
      ok: false,
      message: "Results for this paper cannot be published from here yet — marking Phase 2 is still to be built.",
    };
  }

  await sql`
    update exam_papers set published = ${visible},
           published_at = case when ${visible} then coalesce(published_at, now()) else published_at end,
           publish_at = case when ${visible} then now() else publish_at end
     where id = ${id}::bigint`;
  await logAdminEvent(staffId, visible ? "results_published" : "results_withdrawn", undefined, { paper: p.code });
  return { ok: true };
}

export interface CentreRow {
  centre_code: string;
  centre_name: string;
  schools: number;
  enrolled: number;
  ix: number;
  x: number;
  xi: number;
  xii: number;
  claimed: number;
  sat_phase1: number;
  applications: number;
}

/**
 * The 21 centres, as a planning sheet for December.
 *
 * Seats are planned from enrolment, turnout from July, and who can actually sit
 * a paper in the app from claims -- so all three are on one row. Applications
 * waiting for approval are counted against the centre they would join.
 */
export async function centresOverview(): Promise<CentreRow[]> {
  return (await sql`
    select s.centre_code, s.centre_name,
           count(distinct s.school_code)::int                               as schools,
           count(*)::int                                                     as enrolled,
           count(*) filter (where s.class = 'IX')::int                       as ix,
           count(*) filter (where s.class = 'X')::int                        as x,
           count(*) filter (where s.class = 'XI')::int                       as xi,
           count(*) filter (where s.class = 'XII')::int                      as xii,
           count(*) filter (where a.uid is not null and not a.must_change)::int as claimed,
           count(f.uid)::int                                                 as sat_phase1,
           (select count(*)::int from app_registrations r
             where r.status = 'pending' and r.centre_code = s.centre_code)   as applications
      from students s
      left join app_accounts a on a.uid = s.uid
      -- Scoped to the July OMR paper. offline_results is keyed (uid, exam_paper_id)
      -- since September 2026, and a join on uid alone would count a child once
      -- for every paper they have marks for.
      left join offline_results f
             on f.uid = s.uid
            and f.exam_paper_id = (select id from exam_papers where code = 'P1-OFFLINE')
     where not s.is_demo
     group by s.centre_code, s.centre_name
     order by s.centre_code
  `) as CentreRow[];
}

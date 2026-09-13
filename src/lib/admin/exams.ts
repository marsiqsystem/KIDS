import { sql } from "@/lib/exam/db";
import { loadQuestionSets } from "@/lib/exam/question-sets";
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
  /** Which of IX, X, XI, XII have at least one question set loaded for this sitting. */
  loaded: string[];
  /** Every set loaded for it, e.g. P2-ONLINE-XI-SCIENCE, with its size. */
  sets: { code: string; question_count: number; loaded_at: Date }[];
  /** Whether students can see marks right now, read from where the pages read it. */
  visible: boolean;
  counts_for_award: boolean;
  /** Past its closing time, on the database clock -- never the office laptop's. */
  closed: boolean;
  /** When it was last marked, and what it came to. Null until it is. */
  computed_at: Date | null;
  totals: {
    sat: number; finalised: number; average: number | null; highest: number | null;
    cohorts: { cohort: string; sat: number; average: number; highest: number }[];
  } | null;
  /** Who runs which desk, for a paper that needs a check-in. */
  invigilators: { centre_code: string; staff_id: string; full_name: string }[];
}

export async function papersForAdmin(): Promise<AdminPaper[]> {
  await loadQuestionSets(true);
  const sets = (await sql`
    select code, exam_paper_id::text, class, question_count, loaded_at
      from exam_question_sets order by code
  `) as { code: string; exam_paper_id: string; class: string; question_count: number; loaded_at: Date }[];

  const desks = (await sql`
    select i.exam_paper_id::text, i.centre_code, i.staff_id, st.full_name
      from exam_invigilators i join admin_staff st on st.staff_id = i.staff_id
     order by i.centre_code, st.full_name
  `) as { exam_paper_id: string; centre_code: string; staff_id: string; full_name: string }[];

  const rows = (await sql`
    select pa.id::text, pa.code, pa.name, ph.code as phase_code, ph.name as phase_name,
           pa.mode, pa.kind, pa.max_marks, pa.scan_opens_at, pa.starts_at, pa.ends_at,
           pa.duration_minutes, pa.requires_checkin, pa.published, pa.publish_at,
           pa.computed_at, pa.totals, (pa.ends_at is not null and pa.ends_at <= now()) as closed,
           (ph.award_paper_id = pa.id) as counts_for_award,
           (select count(*)::int from attempts a where a.exam_paper_id = pa.id) as attempts,
           (select count(*)::int from online_results o where o.exam_paper_id = pa.id)
             + (select count(*)::int from offline_results f where f.exam_paper_id = pa.id) as results
      from exam_papers pa
      join exam_phases ph on ph.id = pa.phase_id
     where pa.archived_at is null
     order by ph.ordinal, pa.kind desc, pa.code
  `) as (Omit<AdminPaper, "loaded" | "visible" | "sets" | "invigilators"> & { published: boolean; publish_at: Date | null })[];

  const [meta] = (await sql`
    select (published and publish_at is not null and now() >= publish_at) as online_open,
           (offline_published and offline_publish_at is not null
             and now() >= offline_publish_at) as offline_open
      from results_meta where id
  `.catch(() => [])) as { online_open: boolean; offline_open: boolean }[];

  return rows.map((r) => ({
    ...r,
    // July's online paper lives in the repository file, not the table.
    loaded:
      r.code === "P1-ONLINE"
        ? ["IX", "X", "XI", "XII"]
        : [...new Set(sets.filter((x) => x.exam_paper_id === r.id).map((x) => x.class))],
    invigilators: desks
      .filter((d) => d.exam_paper_id === r.id)
      .map(({ centre_code, staff_id, full_name }) => ({ centre_code, staff_id, full_name })),
    sets: sets
      .filter((x) => x.exam_paper_id === r.id)
      .map((x) => ({ code: x.code, question_count: x.question_count, loaded_at: x.loaded_at })),
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
    // Every later paper is read from exam_results by laterResultsFor(), which
    // checks exam_papers.published and publish_at -- written just below. A paper
    // that has never been marked has nothing to show, so it cannot be published.
    const [m] = (await sql`
      select computed_at from exam_papers where id = ${id}::bigint
    `) as { computed_at: Date | null }[];
    if (visible && !m?.computed_at) {
      return { ok: false, message: "Mark this paper first. There are no results to publish yet." };
    }
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

/**
 * Put a member of staff on a centre's desk for a paper, or take them off.
 *
 * Any active staff account may be assigned; an invigilator is usually a teacher
 * account made for the day in "Teachers & admins". Nobody is removed from a desk
 * whose paper has already been sat there -- the record of who ran the room is
 * part of the record of the paper.
 */
export async function assignInvigilator(
  paperId: string, centre: string, staffId: string, by: string,
): Promise<Scheduled> {
  if (!/^CTR-\d{2}$/.test(centre)) return { ok: false, message: "Choose a centre." };
  const [who] = (await sql`
    select staff_id, full_name from admin_staff where staff_id = ${staffId} and disabled_at is null
  `) as { staff_id: string; full_name: string }[];
  if (!who) return { ok: false, message: "Choose a member of staff." };
  const [p] = (await sql`select code from exam_papers where id = ${paperId}::bigint`) as { code: string }[];
  if (!p) return { ok: false, message: "That paper does not exist." };

  await sql`
    insert into exam_invigilators (exam_paper_id, centre_code, staff_id, assigned_by)
    values (${paperId}::bigint, ${centre}, ${staffId}, ${by})
    on conflict do nothing`;
  await logAdminEvent(by, "invigilator_assigned", { kind: "staff", id: staffId }, { paper: p.code, centre });
  return { ok: true };
}

export async function unassignInvigilator(
  paperId: string, centre: string, staffId: string, by: string,
): Promise<Scheduled> {
  const [{ n }] = (await sql`
    select count(*)::int as n from exam_checkins where exam_paper_id = ${paperId}::bigint and centre_code = ${centre}
  `) as { n: number }[];
  if (n > 0) return { ok: false, message: "Students have already checked in at this desk. The record of who ran it stays." };
  await sql`
    delete from exam_invigilators
     where exam_paper_id = ${paperId}::bigint and centre_code = ${centre} and staff_id = ${staffId}`;
  await logAdminEvent(by, "invigilator_unassigned", { kind: "staff", id: staffId }, { centre });
  return { ok: true };
}

/* ---------------------------------------------------------------- the award --- */

export interface AwardState {
  series_id: string;
  name: string;
  award_rule: string;
  incomplete: "alone" | "separate";
  award_computed_at: Date | null;
  award_rule_used: string | null;
  award_published: boolean;
  visible: boolean;
  comparison: {
    cohort: string; bothPhases: number; onePhase: number; onePhaseInTop30: number; top30Cutoff: number | null;
  }[] | null;
  students: number;
}

export async function awardState(): Promise<AwardState | null> {
  const [s] = (await sql`
    select se.id::text as series_id, se.name, se.award_rule, se.incomplete, se.award_computed_at,
           se.award_rule_used, se.award_published, se.award_comparison as comparison,
           (se.award_published and (se.award_publish_at is null or now() >= se.award_publish_at)) as visible,
           (select count(*)::int from exam_awards a where a.series_id = se.id and a.ranked) as students
      from exam_series se where se.code = 'SET2026'
  `) as AwardState[];
  return s ?? null;
}

/**
 * Choose what happens to a student with only one phase.
 *
 * The one open decision in the award (13 September 2026). Changing it does not
 * change anything a student can see: it marks the award as needing to be
 * computed again, and the office looks at the new top of each list before
 * publishing.
 */
export async function setIncompleteRule(seriesId: string, rule: string, by: string): Promise<Scheduled> {
  if (rule !== "alone" && rule !== "separate") return { ok: false, message: "Unknown rule." };
  const [s] = (await sql`select award_published, incomplete from exam_series where id = ${seriesId}::bigint`) as
    { award_published: boolean; incomplete: string }[];
  if (!s) return { ok: false, message: "That series does not exist." };
  if (s.award_published) return { ok: false, message: "The award is published. Withdraw it before changing the rule." };
  if (s.incomplete === rule) return { ok: true };
  await sql`update exam_series set incomplete = ${rule} where id = ${seriesId}::bigint`;
  await logAdminEvent(by, "award_rule_changed", undefined, { from: s.incomplete, to: rule });
  return { ok: true };
}

export async function setAwardVisible(seriesId: string, visible: boolean, by: string): Promise<Scheduled> {
  const [s] = (await sql`
    select award_computed_at, award_rule_used, award_rule, incomplete from exam_series where id = ${seriesId}::bigint
  `) as { award_computed_at: Date | null; award_rule_used: string | null; award_rule: string; incomplete: string }[];
  if (!s) return { ok: false, message: "That series does not exist." };
  if (visible) {
    if (!s.award_computed_at) return { ok: false, message: "Compute the award first." };
    // Published only as computed: a rule changed since the last computation
    // would otherwise publish ranks made under the old one.
    if (s.award_rule_used !== `${s.award_rule}/${s.incomplete}`) {
      return { ok: false, message: "The rule has changed since the award was computed. Compute it again first." };
    }
  }
  await sql`
    update exam_series set award_published = ${visible},
           award_publish_at = case when ${visible} then now() else award_publish_at end
     where id = ${seriesId}::bigint`;
  await logAdminEvent(by, visible ? "award_published" : "award_withdrawn", undefined, {});
  return { ok: true };
}


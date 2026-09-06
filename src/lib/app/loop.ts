import { sql } from "@/lib/exam/db";
import type { Student } from "@/lib/exam/db";
import { poolFor, questionById, sectionsFor, sectionOf } from "@/lib/app/bank";

/**
 * The daily loop. Design 3a-3g.
 *
 * The whole product is an argument with one number: there are 1,000 questions
 * in the bank, 100 for a Class X student and 45 across the three subjects they
 * practise. Ten a day would exhaust that in nine days and then the app would
 * have nothing true left to say.
 *
 * So the rules, all of them Umar's, ruled 2 September:
 *
 *   - The daily set is FIVE, and two of them are new.
 *   - Repetition is named, never hidden. A student is told which of the five
 *     they have seen and when.
 *   - Revisits are spaced and earned: wrong comes back in 2 days, and getting
 *     it right afterwards walks it 2 -> 6 -> 15 -> 30. Right the first time
 *     goes 10 -> 30. Nothing answered correctly returns the same week.
 *   - Supply is visible. When the unseen questions run out the app says so and
 *     stops manufacturing a set out of nothing.
 */

/** Five a day, two of them new. Both numbers are on the screens; change both. */
export const SET_SIZE = 5;
export const NEW_PER_DAY = 2;

/**
 * The spacing ladders.
 *
 * A question that has ever been wrong is "lapsed" and walks the short ladder
 * until it graduates; one never missed takes the long one. These five numbers
 * appear nowhere else in the codebase.
 */
const LAPSED_LADDER = [2, 6, 15];
const CLEAN_LADDER = [10, 30];

export function nextInterval(
  prev: { lapsed: boolean; interval_days: number } | null,
  correct: boolean,
): { days: number; lapsed: boolean } {
  // Wrong sends it straight back to two days, however well it was going. The
  // summary says "wrong again — in 2 days", and that is why.
  if (!correct) return { days: 2, lapsed: true };

  if (!prev) return { days: CLEAN_LADDER[0], lapsed: false };

  if (prev.lapsed) {
    const at = LAPSED_LADDER.indexOf(prev.interval_days);
    if (at >= 0 && at < LAPSED_LADDER.length - 1) {
      return { days: LAPSED_LADDER[at + 1], lapsed: true };
    }
    // Off the end of the short ladder: it has been got right three times since
    // the lapse, so it stops being treated as a weak question.
    return { days: CLEAN_LADDER[CLEAN_LADDER.length - 1], lapsed: false };
  }

  const at = CLEAN_LADDER.indexOf(prev.interval_days);
  return {
    days: at >= 0 && at < CLEAN_LADDER.length - 1 ? CLEAN_LADDER[at + 1] : CLEAN_LADDER[CLEAN_LADDER.length - 1],
    lapsed: false,
  };
}

/**
 * Today, in IST.
 *
 * Not UTC. A child practising at 11 p.m. in Kolkata is on today's set; at 05:30
 * UTC the day would turn over in the middle of their evening and hand them a
 * second set. `en-CA` formats as YYYY-MM-DD, which is what the date column wants.
 */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// ----------------------------------------------------------------- subjects --

export async function chosenSections(uid: string): Promise<string[]> {
  const rows = (await sql`
    select section from app_subjects where uid = ${uid} order by section
  `) as { section: string }[];
  return rows.map((r) => r.section);
}

/**
 * Replace the student's chosen subjects.
 *
 * Deleting a subject deliberately does NOT delete their answers in it. A child
 * who drops Geography for a month and comes back should find their history
 * intact, and the schedule for those questions waiting where they left it.
 */
export async function setSections(uid: string, sections: string[]): Promise<void> {
  const clean = [...new Set(sections.map((s) => s.trim()).filter(Boolean))];

  await sql`delete from app_subjects where uid = ${uid} and not (section = any(${clean}))`;
  for (const section of clean) {
    await sql`
      insert into app_subjects (uid, section) values (${uid}, ${section})
      on conflict (uid, section) do nothing
    `;
  }
}

/** What the chooser offers, with the real question and chapter counts. */
export function offerSections(student: Student) {
  return sectionsFor(student.class, student.stream);
}

// -------------------------------------------------------------- the answers --

export interface AnswerRow {
  question_id: string;
  first_seen_at: Date;
  chosen: number | null;
  was_correct: boolean;
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  lapsed: boolean;
  interval_days: number;
  due_at: Date;
  last_answered_at: Date;
}

export async function answersFor(uid: string): Promise<Map<string, AnswerRow>> {
  const rows = (await sql`
    select question_id, first_seen_at, chosen, was_correct, times_seen, times_correct,
           times_wrong, lapsed, interval_days, due_at, last_answered_at
    from app_answers where uid = ${uid}
  `) as AnswerRow[];
  return new Map(rows.map((r) => [r.question_id, r]));
}

/**
 * Record one answer and schedule the question's return.
 *
 * Returns when it will come back, because the summary screen shows exactly that
 * for all five and it must be the same number that was written down.
 */
export async function recordAnswer(
  uid: string,
  questionId: string,
  chosen: number,
): Promise<{ correct: boolean; days: number; previousChoice: number | null; previouslyWrong: boolean }> {
  const question = questionById(questionId);
  if (!question) throw new Error(`No such question: ${questionId}`);

  const correct = chosen === question.answer;

  const existing = (await sql`
    select chosen, was_correct, lapsed, interval_days, times_seen
    from app_answers where uid = ${uid} and question_id = ${questionId}
  `) as { chosen: number | null; was_correct: boolean; lapsed: boolean; interval_days: number }[];

  const prev = existing[0] ?? null;
  const { days, lapsed } = nextInterval(prev, correct);

  await sql`
    insert into app_answers (
      uid, question_id, chosen, was_correct, times_seen, times_correct, times_wrong,
      lapsed, interval_days, due_at
    )
    values (
      ${uid}, ${questionId}, ${chosen}, ${correct}, 1, ${correct ? 1 : 0}, ${correct ? 0 : 1},
      ${lapsed}, ${days}, now() + (${days} || ' days')::interval
    )
    on conflict (uid, question_id) do update set
      chosen           = excluded.chosen,
      was_correct      = excluded.was_correct,
      last_answered_at = now(),
      times_seen       = app_answers.times_seen + 1,
      times_correct    = app_answers.times_correct + ${correct ? 1 : 0},
      times_wrong      = app_answers.times_wrong + ${correct ? 0 : 1},
      lapsed           = excluded.lapsed,
      interval_days    = excluded.interval_days,
      due_at           = excluded.due_at
  `;

  return {
    correct,
    days,
    previousChoice: prev?.chosen ?? null,
    previouslyWrong: prev ? !prev.was_correct : false,
  };
}

// ------------------------------------------------------------------ the set --

export interface DailySet {
  onDate: string;
  questionIds: string[];
  newCount: number;
  /**
   * When the set was chosen. A question counts as "Again" on this set if the
   * student had seen it BEFORE this moment — not if they have seen it since,
   * which after answering two of five would be every question they had touched
   * that morning, contradicting the "2 new, 3 revision" line above the chips.
   */
  builtAt: Date;
  /** How many of the five have been answered today. */
  answered: number;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface Supply {
  /** Every question in the chosen subjects, in this student's medium. */
  total: number;
  seen: number;
  unseen: number;
  /** Whole days of new questions left, at two a day. */
  daysOfNew: number;
}

export interface LoopState {
  sections: string[];
  supply: Supply;
  set: DailySet | null;
  /** No subjects chosen yet — the chooser is the only thing to show. */
  needsSubjects: boolean;
  /** Every question in their subjects has been seen; the set is all revision. */
  allRevision: boolean;
}

/**
 * What the Home screen needs, and the set itself — built once per day and then
 * fixed.
 *
 * Fixed matters: a student who answers two and closes the app must come back to
 * the same five. Rebuilding would swap the three they had not reached, and the
 * promise that unreached questions are not counted against them would be false.
 */
export async function loopState(student: Student): Promise<LoopState> {
  const sections = await chosenSections(student.uid);
  if (sections.length === 0) {
    return {
      sections,
      supply: { total: 0, seen: 0, unseen: 0, daysOfNew: 0 },
      set: null,
      needsSubjects: true,
      allRevision: false,
    };
  }

  const pool = poolFor(student.class, student.stream, student.medium, sections);
  const answers = await answersFor(student.uid);

  const seen = pool.filter((id) => answers.has(id)).length;
  const supply: Supply = {
    total: pool.length,
    seen,
    unseen: pool.length - seen,
    daysOfNew: Math.floor((pool.length - seen) / NEW_PER_DAY),
  };

  const onDate = istToday();
  const existing = (await sql`
    select on_date::text as on_date, question_ids, new_count, built_at, started_at, finished_at
    from app_sets where uid = ${student.uid} and on_date = ${onDate}::date
  `) as { on_date: string; question_ids: string[]; new_count: number; built_at: Date; started_at: Date | null; finished_at: Date | null }[];

  let row = existing[0];
  if (!row) {
    const built = buildSet(pool, answers);
    if (built.ids.length === 0) {
      return { sections, supply, set: null, needsSubjects: false, allRevision: supply.unseen === 0 };
    }
    const inserted = (await sql`
      insert into app_sets (uid, on_date, question_ids, new_count)
      values (${student.uid}, ${onDate}::date, ${JSON.stringify(built.ids)}::jsonb, ${built.newCount})
      -- Two tabs opening Home at the same second must not build two sets.
      on conflict (uid, on_date) do nothing
      returning on_date::text as on_date, question_ids, new_count, built_at, started_at, finished_at
    `) as typeof existing;

    row = inserted[0] ?? ((await sql`
      select on_date::text as on_date, question_ids, new_count, built_at, started_at, finished_at
      from app_sets where uid = ${student.uid} and on_date = ${onDate}::date
    `) as typeof existing)[0];
  }

  const ids: string[] = row.question_ids;
  // Answered TODAY, not ever: a revision question in today's set was already
  // answered weeks ago, and it is not done until it is done again.
  const answeredToday = (await sql`
    select count(*)::int as n from app_answers
    where uid = ${student.uid}
      and question_id = any(${ids})
      and (last_answered_at at time zone 'Asia/Kolkata')::date = ${onDate}::date
  `) as { n: number }[];

  return {
    sections,
    supply,
    needsSubjects: false,
    allRevision: row.new_count === 0,
    set: {
      onDate: row.on_date,
      questionIds: ids,
      newCount: row.new_count,
      builtAt: row.built_at,
      answered: answeredToday[0]?.n ?? 0,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    },
  };
}

/**
 * Choose today's five.
 *
 * Two new, then the questions that have come due — the ones got wrong first,
 * because those are the ones the student is actually failing. If there is not
 * enough of either, the set is topped up from the other and, when everything
 * has been seen and nothing is due yet, from whatever is closest to due. Only
 * a genuinely empty pool produces no set at all.
 */
export function buildSet(
  pool: string[],
  answers: Map<string, AnswerRow>,
  now: Date = new Date(),
): { ids: string[]; newCount: number } {
  // Round-robin across the chosen subjects, NOT straight down the pool. The
  // pool arrives in paper order, which is grouped by subject, so taking the
  // first two unseen every day would march a student through all of Geography
  // before they ever met a Life Science question — and the supply meter would
  // say "you have seen 15 of 45" while one subject sat untouched.
  const unseen = interleaveBySection(pool.filter((id) => !answers.has(id)));

  const due = pool
    .filter((id) => answers.get(id) && answers.get(id)!.due_at.getTime() <= now.getTime())
    .sort((a, b) => {
      const x = answers.get(a)!;
      const y = answers.get(b)!;
      // Wrong before right, then by how long it has been waiting.
      if (x.was_correct !== y.was_correct) return x.was_correct ? 1 : -1;
      return x.due_at.getTime() - y.due_at.getTime();
    });

  const picked: string[] = [];
  const fresh = unseen.slice(0, NEW_PER_DAY);
  picked.push(...fresh);
  picked.push(...due.slice(0, SET_SIZE - picked.length));

  // Short on revision — a new student, whose whole set is new.
  if (picked.length < SET_SIZE) {
    picked.push(...unseen.slice(fresh.length, fresh.length + (SET_SIZE - picked.length)));
  }

  // Short on both: everything seen, nothing due. Design 3c's "five questions,
  // all revision" — the soonest to come back, brought forward.
  if (picked.length < SET_SIZE) {
    const chosen = new Set(picked);
    const early = pool
      .filter((id) => answers.has(id) && !chosen.has(id))
      .sort((a, b) => answers.get(a)!.due_at.getTime() - answers.get(b)!.due_at.getTime());
    picked.push(...early.slice(0, SET_SIZE - picked.length));
  }

  const newCount = picked.filter((id) => !answers.has(id)).length;
  return { ids: picked, newCount };
}

/**
 * One from each subject in turn, keeping each subject's own order.
 *
 * Geography, Life Science, Physical Science, Geography, Life Science... so a
 * student meets all three every couple of days and the supply drains evenly.
 */
function interleaveBySection(ids: string[]): string[] {
  const bySection = new Map<string, string[]>();
  for (const id of ids) {
    const section = sectionOf(id) ?? "";
    const list = bySection.get(section);
    if (list) list.push(id);
    else bySection.set(section, [id]);
  }

  const queues = [...bySection.values()];
  const out: string[] = [];
  for (let round = 0; out.length < ids.length; round += 1) {
    for (const queue of queues) {
      if (round < queue.length) out.push(queue[round]);
    }
  }
  return out;
}

/** Marks the set as opened, so "you left in the middle of a set" can be told. */
export async function markSetStarted(uid: string, onDate: string): Promise<void> {
  await sql`
    update app_sets set started_at = coalesce(started_at, now())
    where uid = ${uid} and on_date = ${onDate}::date
  `;
}

export async function markSetFinished(uid: string, onDate: string): Promise<void> {
  await sql`
    update app_sets set finished_at = coalesce(finished_at, now())
    where uid = ${uid} and on_date = ${onDate}::date
  `;
}

// ----------------------------------------------------------------- playing --

/**
 * One question as the PLAYER may see it — with no answer key in it.
 *
 * This is the shape that crosses to the browser, so it deliberately carries no
 * `answer` and no explanation. Both arrive from the server only after the
 * student has committed to an option (see answerQuestion in loop-actions.ts).
 * Shipping the key with the question would put the whole bank one devtools
 * panel away, and this bank is also an exam paper.
 */
export interface PlayCard {
  id: string;
  stem: string;
  context: string | null;
  options: string[];
  chapter: string | null;
  section: string;
  /** Null when the student has never seen this question. */
  seen: {
    lastAnsweredAt: string;
    wasCorrect: boolean;
    chosen: number | null;
  } | null;
}

export async function playCards(student: Student, questionIds: string[]): Promise<PlayCard[]> {
  const answers = await answersFor(student.uid);
  const cards: PlayCard[] = [];

  for (const id of questionIds) {
    const q = questionById(id);
    if (!q) continue; // a bank id that no longer resolves is skipped, not faked
    const prior = answers.get(id);

    cards.push({
      id,
      stem: q.stem,
      context: q.context,
      options: q.options,
      chapter: q.chapter,
      section: q.section,
      seen: prior
        ? {
            lastAnsweredAt: prior.last_answered_at.toISOString(),
            wasCorrect: prior.was_correct,
            chosen: prior.chosen,
          }
        : null,
    });
  }

  return cards;
}

/**
 * The streak: consecutive days, ending today or yesterday, on which a set was
 * finished. Plus which of the last seven days were done, for the chips.
 *
 * Counted from `app_sets.finished_at` rather than a counter column, so it
 * cannot drift from what actually happened and there is nothing to repair if a
 * write fails.
 *
 * Design 2f also shows a "banked rest day". That rule is NOT implemented: the
 * artboard shows the chip but never says how a rest day is earned or spent, and
 * inventing the mechanics would be inventing product. A missed day simply ends
 * the streak until Umar rules on it.
 */
export async function streakFor(uid: string): Promise<{ days: number; week: { date: string; done: boolean }[] }> {
  const rows = (await sql`
    select (finished_at at time zone 'Asia/Kolkata')::date::text as day
    from app_sets
    where uid = ${uid} and finished_at is not null
    order by day desc
    limit 400
  `) as { day: string }[];

  const done = new Set(rows.map((r) => r.day));
  const today = istToday();

  const dayBefore = (iso: string, back: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - back);
    return d.toISOString().slice(0, 10);
  };

  // A streak is not broken until today is over, so counting starts at today if
  // today is done and at yesterday if it is not.
  let days = 0;
  let cursor = done.has(today) ? today : dayBefore(today, 1);
  while (done.has(cursor)) {
    days += 1;
    cursor = dayBefore(cursor, 1);
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = dayBefore(today, 6 - i);
    return { date, done: done.has(date) };
  });

  return { days, week };
}

/**
 * Today's set if one has already been built, and null if not — read-only.
 *
 * `loopState` MINTS the set as a side effect of being asked, which is right on
 * Home: the student is standing in front of it and the five must be fixed
 * before they can be shown. It is wrong everywhere else. A bell counting
 * notices, or a Profile screen mentioning the daily set in passing, must not be
 * the thing that decides which five questions a child gets today.
 */
export async function existingSet(uid: string): Promise<DailySet | null> {
  const onDate = istToday();
  const rows = (await sql`
    select on_date::text as on_date, question_ids, new_count, built_at, started_at, finished_at
    from app_sets where uid = ${uid} and on_date = ${onDate}::date
  `) as {
    on_date: string; question_ids: string[]; new_count: number;
    built_at: Date; started_at: Date | null; finished_at: Date | null;
  }[];

  const row = rows[0];
  if (!row) return null;

  const answered = (await sql`
    select count(*)::int as n from app_answers
    where uid = ${uid}
      and question_id = any(${row.question_ids})
      and (last_answered_at at time zone 'Asia/Kolkata')::date = ${onDate}::date
  `) as { n: number }[];

  return {
    onDate: row.on_date,
    questionIds: row.question_ids,
    newCount: row.new_count,
    builtAt: row.built_at,
    answered: answered[0]?.n ?? 0,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

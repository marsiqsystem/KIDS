import { json, mobileStudent, greeting } from "@/lib/app/mobile-api";
import { firstName } from "@/lib/exam/portal-auth";
import { loopState, streakFor, answersFor, istToday, offerSections, NEW_PER_DAY } from "@/lib/app/loop";
import { poolFor } from "@/lib/app/bank";
import { unreadCount } from "@/lib/app/notices";
import { subjectShort, subjectHue, subjectInitials } from "@/lib/app/subjects";
import { dayFor, programmeFor } from "@/lib/app/day";
import { touchPresence } from "@/lib/app/room";
import { windowFor, phaseOf } from "@/lib/exam/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Home, for the native app — the same computation as the website's Home
 * (src/app/app/(shell)/page.tsx, board 02), returned as a model rather than
 * drawn. Every number is counted at request time from the bank and this
 * student's own answers.
 *
 * `face` says which of the board's states to draw:
 *   coaching  — one of the 65 on the programme; Home is their day (phase 1b)
 *   choose    — no subjects yet (1A); `noStream` when XI/XII has no stream
 *   empty     — subjects chosen, nothing the loop can offer
 *   today     — today's five, not finished (1B/1C/1E)
 *   done      — today's five finished (1D)
 *
 * Also carries what the tab bar needs (the exam dot), so the app makes one
 * call on opening, not two.
 */
const onDay = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "long" }).format(date);
const istDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);

export async function GET() {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const window = await windowFor(student).catch(() => null);
  const examLive = window ? ["scanning", "live"].includes(phaseOf(window)) : false;
  const base = { ok: true, greeting: greeting(), name: firstName(student.name), cls: student.class, examLive };

  // For the 65 on the coaching programme, Home IS the day (ruled 11 Sep).
  // Presence is touched here as the website's shell does, on opening.
  if (await programmeFor(student.uid)) void touchPresence(student.uid).catch(() => {});
  const day = await dayFor(student);
  if (day) return json({ ...base, face: "coaching", coaching: { shape: day.shape } });

  const state = await loopState(student);
  // After loopState, never beside it: loopState mints today's set, and the bell
  // counts a set that exists rather than causing one to.
  const unread = await unreadCount(student);

  if (state.needsSubjects) {
    const noStream = (student.class === "XI" || student.class === "XII") && !student.stream;
    const offer = noStream
      ? []
      : offerSections(student).map((s) => ({
          section: s.section,
          short: subjectShort(s.section),
          initials: subjectInitials(s.section),
          hue: subjectHue(s.section),
          questions: s.questions,
          chapters: s.chapters,
          videos: s.videos,
        }));
    return json({ ...base, unread, face: "choose", noStream, perDay: NEW_PER_DAY, offer });
  }

  const [streak, answers] = await Promise.all([streakFor(student.uid), answersFor(student.uid)]);
  const { supply, set } = state;
  const today = istToday();
  const allSeen = supply.total > 0 && supply.unseen === 0;

  const chips = [
    `Class ${student.class}`,
    ...(allSeen
      ? ["★ All revision"]
      : state.sections.length <= 3
        ? state.sections.map(subjectShort)
        : [`${state.sections.length} subjects`]),
  ];

  // 1E — what adding a subject would bring, counted from the unchosen ones.
  const adds = allSeen
    ? offerSections(student)
        .filter((s) => !state.sections.includes(s.section))
        .map((s) => ({
          section: subjectShort(s.section),
          n: poolFor(student.class, student.stream, student.medium, [s.section]).filter((id) => !answers.has(id)).length,
        }))
        .filter((a) => a.n > 0)
        .slice(0, 2)
    : [];

  const common = {
    ...base,
    unread,
    chips,
    streak: { days: streak.days, best: streak.best, week: streak.week, today },
    supply: { seen: supply.seen, total: supply.total, unseen: supply.unseen, allSeen },
    adds,
  };

  if (!set) return json({ ...common, face: "empty" });

  const verdict = (id: string): "right" | "wrong" | null => {
    const row = answers.get(id);
    if (!row || istDate(row.last_answered_at) !== today) return null;
    return row.was_correct ? "right" : "wrong";
  };
  // Familiar when the set was built, not since: answering one must not turn
  // its pip from New into Again.
  const wasRevision = (id: string) => {
    const row = answers.get(id);
    return !!row && row.first_seen_at.getTime() < set.builtAt.getTime();
  };

  const done = set.answered >= set.questionIds.length;
  const started = set.answered > 0;
  const pips = set.questionIds.map((id, i) => {
    const v = verdict(id);
    const here = started && !v && set.questionIds.slice(0, i).every((q) => verdict(q));
    return v ?? (here ? "here" : started ? "todo" : wasRevision(id) ? "again" : "new");
  });
  const missed = set.questionIds
    .map((id) => answers.get(id))
    .filter((a) => a && !a.was_correct && a.last_answered_at.getTime() < set.builtAt.getTime())
    .map((a) => onDay(a!.last_answered_at));

  return json({
    ...common,
    face: done ? "done" : "today",
    set: {
      size: set.questionIds.length,
      answered: set.answered,
      started,
      newCount: set.newCount,
      revision: set.questionIds.length - set.newCount,
      pips,
      missed,
    },
  });
}

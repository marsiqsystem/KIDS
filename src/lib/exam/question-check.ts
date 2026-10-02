/**
 * The rules a question set must pass before it can be loaded into a paper.
 *
 * Pure, with no database and no keys of its own, so the editor in the control
 * centre can run it on every keystroke and the server can run it again on the
 * write -- the browser's check is a convenience, the server's is the gate. The
 * rules are the ones scripts/load-question-set.ts applies to a file, so a set
 * typed in the console and a set loaded from a file are held to the same bar.
 */

/** One question as the office writes it: what the student sees, plus the key. */
export type DraftQuestion = {
  section?: string;
  context?: string;
  q: string;
  options: string[];
  /** Index of the correct option, from 0. Null until somebody ticks one. */
  answer: number | null;
  /** A diagram under the question, by image id. */
  image?: string;
  /** A picture per option, by image id; same length as `options` when present. */
  optionImages?: (string | null)[];
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const LETTERS = "ABCDEF";

export const CLASSES = ["IX", "X", "XI", "XII"] as const;
export const STREAMS = ["SCIENCE", "COMMERCE", "ARTS"] as const;

/**
 * The set code for a class, stream and medium -- the same string the exam looks
 * up in src/lib/exam/schedule.ts, most specific first.
 */
export function setCodeFor(paperCode: string, cls: string, stream: string | null, bengali: boolean): string {
  return [paperCode, cls, stream, bengali ? "BENGALI" : null].filter(Boolean).join("-");
}

export function parseSetCode(
  code: string,
): { paperCode: string; cls: string; stream: string | null; medium: string } | null {
  const m = code.match(/^([A-Z0-9]+-[A-Z0-9]+)-(IX|X|XI|XII)(?:-(SCIENCE|COMMERCE|ARTS))?(?:-(BENGALI))?$/);
  if (!m) return null;
  const [, paperCode, cls, stream, medium] = m;
  if (stream && cls !== "XI" && cls !== "XII") return null;
  return { paperCode, cls, stream: stream ?? null, medium: medium ?? "" };
}

/** "P2-ONLINE-XI-SCIENCE-BENGALI" -> "Class XI · Science · Bengali medium". */
export function describeSet(code: string): string {
  const p = parseSetCode(code);
  if (!p) return code;
  const title = (s: string) => s[0] + s.slice(1).toLowerCase();
  return [
    `Class ${p.cls}`,
    p.stream ? title(p.stream) : p.cls === "XI" || p.cls === "XII" ? "every stream" : null,
    p.medium ? "Bengali medium" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Which subjects a student picks, for a set that offers a choice -- July's
 * written paper for XI and XII: English & General Knowledge for everybody,
 * then three subjects of the student's own choosing from their stream.
 *
 * A subject is the `section` of its questions. Questions in a subject not listed
 * here are compulsory -- including any with no subject at all.
 */
export type SetChoice = {
  /** The subjects a student chooses among, by name, in the order offered. */
  optional: string[];
  /** How many of them each student takes. */
  choose: number;
};

/** The subjects of a set, in the order they first appear, with their sizes. */
export function subjectsOf(items: { section?: string }[]): { name: string; count: number }[] {
  const out = new Map<string, number>();
  for (const it of items) {
    const name = it.section?.trim() ?? "";
    out.set(name, (out.get(name) ?? 0) + 1);
  }
  return [...out].map(([name, count]) => ({ name, count }));
}

/** How many questions each student of this set answers. */
export function questionsPerStudent(items: { section?: string }[], choice: SetChoice | null): number {
  if (!choice) return items.length;
  const subjects = subjectsOf(items);
  const compulsory = subjects.filter((s) => !choice.optional.includes(s.name)).reduce((a, s) => a + s.count, 0);
  const each = subjects.find((s) => choice.optional.includes(s.name))?.count ?? 0;
  return compulsory + each * choice.choose;
}

function choiceProblems(items: DraftQuestion[], choice: SetChoice): string[] {
  const problems: string[] = [];
  const subjects = subjectsOf(items);
  const named = new Map(subjects.map((s) => [s.name, s.count]));
  if (choice.optional.some((o) => !o.trim())) problems.push("A question with no subject cannot be optional.");
  for (const o of choice.optional) {
    if (o.trim() && !named.has(o)) problems.push(`"${o}" is marked optional but no question has that subject.`);
  }
  const offered = choice.optional.filter((o) => named.has(o));
  if (offered.length < 2) problems.push("Mark at least two subjects optional, or none — a choice of one is no choice.");
  if (!Number.isInteger(choice.choose) || choice.choose < 1 || choice.choose >= offered.length) {
    problems.push(`Students must choose between 1 and ${Math.max(1, offered.length - 1)} of the ${offered.length} optional subjects.`);
  }
  // Every child must answer the same number of questions, or two marks out of
  // different totals would be ranked against each other.
  const sizes = new Set(offered.map((o) => named.get(o)));
  if (sizes.size > 1) {
    problems.push(
      "Every optional subject needs the same number of questions: " +
        offered.map((o) => `${o} ${named.get(o)}`).join(", ") + ".",
    );
  }
  return problems;
}

export type SetCheck = {
  problems: string[];
  /** How many correct answers fall on A, B, C… -- a key that is all B was typed wrong. */
  spread: number[];
  /** More than half the answers on one letter. A warning, not a refusal. */
  lopsided: boolean;
};

export function checkQuestions(
  items: DraftQuestion[],
  expectedCount: number | null = null,
  choice: SetChoice | null = null,
): SetCheck {
  const problems: string[] = [];
  const spread = new Array(MAX_OPTIONS).fill(0) as number[];

  if (items.length === 0) problems.push("There are no questions yet.");

  const stems = new Map<string, number>();
  items.forEach((it, i) => {
    const n = i + 1;
    const q = it.q.trim();
    if (!q) problems.push(`Question ${n}: no question text.`);
    const options = it.options.map((o) => o.trim());
    const pictures = options.map((_, k) => it.optionImages?.[k] ?? null);
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      problems.push(`Question ${n}: needs ${MIN_OPTIONS} to ${MAX_OPTIONS} options.`);
    }
    // An option may be words, a picture, or both -- but not nothing.
    if (options.some((o, k) => !o && !pictures[k])) problems.push(`Question ${n}: an option is empty.`);
    else if (new Set(options.map((o, k) => `${o.toLowerCase()}\u0000${pictures[k] ?? ""}`)).size !== options.length) {
      problems.push(`Question ${n}: two options are the same.`);
    }
    if (it.answer === null || !Number.isInteger(it.answer) || it.answer < 0 || it.answer >= options.length) {
      problems.push(`Question ${n}: no correct answer is ticked.`);
    } else {
      spread[it.answer] += 1;
    }
    if (q) {
      const s = q.toLowerCase();
      // A passage-based question may repeat a short stem ("What does the word
      // mean?") under a different passage, so the passage is part of the stem.
      const key = `${it.section ?? ""}\u0000${(it.context ?? "").trim().toLowerCase()}\u0000${s}\u0000${it.image ?? ""}`;
      if (stems.has(key)) problems.push(`Questions ${stems.get(key)! + 1} and ${n} are the same question.`);
      else stems.set(key, i);
    }
  });

  if (choice) problems.push(...choiceProblems(items, choice));

  const each = questionsPerStudent(items, choice);
  if (expectedCount && each !== expectedCount) {
    problems.push(
      choice
        ? `This paper is set for ${expectedCount} questions; each student of this set would answer ${each}.`
        : `This paper is set for ${expectedCount} questions; there are ${items.length}.`,
    );
  }

  const answered = spread.reduce((a, b) => a + b, 0);
  const lopsided = answered >= 4 && Math.max(...spread) / answered > 0.5;
  return { problems, spread, lopsided };
}

/** Trim everything and drop empty optional fields: what is stored is what is shown. */
export function tidy(it: DraftQuestion): DraftQuestion {
  const section = it.section?.trim();
  const context = it.context?.trim();
  // Option pictures are kept only while at least one exists, and always one
  // slot per option, so slot k is option k's picture and nothing else.
  const pictures = it.options.map((_, k) => it.optionImages?.[k] || null);
  return {
    ...(section ? { section } : {}),
    ...(context ? { context } : {}),
    q: it.q.trim(),
    options: it.options.map((o) => o.trim()),
    answer: it.answer,
    ...(it.image ? { image: it.image } : {}),
    ...(pictures.some(Boolean) ? { optionImages: pictures } : {}),
  };
}

/** Every image id a set uses, once each. */
export function imagesUsed(items: DraftQuestion[]): string[] {
  const ids = new Set<string>();
  for (const it of items) {
    if (it.image) ids.add(it.image);
    for (const p of it.optionImages ?? []) if (p) ids.add(p);
  }
  return [...ids];
}

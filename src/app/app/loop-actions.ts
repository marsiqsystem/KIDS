"use server";

import { markBlock } from "@/lib/app/day";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { questionById, chaptersFor } from "@/lib/app/bank";
import { logAppEvent } from "@/lib/app/accounts";
import {
  setSections,
  recordAnswer,
  markSetStarted,
  markSetFinished,
  loopState,
  answersFor,
} from "@/lib/app/loop";

/**
 * The daily loop's server actions.
 *
 * The answer key lives on this side of the wire and never crosses it until the
 * student has committed. `answerQuestion` is the only route to it, and it
 * writes the answer down before it says whether it was right — so a student
 * cannot see the correct option, close the app, and come back to a clean slate.
 */

export async function chooseSubjectsAction(formData: FormData): Promise<void> {
  const student = await requireStudent();
  const sections = formData.getAll("section").map(String);

  if (sections.length === 0) {
    redirect("/app/subjects?empty=1");
  }

  await setSections(student.uid, sections);
  redirect("/app");
}

export interface Verdict {
  correct: boolean;
  answerIndex: number;
  whyCorrect: string | null;
  /** Why each wrong option is wrong, keyed by option index. */
  whyWrong: Record<number, string>;
  /** How many days until this question comes back. */
  days: number;
  /** What they picked last time, if they have seen it before. */
  previousChoice: number | null;
  previouslyWrong: boolean;
}

export async function answerQuestion(questionId: string, chosen: number): Promise<Verdict> {
  const student = await requireStudent();

  const question = questionById(questionId);
  if (!question) throw new Error("That question is not in the bank.");
  if (!Number.isInteger(chosen) || chosen < 0 || chosen >= question.options.length) {
    throw new Error("That is not one of the options.");
  }

  // The question must belong to today's set. Without this check the endpoint
  // would happily mark any question in the bank on request, which is a way to
  // read the whole key one call at a time.
  const state = await loopState(student);
  if (!state.set || !state.set.questionIds.includes(questionId)) {
    throw new Error("That question is not in today's set.");
  }

  await markSetStarted(student.uid, state.set.onDate);
  const outcome = await recordAnswer(student.uid, questionId, chosen);

  // The last of the five closes the set, which is what the streak counts.
  const after = await loopState(student);
  if (after.set && after.set.answered >= after.set.questionIds.length) {
    await markSetFinished(student.uid, after.set.onDate);

    /**
     * And closes the 7:10 block, for a student whose Home is The Day.
     *
     * Design turn 8 is explicit that the daily set is not a competing card —
     * it IS the 7:10 block, opened from the timeline and scored into the same
     * streak. Marked here rather than when the day screen is next drawn,
     * because this is the moment the work was actually finished; a block that
     * only went green when a child happened to return to Home would be lying
     * about when they did it.
     *
     * "4 right of 5" is counted from the student's own answer rows. DailySet
     * has no notion of correctness — it knows which five questions and how
     * many were answered, which is a different question.
     *
     * For the 9,649 students with no programme this writes a row nothing ever
     * reads, which is cheaper than asking first whether they are on one.
     */
    const rows = await answersFor(student.uid);
    const right = after.set.questionIds.filter((id) => rows.get(id)?.was_correct).length;
    await markBlock(student.uid, "daily", {
      score: `${right} right of ${after.set.questionIds.length}`,
    });
  }

  return {
    correct: outcome.correct,
    answerIndex: question.answer,
    whyCorrect: question.whyCorrect,
    whyWrong: question.whyWrong,
    days: outcome.days,
    previousChoice: outcome.previousChoice,
    previouslyWrong: outcome.previouslyWrong,
  };
}

/**
 * "Tell KIDS I want this one filmed."
 *
 * 30 of the 342 chapters have no explainer. Rather than a dead sentence, the
 * ask is recorded — in app_events, so it needs no new table and Umar can count
 * the requests per chapter with one query when deciding what to film next.
 */
export async function requestVideoAction(formData: FormData): Promise<void> {
  const student = await requireStudent();
  const bucket = String(formData.get("bucket") ?? "");
  const chapter = String(formData.get("chapter") ?? "");
  const key = String(formData.get("key") ?? "");

  if (bucket && chapter) {
    await logAppEvent(student.uid, "video_wanted", { bucket, chapter });
  }
  redirect(`/app/learn/${key}?asked=1`);
}

/**
 * Answering a question from a chapter page rather than from today's set.
 *
 * It records the answer exactly as the daily set does, and that is deliberate:
 * `app_answers` means "every question this student has ever been shown". If
 * practice did not write here, tomorrow's set would offer one of these as NEW,
 * and the promise that repetition is never hidden would be broken. The supply
 * meter stays true for the same reason.
 *
 * The cost is that a student can burn through a chapter faster than the daily
 * set would have fed it to them. That is their own choice, made in front of a
 * supply meter that tells them what it costs.
 */
export async function answerPractice(questionId: string, chosen: number): Promise<Verdict> {
  const student = await requireStudent();

  const question = questionById(questionId);
  if (!question) throw new Error("That question is not in the bank.");
  if (!Number.isInteger(chosen) || chosen < 0 || chosen >= question.options.length) {
    throw new Error("That is not one of the options.");
  }

  // It must be a question from this student's own class and stream. Without
  // this the endpoint would mark any question in the bank on request, which is
  // a way to read the whole key one call at a time.
  const theirs = chaptersFor(student.class, student.stream, student.medium)
    .some((c) => c.questionIds.includes(questionId));
  if (!theirs) throw new Error("That question is not on your paper.");

  const outcome = await recordAnswer(student.uid, questionId, chosen);

  return {
    correct: outcome.correct,
    answerIndex: question.answer,
    whyCorrect: question.whyCorrect,
    whyWrong: question.whyWrong,
    days: outcome.days,
    previousChoice: outcome.previousChoice,
    previouslyWrong: outcome.previouslyWrong,
  };
}

"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { logAppEvent } from "@/lib/app/accounts";
import { setSections } from "@/lib/app/loop";
import { answerDaily, answerChapter, type Verdict } from "@/lib/app/answer";

/**
 * The daily loop's server actions.
 *
 * The answer key lives on this side of the wire and never crosses it until the
 * student has committed — see src/lib/app/answer.ts, which marks for these
 * actions and for the native app alike.
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

/** One of today's five — marked in src/lib/app/answer.ts, shared with the native app. */
export async function answerQuestion(questionId: string, chosen: number): Promise<Verdict> {
  return answerDaily(await requireStudent(), questionId, chosen);
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

/** A chapter's question, answered from Learn — see answerChapter for why it is recorded like the daily set. */
export async function answerPractice(questionId: string, chosen: number): Promise<Verdict> {
  return answerChapter(await requireStudent(), questionId, chosen);
}

"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/app/gate";
import { markNoticesRead, noticesFor } from "@/lib/app/notices";

/**
 * Marking a notice read. The only write behind design 7b.
 *
 * The keys arrive from the form, so they are checked against the notices this
 * student actually has before anything is stored — otherwise a hand-made post
 * could fill the table with keys for events that never happened, and the bell
 * would go quiet for a notice that had not been shown yet.
 */
export async function markReadAction(formData: FormData): Promise<void> {
  const student = await requireStudent();
  const keys = formData.getAll("key").map(String).filter(Boolean);
  if (keys.length === 0) return;

  const mine = new Set((await noticesFor(student)).map((n) => n.key));

  await markNoticesRead(student.uid, keys.filter((k) => mine.has(k)));

  // Home carries the bell's dot, so it has to be re-rendered too.
  revalidatePath("/app/notices");
  revalidatePath("/app");
}

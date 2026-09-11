"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/app/gate";
import { startStudyHour, endStudyHour, roomFor } from "@/lib/app/room";

/**
 * Sitting down with the room, and getting up again.
 *
 * The uid comes from the signed session, never the client. A student not on a
 * programme has no room to sit in, and `roomFor` returning null is the check —
 * the same one the screen itself uses, so the button and the rule cannot part
 * company.
 */
export async function sitWithTheRoom(): Promise<void> {
  const student = await requireStudent();
  if (!(await roomFor(student.uid))) return;
  await startStudyHour(student.uid);
  revalidatePath("/app/room");
}

export async function leaveTheRoom(): Promise<void> {
  const student = await requireStudent();
  await endStudyHour(student.uid);
  revalidatePath("/app/room");
}

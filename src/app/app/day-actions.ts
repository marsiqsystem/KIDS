"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/app/gate";
import { markOfferedBlock, type BlockKind } from "@/lib/app/day";

/**
 * "I'm up", "Begin", "Done" — the three taps that keep a day.
 *
 * The uid is never sent by the client: it is read from the signed session
 * here, like every other action in the app. What the client names is which
 * block, and that is checked against the student's OWN day rather than
 * trusted — see markOfferedBlock in src/lib/app/day.ts, which the native app's
 * POST /api/m/v1/day uses too.
 */
export async function markDay(kind: BlockKind): Promise<void> {
  const student = await requireStudent();
  if (await markOfferedBlock(student, kind)) revalidatePath("/app");
}

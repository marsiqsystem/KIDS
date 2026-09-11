"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/app/gate";
import { markBlock, dayFor, type BlockKind } from "@/lib/app/day";

/**
 * "I'm up", "Begin", "Done" — the three taps that keep a day.
 *
 * The uid is never sent by the client: it is read from the signed session
 * here, like every other action in the app. What the client names is which
 * block, and that is checked against the student's OWN day rather than
 * trusted — a kind that is not in their programme, or is school, or is already
 * behind a block they cannot complete, marks nothing.
 */
export async function markDay(kind: BlockKind): Promise<void> {
  const student = await requireStudent();

  const day = await dayFor(student);
  if (!day) return;

  const block = day.blocks.find((b) => b.kind === kind);
  /**
   * Only a block the screen was actually offering. `action` is set by dayFor
   * on exactly the blocks a student may complete right now — the open one, and
   * the wake, which can always still be claimed. Checking the same field the
   * screen renders means the button and the rule cannot drift apart.
   */
  if (!block?.action) return;

  await markBlock(student.uid, kind);
  revalidatePath("/app");
}

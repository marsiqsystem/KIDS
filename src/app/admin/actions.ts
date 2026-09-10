"use server";

import { revalidatePath } from "next/cache";
import { adminConfigured, keyIsValid } from "@/lib/admin/auth";
import {
  createStaff,
  hasAnyAdmin,
  logAdminEvent,
  oneTimePassword,
  resetStaffPassword,
  setOwnPassword,
  setStaffDisabled,
  signInStaff,
} from "@/lib/admin/staff";
import {
  addMembers,
  assignTeacher,
  createBatch,
  removeMember,
  setBatchArchived,
  unassignTeacher,
} from "@/lib/admin/batches";
import {
  cancelClass,
  createClass,
  endClass,
  findClass,
  setRecording,
  startClass,
  teachesBatch,
} from "@/lib/admin/classes";
import { createPost, findPost, retractPost } from "@/lib/admin/posts";
import { resetAppPassword } from "@/lib/admin/app-passwords";
import {
  createStaffSession,
  destroyStaffSession,
  requireStaff,
} from "@/lib/admin/session";
import { hashPassword } from "@/lib/app/passwords";
import { sql } from "@/lib/exam/db";

/**
 * Every write the control centre can make.
 *
 * Two rules hold across all of them, and both exist because this page can now
 * change a child's record rather than only display one:
 *
 *   1. Every action that changes something calls requireStaff("admin") FIRST.
 *      Hiding a button is not a permission check — the action is the door, and
 *      the door is what has to be locked.
 *   2. Every one of them lands in admin_events, through the library functions.
 *      That is the whole reason named accounts replaced the shared key.
 */

export type State = {
  ok?: boolean;
  message?: string;
  field?: string;
  /**
   * A one-time password to show the operator exactly once. It is never stored
   * in plaintext and never re-derivable — losing it means issuing another.
   */
  secret?: { staffId: string; password: string; who?: "staff" | "student" };
};

const done = (message: string): State => ({ ok: true, message });

function refresh() {
  revalidatePath("/admin");
}

/* ------------------------------------------------------------ the first admin --- */

/**
 * Create the first admin from KIDS_ADMIN_KEY.
 *
 * The only thing the shared key can still do, and it can only do it while
 * hasAnyAdmin() is false — so it is a door that closes behind itself rather
 * than a permanent back way in. Re-checked here and not merely on the page,
 * because the page's check is a render and this is the actual write.
 */
export async function bootstrapAdmin(_prev: State, formData: FormData): Promise<State> {
  if (!adminConfigured()) {
    return { message: "KIDS_ADMIN_KEY is not set on this deployment.", field: "key" };
  }
  if (await hasAnyAdmin()) {
    return { message: "An admin already exists. Sign in instead.", field: "key" };
  }

  const key = String(formData.get("key") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!keyIsValid(key)) return { message: "That key is not correct.", field: "key" };
  if (!fullName) return { message: "Enter the name of the first admin.", field: "fullName" };

  // Written by hand rather than through createStaff, which requires a creator
  // that does not exist yet. 'bootstrap' is the actor in the audit trail, and
  // it appears exactly once in the life of a database.
  const password = oneTimePassword();
  await sql`
    insert into admin_staff (staff_id, full_name, role, password_hash, must_change, created_by)
    values ('A-0001', ${fullName}, 'admin', ${await hashPassword(password)}, true, null)
  `;
  await logAdminEvent("bootstrap", "staff_created", { kind: "staff", id: "A-0001" }, {
    role: "admin",
    name: fullName,
  });

  /**
   * Deliberately NO revalidatePath here, unlike every other action in this file.
   *
   * This one action changes which screen the page renders: the moment the row
   * exists, hasAnyAdmin() is true and AdminPage returns StaffSignIn instead of
   * Bootstrap. Revalidating swaps the component out — and takes with it the
   * only copy of the password that has just been generated, which is stored
   * nowhere and cannot be re-derived.
   *
   * That is not hypothetical. It happened on the first real bootstrap: the
   * account was created, the screen turned into a sign-in form, and the
   * password was lost, leaving the one admin locked out of his own control
   * centre. Bootstrap renders the password and offers a link; the navigation is
   * the operator's, taken once they have written it down.
   */
  return { ok: true, secret: { staffId: "A-0001", password } };
}

/* ------------------------------------------------------------- signing in --- */

export async function signIn(_prev: State, formData: FormData): Promise<State> {
  const staffId = String(formData.get("staffId") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!staffId) return { message: "Enter your Staff ID.", field: "staffId" };
  if (!password) return { message: "Enter your password.", field: "password" };

  const result = await signInStaff(staffId, password);
  if (!result.ok) return { message: result.message, field: result.field };

  await createStaffSession(result.staff.staff_id);
  refresh();
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const staff = await requireStaff();
  await logAdminEvent(staff.staff_id, "signout", { kind: "staff", id: staff.staff_id });
  await destroyStaffSession();
  refresh();
}

/**
 * Replace a one-time password with one of your own.
 *
 * Available to teachers as well as admins — it is the one action a person
 * performs on their own account, so it takes no role.
 */
export async function changeOwnPassword(_prev: State, formData: FormData): Promise<State> {
  const staff = await requireStaff();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.normalize("NFKC").length < 8) {
    // Eight, where the children get six. A staff password guards 9,714 records
    // rather than one, and a teacher is not typing it on a shared handset.
    return { message: "Use at least 8 characters.", field: "password" };
  }
  if (password !== confirm) return { message: "The two passwords do not match.", field: "confirm" };

  await setOwnPassword(staff.staff_id, password);
  refresh();
  return done("Password changed.");
}

/* ----------------------------------------------------------------- staff --- */

export async function createTeacher(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "teacher") === "admin" ? "admin" : "teacher";
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { message: "Enter a name.", field: "fullName" };

  const { staffId, password } = await createStaff({
    fullName,
    role,
    phone: phone || null,
    by: by.staff_id,
  });

  refresh();
  return { ok: true, secret: { staffId, password } };
}

export async function resetPassword(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  const staffId = String(formData.get("staffId") ?? "");
  if (!staffId) return { message: "No account named." };

  const password = await resetStaffPassword(staffId, by.staff_id);
  refresh();
  return { ok: true, secret: { staffId, password } };
}

export async function toggleStaffDisabled(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  const staffId = String(formData.get("staffId") ?? "");
  const disable = String(formData.get("disable") ?? "") === "1";

  if (staffId === by.staff_id) {
    // The one guard worth hardcoding: an office of one admin who switches
    // themselves off has locked everybody out of the control centre, and the
    // only way back is the bootstrap door, which is closed.
    return { message: "You cannot switch off your own account." };
  }

  await setStaffDisabled(staffId, disable, by.staff_id);
  refresh();
  return done(disable ? "Account switched off." : "Account switched back on.");
}

/* --------------------------------------------------------------- batches --- */

export async function newBatch(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { message: "A batch needs a name.", field: "name" };

  try {
    await createBatch({
      name,
      classLabel: String(formData.get("classLabel") ?? ""),
      medium: String(formData.get("medium") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      by: by.staff_id,
    });
  } catch (e) {
    // The unique index on lower(name) among live batches. Reported as the
    // sentence it actually means rather than a Postgres error string.
    if (String(e).includes("admin_batches_name_idx")) {
      return { message: "There is already a batch with that name.", field: "name" };
    }
    throw e;
  }

  refresh();
  return done(`Batch “${name}” created.`);
}

export async function archiveBatch(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  const batchId = String(formData.get("batchId") ?? "");
  const archive = String(formData.get("archive") ?? "") === "1";

  await setBatchArchived(batchId, archive, by.staff_id);
  refresh();
  return done(archive ? "Batch retired." : "Batch reopened.");
}

/**
 * Add students to a batch from a pasted list.
 *
 * Accepts anything the office is likely to paste — commas, spaces, newlines —
 * because the list comes off a printout or a WhatsApp message, not out of a
 * form designed for this.
 */
export async function addToBatch(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  const batchId = String(formData.get("batchId") ?? "");
  const raw = String(formData.get("uids") ?? "");

  const uids = raw.split(/[^0-9]+/).filter(Boolean);
  if (uids.length === 0) return { message: "Paste some User IDs first.", field: "uids" };

  const { added, already, unknown } = await addMembers(batchId, uids, by.staff_id);

  const parts: string[] = [];
  if (added.length) parts.push(`${added.length} added`);
  if (already.length) parts.push(`${already.length} already in this batch`);
  if (unknown.length) parts.push(`${unknown.length} not found: ${unknown.slice(0, 8).join(", ")}`);

  refresh();
  return { ok: unknown.length === 0, message: parts.join(" · ") };
}

export async function removeFromBatch(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  await removeMember(
    String(formData.get("batchId") ?? ""),
    String(formData.get("uid") ?? ""),
    by.staff_id,
  );
  refresh();
  return done("Removed from the batch.");
}

export async function assignToBatch(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  const batchId = String(formData.get("batchId") ?? "");
  const staffId = String(formData.get("staffId") ?? "");
  if (!staffId) return { message: "Choose a teacher.", field: "staffId" };

  await assignTeacher(batchId, staffId, String(formData.get("subject") ?? ""), by.staff_id);
  refresh();
  return done("Teacher assigned.");
}

export async function unassignFromBatch(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  await unassignTeacher(
    String(formData.get("batchId") ?? ""),
    String(formData.get("staffId") ?? ""),
    by.staff_id,
  );
  refresh();
  return done("Teacher removed from the batch.");
}

/* --------------------------------------------------------- live classes --- */

/**
 * Who may act on one batch: the office, or a teacher who takes it.
 *
 * Not requireStaff("admin"), because a teacher must be able to open their own
 * room at six in the evening — or tell that batch the room has moved — without
 * ringing the office first. It says nothing about anybody ELSE's batch, and
 * nothing at all about writing to the whole register, which stays admin-only.
 */
async function requireBatchRights(batchId: string) {
  const staff = await requireStaff();
  if (staff.role === "admin") return staff;
  if (await teachesBatch(staff.staff_id, batchId)) return staff;
  throw new Error("You do not take that batch.");
}

/**
 * Read a date and a time out of the form as Kolkata wall-clock.
 *
 * The trap this exists for: `new Date("2026-09-12T18:00")` is parsed in the
 * SERVER's timezone, and the server is Vercel, which is UTC. A class typed as 6
 * pm would be stored as 6 pm UTC — half past eleven at night in Kolkata — and
 * every child would be told the wrong hour by a screen that looked right to the
 * person who typed it.
 *
 * Everyone in this programme is in one city, so the offset is a constant rather
 * than a per-user setting. If KIDS ever runs a batch in another timezone this
 * has to become a real choice, and it should fail loudly here rather than
 * quietly mislead.
 */
const IST = "+05:30";

function istWallClock(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  const at = new Date(`${date}T${time}:00${IST}`);
  return Number.isNaN(at.getTime()) ? null : at;
}

export async function newClass(_prev: State, formData: FormData): Promise<State> {
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return { message: "Choose a batch.", field: "batchId" };

  const by = await requireBatchRights(batchId);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { message: "Give the class a name.", field: "title" };

  const startsAt = istWallClock(
    String(formData.get("date") ?? ""),
    String(formData.get("time") ?? ""),
  );
  if (!startsAt) return { message: "Enter a date and a time.", field: "date" };

  const minutes = Number(formData.get("minutes") ?? 90);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 600) {
    return { message: "A class runs between 5 and 600 minutes.", field: "minutes" };
  }

  await createClass({
    batchId,
    title,
    subject: String(formData.get("subject") ?? ""),
    startsAt,
    minutes,
    by: by.staff_id,
  });

  refresh();
  return done(`“${title}” scheduled.`);
}

/**
 * Open the room.
 *
 * Until this is pressed no student token is minted, so the class does not
 * merely look shut — it is shut.
 */
export async function openClass(_prev: State, formData: FormData): Promise<State> {
  const classId = String(formData.get("classId") ?? "");
  const live = await findClass(classId);
  if (!live) return { message: "No such class." };

  const by = await requireBatchRights(live.batch_id);
  await startClass(classId, by.staff_id);

  refresh();
  return done("The room is open. Students can join now.");
}

export async function closeClass(_prev: State, formData: FormData): Promise<State> {
  const classId = String(formData.get("classId") ?? "");
  const live = await findClass(classId);
  if (!live) return { message: "No such class." };

  const by = await requireBatchRights(live.batch_id);
  await endClass(classId, by.staff_id);

  refresh();
  return done("Class ended. The room no longer admits anybody.");
}

export async function callOffClass(_prev: State, formData: FormData): Promise<State> {
  const classId = String(formData.get("classId") ?? "");
  const live = await findClass(classId);
  if (!live) return { message: "No such class." };

  const by = await requireBatchRights(live.batch_id);
  await cancelClass(classId, by.staff_id);

  refresh();
  return done("Class cancelled.");
}

/** The unlisted YouTube link, pasted in after the class. */
export async function saveRecording(_prev: State, formData: FormData): Promise<State> {
  const classId = String(formData.get("classId") ?? "");
  const live = await findClass(classId);
  if (!live) return { message: "No such class." };

  const by = await requireBatchRights(live.batch_id);
  const url = String(formData.get("url") ?? "").trim();

  if (url && !/^https?:\/\//i.test(url)) {
    return { message: "Paste the whole link, starting with https://", field: "url" };
  }

  await setRecording(classId, url, by.staff_id);
  refresh();
  return done(url ? "Recording link saved." : "Recording link removed.");
}


/* ------------------------------------------------------------------ posts --- */

/**
 * Write a post.
 *
 * Two audiences and a rule about who may reach them: an admin may write to
 * everybody, a teacher only to a batch they actually take. That is not a
 * courtesy — "everybody" is 9,714 children on the register, and a teacher who
 * takes one coaching batch has no business addressing all of them.
 *
 * The words are not sent anywhere. One row is written, and every student who
 * should see it works that out when they next open Notices.
 */
export async function writePost(_prev: State, formData: FormData): Promise<State> {
  const batchId = String(formData.get("batchId") ?? "").trim();

  const by = batchId ? await requireBatchRights(batchId) : await requireStaff("admin");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { message: "Give the post a heading.", field: "title" };
  if (title.length > 120) return { message: "Keep the heading under 120 characters.", field: "title" };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { message: "There is nothing to say in it yet.", field: "body" };
  if (body.length > 1200) return { message: "Keep a post under 1,200 characters.", field: "body" };

  await createPost({ title, body, batchId: batchId || null, by: by.staff_id });

  refresh();
  return done(
    batchId
      ? "Posted. Everybody in that batch will see it in Notices."
      : "Posted to everybody with an app account.",
  );
}

/**
 * Take a post down.
 *
 * It leaves every screen at once, including the students who have already read
 * it. A wrong date corrected is no use while the wrong one is still showing.
 */
export async function takePostDown(_prev: State, formData: FormData): Promise<State> {
  const id = String(formData.get("postId") ?? "");
  const post = await findPost(id);
  if (!post) return { message: "No such post." };
  if (post.retracted_at) return { message: "That post is already down." };

  const by = post.batch_id
    ? await requireBatchRights(post.batch_id)
    : await requireStaff("admin");

  await retractPost(id, by.staff_id);
  refresh();
  return done("Taken down. Nobody will see it again.");
}


/* -------------------------------------------------- a student's password --- */

/**
 * Clear a child's app password and issue a one-time one.
 *
 * This is what /app/reset sends them to the office for. It was a script until
 * now, which meant every forgotten password went through whoever had a terminal
 * and the .env file — one person.
 *
 * Admin only, deliberately, even though a teacher can post to their own batch
 * and open their own room. Those two acts are addressed to a class; this one
 * hands somebody the keys to one child's account, and "just me for now" is
 * where the office is. Widening it to a batch's teacher is a decision to take
 * when there are teachers, not a default to ship before there are.
 */
export async function resetStudentPassword(_prev: State, formData: FormData): Promise<State> {
  const by = await requireStaff("admin");
  const uid = String(formData.get("uid") ?? "").trim();

  try {
    const issued = await resetAppPassword(uid, by.staff_id);
    refresh();
    return {
      ok: true,
      message: issued.existed
        ? "Password cleared. They must choose a new one when they sign in."
        : "Account opened. They must choose their own password when they sign in.",
      // Shown once, and derivable from nothing afterwards. Losing it means
      // issuing another, which is two clicks.
      secret: { staffId: issued.uid, password: issued.password, who: "student" },
    };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "That did not work." };
  }
}

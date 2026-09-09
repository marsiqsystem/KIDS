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
  secret?: { staffId: string; password: string };
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

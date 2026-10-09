"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/app/gate";
import { changePassword, findAccount } from "@/lib/app/accounts";
import { deleteAppAccount } from "@/lib/app/delete-account";
import { destroySession } from "@/lib/app/session";

/**
 * Profile's server actions. Design 7a.
 *
 * Two things on that screen write: the password, and deleting the account.
 * Subjects are changed through the chooser the daily loop already owns, and everything
 * else on Profile is the exam record read back, which nothing in this app is
 * allowed to edit.
 */

export type PasswordFormState = {
  field?: "current" | "next";
  message?: string;
};

export async function changePasswordAction(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const student = await requireStudent();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const again = String(formData.get("again") ?? "");

  // Not asked of a must_change account -- see changePassword().
  if (!current && !(await findAccount(student.uid))?.must_change) {
    return { field: "current", message: "Type the password you use now." };
  }
  if (!next) return { field: "next", message: "Type the new password you want." };

  // Checked before the current password, so a child who mistyped the new one
  // twice is not also told their old one is wrong.
  if (next !== again) {
    return {
      field: "next",
      message: "The two new passwords are not the same. Tap Show and read them both.",
    };
  }

  const result = await changePassword(student.uid, current, next);

  if (!result.ok) {
    switch (result.reason) {
      case "wrong_current":
        return {
          field: "current",
          message:
            "That is not the password you use now. Nothing has changed — your old password " +
            "still works.",
        };
      case "bad_new":
        return { field: "next", message: result.message };
      case "same":
        return {
          field: "next",
          message: "That is the password you already have. Choose a different one.",
        };
      default:
        // A signed-in session with no account row: the register still knows
        // them, but the password they are trying to change does not exist.
        return {
          field: "current",
          message:
            "This account has no password set on it yet, so there is nothing to change. " +
            "Your school or the KIDS office can set one.",
        };
    }
  }

  redirect("/app/profile?changed=1");
}

export type DeleteFormState = {
  field?: "password" | "confirm";
  message?: string;
};

/**
 * Delete my account — see deleteAppAccount (src/lib/app/delete-account.ts) for
 * what goes and what stays. On success the session ends with the account, and
 * the door says the account is gone.
 */
export async function deleteAccountAction(_prev: DeleteFormState, formData: FormData): Promise<DeleteFormState> {
  const student = await requireStudent();
  const result = await deleteAppAccount(
    student.uid,
    String(formData.get("password") ?? ""),
    String(formData.get("confirm") ?? ""),
  );
  if (!result.ok) return { field: result.field, message: result.message };
  await destroySession();
  redirect("/app/sign-in?deleted=1");
}
